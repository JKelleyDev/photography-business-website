import { useState, useEffect } from 'react';
import api from '../../api/client';
import { PricingPackage } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function Pricing() {
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '', event_date: '', event_time: '', event_duration: '' });
  const [timeMode, setTimeMode] = useState<'preset' | 'specific'>('preset');
  const [specificHour, setSpecificHour] = useState('12');
  const [specificMinute, setSpecificMinute] = useState('00');
  const [specificAmPm, setSpecificAmPm] = useState('PM');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get('/pricing').then(({ data }) => setPackages(data.packages)).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/inquiries', {
        ...formData,
        package_id: selectedPkg,
        event_date: formData.event_date || null,
        event_time: formData.event_time || null,
        event_duration: formData.event_duration || null,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit inquiry', err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  const inputClass =
    'w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-stone/30 focus:border-stone outline-none text-sm';

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm text-muted-foreground mb-2 tracking-widest uppercase">
            Pricing
          </p>
          <h1 className="text-3xl md:text-4xl font-serif font-light mb-4">
            Packages & Sessions
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Choose a package that fits your needs, or reach out for a custom quote.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex flex-col p-8 rounded-lg bg-card border border-border hover:border-stone/30 transition-colors"
            >
              <h3 className="text-xl font-serif font-light mb-2">{pkg.name}</h3>
              <p className="text-2xl font-serif font-light text-stone mb-6">
                {pkg.is_custom ? 'Custom Quote' : pkg.price_display || formatCurrency(pkg.price_cents)}
              </p>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{pkg.description}</p>
              <ul className="flex-1 space-y-3 mb-8">
                {pkg.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-stone mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setSelectedPkg(pkg.id); setShowForm(true); }}
                className={`w-full px-6 py-3 rounded-full text-sm font-medium transition-colors ${
                  pkg.is_custom
                    ? 'border border-border hover:bg-secondary'
                    : 'bg-foreground text-background hover:bg-foreground/90'
                }`}
              >
                {pkg.is_custom ? 'Request Quote' : 'Inquire'}
              </button>
            </div>
          ))}
        </div>

        <div id="inquiry" className="max-w-xl mx-auto">
          {!showForm ? (
            <div className="text-center">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center justify-center px-10 py-3 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-medium"
              >
                Inquire About Custom Packages
              </button>
            </div>
          ) : submitted ? (
            <div className="text-center py-16 rounded-lg border border-border bg-card">
              <svg className="w-12 h-12 text-stone mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="text-xl font-serif font-light mb-2">Inquiry Sent</h3>
              <p className="text-muted-foreground">We&apos;ll get back to you within 24 hours.</p>
            </div>
          ) : (
            <div className="p-8 rounded-lg border border-border bg-card">
              <h2 className="text-2xl font-serif font-light mb-8">Send an Inquiry</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="(555)-555-5555"
                    value={formData.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      let formatted = digits;
                      if (digits.length > 6) formatted = `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
                      else if (digits.length > 3) formatted = `(${digits.slice(0, 3)})-${digits.slice(3)}`;
                      else if (digits.length > 0) formatted = `(${digits}`;
                      setFormData({ ...formData, phone: formatted });
                    }}
                    pattern="\(\d{3}\)-\d{3}-\d{4}"
                    title="Phone number in (xxx)-xxx-xxxx format"
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Event Date</label>
                    <input
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Event Time</label>
                    <select
                      value={timeMode === 'specific' ? 'specific' : formData.event_time}
                      onChange={(e) => {
                        if (e.target.value === 'specific') {
                          setTimeMode('specific');
                          setFormData({ ...formData, event_time: `12:00 PM` });
                        } else {
                          setTimeMode('preset');
                          setFormData({ ...formData, event_time: e.target.value });
                        }
                      }}
                      className={inputClass}
                    >
                      <option value="">Select a time…</option>
                      <option value="Morning (8am – 12pm)">Morning (8am – 12pm)</option>
                      <option value="Afternoon (12pm – 5pm)">Afternoon (12pm – 5pm)</option>
                      <option value="Evening (5pm – 9pm)">Evening (5pm – 9pm)</option>
                      <option value="specific">Specific time…</option>
                    </select>
                    {timeMode === 'specific' && (
                      <div className="flex gap-2 mt-2">
                        <select
                          value={specificHour}
                          onChange={(e) => { setSpecificHour(e.target.value); setFormData({ ...formData, event_time: `${e.target.value}:${specificMinute} ${specificAmPm}` }); }}
                          className={inputClass}
                        >
                          {['1','2','3','4','5','6','7','8','9','10','11','12'].map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <select
                          value={specificMinute}
                          onChange={(e) => { setSpecificMinute(e.target.value); setFormData({ ...formData, event_time: `${specificHour}:${e.target.value} ${specificAmPm}` }); }}
                          className={inputClass}
                        >
                          {['00','15','30','45'].map((m) => <option key={m} value={m}>:{m}</option>)}
                        </select>
                        <select
                          value={specificAmPm}
                          onChange={(e) => { setSpecificAmPm(e.target.value); setFormData({ ...formData, event_time: `${specificHour}:${specificMinute} ${e.target.value}` }); }}
                          className={inputClass}
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Event Duration</label>
                  <input
                    type="text"
                    placeholder="2 hours"
                    value={formData.event_duration}
                    onChange={(e) => setFormData({ ...formData, event_duration: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Message *</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your event or session..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Sending...' : 'Send Inquiry'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
