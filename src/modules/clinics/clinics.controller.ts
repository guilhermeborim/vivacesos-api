import {
  Body,
  Controller,
  Cookies,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  CurrentClinicId,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../common/guards/clinic.guard.js';
import {
  AuthCookiesService,
  REFRESH_TOKEN_COOKIE,
} from '../auth/auth-cookies.service.js';
import { AuthService } from '../auth/auth.service.js';
import { ClinicsService } from './clinics.service.js';
import {
  type RegisterClinicDto,
  registerClinicSchema,
} from './schemas/register-clinic.schema.js';
import {
  type UpdateClinicDto,
  updateClinicSchema,
} from './schemas/update-clinic.schema.js';

@ApiTags('clinics')
@Controller()
@UseGuards(AuthenticationGuard)
export class ClinicsController {
  constructor(
    private readonly clinics: ClinicsService,
    private readonly auth: AuthService,
    private readonly cookies: AuthCookiesService,
  ) {}

  @Post('clinic/register')
  @ApiOperation({
    summary: 'Cadastra uma clínica e vincula o usuário como ADMIN',
  })
  async register(
    @CurrentUser() user: { id: string },
    @Body({ schema: registerClinicSchema }) body: RegisterClinicDto,
    @Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { clinic, isFirstClinic } = await this.clinics.register(
      user.id,
      body,
    );

    // Primeira clínica do usuário: já vira a clínica ativa da sessão.
    if (isFirstClinic) {
      const { accessToken } = await this.auth.selectClinic(
        user.id,
        clinic.clinic.clinicId,
        refreshToken,
      );
      this.cookies.setAccessToken(res, accessToken);
    }

    return clinic;
  }

  @Get('clinics')
  @ApiOperation({ summary: 'Clínicas do usuário autenticado' })
  findByUser(@CurrentUser() user: { id: string }) {
    return this.clinics.findByUser(user.id);
  }

  @Get('clinic/:clinicId')
  @ApiOperation({ summary: 'Busca uma clínica do usuário pelo id' })
  findById(
    @CurrentUser() user: { id: string },
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
  ) {
    return this.clinics.findById(user.id, clinicId);
  }

  @Put('clinic/:clinicId')
  @UseGuards(ClinicGuard)
  @ApiOperation({ summary: 'Atualiza a clínica ativa' })
  async update(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @CurrentClinicId() activeClinicId: string | undefined,
    @Body({ schema: updateClinicSchema }) body: UpdateClinicDto,
  ) {
    if (clinicId !== activeClinicId) {
      throw new ForbiddenException('Clínica diferente da clínica ativa!');
    }
    await this.clinics.update(clinicId, body);
  }
}
