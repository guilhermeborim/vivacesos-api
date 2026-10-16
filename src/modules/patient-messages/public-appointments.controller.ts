import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { minutes, Throttle } from '@nestjs/throttler';
import { PublicAppointmentsService } from './public-appointments.service.js';

const publicThrottle = { default: { limit: 30, ttl: minutes(1) } };

/** Sem login: quem tem o link assinado confirma ou cancela a própria consulta. */
@ApiTags('public')
@Controller('public/appointments')
@Throttle(publicThrottle)
export class PublicAppointmentsController {
  constructor(private readonly publicAppointments: PublicAppointmentsService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Dados mínimos da consulta para a página do link' })
  view(@Param('token') token: string) {
    return this.publicAppointments.view(token);
  }

  @Post(':token/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'O paciente confirma a consulta' })
  confirm(@Param('token') token: string) {
    return this.publicAppointments.confirm(token);
  }

  @Post(':token/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'O paciente cancela a consulta' })
  cancel(@Param('token') token: string) {
    return this.publicAppointments.cancel(token);
  }
}
