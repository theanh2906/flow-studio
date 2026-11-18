'use client';

import React, { useState } from 'react';
import {
  GitCompare,
  History,
  RotateCcw,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  ProjectVersion,
  compareProjectVersions,
  computeProductionProgress,
} from '@/lib/flow-engine';

interface VersionComparisonViewProps {
  versions: ProjectVersion[];
  activeVersionId: string;
  onCreateSnapshot: (label: string, notes: string) => void;
  onRestoreVersion: (versionId: string) => void;
}

export default function VersionComparisonView({
  versions,
  activeVersionId,
  onCreateSnapshot,
  onRestoreVersion,
}: VersionComparisonViewProps) {
  const [baseVersionId, setBaseVersionId] = useState<string>(
    versions[0]?.id || ''
  );
  const [targetVersionId, setTargetVersionId] = useState<string>(
    versions[versions.length - 1]?.id || versions[0]?.id || ''
  );

  const [newLabel, setNewLabel] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [restoreBanner, setRestoreBanner] = useState<string | null>(null);

  const baseVersion =
    versions.find((v) => v.id === baseVersionId) || versions[0];
  const targetVersion =
    versions.find((v) => v.id === targetVersionId) ||
    versions[versions.length - 1] ||
    versions[0];

  const diffReport =
    baseVersion && targetVersion
      ? compareProjectVersions(baseVersion, targetVersion)
      : null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      setFormError('Vui lòng nhập nhãn tên cho phiên bản mới.');
      return;
    }
    setFormError(null);
    onCreateSnapshot(
      newLabel.trim(),
      newNotes.trim() || 'Lưu bản chụp trạng thái kịch bản, take và hậu kỳ hiện tại.'
    );
    setNewLabel('');
    setNewNotes('');
  };

  const handleRestore = (v: ProjectVersion) => {
    onRestoreVersion(v.id);
    setRestoreBanner(
      `Đã khôi phục dự án về phiên bản ${v.versionTag} (${v.label}).`
    );
    setTimeout(() => setRestoreBanner(null), 4000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 4 Cols: Version History List & Snapshot Creator */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Create New Version Snapshot Form */}
        <section
          aria-labelledby="create-version-heading"
          className="bg-[#111726] border border-slate-800 rounded-lg p-5"
        >
          <h2
            id="create-version-heading"
            className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>Tạo Phiên Bản Mới (Snapshot)</span>
          </h2>
          <p className="text-xs text-slate-400 mb-3.5">
            Đóng băng toàn bộ kịch bản, các take đã dựng và thông số hậu kỳ hiện tại để đối chiếu.
          </p>

          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="version-label-input"
                className="block text-xs text-slate-300 mb-1"
              >
                Tên phiên bản *
              </label>
              <input
                id="version-label-input"
                type="text"
                value={newLabel}
                onChange={(e) => {
                  setNewLabel(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="VD: Bản duyệt đạo diễn - Tăng sáng Cảnh 2"
                className="w-full bg-[#0A0E17] border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="version-notes-input"
                className="block text-xs text-slate-300 mb-1"
              >
                Ghi chú thay đổi
              </label>
              <textarea
                id="version-notes-input"
                rows={2}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Mô tả các cảnh đã regenerate hoặc thay đổi màu hậu kỳ..."
                className="w-full bg-[#0A0E17] border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {formError && (
              <div
                role="alert"
                className="flex items-center gap-1.5 text-xs text-rose-400"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-md transition-colors"
            >
              Lưu Phiên Bản (v1.{versions.length})
            </button>
          </form>
        </section>

        {/* Saved Versions History */}
        <section
          aria-labelledby="version-history-heading"
          className="bg-[#111726] border border-slate-800 rounded-lg p-5"
        >
          <h2
            id="version-history-heading"
            className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-3"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Lịch Sử Phiên Bản ({versions.length})</span>
          </h2>

          {restoreBanner && (
            <div
              role="status"
              className="mb-3 flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded px-3 py-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{restoreBanner}</span>
            </div>
          )}

          <div className="divide-y divide-slate-800">
            {versions.map((ver) => {
              const prog = computeProductionProgress(ver.scenes);
              const isCurrent = ver.id === activeVersionId;
              return (
                <div
                  key={ver.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                          {ver.versionTag}
                        </span>
                        <span className="text-sm font-semibold text-slate-100">
                          {ver.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                        <span>{ver.createdAt}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{ver.scenes.length} cảnh</span>
                        <span aria-hidden="true"> · </span>
                        <span>{prog.totalDurationSec}s</span>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="text-xs font-mono text-emerald-400 shrink-0">
                        Đang dùng
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRestore(ver)}
                        className="px-2.5 py-1 border border-slate-700 hover:border-amber-400 text-xs text-slate-200 rounded flex items-center gap-1 transition-colors shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Khôi phục</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-300">{ver.notes}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Right 8 Cols: Side-by-Side Version Comparison Matrix */}
      <div className="lg:col-span-8 flex flex-col gap-5">
        <section
          aria-labelledby="diff-studio-heading"
          className="bg-[#111726] border border-slate-800 rounded-lg p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2
                id="diff-studio-heading"
                className="text-base font-semibold text-slate-100 flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <GitCompare className="w-4 h-4 text-amber-400" />
                <span>Bảng Đối Chiếu Phiên Bản Trực Quan (Version Diff)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                So sánh chi tiết từng phân cảnh: số hiệu Take, Video Prompt, Khóa nhân vật, thời lượng và màu hậu kỳ.
              </p>
            </div>
          </div>

          {/* Version Selectors (Base vs Target) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
            <div>
              <label
                htmlFor="base-version-select"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Phiên bản gốc (Base Version)
              </label>
              <select
                id="base-version-select"
                value={baseVersion?.id || ''}
                onChange={(e) => setBaseVersionId(e.target.value)}
                className="w-full bg-[#0A0E17] border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.versionTag} — {v.label} ({v.createdAt})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="target-version-select"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Phiên bản đối chiếu (Target Version)
              </label>
              <select
                id="target-version-select"
                value={targetVersion?.id || ''}
                onChange={(e) => setTargetVersionId(e.target.value)}
                className="w-full bg-[#0A0E17] border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.versionTag} — {v.label} ({v.createdAt})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Diff Summary Strip */}
          {diffReport && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 px-4 bg-[#0A0E17] border border-slate-800 rounded-md mb-5 font-mono tabular-nums">
              <div>
                <span className="block text-[11px] text-slate-400">
                  Cảnh có thay đổi
                </span>
                <span className="text-sm font-semibold text-amber-400">
                  {diffReport.modifiedScenesCount} phân cảnh
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-400">
                  Cảnh giữ nguyên
                </span>
                <span className="text-sm font-semibold text-slate-200">
                  {diffReport.unchangedScenesCount} phân cảnh
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-400">
                  Chênh lệch thời lượng
                </span>
                <span className="text-sm font-semibold text-emerald-400">
                  {diffReport.totalDurationDeltaSec >= 0
                    ? `+${diffReport.totalDurationDeltaSec}s`
                    : `${diffReport.totalDurationDeltaSec}s`}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-400">
                  Kịch bản gốc
                </span>
                <span className="text-sm font-semibold text-slate-200">
                  {diffReport.scriptChanged ? 'Đã cập nhật' : 'Đồng nhất'}
                </span>
              </div>
            </div>
          )}

          {/* Scene-by-Scene Side-by-Side Diff List */}
          {diffReport && (
            <div className="divide-y divide-slate-800">
              {diffReport.sceneDiffs.map((item) => {
                const isModified = item.changeType !== 'unchanged';
                return (
                  <div
                    key={item.sceneNumber}
                    className="py-4 first:pt-1 last:pb-1 flex flex-col gap-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-amber-400 tabular-nums">
                          Cảnh 0{item.sceneNumber}:
                        </span>
                        <span className="text-sm font-semibold text-slate-100">
                          {item.sceneTitle}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-slate-400">
                        {isModified ? (
                          <span className="text-amber-300">
                            Thay đổi: {item.changedFields.join(' · ')}
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            Không thay đổi (Đồng nhất giữa {diffReport.baseVersionTag} và {diffReport.targetVersionTag})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Side-by-Side Comparison Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Base Column */}
                      <div className="bg-[#0A0E17] border border-slate-800/90 rounded p-3 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800/80 pb-1.5">
                          <span>
                            {diffReport.baseVersionTag} (Base)
                          </span>
                          <span>
                            Take v{item.baseTake ?? '-'} · {item.baseDurationSec ?? 0}s ·{' '}
                            {item.baseColorGrade ?? '-'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-300 break-all">
                          {item.baseVideoPrompt || 'Không có dữ liệu'}
                        </p>
                      </div>

                      {/* Target Column */}
                      <div
                        className={`bg-[#0A0E17] border rounded p-3 flex flex-col gap-1.5 ${
                          isModified
                            ? 'border-amber-500/50'
                            : 'border-slate-800/90'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono text-amber-300 border-b border-slate-800/80 pb-1.5">
                          <span>
                            {diffReport.targetVersionTag} (Target)
                          </span>
                          <span>
                            Take v{item.targetTake ?? '-'} · {item.targetDurationSec ?? 0}s ·{' '}
                            {item.targetColorGrade ?? '-'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-100 break-all">
                          {item.targetVideoPrompt || 'Không có dữ liệu'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
