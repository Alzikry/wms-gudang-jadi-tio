import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const statusLabel = {
  DRAFT: { text: 'Sedang Dihitung', color: 'bg-yellow-100 text-yellow-700' },
  COMPLETED: { text: 'Selesai', color: 'bg-green-100 text-green-700' },
};

export default function StockOpnames() {
  const { user } = useAuth();
  const [opnames, setOpnames] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function loadOpnames() {
    api.get('/stock-opnames').then((res) => setOpnames(res.data)).catch(console.error);
  }

  useEffect(() => {
    loadOpnames();
    api.get('/warehouses').then((res) => {
      setWarehouses(res.data);
      if (res.data.length === 1) setWarehouseId(res.data[0].id);
    }).catch(console.error);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!warehouseId) return setError('Pilih gudang dulu');

    setLoading(true);
    try {
      await api.post('/stock-opnames', { warehouseId, note: note || null });
      setNote('');
      setShowForm(false);
      loadOpnames();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat sesi Stock Opname');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Stock Opname</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand">← Kembali ke Dashboard</Link>
      </header>

      <button
        onClick={() => setShowForm((v) => !v)}
        className="bg-brand text-white px-4 py-2 rounded font-medium mb-4"
      >
        {showForm ? 'Tutup Form' : '+ Mulai Sesi Hitung Baru'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6">
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          <p className="text-sm text-gray-500 mb-3">
            Sistem akan otomatis mengambil daftar stok saat ini di gudang yang dipilih untuk dihitung ulang.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <select
              className="border rounded px-3 py-2"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              required
            >
              <option value="">-- Pilih Gudang --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Catatan (opsional)"
              className="border rounded px-3 py-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-brand text-white px-4 py-2 rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Membuat sesi...' : 'Mulai Hitung'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Tanggal</th>
              <th className="p-3">Gudang</th>
              <th className="p-3">Jumlah Produk</th>
              <th className="p-3">Dibuat Oleh</th>
              <th className="p-3">Status</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {opnames.map((op) => {
              const badge = statusLabel[op.status] || statusLabel.DRAFT;
              return (
                <tr key={op.id} className="border-t">
                  <td className="p-3">
                    {new Date(op.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-3">{op.warehouse?.name}</td>
                  <td className="p-3">{op.items?.length || 0} produk</td>
                  <td className="p-3">{op.createdBy?.name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>{badge.text}</span>
                  </td>
                  <td className="p-3">
                    <Link to={`/stock-opnames/${op.id}`} className="text-blue-600">
                      {op.status === 'DRAFT' ? 'Lanjutkan Hitung' : 'Lihat Hasil'}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {opnames.length === 0 && (
              <tr><td colSpan={6} className="p-3 text-center text-gray-400">Belum ada sesi Stock Opname</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}