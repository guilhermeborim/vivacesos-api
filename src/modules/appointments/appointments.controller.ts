import {
  Body,
  Controller,
  Get,
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
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../common/guards/clinic.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { PERMISSIONS } from '../../common/permissions/role-permissions.js';
import {
  type PaymentDto,
  paymentSchema,
} from '../../common/schemas/payment.schema.js';
import { AppointmentsService } from './appointments.service.js';
import {
  type ListAppointmentsDto,
  type SlotsQueryDto,
  type RegisterAppointmentDto,
  type UpdateAppointmentDto,
  type UpdateAppointmentStatusDto,
  listAppointmentsSchema,
  slotsQuerySchema,
  registerAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
} from './schemas/appointment.schema.js';

@ApiTags('appointments')
@Controller('clinic/appointments')
@UseGuards(AuthenticationGuard, ClinicGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Agenda uma consulta na clínica ativa' })
  register(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @Body({ schema: registerAppointmentSchema }) body: RegisterAppointmentDto,
  ) {
    return this.appointments.register(clinicId, user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'Consultas da clínica ativa (filtros opcionais)' })
  findByClinic(
    @CurrentClinicId() clinicId: string,
    @Query({ schema: listAppointmentsSchema }) query: ListAppointmentsDto,
  ) {
    return this.appointments.findByClinic(clinicId, query);
  }

  @Get('slots')
  @ApiOperation({
    summary:
      'Horários livres do profissional numa data (profissional com horários restritos)',
  })
  slots(
    @CurrentClinicId() clinicId: string,
    @Query({ schema: slotsQuerySchema }) query: SlotsQueryDto,
  ) {
    return this.appointments.slots(clinicId, query);
  }

  @Get(':appointmentId')
  @ApiOperation({ summary: 'Consulta da clínica ativa' })
  findById(
    @CurrentClinicId() clinicId: string,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    return this.appointments.findById(clinicId, appointmentId);
  }

  @Put(':appointmentId')
  @ApiOperation({ summary: 'Reagenda ou altera observações da consulta' })
  async update(
    @CurrentClinicId() clinicId: string,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body({ schema: updateAppointmentSchema }) body: UpdateAppointmentDto,
  ) {
    await this.appointments.update(clinicId, appointmentId, body);
  }

  @Patch(':appointmentId/status')
  @ApiOperation({ summary: 'Altera o status da consulta' })
  async updateStatus(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body({ schema: updateAppointmentStatusSchema })
    body: UpdateAppointmentStatusDto,
  ) {
    await this.appointments.updateStatus(
      clinicId,
      user.id,
      appointmentId,
      body,
    );
  }

  @Patch(':appointmentId/payment')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Registra ou desfaz o pagamento da consulta' })
  async updatePayment(
    @CurrentClinicId() clinicId: string,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body({ schema: paymentSchema }) body: PaymentDto,
  ) {
    await this.appointments.updatePayment(clinicId, appointmentId, body);
  }
}
