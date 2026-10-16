import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_LOOKUP } from '../../common/tokens/lookups.js';
import { User } from './entities/user.entity.js';
import { UsersRepository } from './users.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    UsersRepository,
    { provide: USER_LOOKUP, useExisting: UsersRepository },
  ],
  exports: [UsersRepository, USER_LOOKUP],
})
export class UsersModule {}
