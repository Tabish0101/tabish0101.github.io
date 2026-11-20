import { sections } from '@/content/sections';
import { site } from '@/content/site';
import { MobileMenu } from './MobileMenu';
import { ThemeToggle } from './ThemeToggle';

/**
 * 00 — fixed top bar. Section numbers in mono-label beside labels; the current section's
 * number turns amber (set by the motion layer), and a 1px amber rule tracks page progress.
 */
export function Nav() {
  const links = sections.filter((s) => s.id !== 'contact');

  return (
    <header className="site-nav fixed inset-x-0 top-0 z-50 border-b border-border bg-surface-100">
      <nav aria-label="Primary" className="column flex h-16 items-center justify-between gap-6">
        <a
          href="#top"
          className="inline-block py-2 text-label text-ink"
          aria-label={`${site.name} — back to top`}
          data-magnetic
        >
          {site.name}
        </a>

        <ul className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className="group flex items-baseline gap-2 py-2"
                data-nav-link={link.id}
                data-magnetic
              >
                <span className="text-mono-label text-ink-muted tabular-nums transition-colors group-data-active:text-accent-ink">
                  {link.number}
                </span>
                <span className="text-label text-ink-muted transition-colors group-hover:text-ink group-data-active:text-ink">
                  {link.label}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="#contact"
            className="btn btn-outline hidden data-active:border-accent data-active:text-accent-ink md:inline-flex"
            data-nav-link="contact"
            data-magnetic
          >
            Contact
          </a>
          <MobileMenu links={sections} email={site.email} />
        </div>
      </nav>
      <div
        className="nav-progress absolute inset-x-0 -bottom-px h-px bg-accent"
        data-progress
        aria-hidden="true"
      />
    </header>
  );
}
