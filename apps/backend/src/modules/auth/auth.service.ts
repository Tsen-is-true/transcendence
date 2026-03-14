import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '@modules/users/users.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

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

    return {
      userid: user.userid,
      email: user.email,
      nickname: user.nickname,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'OAuth로 가입된 계정입니다. OAuth 로그인을 이용해주세요',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    return user;
  }
}
