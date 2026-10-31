import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { Button, Card, Field, Input, PageHeader, Textarea } from '../../components/admin/ui';

export default function ProjectNew() {
  const [form, setForm] = useState({ title: '', description: '', client_email: '', client_name: '', categories: '' });
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const inqId = searchParams.get('inquiryId');
    if (inqId) {
      setInquiryId(inqId);
      api.get(`/admin/inquiries/${inqId}`).then(({ data }) => {
        setForm({
          title: `${data.name} - Photography Session`,
          description: [data.message, data.event_date ? `Event date: ${data.event_date}` : '', data.event_time ? `Event time: ${data.event_time}` : ''].filter(Boolean).join('\n'),
          client_email: data.email,
          client_name: data.name,
          categories: '',
        });
      }).catch(() => {});
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/admin/projects', {
        ...form,
        categories: form.categories.split(',').map((c) => c.trim()).filter(Boolean),
        inquiry_id: inquiryId,
      });
      navigate(`/admin/projects/${data.id}`);
    } catch (err) {
      console.error('Failed to create project', err);
    } finally {
      setSubmitting(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="max-w-2xl">
      <PageHeader title="New project"
        description={inquiryId ? 'Filled in from the inquiry. Check the details, then create it.' : 'Set up a shoot so you can upload and deliver the photos.'} />
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
          <Field label="Project title">{(id) => <Input id={id} required value={form.title} onChange={set('title')} placeholder="Smith wedding" />}</Field>
          <Field label="Description">{(id) => <Textarea id={id} rows={3} value={form.description} onChange={set('description')} />}</Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Client email" hint="We'll create an account if they don't have one.">
              {(id) => <Input id={id} type="email" required value={form.client_email} onChange={set('client_email')} placeholder="client@example.com" />}
            </Field>
            <Field label="Client name">{(id) => <Input id={id} value={form.client_name} onChange={set('client_name')} />}</Field>
          </div>
          <Field label="Photo categories" hint="Separate with commas.">
            {(id) => <Input id={id} value={form.categories} onChange={set('categories')} placeholder="Ceremony, Reception, Getting ready" />}
          </Field>
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create project'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
