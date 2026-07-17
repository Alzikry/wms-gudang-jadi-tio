import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function emptyRow() {
  return { key: crypto.randomUUID(), productId: '', quantity: '' };
}

const statusLabel = {
  DRAFT: { text: 'Draft', color: 'bg-gray-200 text-gray-700' },
  ORDERED: { text: 'Dipesan', color: 'bg-blue-100 text-blue-700' },
  PARTIAL: { text: 'Diterima Sebagian', color: 'bg-yellow-100 text-yellow-700' },
  RECEIVED: { text: 'Diterima Lengkap', color: 'bg-green-100 text-green-700' },
  CANCELLED: { text: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
};

export default function PurchaseOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [rows, setRows] = useState([emptyRow()]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function loadOrders() {
    api.get('/purchase-orders').then((res) => setOrders(res.data)).catch(console.error);
  }

  useEffect(() => {
    loadOrders();
    api.get('/suppliers').then((res) => setSuppliers(res.data)).catch(console.error);
    api.get('/products').then((res) => setProducts(res.data)).catch(console.error);
  }, []);

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

    const validRows = rows.filter((r) => r.productId && Number(r.quantity) > 0);
    if (!supplierId) return setError('Pilih supplier terlebih dahulu');
    if (validRows.length === 0) return setError('Isi minimal 1 produk dengan jumlah lebih dari 0');

    setLoading(true);
    try {
      await api.post('/purchase-orders', {
        supplierId,
        expectedDate: expectedDate || null,
        items: validRows.map((r) => ({ productId: r.productId, quantity: Number(r.quantity) })),
      });
      setSupplierId('');
      setExpectedDate('');
      setRows([emptyRow()]);
      setShowForm(false);
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat Purchase Order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Order</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand">← Kembali ke Dashboard</Link>
      </header>

      <button
        onClick={() => setShowForm((v) => !v)}
        className="bg-brand text-white px-4 py-2 rounded font-medium mb-4"
      >
        {showForm ? 'Tutup Form' : '+ Buat Purchase Order Baru'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6">
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <select
              className="border rounded px-3 py-2"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
            >
              <option value="">-- Pilih Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <input
              type="date"
              className="border rounded px-3 py-2"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              placeholder="Estimasi tanggal barang datang"
            />
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
                  placeholder="Jumlah Pesan"
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
                  className="text-red-600 disabled:text-gray-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addRow} className="text-sm text-brand font-medium mb-4 block">
            + Tambah Baris Produk
          </button>

          <button
            type="submit"
            disabled={loading}
            className="bg-brand text-white px-4 py-2 rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Buat Purchase Order'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Tanggal Dibuat</th>
              <th className="p-3">Supplier</th>
              <th className="p-3">Jumlah Item</th>
              <th className="p-3">Status</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((po) => {
              const badge = statusLabel[po.status] || statusLabel.DRAFT;
              return (
                <tr key={po.id} className="border-t">
                  <td className="p-3">
                    {new Date(po.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-3">{po.supplier?.name}</td>
                  <td className="p-3">{po.items?.length || 0} produk</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>{badge.text}</span>
                  </td>
                  <td className="p-3">
                    <Link to={`/purchase-orders/${po.id}`} className="text-blue-600">Detail / Terima</Link>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr><td colSpan={5} className="p-3 text-center text-gray-400">Belum ada Purchase Order</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}