import { useState, useEffect } from 'react';
import api from '../../api/client';
import { PricingPackage } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function Pricing() {
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '', event_date: '', event_time: '', event_duration: '' });
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-primary mb-3">Pricing</h1>
        <p className="text-muted max-w-xl mx-auto">
          Choose a package that fits your needs, or reach out for a custom quote.
        </p>
      </div>

      {/* Packages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {packages.map((pkg) => (
          <div key={pkg.id} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold text-primary mb-2">{pkg.name}</h3>
            <p className="text-2xl font-bold text-accent mb-4">
              {pkg.is_custom ? 'Custom Quote' : pkg.price_display || formatCurrency(pkg.price_cents)}
            </p>
            <p className="text-muted text-sm mb-4">{pkg.description}</p>
            <ul className="flex-1 space-y-2 mb-6">
              {pkg.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => { setSelectedPkg(pkg.id); setShowForm(true); }}
              variant={pkg.is_custom ? 'secondary' : 'primary'}
              className="w-full"
            >
              {pkg.is_custom ? 'Request Quote' : 'Inquire'}
            </Button>
          </div>
        ))}
      </div>

      {/* Inquiry Form */}
      <div id="inquiry" className="max-w-xl mx-auto">
        {!showForm ? (
          <div className="text-center">
            <Button onClick={() => setShowForm(true)} size="lg">
              Inquire About Custom Packages
            </Button>
          </div>
        ) : submitted ? (
          <div className="text-center py-12 bg-green-50 rounded-xl">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-xl font-semibold text-primary mb-2">Inquiry Sent!</h3>
            <p className="text-muted">We&apos;ll get back to you within 24 hours.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-primary mb-6">Send an Inquiry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Time</label>
                  <input
                    type="time"
                    value={formData.event_time}
                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Duration</label>
                <input
                  type="text"
                  placeholder="2 hours"
                  value={formData.event_duration}
                  onChange={(e) => setFormData({ ...formData, event_duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us about your event or session..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? 'Sending...' : 'Send Inquiry'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
