import { ImageResponse } from 'next/og';
import tokens from '@design-system/tokens.json';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const dark = (name: string) =>
  tokens.color.tokens.find((t) => t.name === name)?.value.dark ?? '#000';

/** The favicon mark at touch-icon size: a wireframe block with one amber node. */
export default function AppleIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="180" height="180">
<rect width="32" height="32" fill="${dark('surface-100')}"/>
<g fill="none" stroke="${dark('ink-muted')}" stroke-width="1" stroke-linejoin="miter">
<path d="M16 6 24.66 11v10L16 26l-8.66-5V11Z"/><path d="M7.34 11 16 16l8.66-5M16 16v10"/>
</g>
<rect x="14" y="14" width="4" height="4" fill="${dark('accent')}"/>
</svg>`;

  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element -- Satori renders <img>, not next/image
    <img
      src={`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`}
      width={180}
      height={180}
      alt=""
    />,
    size,
  );
}
