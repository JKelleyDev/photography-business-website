import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative h-[80vh] min-h-[500px] flex items-center justify-center bg-primary">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
        <div className="relative z-10 text-center text-white px-4 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            MAD <span className="text-accent">Photos</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-200 mb-8 max-w-xl mx-auto">
            Capturing your most meaningful moments with artistry and authenticity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/portfolio"
              className="px-8 py-3 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-light transition-colors"
            >
              View Portfolio
            </Link>
            <Link
              to="/pricing"
              className="px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="py-20 px-4 bg-surface">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-primary mb-4">What We Offer</h2>
          <p className="text-muted mb-12 max-w-2xl mx-auto">
            From weddings to portraits, we bring your vision to life with a personal touch.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Weddings', desc: 'Your love story, beautifully told through candid and curated shots.' },
              { title: 'Portraits', desc: 'Individual, family, and professional portraits that capture who you are.' },
              { title: 'Events', desc: 'Corporate events, parties, and milestones documented with care.' },
            ].map((item) => (
              <div key={item.title} className="bg-white p-8 rounded-xl shadow-sm">
                <h3 className="text-xl font-semibold text-primary mb-3">{item.title}</h3>
                <p className="text-muted text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to Book?</h2>
          <p className="text-gray-300 mb-8">
            Let&apos;s discuss your vision. We&apos;d love to hear about your upcoming event or session.
          </p>
          <Link
            to="/pricing"
            className="inline-block px-8 py-3 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-light transition-colors"
          >
            View Packages &amp; Inquire
          </Link>
        </div>
      </section>
    </div>
  );
}
