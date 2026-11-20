/**
 * Topology — the hero's node-and-edge polyhedron, as plain math.
 *
 * Shared by the WebGL scene (turned into three.js buffers) and the server-rendered SVG
 * fallback, so both draw the same graph from the same pose. No three.js import here:
 * this module also runs on the server.
 */

export type Vec3 = [number, number, number];

export interface Topology {
  nodes: Vec3[];
  edges: Array<[number, number]>;
  neighbors: number[][];
}

/** Camera and pose shared by the 3D scene and the SVG fallback. */
export const HERO_VIEW = {
  /** Vertical field of view, degrees. */
  fov: 35,
  /** Camera distance on z. */
  distance: 7,
  /** Polyhedron circumradius, world units. */
  radius: 1.6,
  /** Icosphere subdivisions: 1 → 42 nodes, 120 edges. */
  detail: 1,
  /** Initial pose, radians (Euler XYZ, as three.js applies it). */
  rotationX: 0.42,
  rotationY: 0.62,
  /** The object's center sits this fraction of the viewport width right of center. */
  offset: 0.19,
} as const;

const PHI = (1 + Math.sqrt(5)) / 2;

const ICOSAHEDRON: Vec3[] = [
  [-1, PHI, 0],
  [1, PHI, 0],
  [-1, -PHI, 0],
  [1, -PHI, 0],
  [0, -1, PHI],
  [0, 1, PHI],
  [0, -1, -PHI],
  [0, 1, -PHI],
  [PHI, 0, -1],
  [PHI, 0, 1],
  [-PHI, 0, -1],
  [-PHI, 0, 1],
];

const FACES: Array<[number, number, number]> = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
];

function normalize([x, y, z]: Vec3): Vec3 {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

/** Geodesic polyhedron: an icosahedron subdivided `detail` times, projected onto a sphere. */
export function createTopology(
  detail: number = HERO_VIEW.detail,
  radius: number = HERO_VIEW.radius,
): Topology {
  const vertices: Vec3[] = ICOSAHEDRON.map(normalize);
  let faces: Array<[number, number, number]> = FACES.map(([a, b, c]) => [a, b, c]);

  for (let level = 0; level < detail; level++) {
    const midpoints = new Map<string, number>();
    const midpoint = (a: number, b: number): number => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const cached = midpoints.get(key);
      if (cached !== undefined) return cached;
      const [ax, ay, az] = vertices[a];
      const [bx, by, bz] = vertices[b];
      const index = vertices.push(normalize([(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2])) - 1;
      midpoints.set(key, index);
      return index;
    };

    faces = faces.flatMap(([a, b, c]): Array<[number, number, number]> => {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      return [
        [a, ab, ca],
        [b, bc, ab],
        [c, ca, bc],
        [ab, bc, ca],
      ];
    });
  }

  const seen = new Set<string>();
  const edges: Array<[number, number]> = [];
  for (const [a, b, c] of faces) {
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const lo = Math.min(u, v);
      const hi = Math.max(u, v);
      const key = `${lo}:${hi}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([lo, hi]);
    }
  }

  const nodes = vertices.map(([x, y, z]): Vec3 => [x * radius, y * radius, z * radius]);
  const neighbors = nodes.map((): number[] => []);
  for (const [a, b] of edges) {
    neighbors[a].push(b);
    neighbors[b].push(a);
  }

  return { nodes, edges, neighbors };
}

/** Breadth-first shortest path, by edge count, between two nodes (inclusive). */
export function shortestPath(topology: Topology, from: number, to: number): number[] {
  const previous = new Int32Array(topology.nodes.length).fill(-1);
  previous[from] = from;
  const queue = [from];
  for (let head = 0; head < queue.length && previous[to] === -1; head++) {
    const node = queue[head];
    for (const next of topology.neighbors[node]) {
      if (previous[next] !== -1) continue;
      previous[next] = node;
      queue.push(next);
    }
  }
  if (previous[to] === -1) return [from];
  const path = [to];
  while (path[0] !== from) path.unshift(previous[path[0]]);
  return path;
}

/** Deterministic PRNG (mulberry32): the same "random" layout on the server and the client. */
export function seededRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rotate by Euler XYZ, the three.js default order: v' = Rx · Ry · v (rotation z = 0). */
export function rotate([x, y, z]: Vec3, rx: number, ry: number): Vec3 {
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  return [x1, y * cx - z1 * sx, y * sx + z1 * cx];
}

/**
 * Perspective projection matching the hero camera, in units of half the viewport height,
 * with the object's center at the origin and y pointing down (SVG space).
 */
export function project([x, y, z]: Vec3): { x: number; y: number; depth: number } {
  const scale = Math.tan((HERO_VIEW.fov * Math.PI) / 360);
  const depth = HERO_VIEW.distance - z;
  return { x: x / (depth * scale), y: -y / (depth * scale), depth };
}

/** 0 for the farthest point of the sphere, 1 for the nearest. */
export function depthFade(depth: number): number {
  const near = HERO_VIEW.distance - HERO_VIEW.radius;
  const far = HERO_VIEW.distance + HERO_VIEW.radius;
  return Math.min(1, Math.max(0, (far - depth) / (far - near)));
}

/**
 * A route across the front face in the initial pose: from the nearest node to a node four
 * hops away. Used by the SVG fallback's animated packet; the WebGL scene routes at random.
 */
export function frontRoute(topology: Topology): number[] {
  const posed = topology.nodes.map((n) => rotate(n, HERO_VIEW.rotationX, HERO_VIEW.rotationY));
  let source = 0;
  posed.forEach((p, i) => {
    if (p[2] > posed[source][2]) source = i;
  });
  const candidates = posed
    .map((p, i) => ({ i, z: p[2], hops: shortestPath(topology, source, i).length - 1 }))
    .filter((c) => c.hops === 4)
    .sort((a, b) => b.z - a.z);
  return shortestPath(topology, source, candidates[0]?.i ?? source);
}
