import { gsap } from 'gsap';
import type { SplitText } from 'gsap/SplitText';

let loading: Promise<typeof SplitText> | undefined;

/**
 * SplitText builds an Intl.Segmenter as its module evaluates: ICU break-iterator data, about
 * 13 ms on a fast phone. It ships in the motion chunk (eager mode: no extra request) but is
 * evaluated on first use, in a task of its own rather than inside one that is already busy.
 */
export function loadSplitText(): Promise<typeof SplitText> {
  loading ??= import(/* webpackMode: "eager" */ 'gsap/SplitText').then(({ SplitText }) => {
    gsap.registerPlugin(SplitText);
    return SplitText;
  });
  return loading;
}

/**
 * GSAP reads an element's computed transform the first time it touches it, and a transform
 * read needs a clean layout. Reading every target before writing any costs one layout;
 * interleaved (read, write, read, write…), every read after a write forces another.
 */
export function prime(targets: Iterable<Element | null | undefined>) {
  for (const target of targets) if (target) gsap.getProperty(target, 'x');
}
