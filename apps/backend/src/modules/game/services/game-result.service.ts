import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Match, MatchStatus } from '../entities/match.entity';
import { Score } from '../entities/score.entity';
import { Room, RoomStatus } from '@modules/rooms/entities/room.entity';
import { RoomMember } from '@modules/rooms/entities/room-member.entity';
import { Tournament } from '@modules/tournaments/entities/tournament.entity';
import {
  TournamentParticipant,
  ParticipantStatus,
} from '@modules/tournaments/entities/tournament-participant.entity';
import { UsersService } from '@modules/users/users.service';
import { MetricsService } from '@modules/monitoring/metrics.service';
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
    player1Id?: number,
    player2Id?: number,
  ) => void;

  private onTournamentEventCallback?: (
    type: 'match:end' | 'match:start' | 'update' | 'end' | 'room:deleted',
    roomId: number,
    data: any,
  ) => void;

  private onAchievementCheckCallback?: (userId: number) => void;

  setOnFinalReadyCallback(
    callback: (roomId: number, matchId: number, player1Id?: number, player2Id?: number) => void,
  ) {
    this.onFinalReadyCallback = callback;
  }

  setOnAchievementCheckCallback(callback: (userId: number) => void) {
    this.onAchievementCheckCallback = callback;
  }

  setOnTournamentEventCallback(
    callback: (
      type: 'match:end' | 'match:start' | 'update' | 'end' | 'room:deleted',
      roomId: number,
      data: any,
    ) => void,
  ) {
    this.onTournamentEventCallback = callback;
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
    private readonly metricsService: MetricsService,
    private readonly dataSource: DataSource,
  ) {}

  async processGameEnd(
    game: GameState,
    winnerId: number,
    status: MatchStatus = MatchStatus.FINISHED,
  ): Promise<void> {
    const loserId =
      Number(winnerId) === Number(game.players.player1.userId)
        ? Number(game.players.player2.userId)
        : Number(game.players.player1.userId);

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
      await this.processRoomAfterGame(manager, game, winnerId, loserId);
    });

    // 9. Check achievements for both players (after transaction)
    if (this.onAchievementCheckCallback) {
      this.onAchievementCheckCallback(winnerId);
      this.onAchievementCheckCallback(loserId);
    }
  }

  private emitTournamentEvent(
    type: 'match:end' | 'match:start' | 'update' | 'end' | 'room:deleted',
    roomId: number,
    data: any,
  ) {
    if (this.onTournamentEventCallback) {
      this.onTournamentEventCallback(type, roomId, data);
    }
  }

  private async updatePlayerStats(
    manager: any,
    userId: number,
    opponentId: number,
    isWinner: boolean,
  ): Promise<void> {
    const user = await manager.query('SELECT * FROM users WHERE userid = ?', [userId]).then((r: any) => r[0]);
    const opponent = await manager.query('SELECT * FROM users WHERE userid = ?', [opponentId]).then((r: any) => r[0]);
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
    winnerId: number,
    loserId: number,
  ): Promise<void> {
    const match = await manager
      .getRepository(Match)
      .findOne({ where: { matchId: game.matchId } });
    if (!match) return;

    if (!match.tournamentId) {
      // 1v1: Room → FINISHED so back button navigators can read its status before removal!
      await manager
        .getRepository(Room)
        .update({ roomId: game.roomId }, { status: RoomStatus.FINISHED });
      return;
    }

    // Tournament flow
    const tournamentRepo = manager.getRepository(Tournament);
    const participantRepo = manager.getRepository(TournamentParticipant);
    const matchRepo = manager.getRepository(Match);



    // Eliminate loser
    await participantRepo.update(
      { tournamentId: match.tournamentId, userId: loserId },
      { status: ParticipantStatus.ELIMINATED },
    );

    // Emit tournament:match:end
    this.emitTournamentEvent('match:end', game.roomId, {
      matchId: match.matchId,
      winnerId: match.winnerId,
      round: match.round,
      matchOrder: match.matchOrder,
    });

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

        // 3rd Place Match Logic
        const thirdPlaceMatch = await matchRepo.findOne({
          where: { tournamentId: match.tournamentId, round: 2, matchOrder: 2 },
        });

        if (thirdPlaceMatch) {
          if (match.status !== MatchStatus.WALKOVER) {
            if (!thirdPlaceMatch.player1Id) {
              thirdPlaceMatch.player1Id = loserId;
            } else {
              thirdPlaceMatch.player2Id = loserId;
            }
            await matchRepo.save(thirdPlaceMatch);
          }

          const round1Matches = await matchRepo.find({
            where: { tournamentId: match.tournamentId, round: 1 },
          });
          
          const allRound1Finished = round1Matches.every((m: Match) => 
            [MatchStatus.FINISHED, MatchStatus.WALKOVER, MatchStatus.SURRENDER].includes(m.status)
          );

          if (allRound1Finished && thirdPlaceMatch.status === MatchStatus.WAITING) {
            const hasWalkover = round1Matches.some((m: Match) => m.status === MatchStatus.WALKOVER);
            if (!hasWalkover && thirdPlaceMatch.player1Id && thirdPlaceMatch.player2Id) {
              this.emitTournamentEvent('match:start', game.roomId, {
                matchId: thirdPlaceMatch.matchId,
                player1Id: thirdPlaceMatch.player1Id,
                player2Id: thirdPlaceMatch.player2Id,
                round: 2,
              });

              if (this.onFinalReadyCallback) {
                this.onFinalReadyCallback(
                  game.roomId, 
                  thirdPlaceMatch.matchId, 
                  thirdPlaceMatch.player1Id!, 
                  thirdPlaceMatch.player2Id!
                );
              }
            }
          }
        }

        // Emit tournament:update after winner assignment
        this.emitTournamentEvent('update', game.roomId, {
          tournamentId: match.tournamentId,
        });

        // Both players assigned → schedule final match after 10s
        if (nextMatch.player1Id && nextMatch.player2Id) {
          await tournamentRepo.update(match.tournamentId, {
            currentRound: 2,
          });

          // Emit tournament:match:start for final
          this.emitTournamentEvent('match:start', game.roomId, {
            matchId: nextMatch.matchId,
            player1Id: nextMatch.player1Id,
            player2Id: nextMatch.player2Id,
            round: 2,
          });

          // Schedule final match start via callback
          if (this.onFinalReadyCallback) {
            this.onFinalReadyCallback(
              game.roomId,
              nextMatch.matchId,
              nextMatch.player1Id!,
              nextMatch.player2Id!
            );
          }
        }
      }
    } else if (match.round === 2) {
      const matchRepo = manager.getRepository(Match);
      const matches = await matchRepo.find({
        where: { tournamentId: match.tournamentId, round: 2 },
      });
      const finalMatch = matches.find((m: Match) => m.matchOrder === 1);
      const thirdPlaceMatch = matches.find((m: Match) => m.matchOrder === 2);

      const isFinalDone =
        finalMatch &&
        [MatchStatus.FINISHED, MatchStatus.WALKOVER, MatchStatus.SURRENDER].includes(finalMatch.status);
      const isThirdDone =
        thirdPlaceMatch &&
        [MatchStatus.FINISHED, MatchStatus.WALKOVER, MatchStatus.SURRENDER].includes(thirdPlaceMatch.status);

      const round1Matches = await matchRepo.find({
        where: { tournamentId: match.tournamentId, round: 1 },
      });
      const hasWalkover = round1Matches.some((m: Match) => m.status === MatchStatus.WALKOVER);

      // If walkover happened in semi-finals, we don't need 3rd place match to end tournament
      const shouldCheckThirdPlace = !hasWalkover;

      if (isFinalDone && (!shouldCheckThirdPlace || isThirdDone)) {
        const firstId = finalMatch.winnerId;
        const secondId =
          finalMatch.player1Id === firstId ? finalMatch.player2Id : finalMatch.player1Id;

        let thirdId = null;
        let fourthId = null;

        if (hasWalkover) {
          const walkoverMatch = round1Matches.find((m: Match) => m.status === MatchStatus.WALKOVER);
          const normalMatch = round1Matches.find((m: Match) => m.status === MatchStatus.FINISHED || m.status === MatchStatus.SURRENDER);
          
          if (walkoverMatch) {
            fourthId = walkoverMatch.player1Id === walkoverMatch.winnerId ? walkoverMatch.player2Id : walkoverMatch.player1Id;
          }
          if (normalMatch) {
            thirdId = normalMatch.player1Id === normalMatch.winnerId ? normalMatch.player2Id : normalMatch.player1Id;
          }
        } else {
          thirdId = thirdPlaceMatch ? thirdPlaceMatch.winnerId : null;
          fourthId = thirdPlaceMatch
            ? thirdPlaceMatch.player1Id === thirdId
              ? thirdPlaceMatch.player2Id
              : thirdPlaceMatch.player1Id
            : null;
        }

        const ranks = {
          first: firstId ? await this.usersService.getPublicProfile(firstId) : null,
          second: secondId ? await this.usersService.getPublicProfile(secondId) : null,
          third: thirdId ? await this.usersService.getPublicProfile(thirdId) : null,
          fourth: fourthId ? await this.usersService.getPublicProfile(fourthId) : null,
        };

        const rankings = {
          first: ranks.first
            ? { id: ranks.first.userid, username: ranks.first.nickname, avatar: ranks.first.avatarUrl }
            : null,
          second: ranks.second
            ? { id: ranks.second.userid, username: ranks.second.nickname, avatar: ranks.second.avatarUrl }
            : null,
          third: ranks.third
            ? { id: ranks.third.userid, username: ranks.third.nickname, avatar: ranks.third.avatarUrl }
            : null,
          fourth: ranks.fourth
            ? { id: ranks.fourth.userid, username: ranks.fourth.nickname, avatar: ranks.fourth.avatarUrl }
            : null,
        };

        if (finalMatch.tournamentId) {
          await tournamentRepo.update(finalMatch.tournamentId, {
            isFinish: true,
            winnerId: firstId,
          });
          const activeCount = await this.tournamentRepo.count({ where: { isFinish: false } });
          this.metricsService.setActiveTournaments(activeCount);

          if (firstId) {
            await participantRepo.update(
              { tournamentId: finalMatch.tournamentId, userId: firstId },
              { status: ParticipantStatus.WINNER },
            );
          }
        }

        await manager.getRepository(RoomMember).delete({ roomId: game.roomId });
        await manager.getRepository(Room).delete({ roomId: game.roomId });
        this.emitTournamentEvent('room:deleted', game.roomId, { roomId: game.roomId });

        this.emitTournamentEvent('end', game.roomId, {
          tournamentId: match.tournamentId,
          rankings,
        });
      } else {
        // Just emit update for client to know one is done
        this.emitTournamentEvent('update', game.roomId, {
          tournamentId: match.tournamentId,
        });
      }
    }
  }

  async getMatch(matchId: number) {
    return this.matchRepo.findOne({ where: { matchId } });
  }
}
