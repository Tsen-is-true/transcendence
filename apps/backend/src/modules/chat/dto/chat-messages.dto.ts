import { IsOptional, IsInt, IsDateString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessagesDto {
  @ApiPropertyOptional({ description: '이 시간 이전의 메시지 조회 (커서)' })
  @IsOptional()
  @IsDateString()
  before?: string;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
