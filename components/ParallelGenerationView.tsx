'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  SlidersHorizontal,
  ArrowRight,
  Layers,
  Image as ImageIcon,
  Video,
  Volume2,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  SceneNode,
  SceneReviewStatus,
  computeProductionProgress,
  isStageDirectionInsteadOfDialogue,
  generateNaturalActingDialogue,
} from '@/lib/flow-engine';
import FlowCanvasPlayer from './FlowCanvasPlayer';

interface ParallelGenerationViewProps {
  scenes: SceneNode[];
  isGeneratingIds: string[];
  agentProgressMap: Record<
    string,
    { image: number; video: number; audio: number }
  >;
  onRunParallelAll: () => void;
  onRegenerateSelected: (
    sceneIds: string[],
    promptOverrides?: Record<
      string,
      Partial<Pick<SceneNode, 'imagePrompt' | 'videoPrompt' | 'audioPrompt'>>
    >
  ) => void;
  onToggleSelectScene: (sceneId: string) => void;
  onSetSceneReviewStatus: (
    sceneId: string,
    status: SceneReviewStatus
  ) => void;
  onApproveAllAndProceed: () => void;
  onSelectTake: (sceneId: string, takeNumber: number) => void;
}

export default function ParallelGenerationView({
  scenes,
  isGeneratingIds,
  agentProgressMap,
  onRunParallelAll,
  onRegenerateSelected,
  onToggleSelectScene,
  onSetSceneReviewStatus,
  onApproveAllAndProceed,
  onSelectTake,
}: ParallelGenerationViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | SceneReviewStatus>(
    'all'
  );
  const [previewSceneIndex, setPreviewSceneIndex] = useState<number>(0);
  const [playTrigger, setPlayTrigger] = useState<number>(0);
  const [cinemaModalSceneIndex, setCinemaModalSceneIndex] = useState<
    number | null
  >(null);
  const [editingPromptSceneId, setEditingPromptSceneId] = useState<
    string | null
  >(null);
  const [draftVideoPrompts, setDraftVideoPrompts] = useState<
    Record<string, string>
  >({});
  const [upgradedKeyframes, setUpgradedKeyframes] = useState<
    Record<string, string>
  >({});
  const [upgradedVideos, setUpgradedVideos] = useState<
    Record<string, string>
  >({});

  const getSceneDisplayDialogue = (scene: SceneNode) => {
    if (isStageDirectionInsteadOfDialogue(scene.dialogue, scene.narrativeBeat)) {
      return generateNaturalActingDialogue(
        scene.narrativeBeat,
        scene.location,
        [],
        scene.sceneNumber
      );
    }
    return scene.dialogue;
  };

  const progress = computeProductionProgress(scenes);
  const selectedSceneIds = scenes
    .filter((s) => s.selectedForBatch)
    .map((s) => s.id);

  const filteredScenes = scenes.filter((s) =>
    statusFilter === 'all' ? true : s.reviewStatus === statusFilter
  );

  const handleWatchScene = (sceneId: string) => {
    const idx = scenes.findIndex((s) => s.id === sceneId);
    const targetIdx = idx >= 0 ? idx : 0;
    setPreviewSceneIndex(targetIdx);
    setPlayTrigger((prev) => prev + 1);
    setCinemaModalSceneIndex(targetIdx);
  };

  const getReviewStatusLabel = (status: SceneReviewStatus) => {
    switch (status) {
      case 'approved':
        return 'Đã duyệt (Approved)';
      case 'needs_regen':
        return 'Cần dựng lại (Needs Regen)';
      case 'pending_review':
        return 'Chờ Admin duyệt';
      default:
        return 'Bản nháp';
    }
  };

  const activeModalScene =
    cinemaModalSceneIndex !== null ? scenes[cinemaModalSceneIndex] : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Parallel Pipeline Control Header */}
      <section
        aria-label="Điều khiển tiến độ sản xuất đa luồng"
        className="bg-[#111726] border border-slate-800 rounded-lg p-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2
              className="text-base font-semibold text-slate-100"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Trạm Dựng Đa Luồng Google Flow (Imagen 3 · Veo 2 · Lyria Audio)
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-1 font-mono tabular-nums">
              <span>
                Đã kết xuất: {progress.generatedScenes}/{progress.totalScenes}{' '}
                cảnh
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">
                Đã duyệt: {progress.approvedScenes}/{progress.totalScenes} cảnh
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400">
                Cần tạo lại: {progress.needsRegenCount} cảnh
              </span>
              <span aria-hidden="true">·</span>
              <span>Tổng thời lượng: {progress.totalDurationSec}s</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onRunParallelAll}
              disabled={isGeneratingIds.length > 0 || scenes.length === 0}
              className="px-3.5 py-2 border border-slate-700 hover:border-slate-500 bg-slate-800/70 text-slate-100 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Dựng đồng thời toàn bộ ({scenes.length} cảnh)</span>
            </button>

            <button
              type="button"
              onClick={() => onRegenerateSelected(selectedSceneIds)}
              disabled={
                selectedSceneIds.length === 0 || isGeneratingIds.length > 0
              }
              className="px-3.5 py-2 border border-amber-500/60 hover:border-amber-400 bg-amber-500/15 text-amber-300 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:border-slate-800 disabled:bg-[#0A0E17] disabled:text-slate-500"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Dựng lại cảnh đã chọn ({selectedSceneIds.length})</span>
            </button>

            <button
              type="button"
              onClick={onApproveAllAndProceed}
              disabled={isGeneratingIds.length > 0 || scenes.length === 0}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <span>Duyệt tất cả &amp; Ghép cảnh Hậu kỳ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar & Active Scene Preview Toggle */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
          <div
            role="group"
            aria-label="Lọc phân cảnh theo trạng thái duyệt"
            className="flex items-center gap-1 p-1 bg-[#0A0E17] border border-slate-800 rounded-lg"
          >
            {(
              [
                { id: 'all', label: `Tất cả (${scenes.length})` },
                {
                  id: 'pending_review',
                  label: `Chờ duyệt (${scenes.filter((s) => s.reviewStatus === 'pending_review').length})`,
                },
                {
                  id: 'approved',
                  label: `Đã duyệt (${progress.approvedScenes})`,
                },
                {
                  id: 'needs_regen',
                  label: `Cần dựng lại (${progress.needsRegenCount})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-slate-800 text-slate-100 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400">
            Mẹo: Nhấn <strong className="text-amber-300">Xem cảnh</strong> trên
            từng phân cảnh để mở trình phát kiểm duyệt (có chuyển động máy quay,
            phụ đề và giọng đọc AI).
          </div>
        </div>
      </section>

      {scenes.length === 0 ? (
        <div className="bg-[#111726] border border-slate-800 rounded-lg p-12 text-center">
          <p className="text-sm text-slate-300 font-medium">
            Chưa có phân cảnh nào trong trạm dựng.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Hãy quay lại bước <strong>01. Kịch bản</strong>, nhập kịch bản và
            bấm <strong>Phân tích &amp; Chia cảnh</strong> để bắt đầu.
          </p>
        </div>
      ) : (
        /* Main Split: Scene Review Cards + Interactive Single-Scene Monitor */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Scene Generation & Review Cards */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {filteredScenes.map((scene) => {
              const isGenerating = isGeneratingIds.includes(scene.id);
              const prog = agentProgressMap[scene.id] || {
                image: 100,
                video: 100,
                audio: 100,
              };
              const isPromptOpen = editingPromptSceneId === scene.id;
              const currentTakeObj =
                scene.takes.find((t) => t.takeNumber === scene.currentTake) ||
                scene.takes[scene.takes.length - 1];
              const isActiveInMonitor =
                scenes[previewSceneIndex]?.id === scene.id;

              return (
                <article
                  key={scene.id}
                  className={`bg-[#111726] border rounded-lg p-5 flex flex-col gap-4 transition-colors ${
                    isActiveInMonitor
                      ? 'border-amber-500/70'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Top Row: Checkbox, Title, Take selector, Review status */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id={`select-${scene.id}`}
                        checked={scene.selectedForBatch}
                        onChange={() => onToggleSelectScene(scene.id)}
                        aria-label={`Chọn Cảnh ${scene.sceneNumber} để dựng lại`}
                        className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label
                            htmlFor={`select-${scene.id}`}
                            className="text-sm font-semibold text-slate-100 cursor-pointer"
                          >
                            0{scene.sceneNumber}. {scene.title}
                          </label>
                          <span className="text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs font-mono text-amber-400 tabular-nums">
                            Take v{scene.currentTake}
                          </span>
                          <span className="text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs font-mono text-slate-400 tabular-nums">
                            Seed #{currentTakeObj?.seed || 104337}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          {scene.continuityState.characterAnchorLock}
                        </p>
                      </div>
                    </div>

                    {/* Unboxed Status Indicator */}
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {scene.reviewStatus === 'approved' && (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {getReviewStatusLabel(scene.reviewStatus)}
                          </span>
                        </span>
                      )}
                      {scene.reviewStatus === 'needs_regen' && (
                        <span className="text-rose-400 flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          <span>
                            {getReviewStatusLabel(scene.reviewStatus)}
                          </span>
                        </span>
                      )}
                      {scene.reviewStatus === 'pending_review' && (
                        <span className="text-amber-300 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {getReviewStatusLabel(scene.reviewStatus)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Keyframe Thumbnail + 3 Parallel Agent Tracks */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    {/* Thumbnail Preview */}
                    <div
                      onClick={() => handleWatchScene(scene.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleWatchScene(scene.id);
                        }
                      }}
                      className="sm:col-span-5 relative aspect-video rounded-md overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-400 group cursor-pointer transition-colors"
                    >
                      {upgradedVideos[scene.id] || scene.videoClipUrl ? (
                        <video
                          src={upgradedVideos[scene.id] || scene.videoClipUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (upgradedKeyframes[scene.id] || scene.keyframeUrl).startsWith('data:') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={upgradedKeyframes[scene.id] || scene.keyframeUrl}
                          alt={`Keyframe Cảnh ${scene.sceneNumber}: ${scene.title}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Image
                          src={upgradedKeyframes[scene.id] || scene.keyframeUrl}
                          alt={`Keyframe Cảnh ${scene.sceneNumber}: ${scene.title}`}
                          fill
                          sizes="(max-width: 640px) 100vw, 320px"
                          referrerPolicy="no-referrer"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      {(upgradedVideos[scene.id] || scene.videoClipUrl) && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 text-[10px] font-mono pointer-events-none">
                          MP4 ĐỘNG
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex items-end justify-between p-2.5">
                        <span className="text-[11px] font-mono text-slate-200 tabular-nums">
                          {scene.postEdit.durationSec}s · 24fps
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWatchScene(scene.id);
                          }}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-[11px] rounded flex items-center gap-1 transition-colors shadow-md"
                        >
                          <Play className="w-3 h-3 fill-slate-950" />
                          <span>Xem cảnh</span>
                        </button>
                      </div>
                    </div>

                    {/* 3 Parallel Agent Progress Bars */}
                    <div className="sm:col-span-7 flex flex-col gap-2.5 bg-[#0A0E17] border border-slate-800/90 rounded-md p-3">
                      {/* Agent 1: Image */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                            <span>Imagen 3 Keyframe Agent</span>
                          </span>
                          <span className="font-mono tabular-nums text-slate-400">
                            {isGenerating ? `${prog.image}%` : '100% · Hoàn tất'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-400 transition-transform duration-150 origin-left"
                            style={{
                              transform: `scaleX(${(isGenerating ? prog.image : 100) / 100})`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Agent 2: Video */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-amber-400" />
                            <span>Google Flow Veo 2 Video Agent</span>
                          </span>
                          <span className="font-mono tabular-nums text-slate-400">
                            {isGenerating ? `${prog.video}%` : '100% · Hoàn tất'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 transition-transform duration-150 origin-left"
                            style={{
                              transform: `scaleX(${(isGenerating ? prog.video : 100) / 100})`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Agent 3: Audio */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              Gemini TTS Voiceover{' '}
                              {scene.voiceoverAudioUrl ? '(WAV Ready)' : 'Agent'}
                            </span>
                          </span>
                          <span className="font-mono tabular-nums text-slate-400">
                            {isGenerating ? `${prog.audio}%` : '100% · Hoàn tất'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 transition-transform duration-150 origin-left"
                            style={{
                              transform: `scaleX(${(isGenerating ? prog.audio : 100) / 100})`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Action Beat + Spoken Dialogue Line Preview */}
                      <div className="pt-1.5 border-t border-slate-800/80 flex flex-col gap-1">
                        <p className="text-[11px] text-slate-400 truncate">
                          <span className="text-sky-400 font-medium">
                            Hành động:{' '}
                          </span>
                          {scene.narrativeBeat}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-slate-200 truncate">
                            <span className="text-emerald-400 font-medium">
                              Thoại diễn xuất:{' '}
                            </span>
                            &ldquo;{getSceneDisplayDialogue(scene)}&rdquo;
                          </p>
                          {scene.voiceoverAudioUrl && (
                            <a
                              href={scene.voiceoverAudioUrl}
                              download={`voiceover-canh-0${scene.sceneNumber}-take-v${scene.currentTake}.wav`}
                              className="px-2 py-0.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-[10px] font-mono rounded shrink-0 transition-colors"
                            >
                              Tải .wav
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Take Switcher & Camera Note */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span>Lịch sử Take:</span>
                      <div className="flex items-center gap-1">
                        {scene.takes.map((t) => (
                          <button
                            key={t.takeNumber}
                            type="button"
                            onClick={() => onSelectTake(scene.id, t.takeNumber)}
                            className={`px-2 py-0.5 text-xs font-mono tabular-nums rounded transition-colors ${
                              scene.currentTake === t.takeNumber
                                ? 'bg-amber-500 text-slate-950 font-semibold'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            v{t.takeNumber}
                          </button>
                        ))}
                      </div>
                    </div>

                    <span className="font-mono text-[11px] text-slate-400">
                      Camera: {currentTakeObj?.cameraMotion}
                    </span>
                  </div>

                  {/* Optional Inline Prompt Editor for Selective Regeneration */}
                  {isPromptOpen && (
                    <div className="p-3.5 bg-[#0A0E17] border border-slate-800 rounded-md flex flex-col gap-2.5">
                      <label
                        htmlFor={`regen-prompt-${scene.id}`}
                        className="text-xs font-medium text-slate-300"
                      >
                        Chỉnh sửa Video Prompt trước khi dựng lại riêng Cảnh{' '}
                        {scene.sceneNumber}:
                      </label>
                      <textarea
                        id={`regen-prompt-${scene.id}`}
                        rows={3}
                        value={draftVideoPrompts[scene.id] ?? scene.videoPrompt}
                        onChange={(e) =>
                          setDraftVideoPrompts((prev) => ({
                            ...prev,
                            [scene.id]: e.target.value,
                          }))
                        }
                        className="w-full bg-[#111726] border border-slate-700 rounded p-2 text-xs font-mono text-slate-200"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPromptSceneId(null)}
                          className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
                        >
                          Đóng
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const customPrompt =
                              draftVideoPrompts[scene.id] ?? scene.videoPrompt;
                            onRegenerateSelected([scene.id], {
                              [scene.id]: { videoPrompt: customPrompt },
                            });
                            setEditingPromptSceneId(null);
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Chạy tạo lại Cảnh {scene.sceneNumber}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Footer: Approve / Needs Regen / Single Scene Regen */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onSetSceneReviewStatus(scene.id, 'approved')
                        }
                        disabled={isGenerating}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                          scene.reviewStatus === 'approved'
                            ? 'bg-emerald-500 text-slate-950 font-semibold'
                            : 'border border-slate-700 hover:border-emerald-500/60 text-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Duyệt cảnh {scene.sceneNumber}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onSetSceneReviewStatus(scene.id, 'needs_regen')
                        }
                        disabled={isGenerating}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                          scene.reviewStatus === 'needs_regen'
                            ? 'bg-rose-500/20 border border-rose-500 text-rose-300'
                            : 'border border-slate-700 hover:border-rose-500/60 text-slate-300'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Không ưng / Cần dựng lại</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingPromptSceneId(
                            isPromptOpen ? null : scene.id
                          )
                        }
                        className="px-2.5 py-1.5 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs rounded-md flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Sửa Prompt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRegenerateSelected([scene.id])}
                        disabled={isGenerating}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`}
                        />
                        <span>
                          {isGenerating
                            ? 'Đang dựng lại...'
                            : `Dựng lại Cảnh ${scene.sceneNumber}`}
                        </span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Right 5 Cols: Sticky Scene Monitor & Continuity Verification */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 flex flex-col gap-4">
            <div className="bg-[#111726] border border-slate-800 rounded-lg p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h3
                    className="text-sm font-semibold text-slate-100"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Màn Hình Kiểm Duyệt Phân Cảnh (Preview Monitor)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Xem trước chuyển động máy quay, phụ đề và âm thanh của phân
                    cảnh đang chọn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPlayTrigger((t) => t + 1);
                    setCinemaModalSceneIndex(previewSceneIndex);
                  }}
                  title="Phóng to màn hình kiểm duyệt"
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium rounded flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Phóng to</span>
                </button>
              </div>

              {/* Scene Selector Buttons for Monitor */}
              <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
                {scenes.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setPreviewSceneIndex(idx);
                      setPlayTrigger((t) => t + 1);
                    }}
                    className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded transition-colors whitespace-nowrap shrink-0 ${
                      previewSceneIndex === idx
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-[#0A0E17] border border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    Cảnh 0{s.sceneNumber} (v{s.currentTake})
                  </button>
                ))}
              </div>

              <FlowCanvasPlayer
                scenes={scenes}
                activeSceneIndex={previewSceneIndex}
                mode="single"
                autoPlayTrigger={playTrigger}
                onSceneKeyframeUpgraded={(sceneId, keyframeUrl) =>
                  setUpgradedKeyframes((prev) => ({
                    ...prev,
                    [sceneId]: keyframeUrl,
                  }))
                }
                onSceneVideoUpgraded={(sceneId, videoClipUrl) =>
                  setUpgradedVideos((prev) => ({
                    ...prev,
                    [sceneId]: videoClipUrl,
                  }))
                }
              />

              {scenes[previewSceneIndex] && (
                <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-slate-400 font-mono">
                    <span>
                      Đang chọn: Cảnh 0{scenes[previewSceneIndex].sceneNumber} —{' '}
                      {scenes[previewSceneIndex].title}
                    </span>
                    <span>Take v{scenes[previewSceneIndex].currentTake}</span>
                  </div>
                  <p className="text-slate-200">
                    <strong className="text-slate-400">Hành động:</strong>{' '}
                    {scenes[previewSceneIndex].narrativeBeat}
                  </p>
                  <p className="text-slate-200">
                    <strong className="text-slate-400">Lời thoại diễn xuất:</strong>{' '}
                    &ldquo;{getSceneDisplayDialogue(scenes[previewSceneIndex])}&rdquo;
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 break-all">
                    {scenes[previewSceneIndex].videoPrompt}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cinema Fullscreen Preview Modal when clicking "Xem cảnh" */}
      {activeModalScene && cinemaModalSceneIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Trình phát kiểm duyệt Cảnh 0${activeModalScene.sceneNumber}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="bg-[#111726] border border-slate-700 rounded-lg max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4 bg-[#0D121D]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-mono font-bold text-xs rounded shrink-0">
                  CẢNH 0{activeModalScene.sceneNumber}
                </span>
                <h3 className="text-sm sm:text-base font-semibold text-slate-100 truncate">
                  {activeModalScene.title}
                </h3>
                <span className="hidden sm:inline text-xs font-mono text-slate-400">
                  · Take v{activeModalScene.currentTake} ·{' '}
                  {activeModalScene.postEdit.durationSec}s
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={cinemaModalSceneIndex <= 0}
                  onClick={() => {
                    const prev = Math.max(0, cinemaModalSceneIndex - 1);
                    setCinemaModalSceneIndex(prev);
                    setPreviewSceneIndex(prev);
                    setPlayTrigger((t) => t + 1);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs rounded flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Cảnh trước</span>
                </button>
                <button
                  type="button"
                  disabled={cinemaModalSceneIndex >= scenes.length - 1}
                  onClick={() => {
                    const next = Math.min(
                      scenes.length - 1,
                      cinemaModalSceneIndex + 1
                    );
                    setCinemaModalSceneIndex(next);
                    setPreviewSceneIndex(next);
                    setPlayTrigger((t) => t + 1);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs rounded flex items-center gap-1"
                >
                  <span>Cảnh tiếp</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCinemaModalSceneIndex(null)}
                  aria-label="Đóng cửa sổ xem cảnh"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Video Player Body */}
            <div className="p-5 flex flex-col gap-4">
              <FlowCanvasPlayer
                scenes={scenes}
                activeSceneIndex={cinemaModalSceneIndex}
                mode="single"
                autoPlayTrigger={playTrigger}
                onSceneKeyframeUpgraded={(sceneId, keyframeUrl) =>
                  setUpgradedKeyframes((prev) => ({
                    ...prev,
                    [sceneId]: keyframeUrl,
                  }))
                }
                onSceneVideoUpgraded={(sceneId, videoClipUrl) =>
                  setUpgradedVideos((prev) => ({
                    ...prev,
                    [sceneId]: videoClipUrl,
                  }))
                }
              />

              {/* Scene Info & Quick Approval Bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#0A0E17] border border-slate-800 rounded-md p-3.5">
                <div className="md:col-span-8 flex flex-col gap-1 text-xs">
                  <p className="text-slate-200">
                    <strong className="text-amber-400">
                      Hành động &amp; Góc máy:
                    </strong>{' '}
                    {activeModalScene.narrativeBeat}
                  </p>
                  <p className="text-slate-300">
                    <strong className="text-emerald-400">
                      Lời thoại diễn xuất / Phụ đề:
                    </strong>{' '}
                    &ldquo;{getSceneDisplayDialogue(activeModalScene)}&rdquo;
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 truncate">
                    {activeModalScene.continuityState.characterAnchorLock}
                  </p>
                </div>

                <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onSetSceneReviewStatus(activeModalScene.id, 'approved')
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                      activeModalScene.reviewStatus === 'approved'
                        ? 'bg-emerald-500 text-slate-950 font-semibold'
                        : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {activeModalScene.reviewStatus === 'approved'
                        ? 'Đã duyệt cảnh này'
                        : 'Duyệt cảnh này'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCinemaModalSceneIndex(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
