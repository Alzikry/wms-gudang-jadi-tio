import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = { name: '', phone: '', address: '' };

export default function Suppliers() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function loadSuppliers() {
    api.get('/suppliers').then((res) => setSuppliers(res.data)).catch(console.error);
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      setForm(emptyForm);
      setEditingId(null);
      loadSuppliers();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan supplier');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(s) {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone || '', address: s.address || '' });
  }

  async function handleDelete(id) {
    if (!confirm('Yakin hapus supplier ini?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      loadSuppliers();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus supplier');
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Data Supplier</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand">← Kembali ke Dashboard</Link>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-medium mb-3">{editingId ? 'Edit Supplier' : 'Tambah Supplier Baru'}</h2>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input
            type="text"
            placeholder="Nama Supplier"
            className="border rounded px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="No. Telepon"
            className="border rounded px-3 py-2"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            type="text"
            placeholder="Alamat"
            className="border rounded px-3 py-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand text-white px-4 py-2 rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : editingId ? 'Update Supplier' : 'Tambah Supplier'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded border">
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Nama</th>
              <th className="p-3">Telepon</th>
              <th className="p-3">Alamat</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.phone || '-'}</td>
                <td className="p-3">{s.address || '-'}</td>
                <td className="p-3 space-x-3">
                  <button onClick={() => handleEdit(s)} className="text-blue-600">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-600">Hapus</button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-center text-gray-400">Belum ada supplier</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}