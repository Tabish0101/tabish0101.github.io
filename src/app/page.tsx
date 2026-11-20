import { Footer } from '@/components/layout/Footer';
import { JsonLd } from '@/components/layout/JsonLd';
import { Loader } from '@/components/layout/Loader';
import { Nav } from '@/components/layout/Nav';
import { Motion } from '@/components/motion/Motion';
import { About } from '@/components/sections/About';
import { Contact } from '@/components/sections/Contact';
import { Experience } from '@/components/sections/Experience';
import { Hero } from '@/components/sections/Hero';
import { Skills } from '@/components/sections/Skills';
import { Work } from '@/components/sections/Work';
import { Writing } from '@/components/sections/Writing';
import { hasSection } from '@/content/sections';

/**
 * One page, server-rendered and static. Everything below is complete HTML before any
 * JavaScript runs; the client islands (theme, menu, rows, form, 3D, motion) enhance it.
 */
export default function Home() {
  return (
    <>
      <Loader />
      <a href="#main" className="skip-link btn btn-primary">
        Skip to content
      </a>
      <Nav />
      <main id="main" tabIndex={-1}>
        <Hero />
        <About />
        <Work />
        <Experience />
        <Skills />
        {hasSection('writing') ? <Writing /> : null}
        <Contact />
      </main>
      <Footer />
      <Motion />
      <JsonLd />
    </>
  );
}
