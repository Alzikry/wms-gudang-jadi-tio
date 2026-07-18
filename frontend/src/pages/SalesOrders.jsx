import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function emptyRow() {
  return { key: crypto.randomUUID(), productId: '', quantity: '' };
}

const statusLabel = {
  DRAFT: { text: 'Draft', color: 'bg-gray-200 text-gray-700' },
  CONFIRMED: { text: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-700' },
  PARTIAL: { text: 'Dikirim Sebagian', color: 'bg-yellow-100 text-yellow-700' },
  SHIPPED: { text: 'Terkirim Lengkap', color: 'bg-green-100 text-green-700' },
  CANCELLED: { text: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
};

export default function SalesOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [expectedShipDate, setExpectedShipDate] = useState('');
  const [rows, setRows] = useState([emptyRow()]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function loadOrders() {
    api.get('/sales-orders').then((res) => setOrders(res.data)).catch(console.error);
  }

  useEffect(() => {
    loadOrders();
    api.get('/customers').then((res) => setCustomers(res.data)).catch(console.error);
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
    if (!customerId) return setError('Pilih customer terlebih dahulu');
    if (validRows.length === 0) return setError('Isi minimal 1 produk dengan jumlah lebih dari 0');

    setLoading(true);
    try {
      await api.post('/sales-orders', {
        customerId,
        expectedShipDate: expectedShipDate || null,
        items: validRows.map((r) => ({ productId: r.productId, quantity: Number(r.quantity) })),
      });
      setCustomerId('');
      setExpectedShipDate('');
      setRows([emptyRow()]);
      setShowForm(false);
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat Sales Order');
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
          <h1 className="font-display text-2xl text-ink">Sales Order (Pengeluaran Barang)</h1>
          <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand font-semibold hover:underline">← Kembali ke Dashboard</Link>
      </header>

      <button
        onClick={() => setShowForm((v) => !v)}
        className="bg-brand text-white px-4 py-2 rounded font-medium mb-4"
      >
        {showForm ? 'Tutup Form' : '+ Buat Sales Order Baru'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-panel p-5 mb-6">
          {error && <p className="text-sm text-[#B3435C] bg-[#B3435C]/10 border border-[#B3435C]/20 rounded-lg px-3 py-2 mb-3">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <select
              className="glass-field"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">-- Pilih Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <input
              type="date"
              className="glass-field"
              value={expectedShipDate}
              onChange={(e) => setExpectedShipDate(e.target.value)}
              placeholder="Estimasi tanggal kirim"
            />
          </div>

          <div className="space-y-2 mb-3">
            {rows.map((row) => (
              <div key={row.key} className="grid grid-cols-1 md:grid-cols-[1fr_150px_40px] gap-2 items-center">
                <select
                  className="glass-field"
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
                  className="glass-field"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.key, 'quantity', e.target.value)}
                  min={1}
                  required
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                  className="text-[#B3435C] font-semibold hover:underline disabled:text-ink-soft/30"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addRow} className="text-sm text-brand font-semibold hover:underline font-medium mb-4 block">
            + Tambah Baris Produk
          </button>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-4 py-2 rounded-xl"
          >
            {loading ? 'Menyimpan...' : 'Buat Sales Order'}
          </button>
        </form>
      )}

      <div className="glass-panel overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wider">
            <tr>
              <th className="p-3">Tanggal Dibuat</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Jumlah Item</th>
              <th className="p-3">Status</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((so) => {
              const badge = statusLabel[so.status] || statusLabel.DRAFT;
              return (
                <tr key={so.id} className="border-t border-ink/5 text-ink/85">
                  <td className="p-3">
                    {new Date(so.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-3">{so.customer?.name}</td>
                  <td className="p-3">{so.items?.length || 0} produk</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>{badge.text}</span>
                  </td>
                  <td className="p-3">
                    <Link to={`/sales-orders/${so.id}`} className="text-brand font-semibold hover:underline">Detail / Kirim</Link>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-ink-soft/60">Belum ada Sales Order</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}