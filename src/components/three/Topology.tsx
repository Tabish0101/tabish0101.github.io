'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  Line,
  LineSegments,
  Points,
  ShaderMaterial,
} from 'three';
import { sceneState } from '@/lib/scene-state';
import {
  createTopology,
  frontRoute,
  HERO_VIEW,
  seededRandom,
  type Topology as Graph,
} from '@/lib/topology';
import type { Palette } from './palette';
import { pointer } from './pointer';

const TRAIL_SAMPLES = 24;
/** Trail length, in edges. */
const TRAIL_LENGTH = 1.15;
/** Packet speed, in edges per second. */
const PACKET_SPEED = 1.4;
/** Idle rotation, radians per second. */
const SPIN_SPEED = 0.05;
/** Pointer parallax, radians at the edge of the screen. */
const TILT_X = 0.12;
const TILT_Y = 0.2;

/*
 * Edges and nodes share one vertex routine: a depth fade (the same curve as the SVG
 * fallback) and the scroll dissolve, where each node drifts outward and fades at its own
 * moment. All on the GPU — the CPU only writes a single uniform per frame.
 */
const DISSOLVE = /* glsl */ `
  attribute float aSeed;
  uniform float uDissolve;
  uniform float uRadius;
  varying float vFade;
  varying float vLife;

  vec4 dissolve(vec3 source) {
    float t = clamp((uDissolve - aSeed * 0.5) * 2.0, 0.0, 1.0);
    vec3 p = source + normalize(source) * t * t * uRadius;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float scale = length(modelViewMatrix[0].xyz);
    vFade = clamp((mv.z - center.z) / (2.0 * uRadius * scale) + 0.5, 0.0, 1.0);
    vLife = 1.0 - t;
    return mv;
  }
`;

const EDGE_VERTEX = /* glsl */ `
  ${DISSOLVE}
  void main() {
    gl_Position = projectionMatrix * dissolve(position);
  }
`;

const EDGE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  varying float vLife;
  void main() {
    gl_FragColor = vec4(uColor, (0.08 + 0.42 * vFade) * vLife * uOpacity);
    #include <colorspace_fragment>
  }
`;

const NODE_VERTEX = /* glsl */ `
  ${DISSOLVE}
  uniform float uPointScale;
  void main() {
    vec4 mv = dissolve(position);
    gl_PointSize = uPointScale * length(modelViewMatrix[0].xyz) * (1.0 + vFade);
    gl_Position = projectionMatrix * mv;
  }
`;

const NODE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  varying float vLife;
  void main() {
    gl_FragColor = vec4(uColor, (0.25 + 0.6 * vFade) * vLife * uOpacity);
    #include <colorspace_fragment>
  }
`;

const TRAIL_VERTEX = /* glsl */ `
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HEAD_VERTEX = /* glsl */ `
  uniform float uSize;
  varying float vAlpha;
  void main() {
    vAlpha = 1.0;
    gl_PointSize = uSize * length(modelViewMatrix[0].xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Amber: the one warm thing in the scene. uIntensity > 1 lets the bloom pass catch it. */
const ACCENT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uIntensity;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor * uIntensity, vAlpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

function material(
  vertexShader: string,
  fragmentShader: string,
  uniforms: ShaderMaterial['uniforms'],
) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
}

function buildForm() {
  const graph = createTopology();
  const random = seededRandom(3);
  const seeds = graph.nodes.map(() => random());

  const edgePositions = new Float32Array(graph.edges.length * 6);
  const edgeSeeds = new Float32Array(graph.edges.length * 2);
  graph.edges.forEach(([a, b], i) => {
    edgePositions.set(graph.nodes[a], i * 6);
    edgePositions.set(graph.nodes[b], i * 6 + 3);
    edgeSeeds[i * 2] = seeds[a];
    edgeSeeds[i * 2 + 1] = seeds[b];
  });
  const edgeGeometry = new BufferGeometry();
  edgeGeometry.setAttribute('position', new BufferAttribute(edgePositions, 3));
  edgeGeometry.setAttribute('aSeed', new BufferAttribute(edgeSeeds, 1));

  const nodeGeometry = new BufferGeometry();
  nodeGeometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(graph.nodes.flat()), 3),
  );
  nodeGeometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(seeds), 1));

  const trailPositions = new BufferAttribute(new Float32Array(TRAIL_SAMPLES * 3), 3);
  trailPositions.setUsage(DynamicDrawUsage);
  const trailAlpha = new Float32Array(TRAIL_SAMPLES).map(
    (_, k) => (k / (TRAIL_SAMPLES - 1)) ** 1.6,
  );
  const trailGeometry = new BufferGeometry();
  trailGeometry.setAttribute('position', trailPositions);
  trailGeometry.setAttribute('aAlpha', new BufferAttribute(trailAlpha, 1));

  const headPosition = new BufferAttribute(new Float32Array(3), 3);
  headPosition.setUsage(DynamicDrawUsage);
  const headGeometry = new BufferGeometry();
  headGeometry.setAttribute('position', headPosition);

  // One uniform object shared by edges and nodes: a single write moves both.
  const dissolve = { uDissolve: { value: 0 }, uRadius: { value: HERO_VIEW.radius } };
  const edgeMaterial = material(EDGE_VERTEX, EDGE_FRAGMENT, {
    ...dissolve,
    uColor: { value: new Color() },
    uOpacity: { value: 1 },
  });
  const nodeMaterial = material(NODE_VERTEX, NODE_FRAGMENT, {
    ...dissolve,
    uColor: { value: new Color() },
    uOpacity: { value: 1 },
    uPointScale: { value: 1 },
  });
  const trailMaterial = material(TRAIL_VERTEX, ACCENT_FRAGMENT, {
    uColor: { value: new Color() },
    uOpacity: { value: 1 },
    uIntensity: { value: 1 },
  });
  const headMaterial = material(HEAD_VERTEX, ACCENT_FRAGMENT, {
    uColor: { value: new Color() },
    uOpacity: { value: 1 },
    uIntensity: { value: 1 },
    uSize: { value: 5 },
  });

  const edges = new LineSegments(edgeGeometry, edgeMaterial);
  const nodes = new Points(nodeGeometry, nodeMaterial);
  const trail = new Line(trailGeometry, trailMaterial);
  const head = new Points(headGeometry, headMaterial);
  [edges, nodes, trail, head].forEach((object, order) => {
    object.frustumCulled = false; // vertices move in the shader; bounds would be stale
    object.renderOrder = order + 1; // no depth buffer use: painter's order instead
  });

  return {
    graph,
    objects: [edges, nodes, trail, head],
    dissolve,
    edgeMaterial,
    nodeMaterial,
    trailMaterial,
    headMaterial,
    trailPositions,
    headPosition,
    dispose() {
      [edgeGeometry, nodeGeometry, trailGeometry, headGeometry].forEach((g) => g.dispose());
      [edgeMaterial, nodeMaterial, trailMaterial, headMaterial].forEach((m) => m.dispose());
    },
  };
}

/** Random walk without immediate backtracking: one more hop for the packet. */
function extendRoute(route: number[], graph: Graph, random: () => number) {
  const end = route[route.length - 1];
  const previous = route[route.length - 2] ?? -1;
  const options = graph.neighbors[end].filter((n) => n !== previous);
  route.push(options[Math.floor(random() * options.length)] ?? previous);
}

interface TopologyProps {
  palette: Palette;
  /** Push the packet past 1.0 so the bloom pass picks it up (high tier, dark theme). */
  glow: boolean;
}

/**
 * The hero form: a geodesic node-and-edge graph — a network topology, drawn in ink-muted
 * hairlines with one amber packet travelling its edges. Slow idle rotation, a lerped tilt
 * toward the cursor, and a scroll-driven recede-and-dissolve. No physics, no bounce.
 */
export function Topology({ palette, glow }: TopologyProps) {
  const group = useRef<Group>(null);
  const height = useThree((s) => s.size.height);
  const dpr = useThree((s) => s.viewport.dpr);
  const form = useMemo(buildForm, []);

  const sim = useRef({
    spin: 0,
    tiltX: 0,
    tiltY: 0,
    progress: sceneState.progress,
    route: [...frontRoute(form.graph)],
    travelled: TRAIL_LENGTH,
    random: seededRandom(7),
  });

  useEffect(() => () => form.dispose(), [form]);

  useEffect(() => {
    form.edgeMaterial.uniforms.uColor.value.set(palette.muted);
    form.nodeMaterial.uniforms.uColor.value.set(palette.muted);
    form.trailMaterial.uniforms.uColor.value.set(palette.accent);
    form.headMaterial.uniforms.uColor.value.set(palette.accent);
  }, [form, palette]);

  useEffect(() => {
    form.headMaterial.uniforms.uIntensity.value = glow ? 1.8 : 1;
  }, [form, glow]);

  useEffect(() => {
    // Matches the SVG: nodes are 0.006 half-viewport-heights, doubled at the front.
    form.nodeMaterial.uniforms.uPointScale.value = 0.003 * height * dpr;
    form.headMaterial.uniforms.uSize.value = 5 * dpr;
    // WebGL lines are one device pixel: on dense screens, lift alpha to keep the weight.
    form.edgeMaterial.uniforms.uOpacity.value = Math.min(1.4, 0.6 + 0.4 * dpr);
  }, [form, height, dpr]);

  useFrame((_, delta) => {
    const object = group.current;
    if (!object) return;
    const dt = Math.min(delta, 0.1);
    const s = sim.current;

    s.spin += dt * SPIN_SPEED;
    const follow = 1 - Math.exp(-dt * 2.5);
    s.tiltX += (pointer.x - s.tiltX) * follow;
    s.tiltY += (pointer.y - s.tiltY) * follow;
    s.progress += (sceneState.progress - s.progress) * (1 - Math.exp(-dt * 10));

    const p = s.progress;
    object.rotation.set(
      HERO_VIEW.rotationX - s.tiltY * TILT_X,
      HERO_VIEW.rotationY + s.spin + s.tiltX * TILT_Y,
      0,
    );
    object.scale.setScalar(1 - 0.3 * p);
    object.position.z = -1.2 * p;
    form.dissolve.uDissolve.value = smoothstep(0.1, 0.95, p);

    // The packet: advance, extend the walk ahead of it, drop nodes behind the trail.
    s.travelled += dt * PACKET_SPEED;
    while (s.travelled >= s.route.length - 1) extendRoute(s.route, form.graph, s.random);
    const behind = Math.floor(s.travelled - TRAIL_LENGTH);
    if (behind > 0) {
      s.route.splice(0, behind);
      s.travelled -= behind;
    }

    const { nodes } = form.graph;
    const trail = form.trailPositions.array as Float32Array;
    for (let k = 0; k < TRAIL_SAMPLES; k++) {
      const at = Math.max(0, s.travelled - TRAIL_LENGTH * (1 - k / (TRAIL_SAMPLES - 1)));
      const i = Math.min(Math.floor(at), s.route.length - 2);
      const f = at - i;
      const a = nodes[s.route[i]];
      const b = nodes[s.route[i + 1]];
      trail[k * 3] = a[0] + (b[0] - a[0]) * f;
      trail[k * 3 + 1] = a[1] + (b[1] - a[1]) * f;
      trail[k * 3 + 2] = a[2] + (b[2] - a[2]) * f;
    }
    form.trailPositions.needsUpdate = true;
    (form.headPosition.array as Float32Array).set(trail.subarray((TRAIL_SAMPLES - 1) * 3));
    form.headPosition.needsUpdate = true;

    const packet = 1 - smoothstep(0, 0.3, p);
    form.trailMaterial.uniforms.uOpacity.value = packet;
    form.headMaterial.uniforms.uOpacity.value = packet;
  });

  return (
    <group ref={group} rotation={[HERO_VIEW.rotationX, HERO_VIEW.rotationY, 0]}>
      {form.objects.map((object) => (
        <primitive key={object.uuid} object={object} />
      ))}
    </group>
  );
}
