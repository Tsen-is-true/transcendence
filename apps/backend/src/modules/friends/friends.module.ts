import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friend } from './entities/friend.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Friend])],
  exports: [TypeOrmModule],
})
export class FriendsModule {}
