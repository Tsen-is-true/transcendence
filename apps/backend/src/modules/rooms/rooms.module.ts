import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';
import { Match } from '@modules/game/entities/match.entity';
import { Tournament } from '@modules/tournaments/entities/tournament.entity';
import { TournamentParticipant } from '@modules/tournaments/entities/tournament-participant.entity';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { LobbyGateway } from './gateways/lobby.gateway';
import { UsersModule } from '@modules/users/users.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, RoomMember, Match, Tournament, TournamentParticipant]),
    UsersModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [RoomsController],
  providers: [RoomsService, LobbyGateway],
  exports: [TypeOrmModule, RoomsService, LobbyGateway],
})
export class RoomsModule {}
