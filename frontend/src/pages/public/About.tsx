export default function About() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-3xl mb-20">
          <p className="text-sm text-muted-foreground mb-2 tracking-widest uppercase">
            About
          </p>
          <h1 className="text-3xl md:text-5xl font-serif font-light tracking-tight text-balance">
            The people behind the lens
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
              Our Story
            </h2>
            <p className="text-foreground leading-relaxed">
              MAD Photos was born from a passion for storytelling through images. We
              believe every moment has a story worth preserving, and our mission is to
              capture those stories with authenticity, creativity, and care.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
              Our Approach
            </h2>
            <p className="text-foreground leading-relaxed">
              We blend candid moments with artfully directed shots to create a gallery
              that feels natural yet polished. Every session is tailored to reflect your
              personality and vision.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
              Get in Touch
            </h2>
            <p className="text-foreground leading-relaxed">
              We&apos;d love to hear from you. Whether you have a question, want to book
              a session, or just want to say hello, don&apos;t hesitate to reach out.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
