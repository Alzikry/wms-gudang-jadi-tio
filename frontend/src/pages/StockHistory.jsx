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
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Riwayat Stok</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand">← Kembali ke Dashboard</Link>
      </header>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterType('')}
          className={`px-3 py-1.5 rounded text-sm font-medium ${filterType === '' ? 'bg-gray-800 text-white' : 'bg-white border'}`}
        >
          Semua
        </button>
        <button
          onClick={() => setFilterType('IN')}
          className={`px-3 py-1.5 rounded text-sm font-medium ${filterType === 'IN' ? 'bg-green-600 text-white' : 'bg-white border'}`}
        >
          ⬇️ Masuk
        </button>
        <button
          onClick={() => setFilterType('OUT')}
          className={`px-3 py-1.5 rounded text-sm font-medium ${filterType === 'OUT' ? 'bg-red-600 text-white' : 'bg-white border'}`}
        >
          ⬆️ Keluar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
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
              <tr><td colSpan={6} className="p-3 text-center text-gray-400">Memuat...</td></tr>
            )}
            {!loading && movements.length === 0 && (
              <tr><td colSpan={6} className="p-3 text-center text-gray-400">Belum ada riwayat transaksi</td></tr>
            )}
            {!loading && movements.map((m) => (
              <tr key={m.id} className="border-t">
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
                    <span className="text-red-600">⬆️ Keluar</span>
                  ) : (
                    m.type
                  )}
                </td>
                <td className="p-3 font-medium">{Number(m.quantity)} {m.product?.unit}</td>
                <td className="p-3 text-gray-500">{m.createdBy?.name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}