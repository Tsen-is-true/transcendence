import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Score } from './entities/score.entity';
import { Room } from '@modules/rooms/entities/room.entity';
import { Tournament } from '@modules/tournaments/entities/tournament.entity';
import { TournamentParticipant } from '@modules/tournaments/entities/tournament-participant.entity';
import { PongEngineService } from './services/pong-engine.service';
import { GameGateway } from './gateways/game.gateway';
import { GameResultService } from './services/game-result.service';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { RoomsModule } from '@modules/rooms/rooms.module';
import { AchievementsModule } from '@modules/achievements/achievements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, Score, Room, Tournament, TournamentParticipant]),
    forwardRef(() => AuthModule),
    forwardRef(() => RoomsModule),
    UsersModule,
    AchievementsModule,
  ],
  providers: [PongEngineService, GameGateway, GameResultService],
  exports: [TypeOrmModule, PongEngineService],
})
export class GameModule {}
