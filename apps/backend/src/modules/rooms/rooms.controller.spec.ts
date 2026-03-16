import { Test, TestingModule } from '@nestjs/testing';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

describe('RoomsController', () => {
  let controller: RoomsController;

  const roomsService: Record<string, jest.Mock> = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        { provide: RoomsService, useValue: roomsService },
      ],
    }).compile();

    controller = module.get<RoomsController>(RoomsController);
    jest.clearAllMocks();
  });

  // ─── create ───────────────────────────────────────────────────

  describe('create', () => {
    it('should call roomsService.create and return the result', async () => {
      const dto = { title: 'Test Room', isTournament: false };
      const expected = { roomId: 1, title: 'Test Room' };
      roomsService.create.mockResolvedValue(expected);

      const result = await controller.create(10, dto as any);

      expect(roomsService.create).toHaveBeenCalledWith(dto, 10);
      expect(result).toEqual(expected);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────

  describe('findAll', () => {
    it('should call roomsService.findAll with query params', async () => {
      const dto = { status: 'waiting', isTournament: false, page: 1, limit: 20 };
      const expected = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      roomsService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(dto as any);

      expect(roomsService.findAll).toHaveBeenCalledWith('waiting', false, 1, 20);
      expect(result).toEqual(expected);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────

  describe('findOne', () => {
    it('should call roomsService.findOne with roomId', async () => {
      const expected = { roomId: 1, title: 'Room', members: [] };
      roomsService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(1);

      expect(roomsService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });
  });

  // ─── join ─────────────────────────────────────────────────────

  describe('join', () => {
    it('should call roomsService.join with roomId and userId', async () => {
      const expected = { roomId: 1, userId: 10, message: '방에 참가했습니다' };
      roomsService.join.mockResolvedValue(expected);

      const result = await controller.join(10, 1);

      expect(roomsService.join).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(expected);
    });
  });

  // ─── leave ────────────────────────────────────────────────────

  describe('leave', () => {
    it('should call roomsService.leave with roomId and userId', async () => {
      const expected = { roomId: 1, userId: 10, roomDeleted: false };
      roomsService.leave.mockResolvedValue(expected);

      const result = await controller.leave(10, 1);

      expect(roomsService.leave).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(expected);
    });
  });

  // ─── remove ───────────────────────────────────────────────────

  describe('remove', () => {
    it('should call roomsService.remove and return success message', async () => {
      roomsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(10, 1);

      expect(roomsService.remove).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual({ message: '방이 삭제되었습니다' });
    });
  });
});
