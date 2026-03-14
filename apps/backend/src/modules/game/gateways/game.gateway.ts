import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
import { Match, MatchStatus } from '../entities/match.entity';
import { PongEngineService } from '../services/pong-engine.service';
import { UsersService } from '@modules/users/users.service';
import { GAME_CONFIG } from '../constants/game.constants';

@WebSocketGateway({ namespace: '/game', cors: true })
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);
  private socketUser = new Map<string, number>();
  private userSocket = new Map<number, string>();
  private disconnectTimers = new Map<number, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly pongEngine: PongEngineService,
    private readonly usersService: UsersService,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
  ) {}

  afterInit() {
    this.pongEngine.setCallbacks({
      onScore: (matchId, event) => {
        this.server
          .to(`match:${matchId}`)
          .emit('game:score', {
            player1Score: event.player1Score,
            player2Score: event.player2Score,
            scorerId: event.scorerId,
          });
      },
      onGameEnd: (matchId, winnerId) => {
        const game = this.pongEngine.getGame(matchId);
        this.server
          .to(`match:${matchId}`)
          .emit('game:end', {
            winnerId,
            finalScore: game
              ? {
                  player1Score: game.players.player1.score,
                  player2Score: game.players.player2.score,
                }
              : null,
          });
      },
    });
  }

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
      this.userSocket.set(payload.sub, client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUser.get(client.id);
    this.socketUser.delete(client.id);
    if (!userId) return;

    this.userSocket.delete(userId);

    const game = this.pongEngine.findGameByUserId(userId);
    if (!game || game.status === 'finished') return;

    const playerNum = this.getPlayerNum(game, userId);
    if (!playerNum) return;

    const player =
      playerNum === 1 ? game.players.player1 : game.players.player2;
    player.connected = false;
    player.socketId = null;

    this.pongEngine.pauseGame(game.matchId);

    this.server.to(`match:${game.matchId}`).emit('game:pause', {
      reason: 'opponent_disconnected',
      disconnectedUserId: userId,
      timeout: GAME_CONFIG.RECONNECT_TIMEOUT,
    });

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(game.matchId);
      const winnerId =
        playerNum === 1
          ? game.players.player2.userId
          : game.players.player1.userId;
      this.handleWalkover(game.matchId, winnerId);
    }, GAME_CONFIG.RECONNECT_TIMEOUT);

    this.disconnectTimers.set(game.matchId, timer);
  }

  @SubscribeMessage('game:join')
  async handleGameJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: number },
  ) {
    const userId = this.socketUser.get(client.id);
    if (!userId) return;

    // Check for reconnection to a paused game
    const existingGame = this.pongEngine.findGameByUserId(userId);
    if (existingGame && existingGame.status === 'paused') {
      await this.handleReconnection(client, existingGame, userId);
      return;
    }

    const match = await this.matchRepo.findOne({
      where: { matchId: data.matchId },
    });
    if (!match) return;
    if (
      match.status !== MatchStatus.WAITING &&
      match.status !== MatchStatus.PLAYING
    ) {
      return;
    }
    if (match.player1Id !== userId && match.player2Id !== userId) return;

    const playerNum = match.player1Id === userId ? 1 : 2;
    client.join(`match:${data.matchId}`);

    let game = this.pongEngine.getGame(data.matchId);
    if (!game) {
      game = this.pongEngine.createGame(
        data.matchId,
        match.roomId,
        match.player1Id!,
        match.player2Id!,
      );
    }

    const player =
      playerNum === 1 ? game.players.player1 : game.players.player2;
    player.connected = true;
    player.socketId = client.id;

    if (
      game.players.player1.connected &&
      game.players.player2.connected &&
      game.status === 'countdown'
    ) {
      await this.startCountdown(data.matchId, match);
    }
  }

  @SubscribeMessage('game:paddle')
  handlePaddle(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { direction: 'up' | 'down' | 'stop' },
  ) {
    const userId = this.socketUser.get(client.id);
    if (!userId) return;

    const game = this.pongEngine.findGameByUserId(userId);
    if (!game) return;

    const playerNum = this.getPlayerNum(game, userId);
    if (!playerNum) return;

    this.pongEngine.setPaddleDirection(game.matchId, playerNum, data.direction);
  }

  @SubscribeMessage('game:ping')
  handlePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { timestamp: number },
  ) {
    client.emit('game:pong', {
      timestamp: data.timestamp,
      serverTime: Date.now(),
    });
  }

  private async startCountdown(matchId: number, match: Match) {
    await this.matchRepo.update(matchId, {
      status: MatchStatus.PLAYING,
      startAt: new Date(),
    });

    await this.usersService.update(match.player1Id!, { isPlaying: true });
    await this.usersService.update(match.player2Id!, { isPlaying: true });

    for (let i = GAME_CONFIG.COUNTDOWN_SECONDS; i > 0; i--) {
      this.server
        .to(`match:${matchId}`)
        .emit('game:countdown', { seconds: i });
      await this.delay(1000);
    }

    this.server.to(`match:${matchId}`).emit('game:start', { matchId });

    const game = this.pongEngine.getGame(matchId);
    if (game) {
      game.status = 'playing';
      game.lastUpdateAt = Date.now();

      this.pongEngine.startGameLoop(matchId);
      this.pongEngine.startBroadcastLoop(matchId, (mid, state) => {
        this.server.to(`match:${mid}`).emit('game:state', state);
      });
    }
  }

  private async handleReconnection(
    client: Socket,
    game: any,
    userId: number,
  ) {
    const matchId = game.matchId;

    // Clear disconnect timer
    const timer = this.disconnectTimers.get(matchId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(matchId);
    }

    const playerNum = this.getPlayerNum(game, userId);
    if (!playerNum) return;

    const player =
      playerNum === 1 ? game.players.player1 : game.players.player2;
    player.connected = true;
    player.socketId = client.id;

    client.join(`match:${matchId}`);

    this.server.to(`match:${matchId}`).emit('game:resume', { matchId });

    for (let i = GAME_CONFIG.COUNTDOWN_SECONDS; i > 0; i--) {
      this.server
        .to(`match:${matchId}`)
        .emit('game:countdown', { seconds: i });
      await this.delay(1000);
    }

    this.pongEngine.resumeGame(matchId);
    this.pongEngine.startGameLoop(matchId);
    this.pongEngine.startBroadcastLoop(matchId, (mid, state) => {
      this.server.to(`match:${mid}`).emit('game:state', state);
    });
  }

  private async handleWalkover(matchId: number, winnerId: number) {
    const game = this.pongEngine.getGame(matchId);
    if (!game) return;

    game.status = 'finished';

    this.server.to(`match:${matchId}`).emit('game:end', {
      winnerId,
      reason: 'walkover',
      finalScore: {
        player1Score: game.players.player1.score,
        player2Score: game.players.player2.score,
      },
    });

    this.pongEngine.removeGame(matchId);
  }

  getPlayerNum(game: any, userId: number): 1 | 2 | null {
    if (game.players.player1.userId === userId) return 1;
    if (game.players.player2.userId === userId) return 2;
    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
