import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SecretAccessService } from './secret-access.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { UserRole } from '../users/entities/user.entity';
import { CreateSecretAccessGrantDto } from './dto/create-secret-access-grant.dto';
import { LogSecretAccessDto } from './dto/log-secret-access.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SECRET_ADMIN, UserRole.SYS_ADMIN)
@Controller('secret-access')
export class SecretAccessController {
  constructor(private svc: SecretAccessService) {}

  @Post('grants')
  grantAccess(
    @Body() dto: CreateSecretAccessGrantDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.grantAccess(dto, user);
  }

  @Patch('grants/:id/revoke')
  revokeAccess(@Param('id', ParseIntPipe) id: number) {
    return this.svc.revokeAccess(id);
  }

  @Get('grants')
  findGrants(
    @Query('businessType') businessType?: string,
    @Query('businessId') businessId?: string,
  ) {
    return this.svc.findGrants(businessType, businessId ? +businessId : undefined);
  }

  @Get('check')
  checkAccess(
    @Query('businessType') businessType: string,
    @Query('businessId') businessId: string,
    @Query('userId') userId: string,
    @Query('action') action: string,
  ) {
    return this.svc.checkAccess(businessType, +businessId, +userId, action);
  }

  @Post('logs')
  logAccess(@Body() dto: LogSecretAccessDto) {
    return this.svc.logAccess(dto);
  }
}
