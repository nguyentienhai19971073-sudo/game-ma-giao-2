import { io, Socket } from 'socket.io-client';
import {
  LiveConnectionStatus,
  TikTokLiveEvent,
  MaGiaoMasterConfig,
  OBSSyncSettings,
  GiftMappingConfig,
  UnknownGiftLog,
} from '../types/magiao';
import { giftRegistry } from './GiftRegistry';

type StatusListener = (status: LiveConnectionStatus) => void;
type EventListener = (event: TikTokLiveEvent) => void;
type ConfigListener = (config: MaGiaoMasterConfig) => void;
type OBSSyncListener = (settings: OBSSyncSettings) => void;
type AdminCommandListener = (cmd: Record<string, unknown>) => void;

export class LiveConnectionManager {
  private socket: Socket | null = null;
  private readonly clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  private status: LiveConnectionStatus = {
    mode: 'demo',
    state: 'disconnected',
    viewerCount: 0,
    eventCount: 0,
  };

  private statusListeners = new Set<StatusListener>();
  private eventListeners = new Set<EventListener>();
  private configListeners = new Set<ConfigListener>();
  private obsSyncListeners = new Set<OBSSyncListener>();
  private adminCmdListeners = new Set<AdminCommandListener>();

  public getClientId(): string {
    return this.clientId;
  }

  public connectSocket() {
    if (this.socket || typeof window === 'undefined') return;

    this.socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    this.socket.on('tiktok:status', (status: LiveConnectionStatus) => {
      this.status = status;
      this.statusListeners.forEach(fn => fn(this.status));
    });

    this.socket.on('tiktok:event', (evt: TikTokLiveEvent) => {
      this.eventListeners.forEach(fn => fn(evt));
    });

    this.socket.on('gifts:updated', (mappings: GiftMappingConfig[]) => {
      giftRegistry.setMappingsFromServer(mappings);
    });

    this.socket.on('gifts:unknown_updated', (unknowns: UnknownGiftLog[]) => {
      giftRegistry.setUnknownGiftsFromServer(unknowns);
    });

    this.socket.on('magiao:config_updated', (cfg: MaGiaoMasterConfig) => {
      this.configListeners.forEach(fn => fn(cfg));
    });

    this.socket.on('magiao:obs_sync_settings', (settings: OBSSyncSettings) => {
      this.obsSyncListeners.forEach(fn => fn(settings));
    });

    this.socket.on('magiao:admin_command', (cmd: Record<string, unknown>) => {
      this.adminCmdListeners.forEach(fn => fn(cmd));
    });
  }

  public getStatus(): LiveConnectionStatus {
    return { ...this.status };
  }

  public onStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    fn(this.getStatus());
    return () => this.statusListeners.delete(fn);
  }

  public onEvent(fn: EventListener): () => void {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  public onConfigUpdate(fn: ConfigListener): () => void {
    this.configListeners.add(fn);
    return () => this.configListeners.delete(fn);
  }

  public onOBSSync(fn: OBSSyncListener): () => void {
    this.obsSyncListeners.add(fn);
    return () => this.obsSyncListeners.delete(fn);
  }

  public onAdminCommand(fn: AdminCommandListener): () => void {
    this.adminCmdListeners.add(fn);
    return () => this.adminCmdListeners.delete(fn);
  }

  public async connectTikTokRoom(uniqueId: string): Promise<LiveConnectionStatus> {
    try {
      const resp = await fetch('/api/tiktok/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueId }),
      });
      const data = await resp.json();
      this.status = data;
      this.statusListeners.forEach(fn => fn(this.status));
      return data;
    } catch (err) {
      this.status = {
        mode: 'tiktok_live',
        state: 'error',
        uniqueId,
        viewerCount: 0,
        eventCount: 0,
        errorMessage: err instanceof Error ? err.message : 'Lỗi kết nối server',
      };
      this.statusListeners.forEach(fn => fn(this.status));
      return this.status;
    }
  }

  public async disconnectTikTokRoom(): Promise<LiveConnectionStatus> {
    try {
      const resp = await fetch('/api/tiktok/disconnect', { method: 'POST' });
      const data = await resp.json();
      this.status = data;
      this.statusListeners.forEach(fn => fn(this.status));
      return data;
    } catch {
      this.status = {
        mode: 'demo',
        state: 'disconnected',
        viewerCount: 0,
        eventCount: 0,
      };
      this.statusListeners.forEach(fn => fn(this.status));
      return this.status;
    }
  }

  public emitAdminCommand(cmd: Record<string, unknown>) {
    const payload = { ...cmd, senderClientId: this.clientId };
    if (this.socket && this.socket.connected) {
      this.socket.emit('magiao:admin_command', payload);
    } else {
      this.adminCmdListeners.forEach(fn => fn({ ...payload, timestamp: Date.now() }));
    }
  }

  public async pushMasterConfig(config: MaGiaoMasterConfig, adminToken?: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['x-admin-token'] = adminToken;

      const resp = await fetch('/api/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify(config),
      });
      if (resp.ok) {
        return true;
      }
      return false;
    } catch {
      if (this.socket && this.socket.connected) {
        this.socket.emit('magiao:update_config', config);
        return true;
      }
      return false;
    }
  }
}

export const liveConnectionManager = new LiveConnectionManager();
