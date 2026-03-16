import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { AchievementsService } from './achievements.service';

@ApiTags('Achievements')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get(':id/achievements')
  @ApiOperation({ summary: '유저 업적 조회' })
  async getUserAchievements(@Param('id', ParseIntPipe) id: number) {
    return this.achievementsService.getUserAchievements(id);
  }
}
