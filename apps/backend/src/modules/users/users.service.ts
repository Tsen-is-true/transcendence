import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}
