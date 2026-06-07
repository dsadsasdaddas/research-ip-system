import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 465);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    this.from = process.env.SMTP_FROM || user || 'noreply@research.local';
    this.enabled = !!(host && user && pass);

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host, port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Email service enabled: ${user} → ${host}:${port}`);
    } else {
      this.logger.warn('SMTP 未配置（SMTP_HOST/SMTP_USER/SMTP_PASS），邮件通知已禁用');
    }
  }

  async sendMail(opts: MailOptions): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug(`[邮件模拟] to=${opts.to} subject=${opts.subject}`);
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: Array.isArray(opts.to) ? opts.to.join(',') : opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      this.logger.log(`邮件已发送: ${opts.subject} → ${opts.to}`);
      return true;
    } catch (err) {
      this.logger.error(`邮件发送失败: ${err.message}`);
      return false;
    }
  }

  /** 费用预警邮件模板 */
  async sendFeeAlert(opts: {
    to: string;
    feeName: string;
    dueDate: string;
    alertLevel: number;
    amount?: number;
  }) {
    const levelText = ['', '30天', '15天', '7天', '已逾期'][opts.alertLevel] || '';
    const subject = `【科研成果系统】知识产权年费${levelText}预警 - ${opts.feeName}`;
    const html = `
      <h3>知识产权费用预警通知</h3>
      <p><b>成果名称：</b>${opts.feeName}</p>
      <p><b>预警等级：</b><span style="color:red">${levelText}预警</span></p>
      <p><b>截止日期：</b>${opts.dueDate}</p>
      ${opts.amount ? `<p><b>应缴金额：</b>¥${Number(opts.amount).toLocaleString()}</p>` : ''}
      <p>请及时处理，避免逾期。</p>
      <hr><small>本邮件由科研成果管理系统自动发送，请勿直接回复。</small>
    `;
    return this.sendMail({ to: opts.to, subject, html });
  }

  /** 申报提醒邮件模板 */
  async sendReminderAlert(opts: {
    to: string;
    title: string;
    deadline: string;
    remindLevel: string;
  }) {
    const subject = `【科研成果系统】申报提醒（${opts.remindLevel}）- ${opts.title}`;
    const html = `
      <h3>申报事项提醒</h3>
      <p><b>事项：</b>${opts.title}</p>
      <p><b>紧急等级：</b>${opts.remindLevel}</p>
      <p><b>截止日期：</b>${opts.deadline}</p>
      <p>请及时确认并处理。</p>
      <hr><small>本邮件由科研成果管理系统自动发送，请勿直接回复。</small>
    `;
    return this.sendMail({ to: opts.to, subject, html });
  }
}
