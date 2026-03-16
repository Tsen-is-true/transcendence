import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

describe('TournamentsController', () => {
  let controller: TournamentsController;

  const mockTournamentsService: Record<string, jest.Mock> = {
    getTournamentBracket: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TournamentsController],
      providers: [
        {
          provide: TournamentsService,
          useValue: mockTournamentsService,
        },
      ],
    }).compile();

    controller = module.get<TournamentsController>(TournamentsController);
    jest.clearAllMocks();
  });

  describe('getTournamentBracket', () => {
    it('should call service with correct tournamentId', async () => {
      const mockResult = { tournamentId: 1, matches: [] };
      mockTournamentsService.getTournamentBracket.mockResolvedValue(mockResult);

      const result = await controller.getTournamentBracket(1);

      expect(mockTournamentsService.getTournamentBracket).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResult);
    });
  });
});
