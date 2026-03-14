import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'API Key 생성' })
  async create(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeysService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '내 API Key 목록 조회' })
  async findAll(@CurrentUser('sub') userId: number) {
    return this.apiKeysService.findAll(userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'API Key 수정' })
  async update(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApiKeyDto,
  ) {
    return this.apiKeysService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'API Key 삭제' })
  async remove(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.apiKeysService.remove(userId, id);
    return { message: 'API Key가 삭제되었습니다' };
  }
}
