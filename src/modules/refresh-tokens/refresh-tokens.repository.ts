import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity.js';

export interface NewRefreshToken {
  tokenHash: string;
  userId: string;
  clinicId: string | null;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokensRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repository: Repository<RefreshToken>,
  ) {}

  create(data: NewRefreshToken) {
    return this.repository.save(this.repository.create(data));
  }

  findActiveByHash(tokenHash: string) {
    return this.repository.findOne({ where: { tokenHash, isRevoked: false } });
  }

  async revokeAllByUser(userId: string) {
    await this.repository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async updateClinicByHash(tokenHash: string, clinicId: string) {
    await this.repository.update({ tokenHash, isRevoked: false }, { clinicId });
  }

  async deleteByHash(tokenHash: string) {
    await this.repository.delete({ tokenHash });
  }

  async deleteExpired() {
    await this.repository.delete({ expiresAt: LessThan(new Date()) });
  }
}
