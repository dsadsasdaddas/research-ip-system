import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYS_ADMIN)
@Controller('backup')
export class BackupController {
  constructor(private svc: BackupService) {}

  @Post('trigger')
  triggerBackup(@CurrentUser() user?: AuthUser) {
    return this.svc.triggerBackup(user);
  }

  @Post(':id/restore')
  restoreBackup(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.svc.restoreBackup(id, user);
  }

  @Get('logs')
  findAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.svc.findAll(
      page ? +page : undefined,
      pageSize ? +pageSize : undefined,
    );
  }
}
