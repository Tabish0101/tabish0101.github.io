'use client';

import { ArrowRight } from 'lucide-react';
import { useActionState, useEffect, useRef } from 'react';
import { sendContact } from '@/app/actions/contact';
import { CONTACT_LIMITS, type ContactField, type ContactState } from '@/lib/contact';

const initialState: ContactState = { status: 'idle' };
const FIELDS: ContactField[] = ['name', 'email', 'message'];

interface FieldProps {
  name: ContactField;
  label: string;
  error?: string;
  defaultValue?: string;
  type?: 'text' | 'email';
  autoComplete?: string;
  maxLength: number;
  multiline?: boolean;
}

function Field({
  name,
  label,
  error,
  defaultValue,
  type = 'text',
  autoComplete,
  maxLength,
  multiline,
}: FieldProps) {
  const id = `contact-${name}`;
  const errorId = `${id}-error`;
  const props = {
    id,
    name,
    defaultValue,
    maxLength,
    autoComplete,
    required: true,
    className: 'field',
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label text-ink-muted">
        {label}
      </label>
      {multiline ? <textarea {...props} rows={5} /> : <input {...props} type={type} />}
      {error ? (
        // Danger fails text contrast on surface-200, so the marker carries the color and the words stay ink.
        <p id={errorId} className="flex items-center gap-2 text-body-sm text-ink">
          <span className="size-2 shrink-0 bg-danger" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Delivered by a Server Action through Resend. Works without JavaScript too: the form
 * posts and the page re-renders with the result. On error the typed values come back and
 * focus moves to the first field that needs attention.
 */
export function ContactForm() {
  const [state, action, pending] = useActionState(sendContact, initialState);
  const form = useRef<HTMLFormElement>(null);
  const started = useRef<HTMLInputElement>(null);

  // Re-stamped on first focus after a reset, since a successful send clears the form.
  const stamp = () => {
    if (started.current && !started.current.value) started.current.value = String(Date.now());
  };

  useEffect(() => {
    if (started.current) started.current.value = String(Date.now());
  }, []);

  useEffect(() => {
    const invalid = FIELDS.find((field) => state.errors?.[field]);
    if (!invalid) return;
    const element = form.current?.elements.namedItem(invalid);
    if (element instanceof HTMLElement) element.focus();
  }, [state]);

  return (
    <form
      ref={form}
      action={action}
      noValidate
      aria-labelledby="contact-form-title"
      className="relative flex flex-col gap-5 border border-border bg-surface-200 p-4 md:p-6"
      onFocusCapture={stamp}
      data-reveal="card"
    >
      <h3 id="contact-form-title" className="text-label text-ink">
        Send a message
      </h3>

      <Field
        name="name"
        label="Name"
        autoComplete="name"
        maxLength={CONTACT_LIMITS.name}
        error={state.errors?.name}
        defaultValue={state.values?.name}
      />
      <Field
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        maxLength={CONTACT_LIMITS.email}
        error={state.errors?.email}
        defaultValue={state.values?.email}
      />
      <Field
        name="message"
        label="Message"
        multiline
        maxLength={CONTACT_LIMITS.message}
        error={state.errors?.message}
        defaultValue={state.values?.message}
      />

      {/* Spam traps: a field people never see, and the time the form was first touched. */}
      <div className="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={started} type="hidden" name="started" defaultValue="" />

      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <p role="status" className={state.status === 'idle' ? 'sr-only' : 'text-body-sm text-ink'}>
          {state.message ?? ''}
        </p>
        <button
          type="submit"
          className="btn btn-primary ml-auto"
          disabled={pending}
          data-magnetic
          data-cursor="send"
        >
          {pending ? 'Sending' : 'Send message'}
          <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
