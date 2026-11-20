import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { sections } from '@/content/sections';
import { MEDIA } from '@/lib/media';
import { sceneState } from '@/lib/scene-state';
import { NAV_OFFSET, scroller } from '@/lib/scroll';
import { playEntrance, setupHero } from './hero';
import { setupCursor, setupMagnetic, setupPreview } from './pointer';
import { setupReveals } from './reveals';
import { loadSplitText } from './split';

type Cleanup = () => void;

const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Lenis runs its frame loop on the GSAP ticker, so smooth scroll and ScrollTrigger read
 * the same scroll position on the same frame. Lag smoothing is off so neither waits.
 */
function setupLenis(): Cleanup {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
    autoRaf: false,
  });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => {
    lenis.raf(time * 1000);
    sceneState.velocity = lenis.velocity;
  };
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  scroller.attach(lenis);

  return () => {
    gsap.ticker.remove(tick);
    gsap.ticker.lagSmoothing(500, 33);
    scroller.detach(lenis);
    lenis.destroy();
    sceneState.velocity = 0;
  };
}

function focusSection(target: HTMLElement) {
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

/**
 * In-page links scroll through the shared controller (Lenis when it runs, native smooth
 * scroll otherwise), land below the fixed nav, update the URL and move focus to the section.
 */
function setupAnchors(): Cleanup {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
    if (!(link instanceof HTMLAnchorElement)) return;

    const hash = link.getAttribute('href') ?? '#';
    const id = decodeURIComponent(hash.slice(1));
    const toTop = id === '' || id === 'top';
    const target = toTop ? null : document.getElementById(id);
    if (!toTop && !target) return;

    event.preventDefault();
    history.pushState(null, '', toTop ? `${location.pathname}${location.search}` : hash);
    scroller.to(target ?? 0, {
      offset: target ? -NAV_OFFSET : 0,
      onComplete: () => {
        if (target) focusSection(target);
      },
    });
  };

  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}

/** The current section's number turns amber; a 1px rule under the bar tracks page progress. */
function setupNav() {
  const links = gsap.utils.toArray<HTMLElement>('[data-nav-link]');
  let current: string | null = null;

  const setActive = (id: string | null) => {
    if (id === current) return;
    current = id;
    for (const link of links) {
      const active = link.dataset.navLink === id;
      link.toggleAttribute('data-active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  };

  sections.forEach((section, i) => {
    const element = document.getElementById(section.id);
    if (!element) return;
    ScrollTrigger.create({
      trigger: element,
      start: 'top center',
      end: i === sections.length - 1 ? 'max' : 'bottom center',
      onToggle: (self) => {
        if (self.isActive) setActive(section.id);
        else if (current === section.id) setActive(null);
      },
    });
  });

  const bar = document.querySelector('[data-progress]');
  if (bar) {
    gsap.fromTo(
      bar,
      { scaleX: 0 },
      { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } },
    );
  }
}

/**
 * Trigger positions follow layout: refresh once late fonts land and whenever the page's
 * height changes (a project row opens, text reflows). ResizeObserver also reports once on
 * observe; that first report is the baseline, not a change.
 */
function setupRefresh(): Cleanup {
  let timer = 0;
  let height = -1;
  const refresh = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
  };
  if (document.fonts && document.fonts.status !== 'loaded') void document.fonts.ready.then(refresh);
  const observer = new ResizeObserver(([entry]) => {
    const next = entry.contentRect.height;
    if (height >= 0 && next !== height) refresh();
    height = next;
  });
  observer.observe(document.body);
  return () => {
    window.clearTimeout(timer);
    observer.disconnect();
  };
}

/**
 * Below-the-fold motion is built per section, a viewport before the section scrolls in, one
 * section per task: at load nothing further down is measured, split or hidden, and no single
 * task builds the whole page.
 */
function setupSectionReveals(context: gsap.Context, wide: boolean): Cleanup {
  const cleanups: Cleanup[] = [];
  const queue: HTMLElement[] = [];
  let timer = 0;
  let stopped = false;

  const next = () => {
    timer = 0;
    const section = queue.shift();
    if (!section) return;
    void loadSplitText().then((Split) => {
      if (stopped) return;
      context.add(() => {
        cleanups.push(setupReveals(section, { wide, context, Split }));
      });
      if (queue.length) timer = window.setTimeout(next, 0);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
        observer.unobserve(entry.target);
        queue.push(entry.target);
      }
      if (queue.length && !timer) timer = window.setTimeout(next, 0);
    },
    { rootMargin: '0px 0px 100% 0px' },
  );
  for (const section of document.querySelectorAll('main > section:not([data-hero])')) {
    observer.observe(section);
  }

  return () => {
    stopped = true;
    observer.disconnect();
    window.clearTimeout(timer);
    cleanups.forEach((cleanup) => cleanup());
  };
}

export function startMotion(): Cleanup {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const mm = gsap.matchMedia();
  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      fine: MEDIA.finePointer,
      wide: '(min-width: 48rem)',
    },
    (context) => {
      const { motion, fine, wide } = context.conditions as Record<
        'motion' | 'fine' | 'wide',
        boolean
      >;
      const cleanups: Cleanup[] = [];
      let cancelled = false;

      // Function, not decoration: anchors and the nav state run with reduced motion too.
      cleanups.push(setupAnchors());

      // One task per step, so none runs long. The hero goes first: its entrance is timed
      // to the loader's curtain.
      const steps: Array<() => unknown> = [];
      if (motion) {
        steps.push(() =>
          context.add(() => {
            if (fine) cleanups.push(setupLenis());
            setupHero({ wide });
          }),
        );
        steps.push(async () => {
          const Split = await loadSplitText();
          if (!cancelled) context.add(() => playEntrance(Split));
        });
      }
      steps.push(() => context.add(() => setupNav()));
      if (motion) {
        steps.push(() =>
          context.add(() => {
            cleanups.push(setupSectionReveals(context, wide));
          }),
        );
        if (fine) {
          steps.push(() =>
            context.add(() => {
              cleanups.push(setupCursor(), setupMagnetic(), setupPreview());
            }),
          );
        }
      }

      void (async () => {
        for (const step of steps) {
          await yieldToMain();
          if (cancelled) return;
          await step();
        }
      })();

      return () => {
        cancelled = true;
        cleanups.forEach((cleanup) => cleanup());
      };
    },
  );

  const stopRefresh = setupRefresh();
  return () => {
    stopRefresh();
    mm.revert();
  };
}
