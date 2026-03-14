import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
import { RoomsService } from '../rooms.service';

@WebSocketGateway({ namespace: '/lobby', cors: true })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private socketUser = new Map<string, number>();

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => RoomsService))
    private readonly roomsService: RoomsService,
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
      this.socketUser.set(client.id, payload.sub);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.socketUser.delete(client.id);
  }

  @SubscribeMessage('room:join')
  handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    client.join(`room:${data.roomId}`);
  }

  @SubscribeMessage('room:leave')
  handleRoomLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    client.leave(`room:${data.roomId}`);
  }

  @SubscribeMessage('room:ready')
  async handleReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; isReady: boolean },
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;
    await this.roomsService.toggleReady(data.roomId, userId, data.isReady);
  }

  @SubscribeMessage('room:kick')
  async handleKick(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; userId: number },
  ) {
    const hostUserId = this.getUserIdFromSocket(client);
    if (!hostUserId) return;
    await this.roomsService.kickMember(data.roomId, hostUserId, data.userId);
  }

  emitRoomCreated(room: any) {
    this.server.emit('room:created', room);
  }

  emitRoomUpdated(room: any) {
    this.server.emit('room:updated', room);
  }

  emitRoomDeleted(roomId: number) {
    this.server.emit('room:deleted', { roomId });
  }

  emitMemberJoined(roomId: number, user: any) {
    this.server.to(`room:${roomId}`).emit('room:member:joined', { roomId, user });
  }

  emitMemberLeft(roomId: number, userId: number) {
    this.server.to(`room:${roomId}`).emit('room:member:left', { roomId, userId });
  }

  emitMemberReady(roomId: number, userId: number, isReady: boolean) {
    this.server.to(`room:${roomId}`).emit('room:member:ready', { roomId, userId, isReady });
  }

  emitGameStarting(roomId: number, matchId: number) {
    this.server.to(`room:${roomId}`).emit('room:game:starting', { roomId, matchId });
  }

  emitTournamentUpdate(roomId: number, data: any) {
    this.server.to(`room:${roomId}`).emit('tournament:update', data);
  }

  emitTournamentMatchStart(roomId: number, data: any) {
    this.server.to(`room:${roomId}`).emit('tournament:match:start', data);
  }

  emitTournamentMatchEnd(roomId: number, data: any) {
    this.server.to(`room:${roomId}`).emit('tournament:match:end', data);
  }

  emitTournamentEnd(roomId: number, data: any) {
    this.server.to(`room:${roomId}`).emit('tournament:end', data);
  }

  getUserIdFromSocket(client: Socket): number | undefined {
    return this.socketUser.get(client.id);
  }
}
