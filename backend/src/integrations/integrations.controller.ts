import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PageResult } from '../common/types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { UserRole } from '../users/entities/user.entity';
import { CreateIntegrationConfigDto } from './dto/create-integration-config.dto';
import { IntegrationLogsQueryDto } from './dto/integration-logs-query.dto';
import { UpdateIntegrationConfigDto } from './dto/update-integration-config.dto';
import { CreateIntegrationMappingDto } from './dto/create-integration-mapping.dto';
import { CreateIntegrationAlertDto, HandleIntegrationAlertDto } from './dto/create-integration-alert.dto';
import { IntegrationConfig } from './entities/integration-config.entity';
import { IntegrationLog } from './entities/integration-log.entity';
import { IntegrationTestResult, IntegrationsService } from './integrations.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYS_ADMIN)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly svc: IntegrationsService) {}

  // ──── 接口配置 ────

  @Get('configs')
  findAll(): Promise<IntegrationConfig[]> {
    return this.svc.findAll();
  }

  @Post('configs')
  create(@Body() dto: CreateIntegrationConfigDto): Promise<IntegrationConfig> {
    return this.svc.create(dto);
  }

  @Get('configs/:id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<IntegrationConfig> {
    return this.svc.findOne(id);
  }

  @Patch('configs/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIntegrationConfigDto): Promise<IntegrationConfig> {
    return this.svc.update(id, dto);
  }

  @Post('configs/:id/test')
  test(@Param('id', ParseIntPipe) id: number): Promise<IntegrationTestResult> {
    return this.svc.test(id);
  }

  @Delete('configs/:id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ deleted: true; id: number }> {
    return this.svc.remove(id);
  }

  @Get('logs')
  logs(@Query() query: IntegrationLogsQueryDto): Promise<PageResult<IntegrationLog>> {
    return this.svc.findLogs(query);
  }

  // ──── 字段映射 ────

  @Get('mappings')
  findMappings(
    @Query('integrationType') integrationType?: string,
    @Query('businessModule') businessModule?: string,
  ) {
    return this.svc.findMappings(integrationType, businessModule);
  }

  @Post('mappings')
  createMapping(@Body() dto: CreateIntegrationMappingDto) {
    return this.svc.createMapping(dto);
  }

  @Delete('mappings/:id')
  removeMapping(@Param('id', ParseIntPipe) id: number) {
    return this.svc.removeMapping(id);
  }

  // ──── 异常告警 ────

  @Get('alerts')
  findAlerts(
    @Query('integrationType') integrationType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.findAlerts(integrationType, status, page ? +page : undefined, pageSize ? +pageSize : undefined);
  }

  @Post('alerts')
  createAlert(@Body() dto: CreateIntegrationAlertDto) {
    return this.svc.createAlert(dto);
  }

  @Patch('alerts/:id/handle')
  handleAlert(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HandleIntegrationAlertDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.svc.handleAlert(id, dto, user);
  }
}
