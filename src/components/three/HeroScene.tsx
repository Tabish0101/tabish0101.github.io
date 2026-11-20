'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PerspectiveCamera } from 'three';
import { HERO_VIEW } from '@/lib/topology';
import { useDocumentTheme } from '@/lib/use-theme';
import { useGPUTier } from './gpu-tier';
import { readPalette } from './palette';
import { Particles } from './Particles';
import { trackPointer } from './pointer';
import { SceneCanvas } from './SceneCanvas';
import { Topology } from './Topology';

/** Post-processing is its own chunk, requested only for the high tier. */
const Effects = lazy(() => import('./Effects'));

/**
 * Shifts the frustum so the form sits right of center — at the same spot the SVG fallback
 * is drawn — without moving the camera off its axis (no perspective skew).
 */
function ViewOffset() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  useLayoutEffect(() => {
    camera.setViewOffset(width, height, -HERO_VIEW.offset * width, 0, width, height);
    return () => camera.clearViewOffset();
  }, [camera, width, height]);

  return null;
}

/** Reports once the first frame has reached the screen, so the canvas can fade in. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    requestAnimationFrame(() => onReady());
  });
  return null;
}

interface HeroSceneProps {
  onReady: () => void;
  onLost: () => void;
}

export default function HeroScene({ onReady, onLost }: HeroSceneProps) {
  const tier = useGPUTier();
  const theme = useDocumentTheme();
  const palette = useMemo(() => readPalette(theme), [theme]);
  const host = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const high = tier === 'high';
  const glow = high && theme === 'dark';

  // Render continuously only while the hero is on screen; otherwise only on demand.
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry?.isIntersecting ?? false),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => trackPointer(), []);

  return (
    <div ref={host} className="absolute inset-0">
      <SceneCanvas
        flat
        dpr={high ? [1, 2] : [1, 1.5]}
        frameloop={inView ? 'always' : 'demand'}
        gl={{
          antialias: true,
          alpha: false,
          stencil: false,
          powerPreference: high ? 'high-performance' : 'default',
        }}
        camera={{ fov: HERO_VIEW.fov, near: 0.1, far: 30, position: [0, 0, HERO_VIEW.distance] }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', onLost, { once: true });
        }}
      >
        <color attach="background" args={[palette.background]} />
        <ViewOffset />
        <Particles count={high ? 180 : 90} palette={palette} />
        <Topology palette={palette} glow={glow} />
        {glow ? (
          // Same boundary: the canvas reports ready only once bloom is in, so it fades in complete.
          <Suspense fallback={null}>
            <Effects />
            <ReadySignal onReady={onReady} />
          </Suspense>
        ) : (
          <ReadySignal onReady={onReady} />
        )}
      </SceneCanvas>
    </div>
  );
}
