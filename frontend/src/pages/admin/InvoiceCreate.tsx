import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { User, Project } from '../../types';
import { Button, Card, Field, Input, PageHeader, Select } from '../../components/admin/ui';
import LineItems, { LineItem, emptyLine } from '../../components/admin/LineItems';

export default function InvoiceCreate() {
  const [clients, setClients] = useState<User[]>([]);
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    api.get('/admin/clients').then(({ data }) => {
      setClients(data.clients);
      const paramClientId = searchParams.get('clientId');
      const paramProjectId = searchParams.get('projectId');
      if (paramClientId) setClientId(paramClientId);
      if (paramProjectId) setProjectId(paramProjectId);
    });
  }, []);

  // Fetch projects when client changes
  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      setProjectId('');
      return;
    }
    api.get(`/admin/projects?client_id=${clientId}`).then(({ data }) => {
      const eligible = data.projects.filter((p: Project) => p.status === 'active' || p.status === 'delivered');
      setProjects(eligible);
      const paramProjectId = searchParams.get('projectId');
      if (paramProjectId && eligible.some((p: Project) => p.id === paramProjectId)) {
        setProjectId(paramProjectId);
      } else if (!eligible.some((p: Project) => p.id === projectId)) {
        setProjectId('');
      }
    });
  }, [clientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/invoices', {
        client_id: clientId,
        project_id: projectId || null,
        line_items: lineItems.map((li) => ({
          description: li.description,
          amount_cents: Math.round(parseFloat(li.amount_dollars || '0') * 100),
          quantity: li.quantity,
        })),
        due_date: new Date(dueDate).toISOString(),
      });
      navigate('/admin/invoices');
    } catch (err) {
      console.error('Failed to create invoice', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="New invoice" description="The client gets a link to view and pay it." />
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
          <Field label="Client">
            {(id) => (
              <Select id={id} required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Choose a client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </Select>
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            {clientId && projects.length > 0 && (
              <Field label="Project (optional)">
                {(id) => (
                  <Select id={id} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="">No project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.status})</option>)}
                  </Select>
                )}
              </Field>
            )}
            <Field label="Due date">{(id) => <Input id={id} type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}</Field>
          </div>
          <div className="border-t border-line pt-5">
            <LineItems items={lineItems} onChange={setLineItems} />
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create invoice'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
