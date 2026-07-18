import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useStockEvents } from '../hooks/useStockEvents';

export default function StockByWarehouse() {
  const { user } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [filterWarehouseId, setFilterWarehouseId] = useState('');
  const [loading, setLoading] = useState(true);

  function loadStocks() {
    setLoading(true);
    api.get('/stock')
      .then((res) => setStocks(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStocks();
    api.get('/warehouses').then((res) => setWarehouses(res.data)).catch(console.error);
  }, []);

  // Auto-refresh kalau ada transaksi/transfer baru dari user lain
  useStockEvents({ onUpdated: loadStocks });

  const filteredStocks = filterWarehouseId
    ? stocks.filter((s) => s.warehouseId === filterWarehouseId)
    : stocks;

  // Urutkan berdasarkan nama produk biar gampang dibaca, baru gudang
  const sortedStocks = [...filteredStocks].sort((a, b) => {
    const nameCompare = (a.product?.name || '').localeCompare(b.product?.name || '');
    if (nameCompare !== 0) return nameCompare;
    return (a.warehouse?.name || '').localeCompare(b.warehouse?.name || '');
  });

  return (
    <div className="min-h-screen wms-bg p-6 relative">

      <div className="wms-orb wms-orb-a" aria-hidden="true" />
      <div className="wms-orb wms-orb-b" aria-hidden="true" />
      <header className="glass-panel flex justify-between items-center px-5 py-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Stok per Gudang</h1>
          <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand font-semibold hover:underline">← Kembali ke Dashboard</Link>
      </header>

      <div className="mb-4">
        <label className="block text-sm text-ink-soft mb-1">Filter Gudang</label>
        <select
          className="glass-field w-full md:w-64"
          value={filterWarehouseId}
          onChange={(e) => setFilterWarehouseId(e.target.value)}
        >
          <option value="">-- Semua Gudang --</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      <div className="glass-panel overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wider">
            <tr>
              <th className="p-3">Produk</th>
              <th className="p-3">Gudang</th>
              <th className="p-3">Lokasi Rak</th>
              <th className="p-3">Jumlah Stok</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="p-6 text-center text-ink-soft/60">Memuat...</td></tr>
            )}
            {!loading && sortedStocks.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-ink-soft/60">Belum ada data stok</td></tr>
            )}
            {!loading && sortedStocks.map((s) => {
              const isLow = Number(s.quantity) <= (s.product?.minStock ?? 0);
              return (
                <tr key={s.id} className="border-t border-ink/5 text-ink/85">
                  <td className="p-3">{s.product?.sku} - {s.product?.name}</td>
                  <td className="p-3">{s.warehouse?.name}</td>
                  <td className="p-3 text-ink-soft">{s.bin ? `${s.bin.code}${s.bin.name ? ` - ${s.bin.name}` : ''}` : '-'}</td>
                  <td className={`p-3 font-medium ${isLow ? 'text-[#B3435C] font-semibold' : ''}`}>
                    {Number(s.quantity)} {s.product?.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}