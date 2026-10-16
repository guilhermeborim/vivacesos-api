import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../common/guards/clinic.guard.js';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface.js';
import { FinanceService } from './finance.service.js';
import {
  type RevenuesQueryDto,
  type SummaryQueryDto,
  revenuesQuerySchema,
  summaryQuerySchema,
} from './schemas/finance.schema.js';

/** Qualquer papel; o PROFISSIONAL só enxerga as próprias receitas. */
@ApiTags('finance')
@Controller('clinic/finance')
@UseGuards(AuthenticationGuard, ClinicGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('revenues')
  @ApiOperation({ summary: 'Receitas (consultas) com totais, filtráveis' })
  revenues(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: revenuesQuerySchema }) query: RevenuesQueryDto,
  ) {
    return this.finance.revenues(
      req.clinicId!,
      { userId: req.user.id, role: req.userRole },
      query,
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo: receitas, despesas e saldo do período' })
  summary(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: summaryQuerySchema }) query: SummaryQueryDto,
  ) {
    return this.finance.summary(
      req.clinicId!,
      { userId: req.user.id, role: req.userRole },
      query,
    );
  }
}
