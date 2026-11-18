'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Film,
  SkipBack,
  SkipForward,
  Download,
} from 'lucide-react';
import {
  SceneNode,
  ColorGradePreset,
  cleanSpokenDialogueText,
  isStageDirectionInsteadOfDialogue,
  generateNaturalActingDialogue,
  extractSceneActionBeats,
  ROYALTY_FREE_AUDIO_LIBRARY,
} from '@/lib/flow-engine';

interface FlowCanvasPlayerProps {
  scenes: SceneNode[];
  activeSceneIndex?: number;
  mode: 'single' | 'master';
  autoPlayTrigger?: number;
  onSceneChange?: (sceneIndex: number) => void;
  onSceneKeyframeUpgraded?: (sceneId: string, keyframeUrl: string) => void;
  onSceneVideoUpgraded?: (sceneId: string, videoClipUrl: string) => void;
}

const GRADE_FILTERS: Record<ColorGradePreset, string> = {
  'cinematic-warm': 'contrast(1.06) saturate(1.14) sepia(0.08)',
  'anamorphic-teal': 'contrast(1.1) saturate(1.08) hue-rotate(-6deg)',
  'neutral-rec709': 'contrast(1.02) saturate(1.0)',
  'high-contrast-doc': 'contrast(1.18) saturate(0.92)',
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawArticulatedAdultOnCanvas(
  ctx: CanvasRenderingContext2D,
  options: {
    cx: number;
    floorY: number;
    isFemale: boolean;
    shirtColor: string;
    pantsColor: string;
    label: string;
    timeSec: number;
    isWalking: boolean;
    isSpeaking: boolean;
    isCooking?: boolean;
    isHoldingBaby?: boolean;
    babyName?: string;
  }
) {
  const {
    cx,
    floorY,
    isFemale,
    shirtColor,
    pantsColor,
    label,
    timeSec,
    isWalking,
    isSpeaking,
    isCooking,
    isHoldingBaby,
    babyName,
  } = options;

  const walkCycle = isWalking ? Math.sin(timeSec * 8.5) : 0;
  const bodyBob = isWalking
    ? Math.abs(Math.sin(timeSec * 8.5)) * -6
    : Math.sin(timeSec * 2.5) * -2;
  const leftStride = walkCycle * 22;
  const rightStride = -walkCycle * 22;
  const leftLift = walkCycle > 0 ? walkCycle * -8 : 0;
  const rightLift = walkCycle < 0 ? -walkCycle * -8 : 0;

  const hipY = floorY - 94 + bodyBob;
  const shoulderY = floorY - 178 + bodyBob;
  const headY = floorY - 216 + bodyBob;

  ctx.save();

  // Floor shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, floorY + 5, 44, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Left Leg & Shoe
  ctx.strokeStyle = pantsColor;
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 12, hipY);
  ctx.quadraticCurveTo(
    cx - 14 + leftStride * 0.6,
    hipY + 45,
    cx - 14 + leftStride,
    floorY - 6 + leftLift
  );
  ctx.stroke();

  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.ellipse(
    cx - 8 + leftStride,
    floorY + leftLift,
    15,
    7,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Right Leg & Shoe
  ctx.strokeStyle = pantsColor;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(cx + 12, hipY);
  ctx.quadraticCurveTo(
    cx + 14 + rightStride * 0.6,
    hipY + 45,
    cx + 14 + rightStride,
    floorY - 6 + rightLift
  );
  ctx.stroke();

  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.ellipse(
    cx + 20 + rightStride,
    floorY + rightLift,
    15,
    7,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Back Arm (when walking and not holding baby)
  if (!isHoldingBaby) {
    const backArmSwing = isWalking
      ? -walkCycle * 18
      : Math.sin(timeSec * 3) * 8;
    ctx.strokeStyle = shirtColor;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(cx - 26, shoulderY + 14);
    ctx.quadraticCurveTo(
      cx - 42 + backArmSwing * 0.5,
      shoulderY + 45,
      cx - 28 + backArmSwing,
      shoulderY + 72
    );
    ctx.stroke();

    ctx.fillStyle = '#FED7AA';
    ctx.beginPath();
    ctx.arc(cx - 28 + backArmSwing, shoulderY + 74, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Torso / Shirt
  ctx.fillStyle = shirtColor;
  drawRoundedRect(ctx, cx - 30, shoulderY, 60, 88, 18);
  ctx.fill();

  // Collar
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(cx - 13, shoulderY);
  ctx.lineTo(cx, shoulderY + 20);
  ctx.lineTo(cx + 13, shoulderY);
  ctx.closePath();
  ctx.fill();

  // Kitchen Apron if cooking
  if (isCooking) {
    ctx.fillStyle = '#FEF08A';
    drawRoundedRect(ctx, cx - 22, shoulderY + 22, 44, 62, 6);
    ctx.fill();
  }

  // Neck & Head
  ctx.fillStyle = '#FDBA74';
  drawRoundedRect(ctx, cx - 8, headY + 20, 16, 16, 4);
  ctx.fill();

  ctx.fillStyle = '#FED7AA';
  ctx.beginPath();
  ctx.arc(cx, headY, 28, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#18181B';
  ctx.beginPath();
  if (isFemale) {
    ctx.arc(cx, headY - 6, 30, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 30, headY - 2, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.arc(cx, headY - 8, 28, Math.PI * 0.92, Math.PI * 2.08);
    ctx.fill();
  }

  // Blinking Eyes
  const isBlinking = Math.sin(timeSec * 1.9) > 0.96;
  ctx.fillStyle = '#0F172A';
  if (isBlinking) {
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(cx - 12, headY - 2);
    ctx.lineTo(cx - 4, headY - 2);
    ctx.moveTo(cx + 6, headY - 2);
    ctx.lineTo(cx + 14, headY - 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx - 8, headY - 2, 3.2, 0, Math.PI * 2);
    ctx.arc(cx + 10, headY - 2, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 7, headY - 3, 1.1, 0, Math.PI * 2);
    ctx.arc(cx + 11, headY - 3, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Animated Lip-Sync Mouth
  if (isSpeaking) {
    const mouthOpen = 2.5 + Math.abs(Math.sin(timeSec * 14)) * 5.5;
    ctx.fillStyle = '#9A3412';
    ctx.beginPath();
    ctx.ellipse(cx + 1, headY + 12, 6.5, mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#9A3412';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx - 6, headY + 10);
    ctx.quadraticCurveTo(cx + 1, headY + 17, cx + 9, headY + 10);
    ctx.stroke();
  }

  // If holding baby in arms
  if (isHoldingBaby) {
    const babyBob = Math.sin(timeSec * 5) * 2.5;
    const bx = cx + 26;
    const by = shoulderY + 34 + babyBob;

    // Baby Little Legs dangling
    ctx.strokeStyle = '#FED7AA';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(bx - 6, by + 26);
    ctx.lineTo(bx - 10 + Math.sin(timeSec * 7) * 5, by + 44);
    ctx.moveTo(bx + 8, by + 26);
    ctx.lineTo(bx + 12 - Math.sin(timeSec * 7) * 5, by + 44);
    ctx.stroke();

    // Baby Romper Body
    ctx.fillStyle = '#F59E0B';
    drawRoundedRect(ctx, bx - 18, by - 12, 36, 42, 14);
    ctx.fill();

    // Baby Head
    ctx.fillStyle = '#FED7AA';
    ctx.beginPath();
    ctx.arc(bx, by - 28, 19, 0, Math.PI * 2);
    ctx.fill();

    // Baby Hair Tuft
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(bx - 9, by - 44);
    ctx.quadraticCurveTo(bx, by - 52, bx + 9, by - 44);
    ctx.stroke();

    // Baby Eyes & Rosy Cheeks
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(bx - 6, by - 29, 2.4, 0, Math.PI * 2);
    ctx.arc(bx + 6, by - 29, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(251, 113, 133, 0.5)';
    ctx.beginPath();
    ctx.arc(bx - 11, by - 24, 3.8, 0, Math.PI * 2);
    ctx.arc(bx + 11, by - 24, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Baby Waving Arm
    const babyWave = Math.sin(timeSec * 8) * 10;
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(bx + 14, by - 4);
    ctx.lineTo(bx + 28, by - 16 + babyWave);
    ctx.stroke();
    ctx.fillStyle = '#FED7AA';
    ctx.beginPath();
    ctx.arc(bx + 29, by - 17 + babyWave, 5, 0, Math.PI * 2);
    ctx.fill();

    // Parent Arms Cradling Baby
    ctx.strokeStyle = shirtColor;
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(cx - 22, shoulderY + 18);
    ctx.quadraticCurveTo(cx + 2, shoulderY + 56, bx + 14, by + 16);
    ctx.stroke();

    ctx.fillStyle = '#FED7AA';
    ctx.beginPath();
    ctx.arc(bx + 16, by + 15, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Front Arm Gesture / Cooking Stir
    const armWave = isCooking
      ? Math.sin(timeSec * 7) * 18
      : isSpeaking
        ? Math.sin(timeSec * 5) * 14
        : walkCycle * 18;
    ctx.strokeStyle = shirtColor;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(cx + 24, shoulderY + 14);
    ctx.quadraticCurveTo(
      cx + 46,
      shoulderY + 38,
      cx + 38 + armWave,
      shoulderY + 58 - Math.abs(armWave) * 0.3
    );
    ctx.stroke();

    const handX = cx + 38 + armWave;
    const handY = shoulderY + 58 - Math.abs(armWave) * 0.3;
    ctx.fillStyle = '#FED7AA';
    ctx.beginPath();
    ctx.arc(handX, handY, 7, 0, Math.PI * 2);
    ctx.fill();

    if (isCooking) {
      // Spatula / Ladle in hand
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(handX + 22, handY - 12);
      ctx.stroke();
    }
  }

  // Name Badge below feet
  const badgeText = isHoldingBaby && babyName ? `${label} bế ${babyName}` : label;
  ctx.font = '700 11.5px sans-serif';
  const badgeW = Math.max(115, ctx.measureText(badgeText).width + 24);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  drawRoundedRect(ctx, cx - badgeW / 2, floorY + 12, badgeW, 24, 12);
  ctx.fill();
  ctx.fillStyle = '#F8FAFC';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, cx, floorY + 28);
  ctx.textAlign = 'left';

  ctx.restore();
}

function drawArticulatedChildOnCanvas(
  ctx: CanvasRenderingContext2D,
  options: {
    cx: number;
    floorY: number;
    label: string;
    timeSec: number;
    isWalking: boolean;
  }
) {
  const { cx, floorY, label, timeSec, isWalking } = options;
  const bounce = Math.abs(Math.sin(timeSec * 6.5)) * -6;
  const stride = isWalking ? Math.sin(timeSec * 9) * 14 : 0;
  const hipY = floorY - 46 + bounce;
  const shoulderY = floorY - 92 + bounce;
  const headY = floorY - 118 + bounce;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, floorY + 3, 28, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.strokeStyle = '#FED7AA';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 8, hipY);
  ctx.lineTo(cx - 10 + stride, floorY - 4);
  ctx.moveTo(cx + 8, hipY);
  ctx.lineTo(cx + 10 - stride, floorY - 4);
  ctx.stroke();

  // Romper
  ctx.fillStyle = '#F59E0B';
  drawRoundedRect(ctx, cx - 20, shoulderY, 40, 50, 15);
  ctx.fill();

  // Waving Arms
  const wave = Math.sin(timeSec * 7.5) * 12;
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(cx - 18, shoulderY + 12);
  ctx.lineTo(cx - 32, shoulderY - 2 + wave);
  ctx.moveTo(cx + 18, shoulderY + 12);
  ctx.lineTo(cx + 32, shoulderY - 2 - wave);
  ctx.stroke();

  // Head
  ctx.fillStyle = '#FED7AA';
  ctx.beginPath();
  ctx.arc(cx, headY, 21, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#18181B';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 10, headY - 17);
  ctx.quadraticCurveTo(cx, headY - 26, cx + 10, headY - 17);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(cx - 6, headY - 2, 2.6, 0, Math.PI * 2);
  ctx.arc(cx + 6, headY - 2, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(251, 113, 133, 0.5)';
  ctx.beginPath();
  ctx.arc(cx - 12, headY + 3, 4, 0, Math.PI * 2);
  ctx.arc(cx + 12, headY + 3, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#9A3412';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 5, headY + 7);
  ctx.quadraticCurveTo(cx, headY + 13, cx + 5, headY + 7);
  ctx.stroke();

  // Name Tag
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  drawRoundedRect(ctx, cx - 48, floorY + 12, 96, 22, 11);
  ctx.fill();
  ctx.fillStyle = '#FDE047';
  ctx.font = '700 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, floorY + 27);
  ctx.textAlign = 'left';
  ctx.restore();
}

function renderLiveProceduralCinemaScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: SceneNode,
  localProgress: number,
  timeSec: number,
  isAudioActive: boolean
) {
  const locLower = `${scene.location} ${scene.narrativeBeat}`.toLowerCase();
  const timeLower = scene.timeOfDay.toLowerCase();
  const takeNum = scene.currentTake || 1;

  const isMultiRoomJourney =
    /từ\s+.*phòng khách.*phòng ngủ.*bếp|đi đâu.*theo đó/.test(locLower) ||
    (/phòng khách/.test(locLower) &&
      /phòng ngủ/.test(locLower) &&
      /bếp/.test(locLower));
  const isCarryingBaby =
    /(?:^|[^\p{L}\p{N}])(?:bế|ẵm|bồng)(?=[^\p{L}\p{N}]|$)/iu.test(locLower);
  const isLyingPlaying =
    /(?:^|[^\p{L}\p{N}])(?:nằm chơi|nằm trên|chơi với|đùa)(?=[^\p{L}\p{N}]|$)/iu.test(
      locLower
    );
  const isKitchen =
    !isMultiRoomJourney &&
    /bếp|nấu|bữa sáng|chảo|nồi|bàn ăn|tạp dề|phở|trà|sữa|ăn|uống/.test(
      locLower
    );
  const isOutdoor =
    /sân|công viên|đường|phố|vườn|ngoài trời|ban công|cầu|trường|lớp/.test(
      locLower
    );
  const isWalkingAction =
    isMultiRoomJourney ||
    /(?:^|[^\p{L}\p{N}])(?:đi|bước|chạy|dắt|theo|sang|xuống|vào|ra)(?=[^\p{L}\p{N}]|$)/iu.test(
      locLower
    );
  const isEvening = /tối|đêm|hoàng hôn/.test(timeLower);

  // Extract character names from scene context with Unicode-safe boundaries
  const hasMother =
    /(?:^|[^\p{L}\p{N}])(?:mẹ|má|na|linh|lan|chị)(?=[^\p{L}\p{N}]|$)/iu.test(
      locLower
    );
  const parentName = hasMother
    ? /(?:^|[^\p{L}\p{N}])linh(?=[^\p{L}\p{N}]|$)/iu.test(locLower)
      ? 'Linh'
      : 'Mẹ Na'
    : /(?:^|[^\p{L}\p{N}])phong(?=[^\p{L}\p{N}]|$)/iu.test(locLower)
      ? 'Phong'
      : /(?:^|[^\p{L}\p{N}])minh(?=[^\p{L}\p{N}]|$)/iu.test(locLower)
        ? 'Minh'
        : 'Ba Ben';
  const babyName = /(?:^|[^\p{L}\p{N}])ấu(?=[^\p{L}\p{N}]|$)/iu.test(locLower)
    ? 'Ấu'
    : /(?:^|[^\p{L}\p{N}])bông(?=[^\p{L}\p{N}]|$)/iu.test(locLower)
      ? 'Bé Bông'
      : /(?:^|[^\p{L}\p{N}])ban ban(?=[^\p{L}\p{N}]|$)/iu.test(locLower)
        ? 'Ban Ban'
        : 'Ấu';

  ctx.save();

  // Camera zoom & framing per Take (Take v1 = Wide, Take v2 = Medium Focus, Take v3 = Close-Up Orbit)
  const baseZoom =
    takeNum === 2 ? 1.14 : takeNum === 3 ? 1.22 : 1.02;
  const dynamicZoom = baseZoom + localProgress * 0.06;
  const camPanX = isMultiRoomJourney
    ? (0.5 - localProgress) * 110
    : (localProgress - 0.5) * 28;
  const camPanY = takeNum >= 2 ? 18 : 0;

  ctx.translate(width / 2 + camPanX, height / 2 + camPanY);
  ctx.scale(dynamicZoom, dynamicZoom);
  ctx.translate(-width / 2, -height / 2);

  // 1. Draw Wall / Sky & Floor
  const wallGrad = ctx.createLinearGradient(0, 0, 0, 385);
  if (isEvening) {
    wallGrad.addColorStop(0, '#1E293B');
    wallGrad.addColorStop(1, '#334155');
  } else if (isOutdoor) {
    wallGrad.addColorStop(0, '#38BDF8');
    wallGrad.addColorStop(1, '#BAE6FD');
  } else if (isKitchen) {
    wallGrad.addColorStop(0, '#FFFBEB');
    wallGrad.addColorStop(1, '#FDE68A');
  } else {
    wallGrad.addColorStop(0, '#FFFBEB');
    wallGrad.addColorStop(1, '#FEF3C7');
  }
  ctx.fillStyle = wallGrad;
  ctx.fillRect(-120, -60, width + 240, 445);

  const floorGrad = ctx.createLinearGradient(0, 385, 0, height + 60);
  if (isOutdoor) {
    floorGrad.addColorStop(0, '#4ADE80');
    floorGrad.addColorStop(1, '#15803D');
  } else {
    floorGrad.addColorStop(0, '#D97706');
    floorGrad.addColorStop(1, '#92400E');
  }
  ctx.fillStyle = floorGrad;
  ctx.fillRect(-120, 385, width + 240, height - 325);

  // Baseboard line
  ctx.fillStyle = '#78350F';
  ctx.fillRect(-120, 381, width + 240, 6);

  // 2. Draw Environment Set Details
  if (isMultiRoomJourney) {
    // 3-Room Connected House Interior: Living Room -> Bedroom -> Kitchen
    // Room 1: Living Room (Left)
    ctx.fillStyle = '#FFFBEB';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, 20, 62, 292, 319, 8);
    ctx.fill();
    ctx.stroke();

    // Window in Living Room
    ctx.fillStyle = '#BAE6FD';
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 48, 98, 115, 90, 6);
    ctx.fill();
    ctx.stroke();

    // Sofa in Living Room
    ctx.fillStyle = '#0284C7';
    drawRoundedRect(ctx, 50, 278, 195, 76, 12);
    ctx.fill();

    // Room 1 Badge
    ctx.fillStyle = localProgress < 0.34 ? '#0284C7' : '#475569';
    drawRoundedRect(ctx, 48, 72, 138, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 11px sans-serif';
    ctx.fillText('1. PHÒNG KHÁCH', 64, 87);

    // Room 2: Bedroom (Center)
    ctx.fillStyle = '#FAF5FF';
    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, 334, 62, 292, 319, 8);
    ctx.fill();
    ctx.stroke();

    // Cozy Bed & Animated Glowing Lamp
    ctx.fillStyle = '#7E22CE';
    drawRoundedRect(ctx, 365, 268, 185, 86, 10);
    ctx.fill();
    ctx.fillStyle = '#F8FAFC';
    drawRoundedRect(ctx, 376, 282, 58, 26, 6);
    ctx.fill();
    ctx.fillStyle = '#C084FC';
    drawRoundedRect(ctx, 370, 306, 175, 44, 6);
    ctx.fill();

    // Glowing Lamp
    const lampPulse = 22 + Math.sin(timeSec * 4) * 4;
    ctx.fillStyle = 'rgba(253, 224, 71, 0.45)';
    ctx.beginPath();
    ctx.arc(582, 245, lampPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(582, 245, 14, 0, Math.PI * 2);
    ctx.fill();

    // Room 2 Badge
    ctx.fillStyle =
      localProgress >= 0.34 && localProgress < 0.68 ? '#9333EA' : '#475569';
    drawRoundedRect(ctx, 362, 72, 128, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('2. PHÒNG NGỦ', 382, 87);

    // Room 3: Kitchen (Right)
    ctx.fillStyle = '#FFF7ED';
    ctx.strokeStyle = '#EA580C';
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, 648, 62, 292, 319, 8);
    ctx.fill();
    ctx.stroke();

    // Kitchen Cabinets, Fridge & Counter
    ctx.fillStyle = '#FED7AA';
    drawRoundedRect(ctx, 672, 102, 155, 62, 6);
    ctx.fill();
    ctx.fillStyle = '#E2E8F0';
    drawRoundedRect(ctx, 845, 132, 76, 222, 8);
    ctx.fill();
    ctx.fillStyle = '#9A3412';
    drawRoundedRect(ctx, 670, 268, 165, 86, 6);
    ctx.fill();

    // Cooking Pot & Rising Steam Puffs
    ctx.fillStyle = '#EF4444';
    drawRoundedRect(ctx, 726, 240, 44, 26, 5);
    ctx.fill();
    for (let s = 0; s < 3; s++) {
      const steamOffset = ((timeSec * 28 + s * 16) % 42);
      ctx.fillStyle = `rgba(148, 163, 184, ${(1 - steamOffset / 42) * 0.6})`;
      ctx.beginPath();
      ctx.arc(
        738 + s * 10 + Math.sin(timeSec * 3 + s) * 4,
        234 - steamOffset,
        6 + steamOffset * 0.15,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Room 3 Badge
    ctx.fillStyle = localProgress >= 0.68 ? '#EA580C' : '#475569';
    drawRoundedRect(ctx, 676, 72, 128, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('3. PHÒNG BẾP', 696, 87);
  } else if (isKitchen) {
    // Sunlit Kitchen Set
    ctx.fillStyle = '#BAE6FD';
    ctx.strokeStyle = '#9A3412';
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, 90, 86, 185, 145, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FDBA74';
    drawRoundedRect(ctx, 325, 76, 285, 80, 6);
    ctx.fill();
    ctx.strokeRect(325, 76, 285, 80);

    // Fridge
    ctx.fillStyle = '#F1F5F9';
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, 735, 105, 135, 275, 10);
    ctx.fill();
    ctx.stroke();

    // Kitchen Counter & Stove
    ctx.fillStyle = '#B45309';
    drawRoundedRect(ctx, 290, 275, 415, 106, 8);
    ctx.fill();
    ctx.fillStyle = '#F8FAFC';
    drawRoundedRect(ctx, 282, 264, 431, 13, 5);
    ctx.fill();

    // Pot & Animated Rising Steam
    ctx.fillStyle = '#EF4444';
    drawRoundedRect(ctx, 455, 234, 58, 30, 6);
    ctx.fill();
    for (let s = 0; s < 4; s++) {
      const steamY = (timeSec * 34 + s * 14) % 52;
      ctx.fillStyle = `rgba(255, 255, 255, ${(1 - steamY / 52) * 0.75})`;
      ctx.beginPath();
      ctx.arc(
        470 + s * 9 + Math.sin(timeSec * 4 + s) * 5,
        228 - steamY,
        7 + steamY * 0.18,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  } else {
    // Cozy Sunlit Family Living Room Set
    // Window with Animated Sunbeams & Swaying Curtains
    ctx.fillStyle = '#BAE6FD';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 5;
    drawRoundedRect(ctx, 95, 76, 245, 172, 8);
    ctx.fill();
    ctx.stroke();

    // Sun inside window
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(285, 118, 22, 0, Math.PI * 2);
    ctx.fill();

    // Swaying sheer curtains
    const curtainSway = Math.sin(timeSec * 2.2) * 6;
    ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
    ctx.beginPath();
    ctx.moveTo(90, 72);
    ctx.lineTo(130, 72);
    ctx.lineTo(116 + curtainSway, 256);
    ctx.lineTo(84 + curtainSway, 256);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(306, 72);
    ctx.lineTo(346, 72);
    ctx.lineTo(352 - curtainSway, 256);
    ctx.lineTo(320 - curtainSway, 256);
    ctx.closePath();
    ctx.fill();

    // Framed Family Photo
    ctx.fillStyle = '#FEF3C7';
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, 435, 90, 115, 80, 6);
    ctx.fill();
    ctx.stroke();

    // Cozy Living Room Sofa
    ctx.fillStyle = '#0284C7';
    drawRoundedRect(ctx, 405, 248, 350, 125, 18);
    ctx.fill();
    ctx.fillStyle = '#0369A1';
    drawRoundedRect(ctx, 388, 282, 34, 90, 12);
    ctx.fill();
    drawRoundedRect(ctx, 738, 282, 34, 90, 12);
    ctx.fill();

    // Potted Plant
    ctx.fillStyle = '#D97706';
    drawRoundedRect(ctx, 825, 318, 46, 58, 8);
    ctx.fill();
    ctx.fillStyle = '#16A34A';
    ctx.beginPath();
    ctx.ellipse(848, 280, 34, 46, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Draw Animated Characters Performing Scene Action at 24fps
  const floorY = 442;

  if (isLyingPlaying) {
    // Cozy Living Room Play Rug
    ctx.fillStyle = '#FEF3C7';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(480, 434, 335, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.ellipse(480, 434, 295, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    // Parent Reclining on Rug (Left) Waving Toy Rattle & Talking to Baby
    const parentShift = Math.sin(timeSec * 2) * 4;
    const rattleWaveY = Math.sin(timeSec * 6.5) * 16;
    const rattleWaveX = Math.cos(timeSec * 6.5) * 10;

    // Legs stretched on rug
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(190, 428);
    ctx.lineTo(285, 416);
    ctx.lineTo(265, 390 + Math.sin(timeSec * 4) * 5);
    ctx.stroke();

    // Reclining Torso
    ctx.fillStyle = '#1D4ED8';
    ctx.save();
    ctx.translate(345 + parentShift, 404);
    ctx.rotate(-0.18);
    drawRoundedRect(ctx, -62, -22, 124, 44, 18);
    ctx.fill();
    ctx.restore();

    // Propped Elbow
    ctx.strokeStyle = '#1D4ED8';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(390 + parentShift, 395);
    ctx.lineTo(378 + parentShift, 434);
    ctx.lineTo(414 + parentShift, 434);
    ctx.stroke();

    // Animated Arm Waving Toy Rattle
    const handX = 482 + rattleWaveX;
    const handY = 372 + rattleWaveY;
    ctx.strokeStyle = '#1D4ED8';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(400 + parentShift, 388);
    ctx.quadraticCurveTo(445, 364, handX, handY);
    ctx.stroke();

    ctx.fillStyle = '#FED7AA';
    ctx.beginPath();
    ctx.arc(handX, handY, 7, 0, Math.PI * 2);
    ctx.fill();

    // Colorful Rattle Toy
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(handX + 16, handY - 22);
    ctx.stroke();
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(handX + 18, handY - 25, 11, 0, Math.PI * 2);
    ctx.fill();

    // Parent Head & Lip-Syncing Face
    const headX = 412 + parentShift;
    const headY = 350 + Math.sin(timeSec * 3) * 2;
    ctx.fillStyle = '#FED7AA';
    ctx.beginPath();
    ctx.arc(headX, headY, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.arc(headX, headY - 6, 28, Math.PI * 0.92, Math.PI * 2.08);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(headX - 5, headY - 2, 3, 0, Math.PI * 2);
    ctx.arc(headX + 11, headY - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    if (isAudioActive) {
      const mOpen = 2.5 + Math.abs(Math.sin(timeSec * 14)) * 5;
      ctx.fillStyle = '#9A3412';
      ctx.beginPath();
      ctx.ellipse(headX + 4, headY + 11, 6, mOpen, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#9A3412';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(headX - 3, headY + 10);
      ctx.quadraticCurveTo(headX + 4, headY + 17, headX + 12, headY + 10);
      ctx.stroke();
    }

    // Rolling Play Ball Between Parent & Baby
    const ballX = 488 + Math.sin(timeSec * 3.8) * 34;
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.arc(ballX, 430, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(ballX + Math.cos(timeSec * 8) * 5, 430 + Math.sin(timeSec * 8) * 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Toddler Baby Sitting & Kicking Happily on Rug (Right)
    const babyBounce = Math.abs(Math.sin(timeSec * 7.5)) * -6;
    const babyKick = Math.sin(timeSec * 10) * 10;
    const bx = 590;
    const by = 402 + babyBounce;

    // Kicking Little Legs
    ctx.strokeStyle = '#FED7AA';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(bx - 14, by + 18);
    ctx.lineTo(bx - 42, by + 10 + babyKick);
    ctx.moveTo(bx + 14, by + 18);
    ctx.lineTo(bx + 38, by + 12 - babyKick);
    ctx.stroke();

    // Baby Romper
    ctx.fillStyle = '#F59E0B';
    drawRoundedRect(ctx, bx - 23, by - 24, 46, 48, 18);
    ctx.fill();

    // Baby Waving Arms Reaching for Toy
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(bx - 20, by - 12);
    ctx.lineTo(bx - 52, by - 28 - babyKick * 0.8);
    ctx.moveTo(bx + 20, by - 12);
    ctx.lineTo(bx + 44, by - 24 + babyKick * 0.8);
    ctx.stroke();

    // Baby Head & Laughing Face
    ctx.fillStyle = '#FED7AA';
    ctx.beginPath();
    ctx.arc(bx, by - 50, 23, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(bx - 11, by - 69);
    ctx.quadraticCurveTo(bx, by - 78, bx + 11, by - 69);
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(bx - 8, by - 51, 2.8, 0, Math.PI * 2);
    ctx.arc(bx + 8, by - 51, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
    ctx.beginPath();
    ctx.arc(bx - 14, by - 45, 4.5, 0, Math.PI * 2);
    ctx.arc(bx + 14, by - 45, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#9A3412';
    ctx.beginPath();
    ctx.arc(bx, by - 41, 5.5, 0, Math.PI);
    ctx.fill();

    // Name Badges
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    drawRoundedRect(ctx, 275, 456, 155, 24, 12);
    ctx.fill();
    drawRoundedRect(ctx, 520, 456, 140, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 11.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${parentName} (Nằm chơi)`, 352, 472);
    ctx.fillStyle = '#FDE047';
    ctx.fillText(`Bé ${babyName}`, 590, 472);
    ctx.textAlign = 'left';
  } else if (isCarryingBaby || isMultiRoomJourney) {
    // Parent Carrying Baby in Arms & Walking Across Rooms!
    const startX = isMultiRoomJourney ? 155 : 330;
    const endX = isMultiRoomJourney ? 790 : 610;
    const currentX = startX + (endX - startX) * localProgress;

    // Motion Trail Footsteps
    if (isMultiRoomJourney) {
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.35)';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(startX, floorY - 2);
      ctx.lineTo(currentX, floorY - 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawArticulatedAdultOnCanvas(ctx, {
      cx: currentX,
      floorY,
      isFemale: hasMother,
      shirtColor: hasMother ? '#EC4899' : '#1D4ED8',
      pantsColor: hasMother ? '#F8FAFC' : '#D97706',
      label: parentName,
      timeSec,
      isWalking: true,
      isSpeaking: isAudioActive,
      isHoldingBaby: true,
      babyName,
    });
  } else {
    // Standard / Kitchen / Interactive Multi-Character Scene
    const walkOffset = isWalkingAction ? (localProgress - 0.5) * 160 : 0;
    drawArticulatedAdultOnCanvas(ctx, {
      cx: 380 + walkOffset,
      floorY,
      isFemale: hasMother,
      shirtColor: hasMother ? '#EC4899' : '#1D4ED8',
      pantsColor: hasMother ? '#F8FAFC' : '#D97706',
      label: parentName,
      timeSec,
      isWalking: isWalkingAction,
      isSpeaking: isAudioActive,
      isCooking: isKitchen,
    });

    drawArticulatedChildOnCanvas(ctx, {
      cx: 585 + walkOffset * 0.85,
      floorY,
      label: `Bé ${babyName}`,
      timeSec,
      isWalking: isWalkingAction,
    });
  }

  // 4. Floating Warm Sunlight Dust Motes
  for (let m = 0; m < 8; m++) {
    const mx = ((m * 137 + timeSec * 22) % (width - 80)) + 40;
    const my = 90 + ((m * 79) % 240) + Math.sin(timeSec * 2 + m) * 12;
    ctx.fillStyle = 'rgba(254, 240, 138, 0.55)';
    ctx.beginPath();
    ctx.arc(mx, my, 2.5 + (m % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

const SHARED_AI_VIDEO_CACHE: Record<string, string> = {};
const SHARED_INFLIGHT_VIDEO_PROMISES: Record<string, Promise<string | null> | undefined> = {};

export default function FlowCanvasPlayer({
  scenes,
  activeSceneIndex = 0,
  mode,
  autoPlayTrigger = 0,
  onSceneChange,
  onSceneKeyframeUpgraded,
  onSceneVideoUpgraded,
}: FlowCanvasPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const domVideoRef = useRef<HTMLVideoElement | null>(null);
  const loadedImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const aiKeyframeCacheRef = useRef<Record<string, string>>({});
  const pendingKeyframeFetchRef = useRef<Record<string, boolean>>({});
  const videoElementsRef = useRef<Record<string, HTMLVideoElement>>({});
  const aiVideoCacheRef = useRef<Record<string, string>>({});
  const activeAudioElRef = useRef<HTMLAudioElement | null>(null);
  const bgmAudioCtxRef = useRef<AudioContext | null>(null);
  const ttsCacheRef = useRef<Record<string, string>>({});
  const lastSpokenSceneKeyRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isRecordingWebm, setIsRecordingWebm] = useState(false);
  const [imagesReadyTick, setImagesReadyTick] = useState(0);
  const [isSynthesizingTts, setIsSynthesizingTts] = useState(false);
  const [isSynthesizingAiVideo, setIsSynthesizingAiVideo] = useState(false);
  const [activeWavUrl, setActiveWavUrl] = useState<string | null>(null);
  const [activeMp4Url, setActiveMp4Url] = useState<string | null>(null);

  const clipSegments = React.useMemo(() => {
    const currentPlaylist =
      mode === 'single'
        ? scenes[activeSceneIndex]
          ? [scenes[activeSceneIndex]]
          : scenes.slice(0, 1)
        : scenes;

    let totalAccumulator = 0;
    const result = [];
    for (let idx = 0; idx < currentPlaylist.length; idx++) {
      const scene = currentPlaylist[idx];
      const dur = Math.max(
        1,
        Number(
          (
            (scene.postEdit.trimEndSec - scene.postEdit.trimStartSec) /
            scene.postEdit.playbackSpeed
          ).toFixed(2)
        )
      );
      result.push({
        scene,
        index: idx,
        startSec: totalAccumulator,
        endSec: totalAccumulator + dur,
        durationSec: dur,
      });
      totalAccumulator += dur;
    }
    return result;
  }, [mode, scenes, activeSceneIndex]);

  const totalDurationSec =
    clipSegments.length > 0
      ? Number(clipSegments[clipSegments.length - 1].endSec.toFixed(2))
      : 5;

  // Preload photo keyframes and auto-upgrade SVG scenes to real Gemini AI Cinema Keyframes
  useEffect(() => {
    const preloadUrl = (url: string) => {
      if (
        url &&
        !url.startsWith('data:image/svg+xml') &&
        !loadedImagesRef.current[url]
      ) {
        const img = new window.Image();
        if (!url.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
          img.referrerPolicy = 'no-referrer';
        }
        img.onload = () => {
          loadedImagesRef.current[url] = img;
          setImagesReadyTick((t) => t + 1);
        };
        img.src = url;
      }
    };

    scenes.forEach((scene) => {
      preloadUrl(scene.keyframeUrl);
      if (Array.isArray(scene.motionFrames)) {
        scene.motionFrames.forEach(preloadUrl);
      }
      if (scene.voiceoverAudioUrl) {
        ttsCacheRef.current[scene.id] = scene.voiceoverAudioUrl;
      }

      // If scene still has an SVG storyboard, automatically upgrade it via Gemini Image API
      const cacheKey = `${scene.id}-take-${scene.currentTake}`;
      if (
        scene.keyframeUrl?.startsWith('data:image/svg+xml') &&
        !aiKeyframeCacheRef.current[cacheKey] &&
        !pendingKeyframeFetchRef.current[cacheKey]
      ) {
        pendingKeyframeFetchRef.current[cacheKey] = true;
        fetch('/api/flow/keyframe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sceneNumber: scene.sceneNumber,
            location: scene.location,
            timeOfDay: scene.timeOfDay,
            narrativeBeat: scene.narrativeBeat,
            dialogue: scene.dialogue,
            takeNumber: scene.currentTake,
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (
              data?.isAiKeyframe &&
              typeof data?.keyframeUrl === 'string' &&
              !data.keyframeUrl.startsWith('data:image/svg+xml')
            ) {
              aiKeyframeCacheRef.current[cacheKey] = data.keyframeUrl;
              preloadUrl(data.keyframeUrl);
              onSceneKeyframeUpgraded?.(scene.id, data.keyframeUrl);
            }
          })
          .catch(() => {
            // Keep procedural fallback if offline
          })
          .finally(() => {
            pendingKeyframeFetchRef.current[cacheKey] = false;
          });
      }
    });
  }, [scenes, onSceneKeyframeUpgraded]);

  const stopAmbientBgm = useCallback(() => {
    if (bgmAudioCtxRef.current) {
      try {
        void bgmAudioCtxRef.current.close();
      } catch {
        // Ignore AudioContext close error
      }
      bgmAudioCtxRef.current = null;
    }
  }, []);

  const startAmbientBgmForScene = useCallback(
    (scene: SceneNode) => {
      if (isMuted || typeof window === 'undefined') return;
      stopAmbientBgm();

      const bgmVol = (scene.postEdit.bgmVolume ?? 45) / 100;
      if (bgmVol <= 0.02) return;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      try {
        const ctx = new AudioCtx();
        bgmAudioCtxRef.current = ctx;
        const asset = ROYALTY_FREE_AUDIO_LIBRARY.find(
          (a) => a.id === scene.postEdit.bgmTrackId
        );
        const baseFreq = asset?.synthProfile.baseFreq || 220;
        const ratios = asset?.synthProfile.chordRatios || [1, 1.25, 1.5];
        const waveType = asset?.synthProfile.waveform || 'sine';

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
        masterGain.gain.exponentialRampToValueAtTime(
          Math.min(0.1, bgmVol * 0.12),
          ctx.currentTime + 0.4
        );
        masterGain.connect(ctx.destination);

        ratios.slice(0, 3).forEach((ratio, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = idx === 2 ? 'sine' : waveType;
          osc.frequency.setValueAtTime(baseFreq * ratio, ctx.currentTime);
          oscGain.gain.setValueAtTime(idx === 0 ? 0.5 : 0.25, ctx.currentTime);
          osc.connect(oscGain);
          oscGain.connect(masterGain);
          osc.start();
        });
      } catch {
        // Ignore Web Audio API errors
      }
    },
    [isMuted, stopAmbientBgm]
  );

  const stopSpeech = useCallback(() => {
    stopAmbientBgm();
    if (activeAudioElRef.current) {
      try {
        activeAudioElRef.current.pause();
        activeAudioElRef.current.currentTime = 0;
      } catch {
        // Ignore audio pause errors
      }
      activeAudioElRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore speech synthesis errors
      }
    }
  }, [stopAmbientBgm]);

  const playBrowserSpeechFallback = useCallback(
    (cleanText: string, scene: SceneNode) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          const voices = window.speechSynthesis.getVoices();
          const viVoice = voices.find(
            (v) =>
              v.lang.startsWith('vi') ||
              v.lang.includes('VN') ||
              v.name.toLowerCase().includes('viet')
          );
          if (viVoice) {
            utterance.voice = viVoice;
          }
          utterance.lang = 'vi-VN';
          utterance.rate = Math.max(
            0.85,
            Math.min(1.25, scene.postEdit.playbackSpeed || 1)
          );
          utterance.volume = Math.max(
            0,
            Math.min(1, (scene.postEdit.voiceoverVolume ?? 90) / 100)
          );
          window.speechSynthesis.speak(utterance);
        } catch {
          // Ignore fallback errors
        }
      }
    },
    []
  );

  const getEffectiveSpokenDialogue = useCallback((scene: SceneNode): string => {
    const rawDialogue =
      scene.dialogue || scene.postEdit.subtitleText || '';
    const cleanBeat = cleanSpokenDialogueText(scene.narrativeBeat || '');
    if (isStageDirectionInsteadOfDialogue(rawDialogue, cleanBeat)) {
      return generateNaturalActingDialogue(
        cleanBeat,
        scene.location,
        [],
        scene.sceneNumber
      );
    }
    return cleanSpokenDialogueText(rawDialogue);
  }, []);

  const speakSceneDialogue = useCallback(
    async (scene: SceneNode) => {
      if (isMuted) return;
      stopSpeech();
      startAmbientBgmForScene(scene);

      const cleanText = getEffectiveSpokenDialogue(scene);
      if (!cleanText) return;

      const playWavDataUrl = (wavUrl: string) => {
        try {
          setActiveWavUrl(wavUrl);
          const audio = new window.Audio(wavUrl);
          audio.volume = Math.max(
            0,
            Math.min(1, (scene.postEdit.voiceoverVolume ?? 92) / 100)
          );
          audio.playbackRate = scene.postEdit.playbackSpeed || 1;
          activeAudioElRef.current = audio;
          audio.play().catch(() => {
            playBrowserSpeechFallback(cleanText, scene);
          });
        } catch {
          playBrowserSpeechFallback(cleanText, scene);
        }
      };

      const existingWav =
        scene.voiceoverAudioUrl || ttsCacheRef.current[scene.id];
      if (
        existingWav &&
        !isStageDirectionInsteadOfDialogue(scene.dialogue, scene.narrativeBeat)
      ) {
        playWavDataUrl(existingWav);
        return;
      }

      // Synthesize real Gemini TTS WAV audio on demand using natural acting dialogue
      setIsSynthesizingTts(true);
      try {
        const res = await fetch('/api/flow/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            voicePersona: scene.audioPrompt,
          }),
        });
        const data = await res.json();
        if (res.ok && typeof data?.audioDataUrl === 'string') {
          ttsCacheRef.current[scene.id] = data.audioDataUrl;
          playWavDataUrl(data.audioDataUrl);
        } else {
          playBrowserSpeechFallback(cleanText, scene);
        }
      } catch {
        playBrowserSpeechFallback(cleanText, scene);
      } finally {
        setIsSynthesizingTts(false);
      }
    },
    [
      isMuted,
      stopSpeech,
      startAmbientBgmForScene,
      getEffectiveSpokenDialogue,
      playBrowserSpeechFallback,
    ]
  );

  const loadVideoElement = useCallback((cacheKey: string, mp4Url: string) => {
    if (!mp4Url || typeof window === 'undefined') return;
    SHARED_AI_VIDEO_CACHE[cacheKey] = mp4Url;
    aiVideoCacheRef.current[cacheKey] = mp4Url;
    setActiveMp4Url(mp4Url);
    if (!videoElementsRef.current[cacheKey]) {
      const vid = document.createElement('video');
      vid.src = mp4Url;
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.crossOrigin = 'anonymous';
      vid.onloadeddata = () => {
        setImagesReadyTick((t) => t + 1);
        setCurrentTimeSec(0);
        setIsPlaying(true);
        void vid.play().catch(() => {});
      };
      videoElementsRef.current[cacheKey] = vid;
    } else {
      setCurrentTimeSec(0);
      setIsPlaying(true);
      void videoElementsRef.current[cacheKey].play().catch(() => {});
    }
  }, []);

  const synthesizeAiVideoForScene = useCallback(
    async (scene: SceneNode) => {
      const cacheKey = `${scene.id}-take-${scene.currentTake}`;
      const existingMp4 =
        scene.videoClipUrl ||
        SHARED_AI_VIDEO_CACHE[cacheKey] ||
        aiVideoCacheRef.current[cacheKey];
      if (existingMp4) {
        loadVideoElement(cacheKey, existingMp4);
        return;
      }

      setIsSynthesizingAiVideo(true);
      try {
        if (!SHARED_INFLIGHT_VIDEO_PROMISES[cacheKey]) {
          SHARED_INFLIGHT_VIDEO_PROMISES[cacheKey] = fetch('/api/flow/video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sceneNumber: scene.sceneNumber,
              location: scene.location,
              timeOfDay: scene.timeOfDay,
              narrativeBeat: scene.narrativeBeat,
              dialogue: scene.dialogue,
              takeNumber: scene.currentTake,
            }),
          })
            .then(async (res) => {
              const data = await res.json();
              if (res.ok && typeof data?.videoClipUrl === 'string') {
                return data.videoClipUrl as string;
              }
              return null;
            })
            .catch(() => null)
            .finally(() => {
              delete SHARED_INFLIGHT_VIDEO_PROMISES[cacheKey];
            });
        }

        const mp4Url = await SHARED_INFLIGHT_VIDEO_PROMISES[cacheKey];
        if (mp4Url) {
          loadVideoElement(cacheKey, mp4Url);
          onSceneVideoUpgraded?.(scene.id, mp4Url);
        }
      } finally {
        setIsSynthesizingAiVideo(false);
      }
    },
    [loadVideoElement, onSceneVideoUpgraded]
  );

  // When activeSceneIndex changes in single mode, reset scrubber to 0 and automatically synthesize/load real MP4 video
  useEffect(() => {
    if (mode !== 'single') return;
    lastSpokenSceneKeyRef.current = null;
    const activeScene = scenes[activeSceneIndex];
    const cacheKey = activeScene
      ? `${activeScene.id}-take-${activeScene.currentTake}`
      : '';
    const cachedWav =
      activeScene?.voiceoverAudioUrl ||
      (activeScene ? ttsCacheRef.current[activeScene.id] : null) ||
      null;
    const cachedMp4 =
      activeScene?.videoClipUrl ||
      (cacheKey
        ? SHARED_AI_VIDEO_CACHE[cacheKey] || aiVideoCacheRef.current[cacheKey]
        : null) ||
      null;
    if (cacheKey && cachedMp4) {
      loadVideoElement(cacheKey, cachedMp4);
    } else if (activeScene) {
      void synthesizeAiVideoForScene(activeScene);
    }
    const rafId = requestAnimationFrame(() => {
      setCurrentTimeSec(0);
      setActiveWavUrl(cachedWav);
      setActiveMp4Url(cachedMp4);
    });
    return () => cancelAnimationFrame(rafId);
  }, [
    activeSceneIndex,
    mode,
    scenes,
    loadVideoElement,
    synthesizeAiVideoForScene,
  ]);

  // When autoPlayTrigger increments (e.g. clicking "Xem cảnh"), immediately play from 0s and synthesize real MP4 if needed!
  useEffect(() => {
    if (autoPlayTrigger <= 0 || clipSegments.length === 0) return;
    lastSpokenSceneKeyRef.current = null;
    const firstSeg = clipSegments[0];
    if (firstSeg) {
      void speakSceneDialogue(firstSeg.scene);
      void synthesizeAiVideoForScene(firstSeg.scene);
      lastSpokenSceneKeyRef.current = `${firstSeg.scene.id}-0`;
    }
    const rafId = requestAnimationFrame(() => {
      setCurrentTimeSec(0);
      setIsPlaying(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, [
    autoPlayTrigger,
    clipSegments,
    speakSceneDialogue,
    synthesizeAiVideoForScene,
  ]);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  // Draw frame to canvas with real MP4 Video (Gemini Omni 1.2 Flash), AI Cinema Keyframe (Gemini Flash Image), or 24fps procedural animation
  const drawFrame = useCallback(
    (timeSec: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      const activeSeg =
        clipSegments.find(
          (seg) => timeSec >= seg.startSec && timeSec <= seg.endSec
        ) ||
        clipSegments[clipSegments.length - 1] ||
        null;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      if (!activeSeg) {
        ctx.fillStyle = '#090D16';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        return;
      }

      const { scene, startSec, durationSec } = activeSeg;
      const localProgress = Math.min(
        1,
        Math.max(0, (timeSec - startSec) / Math.max(0.1, durationSec))
      );

      // Determine Action Beats for choreography
      const actionBeats =
        scene.actionBeats && scene.actionBeats.length > 0
          ? scene.actionBeats
          : extractSceneActionBeats(scene.narrativeBeat, scene.location);
      const beatCount = Math.max(1, actionBeats.length);
      const currentBeatIndex = Math.min(
        beatCount - 1,
        Math.floor(localProgress * beatCount)
      );
      const currentBeatText =
        actionBeats[currentBeatIndex] || scene.narrativeBeat;

      // Apply color grade filter
      ctx.filter = GRADE_FILTERS[scene.postEdit.colorGrade] || 'none';

      const cacheKey = `${scene.id}-take-${scene.currentTake}`;
      const hasMp4ForScene = Boolean(
        scene.videoClipUrl ||
          SHARED_AI_VIDEO_CACHE[cacheKey] ||
          aiVideoCacheRef.current[cacheKey] ||
          activeMp4Url
      );
      const videoEl =
        domVideoRef.current || videoElementsRef.current[cacheKey];

      // Tier 1: Real AI MP4 Video from Gemini Omni 1.2 Flash (Interactions API)
      if (hasMp4ForScene && mode === 'single' && !isRecordingWebm) {
        // Leave center canvas transparent so the native HTML5 <video> element underneath shines through at 60fps!
        ctx.clearRect(0, 0, width, height);
      } else if (videoEl && videoEl.readyState >= 2) {
        if (isPlaying && videoEl.paused) {
          void videoEl.play().catch(() => {});
        } else if (!isPlaying && !videoEl.paused) {
          videoEl.pause();
        }
        ctx.drawImage(videoEl, 0, 0, width, height);
      } else {
        ctx.fillStyle = '#090D16';
        ctx.fillRect(0, 0, width, height);
        // Tier 2: Real AI Cinema Keyframe (from Gemini Image API) with 24fps camera motion
        const effectivePhotoUrl =
          aiKeyframeCacheRef.current[cacheKey] || scene.keyframeUrl;
        const isExternalPhoto =
          effectivePhotoUrl &&
          !effectivePhotoUrl.startsWith('data:image/svg+xml');
        const photoImg = isExternalPhoto
          ? loadedImagesRef.current[effectivePhotoUrl]
          : null;

        if (photoImg && photoImg.complete && photoImg.naturalWidth > 0) {
          const zoomFactor = 1.05 + localProgress * 0.12;
          const panDirection =
            (scene.sceneNumber + scene.currentTake) % 2 === 1 ? 1 : -1;
          const panOffsetX = panDirection * (localProgress - 0.5) * 54;
          ctx.save();
          ctx.translate(width / 2 + panOffsetX, height / 2);
          ctx.scale(zoomFactor, zoomFactor);
          ctx.drawImage(photoImg, -width / 2, -height / 2, width, height);
          ctx.restore();
        } else {
          // Tier 3: Instant 24fps Procedural 2.5D Preview while AI image/video loads
          renderLiveProceduralCinemaScene(
            ctx,
            width,
            height,
            scene,
            localProgress,
            timeSec,
            isPlaying && !isMuted
          );
        }
      }

      ctx.filter = 'none';

      // Transition effect at start/end of clip
      if (scene.postEdit.transition === 'dip-to-black' && localProgress < 0.14) {
        const alpha = 1 - localProgress / 0.14;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(2)})`;
        ctx.fillRect(0, 0, width, height);
      } else if (
        scene.postEdit.transition === 'cross-dissolve' &&
        localProgress < 0.12
      ) {
        const alpha = (1 - localProgress / 0.12) * 0.45;
        ctx.fillStyle = `rgba(15, 23, 42, ${alpha.toFixed(2)})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Cinematic letterbox bars
      const barHeight = 28;
      ctx.fillStyle = 'rgba(5, 8, 15, 0.92)';
      ctx.fillRect(0, 0, width, barHeight);
      ctx.fillRect(0, height - barHeight, width, barHeight);

      // Action Beat Director Pill (Top-Left below letterbox) showing live visual action progression
      if (currentBeatText) {
        const pillY = 36;
        const cleanBeatLabel = `🎬 NHỊP DIỄN ${currentBeatIndex + 1}/${beatCount}: ${currentBeatText.slice(0, 68)}`;
        ctx.font = '600 11.5px sans-serif';
        const textWidth = Math.min(
          580,
          ctx.measureText(cleanBeatLabel).width + 24
        );
        ctx.fillStyle = 'rgba(9, 13, 22, 0.86)';
        drawRoundedRect(ctx, 18, pillY, textWidth, 26, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#38BDF8';
        ctx.textAlign = 'left';
        ctx.fillText(cleanBeatLabel, 28, pillY + 17);
      }

      // Live Audio Spectrum Visualizer when playing
      if (isPlaying && !isMuted) {
        const specX = width - 118;
        const specY = 40;
        ctx.fillStyle = 'rgba(9, 13, 22, 0.84)';
        drawRoundedRect(ctx, specX - 8, specY - 4, 108, 26, 6);
        ctx.fill();
        for (let b = 0; b < 12; b++) {
          const wave = Math.abs(Math.sin(timeSec * 9 + b * 0.75)) * 14 + 3;
          ctx.fillStyle = b % 2 === 0 ? '#10B981' : '#F59E0B';
          ctx.fillRect(specX + b * 8, specY + 18 - wave, 5, wave);
        }
      }

      // Bottom scrim for subtitle contrast
      const scrim = ctx.createLinearGradient(
        0,
        height - 125,
        0,
        height - barHeight
      );
      scrim.addColorStop(0, 'rgba(0, 0, 0, 0)');
      scrim.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, height - 125, width, 97);

      // Top HUD metadata overlay
      ctx.fillStyle = 'rgba(226, 232, 240, 0.95)';
      ctx.font = '600 12px monospace';
      const tcMins = String(Math.floor(timeSec / 60)).padStart(2, '0');
      const tcSecs = String(Math.floor(timeSec % 60)).padStart(2, '0');
      const tcFrames = String(Math.floor((timeSec % 1) * 24)).padStart(2, '0');
      ctx.fillText(
        `${isPlaying ? '▶ ĐANG PHÁT · ' : '⏸ TẠM DỪNG · '}CẢNH 0${scene.sceneNumber} (${scene.location}) · TAKE v${scene.currentTake}`,
        18,
        18
      );
      ctx.textAlign = 'right';
      ctx.fillText(
        `TC 00:${tcMins}:${tcSecs}:${tcFrames} / 24FPS`,
        width - 18,
        18
      );
      ctx.textAlign = 'left';

      // Natural Acting Dialogue Subtitle rendering
      const subtitle = getEffectiveSpokenDialogue(scene);
      if (subtitle) {
        ctx.font = '600 16px sans-serif';
        ctx.fillStyle = '#F8FAFC';
        ctx.textAlign = 'center';
        const maxWidth = width - 96;
        const words = subtitle.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        words.forEach((word) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (ctx.measureText(testLine).width > maxWidth) {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) lines.push(currentLine);

        lines.slice(0, 2).forEach((line, i) => {
          const y =
            height -
            barHeight -
            16 -
            (lines.slice(0, 2).length - 1 - i) * 22;
          ctx.fillStyle = 'rgba(0,0,0,0.9)';
          ctx.fillText(line, width / 2 + 1, y + 1);
          ctx.fillStyle = '#FDE047';
          ctx.fillText(line, width / 2, y);
        });
        ctx.textAlign = 'left';
      }

      // Continuity lock watermark at bottom letterbox
      ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
      ctx.font = '400 11px monospace';
      ctx.fillText(
        scene.continuityState.characterAnchorLock,
        18,
        height - 10
      );

      // Playback progress bar along bottom letterbox top edge
      ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
      ctx.fillRect(
        0,
        height - barHeight,
        width * Math.min(1, timeSec / Math.max(0.1, totalDurationSec)),
        3
      );

      ctx.restore();
    },
    [
      clipSegments,
      isPlaying,
      isMuted,
      totalDurationSec,
      getEffectiveSpokenDialogue,
      activeMp4Url,
      mode,
      isRecordingWebm,
    ]
  );

  useEffect(() => {
    drawFrame(currentTimeSec);
  }, [currentTimeSec, drawFrame, scenes, imagesReadyTick]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      setCurrentTimeSec((prev) => {
        const next = prev + deltaSec;
        if (next >= totalDurationSec) {
          if (mode === 'single') {
            // Loop continuously in single-scene monitor so the MP4 video keeps playing
            return 0;
          }
          setIsPlaying(false);
          stopSpeech();
          return 0;
        }
        const seg = clipSegments.find(
          (s) => next >= s.startSec && next <= s.endSec
        );
        if (seg) {
          const sceneKey = `${seg.scene.id}-${seg.index}`;
          if (lastSpokenSceneKeyRef.current !== sceneKey) {
            lastSpokenSceneKeyRef.current = sceneKey;
            void speakSceneDialogue(seg.scene);
            if (onSceneChange && mode === 'master') {
              onSceneChange(seg.index);
            }
          }
        }
        return next;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    isPlaying,
    totalDurationSec,
    clipSegments,
    speakSceneDialogue,
    stopSpeech,
    onSceneChange,
    mode,
  ]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopSpeech();
      if (domVideoRef.current) {
        domVideoRef.current.pause();
      }
    } else {
      const startFrom =
        currentTimeSec >= totalDurationSec - 0.1 ? 0 : currentTimeSec;
      setCurrentTimeSec(startFrom);
      const activeSeg =
        clipSegments.find(
          (s) => startFrom >= s.startSec && startFrom <= s.endSec
        ) || clipSegments[0];
      if (activeSeg) {
        lastSpokenSceneKeyRef.current = `${activeSeg.scene.id}-${activeSeg.index}`;
        void speakSceneDialogue(activeSeg.scene);
        void synthesizeAiVideoForScene(activeSeg.scene);
      }
      setIsPlaying(true);
      if (domVideoRef.current) {
        void domVideoRef.current.play().catch(() => {});
      }
    }
  };

  const handleDownloadWav = () => {
    const seg =
      clipSegments.find(
        (s) => currentTimeSec >= s.startSec && currentTimeSec <= s.endSec
      ) || clipSegments[0];
    const wavUrl =
      activeWavUrl ||
      seg?.scene.voiceoverAudioUrl ||
      (seg ? ttsCacheRef.current[seg.scene.id] : null);
    if (!wavUrl) return;
    const a = document.createElement('a');
    a.href = wavUrl;
    a.download = `flow-voiceover-canh-0${seg?.scene.sceneNumber || 1}.wav`;
    a.click();
  };

  const handleExportWebm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecordingWebm) return;

    if (
      typeof canvas.captureStream !== 'function' ||
      typeof MediaRecorder === 'undefined'
    ) {
      return;
    }

    setIsRecordingWebm(true);
    setCurrentTimeSec(0);
    setIsPlaying(true);

    try {
      const stream = canvas.captureStream(24);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
      });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `google-flow-master-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecordingWebm(false);
      };
      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 2500);
    } catch {
      setIsRecordingWebm(false);
    }
  };

  const activeSegment =
    clipSegments.find(
      (s) => currentTimeSec >= s.startSec && currentTimeSec <= s.endSec
    ) || clipSegments[0];

  const currentSceneWav =
    activeWavUrl || activeSegment?.scene.voiceoverAudioUrl || null;
  const activeCacheKey = activeSegment
    ? `${activeSegment.scene.id}-take-${activeSegment.scene.currentTake}`
    : '';
  const currentSceneMp4 =
    activeMp4Url ||
    activeSegment?.scene.videoClipUrl ||
    (activeCacheKey
      ? SHARED_AI_VIDEO_CACHE[activeCacheKey] ||
        aiVideoCacheRef.current[activeCacheKey]
      : null) ||
    null;

  const handleDownloadMp4 = () => {
    if (!currentSceneMp4) return;
    const a = document.createElement('a');
    a.href = currentSceneMp4;
    a.download = `gemini-omni-video-canh-0${activeSegment?.scene.sceneNumber || 1}.mp4`;
    a.click();
  };

  return (
    <div className="bg-[#0F1522] border border-slate-800 rounded-lg overflow-hidden">
      <div
        onClick={handleTogglePlay}
        title={isPlaying ? 'Nhấn để tạm dừng' : 'Nhấn để phát video cảnh này'}
        className="relative aspect-video bg-[#070A10] flex items-center justify-center cursor-pointer group overflow-hidden"
      >
        {currentSceneMp4 && mode === 'single' && (
          <video
            key={currentSceneMp4}
            ref={domVideoRef}
            src={currentSceneMp4}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        )}
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          data-testid="flow-video-canvas"
          className="relative z-10 w-full h-full object-contain"
        />
        {isSynthesizingAiVideo && !currentSceneMp4 && (
          <div className="absolute top-12 right-3 z-20 px-3 py-1.5 rounded-md bg-sky-950/90 border border-sky-400/80 text-sky-200 text-[11px] font-mono flex items-center gap-2 pointer-events-none shadow-lg animate-pulse">
            <span>🎥 Đang kết xuất Video MP4 động (Gemini Omni 1.2 ~35s)...</span>
          </div>
        )}
        {currentSceneMp4 && (
          <div className="absolute top-12 right-3 z-20 px-2.5 py-1 rounded-md bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 text-[11px] font-mono flex items-center gap-1.5 pointer-events-none shadow-lg">
            <span>✨ VIDEO MP4 ĐỘNG (Gemini Omni 1.2 Flash)</span>
          </div>
        )}
        {!isPlaying && !currentSceneMp4 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Player Controls Bar */}
      <div className="px-4 py-3 border-t border-slate-800/80 flex flex-col gap-2.5 bg-[#0C111C]">
        {/* Timeline Scrubber */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tabular-nums text-slate-400 w-12">
            {currentTimeSec.toFixed(1)}s
          </span>
          <input
            type="range"
            aria-label="Thanh tua thời gian video"
            min={0}
            max={totalDurationSec}
            step={0.1}
            value={Math.min(currentTimeSec, totalDurationSec)}
            onChange={(e) => {
              setIsPlaying(false);
              stopSpeech();
              setCurrentTimeSec(Number(e.target.value));
            }}
            className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <span className="text-xs font-mono tabular-nums text-slate-400 w-12 text-right">
            {totalDurationSec.toFixed(1)}s
          </span>
        </div>

        {/* Transport Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Tạm dừng</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>
                    {mode === 'master'
                      ? 'Phát bản ghép hoàn chỉnh'
                      : 'Phát cảnh này'}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                stopSpeech();
                setCurrentTimeSec(0);
              }}
              aria-label="Đưa về đầu video"
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 rounded-md transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {mode === 'master' && clipSegments.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const prevIdx = Math.max(
                      0,
                      (activeSegment?.index || 0) - 1
                    );
                    setCurrentTimeSec(clipSegments[prevIdx].startSec);
                    onSceneChange?.(prevIdx);
                  }}
                  aria-label="Cảnh trước"
                  className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 rounded-md transition-colors"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = Math.min(
                      clipSegments.length - 1,
                      (activeSegment?.index || 0) + 1
                    );
                    setCurrentTimeSec(clipSegments[nextIdx].startSec);
                    onSceneChange?.(nextIdx);
                  }}
                  aria-label="Cảnh tiếp theo"
                  className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 rounded-md transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsMuted((m) => {
                  const next = !m;
                  if (next) stopSpeech();
                  return next;
                });
              }}
              aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 rounded-md transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-slate-300" />
              )}
            </button>

            {isSynthesizingTts && (
              <span className="text-[11px] text-amber-300 font-mono animate-pulse">
                Đang tạo giọng diễn xuất AI (Gemini TTS)...
              </span>
            )}
            {isSynthesizingAiVideo && (
              <span className="text-[11px] text-sky-300 font-mono animate-pulse">
                Đang dựng Video MP4 thật (Gemini Omni 1.2 ~35s)...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeSegment && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                <span>Cảnh {activeSegment.scene.sceneNumber}</span>
                <span aria-hidden="true">·</span>
                <span>Take v{activeSegment.scene.currentTake}</span>
                <span aria-hidden="true">·</span>
                <span>{activeSegment.scene.postEdit.transition}</span>
              </div>
            )}

            {currentSceneMp4 ? (
              <button
                type="button"
                onClick={handleDownloadMp4}
                className="px-2.5 py-1.5 border border-sky-600/80 hover:border-sky-400 bg-sky-950/40 text-sky-300 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Video AI (.mp4)</span>
              </button>
            ) : (
              activeSegment && (
                <button
                  type="button"
                  disabled={isSynthesizingAiVideo}
                  onClick={() => void synthesizeAiVideoForScene(activeSegment.scene)}
                  className="px-2.5 py-1.5 border border-sky-600/80 hover:border-sky-400 bg-sky-950/40 text-sky-300 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <Film className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {isSynthesizingAiVideo
                      ? 'Đang dựng MP4...'
                      : 'Dựng Video AI (.mp4)'}
                  </span>
                </button>
              )
            )}

            {currentSceneWav && (
              <button
                type="button"
                onClick={handleDownloadWav}
                className="px-2.5 py-1.5 border border-emerald-700/70 hover:border-emerald-500 bg-emerald-950/30 text-emerald-300 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Audio (.wav)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportWebm}
              disabled={isRecordingWebm}
              className="px-3 py-1.5 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isRecordingWebm
                  ? 'Đang kết xuất WebM...'
                  : 'Kết xuất Video (.webm)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
