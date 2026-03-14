import { ApiKeyThrottleGuard } from './api-key-throttle.guard';

describe('ApiKeyThrottleGuard', () => {
  it('should return x-api-key header as tracker when present', async () => {
    const guard = Object.create(ApiKeyThrottleGuard.prototype);
    const req = { headers: { 'x-api-key': 'test-key-123' }, ip: '127.0.0.1' };

    const result = await guard.getTracker(req);

    expect(result).toBe('test-key-123');
  });

  it('should return ip as tracker when x-api-key is not present', async () => {
    const guard = Object.create(ApiKeyThrottleGuard.prototype);
    const req = { headers: {}, ip: '192.168.1.1' };

    const result = await guard.getTracker(req);

    expect(result).toBe('192.168.1.1');
  });
});
