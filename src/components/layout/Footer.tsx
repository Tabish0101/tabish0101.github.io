import { Download } from 'lucide-react';
import { site } from '@/content/site';
import { hasResume } from '@/lib/resume';
import { SocialLinks } from '../ui/SocialLinks';

/** Colophon. No duplicate nav, no back-to-top: Lenis and the logo handle that. */
export function Footer() {
    return (
        <footer id="footer" className="border-t border-border">
            <div className="column flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
                <p className="text-caption text-ink-muted">
                    © {new Date().getFullYear()} {site.name}
                </p>
                {/* <p className="text-caption text-ink-muted">Built with Next.js, Three.js, GSAP</p> */}
                <div className="flex items-center gap-4">
                    {hasResume ? (
                        <a
                            href={site.resumePath}
                            className="underline-draw text-label text-ink"
                            download
                            data-magnetic
                        >
                            Résumé
                            <Download size={16} strokeWidth={1.5} aria-hidden="true" />
                            <span className="sr-only">(PDF)</span>
                        </a>
                    ) : null}
                    <SocialLinks />
                </div>
            </div>
        </footer>
    );
}
