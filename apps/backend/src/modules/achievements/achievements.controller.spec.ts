import { Test, TestingModule } from '@nestjs/testing';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';

describe('AchievementsController', () => {
  let controller: AchievementsController;

  const mockAchievementsService: Record<string, jest.Mock> = {
    getUserAchievements: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AchievementsController],
      providers: [
        {
          provide: AchievementsService,
          useValue: mockAchievementsService,
        },
      ],
    }).compile();

    controller = module.get<AchievementsController>(AchievementsController);
    jest.clearAllMocks();
  });

  describe('getUserAchievements', () => {
    it('should call service with correct userId', async () => {
      const mockResult = [
        { achievementId: 1, name: 'first_win', unlocked: true },
      ];
      mockAchievementsService.getUserAchievements.mockResolvedValue(mockResult);

      const result = await controller.getUserAchievements(1);

      expect(mockAchievementsService.getUserAchievements).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResult);
    });
  });
});
