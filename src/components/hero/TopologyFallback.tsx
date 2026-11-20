import type { CSSProperties } from 'react';
import {
  createTopology,
  depthFade,
  frontRoute,
  HERO_VIEW,
  project,
  rotate,
  seededRandom,
} from '@/lib/topology';

const round = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Depth is drawn in a few opacity steps rather than per element: one path per step keeps
 * the whole graph to a handful of nodes (the page parses, lays out and hydrates 18 elements
 * instead of 166), and the steps are finer than the eye can separate on a 1px line.
 */
const STEPS = 8;
const step = (fade: number) => Math.round(fade * (STEPS - 1));
const stepFade = (index: number) => index / (STEPS - 1);

/**
 * The hero polyhedron as server-rendered SVG: same graph, same camera, same pose as the
 * WebGL scene, so the 3D canvas crossfades in over it without a jump. This is also the
 * whole hero visual on phones, low-end GPUs and reduced motion — zero JavaScript.
 *
 * Coordinates are in units of half the viewport height (viewBox -1…1), centered on the
 * polyhedron; CSS places the box at 69% of the width, where the 3D view offset puts it.
 */
export function TopologyFallback() {
  const topology = createTopology();
  const points = topology.nodes.map((node) =>
    project(rotate(node, HERO_VIEW.rotationX, HERO_VIEW.rotationY)),
  );

  const edges = Array.from({ length: STEPS }, () => '');
  for (const [a, b] of topology.edges) {
    const p = points[a];
    const q = points[b];
    edges[step(depthFade((p.depth + q.depth) / 2))] +=
      `M${round(p.x)} ${round(p.y)}L${round(q.x)} ${round(q.y)}`;
  }

  const nodes = Array.from({ length: STEPS }, () => '');
  for (const point of points) {
    const fade = depthFade(point.depth);
    const size = round(0.006 * (1 + fade));
    nodes[step(fade)] +=
      `M${round(point.x - size / 2)} ${round(point.y - size / 2)}h${size}v${size}h${-size}z`;
  }

  const hops = frontRoute(topology).map((i) => points[i]);
  const route = hops.map((p, n) => `${n === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`).join('');
  // In viewBox units. The packet's dashes are sized from it in CSS (see .hero-route).
  const routeLength = hops.reduce(
    (sum, p, n) => (n === 0 ? 0 : sum + Math.hypot(p.x - hops[n - 1].x, p.y - hops[n - 1].y)),
    0,
  );

  return (
    <>
      <svg className="hero-fallback" viewBox="-1 -1 2 2" aria-hidden="true" focusable="false">
        {/* Back to front, so nearer edges draw over farther ones. */}
        <g fill="none" stroke="var(--ink-muted)" strokeWidth={1} strokeLinecap="square">
          {edges.map((d, i) =>
            d ? (
              <path
                key={i}
                d={d}
                strokeOpacity={round(0.08 + 0.42 * stepFade(i))}
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}
        </g>
        <g fill="var(--ink-muted)">
          {nodes.map((d, i) =>
            d ? <path key={i} d={d} fillOpacity={round(0.25 + 0.6 * stepFade(i))} /> : null,
          )}
        </g>
      </svg>
      {/* The packet animates every frame; alone in its own SVG, it never invalidates the graph. */}
      <svg className="hero-fallback" viewBox="-1 -1 2 2" aria-hidden="true" focusable="false">
        <path
          className="hero-route"
          d={route}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeLinecap="square"
          vectorEffect="non-scaling-stroke"
          style={{ '--route-length': round(routeLength) } as CSSProperties}
        />
      </svg>
    </>
  );
}

/**
 * Sparse static motes — the CSS-only depth cue where WebGL particles don't run. One element:
 * each mote is a 2px box-shadow, placed in viewport units (the layer spans the viewport).
 */
export function HeroDust() {
  const random = seededRandom(11);
  const motes = Array.from({ length: 28 }, (_, i) => {
    const left = random() * 100;
    const top = random() * 100;
    const opacity = 0.35 + random() * 0.65;
    const color = i === 7 || i === 19 ? 'var(--accent)' : 'var(--ink-ghost)';
    return `${left.toFixed(2)}vw ${top.toFixed(2)}svh color-mix(in srgb,${color} ${Math.round(opacity * 100)}%,transparent)`;
  });

  return (
    <div className="hero-dust absolute inset-0" aria-hidden="true">
      <span style={{ boxShadow: motes.join(',') }} />
    </div>
  );
}
