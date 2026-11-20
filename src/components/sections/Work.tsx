import Image from 'next/image';
import { featuredProject, otherProjects, projects } from '@/content/projects';
import { sectionMeta } from '@/content/sections';
import { FeaturedProject } from '../work/FeaturedProject';
import { ProjectNarrative, ProjectTags } from '../work/ProjectDetail';
import { ProjectRow } from '../work/ProjectRow';
import { SectionHeader } from '../ui/SectionHeader';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 03 — projects that prove the claim. One flagship with the full case study, then the
 * rest as rows that expand in place. Hierarchy, not a grid of equal cards.
 */
export function Work() {
  const meta = sectionMeta('work');
  const withImages = projects.filter((p) => p.image);

  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <div className="column">
        <SectionHeader meta={meta} title="Selected work." />

        <FeaturedProject project={featuredProject} index={pad(1)} />

        {otherProjects.length ? (
          <ol className="mt-16 border-t border-border" aria-label="More projects">
            {otherProjects.map((project, i) => (
              <ProjectRow
                key={project.slug}
                slug={project.slug}
                index={pad(i + 2)}
                name={project.name}
                year={project.year}
                preview={Boolean(project.image)}
                summary={
                  <>
                    <p className="text-body text-ink-muted">{project.summary}</p>
                    <ProjectTags tags={project.tags} />
                  </>
                }
              >
                <ProjectNarrative
                  project={project}
                  className="pt-2 pb-8 pl-[3.5rem] md:pr-4 md:pl-[6rem]"
                />
              </ProjectRow>
            ))}
          </ol>
        ) : null}
      </div>

      {/* Cursor-following screenshot for rows on desktop. Rendered only once there are images. */}
      {withImages.length ? (
        <div className="work-preview" data-work-preview aria-hidden="true">
          {withImages.map((project) =>
            project.image ? (
              <Image
                key={project.slug}
                src={project.image.src}
                alt=""
                fill
                sizes="18rem"
                className="work-image object-cover opacity-0"
                data-preview-image={project.slug}
              />
            ) : null,
          )}
        </div>
      ) : null}
    </section>
  );
}
