import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { ChatMessagesDto } from './dto/chat-messages.dto';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: '대화 목록 조회' })
  async getConversations(@CurrentUser('sub') userId: number) {
    return this.chatService.getConversations(userId);
  }

  @Get('messages/:userId')
  @ApiOperation({ summary: '대화 내역 조회 (커서 페이지네이션)' })
  async getMessages(
    @CurrentUser('sub') userId: number,
    @Param('userId', ParseIntPipe) targetId: number,
    @Query() dto: ChatMessagesDto,
  ) {
    return this.chatService.getMessages(
      userId,
      targetId,
      dto.before,
      dto.limit,
    );
  }

  @Post('messages/:userId/read')
  @ApiOperation({ summary: '메시지 읽음 처리' })
  async markAsRead(
    @CurrentUser('sub') userId: number,
    @Param('userId', ParseIntPipe) senderId: number,
  ) {
    return this.chatService.markAsRead(userId, senderId);
  }
}
