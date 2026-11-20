import { contact, site } from '@/content/site';
import { sectionMeta } from '@/content/sections';
import { ContactForm } from '../contact/ContactForm';
import { CopyEmail } from '../contact/CopyEmail';
import { SectionHeader } from '../ui/SectionHeader';
import { SocialLinks } from '../ui/SocialLinks';

/** 06 — one CTA (the address, large and amber) and one form. */
export function Contact() {
  const meta = sectionMeta('contact');

  return (
    <section id="contact" className="section pb-24" aria-labelledby="contact-title">
      <div className="column">
        <SectionHeader meta={meta} title={contact.title} />

        <div className="flex flex-col gap-4 border-b border-border pb-12" data-reveal>
          <a
            href={`mailto:${site.email}`}
            className="link inline-block self-start text-h3 break-all sm:text-h2 md:text-h1"
            data-magnetic
            data-cursor="send"
          >
            {site.email}
          </a>
          <CopyEmail email={site.email} />
        </div>

        <div className="mt-12 grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] md:gap-16">
          <div className="flex flex-col gap-6" data-reveal>
            <p className="max-w-[40ch] text-body text-ink-muted">{contact.intro}</p>
            <div className="flex flex-col gap-2">
              <p className="text-label text-ink-muted">Elsewhere</p>
              <SocialLinks />
            </div>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
