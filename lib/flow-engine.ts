export interface IngestedCharacterMeta {
  name: string;
  roleHint?: string;
  wardrobe?: string;
  emotionalState?: string;
  prominence: 'lead' | 'supporting' | 'cameo';
}

export interface IngestedLocationMeta {
  settingName: string;
  intExt: 'INT' | 'EXT' | 'INT/EXT';
  timeOfDay: string;
  environmentType: string;
  lightingMood: string;
  atmosphere: string;
}

export interface IngestedActionBeat {
  step: number;
  description: string;
  visualCue: string;
  cameraMovement: string;
}

export interface IngestedSceneNode {
  sceneNumber: number;
  slugline: string;
  location: IngestedLocationMeta;
  characters: IngestedCharacterMeta[];
  actions: IngestedActionBeat[];
  narrativeSummary: string;
  dialogueLines: Array<{ speaker: string; text: string; emotion?: string }>;
  suggestedDurationSec: number;
  continuityHook: string;
  keyVisualPrompt: string;
}

export interface ScriptIngestionResult {
  detectedFormat:
    | 'screenplay_fountain'
    | 'tvc_commercial'
    | 'narrative_prose'
    | 'freeform';
  totalWordCount: number;
  estimatedRuntimeSec: number;
  extractedCharacterList: Array<{
    name: string;
    count: number;
    roleSuggestion: string;
  }>;
  extractedLocationList: Array<{
    name: string;
    intExt: string;
    sceneCount: number;
  }>;
  agentTelemetry: {
    stepsCompleted: string[];
    parserModel: string;
    parsingConfidencePercent: number;
  };
  timeline: IngestedSceneNode[];
}

export interface CharacterProfile {
  id: string;
  name: string;
  role: string;
  ageRange: string;
  visualDNA: string;
  wardrobeLock: string;
  voicePersona: string;
  voicePitch: 'low' | 'medium' | 'high';
  speakingRateWpm: number;
  personalityTraits: string;
  mannerisms: string;
  continuityToken: string;
  avatarUrl?: string;
  source?: 'custom' | 'uploaded' | 'google_flow_import';
  flowSeedId?: string;
  uploadedFileName?: string;
}

export interface AudioLibraryAsset {
  id: string;
  title: string;
  category: 'bgm' | 'sfx';
  genreOrType: string;
  mood: string;
  durationSec: number;
  bpm?: number;
  license: string;
  synthProfile: {
    baseFreq: number;
    chordRatios: number[];
    waveform: 'sine' | 'triangle' | 'sawtooth';
  };
}

export interface ScriptCritiqueSuggestion {
  id: string;
  dimension: 'plot_coherence' | 'dialogue_naturalness' | 'scene_pacing';
  sceneNumber: number | null;
  severity: 'insight' | 'recommendation' | 'high_impact';
  title: string;
  analysis: string;
  originalSnippet?: string;
  suggestedRewrite?: string;
  recommendedDurationSec?: number;
  applied?: boolean;
}

export interface ScriptAnalysisReport {
  overallSummary: string;
  coherenceStatus: string;
  dialogueNaturalnessStatus: string;
  pacingBalanceStatus: string;
  estimatedTotalDurationSec: number;
  suggestions: ScriptCritiqueSuggestion[];
}

export interface SceneTake {
  takeNumber: number;
  createdAt: string;
  seed: number;
  imagePrompt: string;
  videoPrompt: string;
  audioPrompt: string;
  cameraMotion: string;
  lightingNote: string;
  keyframeUrl: string;
  voiceoverAudioUrl?: string;
  videoClipUrl?: string;
  motionFrames?: string[];
  actionBeats?: string[];
  isAiKeyframe?: boolean;
}

export type TransitionType = 'cut' | 'cross-dissolve' | 'dip-to-black';
export type ColorGradePreset =
  | 'cinematic-warm'
  | 'anamorphic-teal'
  | 'neutral-rec709'
  | 'high-contrast-doc';

export interface ScenePostEdit {
  trimStartSec: number;
  trimEndSec: number;
  durationSec: number;
  transition: TransitionType;
  colorGrade: ColorGradePreset;
  voiceoverVolume: number;
  bgmVolume: number;
  sfxVolume: number;
  bgmTrackId: string;
  bgmTrackTitle: string;
  sfxTrackId: string | null;
  sfxTrackTitle: string | null;
  subtitleText: string;
  playbackSpeed: 0.75 | 1 | 1.25;
}

export type AgentTrackStatus = 'idle' | 'generating' | 'done' | 'error';
export type SceneReviewStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'needs_regen';

export interface SceneContinuityState {
  inheritedFromScene: number | null;
  characterAnchorLock: string;
  lightingContinuity: string;
  spatialHook: string;
  consistencyVerified: boolean;
}

export interface SceneNode {
  id: string;
  sceneNumber: number;
  title: string;
  location: string;
  timeOfDay: string;
  narrativeBeat: string;
  dialogue: string;
  characterIds: string[];
  continuityState: SceneContinuityState;
  imagePrompt: string;
  videoPrompt: string;
  audioPrompt: string;
  imageStatus: AgentTrackStatus;
  videoStatus: AgentTrackStatus;
  audioStatus: AgentTrackStatus;
  reviewStatus: SceneReviewStatus;
  selectedForBatch: boolean;
  currentTake: number;
  takes: SceneTake[];
  postEdit: ScenePostEdit;
  keyframeUrl: string;
  voiceoverAudioUrl?: string;
  videoClipUrl?: string;
  motionFrames?: string[];
  actionBeats?: string[];
  isAiKeyframe?: boolean;
}

export interface ProjectVersion {
  id: string;
  versionTag: string;
  label: string;
  createdAt: string;
  author: string;
  notes: string;
  scriptRaw: string;
  scenes: SceneNode[];
  characters: CharacterProfile[];
  masterApproved: boolean;
}

export interface SceneDiffItem {
  sceneNumber: number;
  sceneTitle: string;
  changeType: 'unchanged' | 'modified' | 'added' | 'removed';
  changedFields: string[];
  baseTake: number | null;
  targetTake: number | null;
  baseDurationSec: number | null;
  targetDurationSec: number | null;
  baseReviewStatus: SceneReviewStatus | null;
  targetReviewStatus: SceneReviewStatus | null;
  baseVideoPrompt: string | null;
  targetVideoPrompt: string | null;
  baseCharacterLock: string | null;
  targetCharacterLock: string | null;
  baseColorGrade: ColorGradePreset | null;
  targetColorGrade: ColorGradePreset | null;
  baseTransition: TransitionType | null;
  targetTransition: TransitionType | null;
}

export interface VersionComparisonReport {
  baseVersionTag: string;
  targetVersionTag: string;
  modifiedScenesCount: number;
  addedScenesCount: number;
  removedScenesCount: number;
  unchangedScenesCount: number;
  totalDurationDeltaSec: number;
  scriptChanged: boolean;
  sceneDiffs: SceneDiffItem[];
}

const KEYFRAME_POOL = [
  '/images/scene_01.jpg',
  '/images/scene_02.jpg',
  '/images/scene_03.jpg',
  '/images/scene_04.jpg',
];

export const ROYALTY_FREE_AUDIO_LIBRARY: AudioLibraryAsset[] = [
  {
    id: 'bgm-horizon-pulse',
    title: 'Horizon Pulse — Ambient Architecture',
    category: 'bgm',
    genreOrType: 'Cinematic Ambient',
    mood: 'Truyền cảm hứng, hiện đại, không gian mở',
    durationSec: 45,
    bpm: 92,
    license: 'Royalty-Free Commercial (CC0 Studio)',
    synthProfile: {
      baseFreq: 220,
      chordRatios: [1, 1.25, 1.5],
      waveform: 'sine',
    },
  },
  {
    id: 'bgm-neural-grid',
    title: 'Neural Grid — Minimal Tech Arpeggio',
    category: 'bgm',
    genreOrType: 'Electronic Minimal',
    mood: 'Tập trung, dữ liệu số, nhịp độ chính xác',
    durationSec: 38,
    bpm: 112,
    license: 'Royalty-Free Commercial (CC0 Studio)',
    synthProfile: {
      baseFreq: 261.63,
      chordRatios: [1, 1.2, 1.5],
      waveform: 'triangle',
    },
  },
  {
    id: 'bgm-emerald-canopy',
    title: 'Emerald Canopy — Acoustic & Warm Pad',
    category: 'bgm',
    genreOrType: 'Organic Contemporary',
    mood: 'Bền vững, sinh thái, ấm áp',
    durationSec: 52,
    bpm: 84,
    license: 'Royalty-Free Commercial (CC0 Studio)',
    synthProfile: {
      baseFreq: 196,
      chordRatios: [1, 1.25, 1.66],
      waveform: 'sine',
    },
  },
  {
    id: 'bgm-twilight-ovations',
    title: 'Twilight Finale — Orchestral Swell',
    category: 'bgm',
    genreOrType: 'Cinematic Hybrid',
    mood: 'Cao trào, tầm nhìn tương lai, hùng vĩ',
    durationSec: 60,
    bpm: 98,
    license: 'Royalty-Free Commercial (CC0 Studio)',
    synthProfile: {
      baseFreq: 293.66,
      chordRatios: [1, 1.25, 1.5, 2],
      waveform: 'triangle',
    },
  },
  {
    id: 'sfx-hologram-boot',
    title: 'Hologram Blueprint Activation Chime',
    category: 'sfx',
    genreOrType: 'UI / Sci-Fi Telemetry',
    mood: 'Tương tác mặt bàn cảm ứng ánh sáng',
    durationSec: 2.2,
    license: 'Royalty-Free Commercial (CC0 Studio)',
    synthProfile: {
      baseFreq: 523.25,
      chordRatios: [1, 1.5, 2],
      waveform: 'sine',
    },
  },
  {
    id: 'sfx-datacenter-hum',
    title: 'Clean Server Corridor Atmosphere',
    category: 'sfx',
    genreOrType: 'Room Tone / Ambience',
    mood: 'Tiếng bước chân nhẹ & luồng khí làm mát',
    durationSec: 4.5,
    license: 'Royalty-Free Commercial (CC0 Studio)',
    synthProfile: {
      baseFreq: 130.81,
      chordRatios: [1, 1.5],
      waveform: 'triangle',
    },
  },
  {
    id: 'sfx-cinematic-whoosh',
    title: 'Anamorphic Lens Transition Whoosh',
    category: 'sfx',
    genreOrType: 'Transition Impact',
    mood: 'Chuyển cảnh mượt giàu động lượng',
    durationSec: 1.5,
    license: 'Royalty-Free Commercial (CC0 Studio)',
    synthProfile: {
      baseFreq: 164.81,
      chordRatios: [1, 1.33, 1.75],
      waveform: 'sawtooth',
    },
  },
  {
    id: 'sfx-skyline-breeze',
    title: 'High-Rise Rooftop Evening Breeze',
    category: 'sfx',
    genreOrType: 'Natural Ambience',
    mood: 'Gió nhẹ tầng thượng & âm thanh đô thị xa',
    durationSec: 5.0,
    license: 'Royalty-Free Commercial (CC0 Studio)',
    synthProfile: {
      baseFreq: 246.94,
      chordRatios: [1, 1.25, 1.5],
      waveform: 'sine',
    },
  },
];

export const INITIAL_CHARACTERS: CharacterProfile[] = [
  {
    id: 'char-linh',
    name: 'Linh',
    role: 'Kiến trúc sư trưởng AI',
    ageRange: '28 tuổi',
    visualDNA:
      'Nữ người Việt, gương mặt thanh tú, tóc đen ngang vai, đeo kính gọng tròn bạc tối giản',
    wardrobeLock:
      'Áo blazer vải linen màu xám than (charcoal linen blazer) khoác ngoài áo thun trắng cổ tròn, đồng hồ dây da đen',
    voicePersona: 'Nữ miền Nam truyền cảm, phát âm rõ nét',
    voicePitch: 'medium',
    speakingRateWpm: 145,
    personalityTraits: 'Điềm tĩnh, giàu tầm nhìn kiến trúc bền vững, quyết đoán',
    mannerisms: 'Ánh mắt tập trung, thao tác tay dứt khoát trên mặt bàn hologram',
    continuityToken:
      'CHAR_LOCK::LINH_A1[charcoal-blazer,round-silver-glasses,shoulder-black-hair]',
    source: 'google_flow_import',
    flowSeedId: 'flow://asset/vn-architect-linh-v1',
    avatarUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="%231e293b"/><circle cx="50" cy="38" r="20" fill="%23f59e0b" opacity="0.95"/><path d="M20 90c0-18 14-30 30-30s30 12 30 30" fill="%2338bdf8" opacity="0.85"/><circle cx="43" cy="37" r="4.5" fill="none" stroke="%23ffffff" stroke-width="1.8"/><circle cx="57" cy="37" r="4.5" fill="none" stroke="%23ffffff" stroke-width="1.8"/><line x1="47.5" y1="37" x2="52.5" y2="37" stroke="%23ffffff" stroke-width="1.8"/></svg>',
  },
  {
    id: 'char-minh',
    name: 'Minh',
    role: 'Kỹ sư Hệ thống Dữ liệu',
    ageRange: '32 tuổi',
    visualDNA:
      'Nam người Việt, dáng cao, tóc ngắn gọn gàng, ánh mắt tập trung, gương mặt góc cạnh',
    wardrobeLock:
      'Áo khoác sơ mi kỹ thuật màu xanh olive (olive technical overshirt) bên ngoài áo thun đen, đồng hồ thể thao thép',
    voicePersona: 'Nam trầm ấm, dứt khoát, giàu sức thuyết phục',
    voicePitch: 'low',
    speakingRateWpm: 150,
    personalityTraits: 'Thực tế, tư duy logic hệ thống, phối hợp ăn ý',
    mannerisms: 'Thường chỉ dẫn trực tiếp vào mô hình số bằng bút laser kỹ thuật',
    continuityToken:
      'CHAR_LOCK::MINH_B2[olive-tech-overshirt,black-crew-tee,short-crop-hair]',
    source: 'google_flow_import',
    flowSeedId: 'flow://asset/vn-engineer-minh-v1',
    avatarUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="%230f172a"/><circle cx="50" cy="38" r="20" fill="%2310b981" opacity="0.95"/><path d="M20 90c0-18 14-30 30-30s30 12 30 30" fill="%2364748b" opacity="0.9"/></svg>',
  },
];

export const GOOGLE_FLOW_CHARACTER_PRESETS: CharacterProfile[] = [
  {
    id: 'flow-baben',
    name: 'Ba Ben',
    role: 'Người cha gia đình 34 tuổi, ấm áp & tận tụy',
    ageRange: '34 tuổi',
    visualDNA:
      'Nam người Việt 34 tuổi, gương mặt đôn hậu ấm áp, tóc đen ngắn gọn gàng, nụ cười hiền từ thân thiện',
    wardrobeLock:
      'Áo thun polo màu xanh navy phối quần short kaki màu be sáng',
    voicePersona: 'Nam miền Nam trầm ấm, tự nhiên, gần gũi',
    voicePitch: 'low',
    speakingRateWpm: 140,
    personalityTraits: 'Thương con hết mực, kiên nhẫn, vui vẻ, ấm áp',
    mannerisms: 'Một tay bế con khéo léo, ánh mắt luôn dõi theo con trìu mến',
    continuityToken:
      'CHAR_LOCK::BABEN_1[navy-blue-polo-shirt,beige-khaki-shorts,short-black-hair]',
    source: 'google_flow_import',
    flowSeedId: 'flow://asset/vn-father-baben-v1',
    avatarUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="%230f172a"/><circle cx="50" cy="38" r="20" fill="%23fdba74" opacity="0.95"/><path d="M20 90c0-18 14-30 30-30s30 12 30 30" fill="%231d4ed8" opacity="0.95"/></svg>',
  },
  {
    id: 'flow-au',
    name: 'Ấu',
    role: 'Em bé 2 tuổi tinh nghịch, đáng yêu',
    ageRange: '2 tuổi',
    visualDNA:
      'Em bé người Việt 2 tuổi, hai má phúng phính hồng hào, mắt to tròn đen láy, nụ cười khúc khích ngây thơ',
    wardrobeLock:
      'Bộ yếm cotton màu vàng nắng ấm áp phối áo thun trắng mềm mại',
    voicePersona: 'Giọng em bé líu lo, trong trẻo, hồn nhiên',
    voicePitch: 'high',
    speakingRateWpm: 135,
    personalityTraits: 'Hiếu động, bám ba, hay cười khúc khích',
    mannerisms: 'Tay chân khua khoắng vui nhộn, thích được ba bế đi khắp nhà',
    continuityToken:
      'CHAR_LOCK::AU_2[sunny-yellow-romper,chubby-cheeks,toddler-hair-tuft]',
    source: 'google_flow_import',
    flowSeedId: 'flow://asset/vn-toddler-au-v1',
    avatarUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="%23451a03"/><circle cx="50" cy="42" r="18" fill="%23fed7aa" opacity="0.95"/><path d="M24 90c0-15 12-26 26-26s26 11 26 26" fill="%23f59e0b" opacity="0.95"/></svg>',
  },
  {
    id: 'flow-mena',
    name: 'Mẹ Na',
    role: 'Người mẹ gia đình 31 tuổi, thanh lịch & hiện đại',
    ageRange: '31 tuổi',
    visualDNA:
      'Nữ người Việt 31 tuổi, gương mặt thanh tú dịu dàng, tóc đen dài buộc nửa đầu gọn gàng, làn da sáng',
    wardrobeLock:
      'Áo blouse linen màu kem sáng phối chân váy midi trang nhã',
    voicePersona: 'Nữ miền Nam truyền cảm, dịu dàng, rõ chữ',
    voicePitch: 'medium',
    speakingRateWpm: 142,
    personalityTraits: 'Tinh tế, đảm đang, yêu thương gia đình',
    mannerisms: 'Nụ cười rạng rỡ ấm áp, cử chỉ nhẹ nhàng thanh lịch',
    continuityToken:
      'CHAR_LOCK::MENA_3[cream-linen-blouse,half-updo-black-hair,warm-smile]',
    source: 'google_flow_import',
    flowSeedId: 'flow://asset/vn-mother-mena-v1',
    avatarUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="%2331102f"/><circle cx="50" cy="38" r="20" fill="%23fde68a" opacity="0.95"/><path d="M20 90c0-18 14-30 30-30s30 12 30 30" fill="%23ec4899" opacity="0.95"/></svg>',
  },
  ...INITIAL_CHARACTERS,
  {
    id: 'flow-khoa',
    name: 'Khoa',
    role: 'Chuyên gia Quy hoạch Đô thị Số',
    ageRange: '29 tuổi',
    visualDNA:
      'Nam người Việt, 29 tuổi, tóc rẽ ngôi gọn gàng, đeo kính gọng titan mảnh, ánh mắt điềm tĩnh sắc sảo',
    wardrobeLock:
      'Áo vest xanh navy tối giản khoác ngoài sơ mi cổ trụ trắng',
    voicePersona: 'Giọng miền Bắc rõ chữ, truyền cảm',
    voicePitch: 'medium',
    speakingRateWpm: 145,
    personalityTraits: 'Điềm tĩnh, sắc sảo, truyền cảm hứng lãnh đạo',
    mannerisms: 'Cử chỉ tay dứt khoát khi thuyết trình trước bàn đồ số',
    continuityToken:
      'CHAR_LOCK::KHOA_C3[navy-suit,mandarin-shirt,titan-glasses]',
    source: 'google_flow_import',
    flowSeedId: 'flow://asset/vn-planner-khoa-v1',
    avatarUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="%231e1b4b"/><circle cx="50" cy="38" r="20" fill="%236366f1" opacity="0.95"/><path d="M20 90c0-18 14-30 30-30s30 12 30 30" fill="%231e3a8a" opacity="0.95"/><circle cx="43" cy="37" r="4" fill="none" stroke="%23e2e8f0" stroke-width="1.6"/><circle cx="57" cy="37" r="4" fill="none" stroke="%23e2e8f0" stroke-width="1.6"/><line x1="47" y1="37" x2="53" y2="37" stroke="%23e2e8f0" stroke-width="1.6"/></svg>',
  },
  {
    id: 'flow-haan',
    name: 'Hà An',
    role: 'Host TVC & Nhà báo Công nghệ',
    ageRange: '27 tuổi',
    visualDNA:
      'Nữ người Việt, nụ cười thanh lịch, tóc búi cao hiện đại, ánh nhìn cuốn hút',
    wardrobeLock:
      'Áo blazer trắng ngà cổ sen tối giản phối hoa tai bạc tinh tế',
    voicePersona: 'Nữ miền Nam ấm áp, phát thanh viên chuẩn mực',
    voicePitch: 'high',
    speakingRateWpm: 140,
    personalityTraits: 'Cuốn hút, linh hoạt, truyền tải thông điệp sáng tạo',
    mannerisms: 'Nhìn trực diện vào ống kính máy quay với nụ cười tự nhiên',
    continuityToken:
      'CHAR_LOCK::HAAN_D4[ivory-blazer,modern-updo-hair,silver-earrings]',
    source: 'google_flow_import',
    flowSeedId: 'flow://asset/vn-host-haan-v1',
    avatarUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="%23312e81"/><circle cx="50" cy="38" r="20" fill="%23ec4899" opacity="0.95"/><path d="M20 90c0-18 14-30 30-30s30 12 30 30" fill="%23f1f5f9" opacity="0.95"/></svg>',
  },
  {
    id: 'flow-elena',
    name: 'Elena',
    role: 'Nhà nghiên cứu Sinh thái AI',
    ageRange: '31 tuổi',
    visualDNA:
      'Nữ lai Á-Âu, mái tóc dài buộc nửa, ánh mắt thông thái, phong cách tự nhiên',
    wardrobeLock:
      'Áo len dệt kim xanh rêu cổ lọ khoác trench coat màu be sáng',
    voicePersona: 'Nữ trầm trung âm, ngữ điệu khoa học rõ ràng',
    voicePitch: 'medium',
    speakingRateWpm: 138,
    personalityTraits: 'Tỉ mỉ, say mê thiên nhiên sinh thái đô thị',
    mannerisms: 'Quan sát cẩn thận mẫu vật số trước khi đưa ra quyết định',
    continuityToken:
      'CHAR_LOCK::ELENA_E5[moss-green-knit,beige-trench,half-updo]',
    source: 'google_flow_import',
    flowSeedId: 'flow://asset/global-researcher-elena-v1',
    avatarUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="%23064e3b"/><circle cx="50" cy="38" r="20" fill="%2310b981" opacity="0.95"/><path d="M20 90c0-18 14-30 30-30s30 12 30 30" fill="%23d97706" opacity="0.85"/></svg>',
  },
];

export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function generateContinuityTokenForCharacter(
  name: string,
  wardrobe: string,
  indexSuffix: number
): string {
  const asciiName = removeVietnameseAccents(name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const asciiWardrobe = removeVietnameseAccents(wardrobe)
    .trim()
    .slice(0, 32)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `CHAR_LOCK::${asciiName || 'CHAR'}_${indexSuffix || 1}[${asciiWardrobe || 'default-wardrobe'}]`;
}

export function generateUniqueCharacterId(prefix: string = 'char'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export function parseUploadedCharacterJson(jsonString: string): {
  success: boolean;
  characters: CharacterProfile[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { characters?: unknown }).characters)
        ? (parsed as { characters: unknown[] }).characters
        : [parsed];

    if (rawList.length === 0) {
      return { success: false, characters: [], error: 'Tệp không chứa dữ liệu nhân vật hợp lệ.' };
    }

    const characters: CharacterProfile[] = rawList.map((item: Record<string, unknown>, idx: number) => {
      const name = String(item.name || `Nhân vật ${idx + 1}`).trim();
      const role = String(item.role || 'Nhân vật chính').trim();
      const ageRange = String(item.ageRange || item.age || '30 tuổi').trim();
      const visualDNA = String(
        item.visualDNA ||
          item.visualAppearance ||
          item.appearance ||
          'Gương mặt điện ảnh rõ nét, giữ nguyên kiểu tóc xuyên suốt'
      ).trim();
      const wardrobeLock = String(
        item.wardrobeLock || item.wardrobe || 'Trang phục chuẩn phong cách điện ảnh'
      ).trim();
      const voicePersona = String(
        item.voicePersona || item.voice || 'Giọng tự nhiên, rõ chữ'
      ).trim();
      const voicePitch =
        item.voicePitch === 'low' || item.voicePitch === 'high'
          ? (item.voicePitch as 'low' | 'high')
          : 'medium';
      const speakingRateWpm = Number(item.speakingRateWpm) || 145;
      const personalityTraits = String(
        item.personalityTraits || item.personality || 'Điềm tĩnh, sắc sảo'
      ).trim();
      const mannerisms = String(
        item.mannerisms || 'Phong thái tự nhiên, tương tác nhất quán với bối cảnh'
      ).trim();

      const continuityToken =
        typeof item.continuityToken === 'string' && item.continuityToken.startsWith('CHAR_LOCK::')
          ? item.continuityToken
          : generateContinuityTokenForCharacter(name, wardrobeLock, idx + 1);

      return {
        id: `char-upload-${Date.now()}-${idx}`,
        name,
        role,
        ageRange,
        visualDNA,
        wardrobeLock,
        voicePersona,
        voicePitch,
        speakingRateWpm,
        personalityTraits,
        mannerisms,
        continuityToken,
        avatarUrl: typeof item.avatarUrl === 'string' ? item.avatarUrl : undefined,
        source: 'uploaded',
        uploadedFileName: typeof item.uploadedFileName === 'string' ? item.uploadedFileName : undefined,
      };
    });

    return { success: true, characters };
  } catch (err) {
    return {
      success: false,
      characters: [],
      error: `Lỗi đọc định dạng JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export const INITIAL_SCRIPT = `CẢNH 1: STUDIO KIẾN TRÚC TRÊN CAO - BÌNH MINH
Linh đứng trước bàn cảm ứng hologram tại studio kính tầng 42 nhìn ra toàn cảnh TP.HCM lúc bình minh. Ánh nắng vàng ấm chiếu qua khung kính lớn.
Thoại Linh: "Mỗi công trình bền vững đều bắt đầu từ một dòng chảy dữ liệu nhất quán."

CẢNH 2: PHÒNG MÔ HÌNH ĐÔ THỊ SỐ - BUỔI SÁNG
Linh và Minh cùng nghiêng người kiểm tra sa bàn thành phố thông minh phát sáng trên bàn đá đen. Bối cảnh nối tiếp ngay sau khi Linh triệu tập dữ liệu từ bàn hologram.
Thoại Minh: "Hệ thống cảm biến năng lượng đã đồng bộ hoàn toàn với bản thiết kế của chị, Linh."

CẢNH 3: HÀNH LANG TRUNG TÂM DỮ LIỆU XANH - BUỔI CHIỀU
Linh và Minh sánh bước dọc hành lang kính của trung tâm dữ liệu sinh thái với hệ thống cây xanh thẳng đứng và đèn kiến trúc màu hổ phách ấm.
Thoại Linh: "Khi hạ tầng số vận hành hài hòa với tự nhiên, thành phố sẽ tự thở."

CẢNH 4: SÂN THƯỢNG SKY-GARDEN TOÀN CẢNH - HOÀNG HÔN
Linh và Minh đứng cạnh nhau trên sân thượng vườn treo lúc chạng vạng, phóng tầm mắt ra đường chân trời thành phố rực sáng ánh đèn tương lai.
Thoại Linh & Minh: "Kiến tạo tương lai số — Nhất quán từng khung hình."`;

export function buildContinuityPrompt(
  scene: {
    sceneNumber: number;
    title: string;
    location: string;
    timeOfDay: string;
    narrativeBeat: string;
    dialogue: string;
  },
  matchedCharacters: CharacterProfile[],
  previousScene?: {
    sceneNumber: number;
    location: string;
    timeOfDay: string;
  } | null
): {
  continuityState: SceneContinuityState;
  imagePrompt: string;
  videoPrompt: string;
  audioPrompt: string;
} {
  const tokens =
    matchedCharacters.length > 0
      ? matchedCharacters.map((c) => c.continuityToken).join(' + ')
      : 'ENV_LOCK::ARCHITECTURAL_CONTINUITY';

  const wardrobeSummary =
    matchedCharacters.length > 0
      ? matchedCharacters
          .map(
            (c) =>
              `${c.name} (${c.visualDNA}; trang phục cố định: ${c.wardrobeLock}; tính cách & thần thái: ${c.personalityTraits})`
          )
          .join('; ')
      : 'Giữ nguyên bối cảnh kiến trúc hiện đại xuyên suốt';

  const spatialHook = previousScene
    ? `Chuyển cảnh logic từ Cảnh ${previousScene.sceneNumber} (${previousScene.location} - ${previousScene.timeOfDay}) sang ${scene.location} (${scene.timeOfDay}), giữ đúng hướng ánh sáng và phục trang nhân vật.`
    : `Cảnh mở đầu thiết lập quy chuẩn nhân vật (Master Keyframe Anchor) tại ${scene.location} (${scene.timeOfDay}).`;

  const lightingContinuity =
    scene.timeOfDay.toLowerCase().includes('bình minh') ||
    scene.timeOfDay.toLowerCase().includes('hoàng hôn')
      ? 'Golden hour anamorphic key light 3200K, soft volumetric rim'
      : 'Studio architectural diffused light 4800K, natural glass reflections';

  const imagePrompt = `[Google Flow Imagen 3 Reference] [${tokens}] Cảnh ${scene.sceneNumber} (${scene.location} - ${scene.timeOfDay}): ${scene.narrativeBeat}. Nhân vật giữ đúng context: ${wardrobeSummary}. Ánh sáng: ${lightingContinuity}, ống kính 35mm anamorphic, độ phân giải 4K.`;

  const videoPrompt = `[Google Flow Veo 2 Motion] [${tokens}] Chuyển động máy quay mượt mà (dolly & subtle pan 24fps) từ keyframe Cảnh ${scene.sceneNumber}. ${scene.narrativeBeat}. ${spatialHook} Tuyệt đối không biến đổi khuôn mặt, kính hay màu áo nhân vật.`;

  const voiceNames =
    matchedCharacters.length > 0
      ? matchedCharacters
          .map(
            (c) =>
              `${c.name} (${c.voicePersona}, ${c.speakingRateWpm} wpm, pitch: ${c.voicePitch})`
          )
          .join(', ')
      : 'Thuyết minh chính';

  const audioPrompt = `[Google Flow Audio & Lyria Score] Giọng đọc: ${voiceNames} — Thoại: "${scene.dialogue || scene.narrativeBeat}". Nhạc nền ambient cinematic hiện đại hòa quyện tiếng không gian ${scene.location}.`;

  return {
    continuityState: {
      inheritedFromScene: previousScene ? previousScene.sceneNumber : null,
      characterAnchorLock: tokens,
      lightingContinuity,
      spatialHook,
      consistencyVerified: true,
    },
    imagePrompt,
    videoPrompt,
    audioPrompt,
  };
}

export function generateStylizedCharacterAvatarSvg(
  name: string,
  gender: 'male' | 'female' | 'child' = 'male',
  primaryColor: string = '#F59E0B'
): string {
  const isFemale = gender === 'female';
  const isChild = gender === 'child';
  const bgGradients = [
    { start: '#1E293B', end: '#0F172A' },
    { start: '#1E3A8A', end: '#0F172A' },
    { start: '#312E81', end: '#0F172A' },
    { start: '#064E3B', end: '#0F172A' },
  ];
  const bg = bgGradients[Math.abs(name.length) % bgGradients.length];
  const skinTone = isChild ? '#FED7AA' : isFemale ? '#FDE68A' : '#FCD34D';
  const hairColor = '#1E1B18';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${bg.start}"/><stop offset="100%" stop-color="${bg.end}"/></linearGradient><linearGradient id="cloth" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${primaryColor}"/><stop offset="100%" stop-color="#1E293B"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#bg)"/><path d="M 20 120 C 20 95, 38 82, 60 82 C 82 82, 100 95, 100 120 Z" fill="url(#cloth)"/><path d="M 52 82 L 60 92 L 68 82 Z" fill="#F8FAFC" opacity="0.9"/><rect x="52" y="68" width="16" height="18" rx="4" fill="${skinTone}"/><ellipse cx="60" cy="52" rx="${isChild ? '20' : '22'}" ry="${isChild ? '21' : '25'}" fill="${skinTone}"/>${
    isFemale
      ? `<path d="M 36 50 C 36 26, 84 26, 84 50 C 84 65, 80 75, 78 80 C 74 72, 74 52, 60 52 C 46 52, 46 72, 42 80 C 40 75, 36 65, 36 50 Z" fill="${hairColor}"/>`
      : `<path d="M 37 45 C 37 28, 83 28, 83 45 C 75 36, 68 38, 60 38 C 50 38, 44 36, 37 45 Z" fill="${hairColor}"/>`
  }<circle cx="52" cy="52" r="${isChild ? '3' : '2.5'}" fill="#0F172A"/><circle cx="68" cy="52" r="${isChild ? '3' : '2.5'}" fill="#0F172A"/><circle cx="53" cy="51" r="0.8" fill="#FFFFFF"/><circle cx="69" cy="51" r="0.8" fill="#FFFFFF"/><path d="M 54 62 Q 60 67 66 62" stroke="#B45309" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export type VoiceRegionLock = 'south' | 'north' | 'central';

export function formatRegionalVoicePersonaForCharacter(
  char: Pick<CharacterProfile, 'name' | 'ageRange' | 'voicePitch' | 'voicePersona'>,
  region: VoiceRegionLock
): string {
  const regionLabel =
    region === 'north'
      ? 'miền Bắc chuẩn, rõ chữ'
      : region === 'central'
      ? 'miền Trung mộc mạc, truyền cảm'
      : 'miền Nam ấm áp, tự nhiên';

  const lower = `${char.name} ${char.ageRange} ${char.voicePersona}`.toLowerCase();
  if (
    char.voicePitch === 'high' ||
    /^(?:[1-9]|1[0-2])\s*tuổi/i.test(char.ageRange.trim()) ||
    /(?:^|[^\p{L}\p{N}])(?:bé|ấu|con|em bé|bông|bắp|sóc)(?=[^\p{L}\p{N}]|$)/iu.test(lower)
  ) {
    return `Giọng em bé ${regionLabel}, trong trẻo`;
  }
  if (
    /(?:^|[^\p{L}\p{N}])(?:nữ|mẹ|má|chị|cô|bà|vợ|na|lan|linh|mai|hương|trang|vy)(?=[^\p{L}\p{N}]|$)/iu.test(
      lower
    )
  ) {
    return `Giọng nữ ${regionLabel}`;
  }
  return `Giọng nam ${regionLabel}`;
}

export function applyGlobalVoiceRegionLock(
  characters: CharacterProfile[],
  scenes: SceneNode[],
  region: VoiceRegionLock
): { characters: CharacterProfile[]; scenes: SceneNode[] } {
  const updatedChars = characters.map((c) => ({
    ...c,
    voicePersona: formatRegionalVoicePersonaForCharacter(c, region),
  }));

  const updatedScenes = scenes.map((scene, index) => {
    const matchedChars = updatedChars.filter((c) => scene.characterIds.includes(c.id));
    const effectiveChars =
      matchedChars.length > 0 ? matchedChars : updatedChars.slice(0, 1);
    const prev =
      index > 0
        ? {
            sceneNumber: scenes[index - 1].sceneNumber,
            location: scenes[index - 1].location,
            timeOfDay: scenes[index - 1].timeOfDay,
          }
        : null;
    const rebuilt = buildContinuityPrompt(
      {
        sceneNumber: scene.sceneNumber,
        title: scene.title,
        location: scene.location,
        timeOfDay: scene.timeOfDay,
        narrativeBeat: scene.narrativeBeat,
        dialogue: scene.dialogue,
      },
      effectiveChars,
      prev
    );
    return {
      ...scene,
      audioPrompt: rebuilt.audioPrompt,
    };
  });

  return { characters: updatedChars, scenes: updatedScenes };
}

export function buildSmartCharacterProfileFromName(
  rawName: string,
  scriptText: string = '',
  indexSuffix: number = 1
): CharacterProfile {
  const name = rawName.trim();
  const lowerName = name.toLowerCase();

  let gender: 'male' | 'female' | 'child' = 'male';
  let role = 'Nhân vật trong kịch bản';
  let ageRange = '30 tuổi';
  let visualDNA = `Gương mặt người Việt sáng rõ, đường nét tự nhiên, biểu cảm chân thực trước ống kính.`;
  let wardrobeLock =
    'Trang phục đời thường hiện đại giữ đồng nhất xuyên suốt các cảnh quay';
  let voicePersona = 'Giọng miền Nam ấm áp, tự nhiên';
  let voicePitch: 'low' | 'medium' | 'high' = 'medium';
  let speakingRateWpm = 144;
  let personalityTraits = 'Biểu cảm tự nhiên theo mạch kịch bản';
  let mannerisms = 'Diễn xuất tự nhiên trước ống kính';
  let themeColor = '#3B82F6';

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isChildByContext =
    escapedName.length >= 2 &&
    (new RegExp(
      `(?:bế|ẵm|bồng|dỗ|đút|ru|nằm chơi với|chơi với|chăm|dắt tay)\\s+${escapedName}(?=[^\\p{L}\\p{N}]|$)`,
      'iu'
    ).test(scriptText) ||
      new RegExp(
        `(?:^|[^\\p{L}\\p{N}])${escapedName}\\s+(?:khóc nhè|bò|tập đi|bú|nằm nôi|đòi bế|lon ton|bám đuôi|theo đuôi|cười khúc khích)`,
        'iu'
      ).test(scriptText));

  const isBabyName = /(?:^|[^\p{L}\p{N}])(?:ấu|mầm|đậu|kem|sữa|bơ|mỡ|nhím|gấu|thỏ|cún)(?=[^\p{L}\p{N}]|$)/iu.test(
    lowerName
  );

  if (
    /(?:^|[^\p{L}\p{N}])(?:mẹ|má|cô|chị|bà|nàng|vợ)(?=[^\p{L}\p{N}]|$)/iu.test(lowerName) ||
    /(?:^|[^\p{L}\p{N}])(?:na|lan|linh|hương|mai|vy|thảo|trang|hà|ngọc|yến|nhung)(?=[^\p{L}\p{N}]|$)/iu.test(
      lowerName
    )
  ) {
    gender = 'female';
    role = lowerName.includes('mẹ') || lowerName.includes('má')
      ? 'Người mẹ trong gia đình'
      : 'Nhân vật nữ';
    ageRange = '30 tuổi';
    visualDNA = `Nữ người Việt gương mặt thanh tú, tóc đen gọn gàng, nụ cười tự nhiên ấm áp.`;
    wardrobeLock =
      'Trang phục thường ngày thanh lịch giữ đồng nhất xuyên suốt các cảnh';
    voicePersona = 'Giọng nữ miền Nam ấm áp, tự nhiên';
    voicePitch = 'medium';
    speakingRateWpm = 144;
    themeColor = '#EC4899';
  } else if (
    isChildByContext ||
    isBabyName ||
    /(?:^|[^\p{L}\p{N}])(?:bé|con|nhóc|em)(?=[^\p{L}\p{N}]|$)/iu.test(lowerName) ||
    /(?:^|[^\p{L}\p{N}])(?:bông|bắp|sóc|kẹo|bi|bo|tôm|tép)(?=[^\p{L}\p{N}]|$)/iu.test(lowerName)
  ) {
    gender = 'child';
    const isToddler = isChildByContext || isBabyName;
    role = isToddler ? 'Em bé nhỏ trong gia đình' : 'Em bé trong gia đình';
    ageRange = isToddler ? '2 tuổi' : '6 tuổi';
    visualDNA = isToddler
      ? `Em bé người Việt khoảng 2 tuổi, hai má bầu bĩnh đáng yêu, đôi mắt to tròn lanh lợi.`
      : `Bé người Việt 6 tuổi, gương mặt sáng, nụ cười trong trẻo đáng yêu.`;
    wardrobeLock = isToddler
      ? 'Bộ quần áo trẻ em cotton sáng màu giữ đồng nhất xuyên suốt các cảnh'
      : 'Trang phục trẻ em năng động giữ đồng nhất xuyên suốt các cảnh';
    voicePersona = 'Giọng em bé miền Nam ấm áp, tự nhiên, trong trẻo';
    voicePitch = 'high';
    speakingRateWpm = 138;
    themeColor = '#F59E0B';
  } else {
    gender = 'male';
    role =
      lowerName.includes('ba') || lowerName.includes('bố') || lowerName.includes('cha')
        ? 'Người cha trong gia đình'
        : 'Nhân vật nam';
    ageRange = '32 tuổi';
    visualDNA = `Nam người Việt gương mặt sáng, tóc ngắn gọn gàng, thần thái tự nhiên thân thiện.`;
    wardrobeLock =
      'Trang phục nam thường ngày gọn gàng giữ đồng nhất xuyên suốt các cảnh';
    voicePersona = 'Giọng nam miền Nam ấm áp, tự nhiên';
    voicePitch = 'low';
    speakingRateWpm = 142;
    themeColor = '#0284C7';
  }

  const continuityToken = generateContinuityTokenForCharacter(
    name,
    wardrobeLock,
    indexSuffix
  );
  const asciiSlug =
    removeVietnameseAccents(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `char-${indexSuffix}`;

  return {
    id: `char-auto-${asciiSlug}-${indexSuffix}`,
    name,
    role,
    ageRange,
    visualDNA,
    wardrobeLock,
    voicePersona,
    voicePitch,
    speakingRateWpm,
    personalityTraits,
    mannerisms,
    continuityToken,
    avatarUrl: generateStylizedCharacterAvatarSvg(name, gender, themeColor),
    source: 'google_flow_import',
    flowSeedId: `flow://character/${asciiSlug}`,
  };
}

export function sanitizeScriptText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/&#x20;|&#32;|&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\*\*|__/g, '')
    .replace(/\r\n/g, '\n');
}

export function cleanSpokenDialogueText(raw: string): string {
  if (!raw) return '';
  let text = sanitizeScriptText(raw)
    .replace(/^#+\s*/gm, '')
    .replace(
      /\b(?:Nhân vật chính|Nhân vật|Thời lượng|Chủ đề|Bối cảnh|Tóm tắt|Ý tưởng)\s*[:：][^\n.!?]*/gi,
      ''
    )
    .replace(/CHAR_LOCK::[A-Z0-9_[\]-]+/g, '')
    .trim();

  // Strip speaker-action wrappers like `Phọng mỉm cười tự nhiên: "..."` or `Thoại Linh: "..."`
  const quotedMatch =
    text.match(
      /^[A-ZÀ-Ỹa-zà-ỹ0-9\s]{1,40}(?:mỉm cười[^:]*|nói[^:]*|hào hứng[^:]*|thở dài[^:]*)?:\s*["“]([^"”]+)["”]$/i
    ) || text.match(/^(?:Thoại|Lời thoại)[^:]*:\s*["“]?([^"”]+)["”]?$/i);
  if (quotedMatch && quotedMatch[1]) {
    text = quotedMatch[1].trim();
  }

  // Strip leading `# TẬP ...` if accidentally present
  text = text
    .replace(/^(?:#+\s*)?(?:TẬP|Tập|EPISODE)\s*\d+\s*[:：-]?[^.!?:\n]*[:：-]?\s*/i, '')
    .replace(/^["“]+|["”]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return text;
}

export function isMetadataOrPreambleLine(line: string): boolean {
  const trimmed = sanitizeScriptText(line).trim();
  if (!trimmed) return true;
  // Markdown headings (# TẬP 4..., ## Kịch bản...)
  if (/^#+\s+/.test(trimmed)) return true;
  // Explicit Episode / Script header lines (including "TẬP: ..." without number)
  if (
    /^(?:[-–—•*]\s*)?(?:Kịch bản tiếp theo|Kịch bản|Tiêu đề|Dự án|Tên phim|TẬP\s*(?:\d+|[:：-])|Tập\s*(?:\d+|[:：-])|EPISODE\s*(?:\d+|[:：-]))/i.test(
      trimmed
    )
  ) {
    return true;
  }
  // Format / genre / duration descriptor lines like "Sitcom không lời thoại dẫn chuyện | 30–40 giây"
  if (
    /^(?:[-–—•*]\s*)?(?:Sitcom|Phim ngắn|TVC|Series|Web drama|Hoạt hình|Clip ngắn)\b/i.test(
      trimmed
    ) ||
    /\|\s*\d+\s*[-–—~]?\s*\d*\s*(?:giây|s|phút)\b/i.test(trimmed)
  ) {
    return true;
  }
  // Metadata key-value lines (Nhân vật chính:, Thời lượng:, Chủ đề:, Bối cảnh chung:, etc.)
  if (
    /^(?:[-–—•*]\s*)?(?:Nhân vật chính|Nhân vật|Diễn viên|Thời lượng|Chủ đề|Ý tưởng|Tóm tắt|Bối cảnh chung|Bối cảnh chính|Phong cách|Thể loại|Mục tiêu|Âm nhạc|Ghi chú|Lưu ý|Tone|Mood)\s*[:：-]/i.test(
      trimmed
    )
  ) {
    return true;
  }
  return false;
}

export function extractCharactersFromScriptText(
  scriptText: string,
  existingCharacters: CharacterProfile[] = []
): CharacterProfile[] {
  const cleaned = sanitizeScriptText(scriptText).trim();
  if (!cleaned) {
    return existingCharacters;
  }

  // 1. Check which existing characters actually appear in this scriptText
  const matchedExisting = existingCharacters.filter((c) => {
    const escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, 'iu').test(cleaned);
  });

  // 2. Discover new character names mentioned in scriptText
  const discoveredNames: string[] = [];
  const stopWords = new Set([
    'cảnh',
    'scene',
    'tập',
    'kịch bản',
    'kịch bản tiếp theo',
    'ý tưởng',
    'thoại',
    'lời thoại',
    'tiêu đề',
    'mở đầu',
    'kết thúc',
    'buổi sáng',
    'buổi trưa',
    'buổi chiều',
    'buổi tối',
    'ban ngày',
    'bình minh',
    'hoàng hôn',
    'phòng khách',
    'phòng bếp',
    'phòng ngủ',
    'nhà bếp',
    'sân thượng',
    'cả nhà',
    'hai cha con',
    'hai bố con',
    'hai mẹ con',
    'mọi người',
    'hôm nay',
    'nhưng',
    'trong khi',
    'sau đó',
    'cuối cùng',
    'nhân vật',
    'nhân vật chính',
    'thời lượng',
    'chủ đề',
    'bối cảnh',
    'bò sữa',
    'chú bò',
    'chú bò sữa',
    'quầy kem',
    'công viên',
    'dây dắt',
    'sự cố',
    'crush',
    // Standalone kinship & pronouns (only valid when paired with a proper name like "Ba Ben", "Mẹ Na", "Bé Bông")
    'ba',
    'bố',
    'cha',
    'mẹ',
    'má',
    'bé',
    'con',
    'em',
    'anh',
    'chị',
    'ông',
    'bà',
    'cô',
    'chú',
    'bác',
    'vợ',
    'chồng',
    'bạn',
    'người',
    // Vietnamese sentence-initial adverbs, conjunctions, prepositions & common action words
    'vừa',
    'đang',
    'đã',
    'sẽ',
    'vẫn',
    'còn',
    'lại',
    'cũng',
    'rồi',
    'thì',
    'mà',
    'khi',
    'lúc',
    'nếu',
    'vì',
    'do',
    'bởi',
    'tại',
    'từ',
    'sang',
    'xuống',
    'lên',
    'vào',
    'ra',
    'qua',
    'theo',
    'đến',
    'tới',
    'về',
    'ở',
    'trên',
    'dưới',
    'trong',
    'ngoài',
    'giữa',
    'cạnh',
    'bên',
    'trước',
    'sau',
    'ngay',
    'chỉ',
    'toàn',
    'luôn',
    'hay',
    'thường',
    'rất',
    'quá',
    'lắm',
    'hơi',
    'thấy',
    'nghe',
    'biết',
    'muốn',
    'cần',
    'phải',
    'được',
    'bị',
    'làm',
    'chơi',
    'nằm',
    'ngồi',
    'đứng',
    'đi',
    'chạy',
    'bế',
    'ẵm',
    'bồng',
    'phòng',
    'bếp',
    'nhà',
    'cửa',
    'giường',
    'bàn',
    'ghế',
    'sàn',
    'thảm',
  ]);

  const addDiscovered = (candidate: string) => {
    const trimmed = candidate
      .replace(/&#x20;|&#32;|&nbsp;/gi, ' ')
      .replace(
        /\b(?:Thời lượng|Chủ đề|Bối cảnh|Tóm tắt|Ý tưởng|Mục tiêu|Phong cách)\b.*$/i,
        ''
      )
      .replace(/\([^)]*\)/g, '')
      .replace(/^[-–—•*+#\d.)\s]+/, '')
      .replace(/[:.,;!?()"“”🐮🥛✨🎬🔥💡]+$/g, '')
      .trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 24) return;
    if (/^\d+\s*(?:giây|s|phút)/i.test(trimmed)) return;
    // Every word in a character name must begin with a Unicode uppercase letter followed by lowercase letters
    if (!/^\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)*$/u.test(trimmed)) return;
    if (stopWords.has(trimmed.toLowerCase())) return;
    const words = trimmed.split(/\s+/);
    // Reject 2-word candidates where the second word is a verb/adverb/stopWord (e.g., "Ba đi", "Vừa đi", "Mẹ làm")
    if (words.length > 1 && stopWords.has(words[words.length - 1].toLowerCase())) {
      return;
    }
    if (words.length > 1 && stopWords.has(words[0].toLowerCase()) && !/^(?:mẹ|má|ba|bố|cha|bé|ông|bà|anh|chị|cô|chú|bác)$/i.test(words[0])) {
      return;
    }

    const lowerTrimmed = trimmed.toLowerCase();
    // Deduplicate against fuller kinship names (e.g., if "Ba Ben" is already present, ignore "Ben"; if "Ben" is present and "Ba Ben" arrives, upgrade "Ben" to "Ba Ben")
    const existingIdx = discoveredNames.findIndex((n) => {
      const ln = n.toLowerCase();
      return (
        ln === lowerTrimmed ||
        ln.endsWith(` ${lowerTrimmed}`) ||
        lowerTrimmed.endsWith(` ${ln}`)
      );
    });

    if (existingIdx !== -1) {
      if (trimmed.length > discoveredNames[existingIdx].length) {
        discoveredNames[existingIdx] = trimmed;
      }
      return;
    }

    const alreadyInExisting = matchedExisting.some((c) => {
      const lc = c.name.toLowerCase();
      return (
        lc === lowerTrimmed ||
        lc.endsWith(` ${lowerTrimmed}`) ||
        lowerTrimmed.endsWith(` ${lc}`)
      );
    });

    if (!alreadyInExisting) {
      discoveredNames.push(trimmed);
    }
  };

  // Pattern 0: Explicit "Nhân vật chính: ..." or "Nhân vật: ..." line
  const explicitCharLineRegex =
    /(?:Nhân vật chính|Nhân vật|Diễn viên)\s*[:：]\s*([^\n]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = explicitCharLineRegex.exec(cleaned)) !== null) {
    const rawList = match[1]
      .replace(
        /\b(?:Thời lượng|Chủ đề|Bối cảnh|Tóm tắt|Ý tưởng|Phong cách)\b.*$/i,
        ''
      )
      .trim();
    rawList
      .split(/\s*(?:,|&|và|\/|\+|;|\s[-–—]\s)\s*/i)
      .filter(Boolean)
      .forEach((part) => {
        const nameOnly = part.split(/\s*[:(–—]\s*/)[0]?.trim() || '';
        addDiscovered(nameOnly);
      });
  }

  // Pattern A: Vietnamese kinship + Proper Name (e.g., "Mẹ Na", "Ba Ben", "Bé Bông", "Anh Khoa", "Chị Linh", "Bác sĩ Nam")
  const kinshipRegex =
    /(?:^|[^\p{L}\p{N}])((?:Mẹ|Má|Ba|Bố|Cha|Bé|Ông|Bà|Anh|Chị|Cô|Chú|Bác|Bác sĩ|Kỹ sư|Thầy|Cô giáo)\s+\p{Lu}\p{Ll}+)(?=[^\p{L}\p{N}]|$)/gu;
  while ((match = kinshipRegex.exec(cleaned)) !== null) {
    addDiscovered(match[1]);
  }

  // Pattern B: Dialogue tags like "Thoại Linh:", "Thoại Minh:", "Mẹ Na:", "Phong:"
  const dialogueSpeakerRegex =
    /(?:^\s*(?:Thoại|THOẠI|Lời thoại)\s+(\p{Lu}[\p{L}\s]{1,20}?)\s*[:：])|(?:^\s*(\p{Lu}[\p{L}\s]{1,18}?)\s*[:：]\s*["“])/gmu;
  while ((match = dialogueSpeakerRegex.exec(cleaned)) !== null) {
    const rawSpeaker = (match[1] || match[2] || '').trim();
    if (
      !/^(?:nhân vật|thời lượng|chủ đề|bối cảnh|kịch bản|tập|cảnh|scene)/i.test(
        rawSpeaker
      )
    ) {
      rawSpeaker
        .split(/\s*(?:&|và|,)\s*/i)
        .filter(Boolean)
        .forEach(addDiscovered);
    }
  }

  // Pattern C: Capitalized Single/Double names before common action verbs or after relational prepositions
  const actionActorRegex =
    /(?:^|[^\p{L}\p{N}])(\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)?)\s+(?:đứng|ngồi|nằm|bế|ẵm|bồng|bước|đi|dắt|giữ|kéo|vội|vội vàng|xuất hiện|nói|cười|mỉm cười|bật cười|nhìn|chạm|mở|kiểm tra|tuyên bố|vào bếp|thở dài|ôm|cầm|chạy|đưa|uống|ăn|hỏi|đáp|quay|giật mình|bất ngờ|ngại ngùng|khóc|bò|chơi|ngủ|thức)(?=[^\p{L}\p{N}]|$)/gu;
  while ((match = actionActorRegex.exec(cleaned)) !== null) {
    addDiscovered(match[1]);
  }

  const relationalActorRegex =
    /(?:^|[^\p{L}\p{N}])(?:của|giúp|với|cùng|cho|bế|ẵm|bồng|dỗ|nhìn|gọi|ôm|và)\s+(\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)?)(?=[^\p{L}\p{N}]|$)/gu;
  while ((match = relationalActorRegex.exec(cleaned)) !== null) {
    addDiscovered(match[1]);
  }

  const builtNewCharacters = discoveredNames.map((name, idx) =>
    buildSmartCharacterProfileFromName(
      name,
      cleaned,
      matchedExisting.length + idx + 1
    )
  );

  const combined = [...matchedExisting, ...builtNewCharacters];
  if (combined.length > 0) {
    return combined;
  }

  if (existingCharacters.length > 0) {
    return existingCharacters;
  }

  return [
    buildSmartCharacterProfileFromName('Nhân vật chính', cleaned, 1),
  ];
}

export function extractProjectTitleFromScript(scriptText: string): string | null {
  const cleaned = sanitizeScriptText(scriptText);
  const lines = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  for (const rawLine of lines.slice(0, 4)) {
    const line = rawLine.replace(/^#+\s*/, '').trim();
    const prefixMatch = line.match(
      /^(?:Kịch bản tiếp theo|Kịch bản|Tiêu đề|Dự án|Tên phim)\s*[:：-]\s*(.+)$/i
    );
    if (prefixMatch && prefixMatch[1].trim()) {
      return prefixMatch[1]
        .trim()
        .replace(/\b(?:Nhân vật chính|Nhân vật|Thời lượng|Chủ đề)\b.*$/i, '')
        .replace(/^["“']+|["”']+$/g, '')
        .trim();
    }
    if (/^(?:TẬP|Tập|EPISODE)\s*\d+/i.test(line)) {
      return line
        .replace(/\b(?:Nhân vật chính|Nhân vật|Thời lượng|Chủ đề)\b.*$/i, '')
        .replace(/^[-•*+#\s]+/, '')
        .replace(/^["“']+|["”']+$/g, '')
        .trim();
    }
    if (rawLine.startsWith('#')) {
      return line
        .replace(/\b(?:Nhân vật chính|Nhân vật|Thời lượng|Chủ đề)\b.*$/i, '')
        .trim();
    }
  }
  return null;
}

export function extractSceneActionBeats(
  narrativeBeat: string,
  location: string = ''
): string[] {
  const cleanBeat = sanitizeScriptText(narrativeBeat).trim();
  const cleanLoc = sanitizeScriptText(location).trim();
  if (!cleanBeat) {
    return [cleanLoc || 'Khởi đầu phân cảnh'];
  }

  // Detect multi-room movement trajectory (e.g., "đi từ phòng khách sang phòng ngủ, xuống bếp")
  const lower = cleanBeat.toLowerCase();
  if (/từ\s+[^,.]+?\s+(?:sang|qua|đến|tới|vào|xuống|lên)\s+/i.test(cleanBeat)) {
    const clauses = cleanBeat
      .split(/\s*(?:,|;|→|->|\brồi\b|\bsau đó\b|\btiếp tục\b)\s*/i)
      .map((s) => s.trim())
      .filter(Boolean);

    if (clauses.length >= 2) {
      return clauses.slice(0, 4);
    }

    // Split "từ A sang B xuống C" into distinct visual beats
    const parts = cleanBeat
      .split(/\s+(?=(?:sang|qua|xuống|lên|vào|ra|đến|tới)\s+(?:phòng|nhà|bếp|sân|vườn|ban công|cửa|giường|bàn))/i)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return parts.slice(0, 4);
    }
  }

  // Split multi-clause actions separated by commas, semicolons, or temporal connectors
  const rawClauses = cleanBeat
    .split(/\s*(?:;|(?:\.\s+)|,\s*(?=(?:vừa|rồi|sau đó|tiếp theo|nhưng|còn|tay|mắt|miệng|quay sang|bất ngờ|liền|ngay lập tức|bế|ẵm|đi|chạy|ngồi|đứng|nằm|nhìn|cười|nói|hỏi)))\s*/i)
    .map((s) => s.replace(/^[.,;:\s]+|[.,;:\s]+$/g, '').trim())
    .filter((s) => s.length >= 4);

  if (rawClauses.length >= 2) {
    return rawClauses.slice(0, 4);
  }

  // Synthesize 2 complementary visual beats for a single-clause action so playback has natural progression
  if (/nằm chơi|chơi với|đùa/i.test(lower)) {
    return [
      cleanBeat,
      'Hai ba con cười khúc khích, tương tác ấm áp với đồ chơi trên thảm',
    ];
  }
  if (/bế|ẵm|bồng/i.test(lower)) {
    return [
      cleanBeat,
      'Em bé ôm cổ ba, mắt tròn xoe háo hức nhìn quanh theo bước chân',
    ];
  }
  if (/vào bếp|nấu|bữa sáng|pha sữa/i.test(lower)) {
    return [
      cleanBeat,
      'Cận cảnh thao tác chuẩn bị trong gian bếp ngập nắng ấm',
    ];
  }

  return [
    cleanBeat,
    `Cận cảnh biểu cảm tự nhiên của nhân vật tại ${cleanLoc || 'bối cảnh chính'}`,
  ];
}

export function isStageDirectionInsteadOfDialogue(
  dialogue: string,
  narrativeBeat: string
): boolean {
  const cleanD = cleanSpokenDialogueText(dialogue).toLowerCase();
  const cleanB = cleanSpokenDialogueText(narrativeBeat).toLowerCase();
  if (!cleanD) return true;
  if (cleanD === cleanB) return true;

  // Third-person stage direction patterns (e.g. "Ba Ben nằm chơi với Ấu.", "Ba Ben bế Ấu đi từ phòng khách...")
  if (
    /^(?:ba\s+\p{L}+|mẹ\s+\p{L}+|bé\s+\p{L}+|\p{Lu}\p{Ll}+)\s+(?:nằm|ngồi|đứng|bế|ẵm|bồng|đi\s+từ|bước|chạy|vào\s+bếp|nhìn|mỉm\s+cười|thở\s+dài|quay\s+sang|cầm|đặt|mở)(?=[^\p{L}\p{N}]|$)/iu.test(
      dialogue.trim()
    ) &&
    !/[?!~]|ơi|nhé|nha|nè|nào|đâu|rồi|chưa|hả|ạ|dạ|vâng/i.test(dialogue)
  ) {
    return true;
  }

  return false;
}

export function generateNaturalActingDialogue(
  narrativeBeat: string,
  location: string,
  characters: CharacterProfile[],
  sceneNumber: number = 1
): string {
  const lower = `${location} ${narrativeBeat}`.toLowerCase();
  const leadChar = characters[0];
  const secondChar = characters[1];
  const childChar =
    characters.find(
      (c) =>
        /^(?:[1-9]|1[0-2])\s*tuổi/i.test(c.ageRange.trim()) ||
        /(?:^|[^\p{L}\p{N}])(?:bé|ấu|bông|bắp|sóc|con|nhóc|mầm|đậu)(?=[^\p{L}\p{N}]|$)/iu.test(
          c.name
        )
    ) || secondChar;

  const babyCallName = childChar
    ? childChar.name.replace(/^(?:Bé|Con|Em)\s+/i, '').trim() || 'Ấu'
    : /(?:^|[^\p{L}\p{N}])ấu(?=[^\p{L}\p{N}]|$)/iu.test(lower)
      ? 'Ấu'
      : /(?:^|[^\p{L}\p{N}])bông(?=[^\p{L}\p{N}]|$)/iu.test(lower)
        ? 'Bông'
        : 'con';
  const parentSelf =
    (leadChar && /(?:^|[^\p{L}\p{N}])(?:mẹ|má)(?=[^\p{L}\p{N}]|$)/iu.test(leadChar.name)) ||
    /(?:^|[^\p{L}\p{N}])(?:mẹ|má)(?=[^\p{L}\p{N}]|$)/iu.test(lower)
      ? 'mẹ'
      : (leadChar && /(?:^|[^\p{L}\p{N}])(?:ba|bố|cha)(?=[^\p{L}\p{N}]|$)/iu.test(leadChar.name)) ||
          /(?:^|[^\p{L}\p{N}])(?:ba|bố|cha)(?=[^\p{L}\p{N}]|$)/iu.test(lower)
        ? 'ba'
        : 'mình';

  if (/nằm chơi|chơi với|đùa|trên thảm|trên sàn/.test(lower)) {
    return `Ú òa! ${babyCallName} của ${parentSelf} giỏi quá nè, lại đây chơi với ${parentSelf} nào!`;
  }
  if (/từ phòng khách.*phòng ngủ.*bếp|đi đâu.*theo đó|bế.*đi từ|bám đuôi|theo đuôi/.test(lower)) {
    return `${parentSelf.charAt(0).toUpperCase() + parentSelf.slice(1)} đi tới đâu là ${babyCallName} cũng đòi theo tới đó hết trơn, xuống bếp với ${parentSelf} luôn nha!`;
  }
  if (/bế|ẵm|bồng/.test(lower) && /bếp|sữa|ăn|uống/.test(lower)) {
    return `Hai ${parentSelf} con mình xuống bếp pha sữa ấm cho ${babyCallName} măm măm nhé!`;
  }
  if (/bế|ẵm|bồng/.test(lower)) {
    return `Lại đây ${parentSelf} bế nào, ${babyCallName} thương ${parentSelf} nhất nhà đúng không nè!`;
  }
  if (/ngủ|nôi|giường|ru|ngáp/.test(lower)) {
    return `Ngoan nào ${babyCallName} ơi, nhắm mắt ngủ ngon để ${parentSelf} thương nha.`;
  }
  if (/vào bếp|nấu|bữa sáng|chảo|đồ ăn/.test(lower)) {
    return `Để xem hôm nay ${parentSelf} trổ tài làm món ngon cho cả nhà mình thưởng thức nha!`;
  }
  if (/tuyên bố|nghỉ việc|nghỉ làm mẹ/.test(lower)) {
    return `Hôm nay cho phép mình nghỉ ngơi một ngày thật trọn vẹn nhé cả nhà ơi!`;
  }
  if (/thư giãn|đắp mặt nạ|uống trà|sofa/.test(lower)) {
    return `Thỉnh thoảng dành chút thời gian thư giãn thế này đúng là tuyệt vời nhất!`;
  }

  // Fallback natural acting lines varied by sceneNumber
  const fallbacks = [
    `Nào, ${babyCallName} ơi lại đây với ${parentSelf} xem có gì vui nè!`,
    `Đi thôi nào, hai ${parentSelf} con mình cùng khám phá tiếp nha!`,
    `Nhìn ${babyCallName} cười tươi chưa kìa, cưng quá đi thôi!`,
    `Khoảnh khắc bình yên bên nhau thế này thật ấm áp biết bao.`,
  ];
  return fallbacks[(sceneNumber - 1) % fallbacks.length];
}

export function buildEnglishCinemaPromptForScene(
  sceneInfo: {
    sceneNumber: number;
    location: string;
    timeOfDay: string;
    narrativeBeat: string;
    dialogue?: string;
  },
  characters: CharacterProfile[],
  options?: {
    takeNumber?: number;
    beatIndex?: number;
    customEnglishPrompt?: string;
  }
): string {
  if (options?.customEnglishPrompt && options.customEnglishPrompt.trim().length > 20) {
    return options.customEnglishPrompt.trim();
  }

  const lower = `${sceneInfo.location} ${sceneInfo.narrativeBeat}`.toLowerCase();
  const timeLower = sceneInfo.timeOfDay.toLowerCase();
  const beatIndex = options?.beatIndex || 0;
  const takeNum = options?.takeNumber || 1;

  // Build accurate English character descriptions from Vietnamese profiles
  const hasFather =
    characters.some((c) =>
      /(?:^|[^\p{L}\p{N}])(?:ba|bố|cha|ben|minh|nam)(?=[^\p{L}\p{N}]|$)/iu.test(c.name)
    ) || /(?:^|[^\p{L}\p{N}])(?:ba|bố|cha)(?=[^\p{L}\p{N}]|$)/iu.test(lower);
  const hasMother =
    characters.some((c) =>
      /(?:^|[^\p{L}\p{N}])(?:mẹ|má|na|linh|lan)(?=[^\p{L}\p{N}]|$)/iu.test(c.name)
    ) || /(?:^|[^\p{L}\p{N}])(?:mẹ|má)(?=[^\p{L}\p{N}]|$)/iu.test(lower);
  const hasChild =
    characters.some(
      (c) =>
        /^(?:[1-9]|1[0-2])\s*tuổi/i.test(c.ageRange.trim()) ||
        /(?:^|[^\p{L}\p{N}])(?:bé|ấu|bông|bắp|sóc|con|mầm|đậu)(?=[^\p{L}\p{N}]|$)/iu.test(
          c.name
        )
    ) || /(?:^|[^\p{L}\p{N}])(?:bé|ấu|bông|con|em bé)(?=[^\p{L}\p{N}]|$)/iu.test(lower);

  let subjectDesc = 'warm Vietnamese family characters';
  if (hasFather && hasChild && !hasMother) {
    subjectDesc =
      'a loving 34-year-old Vietnamese father wearing a casual navy blue polo shirt and beige chinos, together with his adorable 18-month-old Vietnamese baby toddler with chubby cheeks wearing a soft cream yellow cotton romper';
  } else if (hasMother && hasChild && !hasFather) {
    subjectDesc =
      'a gentle 31-year-old Vietnamese mother in a cream linen blouse and her cute Vietnamese toddler child';
  } else if (hasFather && hasMother && hasChild) {
    subjectDesc =
      'a happy young Vietnamese family: father in navy polo, mother in cream linen blouse, and their cute toddler child';
  } else if (characters.length > 0) {
    subjectDesc = characters
      .slice(0, 2)
      .map((c) => {
        if (/^[1-3]\s*tuổi/i.test(c.ageRange.trim())) {
          return 'an adorable 2-year-old Vietnamese toddler in a soft yellow cotton romper';
        }
        if (/^(?:[4-9]|1[0-2])\s*tuổi/i.test(c.ageRange.trim())) {
          return 'a cute 6-year-old Vietnamese child in a sunny yellow t-shirt and denim overalls';
        }
        if (
          c.voicePersona.toLowerCase().includes('nữ') ||
          /(?:^|[^\p{L}\p{N}])(?:mẹ|chị|cô|na|linh)(?=[^\p{L}\p{N}]|$)/iu.test(c.name)
        ) {
          return 'a graceful 30-year-old Vietnamese woman in modern casual attire';
        }
        return 'a warm 34-year-old Vietnamese man in a navy polo shirt and beige pants';
      })
      .join(' and ');
  }

  // Translate action & room progression accurately
  let actionAndRoomDesc = 'interacting naturally in a cozy modern Vietnamese home interior';
  if (/nằm chơi|chơi với/.test(lower)) {
    actionAndRoomDesc =
      beatIndex === 0
        ? 'lying down playfully together on a soft woven rug in a sunlit modern Vietnamese living room surrounded by colorful wooden baby toys, father smiling warmly at the baby'
        : 'close-up medium shot on a cozy living room rug, the happy Vietnamese baby giggling and reaching out while playing with the father';
  } else if (/từ phòng khách.*phòng ngủ.*bếp/.test(lower)) {
    if (beatIndex === 0) {
      actionAndRoomDesc =
        'the Vietnamese father gently carrying the cute baby toddler in his arms, walking from a bright living room through a warm wooden hallway toward the bedroom';
    } else if (beatIndex === 1) {
      actionAndRoomDesc =
        'the Vietnamese father holding his baby toddler securely in his arms, walking past a cozy sunlit bedroom doorway on his way downstairs';
    } else {
      actionAndRoomDesc =
        'the Vietnamese father holding his cute baby toddler in one arm as they arrive in a warm, bright modern Vietnamese family kitchen with wooden countertops';
    }
  } else if (/bế|ẵm|bồng/.test(lower)) {
    const room = /bếp/.test(lower)
      ? 'in a bright modern Vietnamese family kitchen'
      : /phòng ngủ/.test(lower)
        ? 'in a warm cozy bedroom'
        : 'in a sunlit modern Vietnamese home interior';
    actionAndRoomDesc = `gently holding and cradling the cute baby toddler in arms ${room}, warm affectionate expressions`;
  } else if (/vào bếp|nấu|bữa sáng|chảo/.test(lower)) {
    actionAndRoomDesc =
      'preparing a warm family meal in a bright modern Vietnamese kitchen, steam rising from a pan, warm natural morning light through the window';
  } else if (/sofa|phòng khách|thư giãn|đắp mặt nạ/.test(lower)) {
    actionAndRoomDesc =
      'relaxing comfortably on a modern fabric sofa in a sunlit Vietnamese living room with indoor plants and warm decor';
  } else if (/công viên|ngoài trời|sân/.test(lower)) {
    actionAndRoomDesc =
      'in a lush green sunlit outdoor park with soft natural bokeh background';
  }

  const lightingDesc = /tối|đêm/.test(timeLower)
    ? 'warm cozy indoor tungsten lamp lighting, cinematic evening atmosphere'
    : /hoàng hôn|chiều/.test(timeLower)
      ? 'warm golden hour sunset rays streaming through sheer curtains'
      : 'soft natural morning daylight streaming through large windows, warm cinematic color grading';

  const shotFraming =
    takeNum === 2
      ? 'medium two-shot, 50mm prime lens, f/1.8 shallow depth of field'
      : takeNum === 3
        ? 'intimate close-up tracking shot, 85mm lens, expressive faces'
        : 'cinematic wide-to-medium shot, 35mm anamorphic lens, photorealistic live-action film still';

  return `Photorealistic live-action cinema film still, ${shotFraming}: ${subjectDesc}, ${actionAndRoomDesc}. ${lightingDesc}, ultra-detailed skin texture, natural expressions, 8k resolution, Arri Alexa Mini LF.`;
}

export function generateSceneStoryboardDataUrl(
  sceneInfo: {
    sceneNumber: number;
    location: string;
    timeOfDay: string;
    narrativeBeat: string;
    dialogue: string;
  },
  characters: CharacterProfile[],
  options?: {
    takeNumber?: number;
    seed?: number;
    cameraMotion?: string;
    beatIndex?: number;
  }
): string {
  const locLower = `${sceneInfo.location} ${sceneInfo.narrativeBeat}`.toLowerCase();
  const timeLower = sceneInfo.timeOfDay.toLowerCase();
  const takeNum = options?.takeNumber || 1;
  const beatIndex = options?.beatIndex || 0;

  // Keep original photo keyframes for the default architectural TVC on Take 1 so existing visual snapshots match
  if (
    takeNum === 1 &&
    beatIndex === 0 &&
    (locLower.includes('studio kiến trúc') ||
      locLower.includes('mô hình đô thị số') ||
      locLower.includes('trung tâm dữ liệu xanh') ||
      locLower.includes('sky-garden'))
  ) {
    return KEYFRAME_POOL[(sceneInfo.sceneNumber - 1) % KEYFRAME_POOL.length];
  }

  // Detect action posture & room layout from Vietnamese script text
  const isMultiRoomJourney =
    /từ\s+.*phòng khách.*phòng ngủ.*bếp|đi đâu.*theo đó/.test(locLower) ||
    (/phòng khách/.test(locLower) && /phòng ngủ/.test(locLower) && /bếp/.test(locLower));
  const isCarryingBaby =
    /(?:^|[^\p{L}\p{N}])(?:bế|ẵm|bồng)(?=[^\p{L}\p{N}]|$)/iu.test(locLower);
  const isLyingPlaying =
    /(?:^|[^\p{L}\p{N}])(?:nằm chơi|nằm trên|chơi với|đùa)(?=[^\p{L}\p{N}]|$)/iu.test(locLower);
  const isKitchen =
    !isMultiRoomJourney &&
    /bếp|nấu|bữa sáng|chảo|nồi|bàn ăn|tạp dề|phở|trà|sữa|ăn|uống/.test(locLower);
  const isBedroom =
    !isMultiRoomJourney && /phòng ngủ|giường|nôi|ngủ|thức dậy|chăn|gối/.test(locLower);
  const isOutdoor = /sân|công viên|đường|phố|vườn|ngoài trời|ban công|cầu|trường|lớp/.test(
    locLower
  );
  const isEvening = /tối|đêm|hoàng hôn/.test(timeLower);

  // Warm, cinema-grade room palettes (bright sunlit interiors by default, cozy warm lamp-lit in evening)
  const wallTop = isEvening
    ? '#1E293B'
    : isOutdoor
      ? '#38BDF8'
      : isKitchen
        ? '#FEF3C7'
        : isBedroom
          ? '#F3E8FF'
          : '#FFFBEB';
  const wallBottom = isEvening
    ? '#334155'
    : isOutdoor
      ? '#BAE6FD'
      : isKitchen
        ? '#FDE68A'
        : isBedroom
          ? '#E9D5FF'
          : '#FEF3C7';
  const floorTop = isOutdoor
    ? '#4ADE80'
    : isEvening
      ? '#451A03'
      : '#D97706';
  const floorBottom = isOutdoor
    ? '#15803D'
    : isEvening
      ? '#270E02'
      : '#92400E';

  const shotLabel =
    takeNum === 2
      ? 'MEDIUM TWO-SHOT · 50MM PRIME'
      : takeNum === 3
        ? 'CLOSE-UP DYNAMIC · 85MM'
        : 'WIDE MASTER SHOT · 35MM';

  const isCharChild = (c: CharacterProfile) =>
    /^(?:[1-9]|1[0-2])\s*tuổi/i.test(c.ageRange.trim()) ||
    /(?:^|[^\p{L}\p{N}])(?:bé|ấu|bông|bắp|sóc|con|em|mầm|đậu)(?=[^\p{L}\p{N}]|$)/iu.test(
      c.name
    ) ||
    /(?:^|[^\p{L}\p{N}])(?:em bé|nhỏ)(?=[^\p{L}\p{N}]|$)/iu.test(c.role);

  const isCharFemale = (c: CharacterProfile) =>
    !isCharChild(c) &&
    (c.name.toLowerCase().includes('mẹ') ||
      c.name.toLowerCase().includes('chị') ||
      c.name.toLowerCase().includes('linh') ||
      c.name.toLowerCase().includes('na') ||
      c.name.toLowerCase().includes('lan') ||
      c.voicePersona.toLowerCase().includes('nữ'));

  // Helper to draw a full-body articulated adult character (with legs, shoes, torso, collar, arms, head, hair, face)
  const renderArticulatedAdult = (
    cx: number,
    floorY: number,
    isFemale: boolean,
    shirtColor: string,
    pantsColor: string,
    pose: 'walk' | 'stand' | 'cook' | 'hold_baby',
    label: string,
    stepPhase: number = 0
  ) => {
    const stride = pose === 'walk' ? (stepPhase % 2 === 0 ? 16 : -16) : 0;
    const hipY = floorY - 96;
    const shoulderY = floorY - 178;
    const headY = floorY - 216;

    return `<g>
      <!-- Ground Shadow -->
      <ellipse cx="${cx}" cy="${floorY + 4}" rx="46" ry="11" fill="#000000" opacity="0.22"/>
      <!-- Left Leg & Shoe -->
      <line x1="${cx - 12}" y1="${hipY}" x2="${cx - 16 - stride}" y2="${floorY - 6}" stroke="${pantsColor}" stroke-width="18" stroke-linecap="round"/>
      <ellipse cx="${cx - 12 - stride}" cy="${floorY}" rx="14" ry="7" fill="#1E293B"/>
      <!-- Right Leg & Shoe -->
      <line x1="${cx + 12}" y1="${hipY}" x2="${cx + 16 + stride}" y2="${floorY - 6}" stroke="${pantsColor}" stroke-width="18" stroke-linecap="round"/>
      <ellipse cx="${cx + 20 + stride}" cy="${floorY}" rx="14" ry="7" fill="#1E293B"/>
      <!-- Torso / Shirt -->
      <rect x="${cx - 30}" y="${shoulderY}" width="60" height="88" rx="18" fill="${shirtColor}"/>
      <!-- Collar -->
      <polygon points="${cx - 12},${shoulderY} ${cx},${shoulderY + 20} ${cx + 12},${shoulderY}" fill="#FFFFFF" opacity="0.9"/>
      ${
        pose === 'cook'
          ? `<rect x="${cx - 22}" y="${shoulderY + 24}" width="44" height="62" rx="6" fill="#FDE68A" opacity="0.92"/>`
          : ''
      }
      <!-- Neck & Head -->
      <rect x="${cx - 8}" y="${headY + 22}" width="16" height="16" rx="4" fill="#FDBA74"/>
      <circle cx="${cx}" cy="${headY}" r="28" fill="#FED7AA"/>
      <!-- Hair -->
      ${
        isFemale
          ? `<path d="M ${cx - 30} ${headY + 8} C ${cx - 32} ${headY - 36}, ${cx + 32} ${headY - 36}, ${cx + 30} ${headY + 8} C ${cx + 22} ${headY - 14}, ${cx - 22} ${headY - 14}, ${cx - 30} ${headY + 8} Z" fill="#1E1B4B"/>
             <circle cx="${cx - 30}" cy="${headY - 4}" r="9" fill="#1E1B4B"/>`
          : `<path d="M ${cx - 28} ${headY - 4} C ${cx - 28} ${headY - 36}, ${cx + 28} ${headY - 36}, ${cx + 28} ${headY - 4} C ${cx + 14} ${headY - 18}, ${cx - 14} ${headY - 18}, ${cx - 28} ${headY - 4} Z" fill="#18181B"/>`
      }
      <!-- Eyes, Brows & Smile -->
      <path d="M ${cx - 14} ${headY - 8} Q ${cx - 9} ${headY - 12} ${cx - 4} ${headY - 8}" stroke="#18181B" stroke-width="2" fill="none"/>
      <path d="M ${cx + 4} ${headY - 8} Q ${cx + 9} ${headY - 12} ${cx + 14} ${headY - 8}" stroke="#18181B" stroke-width="2" fill="none"/>
      <circle cx="${cx - 9}" cy="${headY - 2}" r="3.2" fill="#0F172A"/>
      <circle cx="${cx + 9}" cy="${headY - 2}" r="3.2" fill="#0F172A"/>
      <circle cx="${cx - 8}" cy="${headY - 3}" r="1.1" fill="#FFFFFF"/>
      <circle cx="${cx + 10}" cy="${headY - 3}" r="1.1" fill="#FFFFFF"/>
      <path d="M ${cx - 7} ${headY + 10} Q ${cx} ${headY + 17} ${cx + 8} ${headY + 10}" stroke="#9A3412" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      ${
        pose !== 'hold_baby'
          ? `<!-- Articulated Arms & Hands -->
             <path d="M ${cx - 26} ${shoulderY + 14} Q ${cx - 48} ${shoulderY + 48} ${cx - 24} ${shoulderY + 68}" stroke="${shirtColor}" stroke-width="14" stroke-linecap="round" fill="none"/>
             <circle cx="${cx - 23}" cy="${shoulderY + 70}" r="7" fill="#FED7AA"/>
             <path d="M ${cx + 26} ${shoulderY + 14} Q ${cx + 50} ${shoulderY + 42} ${cx + 36} ${shoulderY + 64}" stroke="${shirtColor}" stroke-width="14" stroke-linecap="round" fill="none"/>
             <circle cx="${cx + 37}" cy="${shoulderY + 66}" r="7" fill="#FED7AA"/>`
          : ''
      }
      <!-- Name Tag -->
      <rect x="${cx - 64}" y="${floorY + 12}" width="128" height="24" rx="12" fill="#0F172A" opacity="0.85"/>
      <text x="${cx}" y="${floorY + 28}" text-anchor="middle" fill="#F8FAFC" font-family="sans-serif" font-size="11.5" font-weight="700">${label}</text>
    </g>`;
  };

  // Helper to draw a full-body articulated child/toddler character
  const renderArticulatedChild = (
    cx: number,
    floorY: number,
    romperColor: string,
    label: string,
    isToddler: boolean = true
  ) => {
    const scale = isToddler ? 0.85 : 1.0;
    const hipY = floorY - Math.round(52 * scale);
    const shoulderY = floorY - Math.round(104 * scale);
    const headY = floorY - Math.round(132 * scale);

    return `<g>
      <ellipse cx="${cx}" cy="${floorY + 3}" rx="30" ry="8" fill="#000000" opacity="0.2"/>
      <!-- Little Legs & Shoes -->
      <line x1="${cx - 9}" y1="${hipY}" x2="${cx - 12}" y2="${floorY - 4}" stroke="#FED7AA" stroke-width="12" stroke-linecap="round"/>
      <line x1="${cx + 9}" y1="${hipY}" x2="${cx + 12}" y2="${floorY - 4}" stroke="#FED7AA" stroke-width="12" stroke-linecap="round"/>
      <ellipse cx="${cx - 12}" cy="${floorY}" rx="9" ry="5" fill="#F59E0B"/>
      <ellipse cx="${cx + 12}" cy="${floorY}" rx="9" ry="5" fill="#F59E0B"/>
      <!-- Romper / Outfit -->
      <rect x="${cx - 22}" y="${shoulderY}" width="44" height="${Math.round(56 * scale)}" rx="16" fill="${romperColor}"/>
      <circle cx="${cx}" cy="${shoulderY + 24}" r="9" fill="#FEF3C7"/>
      <!-- Arms waving -->
      <path d="M ${cx - 20} ${shoulderY + 12} Q ${cx - 38} ${shoulderY - 4} ${cx - 32} ${shoulderY - 14}" stroke="${romperColor}" stroke-width="10" stroke-linecap="round" fill="none"/>
      <circle cx="${cx - 32}" cy="${shoulderY - 15}" r="5.5" fill="#FED7AA"/>
      <path d="M ${cx + 20} ${shoulderY + 12} Q ${cx + 38} ${shoulderY - 4} ${cx + 32} ${shoulderY - 14}" stroke="${romperColor}" stroke-width="10" stroke-linecap="round" fill="none"/>
      <circle cx="${cx + 32}" cy="${shoulderY - 15}" r="5.5" fill="#FED7AA"/>
      <!-- Cute Baby Head -->
      <circle cx="${cx}" cy="${headY}" r="22" fill="#FED7AA"/>
      <path d="M ${cx - 12} ${headY - 18} Q ${cx} ${headY - 28} ${cx + 12} ${headY - 18}" stroke="#18181B" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <circle cx="${cx - 7}" cy="${headY - 2}" r="2.8" fill="#0F172A"/>
      <circle cx="${cx + 7}" cy="${headY - 2}" r="2.8" fill="#0F172A"/>
      <circle cx="${cx - 13}" cy="${headY + 4}" r="4.5" fill="#FB7185" opacity="0.45"/>
      <circle cx="${cx + 13}" cy="${headY + 4}" r="4.5" fill="#FB7185" opacity="0.45"/>
      <path d="M ${cx - 5} ${headY + 7} Q ${cx} ${headY + 13} ${cx + 5} ${headY + 7}" stroke="#9A3412" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Name Tag -->
      <rect x="${cx - 52}" y="${floorY + 12}" width="104" height="24" rx="12" fill="#0F172A" opacity="0.85"/>
      <text x="${cx}" y="${floorY + 28}" text-anchor="middle" fill="#FDE68A" font-family="sans-serif" font-size="11" font-weight="700">${label}</text>
    </g>`;
  };

  const adultChars = characters.filter((c) => !isCharChild(c));
  const childChars = characters.filter((c) => isCharChild(c));

  // Build Rich Environment Set SVG
  let envSetSvg = '';
  if (isMultiRoomJourney) {
    envSetSvg = `
      <!-- Room 1: Living Room (Left) -->
      <rect x="20" y="65" width="295" height="315" rx="8" fill="#FFFBEB" stroke="#F59E0B" stroke-width="2"/>
      <rect x="48" y="96" width="120" height="95" rx="6" fill="#BAE6FD" stroke="#D97706" stroke-width="3"/>
      <line x1="108" y1="96" x2="108" y2="191" stroke="#D97706" stroke-width="2"/>
      <!-- Sofa in Living Room -->
      <rect x="52" y="275" width="195" height="75" rx="12" fill="#0284C7"/>
      <rect x="42" y="295" width="22" height="58" rx="8" fill="#0369A1"/>
      <rect x="235" y="295" width="22" height="58" rx="8" fill="#0369A1"/>
      <rect x="55" y="74" width="135" height="22" rx="11" fill="#0284C7"/>
      <text x="122" y="89" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="700">1. PHÒNG KHÁCH</text>

      <!-- Room 2: Bedroom (Center) -->
      <rect x="332" y="65" width="295" height="315" rx="8" fill="#FAF5FF" stroke="#A855F7" stroke-width="2"/>
      <!-- Cozy Bed & Lamp -->
      <rect x="365" y="265" width="185" height="88" rx="10" fill="#7E22CE"/>
      <rect x="375" y="280" width="60" height="28" rx="6" fill="#F8FAFC"/>
      <rect x="370" y="305" width="175" height="45" rx="6" fill="#C084FC"/>
      <circle cx="582" cy="245" r="18" fill="#FDE047" opacity="0.85"/>
      <rect x="572" y="265" width="20" height="45" rx="3" fill="#78350F"/>
      <rect x="365" y="74" width="125" height="22" rx="11" fill="#9333EA"/>
      <text x="427" y="89" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="700">2. PHÒNG NGỦ</text>

      <!-- Room 3: Kitchen (Right) -->
      <rect x="645" y="65" width="295" height="315" rx="8" fill="#FFF7ED" stroke="#EA580C" stroke-width="2"/>
      <!-- Kitchen Cabinets, Stove & Fridge -->
      <rect x="670" y="102" width="155" height="65" rx="6" fill="#FED7AA" stroke="#C2410C" stroke-width="2"/>
      <rect x="845" y="135" width="75" height="215" rx="8" fill="#E2E8F0" stroke="#64748B" stroke-width="2"/>
      <rect x="668" y="265" width="165" height="88" rx="6" fill="#9A3412"/>
      <rect x="664" y="257" width="173" height="12" rx="4" fill="#F8FAFC"/>
      <!-- Cooking Pot & Warm Steam -->
      <rect x="725" y="232" width="44" height="25" rx="5" fill="#EF4444"/>
      <path d="M 738 224 Q 732 208 742 196" stroke="#94A3B8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M 755 224 Q 762 208 752 196" stroke="#94A3B8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <rect x="675" y="74" width="125" height="22" rx="11" fill="#EA580C"/>
      <text x="737" y="89" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="700">3. PHÒNG BẾP</text>
    `;
  } else if (isKitchen) {
    envSetSvg = `
      <!-- Sunlit Kitchen Window -->
      <rect x="90" y="88" width="190" height="145" rx="8" fill="#BAE6FD" stroke="#9A3412" stroke-width="5"/>
      <line x1="185" y1="88" x2="185" y2="233" stroke="#9A3412" stroke-width="3"/>
      <line x1="90" y1="160" x2="280" y2="160" stroke="#9A3412" stroke-width="3"/>
      <!-- Upper Cabinets & Range Hood -->
      <rect x="330" y="78" width="280" height="82" rx="6" fill="#FDBA74" stroke="#9A3412" stroke-width="2"/>
      <line x1="423" y1="78" x2="423" y2="160" stroke="#9A3412" stroke-width="2"/>
      <line x1="516" y1="78" x2="516" y2="160" stroke="#9A3412" stroke-width="2"/>
      <!-- Refrigerator -->
      <rect x="740" y="105" width="135" height="275" rx="10" fill="#F1F5F9" stroke="#64748B" stroke-width="2.5"/>
      <line x1="740" y1="215" x2="875" y2="215" stroke="#94A3B8" stroke-width="2"/>
      <!-- Kitchen Counter & Stove -->
      <rect x="290" y="275" width="420" height="105" rx="8" fill="#B45309" stroke="#78350F" stroke-width="2"/>
      <rect x="282" y="264" width="436" height="14" rx="5" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
      <!-- Pot, Pan & Warm Steam -->
      <rect x="440" y="234" width="58" height="30" rx="6" fill="#EF4444"/>
      <ellipse cx="565" cy="256" rx="34" ry="9" fill="#FDE047" stroke="#CA8A04" stroke-width="2"/>
      <path d="M 458 225 Q 450 202 462 188" stroke="#F97316" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>
      <path d="M 478 225 Q 486 202 474 188" stroke="#F97316" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>
    `;
  } else if (isOutdoor) {
    envSetSvg = `
      <!-- Sun & Fluffy Clouds -->
      <circle cx="810" cy="105" r="48" fill="#FDE047" opacity="0.9"/>
      <ellipse cx="220" cy="110" rx="65" ry="24" fill="#FFFFFF" opacity="0.85"/>
      <ellipse cx="255" cy="102" rx="45" ry="22" fill="#FFFFFF" opacity="0.9"/>
      <ellipse cx="560" cy="130" rx="55" ry="20" fill="#FFFFFF" opacity="0.8"/>
      <!-- Lush Park Trees & Pathway -->
      <circle cx="130" cy="260" r="75" fill="#16A34A"/>
      <circle cx="175" cy="245" r="60" fill="#22C55E"/>
      <rect x="142" y="310" width="22" height="75" fill="#78350F"/>
      <circle cx="840" cy="255" r="70" fill="#16A34A"/>
      <rect x="830" y="305" width="20" height="80" fill="#78350F"/>
      <path d="M 0 380 Q 480 355 960 380 L 960 540 L 0 540 Z" fill="#22C55E"/>
      <path d="M 280 540 Q 460 400 680 380 L 790 380 Q 610 420 520 540 Z" fill="#FDE68A" opacity="0.85"/>
    `;
  } else {
    // Cozy Sunlit Family Living Room / Bedroom
    envSetSvg = `
      <!-- Large Sunlit Window with Curtains -->
      <rect x="95" y="78" width="250" height="175" rx="8" fill="#BAE6FD" stroke="#B45309" stroke-width="5"/>
      <circle cx="285" cy="122" r="24" fill="#FEF08A" opacity="0.9"/>
      <path d="M 100 220 Q 160 190 220 220 T 340 215 L 340 248 L 100 248 Z" fill="#4ADE80" opacity="0.65"/>
      <line x1="220" y1="78" x2="220" y2="253" stroke="#B45309" stroke-width="4"/>
      <path d="M 88 74 L 128 74 L 112 260 L 82 260 Z" fill="#F8FAFC" opacity="0.9"/>
      <path d="M 312 74 L 352 74 L 358 260 L 328 260 Z" fill="#F8FAFC" opacity="0.9"/>
      <!-- Framed Family Picture on Wall -->
      <rect x="435" y="92" width="115" height="82" rx="6" fill="#FEF3C7" stroke="#D97706" stroke-width="4"/>
      <circle cx="475" cy="125" r="12" fill="#F59E0B"/>
      <path d="M 445 166 Q 490 135 540 166 Z" fill="#38BDF8"/>
      <!-- Cozy Living Room Sofa & Indoor Plant -->
      <rect x="410" y="248" width="350" height="122" rx="18" fill="#0284C7"/>
      <rect x="392" y="282" width="36" height="88" rx="12" fill="#0369A1"/>
      <rect x="742" y="282" width="36" height="88" rx="12" fill="#0369A1"/>
      <rect x="445" y="268" width="52" height="44" rx="10" fill="#FDE047" transform="rotate(-8 470 290)"/>
      <rect x="665" y="268" width="52" height="44" rx="10" fill="#F472B6" transform="rotate(8 690 290)"/>
      <!-- Potted Plant -->
      <rect x="825" y="315" width="48" height="58" rx="8" fill="#D97706"/>
      <ellipse cx="849" cy="275" rx="36" ry="48" fill="#16A34A"/>
      <ellipse cx="825" cy="290" rx="28" ry="36" fill="#22C55E"/>
      <ellipse cx="872" cy="290" rx="28" ry="36" fill="#22C55E"/>
    `;
  }

  // Build Characters in Action Pose
  let charBadges = '';
  const floorY = 442;

  if (isCarryingBaby && adultChars.length >= 1) {
    const parent = adultChars[0];
    const baby = childChars[0] || {
      name: 'Em bé',
      role: 'Em bé',
    };
    const isFemale = isCharFemale(parent);
    const shirtColor = isFemale ? '#EC4899' : '#1D4ED8';
    const pantsColor = isFemale ? '#F8FAFC' : '#D97706';
    const safeParentName = sanitizeScriptText(parent.name).replace(/[<>&"']/g, '').slice(0, 18);
    const safeBabyName = sanitizeScriptText(baby.name).replace(/[<>&"']/g, '').slice(0, 14);

    const journeyX = isMultiRoomJourney
      ? beatIndex === 0
        ? 185
        : beatIndex === 1
          ? 480
          : 775
      : 460 + beatIndex * 28;

    const motionArrow = isMultiRoomJourney
      ? `<g>
          <path d="M 185 405 Q 330 385 480 405 T 775 405" stroke="#0284C7" stroke-width="4" stroke-dasharray="10 6" fill="none"/>
          <polygon points="785,405 768,396 768,414" fill="#0284C7"/>
        </g>`
      : '';

    charBadges = `
      ${motionArrow}
      ${renderArticulatedAdult(
        journeyX,
        floorY,
        isFemale,
        shirtColor,
        pantsColor,
        'hold_baby',
        `${safeParentName} bế ${safeBabyName}`,
        beatIndex
      )}
      <!-- Baby Held in Arms -->
      <g>
        <rect x="${journeyX + 12}" y="${floorY - 162}" width="38" height="46" rx="16" fill="#F59E0B" stroke="#FEF3C7" stroke-width="2"/>
        <circle cx="${journeyX + 31}" cy="${floorY - 182}" r="20" fill="#FED7AA"/>
        <path d="M ${journeyX + 20} ${floorY - 198} Q ${journeyX + 31} ${floorY - 208} ${journeyX + 42} ${floorY - 198}" stroke="#18181B" stroke-width="4" fill="none" stroke-linecap="round"/>
        <circle cx="${journeyX + 25}" cy="${floorY - 183}" r="2.6" fill="#0F172A"/>
        <circle cx="${journeyX + 37}" cy="${floorY - 183}" r="2.6" fill="#0F172A"/>
        <circle cx="${journeyX + 20}" cy="${floorY - 177}" r="4" fill="#FB7185" opacity="0.5"/>
        <circle cx="${journeyX + 42}" cy="${floorY - 177}" r="4" fill="#FB7185" opacity="0.5"/>
        <path d="M ${journeyX + 27} ${floorY - 175} Q ${journeyX + 31} ${floorY - 170} ${journeyX + 35} ${floorY - 175}" stroke="#9A3412" stroke-width="2" fill="none" stroke-linecap="round"/>
        <!-- Parent Arms Wrapping Around Baby -->
        <path d="M ${journeyX - 24} ${floorY - 162} Q ${journeyX + 2} ${floorY - 122} ${journeyX + 42} ${floorY - 134}" stroke="${shirtColor}" stroke-width="15" stroke-linecap="round" fill="none"/>
        <circle cx="${journeyX + 44}" cy="${floorY - 135}" r="7" fill="#FED7AA"/>
      </g>
    `;
  } else if (isLyingPlaying && characters.length >= 1) {
    const parent = adultChars[0] || characters[0];
    const baby = childChars[0] || characters[1] || characters[0];
    const safeParentName = sanitizeScriptText(parent.name).replace(/[<>&"']/g, '').slice(0, 18);
    const safeBabyName = sanitizeScriptText(baby.name).replace(/[<>&"']/g, '').slice(0, 16);
    const shiftX = beatIndex * 14;

    charBadges = `<g>
      <!-- Soft Woven Living Room Play Rug -->
      <ellipse cx="480" cy="432" rx="340" ry="52" fill="#FEF3C7" stroke="#F59E0B" stroke-width="4"/>
      <ellipse cx="480" cy="432" rx="300" ry="38" fill="#FDE68A"/>

      <!-- Parent Lying Sideways on Rug Playing with Baby -->
      <!-- Legs stretched on rug -->
      <path d="M ${185 + shiftX} 428 L ${285 + shiftX} 416 L ${265 + shiftX} 392" stroke="#D97706" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <ellipse cx="${178 + shiftX}" cy="428" rx="14" ry="8" fill="#1E293B"/>
      <!-- Torso reclining -->
      <path d="M ${275 + shiftX} 418 C ${310 + shiftX} 375, ${375 + shiftX} 372, ${412 + shiftX} 408 Z" fill="#1D4ED8"/>
      <rect x="${280 + shiftX}" y="384" width="120" height="42" rx="18" fill="#1D4ED8" transform="rotate(-10 ${340 + shiftX} 405)"/>
      <!-- Propped Left Elbow + Waving Right Arm with Toy Rattle -->
      <path d="M ${385 + shiftX} 395 L ${375 + shiftX} 434 L ${412 + shiftX} 434" stroke="#1D4ED8" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M ${395 + shiftX} 388 Q ${442 + shiftX} 365 ${476 + shiftX} 374" stroke="#1D4ED8" stroke-width="13" stroke-linecap="round" fill="none"/>
      <circle cx="${480 + shiftX}" cy="374" r="7" fill="#FED7AA"/>
      <!-- Toy Rattle in Hand -->
      <line x1="${480 + shiftX}" y1="374" x2="${496 + shiftX}" y2="352" stroke="#F59E0B" stroke-width="4"/>
      <circle cx="${500 + shiftX}" cy="348" r="11" fill="#EF4444" stroke="#FEF08A" stroke-width="2"/>
      <!-- Parent Smiling Head -->
      <circle cx="${408 + shiftX}" cy="352" r="28" fill="#FED7AA"/>
      <path d="M ${380 + shiftX} 348 C ${380 + shiftX} 314, ${436 + shiftX} 314, ${436 + shiftX} 348 Z" fill="#18181B"/>
      <circle cx="${402 + shiftX}" cy="350" r="3" fill="#0F172A"/>
      <circle cx="${418 + shiftX}" cy="350" r="3" fill="#0F172A"/>
      <path d="M ${402 + shiftX} 360 Q ${410 + shiftX} 368 ${420 + shiftX} 360" stroke="#9A3412" stroke-width="2.4" fill="none" stroke-linecap="round"/>

      <!-- Colorful Play Blocks & Ball on Rug -->
      <circle cx="485" cy="432" r="13" fill="#3B82F6"/>
      <rect x="515" y="420" width="22" height="22" rx="4" fill="#10B981"/>
      <polygon points="450,440 462,418 474,440" fill="#EC4899"/>

      <!-- Toddler Baby Sitting & Kicking Happily on Rug -->
      <line x1="${568 - shiftX}" y1="422" x2="${542 - shiftX}" y2="412" stroke="#FED7AA" stroke-width="12" stroke-linecap="round"/>
      <line x1="${602 - shiftX}" y1="422" x2="${626 - shiftX}" y2="414" stroke="#FED7AA" stroke-width="12" stroke-linecap="round"/>
      <rect x="${562 - shiftX}" y="378" width="46" height="48" rx="18" fill="#F59E0B"/>
      <circle cx="${585 - shiftX}" cy="398" r="9" fill="#FEF3C7"/>
      <path d="M ${565 - shiftX} 390 Q ${538 - shiftX} 370 ${525 - shiftX} 364" stroke="#F59E0B" stroke-width="11" stroke-linecap="round" fill="none"/>
      <circle cx="${523 - shiftX}" cy="363" r="6" fill="#FED7AA"/>
      <circle cx="${585 - shiftX}" cy="350" r="23" fill="#FED7AA"/>
      <path d="M ${573 - shiftX} 330 Q ${585 - shiftX} 320 ${597 - shiftX} 330" stroke="#18181B" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <circle cx="${577 - shiftX}" cy="349" r="2.8" fill="#0F172A"/>
      <circle cx="${593 - shiftX}" cy="349" r="2.8" fill="#0F172A"/>
      <circle cx="${571 - shiftX}" cy="355" r="4.5" fill="#FB7185" opacity="0.5"/>
      <circle cx="${599 - shiftX}" cy="355" r="4.5" fill="#FB7185" opacity="0.5"/>
      <path d="M ${578 - shiftX} 358 Q ${585 - shiftX} 365 ${592 - shiftX} 358" stroke="#9A3412" stroke-width="2.2" fill="none" stroke-linecap="round"/>

      <!-- Labels -->
      <rect x="265" y="458" width="160" height="24" rx="12" fill="#0F172A" opacity="0.86"/>
      <text x="345" y="474" text-anchor="middle" fill="#F8FAFC" font-family="sans-serif" font-size="11.5" font-weight="700">${safeParentName} (Nằm chơi)</text>
      <rect x="520" y="458" width="145" height="24" rx="12" fill="#0F172A" opacity="0.86"/>
      <text x="592" y="474" text-anchor="middle" fill="#FDE68A" font-family="sans-serif" font-size="11.5" font-weight="700">Bé ${safeBabyName}</text>
    </g>`;
  } else {
    charBadges = characters
      .slice(0, 3)
      .map((c, idx) => {
        const baseSpacing =
          characters.length === 1
            ? 480
            : characters.length === 2
              ? 360 + idx * 240
              : 260 + idx * 220;
        const cx = baseSpacing + beatIndex * 18;
        const isChild = isCharChild(c);
        const isToddler = c.ageRange.includes('2') || /\b(?:ấu|mầm|đậu)\b/i.test(c.name);
        const isFemale = isCharFemale(c);
        const safeName = sanitizeScriptText(c.name).replace(/[<>&"']/g, '').slice(0, 18);

        if (isChild) {
          return renderArticulatedChild(cx, floorY, '#F59E0B', safeName, isToddler);
        }
        const shirtColor = isFemale
          ? '#EC4899'
          : idx % 2 === 0
            ? '#1D4ED8'
            : '#059669';
        const pantsColor = isFemale ? '#F8FAFC' : '#D97706';
        return renderArticulatedAdult(
          cx,
          floorY,
          isFemale,
          shirtColor,
          pantsColor,
          isKitchen ? 'cook' : 'stand',
          safeName,
          beatIndex
        );
      })
      .join('');
  }

  const safeTitle = sanitizeScriptText(`${sceneInfo.location} · ${sceneInfo.timeOfDay}`)
    .replace(/[<>&"']/g, '')
    .slice(0, 54);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
    <defs>
      <linearGradient id="wallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${wallTop}"/>
        <stop offset="100%" stop-color="${wallBottom}"/>
      </linearGradient>
      <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${floorTop}"/>
        <stop offset="100%" stop-color="${floorBottom}"/>
      </linearGradient>
    </defs>
    <!-- Wall / Sky Background -->
    <rect width="960" height="380" fill="url(#wallGrad)"/>
    <!-- Floor / Ground -->
    <rect x="0" y="380" width="960" height="160" fill="url(#floorGrad)"/>
    <line x1="0" y1="380" x2="960" y2="380" stroke="#78350F" stroke-width="4" opacity="0.5"/>
    <!-- Detailed Architectural Room / Park Environment -->
    ${envSetSvg}
    <!-- Articulated Characters Performing Scene Action -->
    ${charBadges}
    <!-- Subtle Cinema HUD Badge -->
    <rect x="24" y="20" width="460" height="30" rx="6" fill="#0F172A" opacity="0.82"/>
    <text x="38" y="39" fill="#FDE047" font-family="sans-serif" font-size="12.5" font-weight="700">CẢNH 0${sceneInfo.sceneNumber} · ${safeTitle}</text>
    <rect x="668" y="20" width="268" height="30" rx="6" fill="#0F172A" opacity="0.82"/>
    <text x="802" y="39" text-anchor="middle" fill="#38BDF8" font-family="monospace" font-size="11" font-weight="700">TAKE v${takeNum} · ${shotLabel}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function inferLocationAndTimeFromBlock(
  headerText: string,
  bodyText: string,
  sceneNumber: number
): { location: string; timeOfDay: string; durationSec: number; cleanedHeader: string } {
  let durationSec = 5;
  let textWithoutTime = sanitizeScriptText(headerText)
    .replace(/^#+\s*/, '')
    .trim();

  // Extract explicit time range like (0–5 giây), (5-12 giây), (20–27s), (27-30 giây)
  const rangeMatch =
    textWithoutTime.match(/\((\d+)\s*[-–—~]\s*(\d+)\s*(?:giây|s|sec)?\)/i) ||
    bodyText.match(/\((\d+)\s*[-–—~]\s*(\d+)\s*(?:giây|s|sec)?\)/i);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (end > start && end - start <= 25) {
      durationSec = Math.max(2, end - start);
    }
    textWithoutTime = textWithoutTime
      .replace(/\((\d+)\s*[-–—~]\s*(\d+)\s*(?:giây|s|sec)?\)/gi, '')
      .trim();
  } else {
    const singleDurMatch = textWithoutTime.match(/\((\d+)\s*(?:giây|s|sec)\)/i);
    if (singleDurMatch) {
      durationSec = Math.max(2, Math.min(15, Number(singleDurMatch[1]) || 5));
      textWithoutTime = textWithoutTime
        .replace(/\((\d+)\s*(?:giây|s|sec)\)/gi, '')
        .trim();
    }
  }

  const cleanedHeader = textWithoutTime
    .replace(/^[-–—•*+#\s]+/, '')
    .replace(/^(?:CẢNH|Cảnh|SCENE|Scene)\s*\d+\s*[:.-\u2013\u2014]?\s*/i, '')
    .replace(/^[-–—•*+#\s]+/, '')
    .replace(/[:：]\s*$/, '')
    .trim();

  const combinedLower = `${cleanedHeader} ${bodyText}`.toLowerCase();

  let timeOfDay = 'Ban ngày';
  if (/bình minh|sáng sớm/.test(combinedLower)) {
    timeOfDay = 'Bình minh';
  } else if (/buổi sáng|bữa sáng|sáng/.test(combinedLower)) {
    timeOfDay = 'Buổi sáng';
  } else if (/buổi trưa|trưa/.test(combinedLower)) {
    timeOfDay = 'Buổi trưa';
  } else if (/hoàng hôn|chạng vạng/.test(combinedLower)) {
    timeOfDay = 'Hoàng hôn';
  } else if (/buổi chiều|chiều/.test(combinedLower)) {
    timeOfDay = 'Buổi chiều';
  } else if (/buổi tối|tối|đêm/.test(combinedLower)) {
    timeOfDay = 'Buổi tối';
  }

  // If header uses explicit "LOCATION - TIME" format (e.g., "STUDIO KIẾN TRÚC TRÊN CAO - BÌNH MINH")
  if (cleanedHeader.includes(' - ')) {
    const parts = cleanedHeader.split(' - ').map((p) => p.trim());
    const locPart = parts[0];
    const timePart = parts.slice(1).join(' - ');
    if (
      /sáng|trưa|chiều|tối|đêm|bình minh|hoàng hôn|ngày/i.test(timePart)
    ) {
      return {
        location: locPart || `Bối cảnh ${sceneNumber}`,
        timeOfDay: timePart,
        durationSec,
        cleanedHeader,
      };
    }
  }

  // Infer location from Vietnamese keywords if header is an action title (like "Mẹ Na tuyên bố nghỉ việc" or "Crush xuất hiện")
  let location = cleanedHeader || `Bối cảnh ${sceneNumber}`;
  if (
    cleanedHeader.length > 42 ||
    /tuyên bố|vào bếp|thư giãn|nhận ra|kết thúc|bắt đầu|xuất hiện/.test(combinedLower)
  ) {
    if (/vào bếp|nấu|chảo|bữa sáng|đồ ăn|bàn ăn|bếp/.test(combinedLower)) {
      location = `Phòng bếp gia đình — ${cleanedHeader.slice(0, 36)}`;
    } else if (/sofa|phòng khách|tivi|đắp mặt nạ|thư giãn|uống trà|tạp chí/.test(combinedLower)) {
      location = `Phòng khách gia đình — ${cleanedHeader.slice(0, 36)}`;
    } else if (/phòng ngủ|giường/.test(combinedLower)) {
      location = `Phòng ngủ — ${cleanedHeader.slice(0, 36)}`;
    } else if (/sân thượng|ban công|vườn/.test(combinedLower)) {
      location = `Sân thượng — ${cleanedHeader.slice(0, 36)}`;
    } else if (/trường|lớp|hành lang|sân trường|quán/.test(combinedLower)) {
      location = `Không gian chính — ${cleanedHeader.slice(0, 36)}`;
    }
  }

  return { location, timeOfDay, durationSec, cleanedHeader };
}

export function parseScriptIntoScenes(
  scriptText: string,
  characters: CharacterProfile[] = []
): SceneNode[] {
  const cleaned = sanitizeScriptText(scriptText).trim();
  if (!cleaned) {
    return [];
  }

  const effectiveProjectCharacters = extractCharactersFromScriptText(
    cleaned,
    characters
  );

  // Filter out all top-level metadata/title preamble lines (# TẬP..., Nhân vật chính:..., Thời lượng:..., Chủ đề:...)
  const allLines = cleaned.split('\n');
  const contentLines: string[] = [];
  let seenSceneContent = false;

  for (const rawLine of allLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (seenSceneContent) contentLines.push('');
      continue;
    }
    const isExplicitSceneStart =
      /^(?:CẢNH|Cảnh|SCENE|Scene)\s*\d+/i.test(trimmed) ||
      /^(?:INT\.|EXT\.|INT\/EXT\.)/i.test(trimmed) ||
      /^[-–—•*]\s+/.test(trimmed) ||
      /^\d+[.)]\s+/.test(trimmed);

    if (!seenSceneContent && !isExplicitSceneStart && isMetadataOrPreambleLine(trimmed)) {
      continue;
    }
    if (isMetadataOrPreambleLine(trimmed) && !isExplicitSceneStart) {
      continue;
    }
    seenSceneContent = true;
    contentLines.push(trimmed);
  }

  const scriptBody =
    contentLines.join('\n').trim().length > 5
      ? contentLines.join('\n').trim()
      : cleaned;

  // Strategy 1: Explicit CẢNH N / SCENE N / INT. / EXT.
  const explicitSceneBlocks = scriptBody
    .split(/(?=\b(?:CẢNH|Cảnh|SCENE|Scene)\s*\d+|\b(?:INT\.|EXT\.|INT\/EXT\.))/g)
    .map((b) => b.trim())
    .filter(Boolean);

  // Strategy 2: Bullet-point scene beats (e.g., "- Mẹ Na tuyên bố nghỉ việc (0–5 giây)" or "– Ba và Ấu")
  const rawBulletBlocks = scriptBody
    .split(/(?:^|\n)(?=\s*[-–—•*]\s+[^\n]+)/g)
    .map((b) => b.trim())
    .filter(Boolean);
  const bulletBlocks =
    rawBulletBlocks.length > 1 && !/^[-–—•*]\s+/.test(rawBulletBlocks[0])
      ? rawBulletBlocks.slice(1)
      : rawBulletBlocks;

  // Strategy 3: Numbered blocks (e.g., "1. ...", "2. ...")
  const rawNumberedBlocks = scriptBody
    .split(/(?:^|\n)(?=\s*\d+[.)]\s+[^\n]+)/g)
    .map((b) => b.trim())
    .filter(Boolean);
  const numberedBlocks =
    rawNumberedBlocks.length > 1 && !/^\d+[.)]\s+/.test(rawNumberedBlocks[0])
      ? rawNumberedBlocks.slice(1)
      : rawNumberedBlocks;

  let blocks: string[];
  if (explicitSceneBlocks.length > 1) {
    blocks =
      !/^(?:CẢNH|Cảnh|SCENE|Scene|INT\.|EXT\.)/i.test(explicitSceneBlocks[0])
        ? explicitSceneBlocks.slice(1)
        : explicitSceneBlocks;
  } else if (bulletBlocks.length >= 1 && /^[-–—•*]\s+/.test(bulletBlocks[0])) {
    blocks = bulletBlocks;
  } else if (numberedBlocks.length > 1) {
    blocks = numberedBlocks;
  } else {
    const paragraphBlocks = scriptBody
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter((b) => b && !isMetadataOrPreambleLine(b));
    blocks =
      paragraphBlocks.length > 1
        ? paragraphBlocks
        : scriptBody
            .split('\n')
            .map((b) => b.trim())
            .filter((b) => b && !isMetadataOrPreambleLine(b));
  }

  const scenes: SceneNode[] = [];
  const bgmAssets = ROYALTY_FREE_AUDIO_LIBRARY.filter(
    (a) => a.category === 'bgm'
  );
  const sfxAssets = ROYALTY_FREE_AUDIO_LIBRARY.filter(
    (a) => a.category === 'sfx'
  );

  blocks.forEach((block, index) => {
    const sceneNumber = index + 1;
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => Boolean(l) && !isMetadataOrPreambleLine(l));

    if (lines.length === 0) return;

    const headerLine = lines[0] || `CẢNH ${sceneNumber}`;
    const isExplicitHeader =
      /^(?:CẢNH|Cảnh|SCENE|Scene)\s*\d+/i.test(headerLine) ||
      /^(?:INT\.|EXT\.|INT\/EXT\.)/i.test(headerLine) ||
      /^[-–—•*]\s+/.test(headerLine) ||
      /\(\d+\s*[-–—~]\s*\d+\s*(?:giây|s|sec)?\)/i.test(headerLine);

    const bodyLines = isExplicitHeader && lines.length > 1 ? lines.slice(1) : lines;
    const { location, timeOfDay, durationSec, cleanedHeader } =
      inferLocationAndTimeFromBlock(
        headerLine,
        bodyLines.join(' '),
        sceneNumber
      );

    let dialogue = '';
    const actionLines: string[] = [];

    for (const line of bodyLines) {
      const cleanLine = line.replace(/^[-–—•*]\s+/, '').trim();
      const dialogueMatch =
        cleanLine.match(/^(?:Thoại|THOẠI|Lời thoại)[^:]*:\s*(.+)$/i) ||
        cleanLine.match(/^([A-ZÀ-Ỹ][A-Za-zÀ-ỹ\s]{1,18})\s*:\s*["“](.+)["”]$/i) ||
        cleanLine.match(/^["“](.+)["”]$/);

      if (dialogueMatch) {
        const extractedQuote = dialogueMatch[2] || dialogueMatch[1] || '';
        dialogue = cleanSpokenDialogueText(extractedQuote);
      } else {
        const inlineQuote = cleanLine.match(/["“]([^"”]+)["”]/);
        if (inlineQuote && !dialogue) {
          dialogue = cleanSpokenDialogueText(inlineQuote[1]);
        }
        actionLines.push(cleanLine);
      }
    }

    const narrativeBeat = cleanSpokenDialogueText(
      actionLines.join(' ').trim() ||
        cleanedHeader ||
        `Cảnh quay tại ${location} vào thời điểm ${timeOfDay}.`
    );

    const matchedCharacters = effectiveProjectCharacters.filter((char) => {
      const escaped = char.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, 'iu').test(block)) {
        return true;
      }
      // Also match when block uses short kinship reference like "Ba" for "Ba Ben" or "Mẹ" for "Mẹ Na"
      const parts = char.name.split(/\s+/);
      if (parts.length > 1) {
        const lastWord = parts[parts.length - 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`(?:^|[^\\p{L}\\p{N}])${lastWord}(?=[^\\p{L}\\p{N}]|$)`, 'iu').test(block)) {
          return true;
        }
        const firstWord = parts[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (
          /^(?:Ba|Bố|Cha|Mẹ|Má)$/i.test(parts[0]) &&
          new RegExp(`(?:^|[^\\p{L}\\p{N}])${firstWord}(?=[^\\p{L}\\p{N}]|$)`, 'iu').test(block)
        ) {
          return true;
        }
      }
      return false;
    });

    const effectiveCharacters =
      matchedCharacters.length > 0
        ? matchedCharacters
        : effectiveProjectCharacters.slice(0, 2);

    // Ensure dialogue is natural character acting speech, NOT a verbatim copy of stage directions!
    const cleanDialogue =
      dialogue && !isStageDirectionInsteadOfDialogue(dialogue, narrativeBeat)
        ? cleanSpokenDialogueText(dialogue)
        : generateNaturalActingDialogue(
            narrativeBeat,
            location,
            effectiveCharacters,
            sceneNumber
          );

    const actionBeats = extractSceneActionBeats(narrativeBeat, location);

    const previousScene =
      scenes.length > 0
        ? {
            sceneNumber: scenes[scenes.length - 1].sceneNumber,
            location: scenes[scenes.length - 1].location,
            timeOfDay: scenes[scenes.length - 1].timeOfDay,
          }
        : null;

    const title = `${location} (${timeOfDay})`;
    const built = buildContinuityPrompt(
      {
        sceneNumber,
        title,
        location,
        timeOfDay,
        narrativeBeat,
        dialogue: cleanDialogue,
      },
      effectiveCharacters,
      previousScene
    );

    const seed = 104200 + sceneNumber * 137;
    const keyframeUrl = generateSceneStoryboardDataUrl(
      {
        sceneNumber,
        location,
        timeOfDay,
        narrativeBeat,
        dialogue: cleanDialogue,
      },
      effectiveCharacters,
      { takeNumber: 1, seed, beatIndex: 0 }
    );

    const motionFrames = actionBeats.map((_, bIdx) =>
      generateSceneStoryboardDataUrl(
        {
          sceneNumber,
          location,
          timeOfDay,
          narrativeBeat,
          dialogue: cleanDialogue,
        },
        effectiveCharacters,
        { takeNumber: 1, seed, beatIndex: bIdx }
      )
    );

    const initialTake: SceneTake = {
      takeNumber: 1,
      createdAt: '2026-11-07 10:00',
      seed,
      imagePrompt: built.imagePrompt,
      videoPrompt: built.videoPrompt,
      audioPrompt: built.audioPrompt,
      cameraMotion:
        sceneNumber % 2 === 1
          ? 'Dolly In chậm + Pan phải 12° (24fps)'
          : 'Tracking Shot song song + Handheld nhẹ (24fps)',
      lightingNote: built.continuityState.lightingContinuity,
      keyframeUrl,
      motionFrames,
      actionBeats,
    };

    const defaultGrade: ColorGradePreset =
      sceneNumber === 1
        ? 'cinematic-warm'
        : sceneNumber === 2
          ? 'anamorphic-teal'
          : sceneNumber === 3
            ? 'high-contrast-doc'
            : 'cinematic-warm';

    const defaultBgm = bgmAssets[(sceneNumber - 1) % bgmAssets.length];
    const defaultSfx = sfxAssets[(sceneNumber - 1) % sfxAssets.length];

    scenes.push({
      id: `scene-${sceneNumber}`,
      sceneNumber,
      title,
      location,
      timeOfDay,
      narrativeBeat,
      dialogue: cleanDialogue,
      characterIds: effectiveCharacters.map((c) => c.id),
      continuityState: built.continuityState,
      imagePrompt: built.imagePrompt,
      videoPrompt: built.videoPrompt,
      audioPrompt: built.audioPrompt,
      imageStatus: 'done',
      videoStatus: 'done',
      audioStatus: 'done',
      reviewStatus: 'pending_review',
      selectedForBatch: false,
      currentTake: 1,
      takes: [initialTake],
      postEdit: {
        trimStartSec: 0,
        trimEndSec: durationSec,
        durationSec,
        transition: sceneNumber === 1 ? 'cut' : 'cross-dissolve',
        colorGrade: defaultGrade,
        voiceoverVolume: 92,
        bgmVolume: 48,
        sfxVolume: 65,
        bgmTrackId: defaultBgm.id,
        bgmTrackTitle: defaultBgm.title,
        sfxTrackId: defaultSfx.id,
        sfxTrackTitle: defaultSfx.title,
        subtitleText: cleanDialogue,
        playbackSpeed: 1,
      },
      keyframeUrl,
      motionFrames,
      actionBeats,
    });
  });

  return scenes;
}

export function analyzeScriptQuality(
  scriptText: string,
  scenes: SceneNode[],
  characters: CharacterProfile[]
): ScriptAnalysisReport {
  const effectiveCharacters = extractCharactersFromScriptText(
    scriptText,
    characters
  );
  const effectiveScenes =
    scenes.length > 0
      ? scenes
      : parseScriptIntoScenes(scriptText, effectiveCharacters);

  if (effectiveScenes.length === 0) {
    return {
      overallSummary:
        'Chưa có kịch bản đầu vào. Hãy dán kịch bản của bạn hoặc chọn kịch bản mẫu để AI phân tích.',
      coherenceStatus: 'Chờ nhập kịch bản để kiểm tra mạch logic',
      dialogueNaturalnessStatus: 'Chờ nhập kịch bản để tối ưu lời thoại',
      pacingBalanceStatus: 'Chờ nhập kịch bản để tính toán thời lượng',
      estimatedTotalDurationSec: 0,
      suggestions: [],
    };
  }

  const suggestions: ScriptCritiqueSuggestion[] = [];
  const leadChar = effectiveCharacters[0]?.name || 'Nhân vật chính';
  const secondChar =
    effectiveCharacters[1]?.name || effectiveCharacters[0]?.name || 'Nhân vật';

  // 1. Plot Coherence Suggestion (100% Dynamic based on actual scenes & characters)
  if (effectiveScenes.length >= 2) {
    const s1 = effectiveScenes[0];
    const s2 = effectiveScenes[1];
    suggestions.push({
      id: 'crit-plot-1',
      dimension: 'plot_coherence',
      sceneNumber: 2,
      severity: 'high_impact',
      title: `Tăng liên kết chuyển cảnh giữa Cảnh 1 (${s1.location}) và Cảnh 2 (${s2.location})`,
      analysis: `Để mạch chuyển từ hành động của ${leadChar} ở Cảnh 1 sang tình huống của ${secondChar} tại ${s2.location} mượt mà hơn, nên thêm chi tiết phản ứng ánh mắt hoặc đạo cụ nối tiếp giữa hai cảnh.`,
      originalSnippet: s2.narrativeBeat,
      suggestedRewrite: `${s2.narrativeBeat} Máy quay lia nhẹ từ biểu cảm của ${leadChar} sang hành động tiếp nối của ${secondChar}, giữ nguyên hướng sáng và phục trang khóa Context.`,
    });
  } else {
    suggestions.push({
      id: 'crit-plot-single',
      dimension: 'plot_coherence',
      sceneNumber: 1,
      severity: 'recommendation',
      title: 'Mở rộng cấu trúc 3 hồi cho kịch bản',
      analysis:
        'Kịch bản hiện có ít phân cảnh. Nên tách thành tối thiểu 3 cảnh (Mở đầu đặt vấn đề — Cao trào tương tác nhân vật — Kết thúc lắng đọng) để tạo nhịp điệu sinh động.',
    });
  }

  // 2. Dialogue Naturalness Suggestions (Dynamic rewrite based on actual scene dialogue)
  effectiveScenes.forEach((scene) => {
    const rawDlg = cleanSpokenDialogueText(scene.dialogue);
    const wordCount = rawDlg.split(/\s+/).filter(Boolean).length;
    const sceneChars = effectiveCharacters.filter((c) =>
      scene.characterIds.includes(c.id)
    );
    const speakerName = sceneChars[0]?.name || leadChar;

    if (scene.sceneNumber === 2 || wordCount > 14) {
      let dynamicRewrite: string;
      const sentences = rawDlg
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (sentences.length > 1) {
        dynamicRewrite = sentences[0];
      } else if (wordCount > 18) {
        const words = rawDlg.split(/\s+/);
        dynamicRewrite = `${words.slice(0, 16).join(' ')}.`;
      } else {
        dynamicRewrite = rawDlg;
      }

      suggestions.push({
        id: `crit-dialogue-${scene.sceneNumber}`,
        dimension: 'dialogue_naturalness',
        sceneNumber: scene.sceneNumber,
        severity: 'recommendation',
        title: `Tối ưu nhịp thở lời thoại Cảnh ${scene.sceneNumber} (${speakerName}) cho tự nhiên`,
        analysis: `Câu thoại hiện tại (${wordCount} từ) của ${speakerName} có thể cô đọng lại để khẩu hình nhân vật trên Google Flow Veo 2 khớp âm và giàu cảm xúc đời thực hơn.`,
        originalSnippet: scene.dialogue,
        suggestedRewrite: dynamicRewrite,
      });
    }
  });

  // 3. Scene Pacing Suggestions
  effectiveScenes.forEach((scene, idx) => {
    const wordCount = scene.dialogue.trim().split(/\s+/).filter(Boolean).length;
    const idealDuration = Math.max(
      4,
      Math.min(
        8,
        Math.round(wordCount / 2.6 + (idx === effectiveScenes.length - 1 ? 2 : 1))
      )
    );
    if (idealDuration !== scene.postEdit.durationSec || idx === 0) {
      const recDur =
        idx === effectiveScenes.length - 1
          ? Math.max(5.5, scene.postEdit.durationSec)
          : idx === 0
            ? Math.min(5, Math.max(4, scene.postEdit.durationSec - 0.5))
            : idealDuration;
      suggestions.push({
        id: `crit-pacing-${scene.sceneNumber}`,
        dimension: 'scene_pacing',
        sceneNumber: scene.sceneNumber,
        severity: 'insight',
        title: `Điều chỉnh nhịp độ Cảnh ${scene.sceneNumber} (${scene.timeOfDay}) sang ${recDur}s`,
        analysis:
          idx === 0
            ? `Cảnh mở đầu (${leadChar}) nên giữ nhịp gọn ${recDur}s để thu hút người xem ngay từ những giây đầu tiên.`
            : idx === effectiveScenes.length - 1
              ? `Cảnh kết cần ngân khoảng ${recDur}s để cảm xúc nhân vật và thông điệp lắng đọng trọn vẹn.`
              : `Với lượng thoại ${wordCount} từ tại ${scene.location}, thời lượng ${recDur}s giúp nhịp diễn xuất không bị gấp.`,
        recommendedDurationSec: recDur,
      });
    }
  });

  const estimatedTotalDurationSec = Number(
    effectiveScenes
      .reduce((acc, s) => acc + s.postEdit.durationSec, 0)
      .toFixed(1)
  );

  const firstTime = effectiveScenes[0]?.timeOfDay || 'Mở đầu';
  const lastTime =
    effectiveScenes[effectiveScenes.length - 1]?.timeOfDay || 'Kết thúc';
  const charNamesList = effectiveCharacters.map((c) => c.name).join(', ');

  return {
    overallSummary: `Đã phân tích ${effectiveScenes.length} phân cảnh với ${effectiveCharacters.length} nhân vật (${charNamesList}). Đề xuất ${suggestions.length} tinh chỉnh chuyên sâu cho cốt truyện, lời thoại và nhịp dựng.`,
    coherenceStatus: `Mạch logic xuyên suốt (${charNamesList}) · Khớp tiến trình ${firstTime} → ${lastTime}`,
    dialogueNaturalnessStatus:
      'Khẩu ngữ tự nhiên · Tương thích tốc độ đọc 140–150 wpm',
    pacingBalanceStatus: `Nhịp điệu cân bằng · Tổng thời lượng dự kiến ${estimatedTotalDurationSec}s`,
    estimatedTotalDurationSec,
    suggestions,
  };
}

export function applyCritiqueSuggestionToState(
  scenes: SceneNode[],
  characters: CharacterProfile[],
  suggestion: ScriptCritiqueSuggestion
): SceneNode[] {
  if (!suggestion.sceneNumber) return scenes;

  return scenes.map((scene, idx) => {
    if (scene.sceneNumber !== suggestion.sceneNumber) return scene;

    const updatedBeat =
      suggestion.dimension === 'plot_coherence' && suggestion.suggestedRewrite
        ? suggestion.suggestedRewrite
        : scene.narrativeBeat;

    const updatedDialogue =
      suggestion.dimension === 'dialogue_naturalness' &&
      suggestion.suggestedRewrite
        ? cleanSpokenDialogueText(suggestion.suggestedRewrite)
        : cleanSpokenDialogueText(scene.dialogue);

    const updatedDuration =
      suggestion.dimension === 'scene_pacing' &&
      typeof suggestion.recommendedDurationSec === 'number'
        ? suggestion.recommendedDurationSec
        : scene.postEdit.durationSec;

    const matchedChars = characters.filter((c) =>
      scene.characterIds.includes(c.id)
    );
    const effectiveChars =
      matchedChars.length > 0 ? matchedChars : characters.slice(0, 1);

    const prevScene =
      idx > 0
        ? {
            sceneNumber: scenes[idx - 1].sceneNumber,
            location: scenes[idx - 1].location,
            timeOfDay: scenes[idx - 1].timeOfDay,
          }
        : null;

    const rebuilt = buildContinuityPrompt(
      {
        sceneNumber: scene.sceneNumber,
        title: scene.title,
        location: scene.location,
        timeOfDay: scene.timeOfDay,
        narrativeBeat: updatedBeat,
        dialogue: updatedDialogue,
      },
      effectiveChars,
      prevScene
    );

    return {
      ...scene,
      narrativeBeat: updatedBeat,
      dialogue: updatedDialogue,
      imagePrompt: rebuilt.imagePrompt,
      videoPrompt: rebuilt.videoPrompt,
      audioPrompt: rebuilt.audioPrompt,
      postEdit: {
        ...scene.postEdit,
        subtitleText: updatedDialogue,
        durationSec: updatedDuration,
        trimEndSec: scene.postEdit.trimStartSec + updatedDuration,
      },
    };
  });
}

export function assignAudioAssetToScene(
  scenes: SceneNode[],
  targetSceneId: string | 'all',
  asset: AudioLibraryAsset
): SceneNode[] {
  return scenes.map((scene) => {
    if (targetSceneId !== 'all' && scene.id !== targetSceneId) {
      return scene;
    }

    if (asset.category === 'bgm') {
      return {
        ...scene,
        postEdit: {
          ...scene.postEdit,
          bgmTrackId: asset.id,
          bgmTrackTitle: asset.title,
        },
      };
    }

    return {
      ...scene,
      postEdit: {
        ...scene.postEdit,
        sfxTrackId: asset.id,
        sfxTrackTitle: asset.title,
      },
    };
  });
}

export function triggerSelectiveRegeneration(
  scenes: SceneNode[],
  targetSceneIds: string[],
  promptOverrides?: Record<
    string,
    Partial<Pick<SceneNode, 'imagePrompt' | 'videoPrompt' | 'audioPrompt'>>
  >,
  timestamp = '2026-11-03 12:45',
  characters: CharacterProfile[] = []
): SceneNode[] {
  const targetSet = new Set(targetSceneIds);

  return scenes.map((scene) => {
    if (!targetSet.has(scene.id)) {
      return scene;
    }

    const override = promptOverrides?.[scene.id];
    const nextTakeNumber = scene.currentTake + 1;
    const nextImagePrompt = override?.imagePrompt ?? scene.imagePrompt;
    const nextVideoPrompt = override?.videoPrompt ?? scene.videoPrompt;
    const nextAudioPrompt = override?.audioPrompt ?? scene.audioPrompt;
    const nextSeed = 104200 + scene.sceneNumber * 137 + nextTakeNumber * 997;
    const cameraMotion =
      nextTakeNumber % 2 === 0
        ? 'Crane Up mượt + Focus Pull vào nhân vật chính (24fps)'
        : 'Steadicam Orbit 15° giữ trục ánh sáng (24fps)';

    const matchedChars = characters.filter((c) =>
      scene.characterIds.includes(c.id)
    );
    const effectiveChars =
      matchedChars.length > 0
        ? matchedChars
        : characters.length > 0
          ? characters.slice(0, 2)
          : [
              buildSmartCharacterProfileFromName(
                'Nhân vật',
                scene.narrativeBeat,
                1
              ),
            ];

    const cleanBeat = cleanSpokenDialogueText(scene.narrativeBeat);
    const refinedDialogue = isStageDirectionInsteadOfDialogue(scene.dialogue, cleanBeat)
      ? generateNaturalActingDialogue(
          cleanBeat,
          scene.location,
          effectiveChars,
          scene.sceneNumber
        )
      : cleanSpokenDialogueText(scene.dialogue);
    const actionBeats =
      scene.actionBeats && scene.actionBeats.length > 0
        ? scene.actionBeats
        : extractSceneActionBeats(cleanBeat, scene.location);

    const nextKeyframeUrl = generateSceneStoryboardDataUrl(
      {
        sceneNumber: scene.sceneNumber,
        location: scene.location,
        timeOfDay: scene.timeOfDay,
        narrativeBeat: cleanBeat,
        dialogue: refinedDialogue,
      },
      effectiveChars,
      {
        takeNumber: nextTakeNumber,
        seed: nextSeed,
        cameraMotion,
        beatIndex: 0,
      }
    );

    const motionFrames = actionBeats.map((_, bIdx) =>
      generateSceneStoryboardDataUrl(
        {
          sceneNumber: scene.sceneNumber,
          location: scene.location,
          timeOfDay: scene.timeOfDay,
          narrativeBeat: cleanBeat,
          dialogue: refinedDialogue,
        },
        effectiveChars,
        {
          takeNumber: nextTakeNumber,
          seed: nextSeed,
          cameraMotion,
          beatIndex: bIdx,
        }
      )
    );

    const newTake: SceneTake = {
      takeNumber: nextTakeNumber,
      createdAt: timestamp,
      seed: nextSeed,
      imagePrompt: nextImagePrompt,
      videoPrompt: nextVideoPrompt,
      audioPrompt: nextAudioPrompt,
      cameraMotion,
      lightingNote: scene.continuityState.lightingContinuity,
      keyframeUrl: nextKeyframeUrl,
      voiceoverAudioUrl: scene.voiceoverAudioUrl,
      motionFrames,
      actionBeats,
    };

    return {
      ...scene,
      dialogue: refinedDialogue,
      imagePrompt: nextImagePrompt,
      videoPrompt: nextVideoPrompt,
      audioPrompt: nextAudioPrompt,
      imageStatus: 'done',
      videoStatus: 'done',
      audioStatus: 'done',
      reviewStatus: 'pending_review',
      currentTake: nextTakeNumber,
      keyframeUrl: nextKeyframeUrl,
      motionFrames,
      actionBeats,
      takes: [...scene.takes, newTake],
      postEdit: {
        ...scene.postEdit,
        subtitleText: refinedDialogue,
      },
    };
  });
}

export function computeProductionProgress(scenes: SceneNode[]): {
  totalScenes: number;
  generatedScenes: number;
  approvedScenes: number;
  needsRegenCount: number;
  readyForAssembly: boolean;
  totalDurationSec: number;
  completionPercent: number;
} {
  const totalScenes = scenes.length;
  if (totalScenes === 0) {
    return {
      totalScenes: 0,
      generatedScenes: 0,
      approvedScenes: 0,
      needsRegenCount: 0,
      readyForAssembly: false,
      totalDurationSec: 0,
      completionPercent: 0,
    };
  }

  const generatedScenes = scenes.filter(
    (s) =>
      s.imageStatus === 'done' &&
      s.videoStatus === 'done' &&
      s.audioStatus === 'done'
  ).length;

  const approvedScenes = scenes.filter((s) => s.reviewStatus === 'approved').length;
  const needsRegenCount = scenes.filter(
    (s) => s.reviewStatus === 'needs_regen'
  ).length;

  const totalDurationSec = Number(
    scenes
      .reduce(
        (acc, s) =>
          acc +
          Math.max(
            0.5,
            (s.postEdit.trimEndSec - s.postEdit.trimStartSec) /
              s.postEdit.playbackSpeed
          ),
        0
      )
      .toFixed(1)
  );

  const completionPercent = Math.round(
    ((generatedScenes * 0.5 + approvedScenes * 0.5) / totalScenes) * 100
  );

  return {
    totalScenes,
    generatedScenes,
    approvedScenes,
    needsRegenCount,
    readyForAssembly: approvedScenes === totalScenes && totalScenes > 0,
    totalDurationSec,
    completionPercent,
  };
}

export function compareProjectVersions(
  baseVersion: ProjectVersion,
  targetVersion: ProjectVersion
): VersionComparisonReport {
  const baseMap = new Map<number, SceneNode>();
  baseVersion.scenes.forEach((s) => baseMap.set(s.sceneNumber, s));

  const targetMap = new Map<number, SceneNode>();
  targetVersion.scenes.forEach((s) => targetMap.set(s.sceneNumber, s));

  const allSceneNumbers = Array.from(
    new Set([...baseMap.keys(), ...targetMap.keys()])
  ).sort((a, b) => a - b);

  let modifiedScenesCount = 0;
  let addedScenesCount = 0;
  let removedScenesCount = 0;
  let unchangedScenesCount = 0;

  const sceneDiffs: SceneDiffItem[] = allSceneNumbers.map((num) => {
    const b = baseMap.get(num) || null;
    const t = targetMap.get(num) || null;

    if (!b && t) {
      addedScenesCount++;
      return {
        sceneNumber: num,
        sceneTitle: t.title,
        changeType: 'added',
        changedFields: ['Thêm phân cảnh mới'],
        baseTake: null,
        targetTake: t.currentTake,
        baseDurationSec: null,
        targetDurationSec: t.postEdit.durationSec,
        baseReviewStatus: null,
        targetReviewStatus: t.reviewStatus,
        baseVideoPrompt: null,
        targetVideoPrompt: t.videoPrompt,
        baseCharacterLock: null,
        targetCharacterLock: t.continuityState.characterAnchorLock,
        baseColorGrade: null,
        targetColorGrade: t.postEdit.colorGrade,
        baseTransition: null,
        targetTransition: t.postEdit.transition,
      };
    }

    if (b && !t) {
      removedScenesCount++;
      return {
        sceneNumber: num,
        sceneTitle: b.title,
        changeType: 'removed',
        changedFields: ['Đã lược bỏ phân cảnh'],
        baseTake: b.currentTake,
        targetTake: null,
        baseDurationSec: b.postEdit.durationSec,
        targetDurationSec: null,
        baseReviewStatus: b.reviewStatus,
        targetReviewStatus: null,
        baseVideoPrompt: b.videoPrompt,
        targetVideoPrompt: null,
        baseCharacterLock: b.continuityState.characterAnchorLock,
        targetCharacterLock: null,
        baseColorGrade: b.postEdit.colorGrade,
        targetColorGrade: null,
        baseTransition: b.postEdit.transition,
        targetTransition: null,
      };
    }

    const changedFields: string[] = [];
    if (b!.currentTake !== t!.currentTake) {
      changedFields.push(`Take (v${b!.currentTake} → v${t!.currentTake})`);
    }
    if (b!.videoPrompt !== t!.videoPrompt) {
      changedFields.push('Video Prompt');
    }
    if (b!.imagePrompt !== t!.imagePrompt) {
      changedFields.push('Image Prompt');
    }
    if (b!.audioPrompt !== t!.audioPrompt) {
      changedFields.push('Audio Prompt');
    }
    if (b!.reviewStatus !== t!.reviewStatus) {
      changedFields.push('Trạng thái duyệt');
    }
    if (b!.postEdit.durationSec !== t!.postEdit.durationSec) {
      changedFields.push(
        `Thời lượng (${b!.postEdit.durationSec}s → ${t!.postEdit.durationSec}s)`
      );
    }
    if (b!.postEdit.colorGrade !== t!.postEdit.colorGrade) {
      changedFields.push(
        `Màu hậu kỳ (${b!.postEdit.colorGrade} → ${t!.postEdit.colorGrade})`
      );
    }
    if (b!.postEdit.transition !== t!.postEdit.transition) {
      changedFields.push(
        `Chuyển cảnh (${b!.postEdit.transition} → ${t!.postEdit.transition})`
      );
    }
    if (b!.postEdit.bgmTrackId !== t!.postEdit.bgmTrackId) {
      changedFields.push('Nhạc nền BGM');
    }
    if (b!.postEdit.sfxTrackId !== t!.postEdit.sfxTrackId) {
      changedFields.push('Hiệu ứng SFX');
    }
    if (b!.postEdit.subtitleText !== t!.postEdit.subtitleText) {
      changedFields.push('Phụ đề');
    }
    if (
      b!.continuityState.characterAnchorLock !==
      t!.continuityState.characterAnchorLock
    ) {
      changedFields.push('Khóa Context Nhân vật');
    }

    if (changedFields.length > 0) {
      modifiedScenesCount++;
    } else {
      unchangedScenesCount++;
    }

    return {
      sceneNumber: num,
      sceneTitle: t!.title,
      changeType: changedFields.length > 0 ? 'modified' : 'unchanged',
      changedFields,
      baseTake: b!.currentTake,
      targetTake: t!.currentTake,
      baseDurationSec: b!.postEdit.durationSec,
      targetDurationSec: t!.postEdit.durationSec,
      baseReviewStatus: b!.reviewStatus,
      targetReviewStatus: t!.reviewStatus,
      baseVideoPrompt: b!.videoPrompt,
      targetVideoPrompt: t!.videoPrompt,
      baseCharacterLock: b!.continuityState.characterAnchorLock,
      targetCharacterLock: t!.continuityState.characterAnchorLock,
      baseColorGrade: b!.postEdit.colorGrade,
      targetColorGrade: t!.postEdit.colorGrade,
      baseTransition: b!.postEdit.transition,
      targetTransition: t!.postEdit.transition,
    };
  });

  const baseDur = computeProductionProgress(baseVersion.scenes).totalDurationSec;
  const targetDur = computeProductionProgress(
    targetVersion.scenes
  ).totalDurationSec;

  return {
    baseVersionTag: baseVersion.versionTag,
    targetVersionTag: targetVersion.versionTag,
    modifiedScenesCount,
    addedScenesCount,
    removedScenesCount,
    unchangedScenesCount,
    totalDurationDeltaSec: Number((targetDur - baseDur).toFixed(1)),
    scriptChanged: baseVersion.scriptRaw.trim() !== targetVersion.scriptRaw.trim(),
    sceneDiffs,
  };
}

function formatSrtTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');
  return `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)},${pad3(ms)}`;
}

function formatEdlTimecode(totalSeconds: number): string {
  const fps = 24;
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const frames = Math.floor((totalSeconds - Math.floor(totalSeconds)) * fps);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)}:${pad2(frames)}`;
}

export function exportTimelineToSRT(scenes: SceneNode[]): string {
  let cursor = 0;
  return scenes
    .map((scene, idx) => {
      const clipDur = Math.max(
        0.5,
        (scene.postEdit.trimEndSec - scene.postEdit.trimStartSec) /
          scene.postEdit.playbackSpeed
      );
      const start = formatSrtTime(cursor);
      const end = formatSrtTime(cursor + clipDur);
      cursor += clipDur;
      return `${idx + 1}\n${start} --> ${end}\n${scene.postEdit.subtitleText}\n`;
    })
    .join('\n');
}

export function exportTimelineToEDL(
  projectTitle: string,
  scenes: SceneNode[]
): string {
  const header = `TITLE: ${projectTitle}\nFCM: NON-DROP FRAME\n\n`;
  let recordCursor = 0;

  const lines = scenes.map((scene, idx) => {
    const editNum = String(idx + 1).padStart(3, '0');
    const reel = `FLOW_S${String(scene.sceneNumber).padStart(2, '0')}`;
    const clipDur = Math.max(
      0.5,
      (scene.postEdit.trimEndSec - scene.postEdit.trimStartSec) /
        scene.postEdit.playbackSpeed
    );
    const srcIn = formatEdlTimecode(scene.postEdit.trimStartSec);
    const srcOut = formatEdlTimecode(scene.postEdit.trimEndSec);
    const recIn = formatEdlTimecode(recordCursor);
    const recOut = formatEdlTimecode(recordCursor + clipDur);
    recordCursor += clipDur;

    return `${editNum}  ${reel}   V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}\n* FROM CLIP NAME: ${scene.title} (TAKE v${scene.currentTake})\n* CONTINUITY LOCK: ${scene.continuityState.characterAnchorLock}\n* AUDIO BGM: ${scene.postEdit.bgmTrackTitle} | SFX: ${scene.postEdit.sfxTrackTitle || 'None'}\n* COLOR GRADE: ${scene.postEdit.colorGrade} | TRANSITION: ${scene.postEdit.transition}`;
  });

  return header + lines.join('\n\n') + '\n';
}

export function createInitialVersions(): {
  characters: CharacterProfile[];
  scenes: SceneNode[];
  versions: ProjectVersion[];
} {
  const characters = INITIAL_CHARACTERS;
  const v1Scenes = parseScriptIntoScenes(INITIAL_SCRIPT, characters);

  const v1: ProjectVersion = {
    id: 'ver-1-0',
    versionTag: 'v1.0',
    label: 'Bản dựng gốc từ kịch bản Admin',
    createdAt: '2026-11-03 09:20',
    author: 'Admin Studio',
    notes:
      'Phân tích 4 phân cảnh tự động từ kịch bản gốc, khóa context nhân vật Linh & Minh, hoàn tất render lượt 1.',
    scriptRaw: INITIAL_SCRIPT,
    scenes: structuredClone(v1Scenes),
    characters: structuredClone(characters),
    masterApproved: false,
  };

  const v2Scenes = triggerSelectiveRegeneration(
    structuredClone(v1Scenes),
    ['scene-2', 'scene-3'],
    {
      'scene-2': {
        videoPrompt:
          '[Google Flow Veo 2 Motion] [CHAR_LOCK::LINH_A1 + MINH_B2] Close-up Orbits quanh bàn hologram đô thị số, nhấn mạnh ánh sáng xanh phản chiếu lên kính gọng tròn của Linh và áo khoác olive của Minh (24fps).',
      },
    },
    '2026-11-03 10:45'
  ).map((s) => ({
    ...s,
    reviewStatus: (s.sceneNumber <= 3
      ? 'approved'
      : 'pending_review') as SceneReviewStatus,
    postEdit: {
      ...s.postEdit,
      durationSec: s.sceneNumber === 2 ? 6 : 5,
      trimEndSec: s.sceneNumber === 2 ? 6 : 5,
      colorGrade:
        s.sceneNumber === 2
          ? ('anamorphic-teal' as ColorGradePreset)
          : s.postEdit.colorGrade,
    },
  }));

  const v1_1: ProjectVersion = {
    id: 'ver-1-1',
    versionTag: 'v1.1',
    label: 'Regen Cảnh 2 & 3 + Tinh chỉnh màu hậu kỳ',
    createdAt: '2026-11-03 10:50',
    author: 'Admin Studio',
    notes:
      'Chạy lại riêng Cảnh 2 (Take v2) và Cảnh 3 (Take v2) để tăng chiều sâu ánh sáng hologram, kéo dài Cảnh 2 lên 6s.',
    scriptRaw: INITIAL_SCRIPT,
    scenes: structuredClone(v2Scenes),
    characters: structuredClone(characters),
    masterApproved: false,
  };

  return {
    characters,
    scenes: v2Scenes,
    versions: [v1, v1_1],
  };
}

export function parseRawScriptToStructuredTimeline(
  rawText: string,
  characters: CharacterProfile[] = []
): ScriptIngestionResult {
  const cleaned = rawText.trim();
  if (!cleaned) {
    return {
      detectedFormat: 'freeform',
      totalWordCount: 0,
      estimatedRuntimeSec: 0,
      extractedCharacterList: [],
      extractedLocationList: [],
      agentTelemetry: {
        stepsCompleted: [
          'Nhận diện Sluglines & Phân rã ranh giới phân cảnh (Scene Boundaries Detected)',
          'Trích xuất Thực thể Nhân vật & Phục trang (Character & Wardrobe Locked)',
          'Bóc tách Thuộc tính Môi trường & Ánh sáng (INT/EXT, Time, Lighting)',
          'Phân rã Chuỗi Hành động & Góc máy điện ảnh (Action Beats & Camera Motion)',
          'Đồng bộ Dòng thời gian tuần tự (Structured Timeline Synthesized)',
        ],
        parserModel: 'Google Flow AI Ingestion Agent',
        parsingConfidencePercent: 100,
      },
      timeline: [],
    };
  }

  const effectiveChars = extractCharactersFromScriptText(cleaned, characters);
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;

  // Determine script format
  let detectedFormat: ScriptIngestionResult['detectedFormat'] = 'tvc_commercial';
  if (/(?:INT\.|EXT\.|INT\/EXT\.)/i.test(cleaned)) {
    detectedFormat = 'screenplay_fountain';
  } else if (/(?:CẢNH|Cảnh|SCENE|Scene)\s*\d+/i.test(cleaned)) {
    detectedFormat = 'tvc_commercial';
  } else if (cleaned.split(/\n\s*\n/).length >= 3) {
    detectedFormat = 'narrative_prose';
  } else {
    detectedFormat = 'freeform';
  }

  // Strip top preamble lines
  const allLines = cleaned.split('\n');
  let bodyStartIndex = 0;
  for (let i = 0; i < Math.min(4, allLines.length); i++) {
    const l = allLines[i].trim();
    if (!l) continue;
    if (
      /^(?:Kịch bản tiếp theo|Kịch bản|Tiêu đề|Dự án|TẬP\s*\d+|Tập\s*\d+|Ý tưởng|Tóm tắt|Chủ đề)\s*[:：-]/i.test(
        l
      ) ||
      (/^(?:TẬP|Tập)\s*\d+/i.test(l) && allLines.length > 2)
    ) {
      bodyStartIndex = i + 1;
    } else {
      break;
    }
  }
  const scriptBody =
    bodyStartIndex > 0 && allLines.slice(bodyStartIndex).join('\n').trim().length > 10
      ? allLines.slice(bodyStartIndex).join('\n').trim()
      : cleaned;

  // Split into scene blocks
  const sceneRegex =
    /(?=(?:\b(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)|\b(?:CẢNH|Cảnh|SCENE|Scene)\s*\d+))/gi;
  let rawBlocks = scriptBody.split(sceneRegex).map((b) => b.trim()).filter(Boolean);

  if (rawBlocks.length <= 1) {
    const bulletBlocks = scriptBody
      .split(/\n(?=\s*[-•*]\s+[^\n]+)/g)
      .map((b) => b.trim())
      .filter(Boolean);
    if (bulletBlocks.length > 1) {
      rawBlocks = bulletBlocks;
    } else {
      rawBlocks = scriptBody.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    }
  }

  const timeline: IngestedSceneNode[] = [];
  const characterOccurrences = new Map<string, number>();
  const locationOccurrences = new Map<string, { intExt: string; count: number }>();

  rawBlocks.forEach((block, idx) => {
    const sceneNumber = idx + 1;
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const headerLine = lines[0] || `CẢNH ${sceneNumber}: BỐI CẢNH ${sceneNumber}`;

    // Slugline parsing
    let intExt: 'INT' | 'EXT' | 'INT/EXT' = 'INT';
    if (/EXT\./i.test(headerLine) || /NGOẠI\s*CẢNH/i.test(headerLine)) {
      intExt = 'EXT';
    } else if (/INT\/EXT\.|I\/E\./i.test(headerLine)) {
      intExt = 'INT/EXT';
    } else if (
      /sân thượng|cầu bộ hành|bờ sông|công viên|quảng trường|đường phố/i.test(
        headerLine
      )
    ) {
      intExt = 'EXT';
    }

    const { location: settingName, timeOfDay, durationSec } =
      inferLocationAndTimeFromBlock(
        headerLine.replace(/^(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*/i, ''),
        lines.slice(1).join(' '),
        sceneNumber
      );

    // Atmosphere & Lighting
    const isSunriseOrSunset =
      /bình minh|hoàng hôn|dusk|dawn|chạng vạng|chiều/i.test(timeOfDay) ||
      /bình minh|hoàng hôn|chạng vạng/i.test(block);

    const lightingMood = isSunriseOrSunset
      ? 'Golden hour anamorphic 3200K, ấm áp, tương phản cao'
      : /tối|night|đêm/i.test(timeOfDay)
        ? 'Cinematic low-key 5600K với ánh sáng neon đô thị xanh hổ phách'
        : 'Studio diffused 4800K, ánh sáng tự nhiên qua kính';

    const environmentType =
      intExt === 'EXT' ? 'Kiến trúc ngoại cảnh đô thị sinh thái' : 'Không gian nội cảnh hiện đại';
    const atmosphere = isSunriseOrSunset
      ? 'Tráng lệ, giàu cảm xúc, truyền cảm hứng'
      : 'Tự nhiên, chân thực, mạch diễn xuất nhịp nhàng';

    // Character Extraction
    const matchedChars: IngestedCharacterMeta[] = [];
    effectiveChars.forEach((char) => {
      const escaped = char.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(block)) {
        const count = characterOccurrences.get(char.name) || 0;
        characterOccurrences.set(char.name, count + 1);
        matchedChars.push({
          name: char.name,
          roleHint: char.role,
          wardrobe: char.wardrobeLock,
          emotionalState:
            sceneNumber === 1
              ? 'Tập trung, chiêm nghiệm'
              : sceneNumber === 2
                ? 'Tương tác sắc sảo, tự nhiên'
                : 'Thư thái, cảm xúc',
          prominence: 'lead',
        });
      }
    });

    if (matchedChars.length === 0) {
      const fallbackLead = effectiveChars[0];
      if (fallbackLead) {
        matchedChars.push({
          name: fallbackLead.name,
          roleHint: fallbackLead.role,
          wardrobe: fallbackLead.wardrobeLock,
          emotionalState: 'Tập trung diễn xuất',
          prominence: 'lead',
        });
        const count = characterOccurrences.get(fallbackLead.name) || 0;
        characterOccurrences.set(fallbackLead.name, count + 1);
      }
    }

    // Actions & Dialogue Breakdown
    const bodyLines = lines.slice(1);
    const actions: IngestedActionBeat[] = [];
    const dialogueLines: Array<{ speaker: string; text: string; emotion?: string }> = [];

    bodyLines.forEach((line) => {
      const cleanLine = line.replace(/^[-•*]\s+/, '').trim();
      const dialogueMatch =
        cleanLine.match(/^(?:Thoại|THOẠI|Lời thoại|Dialogue)\s*([^:]*)[:.-]\s*(.+)$/i) ||
        cleanLine.match(/^([A-ZÀ-Ỹa-zà-ỹ\s]+)[:.-]\s*["“](.+)["”]$/);

      if (dialogueMatch) {
        const rawSpeaker = dialogueMatch[1].trim() || matchedChars[0]?.name || 'Nhân vật';
        const text = (dialogueMatch[2] || '').replace(/^["“]|["”]$/g, '').trim();
        dialogueLines.push({
          speaker: rawSpeaker,
          text,
          emotion: 'Truyền cảm, dứt khoát',
        });
      } else {
        const inlineQuote = cleanLine.match(/["“]([^"”]+)["”]/);
        if (inlineQuote && dialogueLines.length === 0) {
          dialogueLines.push({
            speaker: matchedChars[0]?.name || 'Thuyết minh',
            text: inlineQuote[1].trim(),
            emotion: 'Rõ chữ, cảm xúc',
          });
        }
        if (cleanLine) {
          const stepNum = actions.length + 1;
          actions.push({
            step: stepNum,
            description: cleanLine,
            visualCue: `Chi tiết góc máy tập trung vào ${matchedChars.map((c) => c.name).join(' & ')} tại ${settingName}`,
            cameraMovement:
              stepNum % 2 === 1
                ? 'Dolly In chậm 24fps giữ trục mắt'
                : 'Tracking Shot song song mượt mà',
          });
        }
      }
    });

    if (actions.length === 0) {
      actions.push({
        step: 1,
        description: `${matchedChars.map((c) => c.name).join(' và ')} hiện diện trong không gian ${settingName}.`,
        visualCue: `Khung hình thiết lập không gian ${settingName} vào ${timeOfDay}`,
        cameraMovement: 'Cinematic Slow Pan 24fps',
      });
    }

    // Location frequency tracking
    const locKey = settingName;
    const existingLoc = locationOccurrences.get(locKey) || {
      intExt,
      count: 0,
    };
    locationOccurrences.set(locKey, {
      intExt,
      count: existingLoc.count + 1,
    });

    const slugline = `${intExt}. ${settingName.toUpperCase()} - ${timeOfDay.toUpperCase()}`;
    const narrativeSummary = actions.map((a) => a.description).join(' ');
    const suggestedDurationSec = durationSec;

    const prevScene = timeline[timeline.length - 1];
    const continuityHook = prevScene
      ? `Nối tiếp logic từ Cảnh 0${prevScene.sceneNumber} (${prevScene.location.settingName} - ${prevScene.location.timeOfDay}) sang ${settingName} (${timeOfDay}), bảo tồn phục trang và hướng sáng.`
      : `Phân cảnh gốc định hình chuẩn nhân vật (Master Anchor) tại ${settingName}.`;

    const keyVisualPrompt = `[Google Flow Keyframe] [${matchedChars.map((c) => `LOCK_${c.name.toUpperCase()}`).join(' + ')}] ${slugline}. ${narrativeSummary}. Phục trang: ${matchedChars.map((c) => `${c.name}: ${c.wardrobe}`).join('; ')}. Ánh sáng: ${lightingMood}.`;

    timeline.push({
      sceneNumber,
      slugline,
      location: {
        settingName,
        intExt,
        timeOfDay,
        environmentType,
        lightingMood,
        atmosphere,
      },
      characters: matchedChars,
      actions,
      narrativeSummary,
      dialogueLines,
      suggestedDurationSec,
      continuityHook,
      keyVisualPrompt,
    });
  });

  const estimatedRuntimeSec = timeline.reduce(
    (acc, s) => acc + s.suggestedDurationSec,
    0
  );

  const extractedCharacterList = Array.from(characterOccurrences.entries()).map(
    ([name, count]) => {
      const match = effectiveChars.find((c) => c.name === name);
      return {
        name,
        count,
        roleSuggestion: match?.role || 'Nhân vật chính',
      };
    }
  );

  const extractedLocationList = Array.from(locationOccurrences.entries()).map(
    ([name, meta]) => ({
      name,
      intExt: meta.intExt,
      sceneCount: meta.count,
    })
  );

  return {
    detectedFormat,
    totalWordCount: wordCount,
    estimatedRuntimeSec,
    extractedCharacterList,
    extractedLocationList,
    agentTelemetry: {
      stepsCompleted: [
        'Nhận diện Sluglines & Phân rã ranh giới phân cảnh (Scene Boundaries Detected)',
        'Trích xuất Thực thể Nhân vật & Phục trang (Character & Wardrobe Locked)',
        'Bóc tách Thuộc tính Môi trường & Ánh sáng (INT/EXT, Time, Lighting)',
        'Phân rã Chuỗi Hành động & Góc máy điện ảnh (Action Beats & Camera Motion)',
        'Đồng bộ Dòng thời gian tuần tự (Structured Timeline Synthesized)',
      ],
      parserModel: 'Google Flow AI Ingestion Agent',
      parsingConfidencePercent: 98,
    },
    timeline,
  };
}

export function convertIngestedTimelineToSceneNodes(
  ingestedTimeline: IngestedSceneNode[],
  characters: CharacterProfile[] = []
): SceneNode[] {
  const bgmAssets = ROYALTY_FREE_AUDIO_LIBRARY.filter(
    (a) => a.category === 'bgm'
  );
  const sfxAssets = ROYALTY_FREE_AUDIO_LIBRARY.filter(
    (a) => a.category === 'sfx'
  );

  const scenes: SceneNode[] = [];

  ingestedTimeline.forEach((item, idx) => {
    const sceneNumber = idx + 1;
    const title = `${item.location.settingName} (${item.location.timeOfDay})`;
    const matchedChars = characters.filter((c) =>
      item.characters.some(
        (ic) => ic.name.toLowerCase() === c.name.toLowerCase()
      )
    );
    const builtFromItemChars =
      matchedChars.length > 0
        ? matchedChars
        : item.characters.map((ic, cIdx) =>
            buildSmartCharacterProfileFromName(
              ic.name,
              item.narrativeSummary,
              cIdx + 1
            )
          );
    const effectiveChars =
      builtFromItemChars.length > 0
        ? builtFromItemChars
        : characters.slice(0, 1);

    const prevScene =
      scenes.length > 0
        ? {
            sceneNumber: scenes[scenes.length - 1].sceneNumber,
            location: scenes[scenes.length - 1].location,
            timeOfDay: scenes[scenes.length - 1].timeOfDay,
          }
        : null;

    const dialogueText =
      item.dialogueLines.map((d) => `${d.speaker}: "${d.text}"`).join(' ') ||
      item.narrativeSummary;

    const built = buildContinuityPrompt(
      {
        sceneNumber,
        title,
        location: item.location.settingName,
        timeOfDay: item.location.timeOfDay,
        narrativeBeat: item.narrativeSummary,
        dialogue: dialogueText,
      },
      effectiveChars,
      prevScene
    );

    const keyframeUrl = generateSceneStoryboardDataUrl(
      {
        sceneNumber,
        location: item.location.settingName,
        timeOfDay: item.location.timeOfDay,
        narrativeBeat: item.narrativeSummary,
        dialogue: dialogueText,
      },
      effectiveChars
    );
    const seed = 104200 + sceneNumber * 137;
    const defaultGrade: ColorGradePreset =
      sceneNumber === 1
        ? 'cinematic-warm'
        : sceneNumber === 2
          ? 'anamorphic-teal'
          : sceneNumber === 3
            ? 'high-contrast-doc'
            : 'cinematic-warm';

    const defaultBgm = bgmAssets[(sceneNumber - 1) % bgmAssets.length];
    const defaultSfx = sfxAssets[(sceneNumber - 1) % sfxAssets.length];

    const initialTake: SceneTake = {
      takeNumber: 1,
      createdAt: '2026-11-07 10:00',
      seed,
      imagePrompt: built.imagePrompt,
      videoPrompt: built.videoPrompt,
      audioPrompt: built.audioPrompt,
      cameraMotion:
        item.actions[0]?.cameraMovement ||
        'Dolly In chậm + Pan phải 12° (24fps)',
      lightingNote: item.location.lightingMood,
      keyframeUrl,
    };

    scenes.push({
      id: `scene-${sceneNumber}`,
      sceneNumber,
      title,
      location: item.location.settingName,
      timeOfDay: item.location.timeOfDay,
      narrativeBeat: item.narrativeSummary,
      dialogue: dialogueText,
      characterIds: effectiveChars.map((c) => c.id),
      continuityState: built.continuityState,
      imagePrompt: built.imagePrompt,
      videoPrompt: built.videoPrompt,
      audioPrompt: built.audioPrompt,
      imageStatus: 'done',
      videoStatus: 'done',
      audioStatus: 'done',
      reviewStatus: 'pending_review',
      selectedForBatch: false,
      currentTake: 1,
      takes: [initialTake],
      postEdit: {
        trimStartSec: 0,
        trimEndSec: item.suggestedDurationSec,
        durationSec: item.suggestedDurationSec,
        transition: sceneNumber === 1 ? 'cut' : 'cross-dissolve',
        colorGrade: defaultGrade,
        voiceoverVolume: 92,
        bgmVolume: 48,
        sfxVolume: 65,
        bgmTrackId: defaultBgm.id,
        bgmTrackTitle: defaultBgm.title,
        sfxTrackId: defaultSfx.id,
        sfxTrackTitle: defaultSfx.title,
        subtitleText: dialogueText,
        playbackSpeed: 1,
      },
      keyframeUrl,
    });
  });

  return scenes;
}

