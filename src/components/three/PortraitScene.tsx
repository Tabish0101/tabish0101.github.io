'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PerspectiveCamera } from 'three';
import { HERO_VIEW } from '@/lib/topology';
import { useDocumentTheme } from '@/lib/use-theme';
import { useGPUTier } from './gpu-tier';
import { readPalette } from './palette';
import { Particles } from './Particles';
import { trackPointer } from './pointer';
import { Portrait, PORTRAIT_VIEW } from './portrait/Portrait';
import { SceneCanvas } from './SceneCanvas';

/** Shifts the frustum so the portrait sits right of center, where its halftone is drawn. */
function ViewOffset() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  useLayoutEffect(() => {
    camera.setViewOffset(width, height, -PORTRAIT_VIEW.offset * width, 0, width, height);
    return () => camera.clearViewOffset();
  }, [camera, width, height]);

  return null;
}

/** Reports once the first frame with the portrait in it has reached the screen. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    requestAnimationFrame(() => onReady());
  });
  return null;
}

interface PortraitSceneProps {
  onReady: () => void;
  onLost: () => void;
}

/**
 * The portrait variant of the hero scene. Same contract as HeroScene (tier, theme, pause
 * off screen, ready/lost signals), but the canvas is transparent: the page's own surface
 * shows through, so there is no background color to keep in sync and no seam at the edges.
 * No post-processing: the stipple is the texture, and bloom would smear its 1 px dots.
 */
export default function PortraitScene({ onReady, onLost }: PortraitSceneProps) {
  const tier = useGPUTier();
  const theme = useDocumentTheme();
  const palette = useMemo(() => readPalette(theme), [theme]);
  const host = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const high = tier === 'high';

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
          antialias: false, // points only: MSAA buys nothing and costs fill rate
          alpha: true,
          premultipliedAlpha: true,
          stencil: false,
          depth: false,
          powerPreference: high ? 'high-performance' : 'default',
        }}
        camera={{ fov: HERO_VIEW.fov, near: 0.1, far: 30, position: [0, 0, HERO_VIEW.distance] }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.domElement.addEventListener('webglcontextlost', onLost, { once: true });
        }}
      >
        <ViewOffset />
        <Particles count={high ? 140 : 70} palette={palette} />
        {/* Suspends until the field and glyph atlas are in; the ready signal waits with it. */}
        <Portrait palette={palette} light={theme === 'light'} detail={high ? 1.6 : 1} />
        <ReadySignal onReady={onReady} />
      </SceneCanvas>
    </div>
  );
}
