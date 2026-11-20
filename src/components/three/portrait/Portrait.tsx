'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { use, useEffect, useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Matrix4,
  Points,
  Ray,
  ShaderMaterial,
  Vector2,
  Vector3,
  type CanvasTexture,
} from 'three';
import { sceneState } from '@/lib/scene-state';
import { HERO_VIEW } from '@/lib/topology';
import type { Palette } from '../palette';
import { pointer } from '../pointer';
import { ATLAS_GRID, createGlyphAtlas } from './atlas';
import { buildDots, buildGlyphs, loadField, type Cloud, type PortraitField } from './field';

/**
 * Where the portrait sits, as fractions of the hero. Mirrored by .portrait-fallback in
 * globals.css, so the canvas crossfades in over the static halftone without a jump:
 *   offset    center, right of the viewport's center (same as the topology)
 *   height    side of the (square) portrait, × hero height; bottom-anchored
 *   width     …capped at this × hero width on narrow aspect ratios
 */
export const PORTRAIT_VIEW = { offset: HERO_VIEW.offset, height: 0.94, width: 0.62 } as const;

/** Relief depth, × the portrait's side. */
const RELIEF = 0.34;
/** Rotation pivot (unit square, y up): between the eyes, so the head turns, not the chest. */
const PIVOT = 0.12;
/** Pointer parallax, radians at the edge of the screen. */
const TILT_X = 0.13;
const TILT_Y = 0.24;
/** Cursor lens radius, × the portrait's side. */
const LENS_RADIUS = 0.17;
/** Dots per CSS pixel² at detail 1 — the halftone fallback's density (42k over 1024²). */
const DOT_DENSITY = 42000 / 1024 ** 2;
/** Glyph grid columns across the portrait. */
const COLUMNS = 84;

interface Assets {
  field: PortraitField;
  atlas: CanvasTexture;
}

let assets: Promise<Assets> | null = null;
/** One fetch and one atlas per page, shared by every mount (StrictMode, context restores). */
function loadAssets(): Promise<Assets> {
  assets ??= Promise.all([loadField(), createGlyphAtlas()]).then(([field, atlas]) => ({
    field,
    atlas,
  }));
  return assets;
}

/*
 * One vertex routine for dots and glyphs, so both layers move as a single surface:
 *   relief      z from the depth map, breathing ~5 s per cycle
 *   drift       flat, unlit points wander; contours hold still (features stay crisp)
 *   lens        under the cursor the surface swells toward you and parts, harder when the
 *               cursor moves fast; the dots thin out and the ASCII layer shows through
 *   dissolve    on scroll, each point lifts off and fades at its own moment
 * The CPU writes a handful of uniforms per frame; every point is moved on the GPU.
 */
const SHAPE = /* glsl */ `
  attribute vec4 aData; // depth, shade, edge, mask
  attribute float aSeed;
  uniform float uTime;
  uniform float uRelief;
  uniform vec2 uPointer;
  uniform float uLens;
  uniform float uLensRadius;
  uniform float uStir;
  uniform float uDissolve;
  uniform float uScan;
  varying float vLens;
  varying float vRing;
  varying float vLife;
  varying float vScan;

  vec3 shape(vec3 p) {
    float depth = aData.x;
    float shade = aData.y;
    float edge = aData.z;

    float breath = 0.5 + 0.5 * sin(uTime * 1.25);
    vec3 q = vec3(p.xy * (1.0 + 0.004 * breath), (depth - 0.5) * uRelief * (0.96 + 0.08 * breath));

    float freedom = (1.0 - edge) * (0.3 + 0.7 * (1.0 - shade));
    float phase = aSeed * 6.2832;
    q += vec3(
      sin(uTime * 0.71 + phase + p.y * 11.0),
      cos(uTime * 0.53 + phase * 1.7 + p.x * 11.0),
      sin(uTime * 0.37 + phase * 2.3)
    ) * (0.0007 + 0.0042 * freedom);

    vec2 toward = q.xy - uPointer;
    float r = length(toward) / uLensRadius;
    float lens = uLens * (1.0 - smoothstep(0.0, 1.0, r));
    q.z += lens * (0.035 + 0.03 * depth);
    q.xy += toward / max(length(toward), 1e-4) * lens * (0.004 + 0.022 * uStir) * (0.4 + aSeed);
    vLens = lens;
    vRing = uLens * smoothstep(0.8, 0.92, r) * (1.0 - smoothstep(0.92, 1.02, r));

    float t = clamp((uDissolve - aSeed * 0.5) * 2.0, 0.0, 1.0);
    vec2 away = q.xy + vec2(0.001, 0.15);
    q.xy += away / length(away) * t * t * 0.35;
    q.z += t * t * (0.15 + 0.3 * aSeed);
    vLife = 1.0 - t;

    vScan = (1.0 - smoothstep(0.0, 0.012, abs(q.y - uScan))) * edge;
    return q;
  }
`;

const FRAGMENT_HEAD = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uMuted;
  uniform vec3 uAccent;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vTone;
  varying float vRing;
  varying float vScan;
`;

const DOT_VERTEX = /* glsl */ `
  ${SHAPE}
  uniform float uSize;
  uniform float uDistance;
  varying float vAlpha;
  varying float vTone;

  void main() {
    vec3 q = shape(position);
    vec4 mv = modelViewMatrix * vec4(q, 1.0);
    float shade = aData.y;
    float edge = aData.z;
    gl_PointSize = uSize * (0.8 + 1.2 * shade + 0.5 * edge) * (1.0 + 0.5 * vLens) * uDistance / -mv.z;
    vAlpha = clamp(0.04 + 0.8 * shade + 0.3 * edge, 0.0, 1.0) * aData.w * vLife * (1.0 - 0.9 * vLens);
    vTone = clamp(shade * 1.1 + edge * 0.4, 0.0, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

/** Square dots, like the topology's nodes: no discard, no smoothing — crisp at 1–3 px. */
const DOT_FRAGMENT = /* glsl */ `
  ${FRAGMENT_HEAD}
  void main() {
    vec3 color = mix(uMuted, uInk, vTone);
    color = mix(color, uAccent, vScan);
    gl_FragColor = vec4(color, vAlpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

const GLYPH_VERTEX = /* glsl */ `
  ${SHAPE}
  attribute float aGlyph;
  uniform float uGlyphPx;
  uniform float uGlyphRest;
  varying float vAlpha;
  varying float vTone;
  varying float vGlyph;

  void main() {
    vec3 q = shape(position);
    q.z += 0.004;
    vec4 mv = modelViewMatrix * vec4(q, 1.0);
    gl_PointSize = uGlyphPx * (1.0 + 0.3 * vLens) / -mv.z;
    float weight = max(aData.y, aData.z);
    vAlpha = mix(uGlyphRest * (0.3 + 0.7 * weight), 0.5 + 0.5 * weight, vLens) * aData.w * vLife;
    vTone = clamp(aData.y * 1.1 + aData.z * 0.4, 0.0, 1.0);
    vGlyph = aGlyph;
    gl_Position = projectionMatrix * mv;
  }
`;

const GLYPH_FRAGMENT = /* glsl */ `
  ${FRAGMENT_HEAD}
  uniform sampler2D uAtlas;
  varying float vGlyph;

  void main() {
    float grid = ${ATLAS_GRID.toFixed(1)};
    vec2 cell = vec2(floor(mod(vGlyph + 0.5, grid)), floor((vGlyph + 0.5) / grid));
    vec2 uv = vec2((cell.x + gl_PointCoord.x) / grid, 1.0 - (cell.y + gl_PointCoord.y) / grid);
    float alpha = texture2D(uAtlas, uv).a * vAlpha * uOpacity;
    if (alpha < 0.004) discard;
    vec3 color = mix(uMuted, uInk, vTone);
    color = mix(color, uAccent, clamp(vRing * 0.9 + vScan * 0.5, 0.0, 1.0));
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

function geometryFrom(cloud: Cloud, glyph?: Float32Array) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(cloud.position, 3));
  geometry.setAttribute('aData', new BufferAttribute(cloud.data, 4));
  geometry.setAttribute('aSeed', new BufferAttribute(cloud.seed, 1));
  if (glyph) geometry.setAttribute('aGlyph', new BufferAttribute(glyph, 1));
  return geometry;
}

function createMaterials(atlas: CanvasTexture) {
  // Shared uniform objects: one write per frame moves both layers.
  const shared = {
    uTime: { value: 0 },
    uRelief: { value: RELIEF },
    uPointer: { value: new Vector2(9, 9) },
    uLens: { value: 0 },
    uLensRadius: { value: LENS_RADIUS },
    uStir: { value: 0 },
    uDissolve: { value: 0 },
    uScan: { value: -9 },
    uDistance: { value: HERO_VIEW.distance },
    uInk: { value: new Color() },
    uMuted: { value: new Color() },
    uAccent: { value: new Color() },
    uOpacity: { value: 1 },
  };
  const options = { transparent: true, depthTest: false, depthWrite: false } as const;
  const dots = new ShaderMaterial({
    ...options,
    vertexShader: DOT_VERTEX,
    fragmentShader: DOT_FRAGMENT,
    uniforms: { ...shared, uSize: { value: 1 } },
  });
  const glyphs = new ShaderMaterial({
    ...options,
    vertexShader: GLYPH_VERTEX,
    fragmentShader: GLYPH_FRAGMENT,
    uniforms: {
      ...shared,
      uAtlas: { value: atlas },
      uGlyphPx: { value: 1 },
      uGlyphRest: { value: 0.12 },
    },
  });
  return { shared, dots, glyphs };
}

interface PortraitProps {
  palette: Palette;
  light: boolean;
  /**
   * Stipple density relative to the halftone (1 = same dots per CSS pixel). Above 1, dots
   * get smaller as they get more numerous, so tone holds and only detail increases.
   */
  detail: number;
}

/**
 * The hero portrait: a stippled point cloud with real relief from the depth map, and a
 * faint ASCII layer set over it in the site's mono face. Lerped tilt toward the cursor,
 * breathing and drift at rest, a lens that swells the surface and reveals the glyphs
 * under the cursor, an amber scan that catches the contours now and then, and the same
 * scroll-driven recede-and-dissolve as the topology.
 */
export function Portrait({ palette, light, detail }: PortraitProps) {
  const { field, atlas } = use(loadAssets());
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const dpr = useThree((s) => s.viewport.dpr);
  const camera = useThree((s) => s.camera);

  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const materials = useMemo(() => createMaterials(atlas), [atlas]);

  // Placement in world units, from the visible frustum height at z = 0.
  const layout = useMemo(() => {
    const fov = (HERO_VIEW.fov * Math.PI) / 180;
    const visible = 2 * HERO_VIEW.distance * Math.tan(fov / 2);
    const side = Math.min(
      PORTRAIT_VIEW.height * visible,
      PORTRAIT_VIEW.width * visible * (width / height),
    );
    return {
      side,
      y: -visible / 2 + side / 2,
      // The portrait's side in CSS pixels.
      css: (side / visible) * height,
      // Device pixels per world unit at distance 1.
      pixels: (height * dpr) / (2 * Math.tan(fov / 2)),
    };
  }, [width, height, dpr]);

  // Dots per CSS pixel² as in the halftone (42k over 1024²), times detail; stepped so a
  // resize only rebuilds when the count moves by a few thousand.
  const count = Math.min(
    110000,
    Math.max(8000, Math.round((DOT_DENSITY * layout.css ** 2 * detail) / 4000) * 4000),
  );

  // Rebuilt on theme change: what counts as ink flips, and density follows ink.
  const layers = useMemo(() => {
    const dots = new Points(geometryFrom(buildDots(field, light, count)), materials.dots);
    const glyphCloud = buildGlyphs(field, light, COLUMNS);
    const glyphs = new Points(geometryFrom(glyphCloud, glyphCloud.glyph), materials.glyphs);
    [dots, glyphs].forEach((object, order) => {
      object.frustumCulled = false; // vertices move in the shader; bounds would be stale
      object.renderOrder = order + 1; // painter's order: glyphs over dots
    });
    return [dots, glyphs];
  }, [field, light, count, materials]);

  useEffect(() => () => layers.forEach((layer) => layer.geometry.dispose()), [layers]);
  useEffect(
    () => () => {
      materials.dots.dispose();
      materials.glyphs.dispose();
    },
    [materials],
  );

  useEffect(() => {
    materials.shared.uInk.value.set(palette.ink);
    materials.shared.uMuted.value.set(palette.muted);
    materials.shared.uAccent.value.set(palette.accent);
    // Glyphs at rest: a texture, not a second image. Ink reads heavier on paper.
    materials.glyphs.uniforms.uGlyphRest.value = light ? 0.09 : 0.13;
  }, [materials, palette, light]);

  useEffect(() => {
    // Dots are sized in CSS pixels at the portrait's distance, then attenuated with depth.
    materials.dots.uniforms.uSize.value = (0.85 * dpr) / Math.sqrt(detail);
  }, [materials, dpr, detail]);

  const sim = useRef({
    tiltX: 0,
    tiltY: 0,
    progress: sceneState.progress,
    lastX: pointer.x,
    lastY: pointer.y,
    movedAt: -Infinity,
    lens: new Vector2(9, 9),
    previous: new Vector2(9, 9),
    lensOn: 0,
    stir: 0,
    ray: new Ray(),
    inverse: new Matrix4(),
    hit: new Vector3(),
    ndc: new Vector2(),
  });

  useFrame((state, delta) => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const dt = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;
    const s = sim.current;
    const u = materials.shared;

    // Tilt toward the cursor, with a slow sway underneath so it is never quite still.
    const follow = 1 - Math.exp(-dt * 2.5);
    s.tiltX += (pointer.x - s.tiltX) * follow;
    s.tiltY += (pointer.y - s.tiltY) * follow;
    s.progress += (sceneState.progress - s.progress) * (1 - Math.exp(-dt * 10));
    const p = s.progress;

    const scale = layout.side * (1 - 0.25 * p);
    o.position.set(0, layout.y + PIVOT * layout.side, -1.2 * p);
    o.scale.setScalar(scale);
    o.rotation.set(
      -s.tiltY * TILT_X + Math.sin(time * 0.21) * 0.015,
      s.tiltX * TILT_Y + Math.sin(time * 0.13) * 0.045,
      0,
    );
    i.position.set(0, -PIVOT, 0);

    // The cursor, cast onto the portrait's own plane (its local z = 0).
    if (Math.abs(pointer.x - s.lastX) + Math.abs(pointer.y - s.lastY) > 1e-4) {
      s.movedAt = time;
      s.lastX = pointer.x;
      s.lastY = pointer.y;
    }
    s.ray.origin.setFromMatrixPosition(camera.matrixWorld);
    s.ray.direction.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(s.ray.origin).normalize();
    s.ray.applyMatrix4(s.inverse.copy(i.matrixWorld).invert());
    const { origin, direction } = s.ray;
    let inside = false;
    if (Math.abs(direction.z) > 1e-6) {
      s.hit
        .copy(direction)
        .multiplyScalar(-origin.z / direction.z)
        .add(origin);
      inside = Math.abs(s.hit.x) < 0.42 && s.hit.y > -0.45 && s.hit.y < 0.5;
    }
    const active = inside && time - s.movedAt < 2.5;
    s.previous.copy(s.lens);
    if (inside) {
      if (s.lensOn < 0.01)
        s.lens.set(s.hit.x, s.hit.y); // appear where the cursor is
      else s.lens.lerp(s.ndc.set(s.hit.x, s.hit.y), 1 - Math.exp(-dt * 12));
    }
    s.lensOn += ((active ? 1 : 0) - s.lensOn) * (1 - Math.exp(-dt * (active ? 5 : 1.6)));
    const speed = dt > 0 ? s.previous.distanceTo(s.lens) / dt : 0;
    s.stir += (Math.min(1, speed * 1.4) - s.stir) * (1 - Math.exp(-dt * 3));

    u.uTime.value = time;
    u.uPointer.value.copy(s.lens);
    u.uLens.value = s.lensOn * (1 - p);
    u.uStir.value = s.stir;
    u.uDissolve.value = Math.min(1, Math.max(0, (p - 0.1) / 0.85));
    // An amber scan sweeps down every 11 s, spending a few seconds off the portrait.
    u.uScan.value = 0.62 - ((time % 11) / 11) * 1.7;
    materials.glyphs.uniforms.uGlyphPx.value = (scale / COLUMNS) * layout.pixels;
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        {layers.map((object) => (
          <primitive key={object.uuid} object={object} />
        ))}
      </group>
    </group>
  );
}
