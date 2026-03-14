import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './entities/tournament.entity';
import { TournamentParticipant } from './entities/tournament-participant.entity';
import { Match } from '@modules/game/entities/match.entity';
import { Score } from '@modules/game/entities/score.entity';
import { UsersService } from '@modules/users/users.service';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepo: Repository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private readonly participantRepo: Repository<TournamentParticipant>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(Score)
    private readonly scoreRepo: Repository<Score>,
    private readonly usersService: UsersService,
  ) {}

  async getTournamentBracket(tournamentId: number) {
    const tournament = await this.tournamentRepo.findOne({
      where: { tournamentId },
    });
    if (!tournament) {
      throw new NotFoundException('토너먼트를 찾을 수 없습니다');
    }

    const participants = await this.participantRepo.find({
      where: { tournamentId },
      order: { joinedAt: 'ASC' },
    });

    const participantsWithUser = await Promise.all(
      participants.map(async (p) => {
        const user = await this.usersService.getPublicProfile(p.userId);
        return {
          userId: p.userId,
          status: p.status,
          nickname: user?.nickname ?? null,
          avatarUrl: user?.avatarUrl ?? null,
        };
      }),
    );

    const matches = await this.matchRepo.find({
      where: { tournamentId },
      order: { round: 'ASC', matchOrder: 'ASC' },
    });

    const matchesWithDetails = await Promise.all(
      matches.map(async (m) => {
        const player1 = m.player1Id
          ? await this.usersService.getPublicProfile(m.player1Id)
          : null;
        const player2 = m.player2Id
          ? await this.usersService.getPublicProfile(m.player2Id)
          : null;
        const winner = m.winnerId
          ? await this.usersService.getPublicProfile(m.winnerId)
          : null;
        const score = await this.scoreRepo.findOne({
          where: { matchId: m.matchId },
        });

        return {
          matchId: m.matchId,
          round: m.round,
          matchOrder: m.matchOrder,
          status: m.status,
          nextMatchId: m.nextMatchId,
          player1: player1
            ? { userId: player1.userid, nickname: player1.nickname }
            : null,
          player2: player2
            ? { userId: player2.userid, nickname: player2.nickname }
            : null,
          winner: winner
            ? { userId: winner.userid, nickname: winner.nickname }
            : null,
          score: score
            ? {
                player1Score: score.player1Score,
                player2Score: score.player2Score,
              }
            : null,
        };
      }),
    );

    const tournamentWinner = tournament.winnerId
      ? await this.usersService.getPublicProfile(tournament.winnerId)
      : null;

    return {
      tournamentId: tournament.tournamentId,
      roomId: tournament.roomId,
      currentRound: tournament.currentRound,
      isFinish: tournament.isFinish,
      winner: tournamentWinner
        ? {
            userId: tournamentWinner.userid,
            nickname: tournamentWinner.nickname,
            avatarUrl: tournamentWinner.avatarUrl,
          }
        : null,
      participants: participantsWithUser,
      matches: matchesWithDetails,
    };
  }
}
