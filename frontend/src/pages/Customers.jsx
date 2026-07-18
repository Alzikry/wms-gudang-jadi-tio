import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = { name: '', phone: '', address: '' };

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function loadCustomers() {
    api.get('/customers').then((res) => setCustomers(res.data)).catch(console.error);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, form);
      } else {
        await api.post('/customers', form);
      }
      setForm(emptyForm);
      setEditingId(null);
      loadCustomers();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan customer');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(c) {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone || '', address: c.address || '' });
  }

  async function handleDelete(id) {
    if (!confirm('Yakin hapus customer ini?')) return;
    try {
      await api.delete(`/customers/${id}`);
      loadCustomers();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus customer');
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <div className="min-h-screen wms-bg p-6 relative">

      <div className="wms-orb wms-orb-a" aria-hidden="true" />
      <div className="wms-orb wms-orb-b" aria-hidden="true" />
      <header className="glass-panel flex justify-between items-center px-5 py-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Data Customer</h1>
          <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand font-semibold hover:underline">← Kembali ke Dashboard</Link>
      </header>

      <form onSubmit={handleSubmit} className="glass-panel p-5 mb-6">
        <h2 className="font-display text-lg text-ink mb-3">{editingId ? 'Edit Customer' : 'Tambah Customer Baru'}</h2>

        {error && <p className="text-sm text-[#B3435C] bg-[#B3435C]/10 border border-[#B3435C]/20 rounded-lg px-3 py-2 mb-3">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input
            type="text"
            placeholder="Nama Customer"
            className="glass-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="No. Telepon"
            className="glass-field"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            type="text"
            placeholder="Alamat"
            className="glass-field"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-4 py-2 rounded-xl"
          >
            {loading ? 'Menyimpan...' : editingId ? 'Update Customer' : 'Tambah Customer'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded-xl border border-ink/15 text-ink-soft hover:bg-ink/5 transition-colors">
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="glass-panel overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wider">
            <tr>
              <th className="p-3">Nama</th>
              <th className="p-3">Telepon</th>
              <th className="p-3">Alamat</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-ink/5 text-ink/85">
                <td className="p-3">{c.name}</td>
                <td className="p-3">{c.phone || '-'}</td>
                <td className="p-3">{c.address || '-'}</td>
                <td className="p-3 space-x-3">
                  <button onClick={() => handleEdit(c)} className="text-brand font-semibold hover:underline">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-[#B3435C] font-semibold hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-ink-soft/60">Belum ada customer</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}