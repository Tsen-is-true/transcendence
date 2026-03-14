import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { TournamentsService } from './tournaments.service';

@ApiTags('Tournaments')
@Controller('tournaments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get(':tournamentId')
  @ApiOperation({ summary: '토너먼트 대진표 조회' })
  async getTournamentBracket(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
  ) {
    return this.tournamentsService.getTournamentBracket(tournamentId);
  }
}
