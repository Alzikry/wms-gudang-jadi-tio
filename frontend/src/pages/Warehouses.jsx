import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = { name: '', address: '' };

export default function Warehouses() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function loadWarehouses() {
    api.get('/warehouses').then((res) => setWarehouses(res.data)).catch(console.error);
  }

  useEffect(() => {
    loadWarehouses();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/warehouses/${editingId}`, form);
      } else {
        await api.post('/warehouses', form);
      }
      setForm(emptyForm);
      setEditingId(null);
      loadWarehouses();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan gudang');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(w) {
    setEditingId(w.id);
    setForm({ name: w.name, address: w.address || '' });
  }

  async function handleDelete(id) {
    if (!confirm('Yakin hapus gudang ini?')) return;
    try {
      await api.delete(`/warehouses/${id}`);
      loadWarehouses();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus gudang');
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
          <h1 className="text-2xl font-semibold">Kelola Gudang</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand">← Kembali ke Dashboard</Link>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-medium mb-3">{editingId ? 'Edit Gudang' : 'Tambah Gudang Baru'}</h2>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            placeholder="Nama Gudang (misal: Gudang Cabang Bekasi)"
            className="border rounded px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Alamat (opsional)"
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
            {loading ? 'Menyimpan...' : editingId ? 'Update Gudang' : 'Tambah Gudang'}
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
              <th className="p-3">Nama Gudang</th>
              <th className="p-3">Alamat</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((w) => (
              <tr key={w.id} className="border-t">
                <td className="p-3">{w.name}</td>
                <td className="p-3">{w.address || '-'}</td>
                <td className="p-3 space-x-3">
                  <button onClick={() => handleEdit(w)} className="text-blue-600">Edit</button>
                  <button onClick={() => handleDelete(w.id)} className="text-red-600">Hapus</button>
                </td>
              </tr>
            ))}
            {warehouses.length === 0 && (
              <tr><td colSpan={3} className="p-3 text-center text-gray-400">Belum ada gudang</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}