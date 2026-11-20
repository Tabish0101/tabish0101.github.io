'use client';

import { useDetectGPU } from '@react-three/drei/core/DetectGPU';
import { useEffect } from 'react';
import { toTier, type GPUTier } from './gpu-tier';

/**
 * Suspends while detect-gpu benchmarks the device. The benchmark tables are self-hosted
 * under /benchmarks (copied from the package at build time), so the CSP stays 'self'.
 */
export default function GPUProbe({ onResult }: { onResult: (tier: GPUTier) => void }) {
  const result = useDetectGPU({ benchmarksURL: '/benchmarks' });

  useEffect(() => {
    onResult(toTier(result));
  }, [result, onResult]);

  return null;
}
