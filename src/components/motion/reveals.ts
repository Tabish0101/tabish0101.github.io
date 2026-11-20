import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SplitText } from 'gsap/SplitText';
import { prime } from './split';

const START = 'top 85%';
/** Monospace glyphs only, so a decoding number never changes width. */
const GLYPHS = '0123456789#/_';

/** Random glyphs resolve, left to right, into the final text. */
export function scramble(el: HTMLElement, duration = 0.4) {
  const final = el.dataset.final ?? el.textContent ?? '';
  el.dataset.final = final;
  const state = { progress: 0 };

  return gsap.to(state, {
    progress: 1,
    duration,
    ease: 'none',
    onUpdate: () => {
      const settled = Math.floor(state.progress * final.length);
      let text = '';
      for (let i = 0; i < final.length; i++) {
        text +=
          i < settled || final[i] === ' '
            ? final[i]
            : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = text;
    },
    onComplete: () => {
      el.textContent = final;
    },
  });
}

/**
 * Scroll-triggered reveals for one section, per the motion spec: blocks fade up 16px, cards
 * rise 60px, heading words slide up 20px, numbers decode, stats count, timeline entries arrive
 * from their side, tags scale in, screenshots wipe open. Each plays once.
 *
 * Built in three passes so the browser lays the section out once, not once per element:
 * read (what is still below the fold), write (split headings, set the hidden states), then
 * create the triggers, which only measure. Reveal triggers carry callbacks rather than
 * tweens, so a ScrollTrigger refresh never has to revert and re-render them; the callbacks
 * run their tweens in `context`, so a matchMedia revert stops them with everything else.
 */
export function setupReveals(
  root: HTMLElement,
  { wide, context, Split }: { wide: boolean; context: gsap.Context; Split: typeof SplitText },
): () => void {
  // Read. Only what is not yet on screen gets a hidden state: nothing visible ever blinks.
  // Content inside a collapsed project row is revealed by its own expand transition.
  const fold = window.innerHeight;
  const pending = (selector: string) =>
    Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => !el.closest('.disclosure') && el.getBoundingClientRect().top > fold,
    );

  const blocks = pending('[data-reveal]:not([data-reveal="card"])');
  const cards = pending('[data-reveal="card"]');
  const headings = pending('[data-split="words"]');
  const numbers = pending('[data-scramble]');
  const counters = pending('[data-count]');
  const items = pending('[data-timeline-item]');
  const groups = pending('[data-skill-group]');
  const figures = pending('[data-curtain]');
  const timeline = root.querySelector<HTMLElement>('[data-timeline]');
  const rule = timeline?.querySelector('[data-timeline-progress]');

  // Write. Headings split first (DOM changes), then every target's transform is read in one
  // go, so the hidden states below are pure writes.
  const split = headings.map((heading) => Split.create(heading, { type: 'words', aria: 'auto' }));
  const tags = groups.map((group) => group.querySelectorAll<HTMLElement>('[data-tag]'));
  prime([
    ...blocks,
    ...cards,
    ...split.flatMap((s) => s.words),
    ...items,
    ...tags.flatMap((t) => [...t]),
  ]);

  const reveals: Array<[trigger: HTMLElement, play: () => void]> = [];
  const batches: Array<[targets: HTMLElement[], to: gsap.TweenVars]> = [];

  const batch = (targets: HTMLElement[], from: gsap.TweenVars, to: gsap.TweenVars) => {
    if (!targets.length) return;
    gsap.set(targets, from);
    batches.push([targets, to]);
  };
  batch(
    blocks,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.08 },
  );
  batch(
    cards,
    { opacity: 0, y: 60 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08 },
  );

  for (const [i, heading] of headings.entries()) {
    const { words } = split[i];
    gsap.set(words, { opacity: 0, y: 20 });
    reveals.push([
      heading,
      () => gsap.to(words, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05 }),
    ]);
  }

  for (const number of numbers) reveals.push([number, () => scramble(number)]);

  const counted: HTMLElement[] = [];
  for (const stat of counters) {
    const value = Number(stat.dataset.count);
    if (!Number.isFinite(value)) continue;
    counted.push(stat);
    stat.textContent = '0';
    const counter = { value: 0 };
    reveals.push([
      stat,
      () =>
        gsap.to(counter, {
          value,
          duration: 1.2,
          ease: 'power2.out',
          snap: { value: 1 },
          onUpdate: () => {
            stat.textContent = String(counter.value);
          },
        }),
    ]);
  }

  for (const item of items) {
    const side = item.dataset.timelineItem === 'left' ? -1 : 1;
    gsap.set(item, { opacity: 0, x: wide ? side * 40 : 0, y: wide ? 0 : 24 });
    reveals.push([
      item,
      () => gsap.to(item, { opacity: 1, x: 0, y: 0, duration: 0.6, ease: 'power3.out' }),
    ]);
  }

  for (const [i, group] of groups.entries()) {
    gsap.set(tags[i], { opacity: 0, scale: 0.8 });
    reveals.push([
      group,
      () =>
        gsap.to(tags[i], {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: 'power2.out',
          stagger: 0.04,
        }),
    ]);
  }

  for (const figure of figures) {
    gsap.set(figure, { clipPath: 'inset(0 0 100% 0)' });
    reveals.push([
      figure,
      () => gsap.to(figure, { clipPath: 'inset(0 0 0% 0)', duration: 1, ease: 'power3.inOut' }),
    ]);
  }

  // Triggers, last: each one measures a layout that no longer changes under it.
  for (const [targets, to] of batches) {
    ScrollTrigger.batch(targets, {
      start: START,
      once: true,
      onEnter: (entered) => context.add(() => gsap.to(entered, { ...to, overwrite: true })),
    });
  }
  for (const [trigger, play] of reveals) {
    ScrollTrigger.create({ trigger, start: START, once: true, onEnter: () => context.add(play) });
  }
  if (timeline && rule) {
    gsap.fromTo(
      rule,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: { trigger: timeline, start: 'top 70%', end: 'bottom 70%', scrub: true },
      },
    );
  }

  // Counters write text directly; put the real numbers back if motion is switched off mid-way.
  return () => {
    for (const stat of counted) stat.textContent = stat.dataset.count ?? stat.textContent;
  };
}
