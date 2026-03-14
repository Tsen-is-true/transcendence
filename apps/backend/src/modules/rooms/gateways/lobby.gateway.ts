import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

@WebSocketGateway({ namespace: '/lobby', cors: true })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private socketUser = new Map<string, number>();

  constructor(private readonly jwtService: JwtService) {}

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

  getUserIdFromSocket(client: Socket): number | undefined {
    return this.socketUser.get(client.id);
  }
}
