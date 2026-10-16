import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentClinicId,
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';
import { AuthenticationGuard } from '../../common/guards/authentication.guard.js';
import { ClinicGuard } from '../../common/guards/clinic.guard.js';
import { NotificationsService } from './notifications.service.js';

/** Qualquer papel; cada usuário só enxerga e altera as próprias notificações. */
@ApiTags('notifications')
@Controller('clinic/notifications')
@UseGuards(AuthenticationGuard, ClinicGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Minhas notificações mais recentes e o total não lido',
  })
  list(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notifications.list(clinicId, user.id);
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Apaga todas as minhas notificações (tela e banco de dados)',
  })
  async clear(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.notifications.clearAll(clinicId, user.id);
  }

  @Post('read-all')
  @HttpCode(204)
  @ApiOperation({ summary: 'Marca todas as minhas notificações como lidas' })
  async readAll(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.notifications.markAllRead(clinicId, user.id);
  }

  @Patch(':notificationId/read')
  @HttpCode(204)
  @ApiOperation({ summary: 'Marca uma notificação como lida' })
  async read(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ) {
    await this.notifications.markRead(clinicId, user.id, notificationId);
  }
}
