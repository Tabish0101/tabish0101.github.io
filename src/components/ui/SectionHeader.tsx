import type { SectionMeta } from '@/content/sections';

interface SectionHeaderProps {
  meta: SectionMeta;
  title: string;
}

/** `02 / ABOUT` in mono-label, then the section heading. The number decodes on scroll. */
export function SectionHeader({ meta, title }: SectionHeaderProps) {
  return (
    <header className="mb-12 flex flex-col gap-4 md:mb-16">
      <p className="flex items-center gap-3 text-ink-muted">
        <span className="text-mono-label tabular-nums" data-scramble>
          {meta.number}
        </span>
        <span className="text-mono-label" aria-hidden="true">
          /
        </span>
        <span className="text-label">{meta.label}</span>
      </p>
      <h2 id={`${meta.id}-title`} className="max-w-[20ch] text-h1 text-ink" data-split="words">
        {title}
      </h2>
    </header>
  );
}
