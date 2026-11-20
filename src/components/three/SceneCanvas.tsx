'use client';

import { createRoot, extend, type ReconcilerRoot, type RenderProps } from '@react-three/fiber';
import {
  Component,
  Suspense,
  useInsertionEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Color, Group } from 'three';

/*
 * R3F's <Canvas> registers the entire THREE namespace as JSX elements (`extend(THREE)`),
 * which keeps every class in the bundle. This canvas is the same R3F root, created with
 * the public createRoot API, registering only the two elements the scene declares in JSX.
 * Everything else is passed as <primitive>, so three.js tree-shakes to what is used.
 */
extend({ Color, Group });

class Catch extends Component<
  { onError: (error: unknown) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type SceneCanvasProps = Omit<RenderProps<HTMLCanvasElement>, 'size'> & { children: ReactNode };

/** A full-bleed, non-interactive R3F canvas. Errors inside the scene rethrow into the DOM tree. */
export function SceneCanvas({ children, ...config }: SceneCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<ReconcilerRoot<HTMLCanvasElement> | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [, setReady] = useState(false);

  if (error) throw error;

  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((previous) =>
        previous && previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Insertion-effect cleanup runs only on final removal, not on StrictMode effect replay.
  useInsertionEffect(
    () => () => {
      root.current?.unmount();
      root.current = null;
    },
    [],
  );

  // Like R3F's <Canvas>: reconfigure on every render (`config` is a fresh object each
  // time) and let configure() diff what changed — frameloop, dpr, camera options.
  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element || !size || size.width === 0 || size.height === 0) return;
    root.current ??= createRoot(element);
    const current = root.current;
    current
      .configure({ ...config, size: { width: size.width, height: size.height, top: 0, left: 0 } })
      .catch(setError);

    if (current.ready.status === 'fulfilled') {
      current.render(
        <Catch onError={setError}>
          <Suspense fallback={null}>{children}</Suspense>
        </Catch>,
      );
    } else if (current.ready.status === 'pending') {
      // Render once the renderer exists; a rejection is reported by the catch above.
      current.ready.then(
        () => setReady(true),
        () => undefined,
      );
    }
  }, [size, config, children]);

  return (
    <div
      ref={host}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      <canvas ref={canvas} style={{ display: 'block' }} />
    </div>
  );
}
