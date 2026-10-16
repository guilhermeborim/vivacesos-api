import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentClinicId } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../common/guards/clinic.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface.js';
import { PERMISSIONS } from '../../common/permissions/role-permissions.js';
import { PayoutsService } from './payouts.service.js';
import {
  type CreatePayoutDto,
  type ListPayoutsDto,
  type PayoutPreviewDto,
  createPayoutSchema,
  listPayoutsSchema,
  payoutPreviewSchema,
} from './schemas/finance.schema.js';

@ApiTags('payouts')
@Controller('clinic/finance/payouts')
@UseGuards(AuthenticationGuard, ClinicGuard, PermissionsGuard)
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get('preview')
  @RequirePermissions(PERMISSIONS.FINANCE_VIEW)
  @ApiOperation({ summary: 'Quanto seria repassado agora a um profissional' })
  preview(
    @CurrentClinicId() clinicId: string,
    @Query({ schema: payoutPreviewSchema }) query: PayoutPreviewDto,
  ) {
    return this.payouts.preview(clinicId, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.FINANCE_MANAGE)
  @ApiOperation({
    summary: 'Lança o repasse: cria a despesa e marca as consultas incluídas',
  })
  create(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: createPayoutSchema }) body: CreatePayoutDto,
  ) {
    return this.payouts.create(
      req.clinicId!,
      { userId: req.user.id, role: req.userRole },
      body,
    );
  }

  /** Qualquer papel; o PROFISSIONAL só enxerga os próprios repasses. */
  @Get()
  @ApiOperation({ summary: 'Repasses lançados, com o estado do pagamento' })
  list(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: listPayoutsSchema }) query: ListPayoutsDto,
  ) {
    return this.payouts.list(
      req.clinicId!,
      { userId: req.user.id, role: req.userRole },
      query,
    );
  }

  @Delete(':payoutId')
  @HttpCode(204)
  @RequirePermissions(PERMISSIONS.FINANCE_MANAGE)
  @ApiOperation({
    summary: 'Desfaz o repasse enquanto a despesa não foi paga',
  })
  async undo(
    @CurrentClinicId() clinicId: string,
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
  ) {
    await this.payouts.undo(clinicId, payoutId);
  }
}
