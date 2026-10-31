import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'How it started',
    body: 'MAD Photos began with a simple idea: every moment has a story worth keeping. We photograph those stories honestly, with care for the people in them.',
  },
  {
    title: 'How we work',
    body: 'Mostly candid, with a few directed frames where they help. Every session is planned around you, so the gallery feels like your day and not a template.',
  },
];

export default function About() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20 lg:px-8">
      <h1 className="mb-14 max-w-4xl font-serif text-5xl font-light leading-[1.05] tracking-[-0.02em] md:mb-20 md:text-7xl">
        The people behind the camera
      </h1>

      <div className="grid gap-12 md:grid-cols-12">
        {sections.map((s, i) => (
          <div key={s.title} className={`md:col-span-5 ${i === 1 ? 'md:col-start-7' : ''}`}>
            <h2 className="mb-3 border-t-2 border-ink pt-4 font-serif text-2xl font-light">{s.title}</h2>
            <p className="max-w-prose font-serif text-xl leading-[1.6] text-ink/85">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-20 border-t border-tray pt-10">
        <p className="max-w-xl text-[17px] leading-relaxed text-fixer">
          Have a question, or want to book a session? We&apos;d like to hear from you.
        </p>
        <Link to="/pricing" className="mt-6 inline-block rounded-sm bg-ink px-6 py-3.5 text-[15px] font-medium text-paper hover:bg-ink/90">
          Send an inquiry
        </Link>
      </div>
    </section>
  );
}
