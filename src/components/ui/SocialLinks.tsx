import { socials } from '@/content/site';
import { cn } from '@/lib/cn';
import { BrandIcon } from './BrandIcon';

/** Icon-only, ink-muted, amber on hover, magnetic on desktop. */
export function SocialLinks({ className }: { className?: string }) {
  return (
    <ul className={cn('-mx-2 flex items-center', className)}>
      {socials.map((social) => (
        <li key={social.label}>
          <a
            href={social.href}
            className="icon-btn"
            target="_blank"
            rel="me noopener noreferrer"
            aria-label={`${social.label} (opens in a new tab)`}
            data-magnetic
            data-cursor="open"
          >
            <BrandIcon name={social.label} />
          </a>
        </li>
      ))}
    </ul>
  );
}
