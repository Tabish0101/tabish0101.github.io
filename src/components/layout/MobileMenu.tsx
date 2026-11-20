'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SectionMeta } from '@/content/sections';
import { socials } from '@/content/site';
import { MEDIA } from '@/lib/media';
import { scroller } from '@/lib/scroll';
import { BrandIcon } from '../ui/BrandIcon';

interface MobileMenuProps {
  links: SectionMeta[];
  email: string;
}

/**
 * Full-screen overlay below the bar. While open, the page behind is inert (focus stays in
 * the header) and scrolling is locked. Links reveal in a stagger; Escape closes.
 */
export function MobileMenu({ links, email }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const release = useRef<(() => void) | null>(null);

  /**
   * Releases the lock synchronously: a link click must unlock scrolling before the anchor
   * handler (which runs later in the same click) asks for the scroll.
   */
  const close = useCallback((restoreFocus: boolean) => {
    release.current?.();
    setOpen(false);
    if (restoreFocus) button.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const background = ['main', 'footer']
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    background.forEach((el) => el.setAttribute('inert', ''));
    scroller.lock();

    let released = false;
    const releaseNow = () => {
      if (released) return;
      released = true;
      background.forEach((el) => el.removeAttribute('inert'));
      scroller.unlock();
    };
    release.current = releaseNow;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    const desktop = window.matchMedia('(min-width: 48rem)');
    const onBreakpoint = () => {
      if (desktop.matches) close(false);
    };
    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onBreakpoint);

    panel.current?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });

    let cancelled = false;
    let revert: (() => void) | undefined;
    if (panel.current && !window.matchMedia(MEDIA.reducedMotion).matches) {
      const items = panel.current.querySelectorAll('[data-menu-item]');
      import('gsap').then(({ gsap }) => {
        if (cancelled) return;
        const tween = gsap.fromTo(
          items,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.06 },
        );
        revert = () => tween.revert();
      });
    }

    return () => {
      cancelled = true;
      revert?.();
      releaseNow();
      release.current = null;
      document.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onBreakpoint);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className="icon-btn text-ink md:hidden"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        <span className="menu-icon" aria-hidden="true" />
      </button>

      <div
        id="mobile-menu"
        ref={panel}
        hidden={!open}
        className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-surface-100 md:hidden"
        data-lenis-prevent
      >
        <div className="column flex min-h-full flex-col justify-between gap-12 py-8">
          <nav aria-label="Sections">
            <ol className="flex flex-col">
              {links.map((link) => (
                <li key={link.id} data-menu-item className="border-b border-border">
                  <a
                    href={`#${link.id}`}
                    className="flex items-baseline gap-4 py-4"
                    data-nav-link={link.id}
                    onClick={() => close(false)}
                  >
                    <span className="text-mono-label text-ink-muted tabular-nums">
                      {link.number}
                    </span>
                    <span className="text-h2 text-ink">{link.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div data-menu-item className="flex flex-col gap-4">
            <a href={`mailto:${email}`} className="link text-body">
              {email}
            </a>
            <ul className="-mx-2 flex items-center">
              {socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    className="icon-btn"
                    target="_blank"
                    rel="me noopener noreferrer"
                    aria-label={`${social.label} (opens in a new tab)`}
                  >
                    <BrandIcon name={social.label} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
