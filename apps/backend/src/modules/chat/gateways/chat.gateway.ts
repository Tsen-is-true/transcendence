import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
import { ChatService } from '../chat.service';
import { FriendsService } from '@modules/friends/friends.service';
import { MetricsService } from '@modules/monitoring/metrics.service';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

@WebSocketGateway({ namespace: '/chat', cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private socketUser = new Map<string, number>();
  private userSockets = new Map<number, Set<string>>();
  private spamTracker = new Map<string, number[]>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly friendsService: FriendsService,
    private readonly metricsService: MetricsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.query.token as string) ||
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token);
      const userId = payload.sub;

      this.socketUser.set(client.id, userId);

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      this.metricsService.incWebSocketConnections();
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUser.get(client.id);
    this.socketUser.delete(client.id);
    this.metricsService.decWebSocketConnections();

    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
  }

  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: number; content: string },
  ) {
    const senderId = this.socketUser.get(client.id);
    if (!senderId) return;

    const { receiverId, content } = data;

    // Block check
    const blocked = await this.friendsService.isBlocked(senderId, receiverId);
    if (blocked) {
      client.emit('chat:error', { message: '차단된 유저입니다' });
      return;
    }

    // Content validation
    if (!content || content.length < 1 || content.length > 500) {
      client.emit('chat:error', {
        message: '메시지는 1~500자여야 합니다',
      });
      return;
    }

    // Spam prevention: max 3 messages per second to same user
    const spamKey = `${senderId}:${receiverId}`;
    const now = Date.now();
    const timestamps = this.spamTracker.get(spamKey) || [];
    const recentTimestamps = timestamps.filter((t) => now - t < 1000);

    if (recentTimestamps.length >= 3) {
      client.emit('chat:error', { message: '메시지를 너무 빠르게 보내고 있습니다' });
      return;
    }

    recentTimestamps.push(now);
    this.spamTracker.set(spamKey, recentTimestamps);

    // XSS escape
    const sanitizedContent = escapeHtml(content);

    // Save to DB
    const message = await this.chatService.saveMessage(
      senderId,
      receiverId,
      sanitizedContent,
    );

    const messagePayload = {
      messageId: message.messageId,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt,
    };

    // Send to receiver
    this.emitToUser(receiverId, 'chat:message', messagePayload);

    // Send to sender's other sockets (multi-device sync)
    this.emitToUser(senderId, 'chat:message', messagePayload);
  }

  @SubscribeMessage('chat:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: number },
  ) {
    const userId = this.socketUser.get(client.id);
    if (!userId) return;

    await this.chatService.markAsRead(userId, data.senderId);

    this.emitToUser(data.senderId, 'chat:read', {
      senderId: userId,
      readAt: new Date(),
    });
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: number; isTyping: boolean },
  ) {
    const userId = this.socketUser.get(client.id);
    if (!userId) return;

    this.emitToUser(data.receiverId, 'chat:typing', {
      userId,
      isTyping: data.isTyping,
    });
  }

  private emitToUser(userId: number, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }
}
