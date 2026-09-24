import { Inject, Injectable } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { decryptSecret } from '../../../security/secret-box.js';
import { buildSmtpTransportOptions } from '../domain/mailbox-transport.js';
import {
  MailTransportError,
  OutboundMailPort,
  type OutboundMailResult,
  type OutboundMailSpec,
} from '../domain/messaging.js';
import { safeErrorCode } from '../domain/imap-diagnostics.js';
import { EmailAccountsRepository } from '../infrastructure/email-accounts.repository.js';

/**
 * SMTP implementation of `OutboundMailPort` for a password-authenticated
 * mailbox. It resolves the account, decrypts the Smtp password **inside this
 * boundary only**, sends exactly one message, and returns the preserved
 * Message-ID. The password never leaves this method. Failures are redacted to a
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

    const transporter = createTransport(
      options as unknown as Parameters<typeof createTransport>[0],
    );
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
}
