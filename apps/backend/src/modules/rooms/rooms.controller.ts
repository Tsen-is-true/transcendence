import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { ListRoomsDto } from './dto/list-rooms.dto';

@ApiTags('Rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '방 생성' })
  async create(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '방 목록 조회' })
  async findAll(@Query() dto: ListRoomsDto) {
    return this.roomsService.findAll(
      dto.status,
      dto.isTournament,
      dto.page,
      dto.limit,
    );
  }

  @Get(':roomId')
  @ApiOperation({ summary: '방 상세 조회' })
  async findOne(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.roomsService.findOne(roomId);
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '방 삭제 (방장만)' })
  async remove(
    @CurrentUser('sub') userId: number,
    @Param('roomId', ParseIntPipe) roomId: number,
  ) {
    await this.roomsService.remove(roomId, userId);
    return { message: '방이 삭제되었습니다' };
  }
}
