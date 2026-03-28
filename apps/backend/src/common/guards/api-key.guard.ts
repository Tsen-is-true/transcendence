import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { ApiKeysService } from '@modules/api-keys/api-keys.service';
import { MetricsService } from '@modules/monitoring/metrics.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly metricsService: MetricsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawKey = request.headers['x-api-key'] as string;

    if (!rawKey) {
      throw new UnauthorizedException('API Key required');
    }

    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.apiKeysService.findByKeyHash(keyHash);

    if (!apiKey || !apiKey.isActive) {
      throw new UnauthorizedException('Invalid API Key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API Key expired');
    }

    this.apiKeysService.updateLastUsed(apiKey.apiKeyId);
    this.metricsService.incApiKeyRequests();

    request.apiKeyUser = { userId: apiKey.userId };

    return true;
  }
}
