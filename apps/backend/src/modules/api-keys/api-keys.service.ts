import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { ApiKey } from './entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
  ) {}

  async create(userId: number, dto: CreateApiKeyDto) {
    const rawKey = `tk_${randomBytes(16).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 10);

    const apiKey = this.apiKeyRepo.create({
      userId,
      keyHash,
      keyPrefix,
      name: dto.name,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    const saved = await this.apiKeyRepo.save(apiKey);

    return {
      apiKeyId: saved.apiKeyId,
      name: saved.name,
      keyPrefix: saved.keyPrefix,
      key: rawKey,
      expiresAt: saved.expiresAt,
      createdAt: saved.createdAt,
    };
  }

  async findAll(userId: number) {
    const keys = await this.apiKeyRepo.find({
      where: { userId },
      select: ['apiKeyId', 'keyPrefix', 'name', 'isActive', 'lastUsedAt', 'expiresAt', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
    return keys;
  }

  async update(userId: number, apiKeyId: number, dto: UpdateApiKeyDto) {
    const apiKey = await this.apiKeyRepo.findOne({ where: { apiKeyId } });
    if (!apiKey) throw new NotFoundException('API Key를 찾을 수 없습니다');
    if (apiKey.userId !== userId) throw new ForbiddenException('본인의 API Key만 수정할 수 있습니다');

    if (dto.name !== undefined) apiKey.name = dto.name;
    if (dto.isActive !== undefined) apiKey.isActive = dto.isActive;

    await this.apiKeyRepo.save(apiKey);
    return {
      apiKeyId: apiKey.apiKeyId,
      keyPrefix: apiKey.keyPrefix,
      name: apiKey.name,
      isActive: apiKey.isActive,
    };
  }

  async remove(userId: number, apiKeyId: number) {
    const apiKey = await this.apiKeyRepo.findOne({ where: { apiKeyId } });
    if (!apiKey) throw new NotFoundException('API Key를 찾을 수 없습니다');
    if (apiKey.userId !== userId) throw new ForbiddenException('본인의 API Key만 삭제할 수 있습니다');

    await this.apiKeyRepo.remove(apiKey);
  }

  async findByKeyHash(hash: string): Promise<ApiKey | null> {
    return this.apiKeyRepo.findOne({ where: { keyHash: hash } });
  }

  async updateLastUsed(apiKeyId: number) {
    await this.apiKeyRepo.update(apiKeyId, { lastUsedAt: new Date() });
  }
}
