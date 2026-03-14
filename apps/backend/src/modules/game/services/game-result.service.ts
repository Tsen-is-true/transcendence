import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Match, MatchStatus } from '../entities/match.entity';
import { Score } from '../entities/score.entity';
import { Room, RoomStatus } from '@modules/rooms/entities/room.entity';
import { Tournament } from '@modules/tournaments/entities/tournament.entity';
import {
  TournamentParticipant,
  ParticipantStatus,
} from '@modules/tournaments/entities/tournament-participant.entity';
import { UsersService } from '@modules/users/users.service';
import { GameState } from '../interfaces/game-state.interface';

const ELO_K_FACTOR = 32;
const ELO_MIN = 100;
const XP_WIN = 30;
const XP_LOSS = 10;

@Injectable()
export class GameResultService {
  private onFinalReadyCallback?: (
    roomId: number,
    matchId: number,
  ) => void;

  setOnFinalReadyCallback(
    callback: (roomId: number, matchId: number) => void,
  ) {
    this.onFinalReadyCallback = callback;
  }

  constructor(
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(Score)
    private readonly scoreRepo: Repository<Score>,
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(Tournament)
    private readonly tournamentRepo: Repository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private readonly participantRepo: Repository<TournamentParticipant>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async processGameEnd(
    game: GameState,
    winnerId: number,
    status: MatchStatus = MatchStatus.FINISHED,
  ): Promise<void> {
    const loserId =
      winnerId === game.players.player1.userId
        ? game.players.player2.userId
        : game.players.player1.userId;

    await this.dataSource.transaction(async (manager) => {
      // 1. Update Match
      await manager.getRepository(Match).update(game.matchId, {
        winnerId,
        status,
        finishAt: new Date(),
      });

      // 2. Save Score
      await manager.getRepository(Score).save({
        matchId: game.matchId,
        player1Score: game.players.player1.score,
        player2Score: game.players.player2.score,
      });

      // 3-6. Update player stats
      await this.updatePlayerStats(manager, winnerId, loserId, true);
      await this.updatePlayerStats(manager, loserId, winnerId, false);

      // 7. Set isPlaying = false
      await manager.query(
        'UPDATE users SET isPlaying = false WHERE userid IN (?, ?)',
        [winnerId, loserId],
      );

      // 8. Process room/tournament
      await this.processRoomAfterGame(manager, game);
    });
  }

  private async updatePlayerStats(
    manager: any,
    userId: number,
    opponentId: number,
    isWinner: boolean,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    const opponent = await this.usersService.findById(opponentId);
    if (!user || !opponent) return;

    // ELO calculation
    const expected =
      1 / (1 + Math.pow(10, (opponent.elo - user.elo) / 400));
    const score = isWinner ? 1 : 0;
    const newElo = Math.max(
      ELO_MIN,
      Math.round(user.elo + ELO_K_FACTOR * (score - expected)),
    );

    // XP & Level
    const xpGain = isWinner ? XP_WIN : XP_LOSS;
    const newXp = user.xp + xpGain;
    const newLevel = Math.floor(newXp / 100) + 1;

    // Streak
    const newStreak = isWinner ? user.streak + 1 : 0;
    const newMaxStreak = Math.max(user.maxStreak, newStreak);

    // Wins/Losses
    const wins = isWinner ? user.wins + 1 : user.wins;
    const loses = isWinner ? user.loses : user.loses + 1;

    await manager.query(
      'UPDATE users SET elo = ?, xp = ?, level = ?, streak = ?, maxStreak = ?, wins = ?, loses = ? WHERE userid = ?',
      [newElo, newXp, newLevel, newStreak, newMaxStreak, wins, loses, userId],
    );
  }

  private async processRoomAfterGame(
    manager: any,
    game: GameState,
  ): Promise<void> {
    const match = await manager
      .getRepository(Match)
      .findOne({ where: { matchId: game.matchId } });
    if (!match) return;

    if (!match.tournamentId) {
      // 1v1: Room → FINISHED
      await manager
        .getRepository(Room)
        .update({ roomId: game.roomId }, { status: RoomStatus.FINISHED });
      return;
    }

    // Tournament flow
    const tournamentRepo = manager.getRepository(Tournament);
    const participantRepo = manager.getRepository(TournamentParticipant);
    const matchRepo = manager.getRepository(Match);

    const loserId =
      match.winnerId === game.players.player1.userId
        ? game.players.player2.userId
        : game.players.player1.userId;

    // Eliminate loser
    await participantRepo.update(
      { tournamentId: match.tournamentId, userId: loserId },
      { status: ParticipantStatus.ELIMINATED },
    );

    if (match.round === 1 && match.nextMatchId) {
      // Assign winner to next match (final)
      const nextMatch = await matchRepo.findOne({
        where: { matchId: match.nextMatchId },
      });
      if (nextMatch) {
        if (!nextMatch.player1Id) {
          nextMatch.player1Id = match.winnerId;
        } else {
          nextMatch.player2Id = match.winnerId;
        }
        await matchRepo.save(nextMatch);

        // Both players assigned → schedule final match after 10s
        if (nextMatch.player1Id && nextMatch.player2Id) {
          await tournamentRepo.update(match.tournamentId, {
            currentRound: 2,
          });

          // Store matchId for delayed start via callback
          if (this.onFinalReadyCallback) {
            this.onFinalReadyCallback(
              game.roomId,
              nextMatch.matchId,
            );
          }
        }
      }
    } else if (match.round === 2) {
      // Final match done
      await tournamentRepo.update(match.tournamentId, {
        isFinish: true,
        winnerId: match.winnerId,
      });
      await participantRepo.update(
        { tournamentId: match.tournamentId, userId: match.winnerId! },
        { status: ParticipantStatus.WINNER },
      );
      await manager
        .getRepository(Room)
        .update({ roomId: game.roomId }, { status: RoomStatus.FINISHED });
    }
  }
}
