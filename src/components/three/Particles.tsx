'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector3 } from 'three';
import { sceneState } from '@/lib/scene-state';
import { HERO_VIEW, seededRandom } from '@/lib/topology';
import type { Palette } from './palette';

/** Half extents of the drift volume. Shifted left: the view offset shows more of that side. */
const BOUNDS = new Vector3(7, 3.8, 3.5);
const CENTER = new Vector3(-1.5, 0, -1);
const ACCENTS = 2;

const VERTEX = /* glsl */ `
  attribute vec3 aDrift;
  attribute float aSize;
  attribute float aAlpha;
  attribute float aAccent;
  uniform float uFlow;
  uniform float uPointScale;
  uniform vec3 uBounds;
  varying float vAlpha;
  varying float vAccent;

  void main() {
    // Drift, wrapped inside the volume; fade near the walls so nothing pops in or out.
    vec3 p = mod(position + aDrift * uFlow + uBounds, 2.0 * uBounds) - uBounds;
    vec3 walls = 1.0 - smoothstep(uBounds * 0.8, uBounds, abs(p));
    vAlpha = aAlpha * walls.x * walls.y * walls.z;
    vAccent = aAccent;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * uPointScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vAccent;

  void main() {
    gl_FragColor = vec4(mix(uColor, uAccent, vAccent), vAlpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

function buildParticles(count: number) {
  const random = seededRandom(19);
  const span = (n: number) => (random() * 2 - 1) * n;
  const position = new Float32Array(count * 3);
  const drift = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const alpha = new Float32Array(count);
  const accent = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    position.set([span(BOUNDS.x), span(BOUNDS.y), span(BOUNDS.z)], i * 3);
    // Mostly upward, slow: world units per second.
    drift.set([span(0.02), 0.02 + random() * 0.04, span(0.01)], i * 3);
    const isAccent = i < ACCENTS;
    size[i] = isAccent ? 2.4 : 1 + random() * 1.2;
    alpha[i] = isAccent ? 0.9 : 0.3 + random() * 0.6;
    accent[i] = isAccent ? 1 : 0;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('aDrift', new BufferAttribute(drift, 3));
  geometry.setAttribute('aSize', new BufferAttribute(size, 1));
  geometry.setAttribute('aAlpha', new BufferAttribute(alpha, 1));
  geometry.setAttribute('aAccent', new BufferAttribute(accent, 1));

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uFlow: { value: 0 },
      uPointScale: { value: 1 },
      uBounds: { value: BOUNDS },
      uColor: { value: new Color() },
      uAccent: { value: new Color() },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const points = new Points(geometry, material);
  points.position.copy(CENTER);
  points.frustumCulled = false;
  points.renderOrder = 0; // its own layer, behind the form: no depth conflicts

  return { points, geometry, material };
}

/**
 * Ambient dust: ink-ghost motes with two amber ones. They drift slowly and speed up a
 * little with scroll velocity — the only part of the scene that reacts to speed.
 */
export function Particles({ count, palette }: { count: number; palette: Palette }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const { points, geometry, material } = useMemo(() => buildParticles(count), [count]);
  const motion = useRef({ flow: 0, speed: 0 });

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useEffect(() => {
    material.uniforms.uColor.value.set(palette.ghost);
    material.uniforms.uAccent.value.set(palette.accent);
  }, [material, palette]);

  useEffect(() => {
    // Sizes are CSS pixels at the polyhedron's distance, attenuated with depth.
    material.uniforms.uPointScale.value = dpr * HERO_VIEW.distance;
  }, [material, dpr]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const m = motion.current;
    const target = Math.min(Math.abs(sceneState.velocity) * 0.08, 2.5);
    m.speed += (target - m.speed) * (1 - Math.exp(-dt * 3));
    m.flow += dt * (1 + m.speed);
    material.uniforms.uFlow.value = m.flow;
    material.uniforms.uOpacity.value = 1 - 0.6 * sceneState.progress;
  });

  return <primitive object={points} />;
}
