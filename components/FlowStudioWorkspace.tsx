'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Film,
  Layers,
  Scissors,
  GitCompare,
  Edit3,
  Check,
} from 'lucide-react';
import {
  CharacterProfile,
  SceneNode,
  SceneReviewStatus,
  ScenePostEdit,
  ProjectVersion,
  ScriptAnalysisReport,
  ScriptCritiqueSuggestion,
  AudioLibraryAsset,
  VoiceRegionLock,
  applyGlobalVoiceRegionLock,
  triggerSelectiveRegeneration,
  computeProductionProgress,
  analyzeScriptQuality,
  applyCritiqueSuggestionToState,
  assignAudioAssetToScene,
  generateUniqueCharacterId,
  extractCharactersFromScriptText,
  parseScriptIntoScenes,
  extractProjectTitleFromScript,
} from '@/lib/flow-engine';
import ScriptBreakdownView from './ScriptBreakdownView';
import ParallelGenerationView from './ParallelGenerationView';
import PostProductionEditorView from './PostProductionEditorView';
import VersionComparisonView from './VersionComparisonView';

type ActiveTab = 'script' | 'generation' | 'postprod' | 'versions';

const STORAGE_KEY = 'flowstudio_pro_workspace_clean_v4';

export default function FlowStudioWorkspace() {
  const [projectTitle, setProjectTitle] = useState(
    'Dự Án Video Mới — FlowStudio Pro'
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(
    'Dự Án Video Mới — FlowStudio Pro'
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('script');
  const [scriptText, setScriptText] = useState<string>('');
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [scenes, setScenes] = useState<SceneNode[]>([]);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string>('');
  const [voiceRegion, setVoiceRegion] = useState<VoiceRegionLock>('south');
  const [hasRestoredFromStorage, setHasRestoredFromStorage] = useState(false);

  const projectFileInputRef = useRef<HTMLInputElement | null>(null);

  const [scriptCritique, setScriptCritique] = useState<ScriptAnalysisReport>(
    () => analyzeScriptQuality('', [], [])
  );
  const [isCritiquing, setIsCritiquing] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisEngineLabel, setAnalysisEngineLabel] = useState(
    'Google Flow Continuity Parser'
  );
  const [isGeneratingIds, setIsGeneratingIds] = useState<string[]>([]);
  const [agentProgressMap, setAgentProgressMap] = useState<
    Record<string, { image: number; video: number; audio: number }>
  >({});
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const progress = computeProductionProgress(scenes);
  const currentVersion =
    versions.find((v) => v.id === activeVersionId) ||
    versions[versions.length - 1];

  const showToast = useCallback((msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  // Load persisted project state on mount asynchronously (filtering out any legacy mock characters like Linh, Minh, Khoa, Hà An, Elena)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            if (typeof parsed.projectTitle === 'string' && parsed.projectTitle.trim()) {
              setProjectTitle(parsed.projectTitle);
              setDraftTitle(parsed.projectTitle);
            }
            if (typeof parsed.scriptText === 'string') {
              setScriptText(parsed.scriptText);
            }
            const loadedVoiceRegion: VoiceRegionLock =
              parsed.voiceRegion === 'north' || parsed.voiceRegion === 'central'
                ? parsed.voiceRegion
                : 'south';
            setVoiceRegion(loadedVoiceRegion);

            const legacyMockIds = new Set([
              'char-linh',
              'char-minh',
              'flow-khoa',
              'flow-haan',
              'flow-elena',
            ]);
            const legacyMockNames = new Set([
              'linh',
              'minh',
              'khoa',
              'hà an',
              'elena',
            ]);
            const currentScriptLower = String(parsed.scriptText || '').toLowerCase();

            if (Array.isArray(parsed.characters)) {
              const cleanedChars = parsed.characters.filter((c: CharacterProfile) => {
                if (!c || !c.name) return false;
                if (legacyMockIds.has(c.id)) return false;
                const lowerN = c.name.toLowerCase().trim();
                if (
                  legacyMockNames.has(lowerN) &&
                  !currentScriptLower.includes(lowerN)
                ) {
                  return false;
                }
                return true;
              });
              setCharacters(cleanedChars);
            }
            if (Array.isArray(parsed.scenes)) {
              setScenes(parsed.scenes);
            }
            if (Array.isArray(parsed.versions)) {
              const cleanedVersions = parsed.versions.filter(
                (v: ProjectVersion) =>
                  !String(v?.scriptRaw || '').includes('STUDIO KIẾN TRÚC TRÊN CAO')
              );
              setVersions(cleanedVersions);
            }
            if (typeof parsed.activeVersionId === 'string') {
              setActiveVersionId(parsed.activeVersionId);
            }
            if (
              typeof parsed.scriptText === 'string' &&
              parsed.scriptText.trim() &&
              Array.isArray(parsed.scenes)
            ) {
              setScriptCritique(
                analyzeScriptQuality(
                  parsed.scriptText,
                  parsed.scenes,
                  Array.isArray(parsed.characters) ? parsed.characters : []
                )
              );
            }
          }
        }
      } catch {
        // Ignore storage read errors
      } finally {
        setHasRestoredFromStorage(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Automatically save workspace state to localStorage when modified (debounced & stripped of heavy media blobs so 5MB localStorage quota never overflows or blocks UI)
  useEffect(() => {
    if (!hasRestoredFromStorage) return;
    const saveTimer = window.setTimeout(() => {
      try {
        const compactScenes = scenes.map((s) => ({
          ...s,
          videoClipUrl: undefined,
          voiceoverAudioUrl: undefined,
          takes: Array.isArray(s.takes)
            ? s.takes.map((t) => ({
                ...t,
                videoClipUrl: undefined,
                voiceoverAudioUrl: undefined,
              }))
            : [],
        }));
        const compactVersions = versions.slice(-5).map((v) => ({
          ...v,
          scenes: Array.isArray(v.scenes)
            ? v.scenes.map((s) => ({
                ...s,
                videoClipUrl: undefined,
                voiceoverAudioUrl: undefined,
                takes: Array.isArray(s.takes)
                  ? s.takes.map((t) => ({
                      ...t,
                      videoClipUrl: undefined,
                      voiceoverAudioUrl: undefined,
                    }))
                  : [],
              }))
            : [],
        }));
        const payload = {
          projectTitle,
          scriptText,
          characters,
          scenes: compactScenes,
          versions: compactVersions,
          activeVersionId,
          voiceRegion,
          updatedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore storage quota errors
      }
    }, 350);
    return () => window.clearTimeout(saveTimer);
  }, [
    hasRestoredFromStorage,
    projectTitle,
    scriptText,
    characters,
    scenes,
    versions,
    activeVersionId,
    voiceRegion,
  ]);

  const handleVoiceRegionChange = useCallback(
    (newRegion: VoiceRegionLock) => {
      setVoiceRegion(newRegion);
      const locked = applyGlobalVoiceRegionLock(characters, scenes, newRegion);
      setCharacters(locked.characters);
      setScenes(locked.scenes);
      const regionName =
        newRegion === 'north'
          ? 'Giọng Miền Bắc'
          : newRegion === 'central'
          ? 'Giọng Miền Trung'
          : 'Giọng Miền Nam';
      showToast(
        `🔒 Đã khóa "${regionName}" đồng bộ cho toàn bộ ${locked.characters.length} nhân vật và ${locked.scenes.length} phân cảnh!`
      );
    },
    [characters, scenes, showToast]
  );

  // 1. Analyze Script via Instant Continuity Engine + Server AI Director
  const handleAnalyzeScript = async (overrideText?: string) => {
    const activeScript =
      typeof overrideText === 'string' ? overrideText : scriptText;
    if (!activeScript.trim()) return;
    if (typeof overrideText === 'string' && overrideText !== scriptText) {
      setScriptText(overrideText);
    }
    setIsAnalyzing(true);

    // Instant extraction & scene breakdown so user sees real characters & scenes immediately
    const rawInstantChars = extractCharactersFromScriptText(activeScript, characters);
    const rawInstantScenes = parseScriptIntoScenes(activeScript, rawInstantChars);
    const lockedInstant = applyGlobalVoiceRegionLock(
      rawInstantChars,
      rawInstantScenes,
      voiceRegion
    );
    const instantChars = lockedInstant.characters;
    const instantScenes = lockedInstant.scenes;
    const instantTitle = extractProjectTitleFromScript(activeScript);
    const instantReport = analyzeScriptQuality(
      activeScript,
      instantScenes,
      instantChars
    );

    if (instantChars.length > 0) setCharacters(instantChars);
    if (instantScenes.length > 0) setScenes(instantScenes);
    if (instantTitle) {
      setProjectTitle(instantTitle);
      setDraftTitle(instantTitle);
    }
    setScriptCritique(instantReport);

    try {
      const res = await fetch('/api/flow/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptText: activeScript,
          characters: instantChars,
        }),
      });
      const data = await res.json();
      const rawNextChars: CharacterProfile[] =
        Array.isArray(data.characters) && data.characters.length > 0
          ? data.characters
          : instantChars;
      const rawNextScenes: SceneNode[] =
        Array.isArray(data.scenes) && data.scenes.length > 0
          ? data.scenes
          : instantScenes;
      const lockedNext = applyGlobalVoiceRegionLock(
        rawNextChars,
        rawNextScenes,
        voiceRegion
      );
      const nextChars = lockedNext.characters;
      const nextScenes = lockedNext.scenes;

      setCharacters(nextChars);
      setScenes(nextScenes);

      if (typeof data.projectTitle === 'string' && data.projectTitle.trim()) {
        setProjectTitle(data.projectTitle);
        setDraftTitle(data.projectTitle);
      }

      if (data.report && Array.isArray(data.report.suggestions)) {
        setScriptCritique(data.report);
      } else {
        setScriptCritique(
          analyzeScriptQuality(activeScript, nextScenes, nextChars)
        );
      }

      if (versions.length === 0 && nextScenes.length > 0) {
        const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const v1: ProjectVersion = {
          id: generateUniqueCharacterId('ver-1-0'),
          versionTag: 'v1.0',
          label: 'Bản dựng gốc từ kịch bản',
          createdAt: nowStr,
          author: 'Admin Studio',
          notes: `Phân tích ${nextScenes.length} phân cảnh và trích xuất ${nextChars.length} nhân vật (${nextChars.map((c) => c.name).join(', ')}).`,
          scriptRaw: activeScript,
          scenes: structuredClone(nextScenes),
          characters: structuredClone(nextChars),
          masterApproved: false,
        };
        setVersions([v1]);
        setActiveVersionId(v1.id);
      }

      setAnalysisEngineLabel(
        data.engine === 'gemini-3.8-flash'
          ? 'Gemini 3.8 Flash Director'
          : 'Flow Continuity Engine'
      );
      showToast(
        `Đã phân tích thành ${nextScenes.length} phân cảnh và tự động khóa ${nextChars.length} nhân vật (${nextChars.map((c) => c.name).join(', ')}).`
      );
    } catch {
      showToast(
        `Đã phân tích thành ${instantScenes.length} phân cảnh và tự động khóa ${instantChars.length} nhân vật (${instantChars.map((c) => c.name).join(', ')}).`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 1B. Run AI Script Analysis & Suggestions via Instant Engine + Server AI
  const handleRunScriptCritique = async (overrideText?: string) => {
    const activeScript =
      typeof overrideText === 'string' ? overrideText : scriptText;
    if (!activeScript.trim()) return;
    setIsCritiquing(true);

    const instantChars = extractCharactersFromScriptText(activeScript, characters);
    const hasCorruptedHeaderScene = scenes.some((s) =>
      s.title.trim().startsWith('#')
    );
    const instantScenes =
      scenes.length > 0 && !hasCorruptedHeaderScene
        ? scenes
        : parseScriptIntoScenes(activeScript, instantChars);
    const instantTitle = extractProjectTitleFromScript(activeScript);
    const instantReport = analyzeScriptQuality(
      activeScript,
      instantScenes,
      instantChars
    );

    if (instantChars.length > 0) setCharacters(instantChars);
    if (
      (scenes.length === 0 || hasCorruptedHeaderScene) &&
      instantScenes.length > 0
    ) {
      setScenes(instantScenes);
    }
    if (instantTitle && projectTitle === 'Dự Án Video Mới — FlowStudio Pro') {
      setProjectTitle(instantTitle);
      setDraftTitle(instantTitle);
    }
    setScriptCritique(instantReport);

    try {
      const res = await fetch('/api/flow/critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptText: activeScript,
          scenes: instantScenes,
          characters: instantChars,
        }),
      });
      const data = await res.json();
      const nextChars: CharacterProfile[] =
        Array.isArray(data.characters) && data.characters.length > 0
          ? data.characters
          : instantChars;
      if (nextChars.length > 0) {
        setCharacters(nextChars);
      }
      if (
        (scenes.length === 0 || hasCorruptedHeaderScene) &&
        Array.isArray(data.scenes) &&
        data.scenes.length > 0
      ) {
        setScenes(data.scenes);
      }
      if (data.report && Array.isArray(data.report.suggestions)) {
        setScriptCritique(data.report);
        showToast(
          `Cố vấn Kịch bản AI đã phân tích kịch bản (${nextChars.map((c) => c.name).join(', ')}) và tạo ${data.report.suggestions.length} gợi ý cải thiện.`
        );
      } else {
        showToast(
          `Cố vấn Kịch bản AI đã phân tích kịch bản (${instantChars.map((c) => c.name).join(', ')}) và tạo ${instantReport.suggestions.length} gợi ý cải thiện.`
        );
      }
    } catch {
      showToast(
        `Cố vấn Kịch bản AI đã phân tích kịch bản (${instantChars.map((c) => c.name).join(', ')}) và tạo ${instantReport.suggestions.length} gợi ý cải thiện.`
      );
    } finally {
      setIsCritiquing(false);
    }
  };

  const handleApplyCritiqueSuggestion = (
    suggestion: ScriptCritiqueSuggestion
  ) => {
    setScenes((prevScenes) =>
      applyCritiqueSuggestionToState(prevScenes, characters, suggestion)
    );
    setScriptCritique((prev) => ({
      ...prev,
      suggestions: prev.suggestions.map((s) =>
        s.id === suggestion.id ? { ...s, applied: true } : s
      ),
    }));
    showToast(
      `Đã áp dụng gợi ý "${suggestion.title}" vào Cảnh ${suggestion.sceneNumber || 1}.`
    );
  };

  const handleApplyAllCritiqueSuggestions = () => {
    const unapplied = scriptCritique.suggestions.filter((s) => !s.applied);
    if (unapplied.length === 0) {
      showToast('Tất cả gợi ý tối ưu kịch bản đã được áp dụng.');
      return;
    }
    setScenes((prevScenes) => {
      let updated = prevScenes;
      for (const sug of unapplied) {
        updated = applyCritiqueSuggestionToState(updated, characters, sug);
      }
      return updated;
    });
    setScriptCritique((prev) => ({
      ...prev,
      suggestions: prev.suggestions.map((s) => ({ ...s, applied: true })),
    }));
    showToast(
      `Đã áp dụng tất cả ${unapplied.length} gợi ý tối ưu kịch bản AI vào toàn bộ các phân cảnh.`
    );
  };

  // 2. Run Parallel Multi-Agent Generation (All or Selective) via Server API + Real-time Progress
  const runParallelAgents = useCallback(
    async (
      targetIds: string[],
      promptOverrides?: Record<
        string,
        Partial<Pick<SceneNode, 'imagePrompt' | 'videoPrompt' | 'audioPrompt'>>
      >
    ) => {
      if (targetIds.length === 0) return;
      setIsGeneratingIds(targetIds);

      const initialProg: Record<
        string,
        { image: number; video: number; audio: number }
      > = {};
      targetIds.forEach((id) => {
        initialProg[id] = { image: 30, video: 20, audio: 35 };
      });
      setAgentProgressMap((prev) => ({ ...prev, ...initialProg }));

      const midTimer = setTimeout(() => {
        const midProg: Record<
          string,
          { image: number; video: number; audio: number }
        > = {};
        targetIds.forEach((id) => {
          midProg[id] = { image: 85, video: 75, audio: 90 };
        });
        setAgentProgressMap((prev) => ({ ...prev, ...midProg }));
      }, 260);

      try {
        const res = await fetch('/api/flow/generate-scene', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenes,
            targetIds,
            characters,
            promptOverrides,
          }),
        });
        const data = await res.json();
        clearTimeout(midTimer);

        const doneProg: Record<
          string,
          { image: number; video: number; audio: number }
        > = {};
        targetIds.forEach((id) => {
          doneProg[id] = { image: 100, video: 100, audio: 100 };
        });
        setAgentProgressMap((prev) => ({ ...prev, ...doneProg }));

        if (Array.isArray(data.scenes) && data.scenes.length > 0) {
          setScenes(
            data.scenes.map((s: SceneNode) => ({
              ...s,
              selectedForBatch: false,
            }))
          );
        } else {
          const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
          setScenes((prevScenes) =>
            triggerSelectiveRegeneration(
              prevScenes,
              targetIds,
              promptOverrides,
              nowStr,
              characters
            ).map((s) => ({
              ...s,
              selectedForBatch: false,
            }))
          );
        }

        showToast(
          `Đã dựng đồng thời thành công ${targetIds.length} phân cảnh (Keyframe mới + Chuyển động máy quay + Giọng đọc Gemini TTS WAV).`
        );
      } catch {
        clearTimeout(midTimer);
        const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
        setScenes((prevScenes) =>
          triggerSelectiveRegeneration(
            prevScenes,
            targetIds,
            promptOverrides,
            nowStr,
            characters
          ).map((s) => ({
            ...s,
            selectedForBatch: false,
          }))
        );
        showToast(
          `Đã dựng đồng thời thành công ${targetIds.length} phân cảnh (Hình ảnh + Video + Âm thanh).`
        );
      } finally {
        setIsGeneratingIds([]);
      }
    },
    [scenes, characters, showToast]
  );

  const handleApproveScriptAndBuild = () => {
    setActiveTab('generation');
    const allIds = scenes.map((s) => s.id);
    runParallelAgents(allIds);
  };

  const handleToggleSelectScene = (sceneId: string) => {
    setScenes((prev) =>
      prev.map((s) =>
        s.id === sceneId ? { ...s, selectedForBatch: !s.selectedForBatch } : s
      )
    );
  };

  const handleSetSceneReviewStatus = (
    sceneId: string,
    status: SceneReviewStatus
  ) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === sceneId ? { ...s, reviewStatus: status } : s))
    );
  };

  const handleSelectTake = (sceneId: string, takeNumber: number) => {
    setScenes((prev) =>
      prev.map((s) => {
        if (s.id !== sceneId) return s;
        const found = s.takes.find((t) => t.takeNumber === takeNumber);
        if (!found) return s;
        return {
          ...s,
          currentTake: takeNumber,
          keyframeUrl: found.keyframeUrl || s.keyframeUrl,
          videoClipUrl: found.videoClipUrl || s.videoClipUrl,
          voiceoverAudioUrl: found.voiceoverAudioUrl || s.voiceoverAudioUrl,
          imagePrompt: found.imagePrompt,
          videoPrompt: found.videoPrompt,
          audioPrompt: found.audioPrompt,
        };
      })
    );
  };

  const handleApproveAllAndProceed = () => {
    setScenes((prev) =>
      prev.map((s) => ({ ...s, reviewStatus: 'approved' as const }))
    );
    setActiveTab('postprod');
    showToast(
      'Đã duyệt toàn bộ phân cảnh và chuyển sang Bàn dựng Hậu kỳ & Ghép cảnh hoàn chỉnh.'
    );
  };

  const handleUpdateScenePostEdit = (
    sceneId: string,
    patch: Partial<ScenePostEdit>
  ) => {
    setScenes((prev) =>
      prev.map((s) =>
        s.id === sceneId
          ? { ...s, postEdit: { ...s.postEdit, ...patch } }
          : s
      )
    );
  };

  const handleAssignAudioAsset = (
    targetSceneId: string | 'all',
    asset: AudioLibraryAsset
  ) => {
    setScenes((prev) => assignAudioAssetToScene(prev, targetSceneId, asset));
  };

  const handleCreateSnapshot = (label: string, notes: string) => {
    const nextIdx = versions.length;
    const versionTag = `v1.${nextIdx}`;
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newVersion: ProjectVersion = {
      id: generateUniqueCharacterId(`ver-1-${nextIdx}`),
      versionTag,
      label,
      createdAt: nowStr,
      author: 'Admin Studio',
      notes,
      scriptRaw: scriptText,
      scenes: structuredClone(scenes),
      characters: structuredClone(characters),
      masterApproved: progress.readyForAssembly,
    };
    setVersions((prev) => [...prev, newVersion]);
    setActiveVersionId(newVersion.id);
    showToast(`Đã tạo phiên bản ${versionTag} (${label}) thành công.`);
  };

  const handleRestoreVersion = (versionId: string) => {
    const target = versions.find((v) => v.id === versionId);
    if (!target) return;
    setScriptText(target.scriptRaw);
    setCharacters(structuredClone(target.characters));
    setScenes(structuredClone(target.scenes));
    setActiveVersionId(target.id);
    showToast(`Đã khôi phục dự án về phiên bản ${target.versionTag}.`);
  };

  const handleExportMasterBundle = () => {
    const bundle = {
      projectTitle,
      exportedAt: new Date().toISOString(),
      activeVersion: currentVersion?.versionTag || 'v1.1',
      totalDurationSec: progress.totalDurationSec,
      readyForAssembly: progress.readyForAssembly,
      scriptText,
      characters,
      scenes,
      versions,
      versionsCount: versions.length,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'google-flow-master-project.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất gói dự án cuối cùng (google-flow-master-project.json).');
  };

  const handleImportProjectBundle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (parsed && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
          if (typeof parsed.projectTitle === 'string') {
            setProjectTitle(parsed.projectTitle);
            setDraftTitle(parsed.projectTitle);
          }
          if (typeof parsed.scriptText === 'string') {
            setScriptText(parsed.scriptText);
          }
          if (Array.isArray(parsed.characters) && parsed.characters.length > 0) {
            setCharacters(parsed.characters);
          }
          setScenes(parsed.scenes);
          if (Array.isArray(parsed.versions) && parsed.versions.length > 0) {
            setVersions(parsed.versions);
          }
          showToast(
            `Đã nhập thành công dự án "${parsed.projectTitle || file.name}" (${parsed.scenes.length} cảnh).`
          );
        } else {
          showToast('Tệp JSON không đúng cấu trúc dự án FlowStudio Pro.');
        }
      } catch {
        showToast('Không thể đọc tệp dự án JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearWorkspace = () => {
    const emptyTitle = 'Dự Án Video Mới — FlowStudio Pro';
    setProjectTitle(emptyTitle);
    setDraftTitle(emptyTitle);
    setScriptText('');
    setCharacters([]);
    setScenes([]);
    setVersions([]);
    setActiveVersionId('');
    setScriptCritique(analyzeScriptQuality('', [], []));
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    showToast('Đã tạo dự án trống mới (Xóa toàn bộ kịch bản, nhân vật và phân cảnh cũ).');
  };

  const handleSaveProjectTitle = () => {
    const trimmed = draftTitle.trim();
    if (trimmed) {
      setProjectTitle(trimmed);
      showToast(`Đã đổi tên dự án thành "${trimmed}".`);
    } else {
      setDraftTitle(projectTitle);
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-4 sm:gap-8 px-6 py-4 border-b border-slate-800/90 bg-[#0D121D]">
        {/* Zone 1: Wordmark with clear build version indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('script');
            }}
            className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            FlowStudio Pro
          </a>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            v2.0 · Production Ready
          </span>
        </div>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav
          aria-label="Điều hướng quy trình sản xuất"
          className="flex items-center gap-6 text-sm font-medium text-slate-300 overflow-x-auto"
        >
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'script'
                ? 'border-amber-400 text-white'
                : 'border-transparent text-slate-400'
            }`}
          >
            Kịch bản
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('generation')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'generation'
                ? 'border-amber-400 text-white'
                : 'border-transparent text-slate-400'
            }`}
          >
            Dựng đa luồng
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('postprod')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'postprod'
                ? 'border-amber-400 text-white'
                : 'border-transparent text-slate-400'
            }`}
          >
            Hậu kỳ NLE
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('versions')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'versions'
                ? 'border-amber-400 text-white'
                : 'border-transparent text-slate-400'
            }`}
          >
            Phiên bản
          </button>
        </nav>

        {/* Zone 3: Primary Project Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={projectFileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportProjectBundle}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => projectFileInputRef.current?.click()}
            title="Mở tệp dự án .json đã lưu"
            className="hidden md:flex px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800/80 border border-slate-700 hover:border-slate-500 rounded-md transition-colors whitespace-nowrap shrink-0 items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Mở Dự Án</span>
          </button>
          <button
            type="button"
            onClick={handleExportMasterBundle}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded-md hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Dự Án</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Project Context & 4-Stage Pipeline Bar */}
        <section
          aria-label="Tổng quan dự án và tiến trình sản xuất"
          className="bg-[#111726] border border-slate-800 rounded-lg p-5 flex flex-col gap-4"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 w-full max-w-md">
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveProjectTitle();
                        if (e.key === 'Escape') {
                          setDraftTitle(projectTitle);
                          setIsEditingTitle(false);
                        }
                      }}
                      aria-label="Tên dự án sản xuất"
                      autoFocus
                      className="flex-1 bg-[#0A0E17] border border-amber-500 rounded px-3 py-1 text-base sm:text-lg font-bold text-slate-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveProjectTitle}
                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Lưu</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <h1
                      className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight truncate"
                      style={{
                        fontFamily: 'var(--font-display)',
                        textWrap: 'balance',
                      }}
                    >
                      {projectTitle}
                    </h1>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftTitle(projectTitle);
                        setIsEditingTitle(true);
                      }}
                      title="Đổi tên dự án"
                      aria-label="Đổi tên dự án"
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800/70 rounded transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Zero-Pill Unboxed Metadata Line */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-1 font-mono tabular-nums">
                <span>
                  Phiên bản hiện hành: {currentVersion?.versionTag || 'Chưa tạo'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{scenes.length} Phân cảnh</span>
                <span aria-hidden="true">·</span>
                <span>{characters.length} Nhân vật khóa Context</span>
                <span aria-hidden="true">·</span>
                <span>
                  Đã duyệt: {progress.approvedScenes}/{progress.totalScenes} cảnh
                </span>
                <span aria-hidden="true">·</span>
                <span>Tổng thời lượng: {progress.totalDurationSec}s</span>
                {hasRestoredFromStorage && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400">
                      Đã lưu tự động
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={handleClearWorkspace}
                  className="text-slate-400 hover:text-rose-300 underline underline-offset-2 inline-flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Dự án trống mới</span>
                </button>
              </div>
            </div>

            {/* Workflow Stepper Tabs */}
            <div
              role="tablist"
              aria-label="Các bước quy trình sản xuất Google Flow"
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'script'}
                onClick={() => setActiveTab('script')}
                className={`px-3.5 py-2 rounded-md border text-left transition-colors ${
                  activeTab === 'script'
                    ? 'bg-amber-500/15 border-amber-400 text-slate-100'
                    : 'bg-[#0A0E17] border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap">01. Kịch bản</span>
                </div>
                <span className="block text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                  Tách cảnh &amp; Context
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'generation'}
                onClick={() => setActiveTab('generation')}
                className={`px-3.5 py-2 rounded-md border text-left transition-colors ${
                  activeTab === 'generation'
                    ? 'bg-amber-500/15 border-amber-400 text-slate-100'
                    : 'bg-[#0A0E17] border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap">02. Dựng Đa Luồng</span>
                </div>
                <span className="block text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                  Review &amp; Regen lẻ
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'postprod'}
                onClick={() => setActiveTab('postprod')}
                className={`px-3.5 py-2 rounded-md border text-left transition-colors ${
                  activeTab === 'postprod'
                    ? 'bg-amber-500/15 border-amber-400 text-slate-100'
                    : 'bg-[#0A0E17] border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Scissors className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap">03. Hậu kỳ &amp; Ghép</span>
                </div>
                <span className="block text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                  NLE, LUT &amp; Xuất file
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'versions'}
                onClick={() => setActiveTab('versions')}
                className={`px-3.5 py-2 rounded-md border text-left transition-colors ${
                  activeTab === 'versions'
                    ? 'bg-amber-500/15 border-amber-400 text-slate-100'
                    : 'bg-[#0A0E17] border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <GitCompare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap">
                    04. Phiên bản ({versions.length})
                  </span>
                </div>
                <span className="block text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                  Đối chiếu &amp; Khôi phục
                </span>
              </button>
            </div>
          </div>

          {statusBanner && (
            <div
              role="status"
              className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-md px-3.5 py-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusBanner}</span>
            </div>
          )}
        </section>

        {/* Active Stage Viewport */}
        {activeTab === 'script' && (
          <ScriptBreakdownView
            scriptText={scriptText}
            onScriptTextChange={setScriptText}
            characters={characters}
            onCharactersChange={setCharacters}
            scenes={scenes}
            onScenesChange={setScenes}
            isAnalyzing={isAnalyzing}
            onAnalyzeScript={handleAnalyzeScript}
            scriptCritique={scriptCritique}
            isCritiquing={isCritiquing}
            onRunScriptCritique={handleRunScriptCritique}
            onApplyCritiqueSuggestion={handleApplyCritiqueSuggestion}
            onApplyAllCritiqueSuggestions={handleApplyAllCritiqueSuggestions}
            onApproveAndStartParallelBuild={handleApproveScriptAndBuild}
            analysisEngineLabel={analysisEngineLabel}
            voiceRegion={voiceRegion}
            onVoiceRegionChange={handleVoiceRegionChange}
          />
        )}

        {activeTab === 'generation' && (
          <ParallelGenerationView
            scenes={scenes}
            isGeneratingIds={isGeneratingIds}
            agentProgressMap={agentProgressMap}
            onRunParallelAll={() =>
              runParallelAgents(scenes.map((s) => s.id))
            }
            onRegenerateSelected={(targetIds, overrides) =>
              runParallelAgents(targetIds, overrides)
            }
            onToggleSelectScene={handleToggleSelectScene}
            onSetSceneReviewStatus={handleSetSceneReviewStatus}
            onApproveAllAndProceed={handleApproveAllAndProceed}
            onSelectTake={handleSelectTake}
          />
        )}

        {activeTab === 'postprod' && (
          <PostProductionEditorView
            projectTitle={projectTitle}
            scenes={scenes}
            onUpdateScenePostEdit={handleUpdateScenePostEdit}
            onAssignAudioAsset={handleAssignAudioAsset}
            onSaveVersionSnapshot={handleCreateSnapshot}
            onExportJsonBundle={handleExportMasterBundle}
          />
        )}

        {activeTab === 'versions' && (
          <VersionComparisonView
            versions={versions}
            activeVersionId={activeVersionId}
            onCreateSnapshot={handleCreateSnapshot}
            onRestoreVersion={handleRestoreVersion}
          />
        )}
      </main>
    </div>
  );
}
