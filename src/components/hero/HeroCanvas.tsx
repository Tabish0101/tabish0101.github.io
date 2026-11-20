'use client';

import { Component, Suspense, lazy, useCallback, useEffect, useState, type ReactNode } from 'react';
import { MEDIA } from '@/lib/media';
import { GPUTierContext, type GPUTier } from '../three/gpu-tier';

/*
 * Three.js never enters the main bundle or the server render: the GPU probe, the scene
 * and the post-processing stack are separate chunks, requested only on desktop with
 * motion allowed. (Plain React.lazy: nothing below renders before an effect has run,
 * so next/dynamic's SSR bail-out has nothing to do.)
 */
const GPUProbe = lazy(() => import('../three/GPUProbe'));
const HeroScene = lazy(() => import('../three/HeroScene'));
const PortraitScene = lazy(() => import('../three/PortraitScene'));

const SCENES = { topology: HeroScene, portrait: PortraitScene } as const;
export type HeroSceneName = keyof typeof SCENES;

/** WebGL failed (no context, driver error): report it, and the SVG underneath simply stays. */
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('hero: WebGL scene disabled —', error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Progressive enhancement for the hero visual:
 *   phone, tablet, reduced motion → nothing here; the server-rendered SVG is the visual
 *   desktop → probe the GPU → low: SVG stays · mid: light scene · high: full scene + effects
 * The canvas fades in over the SVG once its first frame is on screen.
 * `scene` picks the form: the topology graph, or the point-cloud portrait. Only the chosen
 * one is ever downloaded.
 */
export function HeroCanvas({ scene = 'topology' }: { scene?: HeroSceneName }) {
  const Scene = SCENES[scene];
  const [enabled, setEnabled] = useState(false);
  const [tier, setTier] = useState<GPUTier | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MEDIA.webgl);
    const update = () => {
      if (!query.matches) setReady(false);
      setEnabled(query.matches);
    };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Nothing 3D is downloaded until the probe says the device can run it.
  const onTier = useCallback((result: GPUTier) => setTier(result), []);

  const onReady = useCallback(() => setReady(true), []);

  const onLost = useCallback(() => {
    setReady(false);
    setTier('low');
  }, []);

  if (!enabled || tier === 'low') return null;

  return (
    <div className="hero-canvas" data-ready={ready}>
      <SceneBoundary onError={onLost}>
        <Suspense fallback={null}>
          {tier === null ? (
            <GPUProbe onResult={onTier} />
          ) : (
            <GPUTierContext value={tier}>
              <Scene onReady={onReady} onLost={onLost} />
            </GPUTierContext>
          )}
        </Suspense>
      </SceneBoundary>
    </div>
  );
}
