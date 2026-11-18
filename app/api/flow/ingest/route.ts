import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import {
  CharacterProfile,
  parseRawScriptToStructuredTimeline,
  extractCharactersFromScriptText,
  ScriptIngestionResult,
  IngestedSceneNode,
} from '@/lib/flow-engine';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function POST(req: NextRequest) {
  let body: { rawText?: string; characters?: CharacterProfile[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body' },
      { status: 400 }
    );
  }

  const rawText = body.rawText || '';
  const rawCharacters: CharacterProfile[] = Array.isArray(body.characters)
    ? body.characters
    : [];

  const extractedCharacters = extractCharactersFromScriptText(
    rawText,
    rawCharacters
  );

  const fallbackResult = parseRawScriptToStructuredTimeline(
    rawText,
    extractedCharacters
  );

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !rawText.trim()) {
    return NextResponse.json({
      characters: extractedCharacters,
      result: fallbackResult,
      engine: 'deterministic-ingestion-agent',
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const charContext = extractedCharacters
      .map(
        (c) =>
          `${c.name} (${c.role}, Phục trang: ${c.wardrobeLock}, Tính cách: ${c.personalityTraits})`
      )
      .join(' | ');

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Bạn là AI Script Ingestion Agent chuyên phân rã kịch bản văn bản thô thành Dòng Thời Gian Phân Cảnh Có Cấu Trúc (Structured Scene Timeline) cho quy trình sản xuất phim Google Flow.
Nhân vật trong dự án: ${charContext}
CHÚ Ý: Chỉ trích xuất đúng nhân vật và bối cảnh có thật trong kịch bản dưới đây.

Kịch bản văn bản thô:
${rawText}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sceneNumber: { type: Type.INTEGER },
                slugline: { type: Type.STRING },
                settingName: { type: Type.STRING },
                intExt: { type: Type.STRING },
                timeOfDay: { type: Type.STRING },
                lightingMood: { type: Type.STRING },
                atmosphere: { type: Type.STRING },
                narrativeSummary: { type: Type.STRING },
                suggestedDurationSec: { type: Type.INTEGER },
                continuityHook: { type: Type.STRING },
              },
              required: [
                'sceneNumber',
                'slugline',
                'settingName',
                'intExt',
                'timeOfDay',
                'narrativeSummary',
              ],
            },
          },
        },
      }),
      6500
    );

    const parsed = JSON.parse((response.text ?? '[]').trim());
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({
        characters: extractedCharacters,
        result: fallbackResult,
        engine: 'deterministic-ingestion-agent',
      });
    }

    const enrichedTimeline: IngestedSceneNode[] = parsed.map(
      (
        item: {
          sceneNumber?: number;
          slugline?: string;
          settingName?: string;
          intExt?: string;
          timeOfDay?: string;
          lightingMood?: string;
          atmosphere?: string;
          narrativeSummary?: string;
          suggestedDurationSec?: number;
          continuityHook?: string;
        },
        idx: number
      ) => {
        const base =
          fallbackResult.timeline[idx] ||
          fallbackResult.timeline[fallbackResult.timeline.length - 1];
        const sceneNumber = idx + 1;
        const intExt: 'INT' | 'EXT' | 'INT/EXT' =
          item.intExt === 'EXT' || item.intExt === 'INT/EXT'
            ? item.intExt
            : base?.location.intExt || 'INT';

        return {
          ...base,
          sceneNumber,
          slugline:
            item.slugline ||
            base?.slugline ||
            `INT. BỐI CẢNH ${sceneNumber} - BAN NGÀY`,
          location: {
            settingName:
              item.settingName ||
              base?.location.settingName ||
              `BỐI CẢNH ${sceneNumber}`,
            intExt,
            timeOfDay:
              item.timeOfDay || base?.location.timeOfDay || 'BAN NGÀY',
            environmentType:
              base?.location.environmentType || 'Không gian điện ảnh',
            lightingMood:
              item.lightingMood ||
              base?.location.lightingMood ||
              'Cinematic 4800K',
            atmosphere:
              item.atmosphere || base?.location.atmosphere || 'Tự nhiên',
          },
          narrativeSummary:
            item.narrativeSummary || base?.narrativeSummary || '',
          suggestedDurationSec:
            item.suggestedDurationSec || base?.suggestedDurationSec || 5,
          continuityHook: item.continuityHook || base?.continuityHook || '',
        };
      }
    );

    const aiResult: ScriptIngestionResult = {
      ...fallbackResult,
      agentTelemetry: {
        ...fallbackResult.agentTelemetry,
        parserModel: 'Gemini 3.8 Flash Ingestion Agent',
        parsingConfidencePercent: 99,
      },
      timeline: enrichedTimeline,
    };

    return NextResponse.json({
      characters: extractedCharacters,
      result: aiResult,
      engine: 'gemini-3.8-flash',
    });
  } catch {
    return NextResponse.json({
      characters: extractedCharacters,
      result: fallbackResult,
      engine: 'deterministic-ingestion-agent',
    });
  }
}
