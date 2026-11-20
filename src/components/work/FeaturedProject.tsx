import type { Project } from '@/content/types';
import { ProjectNarrative, ProjectTags } from './ProjectDetail';

/**
 * The flagship case study, given prominence rather than an equal slot. On desktop the
 * identity column holds (CSS sticky — no pin spacer, no layout shift) while the narrative
 * scrolls past it.
 */
export function FeaturedProject({ project, index }: { project: Project; index: string }) {
  const titleId = `project-${project.slug}-title`;

  return (
    <article
      id={`project-${project.slug}`}
      aria-labelledby={titleId}
      className="border border-border bg-surface-200"
      data-reveal="card"
    >
      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="border-b border-border p-4 md:border-r md:border-b-0 md:p-6">
          <div className="flex flex-col gap-6 md:sticky md:top-24">
            <div className="flex items-baseline justify-between gap-4 text-ink-muted">
              <p className="flex items-baseline gap-3">
                <span className="text-mono-label tabular-nums">{index}</span>
                <span className="text-label">Flagship</span>
              </p>
              <p className="text-mono-label tabular-nums">{project.year}</p>
            </div>

            <h3 id={titleId} className="text-h1 text-ink">
              {project.name}
            </h3>
            <p className="text-body text-ink-muted">{project.summary}</p>
            <ProjectTags tags={project.tags} />

            {project.facts?.length ? (
              <dl className="border-t border-border">
                {project.facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex items-baseline justify-between gap-4 border-b border-border py-2"
                  >
                    <dt className="text-label text-ink-muted">{fact.label}</dt>
                    <dd className="text-right text-body-sm text-ink">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>

        <ProjectNarrative project={project} className="p-4 md:p-6" />
      </div>
    </article>
  );
}
