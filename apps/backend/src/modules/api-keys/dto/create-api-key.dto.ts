import { IsString, IsOptional, IsDateString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'My API Key', description: 'API Key 이름' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00Z', description: '만료일 (미지정 시 무기한)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
