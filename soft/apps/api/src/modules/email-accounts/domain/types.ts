import type {
  EmailAccountStatus,
  EmailAuthKind,
  EmailTlsMode,
} from '@ai-sdr/contracts';

export type { EmailAccountStatus, EmailAuthKind, EmailTlsMode };

/** Public record — never carries a password, only its presence. */
export interface EmailAccountRecord {
  id: string;
  label: string;
  accountEmail: string;
  status: EmailAccountStatus;
  authKind: EmailAuthKind;
  provider: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpTlsMode: EmailTlsMode | null;
  smtpUsername: string | null;
  smtpPasswordConfigured: boolean;
  imapHost: string | null;
  imapPort: number | null;
  imapTlsMode: EmailTlsMode | null;
  imapUsername: string | null;
  imapPasswordConfigured: boolean;
  credentialsShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailAccountData {
  label: string;
  accountEmail: string;
  status?: EmailAccountStatus;
  authKind?: EmailAuthKind;
  provider?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpTlsMode?: EmailTlsMode | null;
  smtpUsername?: string | null;
  /** Encrypted ciphertext, or null. Plaintext never reaches the repository. */
  smtpPasswordCiphertext?: string | null;
  imapHost?: string | null;
  imapPort?: number | null;
  imapTlsMode?: EmailTlsMode | null;
  imapUsername?: string | null;
  imapPasswordCiphertext?: string | null;
  credentialsShared?: boolean;
}

export interface UpdateEmailAccountData {
  label?: string;
  accountEmail?: string;
  status?: EmailAccountStatus;
  authKind?: EmailAuthKind;
  provider?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpTlsMode?: EmailTlsMode | null;
  smtpUsername?: string | null;
  /** `undefined` preserves; a string replaces; `null` clears. */
  smtpPasswordCiphertext?: string | null;
  imapHost?: string | null;
  imapPort?: number | null;
  imapTlsMode?: EmailTlsMode | null;
  imapUsername?: string | null;
  imapPasswordCiphertext?: string | null;
  credentialsShared?: boolean;
}
