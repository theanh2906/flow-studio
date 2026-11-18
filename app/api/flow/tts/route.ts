import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { cleanSpokenDialogueText } from '@/lib/flow-engine';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Gemini TTS timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function selectGeminiVoiceName(
  voicePitch?: string,
  voicePersona?: string,
  characterName?: string,
  ageRange?: string
): 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' {
  const personaLower = `${voicePersona || ''} ${characterName || ''} ${ageRange || ''}`.toLowerCase();
  if (
    personaLower.includes('trẻ') ||
    personaLower.includes('bé') ||
    personaLower.includes('ấu') ||
    personaLower.includes('con') ||
    personaLower.includes('child') ||
    personaLower.includes('tháng') ||
    /\b[1-9]\s*tuổi\b/.test(personaLower)
  ) {
    return 'Puck';
  }
  if (
    personaLower.includes('nữ') ||
    personaLower.includes('mẹ') ||
    personaLower.includes('chị') ||
    personaLower.includes('cô') ||
    personaLower.includes('bà') ||
    personaLower.includes('na')
  ) {
    return voicePitch === 'high' ? 'Zephyr' : 'Kore';
  }
  if (voicePitch === 'low') {
    return 'Charon';
  }
  if (voicePitch === 'high') {
    return 'Zephyr';
  }
  return 'Fenrir';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawText: string = String(body?.text || '').trim();
    const voicePitch: string = String(body?.voicePitch || 'medium');
    const voicePersona: string = String(
      body?.voicePersona || 'Giọng tiếng Việt miền Nam ấm áp, tự nhiên'
    );
    const characterName: string = String(body?.characterName || '');
    const ageRange: string = String(body?.ageRange || '');
    const voiceRegion: string = String(body?.voiceRegion || 'south');

    const regionDirective =
      voiceRegion === 'north' || voicePersona.toLowerCase().includes('miền bắc')
        ? 'Northern Vietnamese Hanoi accent (Giọng miền Bắc Hà Nội chuẩn, rõ chữ)'
        : voiceRegion === 'central' || voicePersona.toLowerCase().includes('miền trung')
        ? 'Central Vietnamese accent (Giọng miền Trung mộc mạc, truyền cảm)'
        : 'Southern Vietnamese Saigon accent (Giọng miền Nam Sài Gòn tự nhiên, ấm áp, thân thiện)';

    const cleanText = cleanSpokenDialogueText(rawText);
    if (!cleanText) {
      return NextResponse.json(
        { error: 'Nội dung lời thoại trống.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return NextResponse.json(
        { error: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ.' },
        { status: 503 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const voiceName = selectGeminiVoiceName(
      voicePitch,
      voicePersona,
      characterName,
      ageRange
    );

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: `Vietnamese native speaker, ${regionDirective}, ${voicePersona}, natural cinema acting voiceover`,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      }),
      9000
    );

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return NextResponse.json(
        { error: 'Không nhận được dữ liệu âm thanh từ Gemini TTS.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      audioDataUrl: `data:audio/wav;base64,${base64Audio}`,
      voiceName,
      spokenText: cleanText,
      engine: 'gemini-3.8-flash-lite-tts',
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Lỗi khi kết xuất giọng đọc AI (Gemini TTS).',
      },
      { status: 500 }
    );
  }
}
