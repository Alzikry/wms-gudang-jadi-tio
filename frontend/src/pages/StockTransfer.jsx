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
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Transfer Antar Gudang</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand">← Kembali ke Dashboard</Link>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6">
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-3">{success}</p>}

        {warehouses.length < 2 && (
          <p className="text-yellow-700 bg-yellow-50 border border-yellow-300 rounded p-3 text-sm mb-4">
            Transfer butuh minimal 2 gudang aktif. Sekarang baru ada {warehouses.length} gudang — tambah gudang baru dulu kalau perlu.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Dari Gudang</label>
            <select
              className="border rounded px-3 py-2 w-full"
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
            <label className="block text-sm text-gray-600 mb-1">Ke Gudang</label>
            <select
              className="border rounded px-3 py-2 w-full"
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
            className="border rounded px-3 py-2"
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
            className="border rounded px-3 py-2"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            min={1}
            required
          />

          <select
            className="border rounded px-3 py-2"
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
          className="bg-brand text-white px-4 py-2 rounded font-medium disabled:opacity-50"
        >
          {loading ? 'Memproses...' : '🔁 Proses Transfer'}
        </button>
      </form>

      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-3 border-b font-medium text-sm">Riwayat Transfer (sesi ini)</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
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
                <tr key={i} className="border-t">
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