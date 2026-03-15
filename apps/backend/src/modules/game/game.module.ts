import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Score } from './entities/score.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Match, Score])],
  exports: [TypeOrmModule],
})
export class GameModule {}
