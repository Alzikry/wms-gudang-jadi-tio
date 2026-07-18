import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useStockEvents } from '../hooks/useStockEvents';

export default function StockHistory() {
  const { user } = useAuth();
  const [movements, setMovements] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);

  function loadMovements() {
    setLoading(true);
    const params = filterType ? `?type=${filterType}` : '';
    api.get(`/stock/movements${params}`)
      .then((res) => setMovements(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadMovements();
  }, [filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh kalau ada transaksi baru dari user lain (real-time)
  useStockEvents({ onUpdated: loadMovements });

  return (
    <div className="min-h-screen wms-bg p-6 relative">

      <div className="wms-orb wms-orb-a" aria-hidden="true" />
      <div className="wms-orb wms-orb-b" aria-hidden="true" />
      <header className="glass-panel flex justify-between items-center px-5 py-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Riwayat Stok</h1>
          <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand font-semibold hover:underline">← Kembali ke Dashboard</Link>
      </header>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterType('')}
          className={`px-3 py-1.5 rounded text-sm font-medium ${filterType === '' ? 'bg-ink text-white' : 'bg-white/40 backdrop-blur border border-ink/15 text-ink-soft'}`}
        >
          Semua
        </button>
        <button
          onClick={() => setFilterType('IN')}
          className={`px-3 py-1.5 rounded text-sm font-medium ${filterType === 'IN' ? 'bg-green-600 text-white' : 'bg-white/40 backdrop-blur border border-ink/15 text-ink-soft'}`}
        >
          ⬇️ Masuk
        </button>
        <button
          onClick={() => setFilterType('OUT')}
          className={`px-3 py-1.5 rounded text-sm font-medium ${filterType === 'OUT' ? 'bg-red-600 text-white' : 'bg-white/40 backdrop-blur border border-ink/15 text-ink-soft'}`}
        >
          ⬆️ Keluar
        </button>
      </div>

      <div className="glass-panel overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wider">
            <tr>
              <th className="p-3">Tanggal & Waktu</th>
              <th className="p-3">Produk</th>
              <th className="p-3">Gudang</th>
              <th className="p-3">Jenis</th>
              <th className="p-3">Jumlah</th>
              <th className="p-3">Dicatat oleh</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="p-6 text-center text-ink-soft/60">Memuat...</td></tr>
            )}
            {!loading && movements.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-ink-soft/60">Belum ada riwayat transaksi</td></tr>
            )}
            {!loading && movements.map((m) => (
              <tr key={m.id} className="border-t border-ink/5 text-ink/85">
                <td className="p-3">
                  {new Date(m.createdAt).toLocaleString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                <td className="p-3">{m.product?.sku} - {m.product?.name}</td>
                <td className="p-3">{m.warehouse?.name}</td>
                <td className="p-3">
                  {m.type === 'IN' ? (
                    <span className="text-green-600">⬇️ Masuk</span>
                  ) : m.type === 'OUT' ? (
                    <span className="text-[#B3435C] font-semibold">⬆️ Keluar</span>
                  ) : (
                    m.type
                  )}
                </td>
                <td className="p-3 font-medium">{Number(m.quantity)} {m.product?.unit}</td>
                <td className="p-3 text-ink-soft">{m.createdBy?.name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}