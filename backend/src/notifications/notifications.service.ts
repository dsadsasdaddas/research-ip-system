import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationMessage } from './entities/notification-message.entity';
import { NotificationSendLog } from './entities/notification-send-log.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { paginate } from '../common/utils/pagination';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationMessage)
    private msgRepo: Repository<NotificationMessage>,
    @InjectRepository(NotificationSendLog)
    private logRepo: Repository<NotificationSendLog>,
    @Optional() private emailService?: EmailService,
  ) {}

  /** 创建通知消息 */
  async createNotification(
    dto: CreateNotificationDto,
  ): Promise<NotificationMessage> {
    const entity = this.msgRepo.create(dto);
    const saved = await this.msgRepo.save(entity);

    // 尝试通过邮件发送（邮件未配置则静默跳过）
    if (saved.receiverName && this.emailService) {
      await this.sendViaChannel(saved.id, 'email', saved.receiverName);
    }

    return saved;
  }

  /** 查询我的通知（分页） */
  async findMyNotifications(userId: number, query: QueryNotificationDto) {
    const qb = this.msgRepo
      .createQueryBuilder('n')
      .where('n.receiver_id = :userId', { userId })
      .orderBy('n.create_time', 'DESC');

    if (query.isRead !== undefined) {
      qb.andWhere('n.is_read = :isRead', { isRead: query.isRead });
    }
    if (query.messageType) {
      qb.andWhere('n.message_type = :type', { type: query.messageType });
    }

    return paginate(qb, query.page, query.pageSize);
  }

  /** 标记单条已读 */
  async markRead(
    id: number,
    userId: number,
  ): Promise<NotificationMessage | null> {
    const notification = await this.msgRepo.findOneBy({ id });
    if (!notification) return null;
    if (notification.receiverId !== userId) return null;

    notification.isRead = true;
    notification.readTime = new Date();
    return this.msgRepo.save(notification);
  }

  /** 标记全部已读 */
  async markAllRead(userId: number): Promise<{ affected: number }> {
    const result = await this.msgRepo.update(
      { receiverId: userId, isRead: false },
      { isRead: true, readTime: new Date() },
    );
    return { affected: result.affected ?? 0 };
  }

  /** 统计未读数量 */
  async countUnread(userId: number): Promise<{ count: number }> {
    const count = await this.msgRepo.count({
      where: { receiverId: userId, isRead: false },
    });
    return { count };
  }

  /** 通过指定渠道发送通知并记录日志 */
  async sendViaChannel(
    messageId: number,
    channel: string,
    receiver: string,
  ): Promise<NotificationSendLog> {
    let success = false;
    let errorMessage: string | null = null;
    let provider: string | null = null;

    if (channel === 'site') {
      // 站内通知直接标记成功
      success = true;
      provider = 'site';
    } else if (channel === 'email') {
      provider = 'smtp';
      if (this.emailService) {
        try {
          const message = await this.msgRepo.findOneBy({ id: messageId });
          const sent = await this.emailService.sendMail({
            to: receiver,
            subject: message?.title ?? '系统通知',
            html: message?.content ?? '',
          });
          success = sent;
          if (!sent) errorMessage = '邮件发送返回失败（可能未配置SMTP）';
        } catch (err) {
          success = false;
          errorMessage = err instanceof Error ? err.message : String(err);
        }
      } else {
        errorMessage = 'EmailService 未注入，邮件发送不可用';
      }
    } else {
      errorMessage = `不支持的发送渠道: ${channel}`;
    }

    const log = this.logRepo.create({
      messageId,
      channel,
      receiver,
      success,
      provider,
      errorMessage,
    });
    return this.logRepo.save(log);
  }
}
