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
    <div className="min-h-screen wms-bg p-6 relative">

      <div className="wms-orb wms-orb-a" aria-hidden="true" />
      <div className="wms-orb wms-orb-b" aria-hidden="true" />
      <header className="glass-panel flex justify-between items-center px-5 py-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Stock Opname</h1>
          <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand font-semibold hover:underline">← Kembali ke Dashboard</Link>
      </header>

      <button
        onClick={() => setShowForm((v) => !v)}
        className="bg-brand text-white px-4 py-2 rounded font-medium mb-4"
      >
        {showForm ? 'Tutup Form' : '+ Mulai Sesi Hitung Baru'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-panel p-5 mb-6">
          {error && <p className="text-sm text-[#B3435C] bg-[#B3435C]/10 border border-[#B3435C]/20 rounded-lg px-3 py-2 mb-3">{error}</p>}

          <p className="text-sm text-ink-soft mb-3">
            Sistem akan otomatis mengambil daftar stok saat ini di gudang yang dipilih untuk dihitung ulang.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <select
              className="glass-field"
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
              className="glass-field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-4 py-2 rounded-xl"
          >
            {loading ? 'Membuat sesi...' : 'Mulai Hitung'}
          </button>
        </form>
      )}

      <div className="glass-panel overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wider">
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
                <tr key={op.id} className="border-t border-ink/5 text-ink/85">
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
                    <Link to={`/stock-opnames/${op.id}`} className="text-brand font-semibold hover:underline">
                      {op.status === 'DRAFT' ? 'Lanjutkan Hitung' : 'Lihat Hasil'}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {opnames.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-ink-soft/60">Belum ada sesi Stock Opname</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}