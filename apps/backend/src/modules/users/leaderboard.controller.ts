import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { LeaderboardDto } from './dto/leaderboard.dto';

@ApiTags('Leaderboard')
@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeaderboardController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '리더보드 조회' })
  async getLeaderboard(@Query() dto: LeaderboardDto) {
    return this.usersService.getLeaderboard(dto.type!, dto.limit!);
  }
}
