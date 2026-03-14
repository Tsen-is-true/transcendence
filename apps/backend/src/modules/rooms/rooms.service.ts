import {
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { Room, RoomStatus } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';
import { Match, MatchStatus } from '@modules/game/entities/match.entity';
import { Tournament } from '@modules/tournaments/entities/tournament.entity';
import { TournamentParticipant } from '@modules/tournaments/entities/tournament-participant.entity';
import { UsersService } from '@modules/users/users.service';
import { LobbyGateway } from './gateways/lobby.gateway';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomMember)
    private readonly memberRepo: Repository<RoomMember>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(Tournament)
    private readonly tournamentRepo: Repository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private readonly participantRepo: Repository<TournamentParticipant>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => LobbyGateway))
    private readonly lobbyGateway: LobbyGateway,
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

    const result = await this.findOne(savedRoom.roomId);
    this.lobbyGateway.emitRoomCreated(result);
    return result;
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
    this.lobbyGateway.emitRoomDeleted(roomId);
  }

  async join(roomId: number, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const roomRepo = manager.getRepository(Room);
      const memberRepo = manager.getRepository(RoomMember);

      const room = await roomRepo.findOne({
        where: { roomId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!room) {
        throw new NotFoundException('방을 찾을 수 없습니다');
      }
      if (room.status !== RoomStatus.WAITING) {
        throw new BadRequestException('대기 중인 방에만 참가할 수 있습니다');
      }
      if (room.countPlayers >= room.maxPlayers) {
        throw new BadRequestException('방이 가득 찼습니다');
      }

      const existingMember = await memberRepo.findOne({
        where: { roomId, userId },
      });
      if (existingMember) {
        throw new ConflictException('이미 참가 중인 방입니다');
      }

      const inOtherRoom = await memberRepo.findOne({ where: { userId } });
      if (inOtherRoom) {
        throw new BadRequestException('이미 다른 방에 참가 중입니다');
      }

      const member = memberRepo.create({ roomId, userId });
      await memberRepo.save(member);

      room.countPlayers += 1;
      await roomRepo.save(room);

      const user = await this.usersService.getPublicProfile(userId);
      this.lobbyGateway.emitMemberJoined(roomId, user);
      this.lobbyGateway.emitRoomUpdated(room);

      return { roomId, userId, message: '방에 참가했습니다' };
    });
  }

  async leave(roomId: number, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const roomRepo = manager.getRepository(Room);
      const memberRepo = manager.getRepository(RoomMember);

      const room = await roomRepo.findOne({
        where: { roomId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!room) {
        throw new NotFoundException('방을 찾을 수 없습니다');
      }

      const member = await memberRepo.findOne({
        where: { roomId, userId },
      });
      if (!member) {
        throw new BadRequestException('방에 참가하고 있지 않습니다');
      }

      await memberRepo.remove(member);
      room.countPlayers -= 1;

      this.lobbyGateway.emitMemberLeft(roomId, userId);

      if (room.countPlayers <= 0) {
        await roomRepo.remove(room);
        this.lobbyGateway.emitRoomDeleted(roomId);
        return { roomId, userId, roomDeleted: true };
      }

      if (room.hostUserId === userId) {
        const nextHost = await memberRepo.findOne({
          where: { roomId },
          order: { joinedAt: 'ASC' },
        });
        if (nextHost) {
          room.hostUserId = nextHost.userId;
        }
      }

      await roomRepo.save(room);
      this.lobbyGateway.emitRoomUpdated(room);
      return { roomId, userId, roomDeleted: false, newHostUserId: room.hostUserId };
    });
  }

  async toggleReady(roomId: number, userId: number, isReady: boolean) {
    const member = await this.memberRepo.findOne({
      where: { roomId, userId },
    });
    if (!member) {
      throw new BadRequestException('방에 참가하고 있지 않습니다');
    }

    member.isReady = isReady;
    await this.memberRepo.save(member);

    this.lobbyGateway.emitMemberReady(roomId, userId, isReady);

    if (isReady) {
      await this.checkAllReady(roomId);
    }
  }

  async kickMember(roomId: number, hostUserId: number, targetUserId: number) {
    const room = await this.roomRepo.findOne({ where: { roomId } });
    if (!room) {
      throw new NotFoundException('방을 찾을 수 없습니다');
    }
    if (room.hostUserId !== hostUserId) {
      throw new ForbiddenException('방장만 강퇴할 수 있습니다');
    }

    const member = await this.memberRepo.findOne({
      where: { roomId, userId: targetUserId },
    });
    if (!member) {
      throw new BadRequestException('해당 멤버가 방에 없습니다');
    }

    await this.memberRepo.remove(member);
    room.countPlayers -= 1;
    await this.roomRepo.save(room);

    this.lobbyGateway.emitMemberLeft(roomId, targetUserId);
    this.lobbyGateway.emitRoomUpdated(room);
  }

  private async checkAllReady(roomId: number) {
    const room = await this.roomRepo.findOne({ where: { roomId } });
    if (!room || room.status !== RoomStatus.WAITING) return;

    const members = await this.memberRepo.find({ where: { roomId } });
    const expectedPlayers = room.maxPlayers;

    if (members.length < expectedPlayers) return;
    if (!members.every((m) => m.isReady)) return;

    await this.startGame(room, members);
  }

  private async startGame(room: Room, members: RoomMember[]) {
    if (room.isTournament) {
      await this.startTournament(room, members);
    } else {
      await this.start1v1(room, members);
    }
  }

  private async start1v1(room: Room, members: RoomMember[]) {
    const match = this.matchRepo.create({
      roomId: room.roomId,
      player1Id: members[0].userId,
      player2Id: members[1].userId,
      status: MatchStatus.WAITING,
      round: 1,
      matchOrder: 1,
    });
    const savedMatch = await this.matchRepo.save(match);

    room.status = RoomStatus.PLAYING;
    await this.roomRepo.save(room);

    this.lobbyGateway.emitGameStarting(room.roomId, savedMatch.matchId);
    this.lobbyGateway.emitRoomUpdated(room);
  }

  private async startTournament(room: Room, members: RoomMember[]) {
    const tournament = this.tournamentRepo.create({
      roomId: room.roomId,
      currentRound: 1,
    });
    const savedTournament = await this.tournamentRepo.save(tournament);

    for (const member of members) {
      const participant = this.participantRepo.create({
        tournamentId: savedTournament.tournamentId,
        userId: member.userId,
      });
      await this.participantRepo.save(participant);
    }

    const shuffled = [...members].sort(() => Math.random() - 0.5);

    const match1 = this.matchRepo.create({
      tournamentId: savedTournament.tournamentId,
      roomId: room.roomId,
      player1Id: shuffled[0].userId,
      player2Id: shuffled[1].userId,
      status: MatchStatus.WAITING,
      round: 1,
      matchOrder: 1,
    });

    const match2 = this.matchRepo.create({
      tournamentId: savedTournament.tournamentId,
      roomId: room.roomId,
      player1Id: shuffled[2].userId,
      player2Id: shuffled[3].userId,
      status: MatchStatus.WAITING,
      round: 1,
      matchOrder: 2,
    });

    const savedMatch1 = await this.matchRepo.save(match1);
    await this.matchRepo.save(match2);

    room.status = RoomStatus.PLAYING;
    await this.roomRepo.save(room);

    this.lobbyGateway.emitGameStarting(room.roomId, savedMatch1.matchId);
    this.lobbyGateway.emitRoomUpdated(room);
  }
}
