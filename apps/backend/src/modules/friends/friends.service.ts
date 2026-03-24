import {
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend, FriendStatus } from './entities/friend.entity';
import { UsersService } from '@modules/users/users.service';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friend)
    private readonly friendRepo: Repository<Friend>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async sendRequest(requesterId: number, addresseeId: number) {
    if (requesterId === addresseeId) {
      throw new BadRequestException('자기 자신에게 친구 요청을 보낼 수 없습니다');
    }

    const addressee = await this.usersService.findById(addresseeId);
    if (!addressee) {
      throw new NotFoundException('유저를 찾을 수 없습니다');
    }

    const existing = await this.findRelation(requesterId, addresseeId);
    if (existing) {
      if (existing.status === FriendStatus.BLOCKED) {
        throw new BadRequestException('차단된 유저입니다');
      }
      throw new ConflictException('이미 친구 요청이 존재합니다');
    }

    const friend = this.friendRepo.create({
      requesterId,
      addresseeId,
      status: FriendStatus.PENDING,
    });

    return this.friendRepo.save(friend);
  }

  async accept(friendshipId: number, userId: number) {
    const friendship = await this.friendRepo.findOne({
      where: { friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('친구 요청을 찾을 수 없습니다');
    }

    if (friendship.addresseeId !== userId) {
      throw new ForbiddenException('요청 수신자만 수락할 수 있습니다');
    }

    if (friendship.status !== FriendStatus.PENDING) {
      throw new BadRequestException('대기 중인 요청만 수락할 수 있습니다');
    }

    friendship.status = FriendStatus.ACCEPTED;
    return this.friendRepo.save(friendship);
  }

  async remove(friendshipId: number, userId: number) {
    const friendship = await this.friendRepo.findOne({
      where: { friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('친구 관계를 찾을 수 없습니다');
    }

    if (
      friendship.requesterId !== userId &&
      friendship.addresseeId !== userId
    ) {
      throw new ForbiddenException('권한이 없습니다');
    }

    await this.friendRepo.remove(friendship);
  }

  async list(userId: number, status: string = 'accepted') {
    const friendships = await this.friendRepo.find({
      where: [
        { requesterId: userId, status: status as FriendStatus },
        { addresseeId: userId, status: status as FriendStatus },
      ],
      order: { createdAt: 'DESC' },
    });

    const result = await Promise.all(
      friendships.map(async (f) => {
        const friendUserId =
          f.requesterId === userId ? f.addresseeId : f.requesterId;
        const user = await this.usersService.getPublicProfile(friendUserId);
        return {
          friendshipId: f.friendshipId,
          status: f.status,
          requesterId: f.requesterId,
          user: user
            ? {
                userid: user.userid,
                nickname: user.nickname,
                avatarUrl: user.avatarUrl,
                isOnline: user.isOnline,
                isPlaying: user.isPlaying,
              }
            : null,
          createdAt: f.createdAt,
        };
      }),
    );

    return result;
  }

  async block(requesterId: number, addresseeId: number) {
    if (requesterId === addresseeId) {
      throw new BadRequestException('자기 자신을 차단할 수 없습니다');
    }

    const addressee = await this.usersService.findById(addresseeId);
    if (!addressee) {
      throw new NotFoundException('유저를 찾을 수 없습니다');
    }

    const existing = await this.findRelation(requesterId, addresseeId);
    if (existing) {
      existing.status = FriendStatus.BLOCKED;
      existing.requesterId = requesterId;
      existing.addresseeId = addresseeId;
      return this.friendRepo.save(existing);
    }

    const friend = this.friendRepo.create({
      requesterId,
      addresseeId,
      status: FriendStatus.BLOCKED,
    });

    return this.friendRepo.save(friend);
  }

  async isBlocked(userA: number, userB: number): Promise<boolean> {
    const relation = await this.findRelation(userA, userB);
    return relation?.status === FriendStatus.BLOCKED;
  }

  async getFriendUserIds(userId: number): Promise<number[]> {
    const friendships = await this.friendRepo.find({
      where: [
        { requesterId: userId, status: FriendStatus.ACCEPTED },
        { addresseeId: userId, status: FriendStatus.ACCEPTED },
      ],
    });

    return friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );
  }

  private async findRelation(
    userA: number,
    userB: number,
  ): Promise<Friend | null> {
    return this.friendRepo.findOne({
      where: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    });
  }
}
