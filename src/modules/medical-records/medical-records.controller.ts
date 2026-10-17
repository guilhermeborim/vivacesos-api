import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentClinicId,
  CurrentUser,
  CurrentUserRole,
} from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../common/guards/clinic.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { PERMISSIONS } from '../../common/permissions/role-permissions.js';
import type { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { MedicalRecordsService } from './medical-records.service.js';
import {
  type CancelEntryDto,
  type CreateEntryDto,
  type DayRecordsDto,
  type ListAuditDto,
  cancelEntrySchema,
  createEntrySchema,
  dayRecordsSchema,
  listAuditSchema,
} from './schemas/medical-record.schema.js';

@ApiTags('medical-records')
@Controller('clinic/medical-records')
@UseGuards(AuthenticationGuard, ClinicGuard, PermissionsGuard)
export class MedicalRecordsController {
  constructor(private readonly medicalRecords: MedicalRecordsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.RECORD_VIEW)
  @ApiOperation({ summary: 'Todos os prontuários da clínica ativa' })
  findByClinic(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.medicalRecords.findByClinic(clinicId, user.id);
  }

  @Get('day')
  @RequirePermissions(PERMISSIONS.RECORD_VIEW)
  @ApiOperation({
    summary:
      'Prontuários dos pacientes com consulta do profissional no período',
  })
  findDay(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @Query({ schema: dayRecordsSchema }) query: DayRecordsDto,
  ) {
    return this.medicalRecords.findDay(clinicId, user.id, query);
  }

  @Get('audit')
  @RequirePermissions(PERMISSIONS.AUDIT_VIEW)
  @ApiOperation({ summary: 'Auditoria de acessos aos prontuários (ADMIN)' })
  findAudit(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @CurrentUserRole() role: ClinicUserRole,
    @Query({ schema: listAuditSchema }) query: ListAuditDto,
  ) {
    return this.medicalRecords.findAudit(
      clinicId,
      { id: user.id, role },
      query,
    );
  }

  @Get('appointments/:appointmentId/entry-status')
  @RequirePermissions(PERMISSIONS.RECORD_VIEW)
  @ApiOperation({ summary: 'Indica se a consulta já tem ficha ativa' })
  entryStatus(
    @CurrentClinicId() clinicId: string,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    return this.medicalRecords.entryStatus(clinicId, appointmentId);
  }

  @Get(':patientId')
  @RequirePermissions(PERMISSIONS.RECORD_VIEW)
  @ApiOperation({ summary: 'Prontuário do paciente com a linha do tempo' })
  findByPatient(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @CurrentUserRole() role: ClinicUserRole,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.medicalRecords.findByPatient(
      clinicId,
      { id: user.id, role },
      patientId,
    );
  }

  @Post(':patientId/entries')
  @RequirePermissions(PERMISSIONS.RECORD_WRITE)
  @ApiOperation({
    summary: 'Cria uma ficha no prontuário (conclui-se a consulta pelo front)',
  })
  createEntry(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @CurrentUserRole() role: ClinicUserRole,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body({ schema: createEntrySchema }) body: CreateEntryDto,
  ) {
    return this.medicalRecords.createEntry(
      clinicId,
      { id: user.id, role },
      patientId,
      body,
    );
  }

  @Post('entries/:entryId/cancel')
  @HttpCode(204)
  @RequirePermissions(PERMISSIONS.RECORD_WRITE)
  @ApiOperation({ summary: 'Cancela uma ficha (exige justificativa)' })
  async cancelEntry(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @CurrentUserRole() role: ClinicUserRole,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body({ schema: cancelEntrySchema }) body: CancelEntryDto,
  ) {
    await this.medicalRecords.cancelEntry(
      clinicId,
      { id: user.id, role },
      entryId,
      body,
    );
  }
}
