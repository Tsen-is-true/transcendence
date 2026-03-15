import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from './entities/tournament.entity';
import { TournamentParticipant } from './entities/tournament-participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament, TournamentParticipant])],
  exports: [TypeOrmModule],
})
export class TournamentsModule {}
