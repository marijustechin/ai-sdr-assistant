import { Inject, Injectable } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { decryptSecret } from '../../../security/secret-box.js';
import { buildSmtpTransportOptions } from '../domain/mailbox-transport.js';
import { buildRawMime } from '../domain/mime.js';
import {
  MailTransportError,
  OutboundMailPort,
  type OutboundMailResult,
  type OutboundMailSpec,
  type OutboundMultipartResult,
  type OutboundMultipartSpec,
} from '../domain/messaging.js';
import { safeErrorCode } from '../domain/imap-diagnostics.js';
import { EmailAccountsRepository } from '../infrastructure/email-accounts.repository.js';

/**
 * SMTP implementation of `OutboundMailPort` for a password-authenticated
 * mailbox. It resolves the account, decrypts the SMTP password **inside this
 * boundary only**, submits exactly one message, and returns the preserved
 * Message-ID. The password never leaves this class. Failures are redacted to a
 * short safe code.
 */
@Injectable()
export class SmtpOutboundMailAdapter extends OutboundMailPort {
  constructor(
    @Inject(EmailAccountsRepository)
    private readonly repository: EmailAccountsRepository,
  ) {
    super();
  }

  async send(
    accountId: string,
    spec: OutboundMailSpec,
  ): Promise<OutboundMailResult> {
    const transporter = await this.connect(accountId);
    try {
      const info = await transporter.sendMail({
        from: spec.fromName
          ? { name: spec.fromName, address: spec.fromEmail }
          : spec.fromEmail,
        to: spec.to,
        ...(spec.replyToEmail ? { replyTo: spec.replyToEmail } : {}),
        subject: spec.subject,
        text: spec.text,
        messageId: spec.messageId,
      });
      return {
        messageId: spec.messageId,
        providerMessageId:
          typeof info.messageId === 'string' ? info.messageId : null,
      };
    } catch (error) {
      throw new MailTransportError(safeErrorCode(error));
    } finally {
      transporter.close();
    }
  }

  /**
   * Builds a raw multipart message once, submits it via SMTP, and returns the
   * exact same serialized bytes so the caller can append them to Sent.
   */
  async sendMultipart(
    accountId: string,
    spec: OutboundMultipartSpec,
  ): Promise<OutboundMultipartResult> {
    const raw = buildRawMime({
      fromName: spec.fromName,
      fromEmail: spec.fromEmail,
      replyToEmail: spec.replyToEmail,
      to: spec.to,
      subject: spec.subject,
      text: spec.text,
      html: spec.html,
      messageId: spec.messageId,
      date: spec.date,
      ...(spec.headers ? { headers: spec.headers } : {}),
    });
    const transporter = await this.connect(accountId);
    try {
      const info = await transporter.sendMail({
        envelope: { from: spec.fromEmail, to: spec.to },
        raw,
      });
      return {
        messageId: spec.messageId,
        providerMessageId:
          typeof info.messageId === 'string' ? info.messageId : null,
        raw,
      };
    } catch (error) {
      throw new MailTransportError(safeErrorCode(error));
    } finally {
      transporter.close();
    }
  }

  private async connect(accountId: string): Promise<Transporter> {
    const account = await this.repository.find(accountId);
    if (!account) throw new MailTransportError('email_account_not_found');
    if (account.status !== 'ACTIVE') {
      throw new MailTransportError('email_account_disabled');
    }

    const secrets = await this.repository.findPasswordCiphertexts(accountId);
    const ciphertext = secrets?.smtpPasswordCiphertext ?? null;
    if (!ciphertext) {
      throw new MailTransportError('mailbox_credentials_missing');
    }
    let credential: string;
    try {
      credential = decryptSecret(ciphertext);
    } catch {
      throw new MailTransportError('secret_decryption_failed');
    }

    let options;
    try {
      options = buildSmtpTransportOptions(account, { password: credential });
    } catch {
      throw new MailTransportError('smtp_not_configured');
    }
    return createTransport(
      options as unknown as Parameters<typeof createTransport>[0],
    );
  }
}
