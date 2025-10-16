import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface OrderEmailPayload {
  to: string;
  orderId: string;
  downloadLinks?: string[];
}

@Injectable()
export class EmailsService {
  private readonly resend?: Resend;
  private readonly fromEmail: string;
  private readonly logger = new Logger(EmailsService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('email.apiKey');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
    this.fromEmail = 'Beatmakerz <no-reply@beatmakerz.com>';
  }

  async sendOrderConfirmation(payload: OrderEmailPayload) {
    if (!this.resend) {
      this.logger.warn('Resend API key not configured. Skipping order confirmation email.');
      return;
    }
    await this.resend.emails.send({
      from: this.fromEmail,
      to: payload.to,
      subject: `Order ${payload.orderId} confirmed`,
      html: this.renderOrderConfirmation(payload),
    });
  }

  async sendDownloadLinksEmail(payload: OrderEmailPayload) {
    if (!this.resend) {
      this.logger.warn('Resend API key not configured. Skipping download email.');
      return;
    }
    await this.resend.emails.send({
      from: this.fromEmail,
      to: payload.to,
      subject: `Your Beatmakerz downloads for order ${payload.orderId}`,
      html: this.renderDownloads(payload),
    });
  }

  private renderOrderConfirmation(payload: OrderEmailPayload) {
    return `
      <h1>Merci pour votre commande</h1>
      <p>Votre commande <strong>${payload.orderId}</strong> est confirmée.</p>
      <p>Vous recevrez vos liens de téléchargement dès que le paiement est traité.</p>
    `;
  }

  private renderDownloads(payload: OrderEmailPayload) {
    const links =
      payload.downloadLinks?.map(
        (link) => `<li><a href="${link}" target="_blank" rel="noreferrer">Télécharger</a></li>`,
      ) ?? [];
    return `
      <h1>Vos téléchargements sont prêts</h1>
      <p>Commande: <strong>${payload.orderId}</strong></p>
      <ul>${links.join('')}</ul>
      <p>Les liens expirent dans 10 minutes. N'hésitez pas à générer de nouveaux liens depuis votre espace client si nécessaire.</p>
    `;
  }
}
