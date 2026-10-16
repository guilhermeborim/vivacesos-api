import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
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
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface.js';
import { PERMISSIONS } from '../../common/permissions/role-permissions.js';
import { AvailabilityService } from './availability.service.js';
import { ProfessionalsService } from './professionals.service.js';
import {
  type UpdateAvailabilityDto,
  updateAvailabilitySchema,
} from './schemas/availability.schema.js';
import {
  type RegisterProfessionalDto,
  type RegisterProfessionalOnboardingDto,
  type UpdateProfessionalDto,
  registerProfessionalOnboardingSchema,
  registerProfessionalSchema,
  updateProfessionalSchema,
} from './schemas/professional.schema.js';

@ApiTags('professionals')
@Controller()
@UseGuards(AuthenticationGuard)
export class ProfessionalsController {
  constructor(
    private readonly professionals: ProfessionalsService,
    private readonly availability: AvailabilityService,
  ) {}

  @Post('professional/onboarding')
  @ApiOperation({
    summary: 'O próprio usuário se registra como profissional (onboarding)',
  })
  registerOnboarding(
    @CurrentUser() user: { id: string },
    @Body({ schema: registerProfessionalOnboardingSchema })
    body: RegisterProfessionalOnboardingDto,
  ) {
    return this.professionals.registerOnboarding(user.id, body);
  }

  @Post('clinic/professionals')
  @UseGuards(ClinicGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PROFESSIONAL_CREATE)
  @ApiOperation({ summary: 'Cadastra um profissional na clínica ativa' })
  register(
    @CurrentClinicId() clinicId: string,
    @Body({ schema: registerProfessionalSchema }) body: RegisterProfessionalDto,
  ) {
    return this.professionals.register(clinicId, body);
  }

  @Get('clinic/professionals')
  @UseGuards(ClinicGuard)
  @ApiOperation({ summary: 'Profissionais da clínica ativa' })
  findByClinic(@Req() req: AuthenticatedRequest) {
    return this.professionals.findByClinic(req.clinicId!, {
      id: req.user.id,
      role: req.userRole,
    });
  }

  @Get('clinic/professionals/:professionalId')
  @UseGuards(ClinicGuard)
  @ApiOperation({ summary: 'Profissional da clínica ativa' })
  findById(
    @Req() req: AuthenticatedRequest,
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
  ) {
    return this.professionals.findById(req.clinicId!, professionalId, {
      id: req.user.id,
      role: req.userRole,
    });
  }

  @Put('clinic/professionals/:professionalId')
  @UseGuards(ClinicGuard)
  @ApiOperation({ summary: 'Atualiza um profissional da clínica ativa' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Body({ schema: updateProfessionalSchema }) body: UpdateProfessionalDto,
  ) {
    await this.professionals.update(
      req.clinicId!,
      { id: req.user.id, role: req.userRole },
      professionalId,
      body,
    );
  }

  @Get('clinic/professionals/:professionalId/availability')
  @UseGuards(ClinicGuard)
  @ApiOperation({ summary: 'Horários de atendimento do profissional' })
  getAvailability(
    @CurrentClinicId() clinicId: string,
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
  ) {
    return this.availability.get(clinicId, professionalId);
  }

  @Put('clinic/professionals/:professionalId/availability')
  @UseGuards(ClinicGuard)
  @ApiOperation({
    summary:
      'Define os horários de atendimento (o próprio profissional ou ADMIN)',
  })
  updateAvailability(
    @Req() req: AuthenticatedRequest,
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Body({ schema: updateAvailabilitySchema }) body: UpdateAvailabilityDto,
  ) {
    return this.availability.update(
      req.clinicId!,
      { id: req.user.id, role: req.userRole },
      professionalId,
      body,
    );
  }
}
