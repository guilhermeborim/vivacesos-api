import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentClinicId,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../common/guards/clinic.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { PERMISSIONS } from '../../common/permissions/role-permissions.js';
import {
  type PaymentDto,
  paymentSchema,
} from '../../common/schemas/payment.schema.js';
import { ExpensesService } from './expenses.service.js';
import {
  type ListExpensesDto,
  type RegisterExpenseDto,
  type UpdateExpenseDto,
  listExpensesSchema,
  registerExpenseSchema,
  updateExpenseSchema,
} from './schemas/finance.schema.js';

@ApiTags('expenses')
@Controller('clinic/finance/expenses')
@UseGuards(AuthenticationGuard, ClinicGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Cadastra uma despesa na clínica ativa' })
  register(
    @CurrentClinicId() clinicId: string,
    @Body({ schema: registerExpenseSchema }) body: RegisterExpenseDto,
  ) {
    return this.expenses.register(clinicId, body);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.FINANCE_VIEW)
  @ApiOperation({ summary: 'Despesas da clínica ativa, com totais' })
  findByClinic(
    @CurrentClinicId() clinicId: string,
    @Query({ schema: listExpensesSchema }) query: ListExpensesDto,
  ) {
    return this.expenses.findByClinic(clinicId, query);
  }

  @Get(':expenseId')
  @RequirePermissions(PERMISSIONS.FINANCE_VIEW)
  @ApiOperation({ summary: 'Despesa da clínica ativa' })
  findById(
    @CurrentClinicId() clinicId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ) {
    return this.expenses.findById(clinicId, expenseId);
  }

  @Put(':expenseId')
  @RequirePermissions(PERMISSIONS.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Altera uma despesa' })
  async update(
    @CurrentClinicId() clinicId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body({ schema: updateExpenseSchema }) body: UpdateExpenseDto,
  ) {
    await this.expenses.update(clinicId, expenseId, body);
  }

  @Patch(':expenseId/payment')
  @RequirePermissions(PERMISSIONS.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Registra ou desfaz o pagamento da despesa' })
  async updatePayment(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body({ schema: paymentSchema }) body: PaymentDto,
  ) {
    await this.expenses.updatePayment(clinicId, user.id, expenseId, body);
  }

  @Post(':expenseId/stop-recurrence')
  @HttpCode(204)
  @RequirePermissions(PERMISSIONS.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Encerra a recorrência da despesa' })
  async stopRecurrence(
    @CurrentClinicId() clinicId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ) {
    await this.expenses.stopRecurrence(clinicId, expenseId);
  }

  @Delete(':expenseId')
  @RequirePermissions(PERMISSIONS.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Remove uma despesa' })
  async remove(
    @CurrentClinicId() clinicId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ) {
    await this.expenses.remove(clinicId, expenseId);
  }
}
