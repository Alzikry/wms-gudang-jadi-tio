import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function emptyRow() {
  return { key: crypto.randomUUID(), productId: '', quantity: '' };
}

export default function StockTransaction() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [bins, setBins] = useState([]);
  const [type, setType] = useState('in'); // 'in' atau 'out'
  const [warehouseId, setWarehouseId] = useState('');
  const [binId, setBinId] = useState('');
  const [rows, setRows] = useState([emptyRow()]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get('/products').then((res) => setProducts(res.data)).catch(console.error);
    api.get('/warehouses').then((res) => {
      setWarehouses(res.data);
      if (res.data.length > 0) setWarehouseId(res.data[0].id);
    }).catch(console.error);
  }, []);

  // Ambil daftar rak setiap kali gudang dipilih/berubah
  useEffect(() => {
    if (!warehouseId) {
      setBins([]);
      return;
    }
    api.get(`/bins?warehouseId=${warehouseId}`).then((res) => setBins(res.data)).catch(console.error);
    setBinId('');
  }, [warehouseId]);

  function updateRow(key, field, value) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }
  function removeRow(key) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validRows = rows.filter((r) => r.productId && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      setError('Isi minimal 1 baris produk dengan jumlah lebih dari 0');
      return;
    }
    if (!warehouseId) {
      setError('Pilih gudang terlebih dahulu');
      return;
    }

    setLoading(true);
    const endpoint = type === 'in' ? '/stock/in' : '/stock/out';
    const results = [];

    for (const row of validRows) {
      const product = products.find((p) => p.id === row.productId);
      try {
        const payload = {
          productId: row.productId,
          warehouseId,
          quantity: Number(row.quantity),
        };
        // Lokasi rak cuma relevan buat barang masuk (nentuin ditaruh di mana)
        if (type === 'in' && binId) payload.binId = binId;

        const { data } = await api.post(endpoint, payload);
        results.push({
          productName: product?.name || '-',
          quantity: row.quantity,
          newQty: data.stock.quantity,
          status: 'sukses',
        });
      } catch (err) {
        results.push({
          productName: product?.name || '-',
          quantity: row.quantity,
          newQty: '-',
          status: err.response?.data?.message || 'Gagal',
        });
      }
    }

    const time = new Date().toLocaleTimeString('id-ID');
    setHistory((prev) => [
      ...results.map((r) => ({ ...r, type, time })),
      ...prev,
    ].slice(0, 20));

    const failedCount = results.filter((r) => r.status !== 'sukses').length;
    if (failedCount === 0) {
      setSuccess(`${results.length} item berhasil dicatat`);
      setRows([emptyRow()]);
    } else {
      setError(`${failedCount} dari ${results.length} item gagal — cek riwayat di bawah untuk detail`);
      setRows([emptyRow()]);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Transaksi Stok</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand">← Kembali ke Dashboard</Link>
      </header>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setType('in')}
          className={`px-4 py-2 rounded font-medium ${type === 'in' ? 'bg-green-600 text-white' : 'bg-white border'}`}
        >
          ⬇️ Barang Masuk
        </button>
        <button
          onClick={() => setType('out')}
          className={`px-4 py-2 rounded font-medium ${type === 'out' ? 'bg-red-600 text-white' : 'bg-white border'}`}
        >
          ⬆️ Barang Keluar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6">
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-3">{success}</p>}

        <div className={`grid grid-cols-1 ${type === 'in' ? 'md:grid-cols-2' : ''} gap-3 mb-4`}>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Gudang</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              required
            >
              <option value="">-- Pilih Gudang --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Lokasi rak — cuma muncul buat Barang Masuk */}
          {type === 'in' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Lokasi Rak (opsional)</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={binId}
                onChange={(e) => setBinId(e.target.value)}
                disabled={bins.length === 0}
              >
                <option value="">-- Tanpa Rak Tertentu --</option>
                {bins.map((b) => (
                  <option key={b.id} value={b.id}>{b.code}{b.name ? ` - ${b.name}` : ''}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-2 mb-3">
          {rows.map((row) => (
            <div key={row.key} className="grid grid-cols-1 md:grid-cols-[1fr_150px_40px] gap-2 items-center">
              <select
                className="border rounded px-3 py-2"
                value={row.productId}
                onChange={(e) => updateRow(row.key, 'productId', e.target.value)}
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
                value={row.quantity}
                onChange={(e) => updateRow(row.key, 'quantity', e.target.value)}
                min={1}
                required
              />

              <button
                type="button"
                onClick={() => removeRow(row.key)}
                disabled={rows.length === 1}
                className="text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                title="Hapus baris"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addRow} className="text-sm text-brand font-medium mb-4">
          + Tambah Baris Produk
        </button>

        <div>
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded font-medium text-white disabled:opacity-50 ${
              type === 'in' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {loading
              ? 'Memproses...'
              : type === 'in'
              ? `Catat ${rows.length} Item Masuk`
              : `Catat ${rows.length} Item Keluar`}
          </button>
        </div>
      </form>

      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-3 border-b font-medium text-sm">Riwayat Transaksi (sesi ini)</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">Produk</th>
                <th className="p-3">Jenis</th>
                <th className="p-3">Jumlah</th>
                <th className="p-3">Stok Setelah</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">{h.time}</td>
                  <td className="p-3">{h.productName}</td>
                  <td className="p-3">{h.type === 'in' ? '⬇️ Masuk' : '⬆️ Keluar'}</td>
                  <td className="p-3">{h.quantity}</td>
                  <td className="p-3 font-medium">{h.newQty}</td>
                  <td className={`p-3 ${h.status === 'sukses' ? 'text-green-600' : 'text-red-600'}`}>
                    {h.status === 'sukses' ? '✓ Sukses' : h.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}