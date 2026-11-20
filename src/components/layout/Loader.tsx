import type { CSSProperties } from 'react';
import { site } from '@/content/site';

/**
 * First impression, once per session. Pure CSS: it starts at first paint, never waits on
 * JavaScript, and is gone at 2.45s. The hero underneath is already painted, so the
 * curtain costs nothing in LCP. Skipped for reduced motion and repeat visits (see head-script).
 */
export function Loader() {
  let index = 0;
  const words = site.name
    .split(' ')
    .map((word) => Array.from(word).map((char) => ({ char, index: index++ })));

  return (
    <div className="loader" data-loader aria-hidden="true">
      <div className="column flex h-full flex-col justify-between py-6">
        <div className="flex items-center justify-between text-mono-sm text-ink-muted">
          <span>tenebris / index</span>
          <span>
            {site.location.toLowerCase()} · {site.timeZoneLabel.toLowerCase()}
          </span>
        </div>

        <p className="text-h1 text-ink">
          {words.map((chars, w) => (
            <span key={w}>
              <span className="loader-word">
                {chars.map(({ char, index: i }) => (
                  <span key={i} className="loader-char" style={{ '--i': i } as CSSProperties}>
                    {char}
                  </span>
                ))}
              </span>
              {w < words.length - 1 ? ' ' : null}
            </span>
          ))}
        </p>

        <div>
          <div className="h-px w-full bg-border">
            <div className="loader-fill h-px w-full bg-accent" />
          </div>
          <div className="mt-3 flex items-center justify-between text-mono-label text-ink-muted">
            <span className="loader-count tabular-nums" />
            <span>{site.coordinates}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
