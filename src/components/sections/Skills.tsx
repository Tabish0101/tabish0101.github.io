import { sectionMeta } from '@/content/sections';
import { skills } from '@/content/skills';
import { SectionHeader } from '../ui/SectionHeader';

/** 05 — technical range as a spec sheet: one row per layer, tags in mono. */
export function Skills() {
  const meta = sectionMeta('skills');

  return (
    <section id="skills" className="section" aria-labelledby="skills-title">
      <div className="column">
        <SectionHeader meta={meta} title="The stack, by layer." />

        <dl className="border-t border-border">
          {skills.map((group) => (
            <div
              key={group.name}
              className="grid gap-3 border-b border-border py-5 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-6"
              data-skill-group
            >
              <dt className="text-label text-ink-muted md:pt-1">{group.name}</dt>
              <dd>
                <ul className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <li key={item} className="tag skill-tag" data-tag>
                      {item}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
