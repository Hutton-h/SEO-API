// ============================================================================
// WebSocket 实时推送服务
// 基于 rooms 模式: 每个 projectId 是一个 room
// ============================================================================

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import logger from '../logger.js';

// ── 类型 ──────────────────────────────────────────────────────────────────────

export interface WsEvent {
  type: string;
  payload: unknown;
  timestamp: string;
}

// ── WebSocket 服务 ────────────────────────────────────────────────────────────

class WsService {
  private wss: WebSocketServer | null = null;
  // room → ws[] 映射
  private rooms = new Map<string, Set<WebSocket>>();
  // ws → { rooms, alives } 映射
  private clients = new Map<WebSocket, { rooms: Set<string>; alive: boolean }>();

  private heartbeatInterval: NodeJS.Timeout | null = null;

  /** 初始化 WebSocket 服务 */
  init(server: Parameters<typeof WebSocketServer>[0]['server']): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      maxPayload: 64 * 1024, // 64KB
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // 心跳检测: 每 30s 检查
    this.heartbeatInterval = setInterval(() => {
      this.wss?.clients.forEach((ws) => {
        const client = this.clients.get(ws);
        if (client && !client.alive) {
          logger.warn('[WebSocket] Client heartbeat timeout, terminating');
          ws.terminate();
          return;
        }
        if (client) {
          client.alive = false;
        }
        ws.ping();
      });
    }, 30000);

    logger.info('[WebSocket] Server initialized');
  }

  /** 处理新连接 */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientRooms = new Set<string>();

    // 从 URL 获取 projectId: /ws?projectId=xxx
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const projectId = url.searchParams.get('projectId');
    if (projectId) {
      clientRooms.add(projectId);
      this.joinRoom(projectId, ws);
    }

    this.clients.set(ws, { rooms: clientRooms, alive: true });

    // pong 响应
    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) client.alive = true;
    });

    // 消息处理
    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.handleClientMessage(ws, msg);
      } catch {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid JSON' } }));
      }
    });

    ws.on('close', () => {
      const client = this.clients.get(ws);
      if (client) {
        client.rooms.forEach((room) => this.leaveRoom(room, ws));
        this.clients.delete(ws);
      }
    });

    ws.on('error', (err: Error) => {
      logger.error({ error: err.message }, '[WebSocket] Client error');
    });

    // 发送欢迎消息
    ws.send(JSON.stringify({
      type: 'connected',
      payload: { message: 'Connected to Crane SEO WebSocket', rooms: [...clientRooms] },
      timestamp: new Date().toISOString(),
    }));
  }

  /** 处理客户端消息 */
  private handleClientMessage(ws: WebSocket, msg: { action?: string; room?: string }): void {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (msg.action) {
      case 'join': {
        if (msg.room) {
          client.rooms.add(msg.room);
          this.joinRoom(msg.room, ws);
          ws.send(JSON.stringify({
            type: 'joined',
            payload: { room: msg.room },
            timestamp: new Date().toISOString(),
          }));
        }
        break;
      }
      case 'leave': {
        if (msg.room) {
          client.rooms.delete(msg.room);
          this.leaveRoom(msg.room, ws);
          ws.send(JSON.stringify({
            type: 'left',
            payload: { room: msg.room },
            timestamp: new Date().toISOString(),
          }));
        }
        break;
      }
      default:
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: `Unknown action: ${msg.action}` },
          timestamp: new Date().toISOString(),
        }));
    }
  }

  /** 加入房间 */
  private joinRoom(room: string, ws: WebSocket): void {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(ws);
  }

  /** 离开房间 */
  private leaveRoom(room: string, ws: WebSocket): void {
    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(ws);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      }
    }
  }

  /**
   * 向房间广播事件
   * @param room 房间名（通常是 projectId）
   * @param event 事件
   */
  broadcast(room: string, event: WsEvent): void {
    const roomClients = this.rooms.get(room);
    if (!roomClients || roomClients.size === 0) return;

    const message = JSON.stringify({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });

    roomClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * 获取房间在线客户端数
   */
  getRoomClientCount(room: string): number {
    return this.rooms.get(room)?.size ?? 0;
  }

  /**
   * 获取所有房间状态
   */
  getStats(): Record<string, { clients: number }> {
    const stats: Record<string, { clients: number }> = {};
    this.rooms.forEach((clients, room) => {
      stats[room] = { clients: clients.size };
    });
    return stats;
  }

  /** 关闭服务 */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss?.close();
    logger.info('[WebSocket] Server shut down');
  }
}

export const wsService = new WsService();
export default wsService;