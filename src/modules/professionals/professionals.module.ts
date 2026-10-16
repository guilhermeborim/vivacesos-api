import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { ClinicUsersModule } from '../clinic-users/clinic-users.module.js';
import { UsersModule } from '../users/users.module.js';
import { ProfessionalAvailability } from './entities/professional-availability.entity.js';
import { AvailabilityRepository } from './availability.repository.js';
import { AvailabilityService } from './availability.service.js';
import { Professional } from './entities/professional.entity.js';
import { ProfessionalsController } from './professionals.controller.js';
import { ProfessionalsRepository } from './professionals.repository.js';
import { ProfessionalsService } from './professionals.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Professional, ProfessionalAvailability]),
    SecurityModule,
    UsersModule,
    ClinicUsersModule,
  ],
  controllers: [ProfessionalsController],
  providers: [
    ProfessionalsService,
    ProfessionalsRepository,
    AvailabilityService,
    AvailabilityRepository,
  ],
  exports: [
    ProfessionalsRepository,
    ProfessionalsService,
    AvailabilityRepository,
  ],
})
export class ProfessionalsModule {}
