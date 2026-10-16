import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { Appointment } from '../appointments/entities/appointment.entity.js';
import { ClinicUsersModule } from '../clinic-users/clinic-users.module.js';
import { ProfessionalsModule } from '../professionals/professionals.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { UsersModule } from '../users/users.module.js';
import { Expense } from './entities/expense.entity.js';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesRepository } from './expenses.repository.js';
import { ExpensesService } from './expenses.service.js';
import { Payout } from './entities/payout.entity.js';
import { RecurringExpensesService } from './recurring-expenses.service.js';
import { PayoutsController } from './payouts.controller.js';
import { PayoutsRepository } from './payouts.repository.js';
import { PayoutsService } from './payouts.service.js';
import { FinanceController } from './finance.controller.js';
import { FinanceRepository } from './finance.repository.js';
import { FinanceService } from './finance.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Expense, Payout]),
    SecurityModule,
    UsersModule,
    ClinicUsersModule,
    ProfessionalsModule,
    SettingsModule,
  ],
  controllers: [FinanceController, ExpensesController, PayoutsController],
  providers: [
    FinanceService,
    FinanceRepository,
    ExpensesService,
    ExpensesRepository,
    PayoutsService,
    PayoutsRepository,
    RecurringExpensesService,
  ],
})
export class FinanceModule {}
