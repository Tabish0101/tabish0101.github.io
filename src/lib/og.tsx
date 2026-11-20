import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import tokens from '@design-system/tokens.json';
import { site } from '@/content/site';
import { createTopology, depthFade, frontRoute, HERO_VIEW, project, rotate } from '@/lib/topology';

export const ogSize = { width: 1200, height: 630 };
export const ogAlt = `${site.name} — ${site.positioning}`;

const dark = (name: string) =>
  tokens.color.tokens.find((t) => t.name === name)?.value.dark ?? '#000';

/** Satori reads TTF/OTF/WOFF (not WOFF2): the @fontsource packages ship WOFF. */
const font = (pkg: string, file: string) =>
  readFile(join(process.cwd(), 'node_modules', '@fontsource', pkg, 'files', file));

/** The hero topology as an SVG string, in the same pose — the card matches the page. */
function topologySvg(size: number) {
  const topology = createTopology();
  const points = topology.nodes.map((n) =>
    project(rotate(n, HERO_VIEW.rotationX, HERO_VIEW.rotationY)),
  );
  const stroke = 2 / size; // 1px in viewBox units
  const lines = topology.edges
    .map(([a, b]) => {
      const fade = depthFade((points[a].depth + points[b].depth) / 2);
      return `<line x1="${points[a].x.toFixed(4)}" y1="${points[a].y.toFixed(4)}" x2="${points[b].x.toFixed(4)}" y2="${points[b].y.toFixed(4)}" stroke-opacity="${(0.1 + 0.5 * fade).toFixed(3)}"/>`;
    })
    .join('');
  const nodes = points
    .map((p) => {
      const s = (0.006 * (1 + depthFade(p.depth))).toFixed(4);
      return `<rect x="${(p.x - Number(s) / 2).toFixed(4)}" y="${(p.y - Number(s) / 2).toFixed(4)}" width="${s}" height="${s}" fill-opacity="${(0.3 + 0.6 * depthFade(p.depth)).toFixed(3)}"/>`;
    })
    .join('');
  const route = frontRoute(topology)
    .map((i, n) => `${n ? 'L' : 'M'}${points[i].x.toFixed(4)} ${points[i].y.toFixed(4)}`)
    .join(' ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 2 2" width="${size}" height="${size}">
<g fill="none" stroke="${dark('ink-muted')}" stroke-width="${stroke}" stroke-linecap="square">${lines}</g>
<g fill="${dark('ink-muted')}">${nodes}</g>
<path d="${route}" fill="none" stroke="${dark('accent')}" stroke-width="${stroke * 2}" stroke-linecap="square"/>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/** Social card: the hero, flattened. Surface-100 ground, ink type, amber used twice. */
export async function renderOgImage() {
  const [grotesk700, grotesk500, mono400] = await Promise.all([
    font('space-grotesk', 'space-grotesk-latin-700-normal.woff'),
    font('space-grotesk', 'space-grotesk-latin-500-normal.woff'),
    font('jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'),
  ]);

  const { width, height } = ogSize;
  const mono = { fontFamily: 'JetBrains Mono', fontSize: 22, color: dark('ink-muted') };

  return new ImageResponse(
    <div
      style={{
        width,
        height,
        display: 'flex',
        position: 'relative',
        backgroundColor: dark('surface-100'),
        fontFamily: 'Space Grotesk',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders <img>, not next/image */}
      <img
        src={topologySvg(height)}
        width={height}
        height={height}
        alt=""
        style={{
          position: 'absolute',
          top: 0,
          left: width * (0.5 + HERO_VIEW.offset) - height / 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 72px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', ...mono }}>
          <span>01 / INDEX</span>
          <span>{site.coordinates}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={mono}>
            {site.role} · {site.location}
          </span>
          <span
            style={{
              marginTop: 16,
              fontSize: 104,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: dark('ink'),
            }}
          >
            {site.name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 24, gap: 20 }}>
            <div style={{ width: 48, height: 4, backgroundColor: dark('accent') }} />
            <span style={{ fontSize: 34, fontWeight: 500, color: dark('ink-muted') }}>
              {site.positioning}
            </span>
          </div>
        </div>
      </div>
    </div>,
    {
      ...ogSize,
      fonts: [
        { name: 'Space Grotesk', data: grotesk700, weight: 700, style: 'normal' },
        { name: 'Space Grotesk', data: grotesk500, weight: 500, style: 'normal' },
        { name: 'JetBrains Mono', data: mono400, weight: 400, style: 'normal' },
      ],
    },
  );
}
