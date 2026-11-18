'use client';

import React, { useState, useRef } from 'react';
import {
  Scissors,
  Sliders,
  Download,
  FileCode,
  Subtitles,
  Sparkles,
  Volume2,
  BookmarkPlus,
  Check,
  Music,
  Waves,
  Play,
  Square,
  Search,
} from 'lucide-react';
import {
  SceneNode,
  ScenePostEdit,
  TransitionType,
  ColorGradePreset,
  AudioLibraryAsset,
  ROYALTY_FREE_AUDIO_LIBRARY,
  exportTimelineToSRT,
  exportTimelineToEDL,
  computeProductionProgress,
} from '@/lib/flow-engine';
import FlowCanvasPlayer from './FlowCanvasPlayer';

interface PostProductionEditorViewProps {
  projectTitle: string;
  scenes: SceneNode[];
  onUpdateScenePostEdit: (
    sceneId: string,
    patch: Partial<ScenePostEdit>
  ) => void;
  onAssignAudioAsset: (
    targetSceneId: string | 'all',
    asset: AudioLibraryAsset
  ) => void;
  onSaveVersionSnapshot: (label: string, notes: string) => void;
  onExportJsonBundle: () => void;
}

export default function PostProductionEditorView({
  projectTitle,
  scenes,
  onUpdateScenePostEdit,
  onAssignAudioAsset,
  onSaveVersionSnapshot,
  onExportJsonBundle,
}: PostProductionEditorViewProps) {
  const [selectedSceneIdx, setSelectedSceneIdx] = useState(0);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  // Royalty-Free Audio Library state
  const [audioCategoryFilter, setAudioCategoryFilter] = useState<
    'all' | 'bgm' | 'sfx'
  >('all');
  const [audioSearchQuery, setAudioSearchQuery] = useState('');
  const [previewingAssetId, setPreviewingAssetId] = useState<string | null>(
    null
  );
  const audioCtxRef = useRef<AudioContext | null>(null);

  const activeScene = scenes[selectedSceneIdx] || scenes[0];
  const progress = computeProductionProgress(scenes);

  const triggerDownload = (
    content: string,
    filename: string,
    mimeType: string,
    label: string
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setExportFeedback(`Đã xuất file ${label} (${filename}) thành công.`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  const handleExportSRT = () => {
    const srtContent = exportTimelineToSRT(scenes);
    triggerDownload(
      srtContent,
      'flowstudio-subtitles.srt',
      'text/plain;charset=utf-8',
      'Phụ đề SRT'
    );
  };

  const handleExportEDL = () => {
    const edlContent = exportTimelineToEDL(projectTitle, scenes);
    triggerDownload(
      edlContent,
      'flowstudio-timeline.edl',
      'text/plain;charset=utf-8',
      'Timeline CMX3600 EDL'
    );
  };

  const handleExportJSON = () => {
    onExportJsonBundle();
    setExportFeedback('Đã xuất gói dự án Google Flow (.json) đầy đủ.');
    setTimeout(() => setExportFeedback(null), 4000);
  };

  const handleQuickSaveVersion = (e: React.FormEvent) => {
    e.preventDefault();
    const label =
      snapshotLabel.trim() ||
      `Bản ghép hậu kỳ (${progress.totalDurationSec}s)`;
    onSaveVersionSnapshot(
      label,
      `Tinh chỉnh hậu kỳ ${scenes.length} cảnh, tổng thời lượng ${progress.totalDurationSec}s.`
    );
    setSnapshotLabel('');
    setShowSnapshotModal(false);
    setExportFeedback(`Đã lưu phiên bản "${label}" vào lịch sử đối chiếu.`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  const handlePreviewAudioAsset = (asset: AudioLibraryAsset) => {
    if (previewingAssetId === asset.id) {
      setPreviewingAssetId(null);
      return;
    }
    setPreviewingAssetId(asset.id);
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const now = ctx.currentTime;
        const { baseFreq, chordRatios, waveform } = asset.synthProfile;

        chordRatios.forEach((ratio, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = waveform;
          const startOffset =
            asset.category === 'sfx' ? idx * 0.08 : idx * 0.14;
          const noteDur = asset.category === 'sfx' ? 0.45 : 0.95;
          osc.frequency.setValueAtTime(baseFreq * ratio, now + startOffset);
          if (asset.category === 'sfx') {
            osc.frequency.exponentialRampToValueAtTime(
              baseFreq * ratio * 1.35,
              now + startOffset + noteDur
            );
          }
          gain.gain.setValueAtTime(0.001, now + startOffset);
          gain.gain.exponentialRampToValueAtTime(
            0.045,
            now + startOffset + 0.05
          );
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + startOffset + noteDur
          );
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + startOffset);
          osc.stop(now + startOffset + noteDur + 0.02);
        });
      }
    } catch {
      // Ignore audio synthesis errors in restricted environments
    }
    setTimeout(() => {
      setPreviewingAssetId((prev) => (prev === asset.id ? null : prev));
    }, 1100);
  };

  const filteredAudioAssets = ROYALTY_FREE_AUDIO_LIBRARY.filter((asset) => {
    const matchesCategory =
      audioCategoryFilter === 'all' || asset.category === audioCategoryFilter;
    const q = audioSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      asset.title.toLowerCase().includes(q) ||
      asset.mood.toLowerCase().includes(q) ||
      asset.genreOrType.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  if (!activeScene) {
    return (
      <div className="p-12 text-center bg-[#111726] border border-slate-800 rounded-lg">
        <p className="text-sm text-slate-400">
          Chưa có phân cảnh nào để chỉnh sửa hậu kỳ.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar: Master Assembly Status & Instant Project Exporters */}
      <section
        aria-label="Thanh công cụ xuất file dự án và lưu phiên bản hậu kỳ"
        className="bg-[#111726] border border-slate-800 rounded-lg p-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2
              className="text-base font-semibold text-slate-100"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Bàn Dựng Hậu Kỳ Trực Tuyến &amp; Ghép Cảnh Hoàn Chỉnh (Web NLE)
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-1 font-mono tabular-nums">
              <span>Tổng số clip: {scenes.length} cảnh</span>
              <span aria-hidden="true">·</span>
              <span>Thời lượng Master: {progress.totalDurationSec}s</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">
                Đã duyệt: {progress.approvedScenes}/{progress.totalScenes} cảnh
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSnapshotModal((v) => !v)}
              className="px-3 py-2 border border-slate-700 hover:border-slate-500 bg-slate-800/70 text-slate-100 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Lưu thành Phiên bản mới</span>
            </button>

            <button
              type="button"
              onClick={handleExportSRT}
              className="px-3 py-2 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Subtitles className="w-3.5 h-3.5 text-sky-400" />
              <span>Xuất Phụ đề (.srt)</span>
            </button>

            <button
              type="button"
              onClick={handleExportEDL}
              className="px-3 py-2 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Xuất Timeline (.edl)</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất File Dự Án Cuối Cùng (.json)</span>
            </button>
          </div>
        </div>

        {showSnapshotModal && (
          <form
            onSubmit={handleQuickSaveVersion}
            className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3"
          >
            <label htmlFor="nle-version-label" className="text-xs text-slate-300">
              Tên phiên bản đối chiếu:
            </label>
            <input
              id="nle-version-label"
              type="text"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              placeholder="VD: Bản duyệt Master gửi khách hàng"
              className="flex-1 min-w-[220px] bg-[#0A0E17] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded"
            >
              Xác nhận Lưu Phiên Bản
            </button>
          </form>
        )}

        {exportFeedback && (
          <div
            role="status"
            className="mt-3 flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-md px-3 py-2"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{exportFeedback}</span>
          </div>
        )}
      </section>

      {/* Main NLE Grid: Master Player (Left 7) + Clip Inspector (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 flex flex-col gap-4">
          <FlowCanvasPlayer
            scenes={scenes}
            activeSceneIndex={selectedSceneIdx}
            mode="master"
            onSceneChange={(idx) => setSelectedSceneIdx(idx)}
          />
        </div>

        {/* Right 5 Cols: Clip Post-Production Inspector */}
        <section
          aria-labelledby="clip-inspector-heading"
          className="lg:col-span-5 bg-[#111726] border border-slate-800 rounded-lg p-5 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3
                id="clip-inspector-heading"
                className="text-sm font-semibold text-slate-100 flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>
                  Hậu kỳ Clip: Cảnh 0{activeScene.sceneNumber} (
                  {activeScene.title})
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                Take v{activeScene.currentTake} · Thời lượng thực:{' '}
                {(
                  (activeScene.postEdit.trimEndSec -
                    activeScene.postEdit.trimStartSec) /
                  activeScene.postEdit.playbackSpeed
                ).toFixed(1)}
                s
              </p>
            </div>
          </div>

          {/* 1. Trim In / Duration & Speed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="clip-duration-range"
                className="flex items-center justify-between text-xs text-slate-300 mb-1.5"
              >
                <span className="flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5 text-amber-400" />
                  <span>Độ dài cảnh (Trim Out)</span>
                </span>
                <span className="font-mono tabular-nums text-amber-400">
                  {activeScene.postEdit.trimEndSec}s
                </span>
              </label>
              <input
                id="clip-duration-range"
                type="range"
                min={2}
                max={10}
                step={0.5}
                value={activeScene.postEdit.trimEndSec}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateScenePostEdit(activeScene.id, {
                    trimEndSec: val,
                    durationSec: val - activeScene.postEdit.trimStartSec,
                  });
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div>
              <span className="block text-xs text-slate-300 mb-1.5">
                Tốc độ phát (Speed)
              </span>
              <div className="flex items-center gap-1.5">
                {([0.75, 1, 1.25] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() =>
                      onUpdateScenePostEdit(activeScene.id, {
                        playbackSpeed: spd,
                      })
                    }
                    className={`flex-1 py-1.5 text-xs font-mono tabular-nums rounded transition-colors ${
                      activeScene.postEdit.playbackSpeed === spd
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-[#0A0E17] border border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Transition & Color Grading LUT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="clip-transition-select"
                className="block text-xs text-slate-300 mb-1.5"
              >
                Hiệu ứng chuyển cảnh (Transition)
              </label>
              <select
                id="clip-transition-select"
                value={activeScene.postEdit.transition}
                onChange={(e) =>
                  onUpdateScenePostEdit(activeScene.id, {
                    transition: e.target.value as TransitionType,
                  })
                }
                className="w-full bg-[#0A0E17] border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="cut">Cut (Chuyển trực tiếp)</option>
                <option value="cross-dissolve">
                  Cross Dissolve (Hòa mờ nối cảnh)
                </option>
                <option value="dip-to-black">
                  Dip to Black (Chuyển tối điện ảnh)
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="clip-color-select"
                className="block text-xs text-slate-300 mb-1.5"
              >
                Bảng màu điện ảnh (Color LUT)
              </label>
              <select
                id="clip-color-select"
                value={activeScene.postEdit.colorGrade}
                onChange={(e) =>
                  onUpdateScenePostEdit(activeScene.id, {
                    colorGrade: e.target.value as ColorGradePreset,
                  })
                }
                className="w-full bg-[#0A0E17] border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="cinematic-warm">
                  Cinematic Warm (Vàng nắng 35mm)
                </option>
                <option value="anamorphic-teal">
                  Anamorphic Teal &amp; Orange
                </option>
                <option value="neutral-rec709">
                  Neutral Rec.709 (Chuẩn truyền hình)
                </option>
                <option value="high-contrast-doc">
                  High-Contrast Documentary
                </option>
              </select>
            </div>
          </div>

          {/* 3. Assigned BGM & SFX Summary + Audio Mixer */}
          <div className="bg-[#0A0E17] border border-slate-800/90 rounded-md p-3 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-amber-400" />
                <span>Nhạc nền BGM:</span>
              </span>
              <span className="text-slate-200 font-medium truncate">
                {activeScene.postEdit.bgmTrackTitle}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-sky-400" />
                <span>Hiệu ứng SFX:</span>
              </span>
              <span className="text-slate-200 font-medium truncate">
                {activeScene.postEdit.sfxTrackTitle || 'Chưa gán SFX'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label
                htmlFor="vo-volume-slider"
                className="flex items-center justify-between text-xs text-slate-300 mb-1.5"
              >
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Thoại (TTS)</span>
                </span>
                <span className="font-mono tabular-nums text-slate-400">
                  {activeScene.postEdit.voiceoverVolume}%
                </span>
              </label>
              <input
                id="vo-volume-slider"
                type="range"
                min={0}
                max={100}
                value={activeScene.postEdit.voiceoverVolume}
                onChange={(e) =>
                  onUpdateScenePostEdit(activeScene.id, {
                    voiceoverVolume: Number(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            <div>
              <label
                htmlFor="bgm-volume-slider"
                className="flex items-center justify-between text-xs text-slate-300 mb-1.5"
              >
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nhạc BGM</span>
                </span>
                <span className="font-mono tabular-nums text-slate-400">
                  {activeScene.postEdit.bgmVolume}%
                </span>
              </label>
              <input
                id="bgm-volume-slider"
                type="range"
                min={0}
                max={100}
                value={activeScene.postEdit.bgmVolume}
                onChange={(e) =>
                  onUpdateScenePostEdit(activeScene.id, {
                    bgmVolume: Number(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div>
              <label
                htmlFor="sfx-volume-slider"
                className="flex items-center justify-between text-xs text-slate-300 mb-1.5"
              >
                <span className="flex items-center gap-1">
                  <Waves className="w-3.5 h-3.5 text-sky-400" />
                  <span>Hiệu ứng SFX</span>
                </span>
                <span className="font-mono tabular-nums text-slate-400">
                  {activeScene.postEdit.sfxVolume}%
                </span>
              </label>
              <input
                id="sfx-volume-slider"
                type="range"
                min={0}
                max={100}
                value={activeScene.postEdit.sfxVolume}
                onChange={(e) =>
                  onUpdateScenePostEdit(activeScene.id, {
                    sfxVolume: Number(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>
          </div>

          {/* 4. Subtitle Overlay Editor */}
          <div>
            <label
              htmlFor="clip-subtitle-input"
              className="block text-xs text-slate-300 mb-1.5"
            >
              Phụ đề hiển thị trên video (Burn-in Subtitle)
            </label>
            <textarea
              id="clip-subtitle-input"
              rows={2}
              value={activeScene.postEdit.subtitleText}
              onChange={(e) =>
                onUpdateScenePostEdit(activeScene.id, {
                  subtitleText: e.target.value,
                })
              }
              className="w-full bg-[#0A0E17] border border-slate-800 rounded p-2.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </section>
      </div>

      {/* Royalty-Free Background Music & Sound Effects Library */}
      <section
        aria-labelledby="royalty-free-audio-heading"
        className="bg-[#111726] border border-slate-800 rounded-lg p-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3
              id="royalty-free-audio-heading"
              className="text-base font-semibold text-slate-100 flex items-center gap-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <Music className="w-4 h-4 text-amber-400" />
              <span>
                Thư Viện Nhạc Nền (BGM) &amp; Hiệu Ứng Âm Thanh (SFX) Bản Quyền Miễn Phí
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Nghe thử trực tiếp và gán nhạc nền hoặc hiệu ứng âm thanh vào Cảnh 0
              {activeScene.sceneNumber} đang chọn hoặc phủ toàn bộ dự án.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter Tabs */}
            <div
              role="group"
              aria-label="Lọc danh mục âm thanh"
              className="flex items-center gap-1 p-1 bg-[#0A0E17] border border-slate-800 rounded-lg"
            >
              {(
                [
                  { id: 'all', label: 'Tất cả (8)' },
                  { id: 'bgm', label: 'Nhạc nền BGM (4)' },
                  { id: 'sfx', label: 'Hiệu ứng SFX (4)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAudioCategoryFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    audioCategoryFilter === tab.id
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Tìm kiếm nhạc nền hoặc hiệu ứng âm thanh"
                value={audioSearchQuery}
                onChange={(e) => setAudioSearchQuery(e.target.value)}
                placeholder="Tìm theo mood, thể loại..."
                className="bg-[#0A0E17] border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {filteredAudioAssets.map((asset) => {
            const isPreviewing = previewingAssetId === asset.id;
            const isAssignedToCurrent =
              asset.category === 'bgm'
                ? activeScene.postEdit.bgmTrackId === asset.id
                : activeScene.postEdit.sfxTrackId === asset.id;

            return (
              <div
                key={asset.id}
                className={`p-3.5 rounded-md border flex flex-col justify-between gap-3 transition-colors ${
                  isAssignedToCurrent
                    ? 'bg-amber-500/10 border-amber-500/60'
                    : 'bg-[#0A0E17] border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase text-amber-400">
                        {asset.category === 'bgm' ? 'BGM' : 'SFX'}
                      </span>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <h4 className="text-sm font-semibold text-slate-100">
                        {asset.title}
                      </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-1 font-mono tabular-nums">
                      <span>{asset.genreOrType}</span>
                      <span aria-hidden="true">·</span>
                      <span>{asset.durationSec}s</span>
                      {asset.bpm && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{asset.bpm} BPM</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{asset.license}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Mood: {asset.mood}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePreviewAudioAsset(asset)}
                    aria-label={`Nghe thử ${asset.title}`}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    {isPreviewing ? (
                      <>
                        <Square className="w-3 h-3 text-amber-400" />
                        <span>Dừng</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-amber-400" />
                        <span>Nghe thử</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400">
                    {isAssignedToCurrent
                      ? `Đang dùng tại Cảnh 0${activeScene.sceneNumber}`
                      : 'Sẵn sàng chèn vào timeline'}
                  </span>

                  <div className="flex items-center gap-2">
                    {asset.category === 'bgm' && (
                      <button
                        type="button"
                        onClick={() => {
                          onAssignAudioAsset('all', asset);
                          setExportFeedback(
                            `Đã phủ nhạc nền "${asset.title}" cho toàn bộ ${scenes.length} phân cảnh.`
                          );
                          setTimeout(() => setExportFeedback(null), 3500);
                        }}
                        className="px-2.5 py-1 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs rounded transition-colors whitespace-nowrap shrink-0"
                      >
                        Phủ toàn dự án
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onAssignAudioAsset(activeScene.id, asset);
                        setExportFeedback(
                          `Đã gán ${asset.category.toUpperCase()} "${asset.title}" vào Cảnh 0${activeScene.sceneNumber}.`
                        );
                        setTimeout(() => setExportFeedback(null), 3500);
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        isAssignedToCurrent
                          ? 'bg-emerald-500 text-slate-950 font-semibold'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold'
                      }`}
                    >
                      {isAssignedToCurrent
                        ? `Đã gán Cảnh 0${activeScene.sceneNumber}`
                        : `Gán vào Cảnh 0${activeScene.sceneNumber}`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Multi-Track Timeline Strip */}
      <section
        aria-label="Timeline ghép cảnh đa lớp"
        className="bg-[#111726] border border-slate-800 rounded-lg p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            Multi-Track Timeline · Bấm vào phân cảnh để chỉnh sửa hậu kỳ
          </h3>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            Tổng thời lượng: {progress.totalDurationSec}s
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {/* Track V1: Video & Continuity */}
          <div className="grid grid-cols-12 gap-2 items-stretch">
            <div className="col-span-2 bg-[#0A0E17] border border-slate-800 rounded px-3 py-2.5 flex flex-col justify-center">
              <span className="text-xs font-mono font-semibold text-amber-400">
                V1 · VIDEO
              </span>
              <span className="text-[11px] text-slate-400">
                Google Flow Veo 2
              </span>
            </div>
            <div className="col-span-10 grid grid-cols-1 sm:grid-cols-4 gap-2">
              {scenes.map((scene, idx) => {
                const isSelected = idx === selectedSceneIdx;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => setSelectedSceneIdx(idx)}
                    className={`text-left p-2.5 rounded border transition-colors flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 text-slate-100'
                        : 'bg-[#0A0E17] border-slate-800 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs font-semibold">
                      <span className="truncate">
                        0{scene.sceneNumber}. {scene.location}
                      </span>
                      <span className="font-mono tabular-nums text-amber-400 shrink-0">
                        {scene.postEdit.trimEndSec}s
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center justify-between">
                      <span>Take v{scene.currentTake}</span>
                      <span>{scene.postEdit.transition}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Track A1: Voiceover & Royalty-Free BGM */}
          <div className="grid grid-cols-12 gap-2 items-stretch">
            <div className="col-span-2 bg-[#0A0E17] border border-slate-800 rounded px-3 py-2 flex flex-col justify-center">
              <span className="text-xs font-mono font-semibold text-emerald-400">
                A1 · BGM &amp; VO
              </span>
              <span className="text-[11px] text-slate-400">
                Royalty-Free Score
              </span>
            </div>
            <div className="col-span-10 grid grid-cols-1 sm:grid-cols-4 gap-2">
              {scenes.map((scene, idx) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => setSelectedSceneIdx(idx)}
                  className="text-left px-2.5 py-2 rounded bg-[#0A0E17] border border-slate-800/80 hover:border-slate-700 text-xs text-slate-300 truncate font-mono tabular-nums"
                >
                  {scene.postEdit.bgmTrackTitle} ({scene.postEdit.bgmVolume}%)
                </button>
              ))}
            </div>
          </div>

          {/* Track A2: Sound Effects (SFX) */}
          <div className="grid grid-cols-12 gap-2 items-stretch">
            <div className="col-span-2 bg-[#0A0E17] border border-slate-800 rounded px-3 py-2 flex flex-col justify-center">
              <span className="text-xs font-mono font-semibold text-sky-400">
                A2 · SFX
              </span>
              <span className="text-[11px] text-slate-400">
                Sound Effects
              </span>
            </div>
            <div className="col-span-10 grid grid-cols-1 sm:grid-cols-4 gap-2">
              {scenes.map((scene, idx) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => setSelectedSceneIdx(idx)}
                  className="text-left px-2.5 py-2 rounded bg-[#0A0E17] border border-slate-800/80 hover:border-slate-700 text-xs text-slate-300 truncate font-mono tabular-nums"
                >
                  {scene.postEdit.sfxTrackTitle || 'None'} (
                  {scene.postEdit.sfxVolume}%)
                </button>
              ))}
            </div>
          </div>

          {/* Track S1: Subtitles */}
          <div className="grid grid-cols-12 gap-2 items-stretch">
            <div className="col-span-2 bg-[#0A0E17] border border-slate-800 rounded px-3 py-2 flex flex-col justify-center">
              <span className="text-xs font-mono font-semibold text-amber-300">
                S1 · SUBTITLE
              </span>
              <span className="text-[11px] text-slate-400">Burn-in SRT</span>
            </div>
            <div className="col-span-10 grid grid-cols-1 sm:grid-cols-4 gap-2">
              {scenes.map((scene, idx) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => setSelectedSceneIdx(idx)}
                  className="text-left px-2.5 py-2 rounded bg-[#0A0E17] border border-slate-800/80 hover:border-slate-700 text-xs text-slate-400 truncate"
                >
                  &ldquo;{scene.postEdit.subtitleText}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
