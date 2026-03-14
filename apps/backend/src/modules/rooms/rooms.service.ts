import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Room, RoomStatus } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';
import { UsersService } from '@modules/users/users.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomMember)
    private readonly memberRepo: Repository<RoomMember>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateRoomDto, userId: number) {
    const maxPlayers = dto.isTournament ? 4 : 2;

    const room = this.roomRepo.create({
      hostUserId: userId,
      title: dto.title,
      isTournament: dto.isTournament || false,
      maxPlayers,
      countPlayers: 1,
    });
    const savedRoom = await this.roomRepo.save(room);

    const member = this.memberRepo.create({
      roomId: savedRoom.roomId,
      userId,
    });
    await this.memberRepo.save(member);

    return this.findOne(savedRoom.roomId);
  }

  async findAll(
    status: string = 'waiting',
    isTournament?: boolean,
    page: number = 1,
    limit: number = 20,
  ) {
    const where: FindOptionsWhere<Room> = {};

    if (status && status !== 'all') {
      where.status = status as RoomStatus;
    }
    if (isTournament !== undefined) {
      where.isTournament = isTournament;
    }

    const [rooms, total] = await this.roomRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const data = await Promise.all(
      rooms.map(async (room) => {
        const host = await this.usersService.getPublicProfile(room.hostUserId);
        return {
          ...room,
          host: host
            ? { userid: host.userid, nickname: host.nickname, avatarUrl: host.avatarUrl }
            : null,
        };
      }),
    );

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(roomId: number) {
    const room = await this.roomRepo.findOne({ where: { roomId } });
    if (!room) {
      throw new NotFoundException('방을 찾을 수 없습니다');
    }

    const members = await this.memberRepo.find({
      where: { roomId },
      order: { joinedAt: 'ASC' },
    });

    const membersWithUser = await Promise.all(
      members.map(async (m) => {
        const user = await this.usersService.getPublicProfile(m.userId);
        return {
          roomMemberId: m.roomMemberId,
          userId: m.userId,
          isReady: m.isReady,
          joinedAt: m.joinedAt,
          user: user
            ? { userid: user.userid, nickname: user.nickname, avatarUrl: user.avatarUrl, isOnline: user.isOnline }
            : null,
        };
      }),
    );

    const host = await this.usersService.getPublicProfile(room.hostUserId);

    return {
      ...room,
      host: host
        ? { userid: host.userid, nickname: host.nickname, avatarUrl: host.avatarUrl }
        : null,
      members: membersWithUser,
    };
  }

  async remove(roomId: number, userId: number) {
    const room = await this.roomRepo.findOne({ where: { roomId } });
    if (!room) {
      throw new NotFoundException('방을 찾을 수 없습니다');
    }
    if (room.hostUserId !== userId) {
      throw new ForbiddenException('방장만 삭제할 수 있습니다');
    }

    await this.memberRepo.delete({ roomId });
    await this.roomRepo.remove(room);
  }
}
