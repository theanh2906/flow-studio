import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import {
  CharacterProfile,
  SceneNode,
  parseScriptIntoScenes,
  buildContinuityPrompt,
  extractCharactersFromScriptText,
  extractProjectTitleFromScript,
  generateSceneStoryboardDataUrl,
  analyzeScriptQuality,
  isStageDirectionInsteadOfDialogue,
  generateNaturalActingDialogue,
  extractSceneActionBeats,
  isMetadataOrPreambleLine,
} from '@/lib/flow-engine';
import { synthesizeCharacterPortraitImage } from '@/lib/keyframe-synthesizer';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function POST(req: NextRequest) {
  let body: { scriptText?: string; characters?: CharacterProfile[] } = {};
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

  // Extract real characters mentioned in the script (zero "Linh & Minh" fallback unless script mentions them)
  const extractedCharacters = extractCharactersFromScriptText(
    scriptText,
    rawCharacters
  );
  const extractedProjectTitle = extractProjectTitleFromScript(scriptText);

  const fallbackScenes = parseScriptIntoScenes(scriptText, extractedCharacters);
  const fallbackReport = analyzeScriptQuality(
    scriptText,
    fallbackScenes,
    extractedCharacters
  );

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !scriptText.trim()) {
    return NextResponse.json({
      projectTitle: extractedProjectTitle,
      characters: extractedCharacters,
      scenes: fallbackScenes,
      report: fallbackReport,
      engine: 'deterministic-continuity-engine',
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const charSummary = extractedCharacters
      .map(
        (c) =>
          `${c.name} (${c.role}, ${c.ageRange}): Ngoại hình [${c.visualDNA}], Trang phục cố định [${c.wardrobeLock}], Tính cách [${c.personalityTraits}], Token [${c.continuityToken}]`
      )
      .join(' | ');

    // Run character reference portrait generation in parallel with script scene breakdown!
    const portraitPromise = Promise.all(
      extractedCharacters.slice(0, 4).map(async (c) => {
        if (c.avatarUrl && !c.avatarUrl.startsWith('data:image/svg+xml')) {
          return c;
        }
        const portrait = await synthesizeCharacterPortraitImage({
          name: c.name,
          role: c.role,
          ageRange: c.ageRange,
          visualDNA: c.visualDNA,
          wardrobeLock: c.wardrobeLock,
          ai,
          timeoutMs: 9500,
        });
        return portrait ? { ...c, avatarUrl: portrait } : c;
      })
    );

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Phân tích kịch bản sản xuất video sau thành danh sách các phân cảnh tuần tự cho công cụ Google Flow.
Nhân vật đã khóa Context trong dự án: ${charSummary}.
CHÚ Ý QUAN TRỌNG:
1. Tuyệt đối BỎ QUA dòng tiêu đề tập phim (ví dụ: "TẬP: ...", "Kịch bản: ...") và dòng ghi chú thể loại/thời lượng (ví dụ: "Sitcom không lời thoại dẫn chuyện | 30-40 giây"). KHÔNG ĐƯỢC biến dòng tiêu đề tập phim thành Cảnh 1.
2. Chỉ sử dụng đúng nhân vật và bối cảnh có thật trong kịch bản bên dưới. Không được bịa thêm nhân vật "Linh" hay "Minh" nếu kịch bản không có.
3. Hỗ trợ mọi định dạng kịch bản: gạch đầu dòng (- hoặc – Cảnh...), thời lượng (0-5 giây), hoặc CẢNH 1, CẢNH 2.

Kịch bản gốc:
${scriptText}

Hãy trích xuất từng phân cảnh thật sự gồm:
- sceneNumber (số thứ tự từ 1)
- location (tiêu đề cảnh hoặc địa điểm sạch sẽ, bỏ dấu gạch đầu dòng –/- và bỏ số thứ tự ở đầu)
- timeOfDay (thời gian trong ngày như Ban ngày, Buổi sáng, Buổi tối)
- narrativeBeat (mô tả hành động, cảm xúc và góc máy chi tiết bằng tiếng Việt)
- dialogue (lời thoại diễn xuất trực tiếp bằng tiếng Việt của nhân vật trong cảnh đó, gọi đúng tên nhân vật trong kịch bản như "Ấu", "Ba Ben" và khớp 100% với hành động cụ thể đang diễn ra trong cảnh đó. TUYỆT ĐỐI KHÔNG chép lại câu mô tả kịch bản ngôi thứ ba và KHÔNG dùng câu sáo rỗng "con yêu ơi" chung chung)
- durationSec (thời lượng giây của cảnh, từ 4 đến 8 giây)`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sceneNumber: { type: Type.INTEGER },
                location: { type: Type.STRING },
                timeOfDay: { type: Type.STRING },
                narrativeBeat: { type: Type.STRING },
                dialogue: { type: Type.STRING },
                durationSec: { type: Type.NUMBER },
              },
              required: [
                'sceneNumber',
                'location',
                'timeOfDay',
                'narrativeBeat',
                'dialogue',
              ],
            },
          },
        },
      }),
      6500
    );

    const charactersWithPortraits = await portraitPromise.catch(
      () => extractedCharacters
    );

    const rawParsed = JSON.parse((response.text ?? '[]').trim());
    const parsed = Array.isArray(rawParsed)
      ? rawParsed.filter(
          (item) =>
            item &&
            !isMetadataOrPreambleLine(String(item.location || '')) &&
            !isMetadataOrPreambleLine(String(item.narrativeBeat || ''))
        )
      : [];
    if (parsed.length === 0) {
      return NextResponse.json({
        projectTitle: extractedProjectTitle,
        characters: charactersWithPortraits,
        scenes: fallbackScenes,
        report: fallbackReport,
        engine: 'deterministic-continuity-engine',
      });
    }

    const enrichedScenes: SceneNode[] = [];
    parsed.forEach(
      (
        item: {
          sceneNumber?: number;
          location?: string;
          timeOfDay?: string;
          narrativeBeat?: string;
          dialogue?: string;
          durationSec?: number;
        },
        idx: number
      ) => {
        const base =
          fallbackScenes[idx] || fallbackScenes[fallbackScenes.length - 1];
        if (!base) return;
        const sceneNumber = idx + 1;
        const location = (item.location || base.location)
          .replace(/^[-–—•*+#\s]+/, '')
          .trim();
        const timeOfDay = item.timeOfDay || base.timeOfDay;
        const narrativeBeat = item.narrativeBeat || base.narrativeBeat;
        const durationSec = Math.max(
          3,
          Math.min(12, Number(item.durationSec) || base.postEdit.durationSec || 5)
        );
        const title = `${location} (${timeOfDay})`;

        const prevScene =
          enrichedScenes.length > 0
            ? {
                sceneNumber:
                  enrichedScenes[enrichedScenes.length - 1].sceneNumber,
                location: enrichedScenes[enrichedScenes.length - 1].location,
                timeOfDay: enrichedScenes[enrichedScenes.length - 1].timeOfDay,
              }
            : null;

        const combinedText = `${location} ${narrativeBeat} ${item.dialogue || ''}`;
        const matchedChars = extractedCharacters.filter((c) => {
          const escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (
            new RegExp(
              `(?:^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`,
              'iu'
            ).test(combinedText)
          ) {
            return true;
          }
          const parts = c.name.split(/\s+/);
          if (parts.length > 1) {
            const lastWord = parts[parts.length - 1].replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&'
            );
            if (
              new RegExp(
                `(?:^|[^\\p{L}\\p{N}])${lastWord}(?=[^\\p{L}\\p{N}]|$)`,
                'iu'
              ).test(combinedText)
            ) {
              return true;
            }
          }
          return false;
        });
        const effectiveChars =
          matchedChars.length > 0
            ? matchedChars
            : extractedCharacters.slice(0, 2);

        const rawDialogue = item.dialogue || base.dialogue;
        const dialogue = isStageDirectionInsteadOfDialogue(
          rawDialogue,
          narrativeBeat
        )
          ? generateNaturalActingDialogue(
              narrativeBeat,
              location,
              effectiveChars,
              sceneNumber
            )
          : rawDialogue;

        const actionBeats = extractSceneActionBeats(narrativeBeat, location);

        const built = buildContinuityPrompt(
          {
            sceneNumber,
            title,
            location,
            timeOfDay,
            narrativeBeat,
            dialogue,
          },
          effectiveChars,
          prevScene
        );

        const seed = 104200 + sceneNumber * 137;
        const keyframeUrl = generateSceneStoryboardDataUrl(
          {
            sceneNumber,
            location,
            timeOfDay,
            narrativeBeat,
            dialogue,
          },
          effectiveChars,
          { takeNumber: 1, seed, beatIndex: 0 }
        );

        const motionFrames = actionBeats.map((_, bIdx) =>
          generateSceneStoryboardDataUrl(
            {
              sceneNumber,
              location,
              timeOfDay,
              narrativeBeat,
              dialogue,
            },
            effectiveChars,
            { takeNumber: 1, seed, beatIndex: bIdx }
          )
        );

        enrichedScenes.push({
          ...base,
          id: `scene-${sceneNumber}`,
          sceneNumber,
          title,
          location,
          timeOfDay,
          narrativeBeat,
          dialogue,
          characterIds: effectiveChars.map((c) => c.id),
          continuityState: built.continuityState,
          imagePrompt: built.imagePrompt,
          videoPrompt: built.videoPrompt,
          audioPrompt: built.audioPrompt,
          keyframeUrl,
          motionFrames,
          actionBeats,
          takes: base.takes.map((t, tIdx) =>
            tIdx === 0
              ? {
                  ...t,
                  imagePrompt: built.imagePrompt,
                  videoPrompt: built.videoPrompt,
                  audioPrompt: built.audioPrompt,
                  keyframeUrl,
                  motionFrames,
                  actionBeats,
                }
              : t
          ),
          postEdit: {
            ...base.postEdit,
            trimStartSec: 0,
            trimEndSec: durationSec,
            durationSec,
            subtitleText: dialogue,
          },
        });
      }
    );

    const report = analyzeScriptQuality(
      scriptText,
      enrichedScenes,
      charactersWithPortraits
    );

    return NextResponse.json({
      projectTitle: extractedProjectTitle,
      characters: charactersWithPortraits,
      scenes: enrichedScenes,
      report,
      engine: 'gemini-3.8-flash',
    });
  } catch {
    return NextResponse.json({
      projectTitle: extractedProjectTitle,
      characters: extractedCharacters,
      scenes: fallbackScenes,
      report: fallbackReport,
      engine: 'deterministic-continuity-engine',
    });
  }
}
