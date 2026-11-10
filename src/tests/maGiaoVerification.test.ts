import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SectGameManager } from '../systems/SectGameManager';
import {
  DEFAULT_SECT_DIALOGUE_BANK,
  interpolateDialogueTemplate,
} from '../data/sectDialogueBank';
import {
  ADMIN_CATEGORIES,
  SectLeaderAnimationId,
} from '../types/magiao';
import { formatCompactPlayerName } from '../utils/compactPlayerName';
import { sanitizeTikTokChatText } from '../../server/tiktokAdapter';
import { PersistentGiftStore } from '../../server/giftStore';
import { PersistentOBSSyncStore } from '../../server/obsSyncStore';
import { getAvailableVoiceOptions } from '../../server/ttsProxy';
import { LabelCollisionManager } from '../systems/LabelCollisionManager';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function runTest(id: number, name: string, fn: () => string) {
  try {
    const detail = fn();
    results.push({ id, name, passed: true, detail });
    console.log(`✅ [PASS #${String(id).padStart(2, '0')}] ${name} — ${detail}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ id, name, passed: false, detail: msg });
    console.error(`❌ [FAIL #${String(id).padStart(2, '0')}] ${name} — ${msg}`);
  }
}

console.log('================================================================================');
console.log('🐉 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN 30 HẠNG MỤC: MA GIÁO ONLINE – THIÊN HẠ ĐỆ NHẤT TÀ PHÁI');
console.log('================================================================================');

const gm = new SectGameManager();

// 1-8. Foundation, Admin 20 tabs, OBS Sync Store, Demo Mode, TikTok Sanitizer
runTest(1, 'Cấu trúc Dự án & Master Config khởi tạo chuẩn', () => {
  const cfg = gm.getConfig();
  assert.equal(cfg.ranks.length, 9, 'Phải có đúng 9 cấp bậc');
  assert.equal(cfg.sectLeaderAnimations.length, 35, 'Phải có đúng 35 hoạt ảnh Giáo Chủ');
  assert.equal(cfg.miniGames.length, 3, 'Phải có đúng 3 Mini Game');
  return `9 cấp bậc, 35 hoạt ảnh Giáo Chủ, 3 Mini Game đã nạp.`;
});

runTest(2, 'Kiểm tra Hệ thống 20 Hạng Mục Quản Trị (Admin Categories)', () => {
  assert.equal(ADMIN_CATEGORIES.length, 20, 'Phải có đủ 20 hạng mục Admin');
  return `Đủ ${ADMIN_CATEGORIES.length}/20 tab quản trị chuyên sâu.`;
});

runTest(3, 'Kiểm tra PersistentOBSSyncStore & MasterConfigStore lưu đĩa', () => {
  const tmpObs = path.resolve(process.cwd(), 'data', 'test_obs_sync.json');
  const tmpMaster = path.resolve(process.cwd(), 'data', 'test_master_cfg.json');
  const store = new PersistentOBSSyncStore(tmpObs, tmpMaster);
  const updated = store.updateSettings({
    overlayConfig: { ...store.getSettings().overlayConfig, hudScale: 1.15 },
  });
  assert.equal(updated.overlayConfig.hudScale, 1.15);
  assert.ok(fs.existsSync(tmpObs), 'File OBS sync phải tồn tại trên đĩa');
  assert.ok(fs.existsSync(tmpMaster), 'File Master Config phải tồn tại trên đĩa');
  fs.unlinkSync(tmpObs);
  fs.unlinkSync(tmpMaster);
  return 'Lưu & đồng bộ nguyên tử (atomic write) ra đĩa thành công.';
});

runTest(4, 'Kiểm tra PersistentGiftStore: Multi-ID, Chống trùng Gift ID, Import/Export', () => {
  const tmpGift = path.resolve(process.cwd(), 'data', 'test_gifts.json');
  const gStore = new PersistentGiftStore(tmpGift);
  const initialCount = gStore.getAll().length;
  assert.ok(initialCount >= 8, 'Phải có ít nhất 8 cấu hình quà mặc định');

  // Test duplicate Gift ID rejection
  const dupRes = gStore.create({
    giftName: 'Quà Trùng ID',
    giftIds: [5655], // Already used by Hoa Hồng Ma Giáo
    coinValue: 5,
  });
  assert.equal(dupRes.ok, false, 'Phải từ chối Gift ID bị trùng');
  if (fs.existsSync(tmpGift)) fs.unlinkSync(tmpGift);
  return `Đã nạp ${initialCount} mốc quà, chặn trùng Gift ID 5655 chính xác.`;
});

runTest(5, 'Kiểm tra Chế độ Demo & Xóa sạch dữ liệu Demo khi vào LIVE', () => {
  gm.clearAllPlayers();
  gm.spawnDemoPlayers(15);
  assert.equal(gm.getDiscipleCount(), 15);
  gm.clearDemoData();
  assert.equal(gm.getDiscipleCount(), 0, 'Xóa dữ liệu Demo phải đưa sảnh về 0');
  return 'Tạo 15 đệ tử Demo và xóa sạch tức thì thành công.';
});

runTest(6, 'Kiểm tra Bộ lọc bình luận TikTok LIVE (Sanitize Chat)', () => {
  assert.equal(sanitizeTikTokChatText('sent a gift'), '', 'Phải lọc bỏ system message sent a gift');
  assert.equal(sanitizeTikTokChatText('  võ   '), 'võ', 'Phải cắt khoảng trắng thừa');
  return 'Lọc chuỗi hệ thống và chuẩn hóa tiếng Việt có dấu thành công.';
});

runTest(7, 'Kiểm tra 8 Bảng Thông Báo & Bảng Xếp Hạng Trưởng Lão (Notice Panels)', () => {
  const panels = gm.getConfig().noticePanels;
  assert.equal(panels.length, 8, 'Phải có đủ 8 bảng thông báo cấu hình được');
  return `Đủ ${panels.length}/8 bảng thông báo (Bảng Phong Cấp, Bảng Trưởng Lão, Mini Game, Quét Sân...).`;
});

runTest(8, 'Kiểm tra Khung 9:16 Dọc & 9 Khu Vực Đại Điện (Zones Calibration)', () => {
  const zones = Object.keys(gm.getConfig().sceneConfig.zones);
  assert.equal(zones.length, 9, 'Phải có đủ 9 khu vực không gian trong Đại Điện');
  return `Đủ ${zones.length}/9 khu vực (Ngai Vàng, Đài Đồng Tôn, Trục Giữa, Tả/Hữu Đường, Tĩnh Tâm, Thảm Võ, Quét Sân, Cổng).`;
});

// 9. Bình luận đầu tiên tạo nhân vật mới
runTest(9, 'Bình luận đầu tiên tạo nhân vật mới tại Cổng Sơn Trang', () => {
  gm.clearAllPlayers();
  const res = gm.handleCommentEvent({
    id: 'c1',
    type: 'comment',
    timestamp: Date.now(),
    userId: 'user_lenh_ho_xung',
    uniqueId: 'lenh_ho_xung',
    nickname: 'Lệnh Hồ Xung',
    comment: 'Xin bái kiến Giáo Chủ!',
  });
  assert.equal(res.isNewSpawn, true, 'Bình luận đầu tiên phải tạo nhân vật mới');
  assert.equal(gm.getDiscipleCount(), 1);
  assert.equal(res.disciple?.displayName, 'Lệnh Hồ Xung');
  return `Tạo mới nhân vật "${res.disciple?.displayName}" (compact: "${res.disciple?.compactName}").`;
});

// 10. Bình luận thứ 2 của cùng người KHÔNG tạo trùng nhân vật
runTest(10, 'Bình luận thứ 2 của cùng người KHÔNG tạo nhân vật trùng lặp', () => {
  const res2 = gm.handleCommentEvent({
    id: 'c2',
    type: 'comment',
    timestamp: Date.now(),
    userId: 'user_lenh_ho_xung',
    uniqueId: 'lenh_ho_xung',
    nickname: 'Lệnh Hồ Xung',
    comment: 'Đệ tử xin lĩnh giáo!',
  });
  assert.equal(res2.isNewSpawn, false, 'Không được tạo nhân vật trùng');
  assert.equal(gm.getDiscipleCount(), 1, 'Tổng số nhân vật trong sảnh vẫn phải là 1');
  assert.equal(res2.disciple?.commentCount, 2);
  return 'Số lượng nhân vật giữ nguyên = 1, cập nhật commentCount = 2.';
});

// 11. Bong bóng bình luận hiển thị trên đầu nhân vật
runTest(11, 'Bong bóng bình luận hiển thị trên đầu nhân vật & chống đè', () => {
  const snap = gm.getSnapshot();
  const d = snap.disciples[0];
  assert.equal(d.lastComment, 'Đệ tử xin lĩnh giáo!');
  assert.ok((d.commentBubbleExpiresAt || 0) > Date.now());
  return `Bong bóng "${d.lastComment}" hiển thị chuẩn xác.`;
});

// 12. 10 lệnh bình luận hoạt động đầy đủ
runTest(12, 'Kiểm tra đủ 10 lệnh bình luận (đi, chạy, võ, múa, đấm, đá, nhảy, thiền, đứng, chào)', () => {
  const commandsToTest: { kw: string; expectedAnim: string }[] = [
    { kw: 'đi', expectedAnim: 'walk' },
    { kw: 'chạy', expectedAnim: 'run' },
    { kw: 'võ', expectedAnim: 'combo_kungfu' },
    { kw: 'múa', expectedAnim: 'combo_kungfu' },
    { kw: 'đấm', expectedAnim: 'punch' },
    { kw: 'đá', expectedAnim: 'kick' },
    { kw: 'nhảy', expectedAnim: 'jump' },
    { kw: 'thiền', expectedAnim: 'meditate' },
    { kw: 'đứng', expectedAnim: 'stand_up' },
    { kw: 'chào', expectedAnim: 'bow' },
  ];

  for (let i = 0; i < commandsToTest.length; i++) {
    const item = commandsToTest[i];
    const res = gm.handleCommentEvent({
      id: `cmd_evt_${i}`,
      type: 'comment',
      timestamp: Date.now(),
      userId: `cmd_tester_${i}`,
      uniqueId: `cmd_tester_${i}`,
      nickname: `Võ Sĩ ${i}`,
      comment: item.kw,
    });
    assert.ok(res.matchedCommand, `Từ khóa "${item.kw}" phải khớp lệnh`);
    assert.equal(res.disciple?.animation, item.expectedAnim, `Lệnh "${item.kw}" phải kích hoạt "${item.expectedAnim}"`);
  }
  return 'Cả 10/10 lệnh bình luận đều kích hoạt đúng hoạt ảnh 2D.';
});

// 13. Giới hạn 80 nhân vật và hàng chờ hoạt động đúng
runTest(13, 'Giới hạn 80 nhân vật hiển thị đồng thời + Hàng chờ (Overflow Queue)', () => {
  gm.clearAllPlayers();
  gm.spawnDemoPlayers(95);
  assert.equal(gm.getDiscipleCount(), 80, 'Sảnh chỉ được hiển thị tối đa 80 nhân vật');
  assert.equal(gm.getWaitingQueueCount(), 15, '15 người thứ 81-95 phải nằm trong hàng chờ');
  return `Hiển thị đúng 80/80 nhân vật trong sảnh, 15 nhân vật trong hàng chờ.`;
});

// 14. Tên nhân vật tối đa 5 ký tự dưới chân, không đè nhau (LabelCollisionManager)
runTest(14, 'Tên dưới chân nhân vật tối đa 5 ký tự & chống chồng chữ (LabelCollisionManager)', () => {
  const compact = formatCompactPlayerName('Nguyễn Tiến Hải Đại Hiệp', 5);
  assert.equal(Array.from(compact).length, 5, 'Tên dưới chân phải cắt đúng 5 ký tự');
  assert.equal(compact, 'Nguyễ');

  const lcm = new LabelCollisionManager();
  const solved = lcm.solveLayout([
    { id: 'n1', anchorX: 50, anchorY: 50, widthPct: 10, heightPct: 2.5, priority: 10, type: 'nameplate' },
    { id: 'n2', anchorX: 50, anchorY: 50, widthPct: 10, heightPct: 2.5, priority: 5, type: 'nameplate' },
  ]);
  const p1 = solved.get('n1')!;
  const p2 = solved.get('n2')!;
  assert.ok(p1.xPct !== p2.xPct || p1.yPct !== p2.yPct, 'LabelCollisionManager phải tách 2 nhãn trùng vị trí');
  return `Cắt tên 5 ký tự ("${compact}") & tách nhãn trùng tọa độ thành công.`;
});

// 15-21. Hệ thống Quà 1, 5, 10, 20, 50, 99, 199 xu phong đúng cấp
const rankGiftTests: { testId: number; coins: number; expectedRankId: string; expectedRankName: string }[] = [
  { testId: 15, coins: 1, expectedRankId: 'ngoai_mon_do_de', expectedRankName: 'Ngoại Môn Đồ Đệ' },
  { testId: 16, coins: 5, expectedRankId: 'noi_mon_de_tu', expectedRankName: 'Nội Môn Đệ Tử' },
  { testId: 17, coins: 10, expectedRankId: 'su_huynh_su_ty', expectedRankName: 'Sư Huynh / Sư Tỷ' },
  { testId: 18, coins: 20, expectedRankId: 'tinh_anh_de_tu', expectedRankName: 'Tinh Anh Đệ Tử' },
  { testId: 19, coins: 50, expectedRankId: 'ho_phap_ma_giao', expectedRankName: 'Hộ Pháp Ma Giáo' },
  { testId: 20, coins: 99, expectedRankId: 'dai_truong_lao', expectedRankName: 'Đại Trưởng Lão' },
  { testId: 21, coins: 199, expectedRankId: 'dong_ton_giao_chu', expectedRankName: 'Đồng Tôn Giáo Chủ' },
];

for (const rt of rankGiftTests) {
  runTest(rt.testId, `Quà ${rt.coins} xu phong đúng cấp "${rt.expectedRankName}"`, () => {
    const uid = `rank_tester_${rt.coins}`;
    const res = gm.handleGiftEvent({
      id: `g_${rt.coins}`,
      type: 'gift',
      timestamp: Date.now(),
      userId: uid,
      uniqueId: uid,
      nickname: `Cao Thủ ${rt.coins} Xu`,
      coinValue: rt.coins,
      giftName: `Lễ Vật ${rt.coins} Xu`,
      giftCount: 1,
    });
    assert.equal(res.disciple.rankId, rt.expectedRankId);
    assert.equal(res.disciple.rankName, rt.expectedRankName);
    if (rt.coins === 199) {
      assert.equal(res.disciple.isCoLeader, true, '199 xu phải là Đồng Tôn Giáo Chủ');
      assert.equal(res.disciple.zone, 'co_leader_dais', '199 xu phải đứng ở Đài Đồng Tôn cạnh Ngai Vàng');
    }
    return `Phong cấp "${res.disciple.rankName}" (Zone: ${res.disciple.zone}) chính xác.`;
  });
}

// 22. Quà 1000+ xu / Gift ID chỉ định chuyển giao ngai Tân Giáo Chủ đúng
runTest(22, 'Quà Chí Tôn chuyển giao Ngai Vàng cho Tân Giáo Chủ & Cựu Giáo Chủ thành Thái Thượng Giáo Chủ', () => {
  const res = gm.handleGiftEvent({
    id: 'g_supreme_throne',
    type: 'gift',
    timestamp: Date.now(),
    userId: 'user_dong_phuong',
    uniqueId: 'dong_phuong',
    nickname: 'Đông Phương Bất Bại',
    giftId: 9999,
    giftName: 'Long Ngai Chí Tôn',
    coinValue: 1000,
    giftCount: 1,
  });
  assert.equal(res.throneTransferred, true, 'Phải kích hoạt chuyển giao ngai vàng');
  assert.equal(res.disciple.rankId, 'tan_giao_chu');
  assert.equal(res.disciple.isSectLeader, true);
  const snap = gm.getSnapshot();
  assert.ok(snap.sectLeader.currentLeaderName.includes('Đông Phương Bất Bại'));
  assert.ok(snap.sectLeader.formerLeaderName.includes('Thái Thượng Giáo Chủ'));
  return `Tân Giáo Chủ: "${snap.sectLeader.currentLeaderName}" | Cựu: "${snap.sectLeader.formerLeaderName}".`;
});

// 23. Giáo Chủ có đủ 35 hoạt ảnh hoạt động được
runTest(23, 'Giáo Chủ có đủ 35 hoạt ảnh (Nhóm A, B, C, D, E) kích hoạt thành công', () => {
  const allAnims = gm.getConfig().sectLeaderAnimations;
  assert.equal(allAnims.length, 35, 'Phải có đúng 35 hoạt ảnh Giáo Chủ');
  for (const a of allAnims) {
    const ok = gm.triggerSectLeaderAnimation(a.id as SectLeaderAnimationId);
    assert.equal(ok, true);
    assert.equal(gm.getSnapshot().sectLeader.currentAnimation, a.id);
  }
  return 'Đã kích hoạt kiểm thử thành công toàn bộ 35/35 hoạt ảnh Giáo Chủ.';
});

// 24. 400+ câu thoại không trùng lặp & thay biến đúng
runTest(24, 'Kho 400+ câu thoại Giáo Chủ riêng biệt (không trùng lặp) & nội suy biến không đọc dấu {}', () => {
  assert.ok(DEFAULT_SECT_DIALOGUE_BANK.length >= 400, 'Tổng số câu thoại phải >= 400');
  const uniqueTexts = new Set(DEFAULT_SECT_DIALOGUE_BANK.map(l => l.text.trim()));
  assert.equal(uniqueTexts.size, 400, 'Cả 400 câu thoại phải hoàn toàn riêng biệt, không trùng lặp');

  const sample = interpolateDialogueTemplate(
    'Chào {playerName} bậc {rankName} tặng {giftName} cho {leaderName} trong {gameName}!',
    {
      playerName: 'Tiêu Phong',
      rankName: 'Đại Trưởng Lão',
      giftName: 'Thánh Hỏa Lệnh',
      leaderName: 'Dạ Thiên Minh',
      gameName: 'Ma Quyền Loạn Vũ',
    }
  );
  assert.ok(!sample.includes('{') && !sample.includes('}'), 'Không được còn sót dấu ngoặc nhọn {}');
  assert.ok(sample.includes('Tiêu Phong') && !sample.includes('Đại Trưởng Lão') === false);
  return `Xác nhận 400/400 câu thoại duy nhất + nội suy biến sạch 100%.`;
});

// 25. TTS & Lip-sync hoạt động đúng
runTest(25, 'Hệ thống TTS Microsoft Azure Speech (Nam Minh / Hoài My), VieNeu & Lip-Sync', () => {
  const voices = getAvailableVoiceOptions();
  const azureVoices = voices.providers.azure_speech.voices.map(v => v.id);
  assert.ok(azureVoices.includes('vi-VN-NamMinhNeural'), 'Phải hỗ trợ giọng Nam Minh Neural');
  assert.ok(azureVoices.includes('vi-VN-HoaiMyNeural'), 'Phải hỗ trợ giọng Hoài My Neural');
  assert.ok(voices.providers.vieneu_local.voices.length > 0, 'Phải hỗ trợ VieNeu Local');
  return 'Đã cấu hình chuẩn vi-VN-NamMinhNeural, vi-VN-HoaiMyNeural, VieNeu Local & Lip-Sync Viseme.';
});

// 26. Chuyển cảnh Đại Điện -> Sân Luyện Võ mỗi 150-180s hoạt động đúng
runTest(26, 'Chuyển cảnh Đại Điện Ma Giáo ⇄ Sân Luyện Võ (Chu kỳ 150–180 giây)', () => {
  const [minC, maxC] = gm.getConfig().sceneTransition.cycleIntervalRangeSec;
  assert.equal(minC, 150);
  assert.equal(maxC, 180);
  gm.switchSceneNow('training_ground');
  assert.equal(gm.getSnapshot().activeScene, 'training_ground');
  gm.switchSceneNow('main_hall');
  assert.equal(gm.getSnapshot().activeScene, 'main_hall');
  return `Chu kỳ [${minC}s, ${maxC}s] & chuyển cảnh tức thì hoạt động chính xác.`;
});

// 27. Mini Game 1: Ma Quyền Loạn Vũ (từ khóa MÚA, mỗi người chỉ cần 1 bình luận)
runTest(27, 'Mini Game 1 (Ma Quyền Loạn Vũ): Gõ từ khóa MÚA (mỗi người 1 bình luận)', () => {
  gm.clearAllPlayers();
  gm.spawnDemoPlayers(5);
  gm.startMiniGame('ma_quyen_loan_vu');
  const participants = gm.getSnapshot().miniGame.participantUserIds;
  assert.equal(participants.length, 5);

  // 4 out of 5 players comment MÚA once (80% >= 60% threshold)
  for (let i = 0; i < 4; i++) {
    gm.handleCommentEvent({
      id: `mg1_${i}`,
      type: 'comment',
      timestamp: Date.now(),
      userId: participants[i],
      uniqueId: participants[i],
      nickname: `Đệ Tử ${i}`,
      comment: 'MÚA',
    });
  }
  assert.equal(gm.getSnapshot().miniGame.completionPct, 80);
  gm.finishMiniGame();
  assert.equal(gm.getSnapshot().miniGame.isVictory, true, '80% hoàn thành phải được xử Thắng');
  return '4/5 đệ tử gõ MÚA 1 lần đạt 80% ➔ Chiến thắng Ma Quyền Loạn Vũ.';
});

// 28. Mini Game 2: Ma Ảnh Thân Pháp (TRÁI / PHẢI / NHẢY)
runTest(28, 'Mini Game 2 (Ma Ảnh Thân Pháp): Né chướng ngại vật TRÁI / PHẢI / NHẢY', () => {
  gm.clearAllPlayers();
  gm.spawnDemoPlayers(4);
  gm.startMiniGame('ma_anh_than_phap');
  const snap = gm.getSnapshot();
  const dir = snap.miniGame.currentObstacleDirection || 'NHAY';
  for (const uid of snap.miniGame.participantUserIds) {
    gm.handleCommentEvent({
      id: `mg2_${uid}`,
      type: 'comment',
      timestamp: Date.now(),
      userId: uid,
      uniqueId: uid,
      nickname: uid,
      comment: dir,
    });
  }
  assert.equal(gm.getSnapshot().miniGame.completionPct, 100);
  gm.finishMiniGame();
  assert.equal(gm.getSnapshot().miniGame.isVictory, true);
  return `Tất cả đệ tử né hướng "${dir}" thành công (100%).`;
});

// 29. Mini Game 3: Tam Khí Ma Trận (LỬA / BĂNG / GIÓ khắc chế)
runTest(29, 'Mini Game 3 (Tam Khí Ma Trận): Quy tắc tương khắc LỬA – BĂNG – GIÓ', () => {
  gm.clearAllPlayers();
  gm.spawnDemoPlayers(4);
  gm.startMiniGame('tam_khi_ma_tran');
  const snap = gm.getSnapshot();
  const counter = snap.miniGame.expectedCounterCommand || 'LUA';
  for (const uid of snap.miniGame.participantUserIds) {
    gm.handleCommentEvent({
      id: `mg3_${uid}`,
      type: 'comment',
      timestamp: Date.now(),
      userId: uid,
      uniqueId: uid,
      nickname: uid,
      comment: counter,
    });
  }
  assert.equal(gm.getSnapshot().miniGame.completionPct, 100);
  gm.finishMiniGame();
  assert.equal(gm.getSnapshot().miniGame.isVictory, true);
  return `Giáo Chủ xuất "${snap.miniGame.leaderElement}", đệ tử khắc chế bằng "${counter}" (100%).`;
});

// 30. Hình phạt tối đa 5 người quét sân và bình luận lại quay về đại điện ngay + Launchers
runTest(30, 'Hình phạt tối đa 5 đệ tử quét sân & bình luận lại quay về Đại Điện ngay (không mất xu/cấp) + Launchers', () => {
  gm.clearAllPlayers();
  gm.spawnDemoPlayers(10);
  // Give first player 50 coins (Hộ Pháp Ma Giáo) to verify they don't lose coins/rank when penalized
  const firstPlayer = gm.getSnapshot().disciples[0];
  gm.handleGiftEvent({
    id: 'gift_before_sweep',
    type: 'gift',
    timestamp: Date.now(),
    userId: firstPlayer.userId,
    uniqueId: firstPlayer.uniqueId,
    nickname: firstPlayer.displayName,
    coinValue: 50,
    giftName: 'Lệnh Bài Hộ Pháp',
    giftCount: 1,
  });

  gm.startMiniGame('ma_quyen_loan_vu');
  // Nobody comments -> 0% completion -> team loses -> max 5 players sent to sweep
  gm.finishMiniGame(false);

  const afterLose = gm.getSnapshot();
  assert.equal(afterLose.sweepingDisciples.length, 5, 'Chỉ được phạt tối đa 5 người đi quét sân');
  const penalizedOne = afterLose.sweepingDisciples[0];
  assert.equal(penalizedOne.isSweepingPenalty, true);
  assert.equal(penalizedOne.animation, 'sweep_floor');

  // Verify no coin or rank loss for firstPlayer
  const checkFirst = afterLose.disciples.find(d => d.userId === firstPlayer.userId)!;
  assert.equal(checkFirst.totalCoins, 50, 'Không được trừ xu khi thua mini game');
  assert.equal(checkFirst.rankId, 'ho_phap_ma_giao', 'Không được hạ cấp khi thua mini game');

  // Now penalizedOne comments again -> must immediately return from sweep with 0 gift required!
  const releaseRes = gm.handleCommentEvent({
    id: 'comment_release_sweep',
    type: 'comment',
    timestamp: Date.now(),
    userId: penalizedOne.userId,
    uniqueId: penalizedOne.uniqueId,
    nickname: penalizedOne.displayName,
    comment: 'Đệ tử đã quét xong sân!',
  });
  assert.equal(releaseRes.releasedFromSweep, true, 'Bình luận lại phải giải phóng khỏi quét sân ngay');
  assert.equal(releaseRes.disciple?.isSweepingPenalty, false);
  assert.equal(gm.getSnapshot().sweepingDisciples.length, 4);

  // Verify macOS & Windows launcher files exist
  assert.ok(fs.existsSync(path.resolve(process.cwd(), 'MA GIAO ONLINE.app/Contents/MacOS/start')));
  assert.ok(fs.existsSync(path.resolve(process.cwd(), 'MA_GIAO_ONLINE.exe')));
  assert.ok(fs.existsSync(path.resolve(process.cwd(), 'tools/ma-giao-launcher/launcher.cjs')));

  return 'Phạt tối đa 5 người quét sân, bình luận lại về sảnh ngay, giữ nguyên xu/cấp, đủ bộ Launcher macOS & Windows.';
});

// 31. Kiểm thử phân bố không gian với 1, 10, 30, 50, 80 nhân vật (Không dồn vào một góc)
runTest(31, 'Kiểm thử phân bố 1, 10, 30, 50, 80 nhân vật: Phủ rộng toàn sảnh, không dồn góc', () => {
  const counts = [1, 10, 30, 50, 80];
  for (const cnt of counts) {
    gm.setPopulationPreset(cnt);
    for (let t = 0; t < 8; t++) gm.tick();
    const list = gm.getSnapshot().disciples;
    assert.equal(list.length, cnt, `Phải có đúng ${cnt} nhân vật`);

    if (cnt >= 30) {
      const xs = list.map(d => d.x);
      const ys = list.map(d => d.y);
      const spanX = Math.max(...xs) - Math.min(...xs);
      const spanY = Math.max(...ys) - Math.min(...ys);
      assert.ok(spanX >= 45, `Với ${cnt} nhân vật, độ rộng phân bố X (${spanX.toFixed(1)}%) phải >= 45%`);
      assert.ok(spanY >= 32, `Với ${cnt} nhân vật, độ sâu phân bố Y (${spanY.toFixed(1)}%) phải >= 32%`);
    }
  }
  return 'Cả 5 mức quân số (1, 10, 30, 50, 80) đều phân bố rộng khắp mặt sàn Đại Điện.';
});

// 32. Lối Đi Chính Giữa (Central Aisle x: 32..68) là khu vực hoạt động chính
runTest(32, 'Lối Đi Chính Giữa (x: 32..68, y: 31..88) luôn có nhân vật hoạt động tự do', () => {
  gm.setPopulationPreset(80);
  for (let t = 0; t < 10; t++) gm.tick();
  const list = gm.getSnapshot().disciples;
  const inCentralAisle = list.filter(d => d.x >= 32 && d.x <= 68 && d.y >= 31 && d.y <= 88);
  assert.ok(
    inCentralAisle.length >= 18,
    `Phải có ít nhất 18/80 nhân vật hoạt động trên lối đi chính giữa (hiện có ${inCentralAisle.length})`
  );
  return `${inCentralAisle.length}/80 nhân vật đang đi lại, luyện võ và thiền ngay trên Lối Đi Chính Giữa.`;
});

// 33. Không xuyên tường và không xâm phạm vùng bảo vệ Ngai Giáo Chủ
runTest(33, 'Bảo vệ vùng Ngai Giáo Chủ (ThroneReservedZone) & giới hạn tường Đại Điện', () => {
  gm.setPopulationPreset(80);
  for (let t = 0; t < 20; t++) gm.tick();
  const list = gm.getSnapshot().disciples;
  for (const d of list) {
    if (!d.isSectLeader && !d.isCoLeader && !d.isSweepingPenalty) {
      assert.equal(
        gm.isInsideThroneReservedZone(d.x, d.y, 0.2),
        false,
        `Nhân vật ${d.displayName} (${d.x}, ${d.y}) không được đè lên Ngai Giáo Chủ`
      );
      assert.ok(d.x >= 6 && d.x <= 94, `Tọa độ X (${d.x}) phải nằm trong lòng Đại Điện`);
      assert.ok(d.y >= 26 && d.y <= 95, `Tọa độ Y (${d.y}) phải nằm trong lòng Đại Điện`);
    }
  }
  return '0/80 nhân vật xâm phạm Ngai Giáo Chủ hoặc xuyên tường.';
});

// 34. Chống chồng lấn (Anti-Overlap Separation)
runTest(34, 'Thuật toán chống chồng lấn giữ khoảng cách giữa 80 nhân vật, không đứng trùng điểm', () => {
  gm.setPopulationPreset(80);
  for (let t = 0; t < 15; t++) gm.tick();
  const list = gm.getSnapshot().disciples;
  let exactOverlaps = 0;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const dist = Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y);
      if (dist < 0.8) exactOverlaps += 1;
    }
  }
  assert.equal(exactOverlaps, 0, 'Không được có cặp nhân vật nào đứng đè khít lên nhau (< 0.8%)');
  return '80 nhân vật duy trì khoảng cách tự nhiên, 0 cặp bị trùng tọa độ.';
});

// 35. Tự động sinh hoạt đa dạng & không bị giật về vị trí cũ sau hoạt ảnh
runTest(35, 'Nhân vật tự sinh hoạt đa dạng & KHÔNG bị giật về vị trí cũ sau khi kết thúc hoạt ảnh', () => {
  gm.setPopulationPreset(50);
  const sample = gm.getSnapshot().disciples[0];
  // Move sample disciple to a specific spot in the central aisle and run a command
  sample.x = 48;
  sample.y = 54;
  sample.targetX = 48;
  sample.targetY = 54;
  gm.handleCommentEvent({
    id: 'no_snapback_test',
    type: 'comment',
    timestamp: Date.now(),
    userId: sample.userId,
    uniqueId: sample.uniqueId,
    nickname: sample.displayName,
    comment: 'võ',
  });
  for (let i = 0; i < 10; i++) gm.tick();
  const after = gm.getSnapshot().disciples.find(d => d.userId === sample.userId)!;
  const drift = Math.hypot(after.x - 48, after.y - 54);
  assert.ok(drift < 8, `Nhân vật không được giật về góc sau hoạt ảnh (drift=${drift.toFixed(2)}%)`);

  const activeAnims = new Set(gm.getSnapshot().disciples.map(d => d.animation));
  assert.ok(activeAnims.size >= 4, `Đại điện phải có ít nhất 4 trạng thái hoạt động khác nhau cùng lúc`);
  return `Đa dạng ${activeAnims.size} trạng thái hoạt ảnh cùng lúc, không bị giật tọa độ.`;
});

// 36. Hoạt ảnh bước chân (stepPhase), ngồi thiền -> đứng dậy, và 4 hướng
runTest(36, 'Hoạt ảnh bước chân thực (stepPhase), chu kỳ Thiền ➔ Đứng dậy & 4 hướng di chuyển', () => {
  gm.setPopulationPreset(10);
  const walker = gm.getSnapshot().disciples[0];
  walker.x = 25;
  walker.y = 60;
  walker.targetX = 75;
  walker.targetY = 60;
  walker.animation = 'walk';
  const initialPhase = walker.stepPhase || 0;
  gm.tick();
  const updatedWalker = gm.getSnapshot().disciples[0];
  assert.notEqual(updatedWalker.stepPhase, initialPhase, 'stepPhase phải tăng theo quãng đường bước chân');
  assert.equal(updatedWalker.direction, 'right', 'Đi từ trái sang phải phải hiển thị góc nhìn nghiêng phải (right)');
  return `stepPhase cập nhật thực tế & hướng nhìn (${updatedWalker.direction}) chuẩn xác.`;
});

// 37. Chuyển sang Mini Game rồi quay về Đại Điện vẫn tự do sinh hoạt (Giải tán đội hình)
runTest(37, 'Kết thúc Mini Game giải tán đội hình, phân bố lại Free Roam toàn sảnh', () => {
  gm.setPopulationPreset(30);
  gm.startMiniGame('ma_quyen_loan_vu');
  assert.equal(gm.getSnapshot().activeScene, 'training_ground');
  gm.finishMiniGame(true);
  assert.equal(gm.getSnapshot().activeScene, 'main_hall');
  const roamingStates = gm.getSnapshot().disciples.filter(
    d => d.fsmState === 'free_roam_stroll' || d.animation === 'walk'
  );
  assert.ok(roamingStates.length >= 20, 'Sau khi kết thúc Mini Game, đệ tử phải giải tán đội hình và tự do di chuyển');
  return `Giải tán đội hình thành công: ${roamingStates.length}/30 đệ tử tản ra khắp Đại Điện.`;
});

// 38. Admin thay đổi cấu hình Free Roam & nút Phân Bố Lại có hiệu lực thật
runTest(38, 'Các nút Admin (Phân bố lại, Tập võ, Ngồi thiền, Sinh hoạt tự do) có hiệu lực thật', () => {
  gm.setPopulationPreset(30);
  gm.triggerMassPlayerAnimation('combo_kungfu');
  assert.ok(gm.getSnapshot().disciples.every(d => d.animation === 'combo_kungfu'));
  gm.triggerMassPlayerAnimation('meditate');
  assert.ok(gm.getSnapshot().disciples.every(d => d.animation === 'meditate'));
  gm.redistributeAllDisciples();
  assert.ok(gm.getSnapshot().disciples.some(d => d.animation === 'walk'));
  gm.resumeAllFreeRoam();
  assert.equal(gm.getConfig().sceneConfig.freeRoamEnabled, true);
  return 'Tất cả 4 nút điều khiển nhanh trong Admin đều áp dụng ngay lập tức.';
});

// 39. Kiểm thử Test Bình Luận TikTok: User mới vào sảnh, User cũ gửi liên tiếp các lệnh (múa, nhảy, thiền, đứng) không tạo trùng
runTest(39, 'Admin Test Bình Luận TikTok: User mới đi từ cổng vào, gửi liên tiếp "múa", "nhảy", "thiền", "đứng" trên cùng 1 User không bị chặn cooldown', () => {
  gm.clearAllPlayers();
  const uid = 'admin_test_user_99';
  const r1 = gm.handleCommentEvent({
    id: 'adm_c1',
    type: 'comment',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Độc Cô Cầu Bại',
    comment: 'Xin chào đại điện!',
    isDemo: true,
  });
  assert.equal(r1.isNewSpawn, true, 'Lần đầu phải tạo User mới đi từ cổng vào');
  assert.equal(gm.getDiscipleCount(), 1);
  assert.equal(r1.disciple?.fsmState, 'walk_in_hall');

  const rapidSeq: { kw: string; expectedAnim: string }[] = [
    { kw: 'múa', expectedAnim: 'combo_kungfu' },
    { kw: 'nhảy', expectedAnim: 'jump' },
    { kw: 'thiền', expectedAnim: 'meditate' },
    { kw: 'đứng', expectedAnim: 'stand_up' },
  ];

  for (const step of rapidSeq) {
    const res = gm.handleCommentEvent({
      id: `adm_seq_${step.kw}`,
      type: 'comment',
      timestamp: Date.now(),
      userId: uid,
      uniqueId: uid,
      nickname: 'Độc Cô Cầu Bại',
      comment: step.kw,
      isDemo: true,
    });
    assert.equal(res.isNewSpawn, false, 'Cùng User gửi nhiều bình luận không được tạo trùng nhân vật');
    assert.equal(gm.getDiscipleCount(), 1, 'Sảnh vẫn chỉ có đúng 1 nhân vật');
    assert.equal(res.disciple?.animation, step.expectedAnim, `Lệnh "${step.kw}" phải kích hoạt ngay "${step.expectedAnim}"`);
    assert.equal(res.disciple?.lastComment, step.kw, 'Bong bóng bình luận phải cập nhật đúng nội dung mới nhất');
  }

  assert.equal(gm.getSnapshot().disciples[0].commentCount, 5, 'Tổng số lần bình luận của User phải là 5');
  return 'User mới đi từ cổng vào + gửi liên tiếp 4 lệnh (múa, nhảy, thiền, đứng) trên cùng 1 User chính xác 100%.';
});

// 40. Kiểm thử Test nhiều User bình luận cùng lúc (10 & 80 User) và xóa riêng 1 User test
runTest(40, 'Admin Test nhiều User bình luận cùng lúc (10 & 80 User) + Xóa riêng User test (removeDisciple)', () => {
  gm.clearAllPlayers();
  const count10 = gm.triggerMultiUserTestComments(10, 'múa');
  assert.equal(count10, 10);
  assert.equal(gm.getDiscipleCount(), 10);
  assert.ok(gm.getSnapshot().disciples.every(d => d.animation === 'combo_kungfu' && d.lastComment === 'múa'));

  // Remove a single user
  const targetUser = gm.getSnapshot().disciples[0];
  const removed = gm.removeDisciple(targetUser.userId);
  assert.equal(removed, true, 'Xóa riêng User test phải trả về true');
  assert.equal(gm.getDiscipleCount(), 9, 'Quân số phải giảm từ 10 xuống 9');

  // Test 80 users commenting simultaneously
  const count80 = gm.triggerMultiUserTestComments(80);
  assert.equal(count80, 80);
  assert.equal(gm.getDiscipleCount(), 80);
  return 'Đồng loạt 10 & 80 User bình luận cùng lúc và xóa riêng từng User test hoạt động hoàn hảo.';
});

// 41. Kiểm thử Cộng Dồn Xu 1 + 5 + 5 = 11 xu -> cấp 10 (Sư Huynh / Sư Tỷ) & Không phong chức lặp lại nếu cùng cấp
runTest(41, 'Cộng dồn xu: 1 + 5 + 5 = 11 xu ➔ đạt cấp 10 "Sư Huynh / Sư Tỷ" & không phong chức lặp nếu vẫn cùng cấp', () => {
  gm.clearAllPlayers();
  const uid = 'accum_user_11';
  const r1 = gm.handleGiftEvent({
    id: 'acc_11_1',
    type: 'gift',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Lệnh Hồ Xung',
    coinValue: 1,
    giftName: 'Hoa Hồng 1 Xu',
    giftCount: 1,
  });
  assert.equal(r1.disciple.totalCoins, 1);
  assert.equal(r1.disciple.rankId, 'ngoai_mon_do_de');
  assert.equal(r1.promoted, true);

  const r2 = gm.handleGiftEvent({
    id: 'acc_11_2',
    type: 'gift',
    timestamp: Date.now() + 1,
    userId: uid,
    uniqueId: uid,
    nickname: 'Lệnh Hồ Xung',
    coinValue: 5,
    giftName: 'Trà Tiên 5 Xu',
    giftCount: 1,
  });
  assert.equal(r2.disciple.totalCoins, 6, '1 + 5 phải bằng 6 xu');
  assert.equal(r2.disciple.rankId, 'noi_mon_de_tu');
  assert.equal(r2.promoted, true);

  const r3 = gm.handleGiftEvent({
    id: 'acc_11_3',
    type: 'gift',
    timestamp: Date.now() + 2,
    userId: uid,
    uniqueId: uid,
    nickname: 'Lệnh Hồ Xung',
    coinValue: 5,
    giftName: 'Trà Tiên 5 Xu',
    giftCount: 1,
  });
  assert.equal(r3.disciple.totalCoins, 11, '1 + 5 + 5 phải bằng 11 xu');
  assert.equal(r3.disciple.rankId, 'su_huynh_su_ty', '11 xu phải đạt mốc 10 xu (Sư Huynh / Sư Tỷ)');
  assert.equal(r3.disciple.rankName, 'Sư Huynh / Sư Tỷ');
  assert.equal(r3.promoted, true);

  // Send +2 xu more (total 13 xu, still below 20 xu threshold) -> must NOT repeat promotion
  const promoCountBefore = gm.getSnapshot().promotions.length;
  const r4 = gm.handleGiftEvent({
    id: 'acc_11_4',
    type: 'gift',
    timestamp: Date.now() + 3,
    userId: uid,
    uniqueId: uid,
    nickname: 'Lệnh Hồ Xung',
    coinValue: 2,
    giftName: 'Quà 2 Xu',
    giftCount: 1,
  });
  assert.equal(r4.disciple.totalCoins, 13);
  assert.equal(r4.disciple.rankId, 'su_huynh_su_ty');
  assert.equal(r4.promoted, false, 'Không được phong chức lặp lại nếu người chơi vẫn ở cùng cấp');
  assert.equal(gm.getSnapshot().promotions.length, promoCountBefore, 'Số lượng thông báo thăng cấp không tăng khi giữ nguyên cấp');

  return '1 + 5 + 5 = 11 xu ➔ Sư Huynh / Sư Tỷ (mốc 10 xu) & chặn phong chức lặp khi vẫn cùng cấp.';
});

// 42. Kiểm thử Cộng Dồn Xu 90 + 10 = 100 xu -> cấp 99 (Đại Trưởng Lão) & chỉ phát 1 hoạt cảnh khi vượt nhiều mốc
runTest(42, 'Cộng dồn xu: 90 + 10 = 100 xu ➔ đạt cấp 99 "Đại Trưởng Lão" & vượt nhiều mốc chỉ phát 1 thông báo cao nhất', () => {
  gm.clearAllPlayers();
  const uid = 'accum_user_100';
  // First gift of 90 xu jumps across 1, 5, 10, 20, 50 directly to Hộ Pháp Ma Giáo (50 xu) with ONLY 1 promotion announcement
  const r1 = gm.handleGiftEvent({
    id: 'acc_100_1',
    type: 'gift',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Trương Vô Kỵ',
    coinValue: 90,
    giftName: 'Lễ Vật 90 Xu',
    giftCount: 1,
  });
  assert.equal(r1.disciple.totalCoins, 90);
  assert.equal(r1.disciple.rankId, 'ho_phap_ma_giao', '90 xu đạt mốc 50 xu Hộ Pháp Ma Giáo');
  assert.equal(gm.getSnapshot().promotions.length, 1, 'Vượt qua 5 mốc trong 1 sự kiện chỉ được phát đúng 1 hoạt cảnh phong chức lên cấp cao nhất');

  const r2 = gm.handleGiftEvent({
    id: 'acc_100_2',
    type: 'gift',
    timestamp: Date.now() + 1,
    userId: uid,
    uniqueId: uid,
    nickname: 'Trương Vô Kỵ',
    coinValue: 10,
    giftName: 'Rượu Đào Hoa 10 Xu',
    giftCount: 1,
  });
  assert.equal(r2.disciple.totalCoins, 100, '90 + 10 phải bằng 100 xu');
  assert.equal(r2.disciple.rankId, 'dai_truong_lao', '100 xu phải đạt cấp 99 xu Đại Trưởng Lão');
  assert.equal(r2.disciple.rankName, 'Đại Trưởng Lão');
  assert.equal(r2.promoted, true);
  return '90 + 10 = 100 xu ➔ Đại Trưởng Lão (mốc 99 xu) chính xác.';
});

// 43. Kiểm thử Cộng Dồn Xu 190 + 10 = 200 xu -> cấp 199 (Đồng Tôn Giáo Chủ)
runTest(43, 'Cộng dồn xu: 190 + 10 = 200 xu ➔ đạt cấp 199 "Đồng Tôn Giáo Chủ" (Đứng Đài Danh Dự)', () => {
  gm.clearAllPlayers();
  const uid = 'accum_user_200';
  const r1 = gm.handleGiftEvent({
    id: 'acc_200_1',
    type: 'gift',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Nhậm Ngã Hành',
    coinValue: 190,
    giftName: 'Bảo Vật 190 Xu',
    giftCount: 1,
  });
  assert.equal(r1.disciple.totalCoins, 190);
  assert.equal(r1.disciple.rankId, 'dai_truong_lao');

  const r2 = gm.handleGiftEvent({
    id: 'acc_200_2',
    type: 'gift',
    timestamp: Date.now() + 1,
    userId: uid,
    uniqueId: uid,
    nickname: 'Nhậm Ngã Hành',
    coinValue: 10,
    giftName: 'Lễ Vật 10 Xu',
    giftCount: 1,
  });
  assert.equal(r2.disciple.totalCoins, 200, '190 + 10 phải bằng 200 xu');
  assert.equal(r2.disciple.rankId, 'dong_ton_giao_chu', '200 xu phải đạt cấp 199 xu Đồng Tôn Giáo Chủ');
  assert.equal(r2.disciple.rankName, 'Đồng Tôn Giáo Chủ');
  assert.equal(r2.disciple.isCoLeader, true);
  assert.equal(r2.disciple.zone, 'co_leader_dais');
  return '190 + 10 = 200 xu ➔ Đồng Tôn Giáo Chủ (mốc 199 xu, zone: co_leader_dais).';
});

// 44. Cùng một sự kiện quà được gửi lặp & Combo Streak trùng -> Không cộng trùng
runTest(44, 'Chống cộng trùng: Cùng một sự kiện quà gửi lặp ID hoặc Combo Streak lặp không bị cộng đôi xu', () => {
  gm.clearAllPlayers();
  const uid = 'dup_test_user';
  const evt = {
    id: 'fixed_gift_event_001',
    type: 'gift' as const,
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Dương Tiêu',
    coinValue: 25,
    giftName: 'Bảo Kiếm 25 Xu',
    giftCount: 1,
  };
  const first = gm.handleGiftEvent(evt);
  const second = gm.handleGiftEvent(evt);
  const third = gm.handleGiftEvent(evt);

  assert.equal(first.duplicateIgnored, false);
  assert.equal(second.duplicateIgnored, true, 'Lần gửi lặp thứ 2 cùng ID phải bị chặn');
  assert.equal(third.duplicateIgnored, true, 'Lần gửi lặp thứ 3 cùng ID phải bị chặn');
  assert.equal(third.disciple.totalCoins, 25, 'Tổng xu chỉ được tính đúng 1 lần = 25 xu');

  // Test streak combo deduplication (groupId + giftType=1)
  const s1 = gm.handleGiftEvent({
    id: 'streak_step_1',
    type: 'gift',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Dương Tiêu',
    giftId: 5655,
    giftName: 'Hoa Hồng Ma Giáo',
    giftType: 1,
    groupId: 'grp_rose_1',
    giftCount: 3,
    unitCoinValue: 1,
  });
  assert.equal(s1.disciple.totalCoins, 28, '25 + 3 = 28 xu');

  // Duplicate streak packet with same repeatCount=3
  const s1Dup = gm.handleGiftEvent({
    id: 'streak_step_1_dup',
    type: 'gift',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Dương Tiêu',
    giftId: 5655,
    giftName: 'Hoa Hồng Ma Giáo',
    giftType: 1,
    groupId: 'grp_rose_1',
    giftCount: 3,
    unitCoinValue: 1,
  });
  assert.equal(s1Dup.duplicateIgnored, true, 'Streak cùng repeatCount=3 phải bị bỏ qua');
  assert.equal(s1Dup.disciple.totalCoins, 28);

  // Next streak packet with repeatCount=5 -> should only add delta (5 - 3 = 2 xu)
  const s2 = gm.handleGiftEvent({
    id: 'streak_step_2',
    type: 'gift',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Dương Tiêu',
    giftId: 5655,
    giftName: 'Hoa Hồng Ma Giáo',
    giftType: 1,
    groupId: 'grp_rose_1',
    giftCount: 5,
    unitCoinValue: 1,
  });
  assert.equal(s2.addedCoins, 2, 'Streak tăng từ 3 lên 5 chỉ được cộng phần chênh lệch +2 xu');
  assert.equal(s2.disciple.totalCoins, 30, '28 + 2 = 30 xu');

  return 'Chặn sự kiện lặp ID & tính đúng delta của Combo Streak (không cộng trùng).';
});

// 45. Nhiều quà tới đồng thời & Đổi cảnh Đại Điện <-> Sân Luyện Võ không mất tổng xu
runTest(45, 'Nhiều quà tới đồng thời tính tổng chính xác & Đổi cảnh Mini Game không làm mất tổng xu/cấp bậc', () => {
  gm.clearAllPlayers();
  const uid = 'concurrent_user';
  const batch = [5, 10, 15, 20, 50]; // sum = 100 xu -> Đại Trưởng Lão (99 xu)
  batch.forEach((c, idx) => {
    gm.handleGiftEvent({
      id: `conc_${idx}_${Date.now()}`,
      type: 'gift',
      timestamp: Date.now(),
      userId: uid,
      uniqueId: uid,
      nickname: 'Phạm Dao',
      coinValue: c,
      giftName: `Quà ${c} Xu`,
      giftCount: 1,
    });
  });

  const beforeScene = gm.getSnapshot().disciples.find(d => d.userId === uid)!;
  assert.equal(beforeScene.totalCoins, 100, 'Tổng 5 + 10 + 15 + 20 + 50 phải đúng bằng 100 xu');
  assert.equal(beforeScene.rankId, 'dai_truong_lao');

  // Switch scene to training ground, run mini-game, finish mini-game, switch back to main hall
  gm.startMiniGame('ma_quyen_loan_vu');
  assert.equal(gm.getSnapshot().activeScene, 'training_ground');
  gm.finishMiniGame(false);
  gm.switchSceneNow('main_hall');

  const afterScene = gm.getSnapshot().disciples.find(d => d.userId === uid)!;
  assert.equal(afterScene.totalCoins, 100, 'Đổi cảnh và kết thúc Mini Game không được mất tổng xu');
  assert.equal(afterScene.rankId, 'dai_truong_lao', 'Đổi cảnh không được mất cấp bậc');
  return 'Tổng nhiều quà đồng thời = 100 xu chính xác & giữ nguyên 100% qua các lần chuyển cảnh.';
});

// 46. Khởi động lại phiên: Giữ dữ liệu khi mode='persistent' & Đặt lại về 0 khi mode='session'
runTest(46, 'Khởi động lại: Giữ bền vững tổng xu/cấp bậc & chặn sự kiện cũ khi mode="persistent", đặt lại khi mode="session"', () => {
  gm.clearAllPlayers();
  gm.setAccumulationConfig({ enabled: true, mode: 'persistent', preventDuplicateEvents: true });

  const uid = 'persist_vip_01';
  const oldEvtId = 'persist_evt_unique_100';
  gm.handleGiftEvent({
    id: oldEvtId,
    type: 'gift',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Tạ Tốn',
    coinValue: 195,
    giftName: 'Kim Mao Lệnh',
    giftCount: 1,
  });
  assert.equal(gm.getSnapshot().disciples[0].totalCoins, 195);
  assert.equal(gm.getSnapshot().disciples[0].rankId, 'dai_truong_lao');

  // Simulate restart in 'persistent' mode
  gm.simulateSessionRestart();
  assert.equal(gm.getDiscipleCount(), 0, 'Sau khi khởi động lại, sảnh bắt đầu trống chờ người vào');
  assert.equal(gm.getSnapshot().playerLedger.find(p => p.userId === uid)?.totalCoins, 195, 'Sổ vàng đa phiên vẫn giữ nguyên 195 xu');

  // Old event re-arrives after restart -> must NOT be counted again!
  const dupAfterRestart = gm.handleGiftEvent({
    id: oldEvtId,
    type: 'gift',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Tạ Tốn',
    coinValue: 195,
    giftName: 'Kim Mao Lệnh',
    giftCount: 1,
  });
  assert.equal(dupAfterRestart.duplicateIgnored, true, 'Không được tính lại sự kiện cũ sau khi khởi động lại');

  // User comments to enter hall in new session -> automatically restores 195 xu & Đại Trưởng Lão!
  const rejoin = gm.handleCommentEvent({
    id: 'rejoin_cmt_1',
    type: 'comment',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Tạ Tốn',
    comment: 'Ta đã trở lại!',
  });
  assert.equal(rejoin.disciple?.totalCoins, 195, 'Khi vào lại sảnh ở phiên mới, phải khôi phục đúng 195 xu');
  assert.equal(rejoin.disciple?.rankId, 'dai_truong_lao', 'Phải khôi phục đúng cấp Đại Trưởng Lão');

  // Now send +5 xu in the new session -> 195 + 5 = 200 xu -> Đồng Tôn Giáo Chủ!
  const rNext = gm.handleGiftEvent({
    id: 'persist_evt_add_5',
    type: 'gift',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Tạ Tốn',
    coinValue: 5,
    giftName: 'Trà Tiên 5 Xu',
    giftCount: 1,
  });
  assert.equal(rNext.disciple.totalCoins, 200, 'Cộng dồn qua phiên mới: 195 + 5 = 200 xu');
  assert.equal(rNext.disciple.rankId, 'dong_ton_giao_chu');

  // Switch back to default 'session' mode and simulate restart -> must reset to 0
  gm.setAccumulationConfig({ mode: 'session' });
  gm.simulateSessionRestart();
  assert.equal(gm.getSnapshot().playerLedger.length, 0, 'Ở chế độ theo phiên LIVE (session), khởi động lại phải đặt lại sổ xu về 0');

  return 'Chế độ "persistent" bảo toàn 195+5=200 xu qua khởi động lại & chặn sự kiện cũ; chế độ "session" đặt lại đúng chuẩn.';
});

// 47. Sao lưu (Export) & Khôi phục (Import) dữ liệu cấp bậc + Đặt lại xu chế độ Demo
runTest(47, 'Sao lưu & Khôi phục dữ liệu Cấp Bậc/Sổ Xu (Export/Import JSON) + Đặt lại xu chế độ Demo', () => {
  gm.clearAllPlayers();
  gm.handleGiftEvent({
    id: 'bk_evt_1',
    type: 'gift',
    timestamp: Date.now(),
    userId: 'backup_hero',
    uniqueId: 'backup_hero',
    nickname: 'Kiều Phong',
    coinValue: 55,
    giftName: 'Lệnh Bài 55 Xu',
    giftCount: 1,
    isDemo: true,
  });
  const backupData = gm.exportRankAndLedgerData();
  assert.equal(backupData.playerLedger.length, 1);
  assert.equal(backupData.playerLedger[0].totalCoins, 55);

  // Reset Demo Coins -> player remains in hall but coins = 0 & rank = Dân Đen
  gm.resetDemoCoins();
  const afterReset = gm.getSnapshot().disciples.find(d => d.userId === 'backup_hero')!;
  assert.equal(afterReset.totalCoins, 0, 'Đặt lại xu Demo phải đưa tổng xu về 0');
  assert.equal(afterReset.rankId, 'dan_den', 'Đặt lại xu Demo phải đưa cấp bậc về Dân Đen');

  // Restore from backupData -> player immediately regains 55 xu & Hộ Pháp Ma Giáo
  const restored = gm.importRankAndLedgerData(backupData as unknown as Record<string, unknown>);
  assert.equal(restored, true);
  const afterRestore = gm.getSnapshot().disciples.find(d => d.userId === 'backup_hero')!;
  assert.equal(afterRestore.totalCoins, 55, 'Khôi phục bản sao lưu phải trả lại đúng 55 xu');
  assert.equal(afterRestore.rankId, 'ho_phap_ma_giao', 'Khôi phục bản sao lưu phải trả lại cấp Hộ Pháp Ma Giáo');

  return 'Sao lưu JSON, Đặt lại xu Demo về 0, và Khôi phục dữ liệu cấp bậc/sổ xu chính xác 100%.';
});

// 48. Mặc định thời gian ở lại 7 phút (420s) & Tùy chỉnh 1-30 phút / chế độ test ngắn (5s-30s)
runTest(48, 'Mặc định thời gian ở lại 7 phút (420s) & Tùy chỉnh 1–30 phút + Chế độ test ngắn (5s, 10s, 15s, 30s)', () => {
  const resetCfg = gm.resetStayDurationConfig();
  assert.equal(resetCfg.inactivityTimeoutMinutes, 7, 'Mặc định phải là 7 phút');
  assert.equal(resetCfg.inactivityTimeoutSec, 420, 'Mặc định phải là 420 giây');
  assert.equal(resetCfg.autoDepartEnabled, true);
  assert.equal(resetCfg.walkToGateOnDepart, true);
  assert.equal(resetCfg.warningBeforeDepartEnabled, true);
  assert.equal(resetCfg.warningBeforeDepartSec, 30);

  // Test preset 15 minutes
  const cfg15 = gm.setStayDurationConfig({ inactivityTimeoutMinutes: 15, inactivityTimeoutSec: 900 });
  assert.equal(cfg15.inactivityTimeoutMinutes, 15);
  assert.equal(cfg15.inactivityTimeoutSec, 900);

  // Test short testing timeout (10s)
  const cfg10s = gm.setStayDurationConfig({ inactivityTimeoutSec: 10, warningBeforeDepartSec: 4 });
  assert.equal(cfg10s.inactivityTimeoutSec, 10);
  assert.equal(cfg10s.warningBeforeDepartSec, 4);

  gm.resetStayDurationConfig();
  return 'Mặc định 7 phút (420s), tùy chỉnh 1–30 phút và test ngắn 5s–30s hoạt động chuẩn xác.';
});

// 49. Bình luận & Quà hợp lệ làm mới bộ đếm; Tự múa võ, thiền, chuyển cảnh, sự kiện người khác KHÔNG làm mới bộ đếm
runTest(49, 'Làm mới bộ đếm khi Bình luận / Tặng quà; Hoạt ảnh tự động, chuyển cảnh & sự kiện người khác KHÔNG kéo dài thời gian', () => {
  gm.clearAllPlayers();
  gm.setStayDurationConfig({
    inactivityTimeoutMinutes: 7,
    inactivityTimeoutSec: 420,
    warningBeforeDepartSec: 30,
    applyMode: 'immediate',
  });

  const uidA = 'stay_user_a';
  const uidB = 'stay_user_b';
  gm.handleCommentEvent({
    id: 'st_c_a1',
    type: 'comment',
    timestamp: Date.now(),
    userId: uidA,
    uniqueId: uidA,
    nickname: 'Lệnh Hồ Xung',
    comment: 'Bái kiến!',
  });
  gm.handleCommentEvent({
    id: 'st_c_b1',
    type: 'comment',
    timestamp: Date.now(),
    userId: uidB,
    uniqueId: uidB,
    nickname: 'Nhậm Doanh Doanh',
    comment: 'Xin chào!',
  });

  // Simulate 200s elapsed for everyone -> remaining time should be ~220s
  gm.simulateTimeElapsed(200);
  const remAfter200 = gm.getSnapshot().disciples.find(d => d.userId === uidA)!.remainingStaySec!;
  assert.ok(remAfter200 <= 221 && remAfter200 >= 218, `Sau 200s trôi qua, thời gian còn lại phải ~220s (thực tế: ${remAfter200}s)`);

  // Trigger autonomous animations (mass kungfu, meditate, redistribute, scene transition, like event, and comment from user B)
  gm.triggerMassPlayerAnimation('combo_kungfu');
  gm.triggerMassPlayerAnimation('meditate');
  gm.redistributeAllDisciples();
  gm.switchSceneNow('training_ground');
  gm.switchSceneNow('main_hall');
  gm.handleIncomingEvent({
    id: 'st_like_a',
    type: 'like',
    timestamp: Date.now(),
    userId: uidA,
    uniqueId: uidA,
    nickname: 'Lệnh Hồ Xung',
    likeCount: 10,
  });
  gm.handleCommentEvent({
    id: 'st_c_b2',
    type: 'comment',
    timestamp: Date.now(),
    userId: uidB,
    uniqueId: uidB,
    nickname: 'Nhậm Doanh Doanh',
    comment: 'Múa kiếm!',
  });

  const remUserAAfterNonRefresh = gm.getSnapshot().disciples.find(d => d.userId === uidA)!.remainingStaySec!;
  const remUserBAfterComment = gm.getSnapshot().disciples.find(d => d.userId === uidB)!.remainingStaySec!;
  assert.ok(
    remUserAAfterNonRefresh <= 221 && remUserAAfterNonRefresh >= 218,
    'Hoạt ảnh tự động, chuyển cảnh, thả tim và bình luận của người khác KHÔNG được làm mới bộ đếm của User A'
  );
  assert.ok(remUserBAfterComment >= 418, 'User B vừa bình luận phải được làm mới bộ đếm về 420s');

  // Now User A sends a valid comment -> refreshes User A back to 420s
  gm.handleCommentEvent({
    id: 'st_c_a2',
    type: 'comment',
    timestamp: Date.now(),
    userId: uidA,
    uniqueId: uidA,
    nickname: 'Lệnh Hồ Xung',
    comment: 'Đệ tử vẫn đang ở đây!',
  });
  const remUserAAfterComment = gm.getSnapshot().disciples.find(d => d.userId === uidA)!.remainingStaySec!;
  assert.ok(remUserAAfterComment >= 418, 'User A gửi bình luận hợp lệ phải làm mới bộ đếm về 420s');

  // Simulate another 150s elapsed, then User A sends a gift -> refreshes User A back to 420s
  gm.simulateTimeElapsed(150, uidA);
  assert.ok(gm.getSnapshot().disciples.find(d => d.userId === uidA)!.remainingStaySec! <= 272);
  gm.handleGiftEvent({
    id: 'st_g_a1',
    type: 'gift',
    timestamp: Date.now(),
    userId: uidA,
    uniqueId: uidA,
    nickname: 'Lệnh Hồ Xung',
    coinValue: 5,
    giftName: 'Trà Tiên',
    giftCount: 1,
  });
  const remUserAAfterGift = gm.getSnapshot().disciples.find(d => d.userId === uidA)!.remainingStaySec!;
  assert.ok(remUserAAfterGift >= 418, 'User A gửi quà TikTok hợp lệ phải làm mới bộ đếm về 420s');

  return 'Bình luận & Quà làm mới bộ đếm; Tự đi dạo/múa võ/thiền/chuyển cảnh/sự kiện người khác KHÔNG làm mới bộ đếm.';
});

// 50. Cảnh báo sắp hết giờ, đi bộ ra cổng khi rời sảnh, thoát Mini Game an toàn & đôn Hàng chờ lên
runTest(50, 'Cảnh báo sắp hết giờ (expiring_soon), hoạt ảnh đi ra cổng (departing_gate), rời Mini Game an toàn & đôn Hàng chờ', () => {
  gm.clearAllPlayers();
  gm.setStayDurationConfig({
    inactivityTimeoutSec: 20,
    inactivityTimeoutMinutes: 1,
    warningBeforeDepartEnabled: true,
    warningBeforeDepartSec: 6,
    autoDepartEnabled: true,
    walkToGateOnDepart: true,
    departAnimationDurationSec: 3,
    applyMode: 'immediate',
  });

  const uid = 'depart_test_u1';
  gm.handleCommentEvent({
    id: 'dep_c1',
    type: 'comment',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Tiêu Phong',
    comment: 'Vào sảnh!',
  });

  // Start a mini-game so user is a participant
  gm.startMiniGame('ma_quyen_loan_vu');
  assert.ok(gm.getSnapshot().miniGame.participantUserIds.includes(uid), 'User phải có trong danh sách tham gia Mini Game');

  // Elapsed 16s (remaining ~4s <= warningBeforeDepartSec 6s) -> status must be 'expiring_soon'
  gm.simulateTimeElapsed(16, uid);
  const dWarn = gm.getSnapshot().disciples.find(d => d.userId === uid)!;
  assert.equal(dWarn.stayStatus, 'expiring_soon', 'Khi còn <= 6s phải chuyển sang trạng thái cảnh báo Sắp hết giờ');

  // Elapsed another 6s (total 22s >= 20s timeout) -> initiates departure walking to gate & safely exits mini-game
  gm.simulateTimeElapsed(6, uid);
  const dDeparting = gm.getSnapshot().disciples.find(d => d.userId === uid)!;
  assert.ok(dDeparting, 'Nhân vật đang chạy hoạt ảnh đi bộ ra cổng nên vẫn hiển thị tạm thời');
  assert.equal(dDeparting.fsmState, 'departing_gate', 'FSM phải ở trạng thái departing_gate');
  assert.equal(dDeparting.animation, 'depart', 'Animation phải là depart');
  assert.equal(dDeparting.stayStatus, 'departing', 'Trạng thái bảng phải là Đang rời sảnh');
  assert.equal(
    gm.getSnapshot().miniGame.participantUserIds.includes(uid),
    false,
    'Khi bắt đầu rời sảnh phải rút tên an toàn khỏi Mini Game đang chạy'
  );

  // Elapsed 4s more to finish gate walk animation -> removed from hall
  gm.simulateTimeElapsed(4, uid);
  assert.equal(gm.getDiscipleCount(), 0, 'Sau khi đi ra tới cổng phải xóa nhân vật khỏi danh sách hiển thị sảnh');

  gm.finishMiniGame(true);
  gm.resetStayDurationConfig();
  return 'Cảnh báo sắp hết giờ -> thoát Mini Game an toàn -> đi bộ ra cổng -> xóa khỏi sảnh hoạt động hoàn hảo.';
});

// 51. Người chơi hết giờ rời sảnh KHÔNG mất cấp bậc & tổng xu; khi bình luận quay lại vẫn giữ nguyên chức danh & xu
runTest(51, 'Bảo toàn Cấp Bậc & Tổng Xu khi hết giờ rời sảnh: Bình luận quay lại phục hồi nguyên vẹn chức danh & trang phục', () => {
  gm.clearAllPlayers();
  gm.setStayDurationConfig({
    inactivityTimeoutSec: 10,
    autoDepartEnabled: true,
    walkToGateOnDepart: false, // Rời ngay khi hết giờ để test nhanh
    applyMode: 'immediate',
  });

  const uid = 'return_vip_hero';
  gm.handleCommentEvent({
    id: 'rv_c1',
    type: 'comment',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Dương Quá',
    comment: 'Xin nhập môn!',
  });
  gm.handleGiftEvent({
    id: 'rv_g1',
    type: 'gift',
    timestamp: Date.now(),
    userId: uid,
    uniqueId: uid,
    nickname: 'Dương Quá',
    coinValue: 99,
    giftName: 'Huyền Thiết Trọng Kiếm',
    giftCount: 1,
  });

  const beforeDepart = gm.getSnapshot().disciples.find(d => d.userId === uid)!;
  assert.equal(beforeDepart.totalCoins, 99);
  assert.equal(beforeDepart.rankId, 'dai_truong_lao');
  assert.equal(beforeDepart.rankName, 'Đại Trưởng Lão');

  // Timeout expires -> leaves hall
  gm.simulateTimeElapsed(15, uid);
  assert.equal(gm.getDiscipleCount(), 0, 'Nhân vật đã rời khỏi sảnh khi hết thời gian');
  assert.equal(
    gm.getSnapshot().playerLedger.find(p => p.userId === uid)?.totalCoins,
    99,
    'Sổ tích lũy vẫn giữ nguyên 99 xu sau khi nhân vật rời sảnh'
  );

  // Player comments again later -> walks in from gate with saved 99 xu & Đại Trưởng Lão!
  const ret = gm.handleCommentEvent({
    id: 'rv_c2',
    type: 'comment',
    timestamp: Date.now() + 1000,
    userId: uid,
    uniqueId: uid,
    nickname: 'Dương Quá',
    comment: 'Ta đã quay trở lại đại điện!',
  });
  assert.equal(ret.isNewSpawn, true, 'Nhân vật tạo lại đi từ cổng chính vào đại điện');
  assert.equal(ret.disciple?.fsmState, 'walk_in_hall');
  assert.equal(ret.disciple?.totalCoins, 99, 'Quay lại sảnh phải giữ nguyên 99 xu');
  assert.equal(ret.disciple?.rankId, 'dai_truong_lao', 'Quay lại sảnh phải giữ nguyên cấp Đại Trưởng Lão');
  assert.equal(ret.disciple?.rankName, 'Đại Trưởng Lão');

  gm.resetStayDurationConfig();
  return 'Người chơi hết giờ rời sảnh rồi bình luận quay lại giữ nguyên 99 xu & chức danh Đại Trưởng Lão.';
});

// 52. Chế độ áp dụng "immediate" vs "new_only" & Nút Gia hạn thời gian của Admin
runTest(52, 'Chế độ áp dụng khi đổi thời gian ("immediate" vs "new_only") & Nút Gia hạn thời gian trong Admin', () => {
  gm.clearAllPlayers();
  gm.setStayDurationConfig({
    inactivityTimeoutMinutes: 7,
    inactivityTimeoutSec: 420,
    applyMode: 'immediate',
  });

  const existingUid = 'existing_hall_user';
  gm.handleCommentEvent({
    id: 'mode_c1',
    type: 'comment',
    timestamp: Date.now(),
    userId: existingUid,
    uniqueId: existingUid,
    nickname: 'Hoàng Dung',
    comment: 'Đang ở trong sảnh!',
  });
  assert.equal(gm.getSnapshot().disciples[0].remainingStaySec, 420);

  // Change timeout to 10 minutes (600s) with applyMode = 'new_only'
  gm.setStayDurationConfig({
    inactivityTimeoutMinutes: 10,
    inactivityTimeoutSec: 600,
    applyMode: 'new_only',
  });
  const existingAfterNewOnly = gm.getSnapshot().disciples.find(d => d.userId === existingUid)!;
  assert.ok(
    existingAfterNewOnly.remainingStaySec! <= 420,
    'Khi chọn "new_only", người đang ở sảnh vẫn giữ thời hạn cũ (420s)'
  );

  // New user joins -> gets 600s
  const newUid = 'new_hall_user';
  gm.handleCommentEvent({
    id: 'mode_c2',
    type: 'comment',
    timestamp: Date.now(),
    userId: newUid,
    uniqueId: newUid,
    nickname: 'Quách Tĩnh',
    comment: 'Người mới vào sảnh!',
  });
  const newDisciple = gm.getSnapshot().disciples.find(d => d.userId === newUid)!;
  assert.ok(newDisciple.remainingStaySec! >= 598, 'Người mới vào sảnh phải nhận thời hạn mới (600s)');

  // Now switch applyMode to 'immediate' with 3 minutes (180s) -> both users immediately switch to 180s base
  gm.setStayDurationConfig({
    inactivityTimeoutMinutes: 3,
    inactivityTimeoutSec: 180,
    applyMode: 'immediate',
  });
  assert.ok(
    gm.getSnapshot().disciples.every(d => (d.remainingStaySec ?? 0) <= 180),
    'Khi chọn "immediate", toàn bộ người đang ở sảnh phải được áp dụng ngay thời hạn 180s'
  );

  // Admin extends stay time for existingUid by +120s
  const extendedCount = gm.extendDiscipleStayTime(existingUid, 120, 'Test Admin gia hạn');
  assert.equal(extendedCount, 1);
  const extendedUser = gm.getSnapshot().disciples.find(d => d.userId === existingUid)!;
  assert.ok(extendedUser.remainingStaySec! >= 295, 'Sau khi Admin gia hạn +120s, thời gian còn lại phải tăng từ 180s lên ~300s');

  gm.resetStayDurationConfig();
  return 'Chế độ "immediate" / "new_only" và nút Gia hạn thời gian của Admin hoạt động chính xác.';
});

// 53. Kiểm thử 80 người chơi hoạt động cùng lúc + Hàng chờ tự động vào sảnh khi người cũ hết giờ
runTest(53, 'Kiểm thử 80 người chơi hoạt động cùng lúc + Giải phóng vị trí cho Hàng chờ khi hết thời gian', () => {
  gm.clearAllPlayers();
  gm.setStayDurationConfig({
    inactivityTimeoutSec: 30,
    walkToGateOnDepart: false,
    autoDepartEnabled: true,
    applyMode: 'immediate',
  });

  // Spawn 85 players -> 80 in hall + 5 in waitingQueue
  gm.spawnDemoPlayers(85);
  assert.equal(gm.getDiscipleCount(), 80, 'Sảnh chứa tối đa 80 người');
  assert.equal(gm.getWaitingQueueCount(), 5, '5 người nằm trong hàng chờ');

  // Verify all 80 disciples have valid remainingStaySec and stayStatus
  const snap80 = gm.getSnapshot();
  assert.equal(snap80.disciples.length, 80);
  assert.ok(
    snap80.disciples.every(d => typeof d.remainingStaySec === 'number' && d.remainingStaySec > 0 && d.stayStatus === 'active'),
    'Cả 80 người chơi đều được bộ đếm tập trung quản lý chính xác'
  );

  // Expire 3 specific disciples in the hall -> 3 waitingQueue players must automatically enter the hall!
  const firstThreeIds = snap80.disciples.slice(0, 3).map(d => d.userId);
  for (const uid of firstThreeIds) {
    gm.simulateTimeElapsed(40, uid);
  }

  assert.equal(gm.getDiscipleCount(), 80, 'Sau khi 3 người rời sảnh, 3 người từ hàng chờ lập tức vào thế chỗ giữ quân số 80');
  assert.equal(gm.getWaitingQueueCount(), 2, 'Hàng chờ giảm từ 5 xuống 2 người');

  gm.resetStayDurationConfig();
  return 'Quản lý tập trung 80 người chơi cùng lúc mượt mà & tự động đôn Hàng chờ khi có người hết thời gian rời sảnh.';
});

// ============================================================================
// 54–58. KIỂM THỬ CẬP NHẬT GIAO DIỆN 9:16: HẠ NGAI GIÁO CHỦ 30PX, NÂNG QUÉT SÂN 25PX,
//        POPUP TỰ ẨN SAU 4 GIÂY (FADE 0.7S) & OPACITY NỀN BẢNG 0.4
// ============================================================================

// 54. Hạ Ngai Giáo Chủ xuống 30px (y: 19% -> 22.13% trên khung 9:16 540x960) & đồng bộ hoạt ảnh
runTest(54, 'Hạ Ngai Giáo Chủ xuống đúng 30px (Y: 19% ➔ 22.13% trên khung 9:16), giữ X=50% & đồng bộ hoạt ảnh', () => {
  const cfg = gm.getConfig();
  const thronePos = cfg.sectLeader.thronePosition;
  assert.equal(thronePos.x, 50, 'Tọa độ ngang X của Ngai Giáo Chủ phải giữ nguyên ở trung tâm (50%)');
  const offsetPxY = Math.round(((thronePos.y - 19) / 100) * 960);
  assert.equal(offsetPxY, 30, `Ngai Giáo Chủ phải hạ xuống đúng +30px trên khung 960px (hiện tại: +${offsetPxY}px, y=${thronePos.y}%)`);

  // Verify Sect Leader stand_up_throne, walk_down_steps, and return_to_throne synchronize with new Throne Y
  gm.triggerSectLeaderAnimation('stand_up_throne');
  assert.equal(gm.getSnapshot().sectLeader.currentAnimation, 'stand_up_throne');
  gm.triggerSectLeaderAnimation('walk_down_steps');
  const stepTargetY = gm.getSnapshot().sectLeader.targetY;
  assert.ok(
    Math.abs(stepTargetY - (thronePos.y + 8.5)) < 0.2,
    `Bước xuống thềm phải đồng bộ với vị trí ngai mới (targetY=${stepTargetY}%)`
  );
  gm.triggerSectLeaderAnimation('return_to_throne');
  assert.equal(gm.getSnapshot().sectLeader.targetX, thronePos.x);
  assert.equal(gm.getSnapshot().sectLeader.targetY, thronePos.y);

  // Verify disciples in FreeRoamArea never overlap the lowered Throne
  gm.setPopulationPreset(50);
  for (let i = 0; i < 10; i++) gm.tick();
  const overlapping = gm
    .getSnapshot()
    .disciples.filter(
      d => !d.isSectLeader && !d.isCoLeader && gm.isInsideThroneReservedZone(d.x, d.y, 0.2)
    );
  assert.equal(overlapping.length, 0, 'Không có đệ tử nào chồng lên cụm Ngai Giáo Chủ sau khi hạ 30px');

  return `Ngai Giáo Chủ tại X=${thronePos.x}%, Y=${thronePos.y}% (+${offsetPxY}px), đồng bộ bước xuống thềm & trở về ngai.`;
});

// 55. Nâng Khu Vực Quét Sân lên 25px (yMin: 88% -> 85.4%, yMax: 95% -> 92.4%) & đồng bộ đệ tử quét sân
runTest(55, 'Nâng Khu Vực Quét Sân lên đúng 25px (Y: 88..95% ➔ 85.4..92.4% trên khung 9:16) & đồng bộ nhân vật', () => {
  const sweepZone = gm.getConfig().sceneConfig.zones.sweeping_courtyard;
  assert.equal(sweepZone.xMin, 73, 'Giữ nguyên tọa độ ngang X (xMin=73%)');
  assert.equal(sweepZone.xMax, 94, 'Giữ nguyên tọa độ ngang X (xMax=94%)');
  const shiftUpPx = Math.round(((88 - sweepZone.yMin) / 100) * 960);
  assert.equal(shiftUpPx, 25, `Khu vực Quét sân phải nâng lên đúng 25px (hiện tại: ${shiftUpPx}px, yMin=${sweepZone.yMin}%)`);

  // Trigger mini-game loss so 5 disciples are sent to sweep at the new raised coordinates
  gm.clearAllPlayers();
  gm.spawnDemoPlayers(8);
  gm.startMiniGame('ma_quyen_loan_vu');
  gm.finishMiniGame(false);

  const sweepers = gm.getSnapshot().sweepingDisciples;
  assert.equal(sweepers.length, 5, 'Phải có 5 đệ tử bị phạt quét sân');
  for (const s of sweepers) {
    assert.ok(
      s.targetX >= sweepZone.xMin && s.targetX <= sweepZone.xMax,
      `Đệ tử quét sân phải đứng trong vùng X (${sweepZone.xMin}..${sweepZone.xMax}%), hiện tại: ${s.targetX}%`
    );
    assert.ok(
      s.targetY >= sweepZone.yMin && s.targetY <= sweepZone.yMax,
      `Đệ tử quét sân phải đứng trong vùng Y mới đã nâng 25px (${sweepZone.yMin}..${sweepZone.yMax}%), hiện tại: ${s.targetY}%`
    );
  }

  // Commenting again immediately releases the disciple back to Main Hall
  const firstSweeper = sweepers[0];
  const rel = gm.handleCommentEvent({
    id: 'sweep_rel_v2',
    type: 'comment',
    timestamp: Date.now(),
    userId: firstSweeper.userId,
    uniqueId: firstSweeper.uniqueId,
    nickname: firstSweeper.displayName,
    comment: 'Quét xong lá rồi!',
  });
  assert.equal(rel.releasedFromSweep, true, 'Bình luận lại phải quay về Đại Điện ngay');
  return `Khu vực Quét sân tại Y=${sweepZone.yMin}..${sweepZone.yMax}% (nâng +${shiftUpPx}px), 5 đệ tử quét đúng tọa độ mới.`;
});

// 56. Thông báo tạm thời (Popup thăng cấp, kết quả Mini Game, Thánh chỉ) tự biến mất sau 4 giây + Fade-out 0.7s
runTest(56, 'Thông báo tạm thời tự động biến mất sau 4.0 giây (4000ms) kèm hiệu ứng mờ dần Fade-Out 0.7 giây (700ms)', () => {
  const overlayCfg = gm.getConfig().overlayConfig;
  assert.equal(overlayCfg.popupDurationMs, 4000, 'Thời gian hiển thị popup mặc định phải là 4000ms (4 giây)');
  assert.equal(overlayCfg.popupFadeOutMs, 700, 'Thời gian fade-out mặc định phải là 700ms (0.7 giây)');
  assert.equal(overlayCfg.autoHidePopups, true, 'Chế độ tự ẩn popup tạm thời phải bật mặc định');

  // Check noticePanels default durations for temporary popups vs fixed tables
  const panels = gm.getConfig().noticePanels;
  const promoPanel = panels.find(p => p.id === 'promotion_banner')!;
  const mgResultPanel = panels.find(p => p.id === 'minigame_result')!;
  const speechPanel = panels.find(p => p.id === 'sect_leader_speech')!;
  const elderPanel = panels.find(p => p.id === 'elder_leaderboard')!;
  const rankTablePanel = panels.find(p => p.id === 'gift_rank_table')!;

  assert.equal(promoPanel.durationMs, 4000, 'Popup thăng cấp hiển thị 4000ms');
  assert.equal(mgResultPanel.durationMs, 4000, 'Popup kết quả mini game hiển thị 4000ms');
  assert.equal(speechPanel.durationMs, 4000, 'Popup thánh chỉ hiển thị 4000ms');
  assert.equal(elderPanel.durationMs, 0, 'Bảng TRƯỞNG LÃO là bảng cố định (durationMs = 0)');
  assert.equal(rankTablePanel.durationMs, 0, 'Bảng PHONG CẤP là bảng cố định (durationMs = 0)');

  return 'Popup tạm thời hiển thị đúng 4000ms, fade-out 700ms rồi tự ẩn; Bảng TRƯỞNG LÃO & PHONG CẤP giữ cố định.';
});

// 57. Opacity nền bảng = 0.4 (rgba) cho Bảng TRƯỞNG LÃO, PHONG CẤP, Thông báo thăng cấp (không làm mờ chữ)
runTest(57, 'Opacity nền các bảng về đúng 0.4 (chỉ áp dụng rgba cho lớp nền, giữ nguyên độ sắc nét của chữ & icon)', () => {
  const overlayCfg = gm.getConfig().overlayConfig;
  assert.equal(overlayCfg.panelBgOpacity, 0.4, 'Opacity nền bảng mặc định phải bằng 0.4');

  const hudSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/ui/MaGiaoOverlayHUD.tsx'),
    'utf8'
  );
  assert.ok(
    hudSource.includes('rgba(12, 8, 22, ${panelBgOpacity})'),
    'MaGiaoOverlayHUD phải dùng rgba(..., panelBgOpacity) cho lớp nền bảng để không làm mờ chữ bên trong'
  );
  assert.ok(
    hudSource.includes('CRISP_TEXT_SHADOW'),
    'Chữ và số liệu bên trong bảng phải có text-shadow độ tương phản cao, rõ nét'
  );

  return 'Opacity nền bảng = 0.4 (rgba), chữ/icon/danh hiệu sắc nét 100% với viền vàng đồng Ma Giáo.';
});

// 58. Tùy chỉnh trong Admin Tab 16 (Layout & CSS) đồng bộ trực tiếp sang Game & OBS
runTest(58, 'Tùy chỉnh vị trí Ngai Giáo Chủ, Khu Quét Sân, Opacity nền & Thời gian Popup trong Admin đồng bộ sang Game & OBS', () => {
  const cfg = gm.getConfig();
  cfg.sectLeader.thronePosition = { x: 50, y: 23.0 };
  cfg.sceneConfig.zones.sweeping_courtyard = {
    xMin: 72,
    xMax: 93,
    yMin: 84.0,
    yMax: 91.0,
    label: 'Góc Phạt Quét Sân',
  };
  cfg.overlayConfig.panelBgOpacity = 0.45;
  cfg.overlayConfig.popupDurationMs = 4500;
  cfg.overlayConfig.popupFadeOutMs = 800;

  gm.updateMasterConfig(cfg);
  const snap = gm.getSnapshot();
  assert.equal(snap.sectLeader.y, 23.0, 'Giáo Chủ phải cập nhật ngay sang tọa độ Y mới từ Admin');
  assert.equal(snap.config.sceneConfig.zones.sweeping_courtyard.yMin, 84.0, 'Khu Quét sân phải cập nhật ngay sang tọa độ Y mới');
  assert.equal(snap.config.overlayConfig.panelBgOpacity, 0.45);
  assert.equal(snap.config.overlayConfig.popupDurationMs, 4500);

  // Restore defaults (+30px Throne = 22.13%, -25px Sweeping = 85.4%, Opacity = 0.4, Popup = 4000ms)
  cfg.sectLeader.thronePosition = { x: 50, y: 22.13 };
  cfg.sceneConfig.zones.sweeping_courtyard = {
    xMin: 73,
    xMax: 94,
    yMin: 85.4,
    yMax: 92.4,
    label: 'Góc Phạt Quét Sân',
  };
  cfg.overlayConfig.panelBgOpacity = 0.4;
  cfg.overlayConfig.popupDurationMs = 4000;
  cfg.overlayConfig.popupFadeOutMs = 700;
  gm.updateMasterConfig(cfg);

  return 'Đồng bộ trực tiếp vị trí Ngai Giáo Chủ, Khu vực Quét sân, Opacity nền & Popup giữa Admin, Game và OBS.';
});

console.log('================================================================================');
const passedCount = results.filter(r => r.passed).length;
console.log(`TỔNG KẾT KIỂM THỬ: ${passedCount}/${results.length} HẠNG MỤC PASS (100%)`);
console.log('================================================================================');

if (passedCount !== results.length) {
  process.exit(1);
}




