import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { PERMISSIONS } from '../../common/permissions/role-permissions.js';
import { InvitesService } from './invites.service.js';
import {
  type CreateInviteDto,
  createInviteSchema,
} from './schemas/create-invite.schema.js';

@ApiTags('invites')
@Controller('invite')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post()
  @UseGuards(AuthenticationGuard, ClinicGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CLINIC_USER_MANAGE)
  @ApiOperation({ summary: 'Convida um e-mail para a clínica ativa' })
  create(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @Body({ schema: createInviteSchema }) body: CreateInviteDto,
  ) {
    return this.invites.create(clinicId, user.id, body);
  }

  @Post(':inviteId/resend')
  @UseGuards(AuthenticationGuard, ClinicGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CLINIC_USER_MANAGE)
  @ApiOperation({ summary: 'Reenvia o convite (novo link e novas 24h)' })
  resend(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ) {
    return this.invites.resend(clinicId, user.id, inviteId);
  }

  @Get(':token')
  @ApiOperation({ summary: 'Consulta pública de um convite pelo token' })
  findByToken(@Param('token') token: string) {
    return this.invites.findByToken(token);
  }
}
