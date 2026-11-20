import { createContext, use } from 'react';
import type { TierResult } from 'detect-gpu';

/**
 * high — discrete GPU: full scene, particles, post-processing
 * mid  — integrated GPU: simplified scene, fewer particles, no post-processing
 * low  — no WebGL or a weak/blocklisted GPU: no 3D; the server-rendered SVG stays
 */
export type GPUTier = 'low' | 'mid' | 'high';

export const GPUTierContext = createContext<GPUTier>('low');

/** Every 3D component reads the tier from context and renders accordingly. */
export function useGPUTier(): GPUTier {
  return use(GPUTierContext);
}

export function toTier({ tier, type, isMobile }: TierResult): GPUTier {
  if (type === 'WEBGL_UNSUPPORTED' || type === 'BLOCKLISTED') return 'low';
  // A GPU missing from the benchmarks still runs WebGL; give it the light scene.
  if (type === 'FALLBACK') return 'mid';
  if (isMobile) return tier >= 2 ? 'mid' : 'low';
  if (tier >= 3) return 'high';
  return tier === 2 ? 'mid' : 'low';
}
