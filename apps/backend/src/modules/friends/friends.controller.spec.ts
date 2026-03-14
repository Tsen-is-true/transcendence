import { Test, TestingModule } from '@nestjs/testing';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

describe('FriendsController', () => {
  let controller: FriendsController;

  const mockFriendsService: Record<string, jest.Mock> = {
    sendRequest: jest.fn(),
    accept: jest.fn(),
    remove: jest.fn(),
    list: jest.fn(),
    block: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendsController],
      providers: [
        {
          provide: FriendsService,
          useValue: mockFriendsService,
        },
      ],
    }).compile();

    controller = module.get<FriendsController>(FriendsController);
    jest.clearAllMocks();
  });

  describe('sendRequest', () => {
    it('should call friendsService.sendRequest with correct arguments', async () => {
      const expected = {
        friendshipId: 1,
        requesterId: 1,
        addresseeId: 2,
        status: 'pending',
      };
      mockFriendsService.sendRequest.mockResolvedValue(expected);

      const result = await controller.sendRequest(1, 2);

      expect(mockFriendsService.sendRequest).toHaveBeenCalledWith(1, 2);
      expect(result).toEqual(expected);
    });
  });

  describe('accept', () => {
    it('should call friendsService.accept with friendshipId and userId', async () => {
      const expected = {
        friendshipId: 1,
        requesterId: 1,
        addresseeId: 2,
        status: 'accepted',
      };
      mockFriendsService.accept.mockResolvedValue(expected);

      const result = await controller.accept(2, 1);

      expect(mockFriendsService.accept).toHaveBeenCalledWith(1, 2);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call friendsService.remove and return a deletion message', async () => {
      mockFriendsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1, 5);

      expect(mockFriendsService.remove).toHaveBeenCalledWith(5, 1);
      expect(result).toEqual({ message: '친구 관계가 삭제되었습니다' });
    });
  });

  describe('list', () => {
    it('should call friendsService.list with default accepted status', async () => {
      const expected = [{ friendshipId: 1 }];
      mockFriendsService.list.mockResolvedValue(expected);

      const result = await controller.list(1, undefined);

      expect(mockFriendsService.list).toHaveBeenCalledWith(1, 'accepted');
      expect(result).toEqual(expected);
    });

    it('should pass provided status to friendsService.list', async () => {
      mockFriendsService.list.mockResolvedValue([]);

      await controller.list(1, 'pending');

      expect(mockFriendsService.list).toHaveBeenCalledWith(1, 'pending');
    });
  });

  describe('block', () => {
    it('should call friendsService.block with correct arguments', async () => {
      const expected = {
        friendshipId: 1,
        requesterId: 1,
        addresseeId: 2,
        status: 'blocked',
      };
      mockFriendsService.block.mockResolvedValue(expected);

      const result = await controller.block(1, 2);

      expect(mockFriendsService.block).toHaveBeenCalledWith(1, 2);
      expect(result).toEqual(expected);
    });
  });
});
