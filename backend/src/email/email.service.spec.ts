import { EmailService } from './email.service';

// mock nodemailer: createTransport 返回带 sendMail 的对象,可被每个用例控制。
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

const nodemailer = require('nodemailer') as { createTransport: jest.Mock };

describe('EmailService', () => {
  const ENV_KEYS = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
  ];
  let savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    savedEnv = {};
    ENV_KEYS.forEach((k) => {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    });
  });

  afterEach(() => {
    ENV_KEYS.forEach((k) => {
      if (savedEnv[k] !== undefined) process.env[k] = savedEnv[k];
      else delete process.env[k];
    });
  });

  /** 配置好 SMTP 并构造 service,返回 sendMail mock 便于控制成功/失败。 */
  function buildWithSmtp(
    overrides: Partial<{
      host: string;
      port: string;
      user: string;
      pass: string;
      from: string;
    }> = {},
  ) {
    process.env.SMTP_HOST = overrides.host ?? 'smtp.test.com';
    process.env.SMTP_PORT = overrides.port ?? '465';
    process.env.SMTP_USER = overrides.user ?? 'sender@test.com';
    process.env.SMTP_PASS = overrides.pass ?? 'pwd';
    if (overrides.from !== undefined) process.env.SMTP_FROM = overrides.from;

    const sendMail = jest.fn().mockResolvedValue({ messageId: '<ok@test>' });
    nodemailer.createTransport.mockReturnValue({ sendMail });

    const service = new EmailService();
    return { service, sendMail };
  }

  describe('构造/配置', () => {
    it('SMTP 完整 → enabled,secure=465,createTransport 被调用', () => {
      const { service } = buildWithSmtp();
      expect(service['enabled']).toBe(true);
      expect(service['from']).toBe('sender@test.com');
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.test.com',
          port: 465,
          secure: true,
          auth: { user: 'sender@test.com', pass: 'pwd' },
        }),
      );
    });

    it('非 465 端口 → secure=false', () => {
      buildWithSmtp({ port: '587' });
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 587, secure: false }),
      );
    });

    it('SMTP_FROM 设置 → from 取 SMTP_FROM(优先于 user)', () => {
      const { service } = buildWithSmtp({ from: 'noreply@corp.com' });
      expect(service['from']).toBe('noreply@corp.com');
    });

    it('SMTP_PORT 缺省 → 默认 465', () => {
      process.env.SMTP_HOST = 'h';
      process.env.SMTP_USER = 'u';
      process.env.SMTP_PASS = 'p';
      nodemailer.createTransport.mockReturnValue({ sendMail: jest.fn() });
      new EmailService();
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 465 }),
      );
    });

    it('host/user/pass 任一缺失 → 未启用,不创建 transporter', () => {
      // host 缺
      process.env.SMTP_USER = 'u';
      process.env.SMTP_PASS = 'p';
      const svc1 = new EmailService();
      expect(svc1['enabled']).toBe(false);
      expect(nodemailer.createTransport).not.toHaveBeenCalled();

      // user 缺
      process.env.SMTP_HOST = 'h';
      delete process.env.SMTP_USER;
      const svc2 = new EmailService();
      expect(svc2['enabled']).toBe(false);

      // pass 缺
      process.env.SMTP_USER = 'u';
      delete process.env.SMTP_PASS;
      const svc3 = new EmailService();
      expect(svc3['enabled']).toBe(false);
    });

    it('未配置 SMTP → from 默认 noreply@research.local', () => {
      const svc = new EmailService();
      expect(svc['from']).toBe('noreply@research.local');
      expect(svc['enabled']).toBe(false);
    });
  });

  describe('sendMail', () => {
    it('未启用 → 返回 false(不调 sendMail)', async () => {
      const svc = new EmailService();
      const out = await svc.sendMail({
        to: 'a@b.com',
        subject: 's',
        html: '<p/>',
      });
      expect(out).toBe(false);
    });

    it('启用 + sendMail 成功 → true', async () => {
      const { service, sendMail } = buildWithSmtp();
      const out = await service.sendMail({
        to: 'a@b.com',
        subject: 'hi',
        html: '<p/>',
      });
      expect(out).toBe(true);
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'sender@test.com',
          to: 'a@b.com',
          subject: 'hi',
        }),
      );
    });

    it('to 为数组 → join(",")', async () => {
      const { service, sendMail } = buildWithSmtp();
      await service.sendMail({
        to: ['a@b.com', 'c@d.com'],
        subject: 's',
        html: 'h',
      });
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'a@b.com,c@d.com' }),
      );
    });

    it('sendMail reject → 返回 false', async () => {
      const { service } = buildWithSmtp();
      // 重新构造一个 sendMail 抛错的 transporter
      const errTransport = {
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP refused')),
      };
      nodemailer.createTransport.mockReturnValue(errTransport);
      service['transporter'] = errTransport as never;
      const out = await service.sendMail({
        to: 'a@b.com',
        subject: 's',
        html: 'h',
      });
      expect(out).toBe(false);
    });
  });

  describe('sendFeeAlert', () => {
    it('alertLevel 1-4 → 对应 levelText,带 amount', async () => {
      const { service, sendMail } = buildWithSmtp();
      await service.sendFeeAlert({
        to: 'a@b.com',
        feeName: '专利A',
        dueDate: '2026-07-01',
        alertLevel: 3,
        amount: 12000,
      });
      const call = sendMail.mock.calls[0][0] as {
        subject: string;
        html: string;
      };
      expect(call.subject).toContain('7天');
      expect(call.html).toContain('专利A');
      expect(call.html).toContain('¥12,000');
    });

    it('alertLevel 越界 → levelText 取空串', async () => {
      const { service, sendMail } = buildWithSmtp();
      await service.sendFeeAlert({
        to: 'a@b.com',
        feeName: 'X',
        dueDate: 'd',
        alertLevel: 9,
      });
      const call = sendMail.mock.calls[0][0] as { subject: string };
      // 越界 → levelText '',subject 形如 "...预警 - X"
      expect(call.subject).toContain('X');
    });

    it('无 amount → html 不含应缴金额行', async () => {
      const { service, sendMail } = buildWithSmtp();
      await service.sendFeeAlert({
        to: 'a@b.com',
        feeName: 'Y',
        dueDate: 'd',
        alertLevel: 4,
      });
      const html = (sendMail.mock.calls[0][0] as { html: string }).html;
      expect(html).not.toContain('应缴金额');
    });

    it('未启用 → sendFeeAlert 直接返回 false', async () => {
      const svc = new EmailService();
      const out = await svc.sendFeeAlert({
        to: 'a@b.com',
        feeName: 'Z',
        dueDate: 'd',
        alertLevel: 1,
      });
      expect(out).toBe(false);
    });
  });

  describe('sendReminderAlert', () => {
    it('启用 → 拼装申报提醒邮件并发送', async () => {
      const { service, sendMail } = buildWithSmtp();
      const out = await service.sendReminderAlert({
        to: 'a@b.com',
        title: '申报X',
        deadline: '2026-08-01',
        remindLevel: '紧急',
      });
      expect(out).toBe(true);
      const call = sendMail.mock.calls[0][0] as {
        subject: string;
        html: string;
      };
      expect(call.subject).toContain('紧急');
      expect(call.subject).toContain('申报X');
      expect(call.html).toContain('申报X');
      expect(call.html).toContain('2026-08-01');
    });

    it('未启用 → 返回 false', async () => {
      const svc = new EmailService();
      const out = await svc.sendReminderAlert({
        to: 'a@b.com',
        title: 't',
        deadline: 'd',
        remindLevel: 'low',
      });
      expect(out).toBe(false);
    });
  });
});
