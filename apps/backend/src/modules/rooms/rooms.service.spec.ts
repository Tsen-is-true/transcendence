import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { Room, RoomStatus } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';
import { Match } from '@modules/game/entities/match.entity';
import { Tournament } from '@modules/tournaments/entities/tournament.entity';
import { TournamentParticipant } from '@modules/tournaments/entities/tournament-participant.entity';
import { UsersService } from '@modules/users/users.service';
import { LobbyGateway } from './gateways/lobby.gateway';
import { DataSource } from 'typeorm';

describe('RoomsService', () => {
  let service: RoomsService;

  const _mockRoomRepo: Partial<Record<string, jest.Mock>> = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const mockRoomRepo = _mockRoomRepo as Record<string, jest.Mock>;

  const _mockMemberRepo: Partial<Record<string, jest.Mock>> = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };
  const mockMemberRepo = _mockMemberRepo as Record<string, jest.Mock>;

  const _mockMatchRepo: Partial<Record<string, jest.Mock>> = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockMatchRepo = _mockMatchRepo as Record<string, jest.Mock>;

  const _mockTournamentRepo: Partial<Record<string, jest.Mock>> = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockTournamentRepo = _mockTournamentRepo as Record<string, jest.Mock>;

  const _mockParticipantRepo: Partial<Record<string, jest.Mock>> = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockParticipantRepo = _mockParticipantRepo as Record<string, jest.Mock>;

  const usersService: Record<string, jest.Mock> = {
    getPublicProfile: jest.fn(),
  };

  const dataSource: Record<string, jest.Mock> = {
    transaction: jest.fn(),
  };

  const lobbyGateway: Record<string, jest.Mock> = {
    emitRoomCreated: jest.fn(),
    emitRoomUpdated: jest.fn(),
    emitRoomDeleted: jest.fn(),
    emitMemberJoined: jest.fn(),
    emitMemberLeft: jest.fn(),
    emitMemberReady: jest.fn(),
    emitGameStarting: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: getRepositoryToken(Room), useValue: mockRoomRepo },
        { provide: getRepositoryToken(RoomMember), useValue: mockMemberRepo },
        { provide: getRepositoryToken(Match), useValue: mockMatchRepo },
        { provide: getRepositoryToken(Tournament), useValue: mockTournamentRepo },
        { provide: getRepositoryToken(TournamentParticipant), useValue: mockParticipantRepo },
        { provide: UsersService, useValue: usersService },
        { provide: DataSource, useValue: dataSource },
        { provide: LobbyGateway, useValue: lobbyGateway },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    jest.clearAllMocks();
  });

  // ─── create ───────────────────────────────────────────────────

  describe('create', () => {
    it('should create a room and add host as member, then emit', async () => {
      const dto = { title: 'Test Room', isTournament: false };
      const savedRoom = {
        roomId: 1,
        hostUserId: 10,
        title: 'Test Room',
        isTournament: false,
        maxPlayers: 2,
        countPlayers: 1,
        status: RoomStatus.WAITING,
      };
      const savedMember = { roomMemberId: 1, roomId: 1, userId: 10, isReady: false };
      const host = { userid: 10, nickname: 'Host', avatarUrl: 'url', isOnline: true };

      mockRoomRepo.create.mockReturnValue(savedRoom);
      mockRoomRepo.save.mockResolvedValue(savedRoom);
      mockMemberRepo.create.mockReturnValue(savedMember);
      mockMemberRepo.save.mockResolvedValue(savedMember);
      // findOne is called internally — mock the repo calls it uses
      mockRoomRepo.findOne.mockResolvedValue(savedRoom);
      mockMemberRepo.find.mockResolvedValue([
        { roomMemberId: 1, userId: 10, isReady: false, joinedAt: new Date() },
      ]);
      usersService.getPublicProfile.mockResolvedValue(host);

      const result = await service.create(dto as any, 10);

      expect(mockRoomRepo.create).toHaveBeenCalledWith({
        hostUserId: 10,
        title: 'Test Room',
        isTournament: false,
        maxPlayers: 2,
        countPlayers: 1,
      });
      expect(mockRoomRepo.save).toHaveBeenCalledWith(savedRoom);
      expect(mockMemberRepo.create).toHaveBeenCalledWith({ roomId: 1, userId: 10 });
      expect(mockMemberRepo.save).toHaveBeenCalledWith(savedMember);
      expect(lobbyGateway.emitRoomCreated).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // ─── findOne ──────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return room with members and host info', async () => {
      const room = { roomId: 1, hostUserId: 10, title: 'Room', status: RoomStatus.WAITING };
      const members = [
        { roomMemberId: 1, userId: 10, isReady: false, joinedAt: new Date() },
      ];
      const host = { userid: 10, nickname: 'Host', avatarUrl: 'url', isOnline: true };

      mockRoomRepo.findOne.mockResolvedValue(room);
      mockMemberRepo.find.mockResolvedValue(members);
      usersService.getPublicProfile.mockResolvedValue(host);

      const result = await service.findOne(1);

      expect(mockRoomRepo.findOne).toHaveBeenCalledWith({ where: { roomId: 1 } });
      expect(mockMemberRepo.find).toHaveBeenCalledWith({
        where: { roomId: 1 },
        order: { joinedAt: 'ASC' },
      });
      expect(result.host).toEqual({ userid: 10, nickname: 'Host', avatarUrl: 'url' });
      expect(result.members).toHaveLength(1);
      expect(result.members[0].user).toEqual({
        userid: 10,
        nickname: 'Host',
        avatarUrl: 'url',
        isOnline: true,
      });
    });

    it('should throw NotFoundException when room does not exist', async () => {
      mockRoomRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────

  describe('remove', () => {
    it('should remove all members and delete the room, then emit', async () => {
      const room = { roomId: 1, hostUserId: 10 };

      mockRoomRepo.findOne.mockResolvedValue(room);
      mockMemberRepo.delete.mockResolvedValue(undefined);
      mockRoomRepo.remove.mockResolvedValue(undefined);

      await service.remove(1, 10);

      expect(mockMemberRepo.delete).toHaveBeenCalledWith({ roomId: 1 });
      expect(mockRoomRepo.remove).toHaveBeenCalledWith(room);
      expect(lobbyGateway.emitRoomDeleted).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when room does not exist', async () => {
      mockRoomRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 10)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the host', async () => {
      const room = { roomId: 1, hostUserId: 10 };
      mockRoomRepo.findOne.mockResolvedValue(room);

      await expect(service.remove(1, 99)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── join (transaction) ───────────────────────────────────────

  describe('join', () => {
    it('should join the room via transaction', async () => {
      const room = {
        roomId: 1,
        hostUserId: 10,
        status: RoomStatus.WAITING,
        countPlayers: 1,
        maxPlayers: 2,
      };
      const member = { roomId: 1, userId: 20 };
      const user = { userid: 20, nickname: 'Player', avatarUrl: 'url' };

      const mockTransactionRoomRepo: Partial<Record<string, jest.Mock>> = {
        findOne: jest.fn().mockResolvedValue(room),
        save: jest.fn().mockResolvedValue({ ...room, countPlayers: 2 }),
      };
      const mockTransactionMemberRepo: Partial<Record<string, jest.Mock>> = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue(member),
        save: jest.fn().mockResolvedValue(member),
      };

      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Room) return mockTransactionRoomRepo;
          if (entity === RoomMember) return mockTransactionMemberRepo;
          return {};
        }),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(mockManager));
      usersService.getPublicProfile.mockResolvedValue(user);

      const result = await service.join(1, 20);

      expect(mockManager.getRepository).toHaveBeenCalledWith(Room);
      expect(mockManager.getRepository).toHaveBeenCalledWith(RoomMember);
      expect(lobbyGateway.emitMemberJoined).toHaveBeenCalledWith(1, user);
      expect(lobbyGateway.emitRoomUpdated).toHaveBeenCalled();
      expect(result).toEqual({ roomId: 1, userId: 20, message: '방에 참가했습니다' });
    });
  });

  // ─── leave (transaction) ──────────────────────────────────────

  describe('leave', () => {
    it('should leave the room via transaction', async () => {
      const room = {
        roomId: 1,
        hostUserId: 10,
        status: RoomStatus.WAITING,
        countPlayers: 2,
        maxPlayers: 2,
      };
      const member = { roomMemberId: 1, roomId: 1, userId: 20 };

      const mockTransactionRoomRepo: Partial<Record<string, jest.Mock>> = {
        findOne: jest.fn().mockResolvedValue(room),
        save: jest.fn().mockResolvedValue({ ...room, countPlayers: 1 }),
        remove: jest.fn(),
      };
      const mockTransactionMemberRepo: Partial<Record<string, jest.Mock>> = {
        findOne: jest.fn()
          .mockResolvedValueOnce(member)   // find member to remove
          .mockResolvedValueOnce(null),    // nextHost lookup
        remove: jest.fn().mockResolvedValue(undefined),
      };

      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Room) return mockTransactionRoomRepo;
          if (entity === RoomMember) return mockTransactionMemberRepo;
          return {};
        }),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(mockManager));

      const result = await service.leave(1, 20);

      expect(lobbyGateway.emitMemberLeft).toHaveBeenCalledWith(1, 20);
      expect(lobbyGateway.emitRoomUpdated).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ roomId: 1, userId: 20, roomDeleted: false }),
      );
    });
  });

  // ─── toggleReady ──────────────────────────────────────────────

  describe('toggleReady', () => {
    it('should update member ready state and emit', async () => {
      const member = { roomMemberId: 1, roomId: 1, userId: 10, isReady: false };

      mockMemberRepo.findOne.mockResolvedValue(member);
      mockMemberRepo.save.mockResolvedValue({ ...member, isReady: true });
      // checkAllReady internals
      mockRoomRepo.findOne.mockResolvedValue({
        roomId: 1,
        status: RoomStatus.WAITING,
        maxPlayers: 2,
      });
      mockMemberRepo.find.mockResolvedValue([member]); // not enough players => won't start

      await service.toggleReady(1, 10, true);

      expect(member.isReady).toBe(true);
      expect(mockMemberRepo.save).toHaveBeenCalledWith(member);
      expect(lobbyGateway.emitMemberReady).toHaveBeenCalledWith(1, 10, true);
    });

    it('should throw BadRequestException when member not in room', async () => {
      mockMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.toggleReady(1, 999, true)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── kickMember ───────────────────────────────────────────────

  describe('kickMember', () => {
    it('should kick the target member and emit', async () => {
      const room = { roomId: 1, hostUserId: 10, countPlayers: 2 };
      const member = { roomMemberId: 2, roomId: 1, userId: 20 };

      mockRoomRepo.findOne.mockResolvedValue(room);
      mockMemberRepo.findOne.mockResolvedValue(member);
      mockMemberRepo.remove.mockResolvedValue(undefined);
      mockRoomRepo.save.mockResolvedValue({ ...room, countPlayers: 1 });

      await service.kickMember(1, 10, 20);

      expect(mockMemberRepo.remove).toHaveBeenCalledWith(member);
      expect(mockRoomRepo.save).toHaveBeenCalledWith(room);
      expect(lobbyGateway.emitMemberLeft).toHaveBeenCalledWith(1, 20);
      expect(lobbyGateway.emitRoomUpdated).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not host', async () => {
      const room = { roomId: 1, hostUserId: 10 };
      mockRoomRepo.findOne.mockResolvedValue(room);

      await expect(service.kickMember(1, 99, 20)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when room does not exist', async () => {
      mockRoomRepo.findOne.mockResolvedValue(null);

      await expect(service.kickMember(999, 10, 20)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when target member not in room', async () => {
      const room = { roomId: 1, hostUserId: 10 };
      mockRoomRepo.findOne.mockResolvedValue(room);
      mockMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.kickMember(1, 10, 20)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
