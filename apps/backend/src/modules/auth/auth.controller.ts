import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { FtOAuthService } from './strategies/ft-oauth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly ftOAuthService: FtOAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '이메일/비밀번호 회원가입' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: '로그인' })
  async login(@Body() _dto: LoginDto, @Request() req: any) {
    return this.authService.login(req.user);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 분실 초기화' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access Token 갱신' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃 (Refresh Token 무효화)' })
  async logout(@CurrentUser('sub') userId: number) {
    await this.authService.logout(userId);
    return { message: '로그아웃되었습니다' };
  }

  @Get('42')
  @ApiOperation({ summary: '42 OAuth 로그인 리다이렉트' })
  async ft42Auth(@Res() res: Response) {
    const url = this.ftOAuthService.getAuthorizationUrl();
    return res.redirect(url);
  }

  @Get('42/callback')
  @ApiOperation({ summary: '42 OAuth 콜백' })
  async ft42Callback(@Query('code') code: string, @Res() res: Response) {
    const ftAccessToken = await this.ftOAuthService.exchangeCodeForToken(code);
    const profile = await this.ftOAuthService.getUserInfo(ftAccessToken);
    const user = await this.authService.validateOAuthUser(profile);
    const tokens = await this.authService.login(user);

    const frontendUrl = this.configService.get<string>('cors.origin');
    return res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }
}
