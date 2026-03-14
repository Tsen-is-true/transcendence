import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from './entities/user.entity';
import { Match, MatchStatus } from '@modules/game/entities/match.entity';
import { Score } from '@modules/game/entities/score.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(Score)
    private readonly scoreRepo: Repository<Score>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findByNickname(nickname: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { nickname } });
  }

  async findById(userid: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { userid } });
  }

  async findByOAuthId(
    provider: string,
    oauthId: string,
  ): Promise<User | null> {
    return this.userRepo.findOne({
      where: { oauthProvider: provider, oauthId },
    });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  async update(userid: number, data: Partial<User>): Promise<void> {
    await this.userRepo.update(userid, data);
  }

  async getProfile(userid: number): Promise<Omit<User, 'password' | 'hashedRefreshToken'> | null> {
    const user = await this.userRepo.findOne({ where: { userid } });
    if (!user) return null;
    const { password, hashedRefreshToken, ...profile } = user;
    return profile as any;
  }

  async getPublicProfile(userid: number) {
    const user = await this.userRepo.findOne({
      where: { userid },
      select: [
        'userid',
        'nickname',
        'avatarUrl',
        'wins',
        'loses',
        'elo',
        'level',
        'xp',
        'streak',
        'maxStreak',
        'isOnline',
        'isPlaying',
        'createdAt',
      ],
    });
    return user;
  }

  async getUserStats(userid: number) {
    const user = await this.userRepo.findOne({ where: { userid } });
    if (!user) return null;

    const totalGames = user.wins + user.loses;
    const winRate =
      totalGames > 0
        ? Math.round((user.wins / totalGames) * 1000) / 10
        : 0;
    const xpToNextLevel = user.level * 100 - user.xp;

    return {
      userId: user.userid,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      wins: user.wins,
      loses: user.loses,
      totalGames,
      winRate,
      elo: user.elo,
      level: user.level,
      xp: user.xp,
      xpToNextLevel,
      streak: user.streak,
      maxStreak: user.maxStreak,
    };
  }

  async getMatchHistory(
    userid: number,
    page: number,
    limit: number,
    type: string,
  ) {
    const qb = this.matchRepo
      .createQueryBuilder('m')
      .where('(m.player1Id = :uid OR m.player2Id = :uid)', { uid: userid })
      .andWhere('m.status IN (:...statuses)', {
        statuses: [MatchStatus.FINISHED, MatchStatus.WALKOVER],
      });

    if (type === '1v1') {
      qb.andWhere('m.tournamentId IS NULL');
    } else if (type === 'tournament') {
      qb.andWhere('m.tournamentId IS NOT NULL');
    }

    const total = await qb.getCount();

    const matches = await qb
      .orderBy('m.finishAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const data = await Promise.all(
      matches.map(async (m) => {
        const opponentId =
          m.player1Id === userid ? m.player2Id : m.player1Id;
        const opponent = opponentId
          ? await this.getPublicProfile(opponentId)
          : null;
        const score = await this.scoreRepo.findOne({
          where: { matchId: m.matchId },
        });

        const isPlayer1 = m.player1Id === userid;

        return {
          matchId: m.matchId,
          result: m.winnerId === userid ? 'win' : 'loss',
          type: m.tournamentId ? 'tournament' : '1v1',
          opponent: opponent
            ? {
                userId: opponent.userid,
                nickname: opponent.nickname,
                avatarUrl: opponent.avatarUrl,
              }
            : null,
          score: score
            ? {
                my: isPlayer1 ? score.player1Score : score.player2Score,
                opponent: isPlayer1 ? score.player2Score : score.player1Score,
              }
            : null,
          startAt: m.startAt,
          finishAt: m.finishAt,
        };
      }),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async search(query: string, page: number, limit: number) {
    const [users, total] = await this.userRepo.findAndCount({
      where: query ? { nickname: Like(`%${query}%`) } : {},
      select: ['userid', 'nickname', 'avatarUrl', 'elo', 'level', 'isOnline'],
      skip: (page - 1) * limit,
      take: limit,
      order: { nickname: 'ASC' },
    });

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
