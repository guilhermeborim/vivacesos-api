import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentClinicId,
  CurrentUser,
  CurrentUserRole,
} from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import type { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../common/guards/clinic.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { PERMISSIONS } from '../../common/permissions/role-permissions.js';
import { DashboardService } from './dashboard.service.js';
import {
  type DashboardQueryDto,
  dashboardQuerySchema,
} from './schemas/dashboard.schema.js';

@ApiTags('dashboard')
@Controller('clinic/dashboard')
@UseGuards(AuthenticationGuard, ClinicGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Números do mês, já filtrados pelo papel do usuário',
  })
  overview(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @CurrentUserRole() role: ClinicUserRole,
    @Query({ schema: dashboardQuerySchema }) query: DashboardQueryDto,
  ) {
    return this.dashboard.overview(clinicId, { userId: user.id, role }, query);
  }

  @Get('analytics')
  @RequirePermissions(PERMISSIONS.DASHBOARD_ANALYTICS)
  @ApiOperation({
    summary: 'Lucro estimado, crescimento e gráficos da clínica (ADMIN)',
  })
  analytics(
    @CurrentClinicId() clinicId: string,
    @Query({ schema: dashboardQuerySchema }) query: DashboardQueryDto,
  ) {
    return this.dashboard.analytics(clinicId, query);
  }
}
