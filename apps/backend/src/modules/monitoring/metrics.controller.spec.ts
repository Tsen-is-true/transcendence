import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: Record<string, jest.Mock>;
  let mockResponse: Record<string, jest.Mock>;

  beforeEach(() => {
    metricsService = {
      getMetrics: jest.fn().mockResolvedValue('# HELP game_matches_total\n'),
      getContentType: jest.fn().mockReturnValue('text/plain; version=0.0.4'),
    };

    mockResponse = {
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    controller = new MetricsController(metricsService as unknown as MetricsService);
  });

  describe('getMetrics', () => {
    it('should call service.getMetrics, set Content-Type, and send response', async () => {
      await controller.getMetrics(mockResponse as any);

      expect(metricsService.getMetrics).toHaveBeenCalledTimes(1);
      expect(metricsService.getContentType).toHaveBeenCalledTimes(1);
      expect(mockResponse.set).toHaveBeenCalledWith(
        'Content-Type',
        'text/plain; version=0.0.4',
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        '# HELP game_matches_total\n',
      );
    });
  });
});
