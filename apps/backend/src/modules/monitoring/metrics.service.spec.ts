import { register } from 'prom-client';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    register.clear();
    service = new MetricsService();
  });

  describe('set/inc/observe methods', () => {
    it('setActiveMatches should not throw', () => {
      expect(() => service.setActiveMatches(5)).not.toThrow();
    });

    it('setActiveTournaments should not throw', () => {
      expect(() => service.setActiveTournaments(3)).not.toThrow();
    });

    it('setWebSocketConnections should not throw', () => {
      expect(() => service.setWebSocketConnections(42)).not.toThrow();
    });

    it('incMatchesTotal should not throw', () => {
      expect(() => service.incMatchesTotal()).not.toThrow();
    });

    it('observeMatchDuration should not throw', () => {
      expect(() => service.observeMatchDuration(120)).not.toThrow();
    });

    it('incRegistrations should not throw', () => {
      expect(() => service.incRegistrations()).not.toThrow();
    });

    it('incApiKeyRequests should not throw', () => {
      expect(() => service.incApiKeyRequests()).not.toThrow();
    });

    it('setActiveRooms should not throw', () => {
      expect(() => service.setActiveRooms(10)).not.toThrow();
    });
  });

  describe('incLogins', () => {
    it('should not throw with success label', () => {
      expect(() => service.incLogins('success')).not.toThrow();
    });

    it('should not throw with failure label', () => {
      expect(() => service.incLogins('failure')).not.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should return a string containing metric names', async () => {
      service.incMatchesTotal();
      service.setActiveMatches(1);

      const metrics = await service.getMetrics();

      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('game_matches_total');
      expect(metrics).toContain('game_active_matches');
    });
  });

  describe('getContentType', () => {
    it('should return a string', () => {
      const contentType = service.getContentType();

      expect(typeof contentType).toBe('string');
      expect(contentType.length).toBeGreaterThan(0);
    });
  });
});
