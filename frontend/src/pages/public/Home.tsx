import { Link } from 'react-router-dom';

const services = [
  {
    title: 'Weddings',
    description:
      'Your love story, beautifully told through candid moments and curated compositions.',
  },
  {
    title: 'Portraits',
    description:
      'Individual, family, and professional portraits that capture personality and presence.',
  },
  {
    title: 'Events',
    description:
      'Corporate events, parties, and milestones documented with care and precision.',
  },
  {
    title: 'Editorial',
    description:
      'Creative, narrative-driven photography for publications and brand storytelling.',
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <p className="text-sm text-muted-foreground mb-4 tracking-widest uppercase">
              MAD Photography
            </p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-light leading-tight tracking-tight text-balance">
              Capturing moments that tell your story
            </h1>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-xl">
              Specializing in portrait, wedding, and event photography. Creating timeless
              imagery with a modern, minimalist approach.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                to="/portfolio"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-medium"
              >
                View Portfolio
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-border hover:bg-secondary transition-colors text-sm font-medium"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 md:py-32 border-t border-border">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm text-muted-foreground mb-2 tracking-widest uppercase">
              Services
            </p>
            <h2 className="text-3xl md:text-4xl font-serif font-light">
              What we offer
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <div
                key={service.title}
                className="p-8 rounded-lg bg-card border border-border hover:border-stone/30 transition-colors"
              >
                <h3 className="text-lg font-medium mb-3">{service.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-serif font-light mb-6 text-balance">
              Ready to create something beautiful?
            </h2>
            <p className="text-lg text-background/70 mb-10 leading-relaxed">
              Let&apos;s discuss your vision and bring it to life. Reach out to explore how
              we can work together.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-10 py-3 rounded-full bg-background text-foreground hover:bg-background/90 transition-colors text-sm font-medium"
            >
              View Packages &amp; Inquire
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
