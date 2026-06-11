import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PageResult } from '../common/types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateIntegrationConfigDto } from './dto/create-integration-config.dto';
import { IntegrationLogsQueryDto } from './dto/integration-logs-query.dto';
import { UpdateIntegrationConfigDto } from './dto/update-integration-config.dto';
import { IntegrationConfig } from './entities/integration-config.entity';
import { IntegrationLog } from './entities/integration-log.entity';
import { IntegrationTestResult, IntegrationsService } from './integrations.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYS_ADMIN)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly svc: IntegrationsService) {}

  @Get('configs')
  findAll(): Promise<IntegrationConfig[]> {
    return this.svc.findAll();
  }

  @Post('configs')
  create(@Body() dto: CreateIntegrationConfigDto): Promise<IntegrationConfig> {
    return this.svc.create(dto);
  }

  @Patch('configs/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIntegrationConfigDto): Promise<IntegrationConfig> {
    return this.svc.update(id, dto);
  }

  @Post('configs/:id/test')
  test(@Param('id', ParseIntPipe) id: number): Promise<IntegrationTestResult> {
    return this.svc.test(id);
  }

  @Get('logs')
  logs(@Query() query: IntegrationLogsQueryDto): Promise<PageResult<IntegrationLog>> {
    return this.svc.findLogs(query);
  }
}
