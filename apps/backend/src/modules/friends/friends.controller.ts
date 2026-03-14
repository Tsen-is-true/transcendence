import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { FriendsService } from './friends.service';

@ApiTags('Friends')
@Controller('friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post(':userId')
  @ApiOperation({ summary: '친구 요청' })
  async sendRequest(
    @CurrentUser('sub') requesterId: number,
    @Param('userId', ParseIntPipe) addresseeId: number,
  ) {
    return this.friendsService.sendRequest(requesterId, addresseeId);
  }

  @Patch(':friendshipId/accept')
  @ApiOperation({ summary: '친구 요청 수락' })
  async accept(
    @CurrentUser('sub') userId: number,
    @Param('friendshipId', ParseIntPipe) friendshipId: number,
  ) {
    return this.friendsService.accept(friendshipId, userId);
  }

  @Delete(':friendshipId')
  @ApiOperation({ summary: '친구 삭제/거절' })
  async remove(
    @CurrentUser('sub') userId: number,
    @Param('friendshipId', ParseIntPipe) friendshipId: number,
  ) {
    await this.friendsService.remove(friendshipId, userId);
    return { message: '친구 관계가 삭제되었습니다' };
  }

  @Get()
  @ApiOperation({ summary: '친구 목록 조회' })
  async list(
    @CurrentUser('sub') userId: number,
    @Query('status') status?: string,
  ) {
    return this.friendsService.list(userId, status || 'accepted');
  }

  @Post(':userId/block')
  @ApiOperation({ summary: '유저 차단' })
  async block(
    @CurrentUser('sub') requesterId: number,
    @Param('userId', ParseIntPipe) addresseeId: number,
  ) {
    return this.friendsService.block(requesterId, addresseeId);
  }
}
