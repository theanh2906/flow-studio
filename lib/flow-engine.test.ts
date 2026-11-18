import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_CHARACTERS,
  INITIAL_SCRIPT,
  ROYALTY_FREE_AUDIO_LIBRARY,
  parseScriptIntoScenes,
  triggerSelectiveRegeneration,
  computeProductionProgress,
  compareProjectVersions,
  exportTimelineToSRT,
  exportTimelineToEDL,
  createInitialVersions,
  analyzeScriptQuality,
  applyCritiqueSuggestionToState,
  assignAudioAssetToScene,
  parseRawScriptToStructuredTimeline,
  convertIngestedTimelineToSceneNodes,
  GOOGLE_FLOW_CHARACTER_PRESETS,
  parseUploadedCharacterJson,
  generateContinuityTokenForCharacter,
} from './flow-engine.ts';

test('parseScriptIntoScenes splits script into 4 sequential scenes with continuous character locks', () => {
  const scenes = parseScriptIntoScenes(INITIAL_SCRIPT, INITIAL_CHARACTERS);
  assert.equal(scenes.length, 4);

  assert.equal(scenes[0].sceneNumber, 1);
  assert.equal(scenes[0].continuityState.inheritedFromScene, null);
  assert.ok(
    scenes[0].continuityState.characterAnchorLock.includes('CHAR_LOCK::LINH_A1')
  );

  assert.equal(scenes[1].sceneNumber, 2);
  assert.equal(scenes[1].continuityState.inheritedFromScene, 1);
  assert.ok(
    scenes[1].continuityState.characterAnchorLock.includes('CHAR_LOCK::LINH_A1')
  );
  assert.ok(
    scenes[1].continuityState.characterAnchorLock.includes('CHAR_LOCK::MINH_B2')
  );

  assert.equal(scenes[3].continuityState.inheritedFromScene, 3);
  assert.equal(scenes[3].continuityState.consistencyVerified, true);
});

test('analyzeScriptQuality generates plot coherence, dialogue naturalness, and scene pacing suggestions and applies them cleanly', () => {
  const scenes = parseScriptIntoScenes(INITIAL_SCRIPT, INITIAL_CHARACTERS);
  const report = analyzeScriptQuality(
    INITIAL_SCRIPT,
    scenes,
    INITIAL_CHARACTERS
  );

  assert.ok(report.suggestions.length >= 3);
  const hasPlot = report.suggestions.some(
    (s) => s.dimension === 'plot_coherence'
  );
  const hasDialogue = report.suggestions.some(
    (s) => s.dimension === 'dialogue_naturalness'
  );
  const hasPacing = report.suggestions.some(
    (s) => s.dimension === 'scene_pacing'
  );
  assert.equal(hasPlot, true);
  assert.equal(hasDialogue, true);
  assert.equal(hasPacing, true);

  const dialogueSuggestion = report.suggestions.find(
    (s) => s.dimension === 'dialogue_naturalness' && s.sceneNumber === 2
  )!;
  const updatedScenes = applyCritiqueSuggestionToState(
    scenes,
    INITIAL_CHARACTERS,
    dialogueSuggestion
  );
  assert.equal(updatedScenes[1].dialogue, dialogueSuggestion.suggestedRewrite);
  assert.equal(
    updatedScenes[1].postEdit.subtitleText,
    dialogueSuggestion.suggestedRewrite
  );
});

test('assignAudioAssetToScene updates BGM and SFX tracks on targeted or all scenes', () => {
  const scenes = parseScriptIntoScenes(INITIAL_SCRIPT, INITIAL_CHARACTERS);
  const sfxAsset = ROYALTY_FREE_AUDIO_LIBRARY.find(
    (a) => a.category === 'sfx' && a.id === 'sfx-cinematic-whoosh'
  )!;
  const bgmAsset = ROYALTY_FREE_AUDIO_LIBRARY.find(
    (a) => a.category === 'bgm' && a.id === 'bgm-twilight-ovations'
  )!;

  const withSfxOnScene1 = assignAudioAssetToScene(scenes, 'scene-1', sfxAsset);
  assert.equal(withSfxOnScene1[0].postEdit.sfxTrackId, 'sfx-cinematic-whoosh');
  assert.notEqual(
    withSfxOnScene1[1].postEdit.sfxTrackId,
    'sfx-cinematic-whoosh'
  );

  const withBgmOnAll = assignAudioAssetToScene(
    withSfxOnScene1,
    'all',
    bgmAsset
  );
  assert.equal(withBgmOnAll[0].postEdit.bgmTrackId, 'bgm-twilight-ovations');
  assert.equal(withBgmOnAll[3].postEdit.bgmTrackId, 'bgm-twilight-ovations');
});

test('triggerSelectiveRegeneration updates only targeted scenes and preserves untouched scenes', () => {
  const scenes = parseScriptIntoScenes(INITIAL_SCRIPT, INITIAL_CHARACTERS).map(
    (s) => ({
      ...s,
      reviewStatus: 'approved' as const,
    })
  );

  const updated = triggerSelectiveRegeneration(
    scenes,
    ['scene-2'],
    {
      'scene-2': {
        videoPrompt: 'Custom regenerated prompt for Scene 2',
      },
    },
    '2026-11-03 14:00'
  );

  assert.equal(updated[0].currentTake, 1);
  assert.equal(updated[0].reviewStatus, 'approved');
  assert.equal(updated[1].currentTake, 2);
  assert.equal(updated[1].takes.length, 2);
  assert.equal(updated[1].reviewStatus, 'pending_review');
  assert.equal(updated[1].videoPrompt, 'Custom regenerated prompt for Scene 2');
});

test('computeProductionProgress and compareProjectVersions work accurately', () => {
  const { versions } = createInitialVersions();
  const [v1, v1_1] = versions;

  const diff = compareProjectVersions(v1, v1_1);
  assert.equal(diff.baseVersionTag, 'v1.0');
  assert.equal(diff.targetVersionTag, 'v1.1');
  assert.ok(diff.modifiedScenesCount >= 2);
  assert.equal(diff.totalDurationDeltaSec, 1);

  const srt = exportTimelineToSRT(v1.scenes);
  const edl = exportTimelineToEDL('TVC Ky Nguyen So', v1.scenes);
  assert.ok(srt.includes('00:00:00,000 --> 00:00:05,000'));
  assert.ok(edl.includes('AUDIO BGM:'));
});

test('parseRawScriptToStructuredTimeline extracts character, location, and action metadata into a structured timeline', () => {
  const screenplayRaw = `INT. LAB CÔNG NGHỆ CAO - BUỔI SÁNG
Linh kiểm tra thông số kiến trúc trên bảng điều khiển. Ánh nắng ban mai rọi qua cửa kính.
Thoại Linh: "Mọi dòng chảy dữ liệu đều bắt đầu từ đây."

EXT. SÂN THƯỢNG TOÀN CẢNH - HOÀNG HÔN
Minh và Linh quan sát đường chân trời thành phố. Cơn gió nhẹ lướt qua vườn treo.
Thoại Minh: "Hệ thống đã sẵn sàng vận hành."`;

  const result = parseRawScriptToStructuredTimeline(
    screenplayRaw,
    INITIAL_CHARACTERS
  );

  assert.equal(result.detectedFormat, 'screenplay_fountain');
  assert.equal(result.timeline.length, 2);

  // Scene 1 metadata
  const scene1 = result.timeline[0];
  assert.equal(scene1.sceneNumber, 1);
  assert.equal(scene1.location.intExt, 'INT');
  assert.equal(scene1.location.settingName, 'LAB CÔNG NGHỆ CAO');
  assert.equal(scene1.location.timeOfDay, 'BUỔI SÁNG');
  assert.ok(scene1.location.lightingMood.length > 0);
  assert.ok(scene1.actions.length >= 1);
  assert.ok(scene1.actions[0].cameraMovement.length > 0);
  assert.equal(scene1.characters[0].name, 'Linh');
  assert.equal(scene1.dialogueLines[0].speaker, 'Linh');
  assert.equal(
    scene1.dialogueLines[0].text,
    'Mọi dòng chảy dữ liệu đều bắt đầu từ đây.'
  );

  // Scene 2 metadata
  const scene2 = result.timeline[1];
  assert.equal(scene2.sceneNumber, 2);
  assert.equal(scene2.location.intExt, 'EXT');
  assert.equal(scene2.location.settingName, 'SÂN THƯỢNG TOÀN CẢNH');
  assert.equal(scene2.location.timeOfDay, 'HOÀNG HÔN');
  assert.ok(scene2.characters.some((c) => c.name === 'Minh'));

  // Test conversion to SceneNode[]
  const converted = convertIngestedTimelineToSceneNodes(
    result.timeline,
    INITIAL_CHARACTERS
  );
  assert.equal(converted.length, 2);
  assert.equal(converted[0].sceneNumber, 1);
  assert.ok(converted[0].imagePrompt.includes('LAB CÔNG NGHỆ CAO'));
  assert.ok(converted[1].videoPrompt.includes('SÂN THƯỢNG TOÀN CẢNH'));
  assert.ok(converted[0].postEdit.bgmTrackTitle.length > 0);
});

test('GOOGLE_FLOW_CHARACTER_PRESETS and parseUploadedCharacterJson allow instant import and file upload', () => {
  assert.ok(GOOGLE_FLOW_CHARACTER_PRESETS.length >= 4);
  const khoa = GOOGLE_FLOW_CHARACTER_PRESETS.find((c: any) => c.name === 'Khoa');
  assert.ok(khoa);
  assert.equal(khoa.source, 'google_flow_import');
  assert.ok(khoa.continuityToken.includes('CHAR_LOCK::KHOA'));

  // Test custom token generator
  const token = generateContinuityTokenForCharacter('Hoàng Nam', 'Áo vest đen và cà vạt đỏ', 3);
  assert.equal(token, 'CHAR_LOCK::HOANGNAM_3[ao-vest-den-va-ca-vat-do]');

  // Test upload JSON parsing
  const mockUploadJson = JSON.stringify({
    name: 'Phương',
    role: 'Bác sĩ Phẫu thuật AI',
    ageRange: '35 tuổi',
    visualDNA: 'Nữ bác sĩ tóc búi cao, khẩu trang y tế hạ thấp, đeo kính vi phẫu',
    wardrobeLock: 'Blouse trắng cổ đứng kháng khuẩn',
    voicePersona: 'Giọng miền Trung điềm tĩnh',
    voicePitch: 'medium',
    speakingRateWpm: 135,
    personalityTraits: 'Cẩn trọng, kiên định, giàu lòng trắc ẩn',
    mannerisms: 'Bàn tay luôn ổn định tuyệt đối khi thao tác vi phẫu',
  });

  const parsed = parseUploadedCharacterJson(mockUploadJson);
  assert.equal(parsed.success, true);
  assert.equal(parsed.characters.length, 1);
  assert.equal(parsed.characters[0].name, 'Phương');
  assert.equal(parsed.characters[0].source, 'uploaded');
  assert.ok(parsed.characters[0].continuityToken.startsWith('CHAR_LOCK::PHUONG'));
});

test('extractCharactersFromScriptText and parseScriptIntoScenes dynamically extract Mẹ Na, Ba Ben, Bé Bông without Linh/Minh contamination', async () => {
  const { extractCharactersFromScriptText, extractProjectTitleFromScript } = await import('./flow-engine.ts');
  const userScript = `Kịch bản tiếp theo: "Ngày Mẹ Na nghỉ việc"
- Mẹ Na tuyên bố nghỉ việc (0–5 giây):
Sáng sớm, Mẹ Na ngồi uống trà trên ghế sofa, vẻ mặt thản nhiên: "Hôm nay mẹ nghỉ việc 1 ngày, Ba Ben và Bông tự lo nhé!"
- Ba Ben nhận nhiệm vụ nấu ăn sáng (5–12 giây):
Ba Ben đeo tạp dề hoa, tay cầm chảo rán trứng nhưng lỡ tay làm cháy khét lẹt, khói bốc lên nghi ngút trong bếp.
- Bé Bông phụ ba dọn nhà (12–18 giây):
Bé Bông cầm chổi quét nhà giúp ba nhưng lại quét đồ chơi chui tọt hết vào gầm ghế sofa rồi cười khúc khích.`;

  const title = extractProjectTitleFromScript(userScript);
  assert.equal(title, 'Ngày Mẹ Na nghỉ việc');

  const extractedChars = extractCharactersFromScriptText(userScript, []);
  const names = extractedChars.map((c) => c.name);
  assert.ok(names.includes('Mẹ Na'));
  assert.ok(names.includes('Ba Ben'));
  assert.ok(names.includes('Bé Bông'));
  assert.equal(names.includes('Linh'), false);
  assert.equal(names.includes('Minh'), false);

  const scenes = parseScriptIntoScenes(userScript, extractedChars);
  assert.equal(scenes.length, 3);
  assert.equal(scenes[0].postEdit.durationSec, 5);
  assert.equal(scenes[1].postEdit.durationSec, 7);
  assert.equal(scenes[2].postEdit.durationSec, 6);
  assert.ok(scenes[0].keyframeUrl.startsWith('data:image/svg+xml'));
  assert.equal(scenes[0].imagePrompt.includes('Linh'), false);

  const critique = analyzeScriptQuality(userScript, scenes, extractedChars);
  assert.ok(critique.suggestions.length >= 2);
  assert.equal(JSON.stringify(critique).includes('Linh'), false);
});

test('parseScriptIntoScenes strips Markdown # headers and HTML entities (&#x20;) so preamble never becomes Scene 01 or corrupted dialogue', async () => {
  const {
    extractCharactersFromScriptText,
    extractProjectTitleFromScript,
    cleanSpokenDialogueText,
  } = await import('./flow-engine.ts');

  const markdownScript = `# TẬP 4: BÒ SỮA CỦA BAN BAN 🐮🥛
Nhân vật chính: Phong &#x20;Thời lượng: 30-35 giây Chủ đề: Giải cứu thú cưng
- Crush xuất hiện (0-5 giây):
Ban Ban dắt chú bò sữa nhỏ đi dạo trong công viên buổi sáng. Phong đứng từ xa nhìn theo đầy ngưỡng mộ: "Chú bò sữa của Ban Ban dễ thương thật đấy!"
- Sự cố bất ngờ (5-12 giây):
Chú bò sữa bất ngờ chạy về phía quầy kem, Phong vội vàng chạy tới giữ dây dắt giúp Ban Ban.`;

  const title = extractProjectTitleFromScript(markdownScript);
  assert.equal(title, 'TẬP 4: BÒ SỮA CỦA BAN BAN 🐮🥛');

  const chars = extractCharactersFromScriptText(markdownScript, []);
  const charNames = chars.map((c) => c.name);
  assert.deepEqual(charNames, ['Phong', 'Ban Ban']);

  const scenes = parseScriptIntoScenes(markdownScript, chars);
  assert.equal(scenes.length, 2);
  // Scene 1 must be "Crush xuất hiện", NOT "# TẬP 4: BÒ SỮA CỦA BAN BAN"
  assert.ok(scenes[0].title.includes('Crush xuất hiện'));
  assert.equal(scenes[0].title.includes('# TẬP 4'), false);
  assert.equal(scenes[0].dialogue.includes('&#x20;'), false);
  assert.equal(
    cleanSpokenDialogueText(scenes[0].dialogue),
    'Chú bò sữa của Ban Ban dễ thương thật đấy!'
  );

  // Regenerating Scene 1 produces a new Take v2 with a distinct keyframeUrl
  const regenScenes = triggerSelectiveRegeneration(
    scenes,
    [scenes[0].id],
    undefined,
    '2026-11-07 15:00',
    chars
  );
  assert.equal(regenScenes[0].currentTake, 2);
  assert.notEqual(
    regenScenes[0].takes[0].keyframeUrl,
    regenScenes[0].takes[1].keyframeUrl
  );
});

test('Ba va Au script extracts Ba Ben and toddler Au without Vua/Ba noise and generates natural acting dialogue instead of repeating stage directions', async () => {
  const {
    extractCharactersFromScriptText,
    isStageDirectionInsteadOfDialogue,
  } = await import('./flow-engine.ts');

  const baVaAuScript = `– Ba và Ấu (0–5 giây)
Ba Ben nằm chơi với Ấu.

– Ba đi đâu, Ấu theo đó (5–12 giây)
Ba Ben bế Ấu đi từ phòng khách sang phòng ngủ, xuống bếp.
Vừa đi vừa nói.`;

  const chars = extractCharactersFromScriptText(baVaAuScript, []);
  const charNames = chars.map((c) => c.name);
  assert.deepEqual(charNames, ['Ba Ben', 'Ấu']);

  const auChar = chars.find((c) => c.name === 'Ấu');
  assert.ok(auChar);
  assert.equal(auChar.ageRange, '2 tuổi');

  const scenes = parseScriptIntoScenes(baVaAuScript, chars);
  assert.equal(scenes.length, 2);
  assert.equal(scenes[0].title, 'Ba và Ấu (Ban ngày)');
  assert.equal(scenes[1].title, 'Ba đi đâu, Ấu theo đó (Ban ngày)');

  // Both Ba Ben and Ấu must be locked in both scenes (no VUA_5 or duplicate BA_4)
  assert.equal(scenes[0].characterIds.length, 2);
  assert.equal(scenes[0].continuityState.characterAnchorLock.includes('VUA'), false);

  // Spoken dialogue must be natural character acting speech, NOT raw stage directions
  assert.notEqual(scenes[0].dialogue, scenes[0].narrativeBeat);
  assert.notEqual(scenes[1].dialogue, scenes[1].narrativeBeat);
  assert.equal(
    isStageDirectionInsteadOfDialogue(scenes[0].dialogue, scenes[0].narrativeBeat),
    false
  );
  assert.ok(Array.isArray(scenes[1].actionBeats) && scenes[1].actionBeats.length >= 2);
  assert.ok(Array.isArray(scenes[1].motionFrames) && scenes[1].motionFrames.length >= 2);

  // Verify SVG scene composer renders full-body action postures and 3-room architecture
  const svgScene1 = decodeURIComponent(
    scenes[0].keyframeUrl.replace('data:image/svg+xml;utf8,', '')
  );
  assert.ok(svgScene1.includes('Ba Ben (Nằm chơi)'));
  assert.ok(svgScene1.includes('Bé Ấu'));

  const svgScene2 = decodeURIComponent(
    scenes[1].keyframeUrl.replace('data:image/svg+xml;utf8,', '')
  );
  assert.ok(svgScene2.includes('1. PHÒNG KHÁCH'));
  assert.ok(svgScene2.includes('2. PHÒNG NGỦ'));
  assert.ok(svgScene2.includes('3. PHÒNG BẾP'));
  assert.ok(svgScene2.includes('Ba Ben bế Ấu'));
});

test('applyGlobalVoiceRegionLock locks regional voice across all characters and all scenes without hardcoded stereotype descriptions', async () => {
  const {
    extractCharactersFromScriptText,
    applyGlobalVoiceRegionLock,
  } = await import('./flow-engine.ts');

  const script = `– Buổi sáng (0–5 giây)\nBa Ben, Mẹ Na và Bé Ấu cùng cười đùa trong phòng khách.`;
  const chars = extractCharactersFromScriptText(script, []);
  const scenes = parseScriptIntoScenes(script, chars);

  // Verify zero hardcoded stereotype descriptions
  for (const c of chars) {
    assert.equal(c.wardrobeLock.includes('tạp dề vải bố khi vào bếp'), false);
  }

  // Lock Northern accent globally
  const northLocked = applyGlobalVoiceRegionLock(chars, scenes, 'north');
  for (const c of northLocked.characters) {
    assert.ok(c.voicePersona.toLowerCase().includes('miền bắc'));
  }
  for (const s of northLocked.scenes) {
    assert.ok(s.audioPrompt.toLowerCase().includes('miền bắc'));
  }

  // Lock Southern accent globally
  const southLocked = applyGlobalVoiceRegionLock(
    northLocked.characters,
    northLocked.scenes,
    'south'
  );
  for (const c of southLocked.characters) {
    assert.ok(c.voicePersona.toLowerCase().includes('miền nam'));
  }
  for (const s of southLocked.scenes) {
    assert.ok(s.audioPrompt.toLowerCase().includes('miền nam'));
  }
});



