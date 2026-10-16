import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { ClinicUsersService } from './clinic-users.service.js';
import {
  type BindClinicUserDto,
  bindClinicUserSchema,
} from './schemas/bind-clinic-user.schema.js';
import {
  type UpdateStatusDto,
  updateStatusSchema,
} from './schemas/update-status.schema.js';
import {
  type UpdateUserDto,
  updateUserSchema,
} from './schemas/update-user.schema.js';

@ApiTags('clinic-users')
@Controller('clinic/users')
@UseGuards(AuthenticationGuard, ClinicGuard, PermissionsGuard)
export class ClinicUsersController {
  constructor(private readonly clinicUsers: ClinicUsersService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.CLINIC_USER_MANAGE)
  @ApiOperation({ summary: 'Vincula um usuário existente à clínica ativa' })
  bind(
    @CurrentClinicId() clinicId: string,
    @Body({ schema: bindClinicUserSchema }) body: BindClinicUserDto,
  ) {
    return this.clinicUsers.bind(clinicId, body);
  }

  @Get()
  @ApiOperation({ summary: 'Usuários e convites pendentes da clínica ativa' })
  findByClinic(@CurrentClinicId() clinicId: string) {
    return this.clinicUsers.findByClinic(clinicId);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Usuário da clínica ativa' })
  findOne(
    @CurrentClinicId() clinicId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.clinicUsers.findOne(clinicId, userId);
  }

  @Put(':userId')
  @ApiOperation({
    summary: 'Atualiza nome/ativo de um usuário da clínica ativa',
  })
  async updateUser(
    @Req() req: AuthenticatedRequest,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body({ schema: updateUserSchema }) body: UpdateUserDto,
  ) {
    await this.clinicUsers.updateUser(
      req.clinicId!,
      { id: req.user.id, role: req.userRole },
      userId,
      body,
    );
  }

  @Patch(':userId/status')
  @HttpCode(204)
  @RequirePermissions(PERMISSIONS.USER_STATUS_CHANGE)
  @ApiOperation({ summary: 'Altera o status do usuário na clínica ativa' })
  updateStatus(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body({ schema: updateStatusSchema }) body: UpdateStatusDto,
  ) {
    return this.clinicUsers.updateStatus(
      clinicId,
      user.id,
      userId,
      body.status,
    );
  }
}
