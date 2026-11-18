import { NextRequest, NextResponse } from 'next/server';
import {
  CharacterProfile,
  buildEnglishCinemaPromptForScene,
} from '@/lib/flow-engine';
import { synthesizeCinemaVideoMp4 } from '@/lib/video-synthesizer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sceneNumber = Number(body?.sceneNumber) || 1;
    const location = String(body?.location || `Bối cảnh ${sceneNumber}`);
    const timeOfDay = String(body?.timeOfDay || 'Ban ngày');
    const narrativeBeat = String(body?.narrativeBeat || '');
    const dialogue = String(body?.dialogue || '');
    const takeNumber = Number(body?.takeNumber) || 1;
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
        beatIndex: 0,
        customEnglishPrompt: body?.englishPrompt,
      }
    );

    const synthesized = await synthesizeCinemaVideoMp4({
      englishPrompt,
      location,
      narrativeBeat,
      apiKey: process.env.GEMINI_API_KEY,
      timeoutMs: 75000,
    });

    if (synthesized) {
      return NextResponse.json({
        videoClipUrl: synthesized.videoDataUrl,
        provider: synthesized.provider,
        interactionId: synthesized.interactionId,
      });
    }

    return NextResponse.json(
      {
        error:
          'Không thể tạo video MP4 từ Gemini Omni lúc này. Vui lòng thử lại sau ít giây.',
      },
      { status: 503 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Lỗi khi kết xuất video MP4 từ Gemini Omni.' },
      { status: 500 }
    );
  }
}
