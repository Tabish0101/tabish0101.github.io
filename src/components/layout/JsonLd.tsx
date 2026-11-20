import { projects } from '@/content/projects';
import { site, socials } from '@/content/site';
import { skills } from '@/content/skills';

/** Links to a bare domain are placeholders, not profiles — keep them out of sameAs. */
function isProfile(href: string) {
  try {
    return new URL(href).pathname.replace(/\/+$/, '').length > 0;
  } catch {
    return false;
  }
}

/** schema.org Person + WebSite, and a CreativeWork per finished project. */
export function JsonLd() {
  const personId = `${site.url}/#person`;
  const sameAs = socials.map((s) => s.href).filter(isProfile);

  const graph = [
    {
      '@type': 'Person',
      '@id': personId,
      name: site.name,
      jobTitle: site.role,
      description: site.description,
      url: site.url,
      email: `mailto:${site.email}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: site.location,
        addressCountry: site.country,
      },
      knowsAbout: skills.flatMap((group) => group.items),
      ...(sameAs.length ? { sameAs } : {}),
    },
    {
      '@type': 'WebSite',
      '@id': `${site.url}/#website`,
      url: site.url,
      name: site.name,
      inLanguage: 'en',
      author: { '@id': personId },
    },
    ...projects
      .filter((project) => !project.draft)
      .map((project) => ({
        '@type': 'CreativeWork',
        '@id': `${site.url}/#${project.slug}`,
        name: project.name,
        description: project.summary,
        dateCreated: project.year,
        keywords: project.tags.join(', '),
        creator: { '@id': personId },
        ...(project.links?.[0] ? { url: project.links[0].href } : {}),
      })),
  ];

  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json.replace(/</g, '\\u003c') }}
    />
  );
}
