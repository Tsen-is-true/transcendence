import { IsOptional, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListRoomsDto {
  @ApiPropertyOptional({ example: 'waiting', enum: ['waiting', 'playing', 'all'] })
  @IsOptional()
  @IsString()
  status?: string = 'waiting';

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isTournament?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
