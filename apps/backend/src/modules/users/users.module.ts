import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Match } from '@modules/game/entities/match.entity';
import { Score } from '@modules/game/entities/score.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { StatusGateway } from './gateways/status.gateway';
import { FriendsModule } from '@modules/friends/friends.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Match, Score]),
    forwardRef(() => FriendsModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, StatusGateway],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
