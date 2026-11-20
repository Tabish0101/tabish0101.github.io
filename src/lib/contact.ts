/** Shared by the contact form (client) and its Server Action. Types and constants only. */

export type ContactField = 'name' | 'email' | 'message';

export type ContactValues = Record<ContactField, string>;

export interface ContactState {
  status: 'idle' | 'success' | 'error';
  message?: string;
  errors?: Partial<Record<ContactField, string>>;
  /** Echoed back on error so the form keeps what was typed. */
  values?: ContactValues;
}

export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  messageMin: 10,
  message: 5000,
} as const;
