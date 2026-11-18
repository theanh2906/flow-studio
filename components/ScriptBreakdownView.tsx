'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Wand2,
  UserCheck,
  Plus,
  ArrowRight,
  Lock,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  Volume2,
  Check,
  Clock,
  MessageSquareQuote,
  GitBranch,
  Upload,
  Download,
  Image as ImageIcon,
  Copy,
  Layers,
  LayoutGrid,
  Maximize2,
  Film,
  Video,
  Music,
  ExternalLink,
  Info,
  CheckCheck,
  Edit3,
  RefreshCw,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  CharacterProfile,
  SceneNode,
  ScriptAnalysisReport,
  ScriptCritiqueSuggestion,
  VoiceRegionLock,
  formatRegionalVoicePersonaForCharacter,
  buildContinuityPrompt,
  parseUploadedCharacterJson,
  generateContinuityTokenForCharacter,
  generateUniqueCharacterId,
} from '@/lib/flow-engine';
import ScriptIngestionComponent from './ScriptIngestionComponent';
import FlowCanvasPlayer from './FlowCanvasPlayer';

interface ScriptBreakdownViewProps {
  scriptText: string;
  onScriptTextChange: (text: string) => void;
  characters: CharacterProfile[];
  onCharactersChange: (chars: CharacterProfile[]) => void;
  scenes: SceneNode[];
  onScenesChange: (scenes: SceneNode[]) => void;
  isAnalyzing: boolean;
  onAnalyzeScript: (overrideText?: string) => Promise<void>;
  scriptCritique: ScriptAnalysisReport;
  isCritiquing: boolean;
  onRunScriptCritique: (overrideText?: string) => Promise<void>;
  onApplyCritiqueSuggestion: (suggestion: ScriptCritiqueSuggestion) => void;
  onApplyAllCritiqueSuggestions?: () => void;
  onApproveAndStartParallelBuild: () => void;
  analysisEngineLabel: string;
  voiceRegion?: VoiceRegionLock;
  onVoiceRegionChange?: (region: VoiceRegionLock) => void;
}

export default function ScriptBreakdownView({
  scriptText,
  onScriptTextChange,
  characters,
  onCharactersChange,
  scenes,
  onScenesChange,
  isAnalyzing,
  onAnalyzeScript,
  scriptCritique,
  isCritiquing,
  onRunScriptCritique,
  onApplyCritiqueSuggestion,
  onApplyAllCritiqueSuggestions,
  onApproveAndStartParallelBuild,
  analysisEngineLabel,
  voiceRegion = 'south',
  onVoiceRegionChange,
}: ScriptBreakdownViewProps) {
  // Top Stage 01 Sub-view switcher: Breakdown vs Ingestion Timeline
  const [subView, setSubView] = useState<'breakdown' | 'ingestion'>('breakdown');

  // Script editor & critique state
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [critiqueFilter, setCritiqueFilter] = useState<
    'all' | 'plot_coherence' | 'dialogue_naturalness' | 'scene_pacing'
  >('all');

  // Scene Video Preview Modal state in Tab 01
  const [cinemaModalSceneIndex, setCinemaModalSceneIndex] = useState<number | null>(null);
  const [playTrigger, setPlayTrigger] = useState<number>(0);

  // Character Hub / Upload / Flow Import state
  const [showAddChar, setShowAddChar] = useState(false);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [isProfilingChar, setIsProfilingChar] = useState(false);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [customFlowIdInput, setCustomFlowIdInput] = useState('');
  const [flowModalImagePreview, setFlowModalImagePreview] = useState<
    string | null
  >(null);
  const [flowModalImageFileName, setFlowModalImageFileName] = useState<
    string | null
  >(null);
  const [generatingImageLockCharId, setGeneratingImageLockCharId] = useState<
    string | null
  >(null);

  // Character Form fields
  const [newCharName, setNewCharName] = useState('');
  const [newCharRole, setNewCharRole] = useState('');
  const [newCharAge, setNewCharAge] = useState('29 tuổi');
  const [newCharDNA, setNewCharDNA] = useState('');
  const [newCharWardrobe, setNewCharWardrobe] = useState('');
  const [newCharVoicePersona, setNewCharVoicePersona] = useState(
    'Giọng miền Bắc rõ chữ, truyền cảm'
  );
  const [newCharVoicePitch, setNewCharVoicePitch] = useState<'low' | 'medium' | 'high'>('medium');
  const [newCharWpm, setNewCharWpm] = useState(145);
  const [newCharPersonality, setNewCharPersonality] = useState('');
  const [newCharMannerisms, setNewCharMannerisms] = useState('');
  const [uploadedAvatarPreview, setUploadedAvatarPreview] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [charFormError, setCharFormError] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [charNotification, setCharNotification] = useState<string | null>(null);

  // Layout & Prompt Inspection Preferences (Addressing User Feedback)
  const [promptLayoutMode, setPromptLayoutMode] = useState<'grid' | 'tabs'>('grid');
  const [activePromptTabMap, setActivePromptTabMap] = useState<Record<string, 'image' | 'video' | 'audio'>>({});
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const flowModalFileInputRef = useRef<HTMLInputElement | null>(null);
  const quickLockFileInputRef = useRef<HTMLInputElement | null>(null);
  const quickLockTargetCharIdRef = useRef<string | null>(null);
  const autoUpgradedCharIdsRef = useRef<Record<string, boolean>>({});
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setCharNotification(msg);
    setTimeout(() => {
      setCharNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptId(id);
    setTimeout(() => {
      setCopiedPromptId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  const handleAnalyzeClick = async () => {
    const domVal =
      (document.getElementById('admin-script-textarea') as HTMLTextAreaElement | null)
        ?.value || scriptText;
    if (!domVal.trim()) {
      setScriptError('Vui lòng nhập nội dung kịch bản trước khi phân tích phân cảnh.');
      return;
    }
    setScriptError(null);
    await onAnalyzeScript(domVal);
  };

  const handleCritiqueClick = async () => {
    const domVal =
      (document.getElementById('admin-script-textarea') as HTMLTextAreaElement | null)
        ?.value || scriptText;
    if (!domVal.trim()) {
      setScriptError('Vui lòng nhập nội dung kịch bản trước khi chạy Cố vấn Kịch bản AI.');
      return;
    }
    setScriptError(null);
    await onRunScriptCritique(domVal);
  };

  const [playingDialogueSceneId, setPlayingDialogueSceneId] = useState<string | null>(null);

  const speakTextWithVoice = (
    text: string,
    char?: CharacterProfile,
    onDone?: () => void
  ) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find(
          (v) => v.lang.startsWith('vi') || v.lang.includes('VN') || v.name.includes('Vietnamese')
        );
        if (viVoice) {
          utterance.voice = viVoice;
        }
        utterance.lang = 'vi-VN';

        if (char) {
          utterance.pitch =
            char.voicePitch === 'low' ? 0.8 : char.voicePitch === 'high' ? 1.3 : 1.0;
          utterance.rate = Math.max(0.75, Math.min(1.4, char.speakingRateWpm / 145));
        } else {
          utterance.pitch = 1.0;
          utterance.rate = 1.0;
        }

        utterance.onend = () => {
          if (onDone) onDone();
        };
        utterance.onerror = () => {
          if (onDone) onDone();
        };

        window.speechSynthesis.speak(utterance);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  const activeAudioElRef = useRef<HTMLAudioElement | null>(null);

  const playVoiceProfilePreview = async (char: CharacterProfile) => {
    setPlayingVoiceId(char.id);
    const spokenMessage = `Xin chào, tôi là ${char.name}, ${char.role}. Tôi sẵn sàng diễn xuất phân cảnh của bạn.`;

    try {
      if (activeAudioElRef.current) {
        activeAudioElRef.current.pause();
        activeAudioElRef.current = null;
      }
      const res = await fetch('/api/flow/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: spokenMessage,
          characterName: char.name,
          voicePitch: char.voicePitch,
          voicePersona: char.voicePersona,
          ageRange: char.ageRange,
          voiceRegion,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.audioDataUrl) {
          const audio = new window.Audio(data.audioDataUrl);
          activeAudioElRef.current = audio;
          audio.onended = () => setPlayingVoiceId(null);
          audio.onerror = () => setPlayingVoiceId(null);
          await audio.play();
          return;
        }
      }
    } catch {
      // Fallback to browser Vietnamese speech synthesis if offline
    }

    const spoke = speakTextWithVoice(spokenMessage, char, () => {
      setPlayingVoiceId(null);
    });
    if (!spoke) {
      setPlayingVoiceId(null);
    }
  };

  const playSceneDialogueAudio = async (scene: SceneNode) => {
    if (!scene.dialogue?.trim()) {
      showToast('Phân cảnh này chưa có lời thoại.');
      return;
    }
    setPlayingDialogueSceneId(scene.id);
    const assignedChar =
      characters.find((c) => scene.characterIds.includes(c.id)) || characters[0];

    try {
      if (activeAudioElRef.current) {
        activeAudioElRef.current.pause();
        activeAudioElRef.current = null;
      }

      if (scene.voiceoverAudioUrl) {
        const audio = new window.Audio(scene.voiceoverAudioUrl);
        activeAudioElRef.current = audio;
        audio.onended = () => setPlayingDialogueSceneId(null);
        audio.onerror = () => setPlayingDialogueSceneId(null);
        await audio.play();
        return;
      }

      const res = await fetch('/api/flow/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scene.dialogue,
          characterName: assignedChar?.name,
          voicePitch: assignedChar?.voicePitch || 'medium',
          voicePersona: assignedChar?.voicePersona,
          ageRange: assignedChar?.ageRange,
          voiceRegion,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.audioDataUrl) {
          const audio = new window.Audio(data.audioDataUrl);
          activeAudioElRef.current = audio;
          audio.onended = () => setPlayingDialogueSceneId(null);
          audio.onerror = () => setPlayingDialogueSceneId(null);
          await audio.play();
          return;
        }
      }
    } catch {
      // Fallback to browser speechSynthesis
    }

    const spoke = speakTextWithVoice(scene.dialogue, assignedChar, () => {
      setPlayingDialogueSceneId(null);
    });
    if (!spoke) {
      showToast('Không thể phát âm thanh thoại trên trình duyệt hiện tại.');
      setPlayingDialogueSceneId(null);
    }
  };

  // Shared Vision Scanner: Inspects an uploaded/pasted image via Gemini 2.5 Flash Vision
  const scanImageWithGeminiVision = async (
    imageDataUrl: string,
    nameHint?: string
  ) => {
    if (!imageDataUrl) return;
    setIsProfilingChar(true);
    showToast(
      '🔍 Gemini Vision đang phân tích hình ảnh nhân vật (nhận diện giới tính, độ tuổi & trang phục thực tế)...'
    );
    try {
      const res = await fetch('/api/flow/character-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterQuery: (nameHint ?? newCharName).trim() || 'Nhân vật',
          referenceImageDataUrl: imageDataUrl,
          scriptText,
          charIndex: characters.length + 1,
          voiceRegion,
        }),
      });
      const data = await res.json();
      if (data?.character) {
        const c = data.character as CharacterProfile;
        if (
          !(nameHint ?? newCharName).trim() ||
          (nameHint ?? newCharName).trim() === 'Nhân vật'
        ) {
          setNewCharName(c.name);
        }
        setNewCharRole(c.role);
        setNewCharAge(c.ageRange);
        setNewCharDNA(c.visualDNA);
        setNewCharWardrobe(c.wardrobeLock);
        setNewCharVoicePersona(c.voicePersona);
        setNewCharVoicePitch(c.voicePitch);
        setNewCharWpm(c.speakingRateWpm);
        setNewCharPersonality(c.personalityTraits);
        setNewCharMannerisms(c.mannerisms);
        showToast(
          `✨ Gemini Vision đã nhận diện xong từ ảnh: ${c.role} (${c.ageRange}) — ${c.wardrobeLock}`
        );
      }
    } catch {
      showToast('Đã nạp ảnh nhân vật. Bạn có thể lưu ngay hoặc nhập mô tả ngắn.');
    } finally {
      setIsProfilingChar(false);
    }
  };

  // Avatar Image Upload Handler (FileReader Data URL) — Auto-scans with Gemini Vision immediately!
  const handleAvatarFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCharFormError('Vui lòng chọn tệp hình ảnh hợp lệ (.png, .jpg, .jpeg, .webp).');
      return;
    }

    setUploadedFileName(file.name);
    const cleanFileName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .trim();
    const effectiveName = newCharName.trim() || cleanFileName;
    if (!newCharName.trim() && cleanFileName) {
      setNewCharName(cleanFileName);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedAvatarPreview(result);
      setCharFormError(null);
      void scanImageWithGeminiVision(result, effectiveName);
    };
    reader.readAsDataURL(file);
  };

  // Flow Modal Image Upload Handler (Direct Image Import from Google Flow)
  const handleFlowModalFileSelected = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setFlowModalImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFlowModalImagePreview(result);
      if (!customFlowIdInput.trim()) {
        const cleanFileName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .trim();
        if (cleanFileName) {
          setCustomFlowIdInput(cleanFileName);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick Image Lock Upload directly on a Character Card
  const handleQuickLockImageSelected = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    const targetCharId = quickLockTargetCharIdRef.current;
    if (!file || !file.type.startsWith('image/') || !targetCharId) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const targetChar = characters.find((c) => c.id === targetCharId);
      if (!targetChar || !dataUrl) return;

      // Immediately lock the image on the character card
      const updatedImmediate = characters.map((c) =>
        c.id === targetCharId
          ? { ...c, avatarUrl: dataUrl, source: 'google_flow_import' as const }
          : c
      );
      onCharactersChange(updatedImmediate);
      showToast(
        `🖼️ Đã khóa ảnh tham chiếu cho "${targetChar.name}"! Đang dùng Gemini Vision nhận diện ngoại hình thật từ ảnh...`
      );

      // Also scan the photo via Gemini Vision to sync visualDNA, wardrobeLock, ageRange, role & voice
      try {
        const res = await fetch('/api/flow/character-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterQuery: targetChar.name,
            referenceImageDataUrl: dataUrl,
            scriptText,
            charIndex: characters.findIndex((c) => c.id === targetCharId) + 1,
            voiceRegion,
          }),
        });
        const data = await res.json();
        if (data?.character) {
          const scanned = data.character as CharacterProfile;
          onCharactersChange(
            updatedImmediate.map((c) =>
              c.id === targetCharId
                ? {
                    ...c,
                    role: scanned.role || c.role,
                    ageRange: scanned.ageRange || c.ageRange,
                    visualDNA: scanned.visualDNA || c.visualDNA,
                    wardrobeLock: scanned.wardrobeLock || c.wardrobeLock,
                    voicePersona: scanned.voicePersona || c.voicePersona,
                    voicePitch: scanned.voicePitch || c.voicePitch,
                    continuityToken:
                      scanned.continuityToken || c.continuityToken,
                    avatarUrl: dataUrl,
                  }
                : c
            )
          );
          showToast(
            `✨ Đã nhận diện từ ảnh cho "${targetChar.name}": ${scanned.ageRange} — ${scanned.visualDNA.slice(0, 60)}...`
          );
        }
      } catch {
        // Keep the uploaded image lock
      }
    };
    reader.readAsDataURL(file);
  };

  // Generate AI Reference Portrait Image Lock for an existing character
  const handleGenerateAiImageLockForChar = async (char: CharacterProfile) => {
    setGeneratingImageLockCharId(char.id);
    showToast(`📸 Đang tạo ảnh chân dung Character Lock AI cho "${char.name}"...`);
    try {
      const res = await fetch('/api/flow/character-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterQuery: char.name,
          scriptText,
          charIndex: characters.findIndex((c) => c.id === char.id) + 1,
          voiceRegion,
        }),
      });
      const data = await res.json();
      if (
        data?.character?.avatarUrl &&
        !data.character.avatarUrl.startsWith('data:image/svg+xml')
      ) {
        onCharactersChange(
          characters.map((c) =>
            c.id === char.id
              ? {
                  ...c,
                  avatarUrl: data.character.avatarUrl,
                  source: 'google_flow_import' as const,
                }
              : c
          )
        );
        showToast(
          `✨ Đã tạo và khóa ảnh tham chiếu AI cho nhân vật "${char.name}"!`
        );
      } else {
        showToast(`Không thể tạo ảnh tham chiếu lúc này, vui lòng thử lại.`);
      }
    } catch {
      showToast(`Lỗi khi kết nối tạo ảnh Character Lock.`);
    } finally {
      setGeneratingImageLockCharId(null);
    }
  };

  // Automatically upgrade any character with an SVG placeholder avatar to a real AI Reference Portrait Image
  useEffect(() => {
    const targetChar = characters.find(
      (c) =>
        (!c.avatarUrl || c.avatarUrl.startsWith('data:image/svg+xml')) &&
        !autoUpgradedCharIdsRef.current[c.id]
    );
    if (!targetChar) return;

    autoUpgradedCharIdsRef.current[targetChar.id] = true;
    fetch('/api/flow/character-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterQuery: targetChar.name,
        scriptText,
        charIndex: characters.findIndex((c) => c.id === targetChar.id) + 1,
        voiceRegion,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const newAvatar = data?.character?.avatarUrl;
        if (
          typeof newAvatar === 'string' &&
          !newAvatar.startsWith('data:image/svg+xml')
        ) {
          onCharactersChange(
            characters.map((c) =>
              c.id === targetChar.id ? { ...c, avatarUrl: newAvatar } : c
            )
          );
        }
      })
      .catch(() => {});
  }, [characters, scriptText, voiceRegion, onCharactersChange]);

  // AI Auto-Fill / Gemini Vision scan from uploaded photo & name
  const handleScanAvatarWithAI = async () => {
    if (!uploadedAvatarPreview) return;
    await scanImageWithGeminiVision(uploadedAvatarPreview, newCharName);
  };

  // Save Character to Project (Streamlined Google Flow style: only Name or Image needed!)
  const handleAddCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedName =
      newCharName.trim() ||
      (uploadedFileName
        ? uploadedFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim()
        : '');

    if (!resolvedName && !uploadedAvatarPreview) {
      setCharFormError('Vui lòng tải ảnh nhân vật hoặc nhập tên nhân vật.');
      return;
    }
    const finalName = resolvedName || `Nhân vật ${characters.length + 1}`;
    const finalWardrobe =
      newCharWardrobe.trim() ||
      'Trang phục đồng nhất theo ảnh khóa tham chiếu (Reference Image Lock)';
    const finalDNA =
      newCharDNA.trim() ||
      'Ngoại hình khuôn mặt, độ tuổi và kiểu tóc khóa theo ảnh tham chiếu';
    setCharFormError(null);

    const generatedToken = generateContinuityTokenForCharacter(
      finalName,
      finalWardrobe,
      editingCharId
        ? characters.findIndex((c) => c.id === editingCharId) + 1
        : characters.length + 1
    );

    if (editingCharId) {
      const updatedList = characters.map((c) => {
        if (c.id !== editingCharId) return c;
        const nextChar: CharacterProfile = {
          ...c,
          name: finalName,
          role: newCharRole.trim() || c.role,
          ageRange: newCharAge.trim() || c.ageRange,
          visualDNA: finalDNA,
          wardrobeLock: finalWardrobe,
          voicePersona: formatRegionalVoicePersonaForCharacter(
            {
              name: finalName,
              ageRange: newCharAge.trim() || c.ageRange,
              voicePitch: newCharVoicePitch,
              voicePersona: newCharVoicePersona.trim() || c.voicePersona,
            },
            voiceRegion
          ),
          voicePitch: newCharVoicePitch,
          speakingRateWpm: Number(newCharWpm) || 144,
          personalityTraits:
            newCharPersonality.trim() || c.personalityTraits || 'Biểu cảm tự nhiên',
          mannerisms:
            newCharMannerisms.trim() || c.mannerisms || 'Diễn xuất đồng nhất theo ảnh khóa',
          continuityToken: generatedToken,
          avatarUrl: uploadedAvatarPreview || c.avatarUrl,
        };
        return nextChar;
      });

      onCharactersChange(updatedList);
      showToast(`Đã cập nhật nhân vật "${finalName}".`);
      setEditingCharId(null);
      setShowAddChar(false);
      resetCharacterForm();
      return;
    }

    const voicePersonaLocked = formatRegionalVoicePersonaForCharacter(
      {
        name: finalName,
        ageRange: newCharAge.trim() || '30 tuổi',
        voicePitch: newCharVoicePitch,
        voicePersona: newCharVoicePersona.trim(),
      },
      voiceRegion
    );

    const created: CharacterProfile = {
      id: generateUniqueCharacterId('char'),
      name: finalName,
      role: newCharRole.trim() || 'Nhân vật chính',
      ageRange: newCharAge.trim() || '30 tuổi',
      visualDNA: finalDNA,
      wardrobeLock: finalWardrobe,
      voicePersona: voicePersonaLocked,
      voicePitch: newCharVoicePitch,
      speakingRateWpm: Number(newCharWpm) || 144,
      personalityTraits:
        newCharPersonality.trim() || 'Biểu cảm tự nhiên theo mạch kịch bản',
      mannerisms:
        newCharMannerisms.trim() || 'Diễn xuất đồng nhất theo ảnh khóa tham chiếu',
      continuityToken: generatedToken,
      avatarUrl: uploadedAvatarPreview || undefined,
      uploadedFileName: uploadedFileName || undefined,
      source: uploadedAvatarPreview ? 'uploaded' : 'custom',
    };

    const updatedChars = [...characters, created];
    onCharactersChange(updatedChars);

    resetCharacterForm();
    setShowAddChar(false);
    showToast(`🔒 Đã lưu và khóa nhân vật "${created.name}" vào dự án.`);
  };

  const resetCharacterForm = () => {
    setNewCharName('');
    setNewCharRole('');
    setNewCharAge('30 tuổi');
    setNewCharDNA('');
    setNewCharWardrobe('');
    setNewCharPersonality('');
    setNewCharMannerisms('');
    setUploadedAvatarPreview(null);
    setUploadedFileName(null);
    setEditingCharId(null);
    setCharFormError(null);
  };

  // Start editing existing character
  const handleStartEditCharacter = (char: CharacterProfile) => {
    setEditingCharId(char.id);
    setNewCharName(char.name);
    setNewCharRole(char.role);
    setNewCharAge(char.ageRange);
    setNewCharDNA(char.visualDNA);
    setNewCharWardrobe(char.wardrobeLock);
    setNewCharVoicePersona(char.voicePersona);
    setNewCharVoicePitch(char.voicePitch);
    setNewCharWpm(char.speakingRateWpm);
    setNewCharPersonality(char.personalityTraits);
    setNewCharMannerisms(char.mannerisms);
    setUploadedAvatarPreview(char.avatarUrl || null);
    setShowAddChar(true);
  };

  // Call Server-side AI Character Profiler (Gemini 2.5 Flash Vision + Gemini 3.1 Flash Image)
  const handleGenerateCharacterProfileWithAI = async (nameQuery?: string) => {
    const query = (nameQuery || newCharName).trim();
    if (!query && !uploadedAvatarPreview) {
      setCharFormError('Vui lòng tải ảnh nhân vật hoặc nhập tên nhân vật.');
      return;
    }

    setIsProfilingChar(true);
    setCharFormError(null);

    try {
      const res = await fetch('/api/flow/character-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterQuery: query || 'Nhân vật Flow',
          referenceImageDataUrl: uploadedAvatarPreview || undefined,
          scriptText,
          charIndex: characters.length + 1,
          voiceRegion,
        }),
      });

      const data = await res.json();
      if (data?.character) {
        const c = data.character;
        setNewCharName(c.name);
        setNewCharRole(c.role);
        setNewCharAge(c.ageRange);
        setNewCharDNA(c.visualDNA);
        setNewCharWardrobe(c.wardrobeLock);
        setNewCharVoicePersona(c.voicePersona);
        setNewCharVoicePitch(c.voicePitch);
        setNewCharWpm(c.speakingRateWpm);
        setNewCharPersonality(c.personalityTraits);
        setNewCharMannerisms(c.mannerisms);
        if (c.avatarUrl) {
          setUploadedAvatarPreview(c.avatarUrl);
        }
        setShowAddChar(true);
        showToast(
          `✨ AI đã nhận diện & thiết kế nhân vật "${c.name}" (${c.ageRange}) thành công!`
        );
      }
    } catch {
      setCharFormError('Không thể kết nối dịch vụ AI. Đã chuyển sang chế độ tạo thủ công.');
    } finally {
      setIsProfilingChar(false);
    }
  };

  // Import character from Flow Image / URL / Seed token / Name with REAL AI IMAGE LOCK
  const handleImportCustomFlowToken = async () => {
    const token = customFlowIdInput.trim();
    if (!token && !flowModalImagePreview) return;

    setIsProfilingChar(true);
    setShowFlowModal(false);
    showToast(
      flowModalImagePreview
        ? `🖼️ Đang dùng Gemini Vision phân tích ảnh nhân vật Flow và khóa Image Lock...`
        : `📸 Đang dùng AI tạo hồ sơ & kết xuất Ảnh Chân Dung Lock cho "${token}"...`
    );

    try {
      const res = await fetch('/api/flow/character-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterQuery: token || 'Nhân vật Flow',
          referenceImageDataUrl: flowModalImagePreview || undefined,
          scriptText,
          charIndex: characters.length + 1,
          voiceRegion,
        }),
      });

      const data = await res.json();
      if (data?.character) {
        const imported = data.character as CharacterProfile;
        const existsIndex = characters.findIndex(
          (c) => c.name.toLowerCase() === imported.name.toLowerCase()
        );

        if (existsIndex >= 0) {
          const updated = [...characters];
          updated[existsIndex] = {
            ...imported,
            id: characters[existsIndex].id,
          };
          onCharactersChange(updated);
        } else {
          onCharactersChange([...characters, imported]);
        }

        setCustomFlowIdInput('');
        setFlowModalImagePreview(null);
        setFlowModalImageFileName(null);
        showToast(
          `✨ Đã khóa ảnh & import nhân vật "${imported.name}" (${imported.ageRange} — ${imported.visualDNA.slice(0, 50)}...)!`
        );
      }
    } catch {
      showToast('Đã xảy ra lỗi khi AI phân tích nhân vật. Hãy thử lại.');
    } finally {
      setIsProfilingChar(false);
    }
  };

  // Upload Character JSON File
  const handleUploadCharacterJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseUploadedCharacterJson(content);
      if (res.success && res.characters.length > 0) {
        onCharactersChange([...characters, ...res.characters]);
        setShowUploadModal(false);
        showToast(`Đã tải lên và tích hợp thành công ${res.characters.length} nhân vật từ tệp ${file.name}!`);
      } else {
        setCharFormError(res.error || 'Không thể đọc dữ liệu nhân vật từ tệp.');
      }
    };
    reader.readAsText(file);
  };

  // Export Character JSON Bundle
  const handleExportCharactersJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(characters, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `flowstudio-characters-${generateUniqueCharacterId('export')}.json`);
    dlAnchor.click();
    showToast('Đã xuất tệp hồ sơ nhân vật (.json).');
  };

  const handleRemoveCharacter = (id: string) => {
    onCharactersChange(characters.filter((c) => c.id !== id));
    showToast('Đã xóa nhân vật khỏi danh sách dự án.');
  };

  const handleToggleCharacterInScene = (sceneId: string, charId: string) => {
    const updated = scenes.map((scene, index) => {
      if (scene.id !== sceneId) return scene;
      const exists = scene.characterIds.includes(charId);
      const nextCharIds = exists
        ? scene.characterIds.length > 1
          ? scene.characterIds.filter((id) => id !== charId)
          : scene.characterIds
        : [...scene.characterIds, charId];

      const matchedChars = characters.filter((c) => nextCharIds.includes(c.id));
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
        matchedChars,
        prev
      );

      return {
        ...scene,
        characterIds: nextCharIds,
        continuityState: rebuilt.continuityState,
        imagePrompt: rebuilt.imagePrompt,
        videoPrompt: rebuilt.videoPrompt,
        audioPrompt: rebuilt.audioPrompt,
      };
    });
    onScenesChange(updated);
  };

  const handleSceneFieldUpdate = (
    sceneId: string,
    field: 'narrativeBeat' | 'dialogue' | 'imagePrompt' | 'videoPrompt' | 'audioPrompt',
    value: string
  ) => {
    onScenesChange(
      scenes.map((s) => {
        if (s.id !== sceneId) return s;
        return {
          ...s,
          [field]: value,
          postEdit:
            field === 'dialogue' ? { ...s.postEdit, subtitleText: value } : s.postEdit,
        };
      })
    );
  };

  const handleResyncContinuityLocks = () => {
    const resynced = scenes.map((scene, index) => {
      const matchedChars = characters.filter((c) => scene.characterIds.includes(c.id));
      const effectiveChars = matchedChars.length > 0 ? matchedChars : characters.slice(0, 1);
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
        continuityState: rebuilt.continuityState,
        imagePrompt: rebuilt.imagePrompt,
        videoPrompt: rebuilt.videoPrompt,
        audioPrompt: rebuilt.audioPrompt,
      };
    });
    onScenesChange(resynced);
    showToast('Đã đồng bộ lại toàn bộ mã khóa Lock nhân vật xuyên suốt các phân cảnh!');
  };

  const filteredSuggestions = scriptCritique.suggestions.filter((s) =>
    critiqueFilter === 'all' ? true : s.dimension === critiqueFilter
  );

  const getDimensionLabel = (dim: 'plot_coherence' | 'dialogue_naturalness' | 'scene_pacing') => {
    switch (dim) {
      case 'plot_coherence':
        return 'Cốt truyện & Mạch logic';
      case 'dialogue_naturalness':
        return 'Độ tự nhiên lời thoại';
      case 'scene_pacing':
        return 'Nhịp độ & Thời lượng cảnh';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Sub-view Navigation: Switch between Core Scene Breakdown & AI Script Ingestion Timeline */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111726] border border-slate-800 rounded-lg p-2.5">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Chế độ làm việc kịch bản">
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'breakdown'}
            onClick={() => setSubView('breakdown')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-2 transition-colors ${
              subView === 'breakdown'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>01. Bảng Phân Cảnh &amp; Khóa Nhân Vật</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subView === 'ingestion'}
            onClick={() => setSubView('ingestion')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-2 transition-colors ${
              subView === 'ingestion'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>02. Tiếp Nhận Kịch Bản AI &amp; Timeline</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
          <span className="text-amber-400 font-medium">{characters.length} nhân vật đã khóa</span>
          <span aria-hidden="true">·</span>
          <span>{scenes.length} phân cảnh</span>
        </div>
      </div>

      {charNotification && (
        <div
          role="status"
          className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-md px-3.5 py-2.5"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{charNotification}</span>
        </div>
      )}

      {/* View Mode 2: Full Script Ingestion Timeline Component */}
      {subView === 'ingestion' ? (
        <ScriptIngestionComponent
          rawText={scriptText}
          onRawTextChange={onScriptTextChange}
          characters={characters}
          onApplyTimelineToScenes={(newScenes) => {
            onScenesChange(newScenes);
            setSubView('breakdown');
            showToast(`Đã đồng bộ ${newScenes.length} phân cảnh có cấu trúc vào pipeline sản xuất!`);
          }}
        />
      ) : (
        /* View Mode 1: Core Breakdown, Character Studio & Expanded Textareas */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Script Editor, AI Critique & Character Studio */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* 1. Script Input Section */}
            <section
              aria-labelledby="script-input-heading"
              className="bg-[#111726] border border-slate-800 rounded-lg p-5"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <h2
                    id="script-input-heading"
                    className="text-base font-semibold text-slate-100 flex items-center gap-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Kịch bản đầu vào (Admin Input)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Nhập kịch bản để tách cảnh, khóa nhân vật và nhận gợi ý tối ưu từ AI.
                  </p>
                </div>

                {scriptText.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      onScriptTextChange('');
                      setScriptError(null);
                    }}
                    className="px-2.5 py-1 text-xs font-medium bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    Xóa trắng
                  </button>
                )}
              </div>

              <label htmlFor="admin-script-textarea" className="sr-only">
                Nội dung kịch bản sản xuất
              </label>
              <textarea
                id="admin-script-textarea"
                rows={9}
                value={scriptText}
                onChange={(e) => {
                  onScriptTextChange(e.target.value);
                  if (scriptError) setScriptError(null);
                }}
                placeholder="Nhập kịch bản theo cấu trúc CẢNH 1: ĐỊA ĐIỂM - THỜI GIAN..."
                className="w-full bg-[#0A0E17] border border-slate-800 focus:border-amber-500/80 rounded-md p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none leading-relaxed font-sans"
              />

              {scriptError && (
                <div
                  role="alert"
                  className="mt-2.5 flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-md px-3 py-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{scriptError}</span>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
                <div className="text-xs text-slate-400 font-mono tabular-nums">
                  <span>{scriptText.trim().length} ký tự</span>
                  <span aria-hidden="true"> · </span>
                  <span>{analysisEngineLabel}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCritiqueClick}
                    disabled={isCritiquing}
                    className="px-3 py-2 border border-amber-500/50 hover:border-amber-400 bg-amber-500/10 text-amber-300 font-medium text-xs rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isCritiquing ? 'Đang chẩn đoán AI...' : 'Cố vấn Kịch bản AI'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAnalyzeClick}
                    disabled={isAnalyzing}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{isAnalyzing ? 'Đang tách cảnh...' : 'Phân tích & Chia cảnh'}</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 2. AI-Powered Script Analysis Tool (Script Doctor) */}
            <section
              aria-labelledby="ai-script-analysis-heading"
              className="bg-[#111726] border border-slate-800 rounded-lg p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h2
                    id="ai-script-analysis-heading"
                    className="text-base font-semibold text-slate-100 flex items-center gap-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Phân Tích &amp; Tối Ưu Kịch Bản AI (Script Doctor)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Đánh giá tự động mạch logic cốt truyện, độ tự nhiên của lời thoại và nhịp độ phân cảnh.
                  </p>
                </div>

                {scriptCritique.suggestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onApplyAllCritiqueSuggestions) {
                        onApplyAllCritiqueSuggestions();
                      } else {
                        scriptCritique.suggestions
                          .filter((s) => !s.applied)
                          .forEach((s) => onApplyCritiqueSuggestion(s));
                      }
                    }}
                    disabled={scriptCritique.suggestions.every((s) => s.applied)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                      scriptCritique.suggestions.every((s) => s.applied)
                        ? 'bg-emerald-950/50 border border-emerald-800/70 text-emerald-400 cursor-default'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                    }`}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>
                      {scriptCritique.suggestions.every((s) => s.applied)
                        ? `Đã áp dụng tất cả (${scriptCritique.suggestions.length})`
                        : `Áp dụng tất cả (${scriptCritique.suggestions.filter((s) => !s.applied).length})`}
                    </span>
                  </button>
                )}
              </div>

              {/* Status Summary */}
              <div className="bg-[#0A0E17] border border-slate-800/90 rounded-md p-3 mb-3.5 flex flex-col gap-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <GitBranch className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{scriptCritique.coherenceStatus}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{scriptCritique.dialogueNaturalnessStatus}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 font-mono tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{scriptCritique.pacingBalanceStatus}</span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div
                role="group"
                aria-label="Lọc gợi ý cải thiện kịch bản"
                className="flex flex-wrap items-center gap-1 p-1 bg-[#0A0E17] border border-slate-800 rounded-lg mb-3.5"
              >
                {(
                  [
                    { id: 'all', label: `Tất cả (${scriptCritique.suggestions.length})` },
                    { id: 'plot_coherence', label: 'Cốt truyện' },
                    { id: 'dialogue_naturalness', label: 'Lời thoại' },
                    { id: 'scene_pacing', label: 'Nhịp độ' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCritiqueFilter(tab.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      critiqueFilter === tab.id
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Suggestions List */}
              {filteredSuggestions.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-[#0A0E17] border border-slate-800/70 rounded-md px-4">
                  Chưa có gợi ý phân tích nào. Hãy nhập kịch bản của bạn ở khung trên và nhấn{' '}
                  <strong className="text-amber-300">&ldquo;Cố vấn Kịch bản AI&rdquo;</strong> hoặc{' '}
                  <strong className="text-amber-300">&ldquo;Phân tích &amp; Chia cảnh&rdquo;</strong>.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {filteredSuggestions.map((sug) => (
                    <div key={sug.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-400 font-mono tabular-nums">
                        <span className="text-amber-400 font-medium">
                          {getDimensionLabel(sug.dimension)}
                          {sug.sceneNumber ? ` · Cảnh 0${sug.sceneNumber}` : ''}
                        </span>
                        {sug.applied && (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã áp dụng</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs font-semibold text-slate-100">{sug.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{sug.analysis}</p>

                      {sug.suggestedRewrite && (
                        <div className="bg-[#0A0E17] border border-slate-800 rounded p-2.5 text-xs flex flex-col gap-1">
                          {sug.originalSnippet && (
                            <p className="text-slate-400 line-through">
                              Gốc: &ldquo;{sug.originalSnippet}&rdquo;
                            </p>
                          )}
                          <p className="text-emerald-300">
                            Đề xuất AI: &ldquo;{sug.suggestedRewrite}&rdquo;
                          </p>
                        </div>
                      )}

                      {typeof sug.recommendedDurationSec === 'number' && (
                        <div className="text-xs font-mono tabular-nums text-sky-300">
                          Thời lượng tối ưu đề xuất: {sug.recommendedDurationSec}s
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => onApplyCritiqueSuggestion(sug)}
                          disabled={sug.applied}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 disabled:hover:bg-slate-800 disabled:hover:text-slate-200"
                        >
                          {sug.applied
                            ? 'Đã cập nhật vào phân cảnh'
                            : `Áp dụng vào Cảnh ${sug.sceneNumber || 1}`}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 3. AI Character Creation & Continuity Studio (Google Flow Simple Image Lock + Global Voice Lock) */}
            <section
              aria-labelledby="character-vault-heading"
              className="bg-[#111726] border border-slate-800 rounded-lg p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h2
                    id="character-vault-heading"
                    className="text-base font-semibold text-slate-100 flex items-center gap-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    <span>Khóa Nhân Vật &amp; Giọng Nói ({characters.length})</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Chuẩn Google Flow: Chỉ cần tải ảnh nhân vật lên — AI tự nhận diện ngoại hình &amp; khóa xuyên suốt các cảnh.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleResyncContinuityLocks}
                    title="Đồng bộ lại mã CHAR_LOCK vào tất cả phân cảnh"
                    className="px-2.5 py-1.5 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    Đồng bộ Lock
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFlowModal(true)}
                    className="px-2.5 py-1.5 border border-amber-500/60 hover:border-amber-400 bg-amber-500/10 text-amber-300 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Import Flow</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddChar((v) => !v)}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm nhân vật</span>
                  </button>
                </div>
              </div>

              {/* Global Regional Voice Lock Bar (Applies to ALL characters & ALL scenes) */}
              <div className="mb-3.5 p-3 bg-[#0A0E17] border border-amber-500/30 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-200">
                      Khóa Giọng Vùng Miền Toàn Dự Án:
                    </span>
                    <span className="text-[11px] text-slate-400 block sm:inline sm:ml-1.5">
                      Áp dụng đồng bộ cho toàn bộ nhân vật &amp; tất cả phân cảnh
                    </span>
                  </div>
                </div>

                <div
                  role="group"
                  aria-label="Chọn giọng vùng miền khóa toàn dự án"
                  className="flex items-center gap-1 bg-[#111726] p-1 rounded-md border border-slate-800 shrink-0"
                >
                  {(
                    [
                      { id: 'south', label: 'Giọng Miền Nam' },
                      { id: 'north', label: 'Giọng Miền Bắc' },
                      { id: 'central', label: 'Giọng Miền Trung' },
                    ] as const
                  ).map((opt) => {
                    const isSelected = voiceRegion === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onVoiceRegionChange?.(opt.id);
                          showToast(
                            `🔒 Đã khóa "${opt.label}" cho toàn bộ ${characters.length} nhân vật và ${scenes.length} phân cảnh!`
                          );
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Streamlined Google Flow Style Character Form (Upload Image -> Auto Vision -> Done) */}
              {showAddChar && (
                <form
                  onSubmit={handleAddCharacter}
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (const item of Array.from(items)) {
                      if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        if (file) {
                          setUploadedFileName(file.name || 'clipboard-character.png');
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              setUploadedAvatarPreview(reader.result);
                              void scanImageWithGeminiVision(reader.result, newCharName);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                        break;
                      }
                    }
                  }}
                  className="mb-4 p-4 bg-[#0A0E17] border border-slate-800 rounded-md flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">
                        {editingCharId ? 'Cập Nhật Khóa Nhân Vật (Character Lock)' : 'Thêm Nhân Vật Từ Ảnh (Chuẩn Google Flow)'}
                      </span>
                      {editingCharId && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                          Đang sửa
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddChar(false);
                        resetCharacterForm();
                      }}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      Đóng
                    </button>
                  </div>

                  {/* Step 1: Upload / Paste Reference Image (Auto-scans with Gemini Vision immediately) */}
                  <div className="bg-[#111726] border border-dashed border-amber-500/50 hover:border-amber-400 rounded-md p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {uploadedAvatarPreview ? (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-emerald-400 shrink-0 bg-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={uploadedAvatarPreview}
                            alt="Ảnh đại diện nhân vật"
                            className="w-full h-full object-cover"
                          />
                          {isProfilingChar && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                          <ImageIcon className="w-6 h-6 text-amber-400/80" />
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold text-slate-100">
                          {isProfilingChar
                            ? '🔍 Gemini Vision đang nhận diện giới tính, độ tuổi & trang phục từ ảnh...'
                            : uploadedAvatarPreview
                            ? `🖼️ Đã khóa ảnh: ${uploadedFileName || 'Ảnh tham chiếu nhân vật'}`
                            : '1. Tải ảnh nhân vật lên (hoặc nhấn Ctrl+V dán ảnh)'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          AI tự động đọc chính xác nam / nữ / em bé, khuôn mặt và trang phục thực tế từ ảnh bạn tải lên.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="file"
                        ref={avatarFileInputRef}
                        accept="image/*"
                        onChange={handleAvatarFileSelected}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => avatarFileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadedAvatarPreview ? 'Đổi ảnh khác' : 'Chọn ảnh nhân vật'}</span>
                      </button>

                      {uploadedAvatarPreview && (
                        <button
                          type="button"
                          onClick={handleScanAvatarWithAI}
                          disabled={isProfilingChar}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 text-xs font-medium rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isProfilingChar ? 'animate-spin' : ''}`} />
                          <span>Quét lại ảnh</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Character Name + AI Detected Summary (Compact & Clean) */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-5">
                      <label htmlFor="new-char-name" className="block text-xs text-slate-300 mb-1">
                        Tên nhân vật
                      </label>
                      <input
                        id="new-char-name"
                        type="text"
                        value={newCharName}
                        onChange={(e) => setNewCharName(e.target.value)}
                        placeholder="VD: Ba Ben, Mẹ Na, Bé Ấu..."
                        className="w-full bg-[#111726] border border-slate-700 focus:border-amber-500 rounded px-2.5 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label htmlFor="new-char-age" className="block text-xs text-slate-300 mb-1">
                        Đối tượng &amp; Độ tuổi (AI nhận diện)
                      </label>
                      <input
                        id="new-char-age"
                        type="text"
                        value={newCharAge}
                        onChange={(e) => setNewCharAge(e.target.value)}
                        placeholder="Tự nhận diện từ ảnh..."
                        className="w-full bg-[#111726] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <button
                        type="button"
                        onClick={() => handleGenerateCharacterProfileWithAI()}
                        disabled={isProfilingChar || (!newCharName.trim() && !uploadedAvatarPreview)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 rounded flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                        title="Nếu chưa có ảnh, bấm để AI tự vẽ ảnh chân dung mẫu theo tên nhân vật"
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>{uploadedAvatarPreview ? 'Quét AI' : 'Tạo ảnh AI'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Auto-detected Visual & Wardrobe Lock (Editable if user wants, auto-populated by Vision) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="new-char-dna" className="block text-[11px] text-slate-400 mb-1">
                        Ngoại hình khuôn mặt (AI tự mô tả từ ảnh tải lên)
                      </label>
                      <textarea
                        id="new-char-dna"
                        rows={2}
                        value={newCharDNA}
                        onChange={(e) => setNewCharDNA(e.target.value)}
                        placeholder="Tải ảnh lên để Gemini Vision tự động mô tả khuôn mặt, giới tính, kiểu tóc..."
                        className="w-full bg-[#111726] border border-slate-700 rounded p-2 text-xs text-slate-100 focus:border-amber-500/70 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="new-char-wardrobe" className="block text-[11px] text-slate-400 mb-1">
                        Trang phục cố định (AI tự nhận diện từ ảnh tải lên)
                      </label>
                      <textarea
                        id="new-char-wardrobe"
                        rows={2}
                        value={newCharWardrobe}
                        onChange={(e) => setNewCharWardrobe(e.target.value)}
                        placeholder="Tải ảnh lên để Gemini Vision tự động trích xuất kiểu áo, quần, màu sắc..."
                        className="w-full bg-[#111726] border border-slate-700 rounded p-2 text-xs text-slate-100 focus:border-amber-500/70 focus:outline-none"
                      />
                    </div>
                  </div>

                  {charFormError && (
                    <p role="alert" className="text-xs text-rose-400">
                      {charFormError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddChar(false);
                        setCharFormError(null);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isProfilingChar}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded transition-colors disabled:opacity-50"
                    >
                      {editingCharId ? 'Lưu cập nhật' : 'Khóa & Lưu Nhân Vật'}
                    </button>
                  </div>
                </form>
              )}

              {/* Hidden file input for quick character reference image replacement */}
              <input
                ref={quickLockFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleQuickLockImageSelected}
                className="hidden"
              />

              {/* Characters List with Visual Avatars & Continuity Tokens */}
              {characters.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-[#0A0E17] border border-slate-800/70 rounded-md px-4">
                  Chưa có nhân vật nào trong dự án. Hãy nhấn{' '}
                  <strong className="text-amber-300">&ldquo;Thêm nhân vật&rdquo;</strong> hoặc{' '}
                  <strong className="text-amber-300">&ldquo;Import Flow&rdquo;</strong> để tải ảnh nhân vật lên, hoặc bấm{' '}
                  <strong className="text-amber-300">&ldquo;Phân tích &amp; Chia cảnh&rdquo;</strong> để trích xuất từ kịch bản.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {characters.map((char) => {
                    const hasRealImageLock = Boolean(
                      char.avatarUrl && !char.avatarUrl.startsWith('data:image/svg+xml')
                    );
                    const isGeneratingThisChar = generatingImageLockCharId === char.id;

                    return (
                      <div key={char.id} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          {/* Character Reference Image Lock Thumbnail */}
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            <div
                              className={`relative w-16 h-16 rounded-lg overflow-hidden border shrink-0 bg-slate-900 flex items-center justify-center ${
                                hasRealImageLock
                                  ? 'border-emerald-500/70 shadow-sm shadow-emerald-500/10'
                                  : 'border-slate-700'
                              }`}
                              title={
                                hasRealImageLock
                                  ? `Ảnh mẫu khóa nhân vật (Reference Image Lock) của ${char.name} — truyền trực tiếp vào AI khi dựng cảnh`
                                  : `Đang dùng ảnh đại diện tạm cho ${char.name}`
                              }
                            >
                              {char.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={char.avatarUrl}
                                  alt={`Chân dung khóa mẫu ${char.name}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="font-semibold text-sm text-amber-400">
                                  {char.name.slice(0, 1).toUpperCase()}
                                </span>
                              )}
                              {isGeneratingThisChar && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                                </div>
                              )}
                            </div>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                hasRealImageLock
                                  ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                                  : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                              }`}
                            >
                              {hasRealImageLock ? '🖼️ ĐÃ KHÓA ẢNH' : '⏳ CHƯA KHÓA ẢNH'}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-100">
                              <span>{char.name}</span>
                              <span className="text-slate-500 font-normal" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-xs font-normal text-slate-400">
                                {char.role} ({char.ageRange})
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 mt-1">
                              <strong className="font-medium text-slate-400">Ngoại hình:</strong>{' '}
                              {char.visualDNA}
                            </p>
                            <p className="text-xs text-slate-300 mt-0.5">
                              <strong className="font-medium text-slate-400">Trang phục khóa:</strong>{' '}
                              {char.wardrobeLock}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400 font-mono tabular-nums">
                              <span className="text-amber-300/90">
                                🎙️ {char.voicePersona}
                              </span>
                              <button
                                type="button"
                                onClick={() => playVoiceProfilePreview(char)}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] rounded flex items-center gap-1 transition-colors"
                              >
                                <Volume2 className="w-3 h-3" />
                                <span>
                                  {playingVoiceId === char.id
                                    ? 'Đang phát...'
                                    : 'Nghe thử giọng'}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  quickLockTargetCharIdRef.current = char.id;
                                  quickLockFileInputRef.current?.click();
                                }}
                                disabled={isGeneratingThisChar}
                                className="px-2 py-0.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px] rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                                title="Tải ảnh nhân vật lên để Gemini Vision tự nhận diện lại ngoại hình & khóa ảnh"
                              >
                                <Upload className="w-3 h-3" />
                                <span>Tải Ảnh Lock</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleGenerateAiImageLockForChar(char)}
                                disabled={isGeneratingThisChar}
                                className="px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                                title="Dùng Gemini 3.1 Flash Image tạo ảnh chân dung mẫu thực tế để khóa ngoại hình khi dựng cảnh"
                              >
                                <RefreshCw className={`w-3 h-3 ${isGeneratingThisChar ? 'animate-spin' : ''}`} />
                                <span>
                                  {isGeneratingThisChar
                                    ? 'Đang tạo ảnh...'
                                    : hasRealImageLock
                                    ? 'Tạo lại Ảnh AI'
                                    : 'Tạo Ảnh Lock AI'}
                                </span>
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditCharacter(char)}
                              aria-label={`Chỉnh sửa nhân vật ${char.name}`}
                              title="Chỉnh sửa nhân vật"
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCharacter(char.id)}
                              aria-label={`Xóa nhân vật ${char.name}`}
                              title="Xóa nhân vật"
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Character Management Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {characters.length} nhân vật · Đang khóa{' '}
                  {voiceRegion === 'north'
                    ? 'Giọng Miền Bắc'
                    : voiceRegion === 'central'
                    ? 'Giọng Miền Trung'
                    : 'Giọng Miền Nam'}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px]"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Nhập JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCharactersJson}
                    className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px]"
                  >
                    <Download className="w-3 h-3" />
                    <span>Xuất JSON</span>
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Sequential Scene Breakdown & Expanded Textareas */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="bg-[#111726] border border-slate-800 rounded-lg p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2
                    className="text-base font-semibold text-slate-100"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Bảng Phân Cảnh &amp; Chuỗi Kế Thừa Ngữ Cảnh ({scenes.length} cảnh)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mỗi cảnh tự động nhận trạng thái ánh sáng, không gian và khóa ngoại hình + tính cách nhân vật từ cảnh liền trước.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Prompt Layout Switcher (Addressing User Request) */}
                  <div
                    role="group"
                    aria-label="Bố cục hiển thị prompt"
                    className="hidden sm:flex items-center p-0.5 bg-[#0A0E17] border border-slate-800 rounded-md text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => setPromptLayoutMode('grid')}
                      className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                        promptLayoutMode === 'grid'
                          ? 'bg-slate-800 text-slate-100 font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Hiển thị 3 cột song song"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>3 Cột</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromptLayoutMode('tabs')}
                      className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                        promptLayoutMode === 'tabs'
                          ? 'bg-slate-800 text-slate-100 font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Hiển thị dạng Tab tập trung (rộng rãi, dễ đọc)"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Tab Rộng</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onApproveAndStartParallelBuild}
                    disabled={scenes.length === 0}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-md flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    <span>Duyệt &amp; Dựng Đồng Thời ({scenes.length} cảnh)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {scenes.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-400">
                    Chưa có phân cảnh nào. Hãy nhấn &ldquo;Phân tích &amp; Chia cảnh&rdquo; từ kịch bản bên trái.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800 mt-2">
                  {scenes.map((scene) => {
                    const activePromptTab = activePromptTabMap[scene.id] || 'video';

                    return (
                      <article key={scene.id} className="py-5 first:pt-3 last:pb-1 flex flex-col gap-4">
                        {/* Scene Header & Continuity Inheritance Link */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-semibold text-amber-400 tabular-nums">
                              0{scene.sceneNumber}.
                            </span>
                            <h3 className="text-sm font-semibold text-slate-100">{scene.title}</h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                            {scene.continuityState.inheritedFromScene ? (
                              <span>
                                Kế thừa: Cảnh 0{scene.continuityState.inheritedFromScene} → Cảnh 0
                                {scene.sceneNumber}
                              </span>
                            ) : (
                              <span>Khởi tạo gốc (Anchor Scene 01)</span>
                            )}
                            <span aria-hidden="true">·</span>
                            <span>{scene.postEdit.durationSec}s</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Đã khóa Context</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const idx = scenes.findIndex((s) => s.id === scene.id);
                                setCinemaModalSceneIndex(idx >= 0 ? idx : 0);
                                setPlayTrigger((prev) => prev + 1);
                              }}
                              className="ml-1 px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500 border border-amber-500/40 text-amber-300 hover:text-slate-950 font-sans font-semibold text-xs rounded flex items-center gap-1 transition-colors"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Xem cảnh</span>
                            </button>
                          </div>
                        </div>

                        {/* Interactive Character Assignment per Scene with Avatar Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0A0E17] border border-slate-800/80 rounded px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-slate-400">Nhân vật tham gia cảnh này:</span>
                            {characters.map((c) => {
                              const isAssigned = scene.characterIds.includes(c.id);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleToggleCharacterInScene(scene.id, c.id)}
                                  className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                                    isAssigned
                                      ? 'bg-amber-500 text-slate-950 font-semibold'
                                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {c.avatarUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={c.avatarUrl}
                                      alt={c.name}
                                      className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                                    />
                                  )}
                                  <span>{c.name}</span>
                                  <span className="opacity-75 text-[11px]">
                                    ({isAssigned ? 'Đang khóa' : 'Thêm'})
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <span className="font-mono text-[11px] text-slate-400 truncate max-w-full">
                            {scene.continuityState.characterAnchorLock}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 italic">
                          {scene.continuityState.spatialHook}
                        </p>

                        {/* Editable Narrative Beat & Dialogue with EXPANDED HEIGHT & READABLE LAYOUT */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label
                                htmlFor={`beat-${scene.id}`}
                                className="block text-xs font-medium text-slate-200"
                              >
                                Hành động &amp; Bối cảnh phân cảnh
                              </label>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {scene.narrativeBeat.length} ký tự
                              </span>
                            </div>
                            <textarea
                              id={`beat-${scene.id}`}
                              rows={4}
                              value={scene.narrativeBeat}
                              onChange={(e) =>
                                handleSceneFieldUpdate(scene.id, 'narrativeBeat', e.target.value)
                              }
                              placeholder="Mô tả chi tiết hành động nhân vật, góc máy và ánh sáng..."
                              className="w-full min-h-[110px] resize-y bg-[#0A0E17] border border-slate-800 rounded-md p-3 text-xs text-slate-200 leading-relaxed focus:border-amber-500/80 focus:outline-none"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label
                                htmlFor={`dialogue-${scene.id}`}
                                className="block text-xs font-medium text-slate-200"
                              >
                                Lời thoại / Thuyết minh (Voiceover &amp; Phụ đề)
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => playSceneDialogueAudio(scene)}
                                  className="text-amber-400 hover:text-amber-300 text-[11px] flex items-center gap-1 font-medium transition-colors"
                                  title="Nghe AI đọc câu thoại này theo giọng nhân vật"
                                >
                                  <Volume2 className="w-3 h-3" />
                                  <span>
                                    {playingDialogueSceneId === scene.id ? 'Đang đọc...' : 'Nghe thoại AI'}
                                  </span>
                                </button>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {scene.dialogue.length} ký tự
                                </span>
                              </div>
                            </div>
                            <textarea
                              id={`dialogue-${scene.id}`}
                              rows={4}
                              value={scene.dialogue}
                              onChange={(e) =>
                                handleSceneFieldUpdate(scene.id, 'dialogue', e.target.value)
                              }
                              placeholder="Lời thoại của nhân vật hoặc câu thuyết minh TVC..."
                              className="w-full min-h-[110px] resize-y bg-[#0A0E17] border border-slate-800 rounded-md p-3 text-xs text-slate-200 leading-relaxed focus:border-amber-500/80 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Multi-Modal Google Flow Prompts: 3 Parallel Columns OR Focused Wide Tabs */}
                        <div className="pt-1">
                          {promptLayoutMode === 'grid' ? (
                            /* Mode A: Generous 3-Column Parallel Cards */
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* 1. Imagen 3 Prompt */}
                              <div className="flex flex-col gap-1.5 bg-[#0A0E17] border border-slate-800/90 rounded-md p-2.5">
                                <div className="flex items-center justify-between">
                                  <label
                                    htmlFor={`img-prompt-${scene.id}`}
                                    className="text-[11px] font-mono font-medium text-sky-400 flex items-center gap-1.5"
                                  >
                                    <Film className="w-3.5 h-3.5 shrink-0" />
                                    <span>1. Imagen 3 Keyframe</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyPrompt(scene.imagePrompt, `img-${scene.id}`)
                                    }
                                    className="text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800"
                                    title="Sao chép Prompt Imagen 3"
                                  >
                                    {copiedPromptId === `img-${scene.id}` ? (
                                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>
                                      {copiedPromptId === `img-${scene.id}` ? 'Đã chép' : 'Chép'}
                                    </span>
                                  </button>
                                </div>
                                <textarea
                                  id={`img-prompt-${scene.id}`}
                                  rows={5}
                                  value={scene.imagePrompt}
                                  onChange={(e) =>
                                    handleSceneFieldUpdate(scene.id, 'imagePrompt', e.target.value)
                                  }
                                  className="w-full min-h-[135px] resize-y bg-[#111726] border border-slate-800 rounded p-2.5 text-[11px] font-mono leading-relaxed text-slate-200 focus:border-sky-500/70 focus:outline-none"
                                />
                              </div>

                              {/* 2. Google Flow Veo 2 Prompt */}
                              <div className="flex flex-col gap-1.5 bg-[#0A0E17] border border-slate-800/90 rounded-md p-2.5">
                                <div className="flex items-center justify-between">
                                  <label
                                    htmlFor={`vid-prompt-${scene.id}`}
                                    className="text-[11px] font-mono font-medium text-amber-400 flex items-center gap-1.5"
                                  >
                                    <Video className="w-3.5 h-3.5 shrink-0" />
                                    <span>2. Veo 2 Video Motion</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyPrompt(scene.videoPrompt, `vid-${scene.id}`)
                                    }
                                    className="text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800"
                                    title="Sao chép Prompt Google Flow Veo 2"
                                  >
                                    {copiedPromptId === `vid-${scene.id}` ? (
                                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>
                                      {copiedPromptId === `vid-${scene.id}` ? 'Đã chép' : 'Chép'}
                                    </span>
                                  </button>
                                </div>
                                <textarea
                                  id={`vid-prompt-${scene.id}`}
                                  rows={5}
                                  value={scene.videoPrompt}
                                  onChange={(e) =>
                                    handleSceneFieldUpdate(scene.id, 'videoPrompt', e.target.value)
                                  }
                                  className="w-full min-h-[135px] resize-y bg-[#111726] border border-slate-800 rounded p-2.5 text-[11px] font-mono leading-relaxed text-slate-200 focus:border-amber-500/70 focus:outline-none"
                                />
                              </div>

                              {/* 3. TTS & Lyria Audio Prompt */}
                              <div className="flex flex-col gap-1.5 bg-[#0A0E17] border border-slate-800/90 rounded-md p-2.5">
                                <div className="flex items-center justify-between">
                                  <label
                                    htmlFor={`aud-prompt-${scene.id}`}
                                    className="text-[11px] font-mono font-medium text-emerald-400 flex items-center gap-1.5"
                                  >
                                    <Music className="w-3.5 h-3.5 shrink-0" />
                                    <span>3. TTS &amp; Lyria Score</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyPrompt(scene.audioPrompt, `aud-${scene.id}`)
                                    }
                                    className="text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800"
                                    title="Sao chép Prompt Âm thanh"
                                  >
                                    {copiedPromptId === `aud-${scene.id}` ? (
                                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>
                                      {copiedPromptId === `aud-${scene.id}` ? 'Đã chép' : 'Chép'}
                                    </span>
                                  </button>
                                </div>
                                <textarea
                                  id={`aud-prompt-${scene.id}`}
                                  rows={5}
                                  value={scene.audioPrompt}
                                  onChange={(e) =>
                                    handleSceneFieldUpdate(scene.id, 'audioPrompt', e.target.value)
                                  }
                                  className="w-full min-h-[135px] resize-y bg-[#111726] border border-slate-800 rounded p-2.5 text-[11px] font-mono leading-relaxed text-slate-200 focus:border-emerald-500/70 focus:outline-none"
                                />
                              </div>
                            </div>
                          ) : (
                            /* Mode B: Full-Width Focused Tab View */
                            <div className="bg-[#0A0E17] border border-slate-800/90 rounded-md p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800">
                                <div className="flex items-center gap-1.5" role="tablist">
                                  <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activePromptTab === 'video'}
                                    onClick={() =>
                                      setActivePromptTabMap((prev) => ({
                                        ...prev,
                                        [scene.id]: 'video',
                                      }))
                                    }
                                    className={`px-3 py-1 text-xs font-mono rounded flex items-center gap-1.5 transition-colors ${
                                      activePromptTab === 'video'
                                        ? 'bg-amber-500 text-slate-950 font-semibold'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                    <span>2. Prompt Video (Veo 2)</span>
                                  </button>

                                  <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activePromptTab === 'image'}
                                    onClick={() =>
                                      setActivePromptTabMap((prev) => ({
                                        ...prev,
                                        [scene.id]: 'image',
                                      }))
                                    }
                                    className={`px-3 py-1 text-xs font-mono rounded flex items-center gap-1.5 transition-colors ${
                                      activePromptTab === 'image'
                                        ? 'bg-sky-500 text-slate-950 font-semibold'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    <Film className="w-3.5 h-3.5" />
                                    <span>1. Prompt Ảnh (Imagen 3)</span>
                                  </button>

                                  <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activePromptTab === 'audio'}
                                    onClick={() =>
                                      setActivePromptTabMap((prev) => ({
                                        ...prev,
                                        [scene.id]: 'audio',
                                      }))
                                    }
                                    className={`px-3 py-1 text-xs font-mono rounded flex items-center gap-1.5 transition-colors ${
                                      activePromptTab === 'audio'
                                        ? 'bg-emerald-500 text-slate-950 font-semibold'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    <Music className="w-3.5 h-3.5" />
                                    <span>3. Prompt Audio (Lyria)</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const text =
                                        activePromptTab === 'image'
                                          ? scene.imagePrompt
                                          : activePromptTab === 'video'
                                            ? scene.videoPrompt
                                            : scene.audioPrompt;
                                      handleCopyPrompt(text, `tab-${scene.id}`);
                                    }}
                                    className="px-2.5 py-1 text-xs text-slate-300 hover:text-slate-100 bg-slate-800/80 hover:bg-slate-700 rounded flex items-center gap-1.5 transition-colors"
                                  >
                                    {copiedPromptId === `tab-${scene.id}` ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                    <span>
                                      {copiedPromptId === `tab-${scene.id}`
                                        ? 'Đã sao chép!'
                                        : 'Sao chép prompt này'}
                                    </span>
                                  </button>
                                </div>
                              </div>

                              {activePromptTab === 'image' && (
                                <textarea
                                  rows={6}
                                  value={scene.imagePrompt}
                                  onChange={(e) =>
                                    handleSceneFieldUpdate(scene.id, 'imagePrompt', e.target.value)
                                  }
                                  className="w-full min-h-[160px] resize-y bg-[#111726] border border-slate-800 rounded p-3 text-xs font-mono leading-relaxed text-slate-200 focus:border-sky-500/70 focus:outline-none"
                                />
                              )}

                              {activePromptTab === 'video' && (
                                <textarea
                                  rows={6}
                                  value={scene.videoPrompt}
                                  onChange={(e) =>
                                    handleSceneFieldUpdate(scene.id, 'videoPrompt', e.target.value)
                                  }
                                  className="w-full min-h-[160px] resize-y bg-[#111726] border border-slate-800 rounded p-3 text-xs font-mono leading-relaxed text-slate-200 focus:border-amber-500/70 focus:outline-none"
                                />
                              )}

                              {activePromptTab === 'audio' && (
                                <textarea
                                  rows={6}
                                  value={scene.audioPrompt}
                                  onChange={(e) =>
                                    handleSceneFieldUpdate(scene.id, 'audioPrompt', e.target.value)
                                  }
                                  className="w-full min-h-[160px] resize-y bg-[#111726] border border-slate-800 rounded p-3 text-xs font-mono leading-relaxed text-slate-200 focus:border-emerald-500/70 focus:outline-none"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Google Flow Character Hub (Presets, Image Lock Upload & Custom Flow Token) */}
      {showFlowModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="flow-modal-heading"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of Array.from(items)) {
              if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                  setFlowModalImageFileName(file.name || 'flow-clipboard-character.png');
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === 'string') {
                      setFlowModalImagePreview(reader.result);
                    }
                  };
                  reader.readAsDataURL(file);
                }
                break;
              }
            }
          }}
        >
          <div className="bg-[#111726] border border-slate-800 rounded-lg max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 id="flow-modal-heading" className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-amber-400" />
                  <span>Import Nhân Vật từ Google Flow — Khóa Ảnh (Image Lock)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tải ảnh nhân vật từ Google Flow (hoặc nhấn Ctrl+V dán ảnh) — AI sẽ tự động nhận diện ngoại hình &amp; khóa trực tiếp ảnh nhân vật
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFlowModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-4">
              {/* Direct Flow Reference Image Upload for Visual Character Lock */}
              <div className="bg-[#0A0E17] border border-slate-800 rounded-md p-3.5 flex flex-col gap-3">
                <div>
                  <label htmlFor="flow-token-input" className="block text-xs font-semibold text-slate-200 mb-1">
                    Tải Ảnh Nhân Vật từ Google Flow hoặc Nhập Tên Nhân Vật
                  </label>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Khóa đồng thời <strong>hình ảnh chân dung gốc (Reference Image Lock)</strong> và <strong>mô tả ngoại hình thực tế (Visual DNA)</strong>. Khi dựng cảnh, ảnh nhân vật này sẽ được truyền trực tiếp vào AI để giữ đúng khuôn mặt &amp; trang phục.
                  </p>
                </div>

                {/* Direct Flow Character Reference Image Upload / Paste Box */}
                <div className="bg-[#111726] border border-dashed border-amber-500/40 rounded-md p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <input
                    ref={flowModalFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFlowModalFileSelected}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-16 h-16 rounded-lg border border-slate-700 bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center">
                      {flowModalImagePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={flowModalImagePreview}
                          alt="Flow Character Reference Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Upload className="w-5 h-5 text-amber-400/80" />
                      )}
                    </div>
                    <div className="text-xs">
                      <div className="font-semibold text-amber-300">
                        {flowModalImagePreview
                          ? `🖼️ Đã chọn ảnh khóa: ${flowModalImageFileName || 'Ảnh nhân vật Flow'}`
                          : 'Tải lên hoặc nhấn Ctrl+V để dán Ảnh Nhân Vật từ Flow'}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {flowModalImagePreview
                          ? 'Gemini Vision sẽ đọc chính xác nam / nữ / em bé, khuôn mặt & trang phục từ ảnh này.'
                          : 'Nếu không tải ảnh, hệ thống sẽ tự động dùng Gemini 3.1 Image tạo ảnh chân dung mẫu thực tế.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => flowModalFileInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 text-xs font-medium rounded transition-colors whitespace-nowrap"
                    >
                      {flowModalImagePreview ? 'Đổi ảnh khác' : 'Chọn ảnh từ máy'}
                    </button>
                    {flowModalImagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setFlowModalImagePreview('');
                          setFlowModalImageFileName('');
                        }}
                        className="px-2 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs rounded transition-colors"
                        title="Xóa ảnh đã chọn"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    id="flow-token-input"
                    type="text"
                    value={customFlowIdInput}
                    onChange={(e) => setCustomFlowIdInput(e.target.value)}
                    placeholder="Nhập tên nhân vật (VD: Ba Ben, Mẹ Na, Bé Ấu)..."
                    className="flex-1 bg-[#111726] border border-slate-700 focus:border-amber-500 rounded px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleImportCustomFlowToken}
                    disabled={isProfilingChar || (!customFlowIdInput.trim() && !flowModalImagePreview)}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded transition-colors whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProfilingChar ? 'animate-spin' : ''}`} />
                    <span>
                      {isProfilingChar
                        ? 'Đang nhận diện ảnh...'
                        : flowModalImagePreview
                        ? 'Khóa Ảnh & Import Nhân Vật'
                        : 'Tạo & Khóa Nhân Vật AI'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFlowModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Upload Character (Portrait Image & JSON Profile File) */}
      {showUploadModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-heading"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="bg-[#111726] border border-slate-800 rounded-lg max-w-lg w-full flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 id="upload-modal-heading" className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>Tải Lên Nhân Vật Có Sẵn (Admin Character Upload)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tải ảnh chân dung hoặc tệp dữ liệu JSON của nhân vật để đưa vào dự án
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Option 1: Upload JSON File */}
              <div className="bg-[#0A0E17] border border-slate-800 rounded-md p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Cách 1: Tải lên tệp hồ sơ nhân vật (.json)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tải lên tệp JSON đã xuất từ các dự án FlowStudio trước hoặc tài liệu cấu hình nhân vật.
                </p>
                <div className="pt-2">
                  <input
                    type="file"
                    ref={jsonFileInputRef}
                    accept=".json,application/json"
                    onChange={handleUploadCharacterJsonFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => jsonFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Chọn tệp .json từ máy tính</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Upload Portrait Image & Launch Character Form */}
              <div className="bg-[#0A0E17] border border-slate-800 rounded-md p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Cách 2: Tải ảnh chân dung nhân vật có sẵn (.png, .jpg)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tải ảnh mẫu đại diện, hệ thống sẽ mở biểu mẫu tạo nhân vật và tự động phân tích ngoại hình.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setShowAddChar(true);
                      setTimeout(() => avatarFileInputRef.current?.click(), 100);
                    }}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Chọn ảnh chân dung &amp; Mở biểu mẫu</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Cinema Scene Preview Modal in Tab 01 */}
      {cinemaModalSceneIndex !== null && scenes[cinemaModalSceneIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Trình phát xem trước Cảnh 0${scenes[cinemaModalSceneIndex].sceneNumber}`}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCinemaModalSceneIndex(null);
            }
          }}
        >
          <div className="w-full max-w-4xl bg-[#111726] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4 bg-[#0A0E17]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-semibold shrink-0">
                  CẢNH 0{scenes[cinemaModalSceneIndex].sceneNumber} / 0{scenes.length}
                </span>
                <h3 className="text-sm font-semibold text-slate-100 truncate">
                  {scenes[cinemaModalSceneIndex].title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={cinemaModalSceneIndex <= 0}
                  onClick={() => {
                    setCinemaModalSceneIndex((prev) =>
                      prev !== null && prev > 0 ? prev - 1 : prev
                    );
                    setPlayTrigger((prev) => prev + 1);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs rounded flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Cảnh trước</span>
                </button>
                <button
                  type="button"
                  disabled={cinemaModalSceneIndex >= scenes.length - 1}
                  onClick={() => {
                    setCinemaModalSceneIndex((prev) =>
                      prev !== null && prev < scenes.length - 1 ? prev + 1 : prev
                    );
                    setPlayTrigger((prev) => prev + 1);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs rounded flex items-center gap-1 transition-colors"
                >
                  <span>Cảnh tiếp</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCinemaModalSceneIndex(null)}
                  className="ml-2 p-1.5 rounded-md bg-slate-800/80 hover:bg-rose-950/80 text-slate-300 hover:text-rose-200 border border-slate-700 transition-colors"
                  aria-label="Đóng trình xem cảnh"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <FlowCanvasPlayer
                scenes={scenes}
                mode="single"
                activeSceneIndex={cinemaModalSceneIndex}
                autoPlayTrigger={playTrigger}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#0A0E17] border border-slate-800 rounded-lg p-3.5">
                <div>
                  <span className="text-slate-400 font-medium block mb-1">
                    Hành động &amp; Chuyển động máy quay:
                  </span>
                  <p className="text-slate-200 leading-relaxed">
                    {scenes[cinemaModalSceneIndex].videoPrompt}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block mb-1">
                    Lời thoại &amp; Âm thanh đồng bộ:
                  </span>
                  <p className="text-amber-300 italic leading-relaxed">
                    {scenes[cinemaModalSceneIndex].dialogue || 'Không có lời thoại (B-Roll)'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
