import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentClinicId } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../common/guards/clinic.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { PERMISSIONS } from '../../common/permissions/role-permissions.js';
import {
  type UpdateSettingsDto,
  updateSettingsSchema,
} from './schemas/settings.schema.js';
import { SettingsService } from './settings.service.js';

@ApiTags('settings')
@Controller('clinic/settings')
@UseGuards(AuthenticationGuard, ClinicGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Qualquer membro lê (os formulários precisam saber o que está ligado). */
  @Get()
  @ApiOperation({ summary: 'Opções da clínica ativa' })
  get(@CurrentClinicId() clinicId: string) {
    return this.settings.get(clinicId);
  }

  @Put()
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Altera as opções da clínica (ADMIN)' })
  update(
    @CurrentClinicId() clinicId: string,
    @Body({ schema: updateSettingsSchema }) body: UpdateSettingsDto,
  ) {
    return this.settings.update(clinicId, body);
  }
}
