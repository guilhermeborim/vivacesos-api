import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentClinicId } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../common/guards/clinic.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { PERMISSIONS } from '../../common/permissions/role-permissions.js';
import { IntegrationsService } from './integrations.service.js';

@ApiTags('integrations')
@Controller('clinic/integrations')
@UseGuards(AuthenticationGuard, ClinicGuard, PermissionsGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Estado das integrações da clínica (ADMIN)' })
  status(@CurrentClinicId() clinicId: string) {
    return this.integrations.status(clinicId);
  }
}
