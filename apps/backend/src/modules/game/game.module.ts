import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Score } from './entities/score.entity';
import { PongEngineService } from './services/pong-engine.service';

@Module({
  imports: [TypeOrmModule.forFeature([Match, Score])],
  providers: [PongEngineService],
  exports: [TypeOrmModule, PongEngineService],
})
export class GameModule {}
