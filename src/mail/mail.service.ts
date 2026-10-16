import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Resend } from 'resend';
import appConfig from '../config/app.config.js';
import {
  type InviteTemplateData,
  inviteHtml,
  inviteSubject,
  inviteText,
} from './templates/invite.template.js';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend?: Resend;

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {
    if (config.resendApiKey) this.resend = new Resend(config.resendApiKey);
  }

  /** Envia o convite. Nunca lança: devolve `false` se o e-mail não saiu. */
  async sendInvite(
    to: string,
    data: Omit<InviteTemplateData, 'link'> & { token: string },
  ): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY não configurada: e-mail não enviado.');
      return false;
    }

    const link = `${this.config.appUrl}/invite/accept?token=${data.token}`;
    const template = { ...data, link };

    try {
      const { error } = await this.resend.emails.send({
        from: this.config.mailFrom,
        to,
        subject: inviteSubject(data.clinicName),
        html: inviteHtml(template),
        text: inviteText(template),
      });
      if (error) {
        this.logger.error(`Resend recusou o e-mail: ${error.message}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error('Falha ao enviar e-mail pelo Resend', error);
      return false;
    }
  }
}
