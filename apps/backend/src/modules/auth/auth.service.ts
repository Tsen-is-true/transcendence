import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '@modules/users/users.service';
import { User } from '@modules/users/entities/user.entity';
import { MetricsService } from '@modules/monitoring/metrics.service';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {}

  async register(dto: RegisterDto) {
    const existingEmail = await this.usersService.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('이미 사용 중인 이메일입니다');
    }

    const existingNickname = await this.usersService.findByNickname(
      dto.nickname,
    );
    if (existingNickname) {
      throw new ConflictException('이미 사용 중인 닉네임입니다');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      nickname: dto.nickname,
    });

    this.metricsService.incRegistrations();

    return {
      userid: user.userid,
      email: user.email,
      nickname: user.nickname,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.metricsService.incLogins('failure');
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    if (!user.password) {
      this.metricsService.incLogins('failure');
      throw new UnauthorizedException(
        'OAuth로 가입된 계정입니다. OAuth 로그인을 이용해주세요',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.metricsService.incLogins('failure');
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    return user;
  }

  async login(user: User) {
    const payload = {
      sub: user.userid,
      email: user.email,
      nickname: user.nickname,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.refreshExpiration'),
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(user.userid, { hashedRefreshToken });

    this.metricsService.incLogins('success');

    return {
      accessToken,
      refreshToken,
      user: {
        userid: user.userid,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new ConflictException('해당 이메일로 가입된 계정이 없습니다');
    }
    if (user.oauthProvider) {
      throw new ConflictException('OAuth로 가입된 계정은 비밀번호를 변경할 수 없습니다');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.update(user.userid, { password: hashedPassword });
    return { message: '비밀번호가 성공적으로 변경되었습니다' };
  }

  async refreshTokens(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다');
    }

    const isTokenValid = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!isTokenValid) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다');
    }

    const newPayload = {
      sub: user.userid,
      email: user.email,
      nickname: user.nickname,
    };

    const newAccessToken = this.jwtService.sign(newPayload);
    const newRefreshToken = this.jwtService.sign(newPayload, {
      expiresIn: this.configService.get<string>('jwt.refreshExpiration'),
    });

    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.usersService.update(user.userid, { hashedRefreshToken });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: number) {
    await this.usersService.update(userId, { hashedRefreshToken: null });
  }

  async validateOAuthUser(profile: {
    intraId: string;
    email: string;
    nickname: string;
    avatarUrl: string | null;
  }): Promise<User> {
    const existingOAuthUser = await this.usersService.findByOAuthId(
      '42',
      profile.intraId,
    );
    if (existingOAuthUser) {
      return existingOAuthUser;
    }

    const existingEmailUser = await this.usersService.findByEmail(
      profile.email,
    );
    if (existingEmailUser) {
      throw new ConflictException(
        '이미 이메일로 가입된 계정입니다. 이메일/비밀번호로 로그인해주세요',
      );
    }

    let nickname = profile.nickname;
    const existingNickname = await this.usersService.findByNickname(nickname);
    if (existingNickname) {
      nickname = `${nickname}_42`;
    }

    return this.usersService.create({
      email: profile.email,
      nickname,
      intraId: profile.intraId,
      oauthProvider: '42',
      oauthId: profile.intraId,
      avatarUrl: profile.avatarUrl,
    });
  }
}
