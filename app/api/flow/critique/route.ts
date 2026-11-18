import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import {
  CharacterProfile,
  SceneNode,
  ScriptAnalysisReport,
  ScriptCritiqueSuggestion,
  analyzeScriptQuality,
  parseScriptIntoScenes,
  extractCharactersFromScriptText,
  extractProjectTitleFromScript,
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
  let body: {
    scriptText?: string;
    scenes?: SceneNode[];
    characters?: CharacterProfile[];
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body' },
      { status: 400 }
    );
  }

  const scriptText = body.scriptText || '';
  const rawCharacters: CharacterProfile[] = Array.isArray(body.characters)
    ? body.characters
    : [];

  const extractedCharacters = extractCharactersFromScriptText(
    scriptText,
    rawCharacters
  );
  const extractedProjectTitle = extractProjectTitleFromScript(scriptText);

  const effectiveScenes: SceneNode[] =
    Array.isArray(body.scenes) && body.scenes.length > 0
      ? body.scenes
      : parseScriptIntoScenes(scriptText, extractedCharacters);

  const deterministicReport = analyzeScriptQuality(
    scriptText,
    effectiveScenes,
    extractedCharacters
  );

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !scriptText.trim()) {
    return NextResponse.json({
      projectTitle: extractedProjectTitle,
      characters: extractedCharacters,
      scenes: effectiveScenes,
      report: deterministicReport,
      engine: 'deterministic-script-doctor',
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const charContext = extractedCharacters
      .map(
        (c) =>
          `${c.name} (${c.role}, tính cách: ${c.personalityTraits}, giọng: ${c.voicePersona})`
      )
      .join(' | ');

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Bạn là Đạo diễn & Biên kịch AI chuyên nghiệp cho hệ thống dựng phim Google Flow.
Hãy phân tích kịch bản dưới đây và đưa ra gợi ý cải thiện cụ thể theo 3 tiêu chí:
1. plot_coherence (Mạch lạc cốt truyện & liên kết cảm xúc/ánh sáng giữa các cảnh)
2. dialogue_naturalness (Độ tự nhiên, ngắn gọn, giàu hình ảnh của lời thoại tiếng Việt)
3. scene_pacing (Nhịp độ & thời lượng giây hợp lý cho từng phân cảnh)

CHÚ Ý: Tuyệt đối chỉ phân tích nhân vật và tình huống có thật trong kịch bản bên dưới. Không được nhắc tới nhân vật "Linh" hay "Minh" nếu kịch bản không có họ.

Nhân vật trong dự án: ${charContext}
Kịch bản hiện tại:
${scriptText}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallSummary: { type: Type.STRING },
              coherenceStatus: { type: Type.STRING },
              dialogueNaturalnessStatus: { type: Type.STRING },
              pacingBalanceStatus: { type: Type.STRING },
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dimension: { type: Type.STRING },
                    sceneNumber: { type: Type.INTEGER },
                    severity: { type: Type.STRING },
                    title: { type: Type.STRING },
                    analysis: { type: Type.STRING },
                    originalSnippet: { type: Type.STRING },
                    suggestedRewrite: { type: Type.STRING },
                    recommendedDurationSec: { type: Type.NUMBER },
                  },
                  required: ['dimension', 'sceneNumber', 'title', 'analysis'],
                },
              },
            },
            required: [
              'overallSummary',
              'coherenceStatus',
              'dialogueNaturalnessStatus',
              'pacingBalanceStatus',
              'suggestions',
            ],
          },
        },
      }),
      6500
    );

    const parsed = JSON.parse((response.text ?? '{}').trim());
    if (
      !parsed ||
      !Array.isArray(parsed.suggestions) ||
      parsed.suggestions.length === 0
    ) {
      return NextResponse.json({
        projectTitle: extractedProjectTitle,
        characters: extractedCharacters,
        scenes: effectiveScenes,
        report: deterministicReport,
        engine: 'deterministic-script-doctor',
      });
    }

    const mappedSuggestions: ScriptCritiqueSuggestion[] =
      parsed.suggestions.map(
        (
          item: {
            dimension?: string;
            sceneNumber?: number;
            severity?: string;
            title?: string;
            analysis?: string;
            originalSnippet?: string;
            suggestedRewrite?: string;
            recommendedDurationSec?: number;
          },
          idx: number
        ) => {
          const dim =
            item.dimension === 'plot_coherence' ||
            item.dimension === 'dialogue_naturalness' ||
            item.dimension === 'scene_pacing'
              ? item.dimension
              : 'dialogue_naturalness';
          const sev =
            item.severity === 'high_impact' ||
            item.severity === 'recommendation' ||
            item.severity === 'insight'
              ? item.severity
              : 'recommendation';

          return {
            id: `ai-crit-${idx + 1}`,
            dimension: dim,
            sceneNumber: item.sceneNumber || 1,
            severity: sev,
            title: item.title || `Gợi ý tối ưu Cảnh ${item.sceneNumber || 1}`,
            analysis: item.analysis || '',
            originalSnippet: item.originalSnippet,
            suggestedRewrite: item.suggestedRewrite,
            recommendedDurationSec: item.recommendedDurationSec,
          };
        }
      );

    const report: ScriptAnalysisReport = {
      overallSummary:
        parsed.overallSummary || deterministicReport.overallSummary,
      coherenceStatus:
        parsed.coherenceStatus || deterministicReport.coherenceStatus,
      dialogueNaturalnessStatus:
        parsed.dialogueNaturalnessStatus ||
        deterministicReport.dialogueNaturalnessStatus,
      pacingBalanceStatus:
        parsed.pacingBalanceStatus || deterministicReport.pacingBalanceStatus,
      estimatedTotalDurationSec: deterministicReport.estimatedTotalDurationSec,
      suggestions: mappedSuggestions,
    };

    return NextResponse.json({
      projectTitle: extractedProjectTitle,
      characters: extractedCharacters,
      scenes: effectiveScenes,
      report,
      engine: 'gemini-3.8-flash',
    });
  } catch {
    return NextResponse.json({
      projectTitle: extractedProjectTitle,
      characters: extractedCharacters,
      scenes: effectiveScenes,
      report: deterministicReport,
      engine: 'deterministic-script-doctor',
    });
  }
}
