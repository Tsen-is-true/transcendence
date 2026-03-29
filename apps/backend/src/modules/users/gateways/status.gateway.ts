import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users.service';
import { FriendsService } from '@modules/friends/friends.service';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
import { MetricsService } from '@modules/monitoring/metrics.service';

@WebSocketGateway({ cors: true })
export class StatusGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private userSockets = new Map<number, Set<string>>();
  private socketUser = new Map<string, number>();
  private disconnectTimers = new Map<number, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
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

      const existingTimer = this.disconnectTimers.get(userId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.disconnectTimers.delete(userId);
      }

      await this.usersService.update(userId, { isOnline: true });
      await this.broadcastStatus(userId, true);
      this.metricsService.incWebSocketConnections();
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketUser.get(client.id);
    if (!userId) return;

    this.socketUser.delete(client.id);
    this.metricsService.decWebSocketConnections();

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);

      if (sockets.size === 0) {
        this.userSockets.delete(userId);

        const timer = setTimeout(async () => {
          this.disconnectTimers.delete(userId);

          if (!this.userSockets.has(userId)) {
            await this.usersService.update(userId, {
              isOnline: false,
              lastSeenAt: new Date(),
            });
            await this.broadcastStatus(userId, false);
          }
        }, 30000);

        this.disconnectTimers.set(userId, timer);
      }
    }
  }

  private async broadcastStatus(userId: number, isOnline: boolean) {
    const friendIds = await this.friendsService.getFriendUserIds(userId);

    for (const friendId of friendIds) {
      const friendSockets = this.userSockets.get(friendId);
      if (friendSockets) {
        for (const socketId of friendSockets) {
          this.server.to(socketId).emit('user:status', {
            userId,
            isOnline,
            isPlaying: false,
          });
        }
      }
    }
  }
}
