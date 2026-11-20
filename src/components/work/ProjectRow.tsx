'use client';

import { Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface ProjectRowProps {
  slug: string;
  index: string;
  name: string;
  year: string;
  /** Present when the project has a screenshot: enables the hover preview. */
  preview?: boolean;
  /** Summary and tags, always visible. */
  summary: ReactNode;
  /** The detail view, revealed on expand. */
  children: ReactNode;
}

/**
 * One project as a disclosure row. The whole header is the hit area (a stretched button),
 * the heading keeps only the name, and the collapsed panel is inert so its links stay out
 * of the tab order.
 */
export function ProjectRow({
  slug,
  index,
  name,
  year,
  preview,
  summary,
  children,
}: ProjectRowProps) {
  const [open, setOpen] = useState(false);
  const buttonId = `project-${slug}-button`;
  const panelId = `project-${slug}-panel`;

  return (
    <li id={`project-${slug}`} className="border-b border-border" data-reveal="card">
      <div
        className="project-row relative grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 px-0 py-6 transition-colors md:grid-cols-[4rem_minmax(0,1fr)_6rem_auto] md:px-4"
        data-preview={preview ? slug : undefined}
      >
        <span className="text-mono-label text-ink-muted tabular-nums" aria-hidden="true">
          {index}
        </span>
        <h3 className="text-h3 text-ink">
          <button
            id={buttonId}
            type="button"
            className="project-row-button text-left"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            data-cursor={open ? 'close' : 'view'}
          >
            {name}
          </button>
        </h3>
        <span className="hidden text-mono-label text-ink-muted tabular-nums md:block">{year}</span>
        <Plus
          className="disclosure-icon self-center text-ink-muted"
          size={20}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <div className="col-start-2 col-end-[-1] mt-2 flex flex-col gap-4 md:col-end-[-2]">
          {summary}
        </div>
      </div>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="disclosure"
        data-open={open}
      >
        <div inert={!open}>{children}</div>
      </div>
    </li>
  );
}
