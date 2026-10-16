import {
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentClinicId } from '../../common/decorators/current-user.decorator.js';
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../common/guards/clinic.guard.js';
import { PatientMessagesService } from './patient-messages.service.js';

@ApiTags('patient-messages')
@Controller('clinic/appointments')
@UseGuards(AuthenticationGuard, ClinicGuard)
export class PatientMessagesController {
  constructor(private readonly messages: PatientMessagesService) {}

  @Post(':appointmentId/message')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Mensagem de WhatsApp pronta para o paciente (texto + link do wa.me)',
  })
  compose(
    @CurrentClinicId() clinicId: string,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    return this.messages.compose(clinicId, appointmentId);
  }
}
