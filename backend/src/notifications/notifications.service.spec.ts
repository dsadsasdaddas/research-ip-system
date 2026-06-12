import { NotificationsService } from './notifications.service';
import { mockRepository, mockQueryBuilder } from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { NotificationMessage } from './entities/notification-message.entity';
import type { NotificationSendLog } from './entities/notification-send-log.entity';
import type { EmailService } from '../email/email.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let msgRepo: ReturnType<typeof mockRepository>;
  let logRepo: ReturnType<typeof mockRepository>;
  let emailService: { sendMail: jest.Mock } | undefined;

  function build(email?: { sendMail: jest.Mock }) {
    msgRepo = mockRepository();
    logRepo = mockRepository();
    emailService = email;
    service = new NotificationsService(
      msgRepo as unknown as Repository<NotificationMessage>,
      logRepo as unknown as Repository<NotificationSendLog>,
      emailService as unknown as EmailService | undefined,
    );
  }

  beforeEach(() => {
    build({ sendMail: jest.fn().mockResolvedValue(true) });
  });

  function withQb(terminal: Record<string, jest.Mock>) {
    const qb = mockQueryBuilder(terminal);
    msgRepo = mockRepository({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    });
    logRepo = mockRepository();
    service = new NotificationsService(
      msgRepo as unknown as Repository<NotificationMessage>,
      logRepo as unknown as Repository<NotificationSendLog>,
      emailService as unknown as EmailService | undefined,
    );
    return qb;
  }

  describe('createNotification', () => {
    it('有 receiverName + email → 触发邮件发送并返回保存结果', async () => {
      msgRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      msgRepo.save.mockResolvedValue({
        id: 1,
        receiverName: 'bob',
        title: 't',
        content: 'c',
      });
      emailService!.sendMail.mockResolvedValue(true);
      // sendViaChannel 内部会用 findOneBy 查消息体;msgRepo 共用 findOneBy
      msgRepo.findOneBy.mockResolvedValue({ title: 't', content: 'c' });

      const out = await service.createNotification({
        receiverName: 'bob',
        title: 't',
        content: 'c',
      });

      expect(out).toEqual({
        id: 1,
        receiverName: 'bob',
        title: 't',
        content: 'c',
      });
      expect(emailService!.sendMail).toHaveBeenCalled();
      expect(logRepo.save).toHaveBeenCalled();
    });

    it('无 receiverName → 不发送邮件', async () => {
      msgRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      msgRepo.save.mockResolvedValue({ id: 1, title: 't' });
      await service.createNotification({ title: 't' });
      expect(emailService!.sendMail).not.toHaveBeenCalled();
    });

    it('有 receiverName 但 emailService 未注入 → 降级,不发送', async () => {
      build(undefined);
      msgRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      msgRepo.save.mockResolvedValue({
        id: 1,
        receiverName: 'bob',
        title: 't',
      });
      const out = await service.createNotification({
        receiverName: 'bob',
        title: 't',
      });
      expect(out).toEqual({ id: 1, receiverName: 'bob', title: 't' });
      // 邮件降级:不会调用 sendMail,也不写日志(因为没进入 sendViaChannel)
      expect(logRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findMyNotifications', () => {
    it('无过滤 → 仅 where receiver_id', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
      });
      const res = await service.findMyNotifications(7, {});
      expect(qb.where).toHaveBeenCalledWith('n.receiver_id = :userId', {
        userId: 7,
      });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('n.create_time', 'DESC');
      expect(res.items).toEqual([{ id: 1 }]);
      expect(res.total).toBe(1);
    });

    it('isRead/messageType 都有 → 加两个条件', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });
      await service.findMyNotifications(7, {
        isRead: true,
        messageType: 'reminder',
      });
      expect(qb.andWhere).toHaveBeenCalledTimes(2);
    });

    it('分页默认值 page=1/pageSize=20', async () => {
      const qb = withQb({
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });
      const res = await service.findMyNotifications(7, {});
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(20);
    });
  });

  describe('markRead', () => {
    it('不存在 → null', async () => {
      msgRepo.findOneBy.mockResolvedValue(null);
      await expect(service.markRead(1, 7)).resolves.toBeNull();
      expect(msgRepo.save).not.toHaveBeenCalled();
    });

    it('receiverId 不匹配 → null', async () => {
      msgRepo.findOneBy.mockResolvedValue({
        id: 1,
        receiverId: 8,
        isRead: false,
      });
      await expect(service.markRead(1, 7)).resolves.toBeNull();
      expect(msgRepo.save).not.toHaveBeenCalled();
    });

    it('匹配 → 更新 isRead/readTime 并保存', async () => {
      const n = {
        id: 1,
        receiverId: 7,
        isRead: false,
        readTime: null,
      } as NotificationMessage;
      msgRepo.findOneBy.mockResolvedValue(n);
      msgRepo.save.mockResolvedValue(n);
      const out = await service.markRead(1, 7);
      expect(n.isRead).toBe(true);
      expect(n.readTime).toBeInstanceOf(Date);
      expect(out).toBe(n);
    });
  });

  describe('markAllRead', () => {
    it('有 affected → 返回 affected', async () => {
      msgRepo.update.mockResolvedValue({ affected: 3 });
      const out = await service.markAllRead(7);
      expect(msgRepo.update).toHaveBeenCalledWith(
        { receiverId: 7, isRead: false },
        { isRead: true, readTime: expect.any(Date) },
      );
      expect(out).toEqual({ affected: 3 });
    });

    it('affected 缺失 → 兜底 0', async () => {
      msgRepo.update.mockResolvedValue({});
      const out = await service.markAllRead(7);
      expect(out).toEqual({ affected: 0 });
    });
  });

  describe('countUnread', () => {
    it('返回未读数', async () => {
      msgRepo.count.mockResolvedValue(5);
      const out = await service.countUnread(7);
      expect(msgRepo.count).toHaveBeenCalledWith({
        where: { receiverId: 7, isRead: false },
      });
      expect(out).toEqual({ count: 5 });
    });
  });

  describe('sendViaChannel', () => {
    it('site 渠道 → 直接成功,provider=site', async () => {
      logRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.sendViaChannel(1, 'site', 'bob');
      expect(out.success).toBe(true);
      expect(out.provider).toBe('site');
      expect(logRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'site',
          receiver: 'bob',
          success: true,
          provider: 'site',
        }),
      );
    });

    it('email 渠道 + 发送成功 → success=true', async () => {
      logRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      msgRepo.findOneBy.mockResolvedValue({ title: 'T', content: 'C' });
      emailService!.sendMail.mockResolvedValue(true);
      const out = await service.sendViaChannel(1, 'email', 'a@b.com');
      expect(emailService!.sendMail).toHaveBeenCalledWith({
        to: 'a@b.com',
        subject: 'T',
        html: 'C',
      });
      expect(out.success).toBe(true);
      expect(out.provider).toBe('smtp');
      expect(out.errorMessage).toBeNull();
    });

    it('email 渠道 + 消息不存在 → subject/content 走默认值', async () => {
      logRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      msgRepo.findOneBy.mockResolvedValue(null);
      emailService!.sendMail.mockResolvedValue(true);
      await service.sendViaChannel(1, 'email', 'a@b.com');
      expect(emailService!.sendMail).toHaveBeenCalledWith({
        to: 'a@b.com',
        subject: '系统通知',
        html: '',
      });
    });

    it('email 渠道 + sendMail 返回 false → success=false,记错误', async () => {
      logRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      msgRepo.findOneBy.mockResolvedValue({ title: 'T', content: 'C' });
      emailService!.sendMail.mockResolvedValue(false);
      const out = await service.sendViaChannel(1, 'email', 'a@b.com');
      expect(out.success).toBe(false);
      expect(out.errorMessage).toBe('邮件发送返回失败（可能未配置SMTP）');
    });

    it('email 渠道 + sendMail 抛 Error → success=false,记 message', async () => {
      logRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      msgRepo.findOneBy.mockResolvedValue({ title: 'T', content: 'C' });
      emailService!.sendMail.mockRejectedValue(new Error('boom'));
      const out = await service.sendViaChannel(1, 'email', 'a@b.com');
      expect(out.success).toBe(false);
      expect(out.errorMessage).toBe('boom');
    });

    it('email 渠道 + sendMail 抛非 Error → success=false,记 String(err)', async () => {
      logRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      msgRepo.findOneBy.mockResolvedValue({ title: 'T', content: 'C' });
      emailService!.sendMail.mockRejectedValue('str-err');
      const out = await service.sendViaChannel(1, 'email', 'a@b.com');
      expect(out.success).toBe(false);
      expect(out.errorMessage).toBe('str-err');
    });

    it('email 渠道 + emailService 未注入 → 降级', async () => {
      build(undefined);
      logRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.sendViaChannel(1, 'email', 'a@b.com');
      expect(out.success).toBe(false);
      expect(out.errorMessage).toBe('EmailService 未注入，邮件发送不可用');
      expect(out.provider).toBe('smtp');
    });

    it('未知渠道 → success=false,记错误', async () => {
      logRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.sendViaChannel(1, 'sms', 'bob');
      expect(out.success).toBe(false);
      expect(out.errorMessage).toBe('不支持的发送渠道: sms');
      expect(out.provider).toBeNull();
    });
  });
});
