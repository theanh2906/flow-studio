import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import {
  CharacterProfile,
  removeVietnameseAccents,
} from '@/lib/flow-engine';
import {
  parseDataUrlToInlinePart,
  registerCharacterReferenceImage,
  synthesizeCharacterPortraitImage,
} from '@/lib/keyframe-synthesizer';

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

async function resolveExternalOrDataImageUrl(
  rawUrl?: string | null
): Promise<string | null> {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith('data:image/') &&
    !trimmed.startsWith('data:image/svg+xml')
  ) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(trimmed, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Accept: 'image/*,*/*;q=0.8',
        },
      });
      clearTimeout(timer);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        if (contentType.startsWith('image/')) {
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length > 200) {
            return `data:${contentType.split(';')[0]};base64,${buf.toString('base64')}`;
          }
        }
      }
    } catch {
      // Ignore fetch errors for unreachable URLs
    }
  }
  return null;
}

// Helper to generate a stylized, high-fidelity SVG avatar fallback when offline
function generateStylizedSvgAvatar(
  name: string,
  gender: string,
  role: string,
  _hairStyle: string = 'short',
  primaryColor: string = '#3B82F6'
): string {
  const isFemale =
    gender.toLowerCase().includes('female') ||
    gender.toLowerCase().includes('nữ');
  const isChild =
    name.toLowerCase().startsWith('bé') ||
    name.toLowerCase().includes('ấu') ||
    gender.toLowerCase().includes('child') ||
    role.toLowerCase().includes('con') ||
    role.toLowerCase().includes('bé');

  const bgGradients = [
    { start: '#1E293B', end: '#0F172A' },
    { start: '#1E3A8A', end: '#0F172A' },
    { start: '#312E81', end: '#0F172A' },
    { start: '#064E3B', end: '#0F172A' },
  ];
  const bg = bgGradients[Math.abs(name.length) % bgGradients.length];
  const skinTone = isChild ? '#FED7AA' : isFemale ? '#FDE68A' : '#FCD34D';
  const hairColor = '#1E1B18';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg.start}" />
        <stop offset="100%" stop-color="${bg.end}" />
      </linearGradient>
      <linearGradient id="cloth" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${primaryColor}" />
        <stop offset="100%" stop-color="#1E293B" />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="60" fill="url(#bg)" />
    <path d="M 20 120 C 20 95, 38 82, 60 82 C 82 82, 100 95, 100 120 Z" fill="url(#cloth)" />
    <path d="M 52 82 L 60 92 L 68 82 Z" fill="#F8FAFC" opacity="0.9" />
    <rect x="52" y="68" width="16" height="18" rx="4" fill="${skinTone}" />
    <ellipse cx="60" cy="52" rx="${isChild ? '20' : '22'}" ry="${isChild ? '21' : '25'}" fill="${skinTone}" />
    ${
      isFemale
        ? `<path d="M 36 50 C 36 26, 84 26, 84 50 C 84 65, 80 75, 78 80 C 74 72, 74 52, 60 52 C 46 52, 46 72, 42 80 C 40 75, 36 65, 36 50 Z" fill="${hairColor}" />`
        : `<path d="M 37 45 C 37 28, 83 28, 83 45 C 75 36, 68 38, 60 38 C 50 38, 44 36, 37 45 Z" fill="${hairColor}" />`
    }
    <circle cx="52" cy="52" r="${isChild ? '3' : '2.5'}" fill="#0F172A" />
    <circle cx="68" cy="52" r="${isChild ? '3' : '2.5'}" fill="#0F172A" />
    <circle cx="53" cy="51" r="0.8" fill="#FFFFFF" />
    <circle cx="69" cy="51" r="0.8" fill="#FFFFFF" />
    <path d="M 54 62 Q 60 67 66 62" stroke="#B45309" stroke-width="1.8" fill="none" stroke-linecap="round" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildRegionalVoicePersona(
  gender: string,
  voiceRegion: 'south' | 'north' | 'central' = 'south'
): { voicePersona: string; voicePitch: 'low' | 'medium' | 'high'; speakingRateWpm: number } {
  const regionLabel =
    voiceRegion === 'north'
      ? 'miền Bắc chuẩn, rõ chữ'
      : voiceRegion === 'central'
      ? 'miền Trung mộc mạc, truyền cảm'
      : 'miền Nam ấm áp, tự nhiên';

  if (gender === 'child') {
    return {
      voicePersona: `Giọng em bé ${regionLabel}, trong trẻo đáng yêu`,
      voicePitch: 'high',
      speakingRateWpm: 138,
    };
  }
  if (gender === 'female') {
    return {
      voicePersona: `Giọng nữ ${regionLabel}`,
      voicePitch: 'medium',
      speakingRateWpm: 144,
    };
  }
  return {
    voicePersona: `Giọng nam ${regionLabel}`,
    voicePitch: 'low',
    speakingRateWpm: 142,
  };
}

// Neutral fallback profile when offline (no hardcoded outfit stereotypes)
function createSmartVietnameseProfile(
  name: string,
  _scriptText: string = '',
  charIndex: number = 1,
  voiceRegion: 'south' | 'north' | 'central' = 'south'
): Omit<CharacterProfile, 'id'> {
  const lowerName = name.toLowerCase().trim();

  let gender: 'male' | 'female' | 'child' = 'male';
  let role = 'Nhân vật trong kịch bản';
  let ageRange = '30 tuổi';
  let themeColor = '#3B82F6';

  if (
    /(?:^|[^\p{L}\p{N}])(?:bé|ấu|con|em bé|nhóc|bông|bắp|sóc|mầm|đậu)(?=[^\p{L}\p{N}]|$)/iu.test(
      lowerName
    )
  ) {
    gender = 'child';
    role = 'Nhân vật trẻ em / em bé';
    ageRange = '2 tuổi';
    themeColor = '#F59E0B';
  } else if (
    /(?:^|[^\p{L}\p{N}])(?:mẹ|má|chị|cô|bà|vợ|nữ|na|lan|linh|mai|hương|trang|vy|thảo)(?=[^\p{L}\p{N}]|$)/iu.test(
      lowerName
    )
  ) {
    gender = 'female';
    role = 'Nhân vật nữ';
    ageRange = '28 tuổi';
    themeColor = '#EC4899';
  } else {
    gender = 'male';
    role = 'Nhân vật nam';
    ageRange = '32 tuổi';
    themeColor = '#0284C7';
  }

  const visualDNA =
    gender === 'child'
      ? 'Em bé Việt Nam gương mặt bầu bĩnh đáng yêu, đôi mắt tròn sáng'
      : gender === 'female'
      ? 'Nữ người Việt gương mặt thanh tú, biểu cảm tự nhiên'
      : 'Nam người Việt gương mặt sáng, biểu cảm tự nhiên';
  const wardrobeLock = 'Trang phục đời thường hiện đại giữ đồng nhất xuyên suốt các cảnh';
  const voiceInfo = buildRegionalVoicePersona(gender, voiceRegion);
  const personalityTraits = 'Biểu cảm tự nhiên, đúng tâm lý nhân vật trong kịch bản';
  const mannerisms = 'Tương tác tự nhiên trước ống kính';

  const cleanTag = removeVietnameseAccents(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const continuityToken = `CHAR_LOCK::${cleanTag || 'CHAR'}_${charIndex}[locked-ref]`;
  const avatarUrl = generateStylizedSvgAvatar(
    name,
    gender,
    role,
    'short',
    themeColor
  );

  return {
    name,
    role,
    ageRange,
    visualDNA,
    wardrobeLock,
    voicePersona: voiceInfo.voicePersona,
    voicePitch: voiceInfo.voicePitch,
    speakingRateWpm: voiceInfo.speakingRateWpm,
    personalityTraits,
    mannerisms,
    continuityToken,
    avatarUrl,
    source: 'google_flow_import',
    flowSeedId: `flow-ai-${(cleanTag || 'char').toLowerCase()}`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawQuery: string = (
      body?.characterQuery ||
      body?.name ||
      ''
    ).trim();
    const rawReferenceImage: string = (
      body?.referenceImageDataUrl || ''
    ).trim();
    const scriptText: string = (body?.scriptText || '').trim();
    const existingIndex: number = Number(body?.charIndex || 1);
    const voiceRegion: 'south' | 'north' | 'central' =
      body?.voiceRegion === 'north' || body?.voiceRegion === 'central'
        ? body.voiceRegion
        : 'south';

    const isQueryUrl = /^https?:\/\//i.test(rawQuery);
    const resolvedRefImage = await resolveExternalOrDataImageUrl(
      rawReferenceImage || (isQueryUrl ? rawQuery : null)
    );
    const characterQuery = isQueryUrl
      ? (body?.name || 'Nhân vật').trim()
      : rawQuery || 'Nhân vật';

    if (!characterQuery && !resolvedRefImage) {
      return NextResponse.json(
        {
          error:
            'Vui lòng cung cấp tên nhân vật hoặc tải ảnh nhân vật.',
        },
        { status: 400 }
      );
    }

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

    const fallbackProfile = createSmartVietnameseProfile(
      characterQuery,
      scriptText,
      existingIndex,
      voiceRegion
    );

    if (!ai) {
      return NextResponse.json({
        character: {
          ...fallbackProfile,
          id: `char-flow-ai-${Date.now()}`,
          avatarUrl: resolvedRefImage || fallbackProfile.avatarUrl,
        },
        engine: 'smart-vietnamese-character-engine',
        isAiGenerated: true,
        hasReferenceImageLock: Boolean(resolvedRefImage),
      });
    }

    try {
      const refPart = parseDataUrlToInlinePart(resolvedRefImage);

      const textPrompt = refPart
        ? `Bạn là chuyên gia Thị giác Máy tính & Khóa Nhân Vật (Visual Character Lock) của Google Flow.
QUY TẮC BẮT BUỘC:
1. BỎ QUA hoàn toàn mọi định kiến từ tên gọi "${characterQuery}". Chỉ quan sát 100% HÌNH ẢNH ĐÍNH KÈM để nhận diện đúng người thật hoặc nhân vật trong bức ảnh đó!
2. Nếu ảnh là NAM GIỚI -> gender="male", mô tả đúng độ tuổi, khuôn mặt, kiểu tóc, màu da, râu/kính và quần áo của người đàn ông trong ảnh.
3. Nếu ảnh là NỮ GIỚI -> gender="female", mô tả đúng độ tuổi, khuôn mặt, kiểu tóc, trang điểm và bộ trang phục của người phụ nữ trong ảnh.
4. Nếu ảnh là EM BÉ / TRẺ NHỎ -> gender="child", mô tả đúng độ tuổi ước lượng (VD: "1 tuổi", "2 tuổi", "5 tuổi"), nét mặt bụ bẫm đáng yêu và bộ quần áo em bé đang mặc trong ảnh.
5. Tuyệt đối KHÔNG bịa đặt các chi tiết không có trong ảnh (như tạp dề, áo polo, kính...) nếu trong ảnh không mặc!

Trả về duy nhất 1 JSON Object (không phải mảng) gồm:
- name: Giữ nguyên "${characterQuery}" nếu người dùng đã đặt tên cụ thể khác "Nhân vật" / "Nhân vật Flow", ngược lại đặt 1 tên ngắn gọn phù hợp với ảnh (VD: "Nam", "Lan", "Bé Bơ")
- gender: "male" | "female" | "child" (dựa hoàn toàn vào hình ảnh)
- ageRange: Độ tuổi ước lượng từ hình ảnh (VD: "2 tuổi", "26 tuổi", "34 tuổi")
- role: Vai trò ngắn gọn dựa trên hình ảnh (VD: "Em bé 2 tuổi", "Người cha trẻ", "Cô gái trẻ")
- visualDNA: Mô tả chính xác đặc điểm gương mặt, độ tuổi, giới tính, kiểu tóc, màu tóc, làn da, biểu cảm của nhân vật trong ảnh
- wardrobeLock: Mô tả chính xác màu sắc, kiểu dáng áo/quần/váy/phụ kiện mà nhân vật đang mặc trong bức ảnh`
        : `Bạn là Giám đốc Casting AI cho Google Flow.
Hãy tạo hồ sơ ngoại hình cho nhân vật "${characterQuery}" dựa trên kịch bản sau:
"""
${scriptText ? scriptText.slice(0, 3000) : 'Phim ngắn đời sống Việt Nam.'}
"""
Trả về duy nhất 1 JSON Object gồm:
- name: Tên nhân vật ("${characterQuery}")
- gender: "male" | "female" | "child"
- ageRange: Độ tuổi phù hợp (VD: "34 tuổi", "2 tuổi", "28 tuổi")
- role: Vai trò ngắn gọn trong kịch bản
- visualDNA: Mô tả ngoại hình nhận diện chi tiết (gương mặt, kiểu tóc, dáng người, thần thái)
- wardrobeLock: Trang phục khóa cố định xuyên suốt các cảnh`;

      const contents = refPart
        ? [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: refPart.mimeType,
                    data: refPart.data,
                  },
                },
                { text: textPrompt },
              ],
            },
          ]
        : textPrompt;

      const schema = {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          gender: { type: Type.STRING },
          role: { type: Type.STRING },
          ageRange: { type: Type.STRING },
          visualDNA: { type: Type.STRING },
          wardrobeLock: { type: Type.STRING },
        },
        required: [
          'name',
          'gender',
          'role',
          'ageRange',
          'visualDNA',
          'wardrobeLock',
        ],
      };

      // Use gemini-2.5-flash with thinkingBudget: 0 first for ultra-fast (~2.5s) & accurate Vision inspection, fallback to gemini-3.8-flash
      let response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        }),
        18000
      ).catch(() => null);

      if (!response?.text) {
        response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              responseMimeType: 'application/json',
              responseSchema: schema,
            },
          }),
          20000
        ).catch(() => null);
      }

      const rawParsed = response?.text
        ? JSON.parse(response.text.trim())
        : null;
      const parsed = Array.isArray(rawParsed) ? rawParsed[0] : rawParsed;

      const detectedGender: 'male' | 'female' | 'child' =
        parsed?.gender === 'female' || parsed?.gender === 'child' || parsed?.gender === 'male'
          ? parsed.gender
          : fallbackProfile.voicePitch === 'high'
          ? 'child'
          : 'male';

      const userProvidedCustomName =
        characterQuery &&
        characterQuery !== 'Nhân vật' &&
        characterQuery !== 'Nhân vật Flow';

      const cleanName = userProvidedCustomName
        ? characterQuery
        : parsed?.name || fallbackProfile.name;
      const finalRole = parsed?.role || fallbackProfile.role;
      const finalAgeRange = parsed?.ageRange || fallbackProfile.ageRange;
      const finalVisualDNA = parsed?.visualDNA || fallbackProfile.visualDNA;
      const finalWardrobeLock =
        parsed?.wardrobeLock || fallbackProfile.wardrobeLock;

      const voiceInfo = buildRegionalVoicePersona(detectedGender, voiceRegion);

      const cleanTag = removeVietnameseAccents(cleanName)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      const wardrobeShort = removeVietnameseAccents(
        (finalWardrobeLock || 'locked').slice(0, 30)
      )
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');

      const continuityToken = `CHAR_LOCK::${cleanTag || 'CHAR'}_${existingIndex}[${wardrobeShort}]`;

      // Use uploaded/imported Flow reference image if provided; otherwise synthesize a real AI Character Reference Portrait!
      let finalAvatarUrl = resolvedRefImage;
      if (!finalAvatarUrl) {
        finalAvatarUrl = await synthesizeCharacterPortraitImage({
          name: cleanName,
          role: finalRole,
          ageRange: finalAgeRange,
          visualDNA: finalVisualDNA,
          wardrobeLock: finalWardrobeLock,
          ai,
          timeoutMs: 12000,
        });
      }
      if (!finalAvatarUrl) {
        finalAvatarUrl = generateStylizedSvgAvatar(
          cleanName,
          detectedGender,
          finalRole,
          'short',
          detectedGender === 'female'
            ? '#EC4899'
            : detectedGender === 'child'
            ? '#F59E0B'
            : '#0284C7'
        );
      }

      const generatedChar: CharacterProfile = {
        id: `char-flow-ai-${Date.now()}`,
        name: cleanName,
        role: finalRole,
        ageRange: finalAgeRange,
        visualDNA: finalVisualDNA,
        wardrobeLock: finalWardrobeLock,
        voicePersona: voiceInfo.voicePersona,
        voicePitch: voiceInfo.voicePitch,
        speakingRateWpm: voiceInfo.speakingRateWpm,
        personalityTraits: 'Biểu cảm tự nhiên theo mạch kịch bản',
        mannerisms: 'Diễn xuất đồng nhất theo ảnh khóa tham chiếu',
        continuityToken,
        avatarUrl: finalAvatarUrl,
        source: resolvedRefImage ? 'uploaded' : 'google_flow_import',
        flowSeedId: `flow://asset/${(cleanTag || 'char').toLowerCase()}-img-lock`,
      };

      if (finalAvatarUrl && !finalAvatarUrl.startsWith('data:image/svg+xml')) {
        registerCharacterReferenceImage(cleanName, finalAvatarUrl);
      }

      return NextResponse.json({
        character: generatedChar,
        engine: refPart
          ? 'gemini-3.8-flash-vision + reference-image-lock'
          : 'gemini-3.8-flash + gemini-3.1-flash-lite-image',
        isAiGenerated: true,
        hasReferenceImageLock: !finalAvatarUrl.startsWith('data:image/svg+xml'),
      });
    } catch {
      const portrait = await synthesizeCharacterPortraitImage({
        name: fallbackProfile.name,
        role: fallbackProfile.role,
        ageRange: fallbackProfile.ageRange,
        visualDNA: fallbackProfile.visualDNA,
        wardrobeLock: fallbackProfile.wardrobeLock,
        ai,
        timeoutMs: 10000,
      });
      return NextResponse.json({
        character: {
          ...fallbackProfile,
          id: `char-flow-ai-${Date.now()}`,
          avatarUrl: resolvedRefImage || portrait || fallbackProfile.avatarUrl,
        },
        engine: 'smart-vietnamese-character-engine',
        isAiGenerated: true,
        hasReferenceImageLock: Boolean(resolvedRefImage || portrait),
      });
    }
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Lỗi trong quá trình tạo hồ sơ nhân vật AI.',
      },
      { status: 500 }
    );
  }
}
