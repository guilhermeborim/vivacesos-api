import {
  BadRequestException,
  Body,
  Controller,
  Cookies,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { minutes, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  CurrentClinicId,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import {
  AuthCookiesService,
  REFRESH_TOKEN_COOKIE,
} from './auth-cookies.service.js';
import { AuthService } from './auth.service.js';
import { type LoginDto, loginSchema } from './schemas/login.schema.js';
import {
  type NextOnboardingStepDto,
  nextOnboardingStepSchema,
} from './schemas/next-onboarding-step.schema.js';
import { type RegisterDto, registerSchema } from './schemas/register.schema.js';
import {
  type SelectClinicDto,
  selectClinicSchema,
} from './schemas/select-clinic.schema.js';

const authThrottle = { default: { limit: 10, ttl: minutes(1) } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookiesService,
  ) {}

  @Post('register')
  @Throttle(authThrottle)
  @ApiOperation({ summary: 'Cadastra um usuário' })
  async register(@Body({ schema: registerSchema }) body: RegisterDto) {
    await this.auth.register(body);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(authThrottle)
  @ApiOperation({ summary: 'Autentica e define os cookies de sessão' })
  async login(
    @Body({ schema: loginSchema }) body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.auth.login(body);
    this.cookies.setAccessToken(res, accessToken);
    this.cookies.setRefreshToken(res, refreshToken);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renova o access token a partir do refresh token' })
  async refresh(
    @Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token está inválido ou ausente');
    }
    const { accessToken } = await this.auth.refresh(refreshToken);
    this.cookies.setAccessToken(res, accessToken);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Encerra a sessão' })
  async logout(
    @Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(refreshToken);
    this.cookies.clear(res);
  }

  @Get('session')
  @UseGuards(AuthenticationGuard)
  @ApiOperation({ summary: 'Dados da sessão atual' })
  session(
    @CurrentUser() user: { id: string },
    @CurrentClinicId() clinicId: string | undefined,
  ) {
    return this.auth.session(user.id, clinicId);
  }

  @Post('session/select-clinic')
  @HttpCode(200)
  @UseGuards(AuthenticationGuard)
  @ApiOperation({ summary: 'Define a clínica ativa da sessão' })
  async selectClinic(
    @CurrentUser() user: { id: string },
    @Body({ schema: selectClinicSchema }) body: SelectClinicDto,
    @Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.auth.selectClinic(
      user.id,
      body.clinicId,
      refreshToken,
    );
    this.cookies.setAccessToken(res, accessToken);
  }

  @Post('session/next-step')
  @HttpCode(200)
  @UseGuards(AuthenticationGuard)
  @ApiOperation({ summary: 'Avança o passo de onboarding' })
  nextStep(
    @CurrentUser() user: { id: string },
    @Body({ schema: nextOnboardingStepSchema }) body: NextOnboardingStepDto,
  ) {
    return this.auth.nextOnboardingStep(user.id, body.step);
  }
}
