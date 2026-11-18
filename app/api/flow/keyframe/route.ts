import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import {
  CharacterProfile,
  buildEnglishCinemaPromptForScene,
  generateSceneStoryboardDataUrl,
} from '@/lib/flow-engine';
import { synthesizePhotorealisticKeyframe } from '@/lib/keyframe-synthesizer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sceneNumber = Number(body?.sceneNumber) || 1;
    const location = String(body?.location || `Bối cảnh ${sceneNumber}`);
    const timeOfDay = String(body?.timeOfDay || 'Ban ngày');
    const narrativeBeat = String(body?.narrativeBeat || '');
    const dialogue = String(body?.dialogue || '');
    const takeNumber = Number(body?.takeNumber) || 1;
    const beatIndex = Number(body?.beatIndex) || 0;
    const seed =
      Number(body?.seed) ||
      104200 + sceneNumber * 137 + takeNumber * 997 + beatIndex * 313;
    const characters: CharacterProfile[] = Array.isArray(body?.characters)
      ? body.characters
      : [];

    const englishPrompt = buildEnglishCinemaPromptForScene(
      {
        sceneNumber,
        location,
        timeOfDay,
        narrativeBeat,
        dialogue,
      },
      characters,
      {
        takeNumber,
        beatIndex,
        customEnglishPrompt: body?.englishPrompt,
      }
    );

    const apiKey = process.env.GEMINI_API_KEY;
    const ai =
      apiKey && apiKey !== 'MY_GEMINI_API_KEY'
        ? new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          })
        : null;

    const referenceImageUrls: string[] = [
      ...(Array.isArray(body?.referenceImageUrls)
        ? body.referenceImageUrls
        : []),
      ...characters
        .map((c) => c.avatarUrl)
        .filter((u): u is string =>
          Boolean(u && !u.startsWith('data:image/svg+xml'))
        ),
    ];

    const synthesized = await synthesizePhotorealisticKeyframe({
      englishPrompt,
      seed,
      ai,
      timeoutMs: 11000,
      referenceImageUrls,
    });

    if (synthesized) {
      return NextResponse.json({
        keyframeUrl: synthesized.dataUrl,
        isAiKeyframe: true,
        provider: synthesized.provider,
        seed,
      });
    }

    const fallbackSvgUrl = generateSceneStoryboardDataUrl(
      {
        sceneNumber,
        location,
        timeOfDay,
        narrativeBeat,
        dialogue,
      },
      characters,
      { takeNumber, seed, beatIndex }
    );

    return NextResponse.json({
      keyframeUrl: fallbackSvgUrl,
      isAiKeyframe: false,
      provider: 'flow-storyboard-svg',
      seed,
    });
  } catch {
    return NextResponse.json(
      { error: 'Không thể kết xuất keyframe cho phân cảnh.' },
      { status: 500 }
    );
  }
}
