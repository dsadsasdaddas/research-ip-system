import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
    return this.svc.findGrants(
      businessType,
      businessId ? +businessId : undefined,
    );
  }

  @Get('check')
  async checkAccess(
    @Query('businessType') businessType: string,
    @Query('businessId') businessId: string,
    @Query('userId') userId: string,
    @Query('action') action: string,
  ) {
    // 参数缺失时 TypeORM 会忽略该条件 → 跨业务类型匹配越权,必须先校验
    if (!businessType || !businessId || !userId || !action) {
      throw new BadRequestException(
        'businessType、businessId、userId、action 不能为空',
      );
    }
    const bId = Number(businessId);
    const uId = Number(userId);
    if (Number.isNaN(bId) || Number.isNaN(uId)) {
      throw new BadRequestException('businessId 和 userId 必须为数字');
    }
    const allowed = await this.svc.checkAccess(businessType, bId, uId, action);
    return { allowed };
  }

  @Post('logs')
  logAccess(@Body() dto: LogSecretAccessDto) {
    return this.svc.logAccess(dto);
  }
}
