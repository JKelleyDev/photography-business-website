import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { PortfolioItem } from '../../types';
import FadeImage from '../../components/ui/FadeImage';
import { heroDesktop, heroMobile } from '../../content/hero';

const services = [
  { title: 'Weddings', category: 'Wedding', description: 'The whole day, from getting ready to the last dance, mostly unposed.' },
  { title: 'Portraits', category: 'Portrait', description: 'Individuals, families and headshots, in studio or somewhere that means something to you.' },
  { title: 'Events', category: 'Event', description: 'Parties, milestones and company events, covered quietly from the edges of the room.' },
  { title: 'Editorial', category: 'Editorial', description: 'Story-led photography for publications and brands.' },
];

const frameNo = (i: number) => String(i + 1).padStart(2, '0');
const hasStaticHero = Boolean(heroDesktop || heroMobile);

/** Fallback when no built-in hero exists: pick the first portfolio photo whose shape suits the screen. */
function usePortfolioHero(items: PortfolioItem[]) {
  const [pick, setPick] = useState<PortfolioItem | null>(null);
  useEffect(() => {
    if (hasStaticHero || !items.length) return;
    const wantLandscape = window.matchMedia('(min-width: 768px)').matches;
    let cancelled = false;
    Promise.all(
      items.map(
        (item) =>
          new Promise<{ item: PortfolioItem; ratio: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ item, ratio: img.naturalWidth / img.naturalHeight });
            img.onerror = () => resolve({ item, ratio: 0 });
            img.src = item.thumbnail_url || '';
          }),
      ),
    ).then((sized) => {
      if (cancelled) return;
      const fit = sized.find((s) => (wantLandscape ? s.ratio >= 1.3 : s.ratio > 0 && s.ratio <= 0.85));
      setPick((fit ?? sized.find((s) => s.ratio > 0))?.item ?? null);
    });
    return () => { cancelled = true; };
  }, [items]);
  return pick;
}

export default function Home() {
  const [items, setItems] = useState<PortfolioItem[]>([]);

  useEffect(() => {
    api.get('/portfolio', { params: { limit: '12' } })
      .then(({ data }) => setItems(data.items ?? []))
      .catch((err) => console.error('Failed to load portfolio', err));
  }, []);

  const hero = usePortfolioHero(items);
  const strip = items;
  const photoFor = (category: string, fallback: number) =>
    items.find((i) => i.category?.toLowerCase().startsWith(category.toLowerCase())) ?? items[fallback];

  return (
    <>
      {/* Hero: the lead frame, full bleed */}
      <section className="relative h-[100svh] min-h-[560px] overflow-hidden bg-ink text-paper">
        {hasStaticHero ? (
          <picture>
            {heroDesktop && <source media="(min-width: 768px)" srcSet={heroDesktop} />}
            <img src={heroMobile || heroDesktop} alt="" fetchPriority="high"
              className="develop absolute inset-0 h-full w-full object-cover" />
          </picture>
        ) : (
          hero && (
            <img src={hero.image_url || hero.thumbnail_url || ''} alt="" fetchPriority="high"
              className="develop absolute inset-0 h-full w-full object-cover object-[50%_35%]" />
          )
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-ink/30" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 sm:px-6 md:pb-20 lg:px-8">
          <h1 className="max-w-4xl font-serif text-[2.75rem] font-light leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-[5.5rem]">
            Photographs of the days you&apos;ll want back
          </h1>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-paper/80">
            Weddings, portraits and events, made by MAD Photos.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/portfolio" className="rounded-sm bg-paper px-6 py-3.5 text-[15px] font-medium text-ink hover:bg-white">
              See the work
            </Link>
            <Link to="/pricing" className="rounded-sm border border-paper/60 px-6 py-3.5 text-[15px] font-medium hover:bg-paper/10">
              Check your date
            </Link>
          </div>
        </div>
      </section>

      {/* Recent frames: a slow, looping film strip (pauses on hover/focus, static with reduced motion) */}
      <section aria-label="Recent frames" className="border-b border-tray py-10 md:py-14">
        <div className="mx-auto mb-4 flex max-w-7xl items-baseline justify-between px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl font-light">Recent frames</h2>
          <Link to="/portfolio" className="border-b border-ink text-[15px] hover:border-safelight">
            Full portfolio
          </Link>
        </div>
        <div className="filmstrip-wrap no-scrollbar overflow-x-auto motion-safe:overflow-hidden">
          <ol
            className="filmstrip flex w-max gap-2 px-2"
            style={{ ['--strip-duration' as string]: `${Math.max(strip.length, 6) * 5}s` }}
          >
            {(strip.length ? [...strip, ...strip] : Array.from({ length: 12 }, () => null)).map((item, i) => {
              const n = strip.length ? i % strip.length : i;
              const duplicate = strip.length > 0 && i >= strip.length;
              return (
                <li key={i} aria-hidden={duplicate || undefined} className="w-[38vw] shrink-0 sm:w-[22vw] lg:w-[14vw]">
                  <Link to="/portfolio" tabIndex={duplicate ? -1 : undefined} className="group block">
                    <div className="skeleton aspect-[2/3] overflow-hidden">
                      {item && (
                        <FadeImage src={item.thumbnail_url || ''} alt={item.title}
                          className="h-full w-full object-cover group-hover:opacity-85" />
                      )}
                    </div>
                    <span className="mt-1.5 block font-mono text-[11px] tabular-nums text-fixer">{frameNo(n)}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Services as an editorial list */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
        <h2 className="mb-10 max-w-xl font-serif text-4xl font-light leading-tight md:text-5xl">
          What we photograph
        </h2>
        <ul className="border-t border-tray">
          {services.map((s, i) => {
            const photo = photoFor(s.category, i + 1);
            return (
              <li key={s.title} className="grid grid-cols-[88px_1fr] items-center gap-4 border-b border-tray py-5 sm:grid-cols-[140px_1fr] md:grid-cols-12 md:gap-8 md:py-8">
                <div className="skeleton aspect-[4/5] overflow-hidden md:col-span-2">
                  {photo && <FadeImage src={photo.thumbnail_url || ''} alt="" className="h-full w-full object-cover" />}
                </div>
                <h3 className="font-serif text-3xl font-light md:col-span-4 md:text-5xl">{s.title}</h3>
                <p className="col-span-2 max-w-md text-[17px] leading-relaxed text-fixer sm:col-span-1 sm:col-start-2 md:col-span-5 md:col-start-8">
                  {s.description}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Booking CTA */}
      <section className="bg-ink text-paper">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 md:grid-cols-12 md:py-28 lg:px-8">
          <h2 className="font-serif text-4xl font-light leading-tight md:col-span-7 md:text-6xl">
            Dates book up months ahead. Tell us yours.
          </h2>
          <div className="md:col-span-4 md:col-start-9 md:self-end">
            <p className="mb-6 text-[17px] leading-relaxed text-paper/75">
              See packages and send an inquiry. We reply within 24 hours.
            </p>
            <Link to="/pricing" className="inline-block rounded-sm bg-safelight px-6 py-3.5 text-[15px] font-medium text-white hover:bg-safelight/90">
              Check your date
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
