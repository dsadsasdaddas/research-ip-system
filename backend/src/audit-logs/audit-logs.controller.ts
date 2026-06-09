import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AUDITOR, UserRole.SYS_ADMIN, UserRole.LEADER)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private svc: AuditLogsService) {}

  @Get()
  findAll(
    @Query('keyword')  keyword?: string,
    @Query('module')   module?: string,
    @Query('action')   action?: string,
    @Query('username') username?: string,
    @Query('page')     page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.findAll({
      keyword, module, action, username,
      page:     page     ? +page     : 1,
      pageSize: pageSize ? +pageSize : 50,
    });
  }
}
