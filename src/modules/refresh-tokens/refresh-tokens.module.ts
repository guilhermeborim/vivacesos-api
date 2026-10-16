import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { RefreshTokensRepository } from './refresh-tokens.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken])],
  providers: [RefreshTokensRepository],
  exports: [RefreshTokensRepository],
})
export class RefreshTokensModule {}
