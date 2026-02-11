export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-primary mb-3">About Us</h1>
      </div>

      <div className="space-y-8">
        <div className="bg-surface rounded-xl p-8">
          <h2 className="text-2xl font-bold text-primary mb-4">Our Story</h2>
          <p className="text-gray-600 leading-relaxed">
            MAD Photos was born from a passion for storytelling through images. We believe every moment
            has a story worth preserving, and our mission is to capture those stories with authenticity,
            creativity, and care.
          </p>
        </div>
        <div className="bg-surface rounded-xl p-8">
          <h2 className="text-2xl font-bold text-primary mb-4">Our Approach</h2>
          <p className="text-gray-600 leading-relaxed">
            We blend candid moments with artfully directed shots to create a gallery that feels natural
            yet polished. Every session is tailored to reflect your personality and vision.
          </p>
        </div>
        <div className="bg-surface rounded-xl p-8">
          <h2 className="text-2xl font-bold text-primary mb-4">Get in Touch</h2>
          <p className="text-gray-600 leading-relaxed">
            We&apos;d love to hear from you. Whether you have a question, want to book a session, or
            just want to say hello, don&apos;t hesitate to reach out.
          </p>
        </div>
      </div>
    </div>
  );
}
