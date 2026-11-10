import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { TikTokLiveAdapter } from './server/tiktokAdapter';
import {
  getAvailableVoiceOptions,
  synthesizeServerTTS,
  ServerTTSRequest,
  setRuntimeTTSCredentials,
} from './server/ttsProxy';
import {
  PersistentGiftStore,
  DEFAULT_MAGIAO_GIFT_PRESETS,
} from './server/giftStore';
import {
  PersistentOBSSyncStore,
  isAuthorizedAdminRequest,
} from './server/obsSyncStore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  app.use(express.json({ limit: '5mb' }));

  const tiktokAdapter = new TikTokLiveAdapter(io);
  const giftStore = new PersistentGiftStore();
  const obsSyncStore = new PersistentOBSSyncStore();

  // ==========================================================================
  // 1. HEALTH & DIAGNOSTICS
  // ==========================================================================
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'MA GIÁO ONLINE – THIÊN HẠ ĐỆ NHẤT TÀ PHÁI',
      uptimeSec: Math.round(process.uptime()),
      tiktok: tiktokAdapter.getStatus(),
      voices: getAvailableVoiceOptions(),
      giftsCount: giftStore.getAll().length,
      obsSyncUpdatedAt: obsSyncStore.getSettings().updatedAt,
      masterConfigUpdatedAt: obsSyncStore.getMasterConfig().updatedAt,
    });
  });

  // ==========================================================================
  // 2. MASTER CONFIG (20-CATEGORY ADMIN PERSISTENCE & REALTIME SYNC)
  // ==========================================================================
  app.get('/api/config', (_req, res) => {
    res.json({
      ok: true,
      config: obsSyncStore.getMasterConfig(),
    });
  });

  app.put('/api/config', (req, res) => {
    if (!isAuthorizedAdminRequest(req)) {
      res.status(401).json({ ok: false, error: 'Unauthorized: Cần ADMIN_ACCESS_TOKEN hợp lệ.' });
      return;
    }
    const updated = obsSyncStore.updateMasterConfig(req.body);
    const obsSubset = obsSyncStore.getSettings();
    io.emit('magiao:config_updated', updated);
    io.emit('magiao:obs_sync_settings', obsSubset);
    io.emit('temple:obs_sync_settings', obsSubset);
    res.json({ ok: true, config: updated });
  });

  app.post('/api/config/reset', (req, res) => {
    if (!isAuthorizedAdminRequest(req)) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }
    const reset = obsSyncStore.resetMasterConfig();
    const obsSubset = obsSyncStore.getSettings();
    io.emit('magiao:config_updated', reset);
    io.emit('magiao:obs_sync_settings', obsSubset);
    io.emit('temple:obs_sync_settings', obsSubset);
    res.json({ ok: true, config: reset });
  });

  app.get('/api/config/export', (_req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="magiao-master-config.json"');
    res.send(JSON.stringify(obsSyncStore.getMasterConfig(), null, 2));
  });

  app.post('/api/config/import', (req, res) => {
    if (!isAuthorizedAdminRequest(req)) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }
    const updated = obsSyncStore.updateMasterConfig(req.body?.config || req.body);
    const obsSubset = obsSyncStore.getSettings();
    io.emit('magiao:config_updated', updated);
    io.emit('magiao:obs_sync_settings', obsSubset);
    io.emit('temple:obs_sync_settings', obsSubset);
    res.json({ ok: true, config: updated });
  });

  // ==========================================================================
  // 2B. STAY DURATION CONFIG (THỜI GIAN NGƯỜI CHƠI Ở LẠI ĐẠI ĐIỆN)
  // ==========================================================================
  app.get('/api/stay-config', (_req, res) => {
    const master = obsSyncStore.getMasterConfig();
    res.json({
      ok: true,
      stayDurationConfig: master.stayDurationConfig,
    });
  });

  app.put('/api/stay-config', (req, res) => {
    if (!isAuthorizedAdminRequest(req)) {
      res.status(401).json({ ok: false, error: 'Unauthorized: Cần ADMIN_ACCESS_TOKEN hợp lệ.' });
      return;
    }
    const updated = obsSyncStore.updateStayDurationConfig(req.body?.stayDurationConfig || req.body);
    const obsSubset = obsSyncStore.getSettings();
    io.emit('magiao:config_updated', updated);
    io.emit('magiao:obs_sync_settings', obsSubset);
    io.emit('temple:obs_sync_settings', obsSubset);
    res.json({
      ok: true,
      stayDurationConfig: updated.stayDurationConfig,
      config: updated,
    });
  });

  app.post('/api/stay-config/reset', (req, res) => {
    if (!isAuthorizedAdminRequest(req)) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }
    const updated = obsSyncStore.resetStayDurationConfig();
    const obsSubset = obsSyncStore.getSettings();
    io.emit('magiao:config_updated', updated);
    io.emit('magiao:obs_sync_settings', obsSubset);
    io.emit('temple:obs_sync_settings', obsSubset);
    res.json({
      ok: true,
      stayDurationConfig: updated.stayDurationConfig,
      config: updated,
    });
  });

  // ==========================================================================
  // 3. OBS SYNC SETTINGS
  // ==========================================================================
  app.get('/api/obs-sync', (_req, res) => {
    res.json({
      ok: true,
      settings: obsSyncStore.getSettings(),
    });
  });

  app.put('/api/obs-sync', (req, res) => {
    if (!isAuthorizedAdminRequest(req)) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }
    const updated = obsSyncStore.updateSettings(req.body);
    io.emit('magiao:obs_sync_settings', updated);
    io.emit('temple:obs_sync_settings', updated);
    io.emit('magiao:config_updated', obsSyncStore.getMasterConfig());
    res.json({ ok: true, settings: updated });
  });

  // ==========================================================================
  // 4. PERSISTENT GIFT REGISTRY CRUD + IMPORT/EXPORT + UNKNOWN GIFTS
  // ==========================================================================
  app.get('/api/gifts', (_req, res) => {
    res.json({
      ok: true,
      mappings: giftStore.getAll(),
      presets: DEFAULT_MAGIAO_GIFT_PRESETS,
      unknownGifts: giftStore.getUnknownLogs(),
    });
  });

  app.get('/api/gifts/presets', (_req, res) => {
    res.json({ ok: true, presets: DEFAULT_MAGIAO_GIFT_PRESETS });
  });

  app.get('/api/gifts/export', (_req, res) => {
    const mappings = giftStore.getAll();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="magiao-gift-mappings.json"');
    res.send(JSON.stringify({ exportedAt: new Date().toISOString(), mappings }, null, 2));
  });

  app.post('/api/gifts', (req, res) => {
    const result = giftStore.create(req.body || {});
    if (!result.ok) {
      res.status(400).json({ ok: false, error: (result as { ok: false; error: string }).error });
      return;
    }
    const mappings = giftStore.getAll();
    io.emit('gifts:updated', mappings);
    res.status(201).json({ ok: true, record: result.record, mappings });
  });

  app.put('/api/gifts/:id', (req, res) => {
    const result = giftStore.update(req.params.id, req.body || {});
    if (!result.ok) {
      res.status(400).json({ ok: false, error: (result as { ok: false; error: string }).error });
      return;
    }
    const mappings = giftStore.getAll();
    io.emit('gifts:updated', mappings);
    res.json({ ok: true, record: result.record, mappings });
  });

  app.delete('/api/gifts/:id', (req, res) => {
    const deleted = giftStore.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ ok: false, error: 'Không tìm thấy cấu hình quà cần xóa.' });
      return;
    }
    const mappings = giftStore.getAll();
    io.emit('gifts:updated', mappings);
    res.json({ ok: true, mappings });
  });

  app.post('/api/gifts/import', (req, res) => {
    const mode = req.body?.mode === 'merge' ? 'merge' : 'replace';
    const payload = req.body?.data !== undefined ? req.body.data : req.body;
    const result = giftStore.importJson(payload, mode);
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }
    io.emit('gifts:updated', result.mappings);
    res.json({ ok: true, count: result.count, mappings: result.mappings });
  });

  app.post('/api/gifts/reset', (_req, res) => {
    const mappings = giftStore.resetToDefaults();
    io.emit('gifts:updated', mappings);
    res.json({ ok: true, mappings });
  });

  app.post('/api/gifts/unknown', (req, res) => {
    const entry = giftStore.recordUnknownGift(req.body || {});
    const unknownGifts = giftStore.getUnknownLogs();
    io.emit('gifts:unknown_updated', unknownGifts);
    res.json({ ok: true, entry, unknownGifts });
  });

  app.delete('/api/gifts/unknown', (_req, res) => {
    giftStore.clearUnknownLogs();
    io.emit('gifts:unknown_updated', []);
    res.json({ ok: true, unknownGifts: [] });
  });

  // ==========================================================================
  // 5. VOICE & TTS PROXY (AZURE SPEECH NAM MINH / HOÀI MY + VIENEU + GEMINI)
  // ==========================================================================
  app.get('/api/tts/voices', (_req, res) => {
    res.json(getAvailableVoiceOptions());
  });

  app.post('/api/tts/credentials', (req, res) => {
    if (!isAuthorizedAdminRequest(req)) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }
    setRuntimeTTSCredentials({
      azureKey: req.body?.azureKey,
      azureRegion: req.body?.azureRegion,
      vieneuLocalUrl: req.body?.vieneuLocalUrl,
    });
    res.json({ ok: true, voices: getAvailableVoiceOptions() });
  });

  app.post('/api/tts/test', async (req, res) => {
    const body = req.body as Partial<ServerTTSRequest>;
    const sampleText =
      body.text?.trim() ||
      'Haha! Bổn tọa Dạ Thiên Minh xin chào toàn thể đệ tử Ma Giáo Online! Hôm nay đại điện rực rỡ, ai muốn tranh ngôi Giáo Chủ thì bước ra đây!';
    const result = await synthesizeServerTTS({
      text: sampleText,
      provider: body.provider || 'azure_speech',
      voiceId: body.voiceId,
      speed: body.speed ?? 1.0,
      pitch: body.pitch ?? 1.0,
      volume: body.volume ?? 0.9,
      azureKey: body.azureKey,
      azureRegion: body.azureRegion,
      vieneuUrl: body.vieneuUrl,
    });
    res.json(result);
  });

  app.post('/api/tts', async (req, res) => {
    const body = req.body as ServerTTSRequest;
    if (!body?.text || typeof body.text !== 'string') {
      res.status(400).json({ success: false, error: 'Thiếu trường text.' });
      return;
    }
    const result = await synthesizeServerTTS(body);
    res.json(result);
  });

  // ==========================================================================
  // 6. TIKTOK LIVE CONNECTOR & WEBHOOK
  // ==========================================================================
  app.get('/api/tiktok/status', (_req, res) => {
    res.json(tiktokAdapter.getStatus());
  });

  app.post('/api/tiktok/connect', async (req, res) => {
    const uniqueId = String(req.body?.uniqueId || '').trim();
    const status = await tiktokAdapter.connectToRoom(uniqueId);
    res.json(status);
  });

  app.post('/api/tiktok/disconnect', async (_req, res) => {
    const status = await tiktokAdapter.disconnect();
    res.json(status);
  });

  app.post('/api/tiktok/webhook', (req, res) => {
    const event = tiktokAdapter.ingestExternalEvent(req.body || {});
    res.json({ ok: true, event });
  });

  // ==========================================================================
  // 7. SOCKET.IO REALTIME SYNCHRONIZATION
  // ==========================================================================
  io.on('connection', socket => {
    socket.emit('tiktok:status', tiktokAdapter.getStatus());
    socket.emit('gifts:updated', giftStore.getAll());
    socket.emit('gifts:unknown_updated', giftStore.getUnknownLogs());
    socket.emit('magiao:obs_sync_settings', obsSyncStore.getSettings());
    socket.emit('temple:obs_sync_settings', obsSyncStore.getSettings());
    socket.emit('magiao:config_updated', obsSyncStore.getMasterConfig());

    socket.on('tiktok:connect', async (payload: { uniqueId: string }) => {
      await tiktokAdapter.connectToRoom(payload?.uniqueId || '');
    });

    socket.on('tiktok:disconnect', async () => {
      await tiktokAdapter.disconnect();
    });

    socket.on('tiktok:simulate', (payload: Record<string, unknown>) => {
      tiktokAdapter.ingestExternalEvent(payload);
    });

    socket.on('magiao:update_config', (payload: unknown) => {
      const updated = obsSyncStore.updateMasterConfig(payload);
      const obsSubset = obsSyncStore.getSettings();
      io.emit('magiao:config_updated', updated);
      io.emit('magiao:obs_sync_settings', obsSubset);
      io.emit('temple:obs_sync_settings', obsSubset);
    });

    socket.on('magiao:update_stay_config', (payload: unknown) => {
      const updated = obsSyncStore.updateStayDurationConfig(payload);
      const obsSubset = obsSyncStore.getSettings();
      io.emit('magiao:config_updated', updated);
      io.emit('magiao:obs_sync_settings', obsSubset);
      io.emit('temple:obs_sync_settings', obsSubset);
    });

    socket.on('magiao:update_obs_sync', (payload: unknown) => {
      const updated = obsSyncStore.updateSettings(payload);
      io.emit('magiao:obs_sync_settings', updated);
      io.emit('temple:obs_sync_settings', updated);
      io.emit('magiao:config_updated', obsSyncStore.getMasterConfig());
    });

    socket.on('temple:update_obs_sync', (payload: unknown) => {
      const updated = obsSyncStore.updateSettings(payload);
      io.emit('magiao:obs_sync_settings', updated);
      io.emit('temple:obs_sync_settings', updated);
    });

    // Forward direct admin commands (e.g. trigger mini-game, trigger leader animation, switch scene) to all views including OBS
    socket.on('magiao:admin_command', (cmd: Record<string, unknown>) => {
      io.emit('magiao:admin_command', { ...cmd, timestamp: Date.now() });
    });
  });

  // ==========================================================================
  // 8. VITE MIDDLEWARE OR PRODUCTION STATIC ASSETS
  // ==========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🐉 [MA GIÁO ONLINE] Server đang chạy tại http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[MA GIÁO ONLINE] Lỗi khởi động server:', err);
});
