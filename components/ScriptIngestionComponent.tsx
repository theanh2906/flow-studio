'use client';

import React, { useState, useRef } from 'react';
import {
  Wand2,
  Upload,
  FileText,
  Clock,
  User,
  MapPin,
  Camera,
  Play,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Filter,
  Download,
  Check,
  AlertCircle,
  Film,
} from 'lucide-react';
import {
  CharacterProfile,
  IngestedSceneNode,
  ScriptIngestionResult,
  parseRawScriptToStructuredTimeline,
  convertIngestedTimelineToSceneNodes,
  SceneNode,
} from '@/lib/flow-engine';

interface ScriptIngestionComponentProps {
  rawText: string;
  onRawTextChange: (text: string) => void;
  characters: CharacterProfile[];
  onApplyTimelineToScenes: (scenes: SceneNode[]) => void;
  initialTimeline?: IngestedSceneNode[];
}

export default function ScriptIngestionComponent({
  rawText,
  onRawTextChange,
  characters,
  onApplyTimelineToScenes,
  initialTimeline,
}: ScriptIngestionComponentProps) {
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestionResult, setIngestionResult] = useState<ScriptIngestionResult>(
    () => {
      if (initialTimeline && initialTimeline.length > 0) {
        return {
          detectedFormat: 'screenplay_fountain',
          totalWordCount: rawText.split(/\s+/).filter(Boolean).length,
          estimatedRuntimeSec: initialTimeline.reduce(
            (acc, s) => acc + s.suggestedDurationSec,
            0
          ),
          extractedCharacterList: characters.map((c) => ({
            name: c.name,
            count: 2,
            roleSuggestion: c.role,
          })),
          extractedLocationList: [
            { name: 'Studio Kiến Trúc', intExt: 'INT', sceneCount: 2 },
            { name: 'Sân Thượng Sky-Garden', intExt: 'EXT', sceneCount: 1 },
          ],
          agentTelemetry: {
            stepsCompleted: [
              'Nhận diện Sluglines & Cấu trúc phân cảnh',
              'Trích xuất Thực thể Nhân vật & Phục trang',
              'Bóc tách Địa điểm, Ánh sáng & Không khí',
              'Phân rã Chuỗi Hành động & Góc máy quay',
              'Tổng hợp Dòng thời gian tuần tự có cấu trúc',
            ],
            parserModel: 'Google Flow AI Ingestion Agent',
            parsingConfidencePercent: 99,
          },
          timeline: initialTimeline,
        };
      }
      return parseRawScriptToStructuredTimeline(rawText, characters);
    }
  );

  const [activeTelemetryStep, setActiveTelemetryStep] = useState<number | null>(
    null
  );
  const [characterFilter, setCharacterFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Run AI Ingestion Agent via Server API
  const handleRunAgentIngestion = async () => {
    if (!rawText.trim()) {
      showToast('Vui lòng nhập văn bản kịch bản thô để phân tích.');
      return;
    }

    setIsIngesting(true);
    setActiveTelemetryStep(0);

    const stepInterval = setInterval(() => {
      setActiveTelemetryStep((prev) => {
        if (prev === null) return 0;
        if (prev >= 4) {
          clearInterval(stepInterval);
          return 4;
        }
        return prev + 1;
      });
    }, 280);

    try {
      const res = await fetch('/api/flow/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, characters }),
      });
      const data = await res.json();
      clearInterval(stepInterval);
      setActiveTelemetryStep(null);

      if (data.result && Array.isArray(data.result.timeline)) {
        setIngestionResult(data.result);
        setSelectedSceneIndex(0);
        showToast(
          `AI Ingestion Agent đã phân rã thành công ${data.result.timeline.length} phân cảnh vào dòng thời gian có cấu trúc!`
        );
      } else {
        const fallback = parseRawScriptToStructuredTimeline(rawText, characters);
        setIngestionResult(fallback);
        showToast(
          `Đã phân rã ${fallback.timeline.length} phân cảnh vào dòng thời gian (Deterministic Parser).`
        );
      }
    } catch {
      clearInterval(stepInterval);
      setActiveTelemetryStep(null);
      const fallback = parseRawScriptToStructuredTimeline(rawText, characters);
      setIngestionResult(fallback);
      showToast(`Đã phân rã ${fallback.timeline.length} phân cảnh vào dòng thời gian.`);
    } finally {
      setIsIngesting(false);
    }
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        onRawTextChange(content);
        showToast(`Đã nạp file "${file.name}" (${content.length} ký tự).`);
      }
    };
    reader.readAsText(file);
  };

  // Sync Structured Timeline to Google Flow Pipeline
  const handleApplyToProductionPipeline = () => {
    const convertedScenes = convertIngestedTimelineToSceneNodes(
      ingestionResult.timeline,
      characters
    );
    onApplyTimelineToScenes(convertedScenes);
    showToast(
      `Đã đồng bộ ${convertedScenes.length} phân cảnh có cấu trúc vào toàn bộ quy trình dựng Google Flow!`
    );
  };

  // Export structured timeline to JSON
  const handleExportTimelineJson = () => {
    const blob = new Blob([JSON.stringify(ingestionResult, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowstudio-structured-timeline-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất file dòng thời gian phân cảnh có cấu trúc (.json).');
  };

  // Scene Operations: Shift Up / Down
  const handleMoveScene = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= ingestionResult.timeline.length) return;

    const newTimeline = [...ingestionResult.timeline];
    const temp = newTimeline[index];
    newTimeline[index] = newTimeline[targetIdx];
    newTimeline[targetIdx] = temp;

    // Re-index scene numbers
    const reindexed = newTimeline.map((s, idx) => ({
      ...s,
      sceneNumber: idx + 1,
    }));

    setIngestionResult((prev) => ({
      ...prev,
      timeline: reindexed,
    }));
    setSelectedSceneIndex(targetIdx);
  };

  // Quick edit scene metadata inline
  const handleUpdateSceneMeta = (
    sceneNumber: number,
    patch: Partial<IngestedSceneNode>
  ) => {
    setIngestionResult((prev) => ({
      ...prev,
      timeline: prev.timeline.map((s) =>
        s.sceneNumber === sceneNumber ? { ...s, ...patch } : s
      ),
    }));
  };

  // Add new scene beat to timeline
  const handleAddNewSceneBeat = () => {
    const newSceneNumber = ingestionResult.timeline.length + 1;
    const newScene: IngestedSceneNode = {
      sceneNumber: newSceneNumber,
      slugline: `INT. KHÔNG GIAN BỐI CẢNH 0${newSceneNumber} - BAN NGÀY`,
      location: {
        settingName: `Không gian bối cảnh 0${newSceneNumber}`,
        intExt: 'INT',
        timeOfDay: 'Ban ngày',
        environmentType: 'Kiến trúc hiện đại công nghệ cao',
        lightingMood: 'Studio diffused 4800K, ánh sáng tự nhiên',
        atmosphere: 'Chuyên nghiệp, hài hòa',
      },
      characters: [
        {
          name: characters[0]?.name || 'Linh',
          roleHint: characters[0]?.role || 'Nhân vật chính',
          wardrobe: characters[0]?.wardrobeLock || 'Trang phục chuẩn',
          emotionalState: 'Tập trung sáng tạo',
          prominence: 'lead',
        },
      ],
      actions: [
        {
          step: 1,
          description: `Nhân vật tương tác với thiết bị tại bối cảnh 0${newSceneNumber}.`,
          visualCue: 'Góc máy quay trung cảnh dolly mượt',
          cameraMovement: 'Dolly In chậm 24fps',
        },
      ],
      narrativeSummary: `Phân cảnh bổ sung số 0${newSceneNumber} phát triển mạch kịch bản.`,
      dialogueLines: [
        {
          speaker: characters[0]?.name || 'Linh',
          text: 'Giải pháp kết cấu số đã được tối ưu hóa toàn diện.',
          emotion: 'Truyền cảm',
        },
      ],
      suggestedDurationSec: 5,
      continuityHook: `Kế thừa logic từ phân cảnh liền trước.`,
      keyVisualPrompt: `[Google Flow] Cảnh 0${newSceneNumber}: Phân cảnh kiến trúc công nghệ cao.`,
    };

    setIngestionResult((prev) => ({
      ...prev,
      timeline: [...prev.timeline, newScene],
    }));
    setSelectedSceneIndex(ingestionResult.timeline.length);
    showToast(`Đã thêm Cảnh 0${newSceneNumber} vào dòng thời gian.`);
  };

  // Delete scene
  const handleDeleteScene = (sceneNumber: number) => {
    if (ingestionResult.timeline.length <= 1) {
      showToast('Kịch bản cần tối thiểu 1 phân cảnh.');
      return;
    }
    const filtered = ingestionResult.timeline
      .filter((s) => s.sceneNumber !== sceneNumber)
      .map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));

    setIngestionResult((prev) => ({
      ...prev,
      timeline: filtered,
    }));
    setSelectedSceneIndex(0);
    showToast(`Đã xóa Cảnh 0${sceneNumber} khỏi dòng thời gian.`);
  };

  // Filtered timeline view
  const filteredTimeline = ingestionResult.timeline.filter((scene) => {
    const matchChar =
      characterFilter === 'all' ||
      scene.characters.some((c) => c.name === characterFilter);
    const matchLoc =
      locationFilter === 'all' ||
      scene.location.settingName === locationFilter;
    return matchChar && matchLoc;
  });

  // Calculate cumulative timecodes
  const timecodedTimeline = React.useMemo(() => {
    let cursor = 0;
    const items = [];
    for (const s of ingestionResult.timeline) {
      const startSec = cursor;
      cursor += s.suggestedDurationSec;
      items.push({
        ...s,
        startSec,
        endSec: cursor,
      });
    }
    return items;
  }, [ingestionResult.timeline]);

  const activeScene =
    ingestionResult.timeline[selectedSceneIndex] ||
    ingestionResult.timeline[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner: Script Ingestion Agent Hero Header */}
      <section
        aria-label="Bảng tiếp nhận kịch bản thô và AI Agent phân tích dòng thời gian"
        className="bg-[#111726] border border-slate-800 rounded-lg p-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
                AI SCRIPT INGESTION AGENT
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Định dạng: {ingestionResult.detectedFormat.toUpperCase()}
              </span>
            </div>
            <h2
              className="text-base font-semibold text-slate-100 mt-0.5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Tiếp Nhận Kịch Bản Thô &amp; Phân Tách Dòng Thời Gian Có Cấu Trúc
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-1 font-mono tabular-nums">
              <span>{ingestionResult.timeline.length} Phân cảnh trích xuất</span>
              <span aria-hidden="true">·</span>
              <span>Tổng thời lượng: {ingestionResult.estimatedRuntimeSec}s</span>
              <span aria-hidden="true">·</span>
              <span>{ingestionResult.totalWordCount} Từ kịch bản</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">
                Độ tin cậy Agent: {ingestionResult.agentTelemetry.parsingConfidencePercent}%
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.fountain,.md,.screenplay"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 border border-slate-700 hover:border-slate-500 bg-slate-800/80 text-slate-200 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Nạp File (.txt / .fountain)</span>
            </button>

            <button
              type="button"
              onClick={handleExportTimelineJson}
              className="px-3 py-2 border border-slate-700 hover:border-slate-500 bg-slate-800/80 text-slate-200 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Xuất Timeline (.json)</span>
            </button>

            <button
              type="button"
              onClick={handleApplyToProductionPipeline}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-md flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Đồng Bộ Vào Pipeline Dựng Video</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Agent Telemetry Live Steps */}
        <div className="pt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Tiến trình phân tích AI Agent (Parser Telemetry Pipeline):</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Model: {ingestionResult.agentTelemetry.parserModel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {ingestionResult.agentTelemetry.stepsCompleted.map((step, idx) => {
              const isActive = activeTelemetryStep === idx;
              const isPast = activeTelemetryStep !== null && activeTelemetryStep > idx;
              const isDone = activeTelemetryStep === null;

              return (
                <div
                  key={step}
                  className={`p-2 rounded border text-[11px] leading-tight flex items-start gap-1.5 transition-colors ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 animate-pulse'
                      : isPast || isDone
                        ? 'bg-[#0A0E17] border-slate-800/90 text-slate-300'
                        : 'bg-[#0A0E17]/50 border-slate-800/40 text-slate-600'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                      isActive
                        ? 'text-amber-400'
                        : isPast || isDone
                          ? 'text-emerald-400'
                          : 'text-slate-600'
                    }`}
                  />
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        </div>

        {toastMessage && (
          <div
            role="status"
            className="mt-3.5 flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-md px-3.5 py-2"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </section>

      {/* Main Grid: Left 5 Cols (Raw Text Editor & Ingest Trigger) + Right 7 Cols (Structured Timeline of Scenes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Raw Text Ingestion Hub */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <section
            aria-labelledby="raw-ingest-heading"
            className="bg-[#111726] border border-slate-800 rounded-lg p-5 flex flex-col gap-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <h3
                id="raw-ingest-heading"
                className="text-sm font-semibold text-slate-100 flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Văn Bản Kịch Bản Thô (Raw Screenplay / Script Input)</span>
              </h3>
              {rawText.trim() && (
                <button
                  type="button"
                  onClick={() => onRawTextChange('')}
                  className="px-2 py-0.5 text-xs bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded transition-colors"
                >
                  Xóa trắng
                </button>
              )}
            </div>

            <label htmlFor="raw-script-input" className="sr-only">
              Nhập nội dung kịch bản thô
            </label>
            <textarea
              id="raw-script-input"
              rows={12}
              value={rawText}
              onChange={(e) => onRawTextChange(e.target.value)}
              placeholder="Nhập hoặc dán kịch bản thô (hỗ trợ INT./EXT., CẢNH 1, lời thoại nhân vật, mô tả hành động)..."
              className="w-full bg-[#0A0E17] border border-slate-800 focus:border-amber-500 rounded-md p-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none leading-relaxed font-mono"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {rawText.trim().length} ký tự · {rawText.split(/\s+/).filter(Boolean).length} từ
              </span>

              <button
                type="button"
                onClick={handleRunAgentIngestion}
                disabled={isIngesting || !rawText.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-md flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <Wand2 className={`w-3.5 h-3.5 ${isIngesting ? 'animate-spin' : ''}`} />
                <span>
                  {isIngesting ? 'AI Agent đang phân rã...' : 'Phân Tách Dòng Thời Gian (Parse Timeline)'}
                </span>
              </button>
            </div>
          </section>

          {/* Extracted Entities Quick Card (Characters & Locations Found) */}
          <section
            aria-label="Thực thể đã trích xuất từ kịch bản thô"
            className="bg-[#111726] border border-slate-800 rounded-lg p-5 flex flex-col gap-3"
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Thực Thể Trích Xuất Tự Động (Extracted Entities)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#0A0E17] border border-slate-800/80 rounded p-3 flex flex-col gap-1.5">
                <span className="text-slate-400 font-medium">Nhân vật ({ingestionResult.extractedCharacterList.length}):</span>
                <div className="flex flex-col gap-1 font-mono">
                  {ingestionResult.extractedCharacterList.map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-200">{c.name}</span>
                      <span className="text-amber-400 tabular-nums">{c.count} cảnh</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0A0E17] border border-slate-800/80 rounded p-3 flex flex-col gap-1.5">
                <span className="text-slate-400 font-medium">Địa điểm ({ingestionResult.extractedLocationList.length}):</span>
                <div className="flex flex-col gap-1 font-mono">
                  {ingestionResult.extractedLocationList.map((loc) => (
                    <div key={loc.name} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-200 truncate">{loc.name}</span>
                      <span className="text-sky-400 shrink-0 tabular-nums">[{loc.intExt}]</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Structured Timeline of Scenes View */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <section
            aria-labelledby="structured-timeline-heading"
            className="bg-[#111726] border border-slate-800 rounded-lg p-5 flex flex-col gap-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
              <div>
                <h3
                  id="structured-timeline-heading"
                  className="text-base font-semibold text-slate-100 flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  <Film className="w-4 h-4 text-amber-400" />
                  <span>Dòng Thời Gian Phân Cảnh Có Cấu Trúc (Structured Timeline)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bóc tách đầy đủ metadata về Nhân vật, Địa điểm, Hành động và Lời thoại theo thời gian.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddNewSceneBeat}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Thêm Cảnh Mới</span>
              </button>
            </div>

            {/* Visual Timeline Ruler / Timecode Beads */}
            <div className="bg-[#0A0E17] border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                <span>00:00:00</span>
                <span>RULER CHRONOLOGY (Tổng: {ingestionResult.estimatedRuntimeSec}s)</span>
                <span>00:00:{String(ingestionResult.estimatedRuntimeSec).padStart(2, '0')}</span>
              </div>

              {/* Timecode Block Bar */}
              <div className="flex items-stretch gap-1.5 h-9 w-full overflow-x-auto pb-1">
                {timecodedTimeline.map((s, idx) => {
                  const isSelected = idx === selectedSceneIndex;
                  return (
                    <button
                      key={s.sceneNumber}
                      type="button"
                      onClick={() => setSelectedSceneIndex(idx)}
                      className={`flex-1 min-w-[75px] px-2 py-1 rounded text-left transition-colors flex flex-col justify-between border ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-slate-100'
                          : 'bg-[#111726] border-slate-800 hover:border-slate-600 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                        <span>Cảnh 0{s.sceneNumber}</span>
                        <span className="text-amber-400 tabular-nums">{s.suggestedDurationSec}s</span>
                      </div>
                      <span className="text-[10px] truncate text-slate-300">
                        {s.location.settingName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter by Character & Location */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Lọc theo:</span>
                </span>

                <select
                  aria-label="Lọc theo nhân vật"
                  value={characterFilter}
                  onChange={(e) => setCharacterFilter(e.target.value)}
                  className="bg-[#0A0E17] border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="all">Tất cả nhân vật</option>
                  {ingestionResult.extractedCharacterList.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.count} cảnh)
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Lọc theo địa điểm"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="bg-[#0A0E17] border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="all">Tất cả địa điểm</option>
                  {ingestionResult.extractedLocationList.map((loc) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.name} ({loc.sceneCount} cảnh)
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-slate-400 font-mono tabular-nums">
                Hiển thị: {filteredTimeline.length}/{ingestionResult.timeline.length} phân cảnh
              </span>
            </div>

            {/* Chronological Scene Nodes List */}
            <div className="divide-y divide-slate-800 flex flex-col gap-4">
              {filteredTimeline.map((scene, idx) => {
                const isSelected = idx === selectedSceneIndex;
                const isEditing = editingSceneId === scene.sceneNumber;

                return (
                  <article
                    key={scene.sceneNumber}
                    className={`p-4 rounded-lg border transition-colors flex flex-col gap-3.5 ${
                      isSelected
                        ? 'bg-[#0E1422] border-amber-500/50'
                        : 'bg-[#0A0E17]/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Scene Header & Slugline */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                          0{scene.sceneNumber}.
                        </span>
                        <h4 className="text-sm font-semibold text-slate-100 font-mono">
                          {scene.slugline}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleMoveScene(idx, 'up')}
                          disabled={idx === 0}
                          aria-label={`Di chuyển Cảnh 0${scene.sceneNumber} lên trước`}
                          className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveScene(idx, 'down')}
                          disabled={idx === filteredTimeline.length - 1}
                          aria-label={`Di chuyển Cảnh 0${scene.sceneNumber} xuống sau`}
                          className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingSceneId(isEditing ? null : scene.sceneNumber)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition-colors"
                        >
                          {isEditing ? 'Đóng sửa' : 'Chỉnh sửa'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteScene(scene.sceneNumber)}
                          aria-label={`Xóa Cảnh 0${scene.sceneNumber}`}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata 1: Characters Involved */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>Nhân vật:</span>
                      </span>
                      {scene.characters.map((char) => (
                        <div
                          key={char.name}
                          className="px-2 py-0.5 bg-slate-800/90 border border-slate-700/80 rounded text-slate-200 flex items-center gap-1.5 font-mono text-[11px]"
                        >
                          <span className="font-semibold text-amber-300">{char.name}</span>
                          <span className="text-slate-400">({char.emotionalState || 'Tập trung'})</span>
                        </div>
                      ))}
                    </div>

                    {/* Metadata 2: Location & Environment */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#080B12] border border-slate-800/80 rounded p-2.5 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">ĐỊA ĐIỂM & BỐI CẢNH</span>
                        <span className="text-slate-200 font-medium">{scene.location.settingName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">THỜI GIAN & ÁNH SÁNG</span>
                        <span className="text-amber-300 font-medium">{scene.location.timeOfDay} ({scene.location.intExt})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">ÁNH SÁNG & KHÔNG KHÍ</span>
                        <span className="text-slate-300 truncate block">{scene.location.lightingMood}</span>
                      </div>
                    </div>

                    {/* Metadata 3: Sequential Actions & Visual Camera Movement */}
                    <div className="flex flex-col gap-1.5 text-xs">
                      <span className="text-slate-400 flex items-center gap-1 font-medium">
                        <Camera className="w-3.5 h-3.5 text-sky-400" />
                        <span>Chuỗi Hành Động &amp; Góc Máy (Actions &amp; Camera Movement):</span>
                      </span>
                      <div className="flex flex-col gap-1">
                        {scene.actions.map((act) => (
                          <div
                            key={act.step}
                            className="flex items-start gap-2 bg-[#080B12] border border-slate-800/60 rounded px-2.5 py-1.5"
                          >
                            <span className="text-amber-400 font-mono font-bold text-[11px]">
                              B{act.step}.
                            </span>
                            <div className="flex-1 text-slate-200 text-xs">
                              <p>{act.description}</p>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                Góc máy: {act.cameraMovement}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metadata 4: Dialogue Lines */}
                    {scene.dialogueLines.length > 0 && (
                      <div className="bg-[#080B12] border border-slate-800/60 rounded p-2.5 text-xs flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Lời thoại &amp; Thuyết minh:</span>
                        {scene.dialogueLines.map((dlg, dIdx) => (
                          <p key={dIdx} className="text-slate-200 italic">
                            <strong className="text-amber-300 font-medium not-italic">
                              {dlg.speaker}:
                            </strong>{' '}
                            &ldquo;{dlg.text}&rdquo;
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Metadata 5: Pacing & Continuity Hook */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono tabular-nums pt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Thời lượng dự kiến: {scene.suggestedDurationSec}s</span>
                      </div>
                      <span className="text-[11px] text-slate-400 italic truncate max-w-sm">
                        {scene.continuityHook}
                      </span>
                    </div>

                    {/* Inline Editor Drawer */}
                    {isEditing && (
                      <div className="p-3 bg-[#080B12] border border-slate-700 rounded-md flex flex-col gap-2.5 text-xs">
                        <span className="font-semibold text-slate-100">
                          Chỉnh sửa trực tiếp Cảnh 0{scene.sceneNumber}:
                        </span>
                        <div>
                          <label className="block text-slate-400 mb-1">Mô tả hành động kịch bản:</label>
                          <textarea
                            rows={2}
                            value={scene.narrativeSummary}
                            onChange={(e) =>
                              handleUpdateSceneMeta(scene.sceneNumber, {
                                narrativeSummary: e.target.value,
                              })
                            }
                            className="w-full bg-[#111726] border border-slate-700 rounded p-2 text-xs text-slate-100"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-slate-400">Thời lượng (giây):</label>
                          <input
                            type="number"
                            min={2}
                            max={12}
                            value={scene.suggestedDurationSec}
                            onChange={(e) =>
                              handleUpdateSceneMeta(scene.sceneNumber, {
                                suggestedDurationSec: Number(e.target.value) || 5,
                              })
                            }
                            className="w-20 bg-[#111726] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-100 tabular-nums"
                          />
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
