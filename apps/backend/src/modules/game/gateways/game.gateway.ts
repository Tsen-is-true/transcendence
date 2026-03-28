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
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
import { Match, MatchStatus } from '../entities/match.entity';
import { Score } from '../entities/score.entity';
import { PongEngineService } from '../services/pong-engine.service';
import { GameResultService } from '../services/game-result.service';
import { UsersService } from '@modules/users/users.service';
import { LobbyGateway } from '@modules/rooms/gateways/lobby.gateway';
import { AchievementsService } from '@modules/achievements/achievements.service';
import { MetricsService } from '@modules/monitoring/metrics.service';
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
    private readonly gameResultService: GameResultService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => LobbyGateway))
    private readonly lobbyGateway: LobbyGateway,
    private readonly achievementsService: AchievementsService,
    private readonly metricsService: MetricsService,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
  ) {}

  afterInit() {
    this.gameResultService.setOnFinalReadyCallback(
      (roomId, matchId, player1Id, player2Id) => {
        setTimeout(() => {
          this.lobbyGateway.emitGameStarting(
            roomId,
            matchId,
            player1Id,
            player2Id,
          );
        }, 2000);
      },
    );

    this.gameResultService.setOnTournamentEventCallback(
      (type, roomId, data) => {
        switch (type) {
          case 'match:end':
            this.lobbyGateway.emitTournamentMatchEnd(roomId, data);
            break;
          case 'match:start':
            this.lobbyGateway.emitTournamentMatchStart(roomId, data);
            break;
          case 'update':
            this.lobbyGateway.emitTournamentUpdate(roomId, data);
            break;
          case 'end':
            this.lobbyGateway.emitTournamentEnd(roomId, data);
            break;
          case 'room:deleted':
            this.lobbyGateway.emitRoomDeleted(data.roomId);
            break;
        }
      },
    );

    this.gameResultService.setOnAchievementCheckCallback(
      async (userId) => {
        const newAchievements =
          await this.achievementsService.checkAchievements(userId);
        if (newAchievements.length > 0) {
          const socketId = this.userSocket.get(userId);
          if (socketId) {
            this.server.to(socketId).emit('game:achievement', {
              achievements: newAchievements.map((a) => ({
                name: a.name,
                displayName: a.displayName,
                description: a.description,
              })),
            });
          }
        }
      },
    );

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
      onGameEnd: async (matchId, winnerId) => {
        const game = this.pongEngine.getGame(matchId);
        if (!game) return;

        game.status = 'finished';
        this.pongEngine.clearBroadcastLoop(matchId);

        this.server.to(`match:${matchId}`).emit('game:end', {
          winnerId,
          roomId: game.roomId,
          isTournament: game.isTournament,
          finalScore: {
            player1Score: game.players.player1.score,
            player2Score: game.players.player2.score,
          },
        });

        try {
          const match = await this.gameResultService.getMatch(matchId);
          await this.gameResultService.processGameEnd(game, winnerId);

          this.metricsService.incMatchesTotal();
          if (match?.startAt) {
            const durationSec = (Date.now() - new Date(match.startAt).getTime()) / 1000;
            this.metricsService.observeMatchDuration(durationSec);
          }
          this.metricsService.setActiveMatches(this.pongEngine.getActiveGameCount());

          if (!game.isTournament) {
            this.server.emit('room:deleted', { roomId: game.roomId });
          }
        } catch (err: any) {
          this.logger.error(`Normal Game End process failed: ${err.message}`);
        }
        
        // Postpone removal to cache state against concurrency reloads
        setTimeout(() => this.pongEngine.removeGame(matchId), 10000);
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
      this.metricsService.setWebSocketConnections(this.socketUser.size);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUser.get(client.id);
    this.socketUser.delete(client.id);
    this.metricsService.setWebSocketConnections(this.socketUser.size);
    if (!userId) return;

    this.userSocket.delete(userId);

    const game = this.pongEngine.findGameBySocketId(client.id);
    if (!game || game.status === 'finished') return;

    const playerNum = game.players.player1.socketId === client.id ? 1 : 2;
    if (!playerNum) return;

    const player =
      playerNum === 1 ? game.players.player1 : game.players.player2;
    player.connected = false;
    player.socketId = null;

    const winnerId =
      playerNum === 1
        ? game.players.player2.userId
        : game.players.player1.userId;

    this.handleWalkover(game.matchId, winnerId);
  }

  @SubscribeMessage('game:join')
  async handleGameJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: number },
  ) {
    let userId = this.socketUser.get(client.id);
    if (!userId) {
      const token = client.handshake.auth?.token;
      if (token) {
        try {
          const user = await this.jwtService.verifyAsync(token);
          const verifiedUserId = Number(user.id);
          this.socketUser.set(client.id, verifiedUserId);
          this.userSocket.set(verifiedUserId, client.id);
          userId = verifiedUserId;
        } catch (err) {
          return;
        }
      }
    }
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
      if ([MatchStatus.FINISHED, MatchStatus.WALKOVER, MatchStatus.SURRENDER].includes(match.status)) {
        const score = await this.matchRepo.manager.getRepository(Score).findOne({ where: { matchId: data.matchId } });
        client.emit('game:end', {
          winnerId: match.winnerId,
          roomId: match.roomId,
          reason: match.status === MatchStatus.WALKOVER ? 'walkover' : 'finished',
          isTournament: !!match.tournamentId,
          round: match.round,
          finalScore: {
            player1Score: score?.player1Score || 0,
            player2Score: score?.player2Score || 0,
          }
        });
      }
      return;
    }
    if (match.player1Id !== userId && match.player2Id !== userId) {
      client.emit('game:error', { message: 'Not a match participant' });
      return;
    }

    const playerNum = match.player1Id === userId ? 1 : 2;
    client.join(`match:${data.matchId}`);
    client.emit('game:role', { playerNumber: playerNum });

    let game = this.pongEngine.getGame(data.matchId);
    if (game && game.status === 'finished') {
      client.emit('game:end', {
        winnerId: match.winnerId || 0,
        roomId: game.roomId,
        reason: 'finished',
        isTournament: game.isTournament,
        finalScore: {
          player1Score: game.players.player1.score,
          player2Score: game.players.player2.score,
        },
      });
      return;
    }

    if (!game) {
      game = this.pongEngine.createGame(
        data.matchId,
        match.roomId,
        match.player1Id!,
        match.player2Id!,
        !!match.tournamentId,
      );
      this.metricsService.setActiveMatches(this.pongEngine.getActiveGameCount());
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
      game.status = 'starting';
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

  @SubscribeMessage('game:surrender')
  async handleSurrender(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: number },
  ) {
    const userId = this.socketUser.get(client.id);
    if (!userId) return;

    const game = this.pongEngine.getGame(data.matchId);
    if (!game || game.status === 'finished') return;

    const playerNum = this.getPlayerNum(game, userId);
    if (!playerNum) return;

    const winnerId =
      playerNum === 1
        ? game.players.player2.userId
        : game.players.player1.userId;

    game.status = 'finished';

    const match = await this.gameResultService.getMatch(data.matchId);

    this.server.to(`match:${data.matchId}`).emit('game:end', {
      winnerId,
      roomId: game.roomId,
      reason: 'surrender',
      isTournament: !!match?.tournamentId,
      round: match?.round,
      finalScore: {
        player1Score: game.players.player1.score,
        player2Score: game.players.player2.score,
      },
    });

    try {
      await this.gameResultService.processGameEnd(
        game,
        winnerId,
        MatchStatus.SURRENDER,
      );
    } catch (err: any) {
      this.logger.error(`Surrender processGameEnd failed: ${err.message}`, err.stack);
    }
    this.pongEngine.removeGame(data.matchId);
  }

  private async startCountdown(matchId: number, match: Match) {
    await this.matchRepo.update(matchId, {
      status: MatchStatus.PLAYING,
      startAt: new Date(),
    });

    await this.usersService.update(match.player1Id!, { isPlaying: true });
    await this.usersService.update(match.player2Id!, { isPlaying: true });

    for (let i = GAME_CONFIG.COUNTDOWN_SECONDS; i > 0; i--) {
      const game = this.pongEngine.getGame(matchId);
      if (!game || game.status === 'finished') break;

      this.server
        .to(`match:${matchId}`)
        .emit('game:countdown', { seconds: i });
      await this.delay(1000);
    }

    const game = this.pongEngine.getGame(matchId);
    if (!game || game.status === 'finished') return;

    this.server.to(`match:${matchId}`).emit('game:start', { matchId });

    game.status = 'playing';
    game.lastUpdateAt = Date.now();

    this.pongEngine.startGameLoop(matchId);
    this.pongEngine.startBroadcastLoop(matchId, (mid, state) => {
      this.server.to(`match:${mid}`).emit('game:state', state);
    });
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
    this.pongEngine.clearBroadcastLoop(matchId);

    const payload = {
      winnerId,
      roomId: game.roomId,
      reason: 'walkover',
      isTournament: game.isTournament, 
      finalScore: {
        player1Score: game.players.player1.score,
        player2Score: game.players.player2.score,
      },
    };

    this.server.to(`match:${matchId}`).emit('game:end', payload);

    const opponentSocketId = this.userSocket.get(winnerId);
    if (opponentSocketId) {
      this.server.to(opponentSocketId).emit('game:end', payload);
    }

    try {
      const match = await this.gameResultService.getMatch(matchId);
      await this.gameResultService.processGameEnd(
        game,
        winnerId,
        MatchStatus.WALKOVER,
      );

      if (!game.isTournament) {
        this.server.emit('room:deleted', { roomId: game.roomId });
      }
    } catch (err: any) {
      this.logger.error(`Walkover process failed: ${err.message}`, err.stack);
    }
    
    // Postpone removal to cache state against concurrency reloads
    setTimeout(() => this.pongEngine.removeGame(matchId), 10000);
  }

  getPlayerNum(game: any, userId: number): 1 | 2 | null {
    if (Number(game.players.player1.userId) === Number(userId)) return 1;
    if (Number(game.players.player2.userId) === Number(userId)) return 2;
    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
