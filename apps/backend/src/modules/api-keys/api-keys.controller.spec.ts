import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';

describe('ApiKeysController', () => {
  let controller: ApiKeysController;

  const mockApiKeysService: Record<string, jest.Mock> = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeysController],
      providers: [
        {
          provide: ApiKeysService,
          useValue: mockApiKeysService,
        },
      ],
    }).compile();

    controller = module.get<ApiKeysController>(ApiKeysController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create with userId and dto', async () => {
      const dto = { name: 'My Key' };
      const mockResult = { apiKeyId: 1, key: 'tk_abc', name: 'My Key' };
      mockApiKeysService.create.mockResolvedValue(mockResult);

      const result = await controller.create(1, dto as any);

      expect(mockApiKeysService.create).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with userId', async () => {
      const mockResult = [{ apiKeyId: 1 }];
      mockApiKeysService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(1);

      expect(mockApiKeysService.findAll).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResult);
    });
  });

  describe('update', () => {
    it('should call service.update with userId, id, and dto', async () => {
      const dto = { name: 'Updated' };
      const mockResult = { apiKeyId: 1, name: 'Updated' };
      mockApiKeysService.update.mockResolvedValue(mockResult);

      const result = await controller.update(1, 1, dto as any);

      expect(mockApiKeysService.update).toHaveBeenCalledWith(1, 1, dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('remove', () => {
    it('should call service.remove and return success message', async () => {
      mockApiKeysService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1, 1);

      expect(mockApiKeysService.remove).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual({ message: 'API Key가 삭제되었습니다' });
    });
  });
});
