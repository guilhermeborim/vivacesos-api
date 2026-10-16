import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { RecordTemplatesService } from './record-templates.service.js';
import {
  type CreateTemplateDto,
  type UpdateTemplateDto,
  createTemplateSchema,
  updateTemplateSchema,
} from './schemas/record-template.schema.js';

/** Deve ser registrado antes do MedicalRecordsController (`:patientId` capturaria `templates`). */
@ApiTags('medical-records')
@Controller('clinic/medical-records/templates')
@UseGuards(AuthenticationGuard, ClinicGuard, PermissionsGuard)
export class RecordTemplatesController {
  constructor(private readonly templates: RecordTemplatesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.RECORD_VIEW)
  @ApiOperation({ summary: 'Modelos de ficha do profissional logado' })
  findAll(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.templates.findAll(clinicId, user.id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.RECORD_WRITE)
  @ApiOperation({ summary: 'Cria um modelo de ficha' })
  create(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @Body({ schema: createTemplateSchema }) body: CreateTemplateDto,
  ) {
    return this.templates.create(clinicId, user.id, body);
  }

  @Put(':templateId')
  @HttpCode(204)
  @RequirePermissions(PERMISSIONS.RECORD_WRITE)
  @ApiOperation({ summary: 'Atualiza um modelo de ficha' })
  async update(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body({ schema: updateTemplateSchema }) body: UpdateTemplateDto,
  ) {
    await this.templates.update(clinicId, user.id, templateId, body);
  }

  @Delete(':templateId')
  @HttpCode(204)
  @RequirePermissions(PERMISSIONS.RECORD_WRITE)
  @ApiOperation({ summary: 'Apaga um modelo de ficha' })
  async remove(
    @CurrentClinicId() clinicId: string,
    @CurrentUser() user: { id: string },
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    await this.templates.remove(clinicId, user.id, templateId);
  }
}
