'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

type Status = 'idle' | 'copied' | 'failed';

/** Copies the address for people whose mail client isn't wired to mailto links. */
export function CopyEmail({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const id = window.setTimeout(() => setStatus('idle'), 2400);
    return () => window.clearTimeout(id);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="underline-draw text-label text-ink-muted transition-colors hover:text-ink"
        onClick={copy}
        data-magnetic
      >
        {status === 'copied' ? (
          <Check size={16} strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <Copy size={16} strokeWidth={1.5} aria-hidden="true" />
        )}
        Copy address
      </button>
      <p className="text-mono-label text-ink-muted" role="status">
        {status === 'copied'
          ? 'copied'
          : status === 'failed'
            ? 'copy failed — select the address'
            : ''}
      </p>
    </div>
  );
}
