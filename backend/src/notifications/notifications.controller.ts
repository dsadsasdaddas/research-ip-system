import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  /** 我的通知列表（分页） */
  @Get()
  findMyNotifications(
    @Query() query: QueryNotificationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.findMyNotifications(user.id, query);
  }

  /** 未读数量 */
  @Get('unread-count')
  countUnread(@CurrentUser() user: AuthUser) {
    return this.svc.countUnread(user.id);
  }

  /** 标记单条已读 */
  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.markRead(+id, user.id);
  }

  /** 标记全部已读 */
  @Post('mark-all-read')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.svc.markAllRead(user.id);
  }
}
