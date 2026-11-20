import { experience } from '@/content/experience';
import { sectionMeta } from '@/content/sections';
import { cn } from '@/lib/cn';
import { SectionHeader } from '../ui/SectionHeader';

/**
 * 04 — career timeline, latest first. Entries alternate either side of a hairline on
 * desktop and stack along it on phones; an amber rule draws down the line with scroll.
 */
export function Experience() {
  const meta = sectionMeta('experience');

  return (
    <section id="experience" className="section" aria-labelledby="experience-title">
      <div className="column">
        <SectionHeader meta={meta} title="Where the work happened." />

        <div className="relative" data-timeline>
          <div
            className="absolute top-0 bottom-0 left-[3px] w-px bg-border md:left-1/2"
            aria-hidden="true"
          >
            <div className="timeline-progress absolute inset-0 bg-accent" data-timeline-progress />
          </div>

          <ol className="flex flex-col gap-12">
            {experience.map((entry, i) => {
              const side = i % 2 === 0 ? 'left' : 'right';
              return (
                <li
                  key={`${entry.company}-${entry.start}`}
                  className="relative pl-8 md:grid md:grid-cols-2 md:gap-16 md:pl-0"
                  data-timeline-item={side}
                >
                  <span
                    className="absolute top-1.5 left-0 size-[7px] border border-ink-muted bg-surface-100 md:left-1/2 md:-translate-x-1/2"
                    aria-hidden="true"
                  />
                  <div
                    className={cn(
                      'flex flex-col gap-2',
                      side === 'left'
                        ? 'md:col-start-1 md:items-end md:text-right'
                        : 'md:col-start-2',
                    )}
                  >
                    <p className="text-mono-label text-ink-muted tabular-nums">
                      <time dateTime={entry.start}>{entry.start}</time>
                      {' — '}
                      {entry.end ? <time dateTime={entry.end}>{entry.end}</time> : 'now'}
                    </p>
                    <h3 className="text-h3 text-ink">{entry.role}</h3>
                    <p className="text-label text-ink-muted">
                      {entry.company}
                      {entry.location ? ` · ${entry.location}` : null}
                    </p>
                    <p className="mt-1 max-w-[46ch] text-body text-ink-muted">{entry.summary}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
