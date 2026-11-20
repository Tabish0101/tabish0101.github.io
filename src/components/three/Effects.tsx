'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import {
  BlendFunction,
  BloomEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
} from 'postprocessing';
import { HalfFloatType } from 'three';

/**
 * High tier, dark theme only. Bloom catches only the amber packet (pushed above the
 * threshold in its shader); the hairlines and dust stay crisp. Grain is premultiplied —
 * scaled by the light beneath it — so it breaks up banding in the bloom's falloff while
 * the void stays true black (unscaled noise, added in linear space, lifts black to grey).
 * No vignette: it would read as a gradient, which Tenebris rules out.
 *
 * Built on pmndrs/postprocessing directly rather than its React wrapper, which bundles
 * every effect it wraps (including an ~87 KB blue-noise texture) whether used or not.
 */
export default function Effects() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const dpr = useThree((s) => s.viewport.dpr);
  const composer = useRef<EffectComposer | null>(null);

  // Owned by an effect, not a memo: dispose() empties the pass list, so a composer must
  // never outlive its cleanup (StrictMode replays, Suspense retries).
  useEffect(() => {
    const effects = new EffectComposer(gl, {
      frameBufferType: HalfFloatType,
      multisampling: Math.min(4, gl.capabilities.maxSamples),
      depthBuffer: false,
      stencilBuffer: false,
    });
    const bloom = new BloomEffect({
      mipmapBlur: true,
      intensity: 1.1,
      luminanceThreshold: 0.4,
      luminanceSmoothing: 0.12,
      radius: 0.72,
    });
    const grain = new NoiseEffect({ blendFunction: BlendFunction.SCREEN, premultiply: true });
    grain.blendMode.opacity.value = 0.15;
    effects.addPass(new RenderPass(scene, camera));
    effects.addPass(new EffectPass(camera, bloom, grain));
    composer.current = effects;
    return () => {
      composer.current = null;
      effects.dispose();
    };
  }, [gl, scene, camera]);

  // R3F has already sized the renderer; this resizes the composer's buffers to match.
  useEffect(() => {
    composer.current?.setSize(width, height, false);
  }, [gl, scene, camera, width, height, dpr]);

  // Priority 1 takes over rendering from R3F while mounted. Until the composer exists,
  // render the plain scene so no frame is ever skipped.
  useFrame((_, delta) => {
    if (composer.current) composer.current.render(delta);
    else gl.render(scene, camera);
  }, 1);

  return null;
}
