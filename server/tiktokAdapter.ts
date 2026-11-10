import * as TikTokLiveConnector from 'tiktok-live-connector';
import { Server as SocketIOServer } from 'socket.io';
import { LiveConnectionStatus, TikTokLiveEvent } from '../src/types/magiao';
import { resolveTikTokDisplayName } from '../src/utils/tiktokDisplayName';

interface TikTokConnectionInstance {
  connect: () => Promise<Record<string, unknown>>;
  disconnect: () => void;
  on: (event: string, handler: (data: Record<string, unknown>) => void) => void;
}

const WebcastPushConnectionCtor =
  (TikTokLiveConnector as Record<string, unknown>).WebcastPushConnection ||
  (TikTokLiveConnector as Record<string, unknown>).TikTokLiveConnection;

export function sanitizeTikTokChatText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let text = raw.trim();
  if (!text) return '';

  text = text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';

  const lower = text.toLowerCase();
  if (
    lower === 'sent a gift' ||
    lower === 'đã gửi một phần quà' ||
    lower === 'joined' ||
    lower === 'đã tham gia' ||
    lower === 'shared the live'
  ) {
    return '';
  }

  return text.slice(0, 140);
}

export class TikTokLiveAdapter {
  private io: SocketIOServer;
  private connection: TikTokConnectionInstance | null = null;
  private status: LiveConnectionStatus = {
    mode: 'demo',
    state: 'disconnected',
    viewerCount: 0,
    eventCount: 0,
  };

  private processedMsgIds = new Set<string>();
  private processedStreakTotals = new Map<string, number>();
  private completedStreakTotals = new Map<string, number>();

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  public getStatus(): LiveConnectionStatus {
    return { ...this.status };
  }

  private broadcastStatus() {
    this.io.emit('tiktok:status', this.getStatus());
  }

  private emitLiveEvent(event: TikTokLiveEvent) {
    this.status.eventCount += 1;
    this.status.lastEventAt = Date.now();
    this.io.emit('tiktok:event', event);
    this.broadcastStatus();
  }

  public async connectToRoom(uniqueId: string): Promise<LiveConnectionStatus> {
    const cleanId = uniqueId.replace(/^@/, '').trim();
    if (!cleanId) {
      this.status = {
        ...this.status,
        state: 'error',
        errorMessage: 'Vui lòng nhập TikTok ID (@username) hợp lệ.',
      };
      this.broadcastStatus();
      return this.getStatus();
    }

    await this.disconnect();

    this.status = {
      mode: 'tiktok_live',
      state: 'connecting',
      uniqueId: cleanId,
      viewerCount: 0,
      eventCount: 0,
    };
    this.broadcastStatus();

    try {
      const signApiKey = (process.env.TIKTOK_SIGN_API_KEY || '').trim();
      const Ctor = WebcastPushConnectionCtor as new (
        uniqueId: string,
        options?: Record<string, unknown>
      ) => TikTokConnectionInstance;
      this.connection = new Ctor(cleanId, {
        processInitialData: false,
        enableExtendedGiftInfo: true,
        enableWebsocketUpgrade: true,
        requestPollingIntervalMs: 2000,
        ...(signApiKey ? { signApiKey } : {}),
      });

      const state = await this.connection.connect();
      this.status = {
        mode: 'tiktok_live',
        state: 'connected',
        uniqueId: cleanId,
        roomId: String(state.roomId || ''),
        viewerCount: Number(state.viewerCount || 0),
        connectedAt: Date.now(),
        eventCount: 0,
      };
      this.broadcastStatus();
      this.registerListeners();
      return this.getStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể kết nối phòng TikTok LIVE.';
      this.status = {
        mode: 'tiktok_live',
        state: 'error',
        uniqueId: cleanId,
        viewerCount: 0,
        eventCount: 0,
        errorMessage: message,
      };
      this.broadcastStatus();
      return this.getStatus();
    }
  }

  public async disconnect(): Promise<LiveConnectionStatus> {
    if (this.connection) {
      try {
        this.connection.disconnect();
      } catch {
        // Ignore disconnect cleanup error
      }
      this.connection = null;
    }
    this.processedMsgIds.clear();
    this.processedStreakTotals.clear();
    this.completedStreakTotals.clear();

    this.status = {
      mode: 'demo',
      state: 'disconnected',
      viewerCount: 0,
      eventCount: 0,
    };
    this.broadcastStatus();
    return this.getStatus();
  }

  private registerListeners() {
    if (!this.connection) return;

    this.connection.on('roomUser', (data: Record<string, unknown>) => {
      if (typeof data?.viewerCount === 'number') {
        this.status.viewerCount = data.viewerCount;
        this.broadcastStatus();
      }
    });

    this.connection.on('chat', (data: Record<string, unknown>) => {
      const msgId = String(data.msgId || '');
      if (msgId && this.processedMsgIds.has(msgId)) return;
      if (msgId) {
        this.processedMsgIds.add(msgId);
        if (this.processedMsgIds.size > 2000) {
          const first = this.processedMsgIds.values().next().value;
          if (first) this.processedMsgIds.delete(first);
        }
      }

      const commentText = sanitizeTikTokChatText(data.comment);
      if (!commentText) return;

      const userId = String(data.userId || data.uniqueId || `u_${Date.now()}`);
      const uniqueId = String(data.uniqueId || userId);
      const nickname = resolveTikTokDisplayName({
        nickname: data.nickname as string,
        displayName: (data.userDetails as Record<string, unknown>)?.nickname as string,
        uniqueId,
        userId,
      });

      this.emitLiveEvent({
        id: msgId || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'comment',
        timestamp: Date.now(),
        userId,
        uniqueId,
        nickname,
        avatarUrl: typeof data.profilePictureUrl === 'string' ? data.profilePictureUrl : undefined,
        comment: commentText,
      });
    });

    this.connection.on('gift', (data: Record<string, unknown>) => {
      const userId = String(data.userId || data.uniqueId || `u_${Date.now()}`);
      const uniqueId = String(data.uniqueId || userId);
      const nickname = resolveTikTokDisplayName({
        nickname: data.nickname as string,
        uniqueId,
        userId,
      });

      const giftId = Number(data.giftId || 0);
      const giftName = String(data.giftName || data.describe || `Gift #${giftId}`);
      const repeatCount = Math.max(1, Number(data.repeatCount || 1));
      const giftType = Number(data.giftType || 0);
      const repeatEnd = Boolean(data.repeatEnd);
      const groupId = String(data.groupId || `${userId}_${giftId}`);
      const streakKey = `${userId}:${giftId}:${groupId}`;

      // Deduplicate gift streaks so coins are never double-counted
      let deltaCount = repeatCount;
      if (giftType === 1) {
        const completedCount = this.completedStreakTotals.get(streakKey) || 0;
        const prevCount = Math.max(this.processedStreakTotals.get(streakKey) || 0, completedCount);
        if (repeatCount <= prevCount) {
          return;
        }
        deltaCount = repeatCount - prevCount;
        this.processedStreakTotals.set(streakKey, repeatCount);
        if (repeatEnd) {
          this.completedStreakTotals.set(streakKey, repeatCount);
        }
      } else {
        const msgId = String(data.msgId || '');
        if (msgId && this.processedMsgIds.has(msgId)) return;
        if (msgId) this.processedMsgIds.add(msgId);
      }

      const unitCoin = Math.max(1, Number(data.diamondCount || 1));

      this.emitLiveEvent({
        id: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'gift',
        timestamp: Date.now(),
        userId,
        uniqueId,
        nickname,
        avatarUrl: typeof data.profilePictureUrl === 'string' ? data.profilePictureUrl : undefined,
        giftId,
        giftName,
        giftCount: deltaCount,
        coinValue: unitCoin * deltaCount,
      });
    });

    this.connection.on('like', (data: Record<string, unknown>) => {
      const userId = String(data.userId || data.uniqueId || `u_${Date.now()}`);
      const uniqueId = String(data.uniqueId || userId);
      const nickname = resolveTikTokDisplayName({
        nickname: data.nickname as string,
        uniqueId,
        userId,
      });

      this.emitLiveEvent({
        id: `like_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'like',
        timestamp: Date.now(),
        userId,
        uniqueId,
        nickname,
        likeCount: Math.max(1, Number(data.likeCount || 1)),
      });
    });

    this.connection.on('streamEnd', () => {
      this.status = {
        ...this.status,
        state: 'disconnected',
        errorMessage: 'Phiên TikTok LIVE đã kết thúc.',
      };
      this.broadcastStatus();
    });
  }

  public ingestExternalEvent(raw: Partial<TikTokLiveEvent>): TikTokLiveEvent {
    const userId = String(raw.userId || raw.uniqueId || `ext_${Date.now()}`);
    const uniqueId = String(raw.uniqueId || userId);
    const nickname = resolveTikTokDisplayName({
      nickname: raw.nickname,
      uniqueId,
      userId,
    });

    const event: TikTokLiveEvent = {
      id: raw.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: raw.type || 'comment',
      timestamp: Date.now(),
      userId,
      uniqueId,
      nickname,
      avatarUrl: raw.avatarUrl,
      comment: raw.comment ? sanitizeTikTokChatText(raw.comment) : undefined,
      giftId: raw.giftId ? Number(raw.giftId) : undefined,
      giftName: raw.giftName,
      giftCount: raw.giftCount ? Math.max(1, Number(raw.giftCount)) : undefined,
      coinValue: raw.coinValue ? Math.max(1, Number(raw.coinValue)) : undefined,
      likeCount: raw.likeCount ? Math.max(1, Number(raw.likeCount)) : undefined,
      isDemo: raw.isDemo,
    };

    this.emitLiveEvent(event);
    return event;
  }
}
