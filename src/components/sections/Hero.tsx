import { ArrowDown } from 'lucide-react';
import { site } from '@/content/site';
import { zoneOffset } from '@/lib/time';
import { HeroCanvas } from '../hero/HeroCanvas';
import { LocalTime } from '../hero/LocalTime';
import { PortraitFallback } from '../hero/PortraitFallback';
import { HeroDust, TopologyFallback } from '../hero/TopologyFallback';

/**
 * The hero's visual. 'portrait' — the point-cloud portrait; 'topology' — the original
 * network polyhedron. Both stay complete: switching back is this one line.
 */
const HERO_VISUAL: 'portrait' | 'topology' = 'portrait';

/**
 * 01 — identity statement over the hero visual. The wrapper is taller than the viewport on
 * desktop so the hero holds (CSS sticky — no pin spacer, no layout shift) while the form
 * recedes; the motion layer scrubs that, and the copy, against scroll.
 */
export function Hero() {
  return (
    <section id="top" className="hero-wrap" data-hero aria-labelledby="hero-title">
      <div className="hero">
        <div className="hero-visual" aria-hidden="true">
          <HeroCanvas scene={HERO_VISUAL} />
          {/* CSS-only depth where WebGL doesn't run: two layers drifting at different rates. */}
          <div className="hero-fallback-layer" data-hero-fallback>
            <div className="absolute inset-0" data-parallax="0.35">
              <HeroDust />
            </div>
            <div className="absolute inset-0" data-parallax="0.15">
              {HERO_VISUAL === 'portrait' ? <PortraitFallback /> : <TopologyFallback />}
            </div>
          </div>
        </div>

        <div
          className="column relative flex h-full flex-col justify-between pt-24 pb-8 md:pb-12"
          data-hero-copy
        >
          <div className="flex items-start justify-between gap-6 text-ink-muted">
            <p className="flex items-center gap-3">
              <span className="text-mono-label tabular-nums" data-hero-number>
                01
              </span>
              <span className="text-mono-label" aria-hidden="true">
                /
              </span>
              <span className="text-label">Index</span>
            </p>
            <p className="hidden text-mono-label md:block">{site.coordinates}</p>
          </div>

          <div>
            <p className="text-mono-label text-ink-muted" data-hero-fade>
              {site.role} · {site.location}
            </p>
            <h1 id="hero-title" className="mt-4 text-display text-ink" data-hero-title>
              {site.name}
            </h1>
            <p className="mt-4 max-w-md text-body text-ink-muted" data-hero-fade>
              {site.positioning}
            </p>

            <div
              className="mt-12 flex flex-wrap items-end justify-between gap-x-6 gap-y-4"
              data-hero-fade
            >
              <a
                href="#work"
                className="underline-draw text-label text-ink"
                data-magnetic
                data-cursor="view"
              >
                See the work
                <ArrowDown size={16} strokeWidth={1.5} aria-hidden="true" />
              </a>
              <p className="flex items-center gap-2 text-mono-label text-ink-muted">
                <span>Local time</span>
                <LocalTime timeZone={site.timeZone} offset={zoneOffset(site.timeZone)} />
                <span>{site.timeZoneLabel}</span>
              </p>
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex"
          data-hero-cue
          aria-hidden="true"
        >
          <span className="text-mono-sm text-ink-muted">scroll</span>
          <span className="scroll-cue-track" />
        </div>
      </div>
    </section>
  );
}
