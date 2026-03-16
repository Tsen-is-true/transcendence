import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from './entities/tournament.entity';
import { TournamentParticipant } from './entities/tournament-participant.entity';
import { Match } from '@modules/game/entities/match.entity';
import { Score } from '@modules/game/entities/score.entity';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { UsersModule } from '@modules/users/users.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tournament, TournamentParticipant, Match, Score]),
    UsersModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TypeOrmModule, TournamentsService],
})
export class TournamentsModule {}
