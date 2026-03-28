import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: '가입된 이메일' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'new_password123', description: '새 비밀번호 (6자 이상)' })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
