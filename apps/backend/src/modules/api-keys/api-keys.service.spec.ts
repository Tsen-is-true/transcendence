import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from './entities/api-key.entity';

describe('ApiKeysService', () => {
  let service: ApiKeysService;

  const mockApiKeyRepo: Record<string, jest.Mock> = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: mockApiKeyRepo,
        },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
    jest.clearAllMocks();
  });

  // ─── create ───────────────────────────────────────────────────

  describe('create', () => {
    it('should return object with key starting with tk_ and keyPrefix as first 10 chars', async () => {
      const dto = { name: 'Test Key' };
      mockApiKeyRepo.create.mockImplementation((data) => data);
      mockApiKeyRepo.save.mockImplementation((data) =>
        Promise.resolve({
          ...data,
          apiKeyId: 1,
          createdAt: new Date(),
        }),
      );

      const result = await service.create(1, dto);

      expect(result.key).toMatch(/^tk_[a-f0-9]{32}$/);
      expect(result.keyPrefix).toBe(result.key.substring(0, 10));
      expect(result.apiKeyId).toBe(1);
      expect(result.name).toBe('Test Key');
      expect(mockApiKeyRepo.save).toHaveBeenCalled();
    });
  });

  // ─── findAll ──────────────────────────────────────────────────

  describe('findAll', () => {
    it('should call find with userId', async () => {
      const keys = [{ apiKeyId: 1, keyPrefix: 'tk_abc123' }];
      mockApiKeyRepo.find.mockResolvedValue(keys);

      const result = await service.findAll(1);

      expect(mockApiKeyRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1 } }),
      );
      expect(result).toEqual(keys);
    });
  });

  // ─── update ───────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the api key', async () => {
      const existing = {
        apiKeyId: 1,
        userId: 1,
        keyPrefix: 'tk_abc123',
        name: 'Old Name',
        isActive: true,
      };
      mockApiKeyRepo.findOne.mockResolvedValue({ ...existing });
      mockApiKeyRepo.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.update(1, 1, { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(mockApiKeyRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when key does not exist', async () => {
      mockApiKeyRepo.findOne.mockResolvedValue(null);

      await expect(service.update(1, 999, { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when userId does not match', async () => {
      mockApiKeyRepo.findOne.mockResolvedValue({
        apiKeyId: 1,
        userId: 2,
      });

      await expect(service.update(1, 1, { name: 'X' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── remove ───────────────────────────────────────────────────

  describe('remove', () => {
    it('should remove the api key', async () => {
      const existing = { apiKeyId: 1, userId: 1 };
      mockApiKeyRepo.findOne.mockResolvedValue(existing);
      mockApiKeyRepo.remove.mockResolvedValue(existing);

      await service.remove(1, 1);

      expect(mockApiKeyRepo.remove).toHaveBeenCalledWith(existing);
    });

    it('should throw NotFoundException when key does not exist', async () => {
      mockApiKeyRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when userId does not match', async () => {
      mockApiKeyRepo.findOne.mockResolvedValue({
        apiKeyId: 1,
        userId: 2,
      });

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── findByKeyHash ────────────────────────────────────────────

  describe('findByKeyHash', () => {
    it('should delegate to repo findOne', async () => {
      const apiKey = { apiKeyId: 1, keyHash: 'abc123' };
      mockApiKeyRepo.findOne.mockResolvedValue(apiKey);

      const result = await service.findByKeyHash('abc123');

      expect(mockApiKeyRepo.findOne).toHaveBeenCalledWith({
        where: { keyHash: 'abc123' },
      });
      expect(result).toEqual(apiKey);
    });
  });

  // ─── updateLastUsed ───────────────────────────────────────────

  describe('updateLastUsed', () => {
    it('should call repo update with apiKeyId and lastUsedAt', async () => {
      mockApiKeyRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateLastUsed(1);

      expect(mockApiKeyRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ lastUsedAt: expect.any(Date) }),
      );
    });
  });
});
