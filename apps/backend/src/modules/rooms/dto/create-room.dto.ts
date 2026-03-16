import { IsString, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ example: '초보 환영 1:1' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isTournament?: boolean = false;
}
