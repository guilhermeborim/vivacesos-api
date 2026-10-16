import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentClinicId } from '../../common/decorators/current-user.decorator.js';
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../common/guards/clinic.guard.js';
import { PatientsService } from './patients.service.js';
import {
  type RegisterPatientDto,
  type UpdatePatientDto,
  registerPatientSchema,
  updatePatientSchema,
} from './schemas/patient.schema.js';

@ApiTags('patients')
@Controller('clinic')
@UseGuards(AuthenticationGuard, ClinicGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Post('patient')
  @ApiOperation({ summary: 'Cadastra um paciente na clínica ativa' })
  register(
    @CurrentClinicId() clinicId: string,
    @Body({ schema: registerPatientSchema }) body: RegisterPatientDto,
  ) {
    return this.patients.register(clinicId, body);
  }

  @Get('patients')
  @ApiOperation({ summary: 'Pacientes da clínica ativa' })
  findByClinic(@CurrentClinicId() clinicId: string) {
    return this.patients.findByClinic(clinicId);
  }

  @Get('patients/:patientId')
  @ApiOperation({ summary: 'Paciente da clínica ativa' })
  findById(
    @CurrentClinicId() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.patients.findById(clinicId, patientId);
  }

  @Put('patients/:patientId')
  @ApiOperation({ summary: 'Atualiza um paciente da clínica ativa' })
  async update(
    @CurrentClinicId() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body({ schema: updatePatientSchema }) body: UpdatePatientDto,
  ) {
    await this.patients.update(clinicId, patientId, body);
  }
}
