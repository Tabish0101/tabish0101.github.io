import { ArrowUpRight, Newspaper, PenLine } from 'lucide-react';
import { sectionMeta } from '@/content/sections';
import type { Article } from '@/content/types';
import { writing } from '@/content/writing';
import { BrandIcon } from '../ui/BrandIcon';
import { SectionHeader } from '../ui/SectionHeader';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function SourceIcon({ source }: { source: Article['source'] }) {
  if (source === 'LinkedIn') return <BrandIcon name="LinkedIn" size={16} />;
  const Icon = source === 'Medium' ? Newspaper : PenLine;
  return <Icon size={16} strokeWidth={1.5} aria-hidden="true" />;
}

/** Recent pieces, linking out. Rendered only when src/content/writing.ts has entries. */
export function Writing() {
  const meta = sectionMeta('writing');

  return (
    <section id="writing" className="section" aria-labelledby="writing-title">
      <div className="column">
        <SectionHeader meta={meta} title="Notes on building systems." />

        <ul className="border-t border-border">
          {writing.map((article) => (
            <li key={article.href} className="border-b border-border" data-reveal="card">
              <a
                href={article.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-2 py-5 transition-colors hover:bg-surface-200 md:grid-cols-[8rem_minmax(0,1fr)_auto] md:px-4"
                data-cursor="open"
              >
                <time
                  dateTime={article.date}
                  className="text-mono-label text-ink-muted tabular-nums"
                >
                  {dateFormat.format(new Date(article.date))}
                </time>
                <span className="col-span-full text-h3 text-ink transition-colors group-hover:text-accent md:col-span-1">
                  {article.title}
                </span>
                <span className="row-start-1 flex items-center gap-2 justify-self-end text-label text-ink-muted md:row-start-auto">
                  <SourceIcon source={article.source} />
                  {article.source}
                  <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
