import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UserLookup } from '../../common/tokens/lookups.js';
import { User } from './entities/user.entity.js';
import { UserOnboardingStep } from './enums/user-onboarding-step.enum.js';

export interface NewUser {
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class UsersRepository implements UserLookup {
  constructor(
    @InjectRepository(User) private readonly repository: Repository<User>,
  ) {}

  create(
    user: NewUser,
    onboardingStep: UserOnboardingStep = UserOnboardingStep.CREATE_CLINIC,
  ) {
    return this.repository.save({ ...user, onboardingStep });
  }

  findByEmail(email: string) {
    return this.repository.findOne({ where: { email } });
  }

  findById(id: string) {
    return this.repository.findOne({ where: { id } });
  }

  async update(id: string, data: { name?: string; active?: boolean }) {
    await this.repository.update(id, data);
  }

  async updateOnboardingStep(id: string, step: UserOnboardingStep) {
    await this.repository.update(id, { onboardingStep: step });
  }
}
