import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LeaderboardDto {
  @ApiPropertyOptional({ example: 'elo', enum: ['elo', 'wins', 'level'] })
  @IsOptional()
  @IsString()
  type?: string = 'elo';

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
