import { useState, useEffect } from 'react';
import api from '../../api/client';
import { PortfolioItem } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function PortfolioManager() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    const { data } = await api.get('/admin/portfolio');
    setItems(data.items);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('title', title);
    form.append('category', category);
    form.append('description', description);
    form.append('image', file);
    await api.post('/admin/portfolio', form);
    setShowAdd(false);
    setTitle(''); setCategory('general'); setDescription(''); setFile(null);
    setUploading(false);
    loadItems();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this portfolio item?')) return;
    await api.delete(`/admin/portfolio/${id}`);
    loadItems();
  }

  async function toggleVisibility(item: PortfolioItem) {
    await api.put(`/admin/portfolio/${item.id}`, { is_visible: !item.is_visible });
    loadItems();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Portfolio</h1>
        <Button onClick={() => setShowAdd(true)}>Add Item</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.id} className={`relative group rounded-lg overflow-hidden border ${!item.is_visible ? 'opacity-50' : ''}`}>
            <img src={item.thumbnail_url || ''} alt={item.title} className="w-full aspect-square object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
              <div className="w-full p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm font-medium truncate">{item.title}</p>
                <p className="text-white/70 text-xs">{item.category}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => toggleVisibility(item)} className="text-xs text-white bg-white/20 px-2 py-1 rounded">
                    {item.is_visible ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-xs text-red-300 bg-white/20 px-2 py-1 rounded">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Portfolio Item">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Image *</label>
            <input type="file" accept="image/*" required onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
          </div>
          <Button type="submit" disabled={uploading} className="w-full">{uploading ? 'Uploading...' : 'Add Item'}</Button>
        </form>
      </Modal>
    </div>
  );
}
