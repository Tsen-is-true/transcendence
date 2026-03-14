import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friend } from './entities/friend.entity';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { UsersModule } from '@modules/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Friend]), UsersModule],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
