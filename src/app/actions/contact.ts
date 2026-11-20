'use server';

import { render, toPlainText } from '@react-email/render';
import { headers } from 'next/headers';
import { createElement } from 'react';
import { Resend } from 'resend';
import { site } from '@/content/site';
import { ContactEmail } from '@/emails/ContactEmail';
import {
  CONTACT_LIMITS,
  type ContactField,
  type ContactState,
  type ContactValues,
} from '@/lib/contact';

const SENT = 'Message sent. Thank you.';
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_LIMIT = 3;
/** Humans take longer than this to fill three fields; most bots don't. */
const MIN_FILL_MS = 2500;

/**
 * Best-effort, per server instance. On Vercel each instance keeps its own window — enough
 * to stop a burst from one client. Use a shared store (e.g. Upstash) for a hard limit.
 */
const recent = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) {
    recent.set(key, hits);
    return true;
  }
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 5000) recent.clear();
  return false;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: ContactValues): Partial<Record<ContactField, string>> {
  const errors: Partial<Record<ContactField, string>> = {};
  if (!values.name) errors.name = 'Enter your name.';
  else if (values.name.length > CONTACT_LIMITS.name)
    errors.name = 'Keep the name under 100 characters.';
  if (!values.email) errors.email = 'Enter your email address.';
  else if (values.email.length > CONTACT_LIMITS.email || !EMAIL.test(values.email))
    errors.email = 'Enter an email address like name@example.com.';
  if (values.message.length < CONTACT_LIMITS.messageMin)
    errors.message = 'Write at least a sentence — 10 characters or more.';
  else if (values.message.length > CONTACT_LIMITS.message)
    errors.message = 'Keep the message under 5,000 characters.';
  return errors;
}

export async function sendContact(_previous: ContactState, form: FormData): Promise<ContactState> {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === 'string' ? value.trim() : '';
  };
  const values: ContactValues = {
    name: text('name'),
    email: text('email'),
    message: text('message'),
  };

  // Bots: a filled honeypot, or a form submitted faster than a person could. Pretend success.
  const started = Number(text('started'));
  if (text('company') || (started > 0 && Date.now() - started < MIN_FILL_MS)) {
    return { status: 'success', message: SENT };
  }

  const errors = validate(values);
  if (Object.keys(errors).length > 0) {
    return { status: 'error', message: 'Check the highlighted fields.', errors, values };
  }

  const client = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(client)) {
    return {
      status: 'error',
      message: `That’s a few messages in a row. Try again later, or email ${site.email}.`,
      values,
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error('contact: set RESEND_API_KEY, CONTACT_TO_EMAIL and CONTACT_FROM_EMAIL');
    return {
      status: 'error',
      message: `The form isn’t connected yet. Email ${site.email} instead.`,
      values,
    };
  }

  const email = createElement(ContactEmail, { ...values, sentAt: new Date().toISOString() });
  // One render; the plain-text part is derived from it (the preview line is skipped).
  const html = await render(email);
  const plain = toPlainText(html);
  const subject = `Portfolio — ${values.name.replace(/[\r\n]+/g, ' ').slice(0, 80)}`;

  const { error } = await new Resend(apiKey).emails.send({
    from,
    to,
    replyTo: values.email,
    subject,
    html,
    text: plain,
  });

  if (error) {
    console.error('contact: Resend rejected the message', error);
    return {
      status: 'error',
      message: `The message didn’t go through. Email ${site.email} instead.`,
      values,
    };
  }

  return { status: 'success', message: SENT };
}
