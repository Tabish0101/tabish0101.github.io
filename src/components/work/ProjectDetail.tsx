import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import type { Project } from '@/content/types';
import { cn } from '@/lib/cn';

const NARRATIVE = [
  ['Problem', 'problem'],
  ['Approach', 'approach'],
  ['Outcome', 'outcome'],
] as const;

/** Problem → approach → outcome, the stack, and the links out. Shared by the flagship and the rows. */
export function ProjectNarrative({ project, className }: { project: Project; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {project.image ? (
        <figure className="overflow-hidden border border-border bg-surface-300" data-curtain>
          <Image
            src={project.image.src}
            alt={project.image.alt}
            width={project.image.width}
            height={project.image.height}
            sizes="(min-width: 768px) 560px, 100vw"
            className="work-image h-auto w-full"
          />
        </figure>
      ) : null}

      {NARRATIVE.map(([label, key], i) => (
        <div key={key} className="flex flex-col gap-2" data-reveal>
          <h4 className="flex items-baseline gap-3 text-ink-muted">
            <span className="text-mono-label tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-label">{label}</span>
          </h4>
          <p className="text-body text-ink">{project[key]}</p>
        </div>
      ))}

      <ProjectLinks project={project} />
    </div>
  );
}

export function ProjectTags({ tags, className }: { tags: string[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-2', className)} aria-label="Stack">
      {tags.map((tag) => (
        <li key={tag} className="tag">
          {tag}
        </li>
      ))}
    </ul>
  );
}

export function ProjectLinks({ project }: { project: Project }) {
  if (!project.links?.length) return null;
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2">
      {project.links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            className="underline-draw text-label text-ink"
            target="_blank"
            rel="noopener noreferrer"
            data-magnetic
            data-cursor="open"
          >
            {link.label}
            <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
