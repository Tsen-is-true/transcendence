import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { PublicApiController } from './public-api.controller';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKey]),
    forwardRef(() => AuthModule),
    UsersModule,
  ],
  controllers: [ApiKeysController, PublicApiController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
