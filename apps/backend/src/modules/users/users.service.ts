import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
