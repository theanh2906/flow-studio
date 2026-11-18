import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import {
  CharacterProfile,
  SceneNode,
  triggerSelectiveRegeneration,
  cleanSpokenDialogueText,
  generateSceneStoryboardDataUrl,
  isStageDirectionInsteadOfDialogue,
  generateNaturalActingDialogue,
  extractSceneActionBeats,
  buildEnglishCinemaPromptForScene,
} from '@/lib/flow-engine';
import { synthesizePhotorealisticKeyframe } from '@/lib/keyframe-synthesizer';
import { synthesizeCinemaVideoMp4 } from '@/lib/video-synthesizer';

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
    personaLower.includes('bông') ||
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Gemini API timeout after ${timeoutMs}ms`));
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

async function synthesizeSceneVoiceoverWav(
  ai: GoogleGenAI,
  spokenText: string,
  leadChar?: CharacterProfile
): Promise<string | undefined> {
  const cleanText = cleanSpokenDialogueText(spokenText);
  if (!cleanText) return undefined;

  try {
    const voiceName = selectGeminiVoiceName(
      leadChar?.voicePitch,
      leadChar?.voicePersona,
      leadChar?.name,
      leadChar?.ageRange
    );
    const personaText = leadChar?.voicePersona || 'Giọng miền Nam ấm áp, tự nhiên';
    const pLower = personaText.toLowerCase();
    const regionDirective = pLower.includes('miền bắc')
      ? 'Northern Vietnamese Hanoi accent (Giọng miền Bắc Hà Nội chuẩn, rõ chữ)'
      : pLower.includes('miền trung')
      ? 'Central Vietnamese accent (Giọng miền Trung mộc mạc, truyền cảm)'
      : 'Southern Vietnamese Saigon accent (Giọng miền Nam Sài Gòn tự nhiên, ấm áp)';

    const ttsRes = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText.slice(0, 260),
                speechMetadata: {
                  style: `Vietnamese native actor speaking with warm emotion, ${regionDirective}, ${personaText}`,
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
      7500
    );

    const base64Audio =
      ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
  } catch {
    // Non-fatal if single TTS call times out; client can also synthesize on-demand via /api/flow/tts
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scenes: SceneNode[] = Array.isArray(body?.scenes) ? body.scenes : [];
    const targetIds: string[] = Array.isArray(body?.targetIds)
      ? body.targetIds
      : [];
    const characters: CharacterProfile[] = Array.isArray(body?.characters)
      ? body.characters
      : [];
    const promptOverrides:
      | Record<
          string,
          Partial<Pick<SceneNode, 'imagePrompt' | 'videoPrompt' | 'audioPrompt'>>
        >
      | undefined = body?.promptOverrides;

    if (scenes.length === 0 || targetIds.length === 0) {
      return NextResponse.json(
        { error: 'Không có phân cảnh nào được chọn để kết xuất.' },
        { status: 400 }
      );
    }

    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const fallbackScenes = triggerSelectiveRegeneration(
      scenes,
      targetIds,
      promptOverrides,
      nowStr,
      characters
    );

    const apiKey = process.env.GEMINI_API_KEY;
    const hasGeminiKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
    const ai = hasGeminiKey
      ? new GoogleGenAI({
          apiKey: apiKey!,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        })
      : null;

    try {
      const targetScenes = scenes.filter((s) => targetIds.includes(s.id));
      const charSummary =
        characters.length > 0
          ? characters
              .map(
                (c) =>
                  `- ${c.name} (${c.role}, ${c.ageRange}): Ngoại hình [${c.visualDNA}], Trang phục khóa [${c.wardrobeLock}], Giọng [${c.voicePersona}, ${c.voicePitch}, ${c.speakingRateWpm} wpm], Token [${c.continuityToken}]`
              )
              .join('\n')
          : 'Sử dụng nhân vật theo nội dung từng phân cảnh';

      const scenesPayload = targetScenes.map((s) => ({
        id: s.id,
        sceneNumber: s.sceneNumber,
        title: s.title,
        location: s.location,
        timeOfDay: s.timeOfDay,
        narrativeBeat: cleanSpokenDialogueText(s.narrativeBeat),
        dialogue: cleanSpokenDialogueText(s.dialogue),
        characterLock: s.continuityState.characterAnchorLock,
        currentVideoPrompt:
          promptOverrides?.[s.id]?.videoPrompt || s.videoPrompt,
      }));

      // Step 1: Refine prompts, natural character dialogue (spokenDialogue), English cinema prompt, and action beats via Gemini
      const aiMap = new Map<
        string,
        {
          imagePrompt: string;
          videoPrompt: string;
          audioPrompt: string;
          cameraMotion: string;
          spokenDialogue: string;
          englishCinemaPrompt?: string;
          actionBeats?: string[];
        }
      >();

      if (ai) {
        const response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `Bạn là Hệ thống Đa Tác Tử (Multi-Agent Director) của Google Flow gồm 3 Agent chạy song song:
1. Imagen 3 Keyframe Agent (Tạo prompt hình ảnh chuẩn 4K Anamorphic imagePrompt bằng tiếng Việt + englishCinemaPrompt bằng tiếng Anh mô tả chi tiết ngoại hình nhân vật người Việt, độ tuổi chính xác như người bố 34 tuổi và em bé 2 tuổi, bối cảnh căn phòng và hành động cụ thể để vẽ ảnh thật 16:9)
2. Google Flow Veo 2 Video Agent (Tạo videoPrompt chuyển động máy quay 24fps, cameraMotion, và mảng actionBeats gồm 2-3 nhịp hành động liên tiếp trong cảnh)
3. TTS & Lyria Audio Agent (Tạo câu thoại diễn xuất tiếng Việt tự nhiên spokenDialogue và audioPrompt nhạc nền điện ảnh)

Danh sách nhân vật khóa Context:
${charSummary}

Các phân cảnh cần tái kết xuất (Selective Regeneration):
${JSON.stringify(scenesPayload, null, 2)}

QUY TẮC BẮT BUỘC CHO spokenDialogue:
- spokenDialogue PHẢI là lời nói trực tiếp của nhân vật đang diễn trong cảnh (ngôi thứ nhất/thứ hai tự nhiên, ấm áp, ví dụ: "Ú òa! Ấu của ba giỏi quá nè, lại đây chơi với ba nào!" hoặc "Ba đi tới đâu là Ấu cũng đòi theo tới đó hết trơn, xuống bếp với ba luôn nha!").
- TUYỆT ĐỐI KHÔNG đọc lại câu mô tả hành động kịch bản ngôi thứ ba (KHÔNG được trả về kiểu "Ba Ben nằm chơi với Ấu." hay "Ba Ben bế Ấu đi từ phòng khách sang phòng ngủ, xuống bếp.").
- BẮT BUỘC giữ nguyên chuỗi mã khóa nhân vật (characterLock) ở đầu imagePrompt và videoPrompt.`,
            config: {
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW,
              },
              systemInstruction:
                'Bạn là Multi-Agent Engine trên Google Flow. Trả về JSON mảng các cảnh đã được tối ưu hóa bộ 3 prompt Imagen 3, Veo 2, Lyria Audio, englishCinemaPrompt, actionBeats và spokenDialogue diễn xuất tự nhiên.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING },
                    videoPrompt: { type: Type.STRING },
                    audioPrompt: { type: Type.STRING },
                    cameraMotion: { type: Type.STRING },
                    spokenDialogue: { type: Type.STRING },
                    englishCinemaPrompt: { type: Type.STRING },
                    actionBeats: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: [
                    'id',
                    'imagePrompt',
                    'videoPrompt',
                    'audioPrompt',
                    'cameraMotion',
                    'spokenDialogue',
                  ],
                },
              },
            },
          }),
          6000
        ).catch(() => null);

        if (response?.text) {
          try {
            const parsed = JSON.parse(response.text.trim());
            if (Array.isArray(parsed)) {
              parsed.forEach((item) => {
                if (item && typeof item.id === 'string') {
                  aiMap.set(item.id, item);
                }
              });
            }
          } catch {
            // Use fallback overrides if JSON parse fails
          }
        }
      }

      // Step 2: Determine final natural acting dialogue for each scene FIRST (fixing the TTS race condition!),
      // then synthesize WAV Voiceover + Photorealistic 16:9 Keyframe Image concurrently!
      const activeTargets = targetScenes.slice(0, 4);
      const ttsMap = new Map<string, string>();
      const videoMap = new Map<string, string>();
      const keyframeMap = new Map<
        string,
        { dataUrl: string; isAiKeyframe: boolean; motionFrames?: string[] }
      >();
      const dialogueMap = new Map<string, string>();

      targetScenes.forEach((scene) => {
        const aiItem = aiMap.get(scene.id);
        const matchedChars = characters.filter((c) =>
          scene.characterIds.includes(c.id)
        );
        const effectiveChars =
          matchedChars.length > 0 ? matchedChars : characters.slice(0, 2);
        const cleanBeat = cleanSpokenDialogueText(scene.narrativeBeat);
        const candidateDialogue = aiItem?.spokenDialogue
          ? cleanSpokenDialogueText(aiItem.spokenDialogue)
          : cleanSpokenDialogueText(scene.dialogue);

        const finalDialogue = isStageDirectionInsteadOfDialogue(
          candidateDialogue,
          cleanBeat
        )
          ? generateNaturalActingDialogue(
              cleanBeat,
              scene.location,
              effectiveChars,
              scene.sceneNumber
            )
          : candidateDialogue;

        dialogueMap.set(scene.id, finalDialogue);
      });

      await Promise.all(
        activeTargets.map(async (scene, idx) => {
          const aiItem = aiMap.get(scene.id);
          const matchedChars = characters.filter((c) =>
            scene.characterIds.includes(c.id)
          );
          const effectiveChars =
            matchedChars.length > 0 ? matchedChars : characters.slice(0, 2);
          // Pick adult speaker first if scene has both parent and baby
          const speakerChar =
            effectiveChars.find(
              (c) => !/^(?:[1-9]|1[0-2])\s*tuổi/i.test(c.ageRange.trim())
            ) ||
            effectiveChars[0] ||
            characters[0];

          const finalSpokenText =
            dialogueMap.get(scene.id) || scene.dialogue || scene.narrativeBeat;

          const nextTakeNum = (scene.currentTake || 1) + 1;
          const nextSeed =
            104200 + scene.sceneNumber * 137 + nextTakeNum * 997;

          const englishPromptBeat0 = buildEnglishCinemaPromptForScene(
            {
              sceneNumber: scene.sceneNumber,
              location: scene.location,
              timeOfDay: scene.timeOfDay,
              narrativeBeat: scene.narrativeBeat,
              dialogue: finalSpokenText,
            },
            effectiveChars,
            {
              takeNumber: nextTakeNum,
              beatIndex: 0,
              customEnglishPrompt: aiItem?.englishCinemaPrompt,
            }
          );

          const referenceImageUrls = effectiveChars
            .map((c) => c.avatarUrl)
            .filter((u): u is string =>
              Boolean(u && !u.startsWith('data:image/svg+xml'))
            );

          // Synthesize real MP4 video on single-scene regen or for primary scene (idx === 0)
          const shouldSynthesizeMp4Now = activeTargets.length === 1 || idx === 0;

          const [wavDataUrl, kfBeat0, videoResult] = await Promise.all([
            ai
              ? synthesizeSceneVoiceoverWav(ai, finalSpokenText, speakerChar)
              : Promise.resolve(undefined),
            synthesizePhotorealisticKeyframe({
              englishPrompt: englishPromptBeat0,
              seed: nextSeed,
              ai,
              timeoutMs: 12000,
              referenceImageUrls,
            }),
            shouldSynthesizeMp4Now
              ? synthesizeCinemaVideoMp4({
                  englishPrompt: englishPromptBeat0,
                  location: scene.location,
                  narrativeBeat: scene.narrativeBeat,
                  apiKey,
                  timeoutMs: 65000,
                })
              : Promise.resolve(null),
          ]);

          if (wavDataUrl) {
            ttsMap.set(scene.id, wavDataUrl);
          }

          if (kfBeat0) {
            keyframeMap.set(scene.id, {
              dataUrl: kfBeat0.dataUrl,
              isAiKeyframe: kfBeat0.isAiKeyframe,
            });
          }

          if (videoResult?.videoDataUrl) {
            videoMap.set(scene.id, videoResult.videoDataUrl);
          }
        })
      );

      const mergedOverrides: Record<
        string,
        Partial<Pick<SceneNode, 'imagePrompt' | 'videoPrompt' | 'audioPrompt'>>
      > = { ...(promptOverrides || {}) };

      targetIds.forEach((id) => {
        const aiItem = aiMap.get(id);
        if (aiItem) {
          mergedOverrides[id] = {
            imagePrompt: aiItem.imagePrompt,
            videoPrompt:
              promptOverrides?.[id]?.videoPrompt || aiItem.videoPrompt,
            audioPrompt: aiItem.audioPrompt,
          };
        }
      });

      const updatedScenes = triggerSelectiveRegeneration(
        scenes,
        targetIds,
        mergedOverrides,
        nowStr,
        characters
      ).map((scene) => {
        if (!targetIds.includes(scene.id)) return scene;
        const aiItem = aiMap.get(scene.id);
        const wavUrl = ttsMap.get(scene.id) || scene.voiceoverAudioUrl;
        const nextVideoClipUrl =
          videoMap.get(scene.id) || scene.videoClipUrl;
        const nextDialogue =
          dialogueMap.get(scene.id) || cleanSpokenDialogueText(scene.dialogue);

        const matchedChars = characters.filter((c) =>
          scene.characterIds.includes(c.id)
        );
        const effectiveChars =
          matchedChars.length > 0 ? matchedChars : characters.slice(0, 2);

        const latestTakeIdx = scene.takes.length - 1;
        const currentTakeObj = scene.takes[latestTakeIdx];
        const cleanBeat = cleanSpokenDialogueText(scene.narrativeBeat);
        const actionBeats =
          aiItem?.actionBeats && aiItem.actionBeats.length >= 2
            ? aiItem.actionBeats
            : extractSceneActionBeats(cleanBeat, scene.location);

        const storyboardMotionFrames = actionBeats.map((_, bIdx) =>
          generateSceneStoryboardDataUrl(
            {
              sceneNumber: scene.sceneNumber,
              location: scene.location,
              timeOfDay: scene.timeOfDay,
              narrativeBeat: cleanBeat,
              dialogue: nextDialogue,
            },
            effectiveChars,
            {
              takeNumber: scene.currentTake,
              seed: currentTakeObj?.seed,
              cameraMotion:
                aiItem?.cameraMotion || currentTakeObj?.cameraMotion,
              beatIndex: bIdx,
            }
          )
        );

        const synthesizedKf = keyframeMap.get(scene.id);
        const nextKeyframeUrl =
          synthesizedKf?.dataUrl || storyboardMotionFrames[0];
        const isAiKeyframe = Boolean(synthesizedKf?.isAiKeyframe);
        const motionFrames = synthesizedKf?.dataUrl
          ? [synthesizedKf.dataUrl, ...storyboardMotionFrames.slice(1)]
          : storyboardMotionFrames;

        const updatedTakes = [...scene.takes];
        if (latestTakeIdx >= 0) {
          updatedTakes[latestTakeIdx] = {
            ...updatedTakes[latestTakeIdx],
            cameraMotion:
              aiItem?.cameraMotion || updatedTakes[latestTakeIdx].cameraMotion,
            keyframeUrl: nextKeyframeUrl,
            videoClipUrl: nextVideoClipUrl,
            voiceoverAudioUrl: wavUrl,
            motionFrames,
            actionBeats,
            isAiKeyframe,
          };
        }

        return {
          ...scene,
          dialogue: nextDialogue,
          keyframeUrl: nextKeyframeUrl,
          videoClipUrl: nextVideoClipUrl,
          voiceoverAudioUrl: wavUrl,
          motionFrames,
          actionBeats,
          isAiKeyframe,
          takes: updatedTakes,
          postEdit: {
            ...scene.postEdit,
            subtitleText: nextDialogue,
          },
        };
      });

      return NextResponse.json({
        scenes: updatedScenes,
        engine: 'gemini-3.8-flash + gemini-omni-1.2-video + gemini-tts',
      });
    } catch {
      return NextResponse.json({
        scenes: fallbackScenes,
        engine: 'flow-continuity-fallback',
      });
    }
  } catch {
    return NextResponse.json(
      { error: 'Không thể tái kết xuất phân cảnh.' },
      { status: 500 }
    );
  }
}
