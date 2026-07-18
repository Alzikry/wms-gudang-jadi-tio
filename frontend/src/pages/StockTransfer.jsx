import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function StockTransfer() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [bins, setBins] = useState([]);
  const [form, setForm] = useState({
    productId: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    quantity: '',
    toBinId: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get('/products').then((res) => setProducts(res.data)).catch(console.error);
    api.get('/warehouses').then((res) => setWarehouses(res.data)).catch(console.error);
  }, []);

  // Ambil daftar rak di gudang tujuan setiap kali gudang tujuan berubah
  useEffect(() => {
    if (!form.toWarehouseId) {
      setBins([]);
      return;
    }
    api.get(`/bins?warehouseId=${form.toWarehouseId}`).then((res) => setBins(res.data)).catch(console.error);
    setForm((f) => ({ ...f, toBinId: '' }));
  }, [form.toWarehouseId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.fromWarehouseId === form.toWarehouseId) {
      setError('Gudang asal dan tujuan tidak boleh sama');
      return;
    }
    if (!form.productId || !Number(form.quantity)) {
      setError('Lengkapi produk dan jumlah terlebih dahulu');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        productId: form.productId,
        fromWarehouseId: form.fromWarehouseId,
        toWarehouseId: form.toWarehouseId,
        quantity: Number(form.quantity),
      };
      if (form.toBinId) payload.toBinId = form.toBinId;

      await api.post('/stock/transfer', payload);

      const product = products.find((p) => p.id === form.productId);
      const fromWh = warehouses.find((w) => w.id === form.fromWarehouseId);
      const toWh = warehouses.find((w) => w.id === form.toWarehouseId);

      setHistory((prev) => [
        {
          time: new Date().toLocaleTimeString('id-ID'),
          productName: product?.name || '-',
          from: fromWh?.name || '-',
          to: toWh?.name || '-',
          quantity: form.quantity,
        },
        ...prev,
      ].slice(0, 10));

      setSuccess('Transfer berhasil dicatat');
      setForm((f) => ({ ...f, productId: '', quantity: '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memproses transfer');
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
          <h1 className="font-display text-2xl text-ink">Transfer Antar Gudang</h1>
          <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand font-semibold hover:underline">← Kembali ke Dashboard</Link>
      </header>

      <form onSubmit={handleSubmit} className="glass-panel p-5 mb-6">
        {error && <p className="text-sm text-[#B3435C] bg-[#B3435C]/10 border border-[#B3435C]/20 rounded-lg px-3 py-2 mb-3">{error}</p>}
        {success && <p className="text-sm text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-2 mb-3">{success}</p>}

        {warehouses.length < 2 && (
          <p className="text-yellow-700 bg-yellow-50 border border-yellow-300 rounded p-3 text-sm mb-4">
            Transfer butuh minimal 2 gudang aktif. Sekarang baru ada {warehouses.length} gudang — tambah gudang baru dulu kalau perlu.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-ink-soft mb-1">Dari Gudang</label>
            <select
              className="glass-field w-full"
              value={form.fromWarehouseId}
              onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}
              required
            >
              <option value="">-- Pilih Gudang Asal --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-ink-soft mb-1">Ke Gudang</label>
            <select
              className="glass-field w-full"
              value={form.toWarehouseId}
              onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}
              required
            >
              <option value="">-- Pilih Gudang Tujuan --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id} disabled={w.id === form.fromWarehouseId}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <select
            className="glass-field"
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
            required
          >
            <option value="">-- Pilih Produk --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Jumlah"
            className="glass-field"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            min={1}
            required
          />

          <select
            className="glass-field"
            value={form.toBinId}
            onChange={(e) => setForm({ ...form, toBinId: e.target.value })}
            disabled={bins.length === 0}
          >
            <option value="">-- Rak Tujuan (opsional) --</option>
            {bins.map((b) => (
              <option key={b.id} value={b.id}>{b.code}{b.name ? ` - ${b.name}` : ''}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-4 py-2 rounded-xl"
        >
          {loading ? 'Memproses...' : '🔁 Proses Transfer'}
        </button>
      </form>

      {history.length > 0 && (
        <div className="glass-panel overflow-hidden overflow-x-auto">
          <div className="p-3 border-b border-ink/10 font-medium text-sm text-ink">Riwayat Transfer (sesi ini)</div>
          <table className="w-full text-sm">
            <thead className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">Produk</th>
                <th className="p-3">Dari</th>
                <th className="p-3">Ke</th>
                <th className="p-3">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-t border-ink/5 text-ink/85">
                  <td className="p-3">{h.time}</td>
                  <td className="p-3">{h.productName}</td>
                  <td className="p-3">{h.from}</td>
                  <td className="p-3">→ {h.to}</td>
                  <td className="p-3 font-medium">{h.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}