import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Score } from './entities/score.entity';
import { PongEngineService } from './services/pong-engine.service';
import { GameGateway } from './gateways/game.gateway';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, Score]),
    forwardRef(() => AuthModule),
    UsersModule,
  ],
  providers: [PongEngineService, GameGateway],
  exports: [TypeOrmModule, PongEngineService],
})
export class GameModule {}
