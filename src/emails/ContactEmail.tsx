import { Fragment } from 'react';

export interface ContactEmailProps {
  name: string;
  email: string;
  message: string;
  /** ISO timestamp. */
  sentAt: string;
}

/*
 * Tenebris, light theme: mail clients invert or strip dark backgrounds unpredictably,
 * so the message is set as parchment and umber with the amber accent on the reply link.
 * Plain table markup with inline styles — what email clients render reliably — rendered
 * to HTML and plain text by @react-email/render.
 */
const color = {
  ground: '#F5F0E8',
  card: '#EDE7DC',
  ink: '#1A1611',
  muted: '#6B6358',
  border: '#C8BDA8',
  accent: '#9A6714',
};
const sans = '"Space Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const mono = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** Inbox clients show ~150 characters after the subject; pad so body text doesn't follow. */
const PREVIEW_LENGTH = 150;
const PREVIEW_PAD = ' ‌​‍‎‏﻿';

function Preview({ text }: { text: string }) {
  const preview = text.slice(0, PREVIEW_LENGTH);
  return (
    <div
      data-skip-in-text="true"
      style={{
        display: 'none',
        overflow: 'hidden',
        lineHeight: '1px',
        opacity: 0,
        maxHeight: 0,
        maxWidth: 0,
      }}
    >
      {preview}
      <div>{PREVIEW_PAD.repeat(Math.ceil((PREVIEW_LENGTH - preview.length) / 7))}</div>
    </div>
  );
}

const rule = { margin: '20px 0', border: 'none', borderTop: `1px solid ${color.border}` };

export function ContactEmail({ name, email, message, sentAt }: ContactEmailProps) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="x-apple-disable-message-reformatting" />
      </head>
      <body
        style={{ margin: 0, padding: '32px 16px', backgroundColor: color.ground, fontFamily: sans }}
      >
        <Preview text={`${name}: ${message}`} />
        <table
          role="presentation"
          align="center"
          width="100%"
          border={0}
          cellPadding={0}
          cellSpacing={0}
          style={{
            maxWidth: 560,
            backgroundColor: color.card,
            border: `1px solid ${color.border}`,
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: 24 }}>
                <p style={{ margin: 0, fontFamily: mono, fontSize: 13, color: color.muted }}>
                  tabishjeelani.com / contact
                </p>
                <h1
                  style={{
                    margin: '16px 0 4px',
                    fontSize: 24,
                    lineHeight: '28px',
                    fontWeight: 600,
                    color: color.ink,
                  }}
                >
                  {name}
                </h1>
                <p style={{ margin: 0, fontSize: 14, lineHeight: '20px', color: color.muted }}>
                  <a href={`mailto:${email}`} style={{ color: color.accent }}>
                    {email}
                  </a>
                  {` · ${sentAt.replace('T', ' ').slice(0, 16)} UTC`}
                </p>
                <hr style={rule} />
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    lineHeight: '24px',
                    color: color.ink,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {/* <br> rather than raw newlines, so the plain-text part keeps the lines too. */}
                  {message.split(/\r?\n/).map((line, i) => (
                    <Fragment key={i}>
                      {i > 0 ? <br /> : null}
                      {line}
                    </Fragment>
                  ))}
                </p>
                <hr style={rule} />
                <p style={{ margin: 0, fontFamily: mono, fontSize: 11, color: color.muted }}>
                  Reply to this email to answer {name} directly.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export default ContactEmail;
