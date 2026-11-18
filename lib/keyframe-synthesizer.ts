import { GoogleGenAI } from '@google/genai';

const globalForCharPortraitCache = globalThis as unknown as {
  __flowCharPortraitCache?: Map<string, string>;
};

const charPortraitCache =
  globalForCharPortraitCache.__flowCharPortraitCache ??
  (globalForCharPortraitCache.__flowCharPortraitCache = new Map<
    string,
    string
  >());

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout after ${timeoutMs}ms`));
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

export function parseDataUrlToInlinePart(
  url?: string | null
): { mimeType: string; data: string } | null {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('data:image/svg+xml')) return null;
  const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2],
  };
}

export async function synthesizePhotorealisticKeyframe(options: {
  englishPrompt: string;
  seed: number;
  ai?: GoogleGenAI | null;
  timeoutMs?: number;
  referenceImageUrls?: string[];
}): Promise<{
  dataUrl: string;
  isAiKeyframe: boolean;
  provider: string;
} | null> {
  const {
    englishPrompt,
    ai,
    timeoutMs = 12000,
    referenceImageUrls = [],
  } = options;
  const cleanPrompt = englishPrompt.trim().slice(0, 850);
  if (!cleanPrompt || !ai) return null;

  const effectiveRefUrls =
    referenceImageUrls.length > 0
      ? referenceImageUrls
      : Array.from(charPortraitCache.values()).slice(-2);

  const refInlineParts = effectiveRefUrls
    .map((u) => parseDataUrlToInlinePart(u))
    .filter(
      (p): p is { mimeType: string; data: string } =>
        Boolean(p && p.data.length > 100)
    )
    .slice(0, 3);

  const candidateModels = [
    'gemini-3.1-flash-lite-image',
    'gemini-2.5-flash-image',
    'gemini-3.1-flash-image',
  ];

  for (const modelName of candidateModels) {
    try {
      const contents =
        refInlineParts.length > 0
          ? [
              {
                role: 'user',
                parts: [
                  ...refInlineParts.map((ref) => ({
                    inlineData: {
                      mimeType: ref.mimeType,
                      data: ref.data,
                    },
                  })),
                  {
                    text: `Using the exact character appearance, facial features, hairstyle, age, and locked outfit from the provided character reference image(s) for strict visual character continuity: ${cleanPrompt} Widescreen 16:9 cinematic frame, photorealistic live-action film shot, natural warm lighting, no text overlay.`,
                  },
                ],
              },
            ]
          : `${cleanPrompt} Widescreen 16:9 cinematic frame, photorealistic live-action film shot, natural warm lighting, no text overlay.`;

      const geminiRes = await withTimeout(
        ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            responseModalities: ['IMAGE'],
          },
        }),
        timeoutMs
      );
      const parts = geminiRes.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (
          part.inlineData?.data &&
          part.inlineData?.mimeType?.startsWith('image/')
        ) {
          return {
            dataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            isAiKeyframe: true,
            provider: modelName,
          };
        }
      }
    } catch {
      // Try next Gemini image model
    }
  }

  return null;
}

export function registerCharacterReferenceImage(
  name: string,
  dataUrl: string
): void {
  if (
    !dataUrl ||
    !dataUrl.startsWith('data:image/') ||
    dataUrl.startsWith('data:image/svg+xml')
  ) {
    return;
  }
  const key = `custom::${name.toLowerCase().trim()}`;
  charPortraitCache.set(key, dataUrl);
}

export async function synthesizeCharacterPortraitImage(options: {
  name: string;
  role: string;
  ageRange: string;
  visualDNA: string;
  wardrobeLock: string;
  ai?: GoogleGenAI | null;
  timeoutMs?: number;
}): Promise<string | null> {
  const {
    name,
    role,
    ageRange,
    visualDNA,
    wardrobeLock,
    ai,
    timeoutMs = 11000,
  } = options;
  if (!ai) return null;

  const cacheKey = `${name.toLowerCase().trim()}::${ageRange.toLowerCase().trim()}::${wardrobeLock.slice(0, 60).toLowerCase().trim()}`;
  const cached = charPortraitCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const lower = `${name} ${role} ${ageRange} ${visualDNA}`.toLowerCase();
  const isChild =
    /(?:^|[^\p{L}\p{N}])(?:bé|ấu|bông|con|em bé|toddler)(?=[^\p{L}\p{N}]|$)/iu.test(
      lower
    ) || /^(?:[1-9]|1[0-2])\s*tuổi/i.test(ageRange.trim());
  const isFemale =
    !isChild &&
    /(?:^|[^\p{L}\p{N}])(?:nữ|mẹ|má|chị|cô|bà|linh|na|lan|hà an|elena)(?=[^\p{L}\p{N}]|$)/iu.test(
      lower
    );

  const subjectDesc = isChild
    ? `a cute happy young Vietnamese child (${ageRange}), bright expressive eyes, joyful smile, wearing ${wardrobeLock || 'a bright yellow cotton outfit'}`
    : isFemale
      ? `a Vietnamese woman (${ageRange}, ${role}), ${visualDNA}, wearing ${wardrobeLock}`
      : `a Vietnamese man (${ageRange}, ${role}), ${visualDNA}, wearing ${wardrobeLock}`;

  const portraitPrompt = `Character reference portrait for film production continuity lock: ${subjectDesc}. Half-body studio portrait facing camera, clear facial features and outfit visibility, warm natural cinema lighting, soft neutral studio background, photorealistic live-action photography, no text.`;

  const candidateModels = [
    'gemini-3.1-flash-lite-image',
    'gemini-2.5-flash-image',
  ];

  for (const modelName of candidateModels) {
    try {
      const res = await withTimeout(
        ai.models.generateContent({
          model: modelName,
          contents: portraitPrompt,
          config: {
            responseModalities: ['IMAGE'],
          },
        }),
        timeoutMs
      );
      const parts = res.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (
          part.inlineData?.data &&
          part.inlineData?.mimeType?.startsWith('image/')
        ) {
          const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          charPortraitCache.set(cacheKey, dataUrl);
          return dataUrl;
        }
      }
    } catch {
      // Try next candidate
    }
  }

  return null;
}
