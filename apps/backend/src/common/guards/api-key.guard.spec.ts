import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeysService } from '@modules/api-keys/api-keys.service';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let apiKeysService: jest.Mocked<ApiKeysService>;

  const mockApiKeysService = {
    findByKeyHash: jest.fn(),
    updateLastUsed: jest.fn(),
  };

  function createMockExecutionContext(headers: Record<string, string> = {}) {
    const request: any = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      _request: request,
    } as any;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        { provide: ApiKeysService, useValue: mockApiKeysService },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    apiKeysService = module.get(ApiKeysService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException when no API key header is present', async () => {
      const context = createMockExecutionContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('API Key required'),
      );

      expect(apiKeysService.findByKeyHash).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when key is not found', async () => {
      const context = createMockExecutionContext({ 'x-api-key': 'unknown-key' });
      apiKeysService.findByKeyHash.mockResolvedValue(null as any);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid API Key'),
      );

      const expectedHash = createHash('sha256').update('unknown-key').digest('hex');
      expect(apiKeysService.findByKeyHash).toHaveBeenCalledWith(expectedHash);
    });

    it('should throw UnauthorizedException when key is inactive', async () => {
      const context = createMockExecutionContext({ 'x-api-key': 'inactive-key' });
      apiKeysService.findByKeyHash.mockResolvedValue({
        apiKeyId: 1,
        userId: 10,
        isActive: false,
        expiresAt: null,
      } as any);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid API Key'),
      );
    });

    it('should throw UnauthorizedException when key is expired', async () => {
      const context = createMockExecutionContext({ 'x-api-key': 'expired-key' });
      const pastDate = new Date('2020-01-01');
      apiKeysService.findByKeyHash.mockResolvedValue({
        apiKeyId: 2,
        userId: 10,
        isActive: true,
        expiresAt: pastDate,
      } as any);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('API Key expired'),
      );
    });

    it('should return true, set apiKeyUser, and call updateLastUsed for a valid key', async () => {
      const rawKey = 'valid-api-key-123';
      const context = createMockExecutionContext({ 'x-api-key': rawKey });
      const expectedHash = createHash('sha256').update(rawKey).digest('hex');

      apiKeysService.findByKeyHash.mockResolvedValue({
        apiKeyId: 5,
        userId: 42,
        isActive: true,
        expiresAt: null,
      } as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(apiKeysService.findByKeyHash).toHaveBeenCalledWith(expectedHash);
      expect(apiKeysService.updateLastUsed).toHaveBeenCalledWith(5);

      const request = context.switchToHttp().getRequest();
      expect(request.apiKeyUser).toEqual({ userId: 42 });
    });

    it('should return true for a valid key with a future expiration date', async () => {
      const rawKey = 'future-key';
      const context = createMockExecutionContext({ 'x-api-key': rawKey });
      const futureDate = new Date('2099-12-31');

      apiKeysService.findByKeyHash.mockResolvedValue({
        apiKeyId: 7,
        userId: 99,
        isActive: true,
        expiresAt: futureDate,
      } as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(apiKeysService.updateLastUsed).toHaveBeenCalledWith(7);
    });
  });
});
