import { about } from '@/content/site';
import { experience } from '@/content/experience';
import { projects } from '@/content/projects';
import { sectionMeta } from '@/content/sections';
import { skills } from '@/content/skills';
import { SectionHeader } from '../ui/SectionHeader';

/** Stats are derived from the content files, never typed by hand, so they can't drift. */
function stats() {
  const firstYear = Math.min(...experience.map((role) => Number(role.start)));
  const tools = new Set(skills.flatMap((group) => group.items));
  return [
    { value: new Date().getFullYear() - firstYear, label: 'years building software' },
    { value: projects.length, label: 'selected projects' },
    { value: tools.size, label: 'tools in the stack' },
  ];
}

/** 02 — who, what, where. Paragraphs, a quick-facts panel, and three numbers. No biography. */
export function About() {
  const meta = sectionMeta('about');

  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <div className="column">
        <SectionHeader meta={meta} title={about.title} />

        <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_17rem] md:gap-16">
          <div className="flex max-w-[62ch] flex-col gap-6">
            {about.paragraphs.map((paragraph, i) => (
              <p key={i} className="text-body text-ink" data-reveal>
                {paragraph}
              </p>
            ))}
          </div>

          <aside
            aria-label="Quick facts"
            className="self-start border border-border bg-surface-200 p-4"
            data-reveal="card"
          >
            <dl className="flex flex-col">
              {about.facts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex flex-col gap-1 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <dt className="text-label text-ink-muted">{fact.label}</dt>
                  <dd className="text-body-sm text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        <dl className="mt-16 grid grid-cols-3 border-t border-border">
          {stats().map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col-reverse justify-end gap-2 pt-6 ${i > 0 ? 'border-l border-border pl-4 md:pl-6' : 'pr-4'}`}
              data-reveal
            >
              <dt className="text-mono-label text-ink-muted">{stat.label}</dt>
              <dd className="text-display text-ink tabular-nums" data-count={stat.value}>
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
