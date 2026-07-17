import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = { warehouseId: '', code: '', name: '' };

export default function Locations() {
  const { user } = useAuth();
  const [bins, setBins] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function loadBins() {
    api.get('/bins').then((res) => setBins(res.data)).catch(console.error);
  }

  useEffect(() => {
    loadBins();
    api.get('/warehouses').then((res) => {
      setWarehouses(res.data);
      if (res.data.length === 1) {
        setForm((f) => ({ ...f, warehouseId: res.data[0].id }));
      }
    }).catch(console.error);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/bins/${editingId}`, { code: form.code, name: form.name });
      } else {
        await api.post('/bins', form);
      }
      setForm((f) => ({ ...emptyForm, warehouseId: f.warehouseId }));
      setEditingId(null);
      loadBins();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan lokasi rak');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(bin) {
    setEditingId(bin.id);
    setForm({ warehouseId: bin.warehouseId, code: bin.code, name: bin.name || '' });
  }

  async function handleDelete(id) {
    if (!confirm('Yakin hapus lokasi rak ini?')) return;
    try {
      await api.delete(`/bins/${id}`);
      loadBins();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus lokasi rak');
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm((f) => ({ ...emptyForm, warehouseId: f.warehouseId }));
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Lokasi Gudang (Rak/Bin)</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand">← Kembali ke Dashboard</Link>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-medium mb-3">{editingId ? 'Edit Lokasi Rak' : 'Tambah Lokasi Rak Baru'}</h2>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <select
            className="border rounded px-3 py-2"
            value={form.warehouseId}
            onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
            disabled={!!editingId}
            required
          >
            <option value="">-- Pilih Gudang --</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Kode Rak (misal: A1-01)"
            className="border rounded px-3 py-2"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Nama/Keterangan (opsional)"
            className="border rounded px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand text-white px-4 py-2 rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : editingId ? 'Update Lokasi' : 'Tambah Lokasi'}
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
              <th className="p-3">Gudang</th>
              <th className="p-3">Kode Rak</th>
              <th className="p-3">Keterangan</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {bins.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">{b.warehouse?.name}</td>
                <td className="p-3 font-medium">{b.code}</td>
                <td className="p-3">{b.name || '-'}</td>
                <td className="p-3 space-x-3">
                  <button onClick={() => handleEdit(b)} className="text-blue-600">Edit</button>
                  <button onClick={() => handleDelete(b.id)} className="text-red-600">Hapus</button>
                </td>
              </tr>
            ))}
            {bins.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-center text-gray-400">Belum ada lokasi rak</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}