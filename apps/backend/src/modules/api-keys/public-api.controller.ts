import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from '@common/guards/api-key.guard';
import { ApiKeyThrottleGuard } from '@common/guards/api-key-throttle.guard';
import { UsersService } from '@modules/users/users.service';
import { PublicMatchesDto } from './dto/public-matches.dto';
import { LeaderboardDto } from '@modules/users/dto/leaderboard.dto';

@ApiTags('Public API')
@Controller('public')
@UseGuards(ApiKeyGuard, ApiKeyThrottleGuard)
@ApiSecurity('api-key')
export class PublicApiController {
  constructor(private readonly usersService: UsersService) {}

  @Get('matches')
  @ApiOperation({ summary: '매치 히스토리 조회 (Public)' })
  async getMatches(@Query() dto: PublicMatchesDto) {
    if (!dto.userId) {
      throw new BadRequestException('userId 파라미터가 필요합니다');
    }
    return this.usersService.getMatchHistory(
      dto.userId,
      dto.page!,
      dto.limit!,
      dto.type!,
    );
  }

  @Get('leaderboard')
  @ApiOperation({ summary: '리더보드 조회 (Public)' })
  async getLeaderboard(@Query() dto: LeaderboardDto) {
    return this.usersService.getLeaderboard(dto.type!, dto.limit!);
  }

  @Get('users/:id/stats')
  @ApiOperation({ summary: '유저 통계 조회 (Public)' })
  async getUserStats(@Param('id', ParseIntPipe) id: number) {
    const stats = await this.usersService.getUserStats(id);
    if (!stats) {
      throw new NotFoundException('유저를 찾을 수 없습니다');
    }
    return stats;
  }
}
