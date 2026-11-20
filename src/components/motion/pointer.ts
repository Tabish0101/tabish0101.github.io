import { gsap } from 'gsap';

type Cleanup = () => void;

const INTERACTIVE = 'a[href], button, label, summary, [role="button"], [data-cursor]';
const TEXT_ENTRY =
  'input:not([type="checkbox"], [type="radio"], [type="submit"], [type="button"]), textarea, select, [contenteditable="true"]';

/**
 * Dual cursor: an 8px amber dot that tracks exactly, and a 32px ink-muted ring that
 * follows with a short lerp. Over interactive elements the ring grows to 48px, fills with
 * accent-soft and shows the element's data-cursor label. Text fields keep the native caret.
 * Position is written as transforms only, on the GSAP ticker (one rAF loop).
 */
export function setupCursor(): Cleanup {
  const root = document.documentElement;

  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');
  const shape = document.createElement('span');
  shape.className = 'cursor-ring-shape';
  const label = document.createElement('span');
  label.className = 'cursor-ring-label';
  ring.append(shape, label);

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(ring, dot);

  const dotX = gsap.quickSetter(dot, 'x', 'px');
  const dotY = gsap.quickSetter(dot, 'y', 'px');
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' });

  let shown = false;
  let hovered: Element | null = null;

  const describe = (target: Element | null) => {
    hovered = target;
    const text = target?.closest(TEXT_ENTRY);
    ring.classList.toggle('is-text', Boolean(text));
    dot.classList.toggle('is-text', Boolean(text));

    const interactive = text ? null : target?.closest<HTMLElement>(INTERACTIVE);
    const disabled = interactive?.matches(':disabled, [aria-disabled="true"]') ?? false;
    const word =
      interactive && !disabled
        ? (interactive.dataset.cursor ??
          (interactive instanceof HTMLAnchorElement && interactive.target === '_blank'
            ? 'open'
            : ''))
        : '';
    label.textContent = word;
    ring.classList.toggle('is-hover', Boolean(interactive) && !disabled);
    ring.classList.toggle('has-label', word !== '');
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    if (!shown) {
      shown = true;
      gsap.set(ring, { x: event.clientX, y: event.clientY });
      root.classList.add('has-cursor', 'cursor-visible');
    }
    dotX(event.clientX);
    dotY(event.clientY);
    ringX(event.clientX);
    ringY(event.clientY);
  };

  const onOver = (event: PointerEvent) => {
    describe(event.target instanceof Element ? event.target : null);
  };
  const onDown = () => ring.classList.add('is-down');
  const onUp = () => {
    ring.classList.remove('is-down');
    // Labels can change on click (a row's "view" becomes "close"): re-read after React commits.
    requestAnimationFrame(() => describe(hovered));
  };
  const onLeave = () => root.classList.remove('cursor-visible');
  const onEnter = () => {
    if (shown) root.classList.add('cursor-visible');
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerover', onOver, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  root.addEventListener('mouseleave', onLeave);
  root.addEventListener('mouseenter', onEnter);

  return () => {
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerover', onOver);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    root.removeEventListener('mouseleave', onLeave);
    root.removeEventListener('mouseenter', onEnter);
    root.classList.remove('has-cursor', 'cursor-visible');
    ring.remove();
    dot.remove();
  };
}

const RADIUS = 60;
const MAX_OFFSET = 8;
const clamp = (value: number) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, value));

/**
 * Buttons, nav links and icons lean toward the cursor within 60px of their edge, up to
 * 8px, and snap back with elastic.out — the one place the system allows a spring.
 */
export function setupMagnetic(): Cleanup {
  const elements = gsap.utils.toArray<HTMLElement>('[data-magnetic]');
  const near = new Set<HTMLElement>();
  const engaged = new Set<HTMLElement>();
  let px = -1e4;
  let py = -1e4;
  let dirty = false;

  const release = (el: HTMLElement) => {
    engaged.delete(el);
    gsap.to(el, { x: 0, y: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)', overwrite: 'auto' });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) near.add(el);
        else {
          near.delete(el);
          if (engaged.has(el)) release(el);
        }
      }
    },
    { rootMargin: `${RADIUS}px` },
  );
  elements.forEach((el) => observer.observe(el));

  const tick = () => {
    if (!dirty) return;
    dirty = false;
    for (const el of near) {
      const rect = el.getBoundingClientRect();
      // Measure from the resting position, not the displaced one.
      const cx = rect.left - Number(gsap.getProperty(el, 'x')) + rect.width / 2;
      const cy = rect.top - Number(gsap.getProperty(el, 'y')) + rect.height / 2;
      const dx = px - cx;
      const dy = py - cy;
      const gap = Math.hypot(
        Math.max(Math.abs(dx) - rect.width / 2, 0),
        Math.max(Math.abs(dy) - rect.height / 2, 0),
      );
      if (gap < RADIUS && !el.closest('[inert], [hidden]')) {
        const pull = 1 - gap / RADIUS;
        engaged.add(el);
        gsap.to(el, {
          x: clamp(dx * 0.25) * pull,
          y: clamp(dy * 0.25) * pull,
          duration: 0.3,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      } else if (engaged.has(el)) {
        release(el);
      }
    }
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    px = event.clientX;
    py = event.clientY;
    dirty = true;
  };
  const onScroll = () => {
    dirty = true;
  };

  gsap.ticker.add(tick);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    gsap.ticker.remove(tick);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('scroll', onScroll);
    observer.disconnect();
    gsap.killTweensOf(elements);
    gsap.set(elements, { clearProps: 'transform' });
  };
}

/** Project rows with a screenshot show it beside the cursor while hovered. */
export function setupPreview(): Cleanup {
  const preview = document.querySelector<HTMLElement>('[data-work-preview]');
  const rows = gsap.utils.toArray<HTMLElement>('[data-preview]');
  if (!preview || rows.length === 0) return () => {};

  const images = gsap.utils.toArray<HTMLElement>('[data-preview-image]', preview);
  const moveX = gsap.quickTo(preview, 'x', { duration: 0.5, ease: 'power3.out' });
  const moveY = gsap.quickTo(preview, 'y', { duration: 0.5, ease: 'power3.out' });
  gsap.set(preview, { yPercent: -50, scale: 0.92 });

  const onMove = (event: PointerEvent) => {
    const width = preview.offsetWidth;
    const right = event.clientX + 24 + width < window.innerWidth;
    moveX(right ? event.clientX + 24 : event.clientX - 24 - width);
    moveY(event.clientY);
  };
  const show = (slug: string) => {
    for (const image of images)
      gsap.set(image, { opacity: image.dataset.previewImage === slug ? 1 : 0 });
    gsap.to(preview, {
      autoAlpha: 1,
      scale: 1,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };
  const hide = () => {
    gsap.to(preview, {
      autoAlpha: 0,
      scale: 0.92,
      duration: 0.2,
      ease: 'power2.in',
      overwrite: 'auto',
    });
  };

  const handlers = rows.map((row) => {
    const enter = () => show(row.dataset.preview ?? '');
    row.addEventListener('pointerenter', enter);
    row.addEventListener('pointerleave', hide);
    return { row, enter };
  });
  window.addEventListener('pointermove', onMove, { passive: true });

  return () => {
    for (const { row, enter } of handlers) {
      row.removeEventListener('pointerenter', enter);
      row.removeEventListener('pointerleave', hide);
    }
    window.removeEventListener('pointermove', onMove);
    gsap.killTweensOf(preview);
    gsap.set(preview, { clearProps: 'all' });
  };
}
