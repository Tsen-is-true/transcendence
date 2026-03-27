import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { MatchHistoryDto } from './dto/match-history.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const AVATAR_DIR = path.join(process.cwd(), 'uploads', 'avatars');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  async getMyProfile(@CurrentUser('sub') userId: number) {
    const profile = await this.usersService.getProfile(userId);
    if (!profile) {
      throw new NotFoundException('유저를 찾을 수 없습니다');
    }
    return profile;
  }

  @Patch('me')
  @ApiOperation({ summary: '내 프로필 수정' })
  async updateMyProfile(
    @CurrentUser('sub') userId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    if (dto.nickname) {
      const existing = await this.usersService.findByNickname(dto.nickname);
      if (existing && existing.userid !== userId) {
        throw new ConflictException('이미 사용 중인 닉네임입니다');
      }
    }

    await this.usersService.update(userId, dto);
    return this.usersService.getProfile(userId);
  }

  @Patch('me/password')
  @ApiOperation({ summary: '내 비밀번호 변경' })
  async updateMyPassword(
    @CurrentUser('sub') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(userId, dto.currentPassword, dto.newPassword);
    return { message: '비밀번호가 변경되었습니다' };
  }

  @Post('me/avatar')
  @ApiOperation({ summary: '아바타 업로드' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser('sub') userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('파일이 필요합니다');
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        '지원하지 않는 파일 형식입니다 (jpg, png, gif, webp만 가능)',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('파일 크기는 5MB 이하여야 합니다');
    }

    await fs.mkdir(AVATAR_DIR, { recursive: true });

    const filename = `${userId}.webp`;
    const filepath = path.join(AVATAR_DIR, filename);

    await sharp(file.buffer).resize(200, 200, { fit: 'cover' }).webp().toFile(filepath);

    const avatarUrl = `/uploads/avatars/${filename}`;
    await this.usersService.update(userId, { avatarUrl });

    return { avatarUrl };
  }

  @Get(':id/matches')
  @ApiOperation({ summary: '매치 히스토리 조회' })
  async getMatchHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query() dto: MatchHistoryDto,
  ) {
    return this.usersService.getMatchHistory(
      id,
      dto.page!,
      dto.limit!,
      dto.type!,
    );
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '유저 통계 조회' })
  async getUserStats(@Param('id', ParseIntPipe) id: number) {
    const stats = await this.usersService.getUserStats(id);
    if (!stats) {
      throw new NotFoundException('유저를 찾을 수 없습니다');
    }
    return stats;
  }

  @Get(':id')
  @ApiOperation({ summary: '유저 프로필 조회' })
  async getUserProfile(@Param('id', ParseIntPipe) id: number) {
    const profile = await this.usersService.getPublicProfile(id);
    if (!profile) {
      throw new NotFoundException('유저를 찾을 수 없습니다');
    }
    return profile;
  }

  @Get()
  @ApiOperation({ summary: '유저 검색' })
  async searchUsers(@Query() dto: SearchUsersDto) {
    return this.usersService.search(
      dto.search || '',
      dto.page!,
      dto.limit!,
    );
  }
}
