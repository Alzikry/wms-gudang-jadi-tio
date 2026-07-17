import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const statusLabel = {
  DRAFT: { text: 'Draft', color: 'bg-gray-200 text-gray-700' },
  CONFIRMED: { text: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-700' },
  PARTIAL: { text: 'Dikirim Sebagian', color: 'bg-yellow-100 text-yellow-700' },
  SHIPPED: { text: 'Terkirim Lengkap', color: 'bg-green-100 text-green-700' },
  CANCELLED: { text: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
};

export default function SalesOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [so, setSo] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [shipQty, setShipQty] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function loadSO() {
    return api.get(`/sales-orders/${id}`).then((res) => {
      setSo(res.data);
      const defaults = {};
      res.data.items.forEach((item) => {
        const remaining = Number(item.quantity) - Number(item.quantityShipped);
        defaults[item.id] = remaining > 0 ? remaining : 0;
      });
      setShipQty(defaults);
    });
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadSO(),
      api.get('/warehouses').then((res) => {
        setWarehouses(res.data);
        if (res.data.length === 1) setWarehouseId(res.data[0].id);
      }),
    ])
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [id]);

  function updateShipQty(itemId, value) {
    setShipQty((prev) => ({ ...prev, [itemId]: value }));
  }

  async function handleShip(e) {
    e.preventDefault();
    setError('');

    if (!warehouseId) return setError('Pilih gudang asal pengiriman');

    const items = so.items
      .map((item) => ({ itemId: item.id, quantityShipped: Number(shipQty[item.id] || 0) }))
      .filter((i) => i.quantityShipped > 0);

    if (items.length === 0) return setError('Isi jumlah yang mau dikirim untuk minimal 1 produk');

    setSubmitting(true);
    try {
      await api.post(`/sales-orders/${id}/ship`, { warehouseId, items });
      await loadSO();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim barang');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6">Memuat...</div>;
  }
  if (!so) {
    return <div className="min-h-screen bg-gray-50 p-6 text-red-600">{error || 'Sales Order tidak ditemukan'}</div>;
  }

  const badge = statusLabel[so.status] || statusLabel.DRAFT;
  const isDone = so.status === 'SHIPPED' || so.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Sales Order — {so.customer?.name}</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/sales-orders" className="text-sm text-brand">← Kembali ke Daftar Sales Order</Link>
      </header>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>{badge.text}</span>
            <p className="text-gray-500 text-sm mt-1">
              Dibuat {new Date(so.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              {so.expectedShipDate &&
                ` · Target kirim ${new Date(so.expectedShipDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`}
            </p>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <table className="w-full text-sm mb-4">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Produk</th>
              <th className="p-3">Dipesan</th>
              <th className="p-3">Sudah Dikirim</th>
              <th className="p-3">Kirim Sekarang</th>
            </tr>
          </thead>
          <tbody>
            {so.items.map((item) => {
              const remaining = Number(item.quantity) - Number(item.quantityShipped);
              return (
                <tr key={item.id} className="border-t">
                  <td className="p-3">
                    {item.product?.name} <span className="text-gray-400">({item.product?.sku})</span>
                  </td>
                  <td className="p-3">{Number(item.quantity)} {item.product?.unit}</td>
                  <td className="p-3">{Number(item.quantityShipped)} {item.product?.unit}</td>
                  <td className="p-3">
                    {isDone || remaining <= 0 ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={remaining}
                        className="border rounded px-2 py-1 w-24"
                        value={shipQty[item.id] ?? 0}
                        onChange={(e) => updateShipQty(item.id, e.target.value)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {so.items.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-center text-gray-400">Tidak ada item</td></tr>
            )}
          </tbody>
        </table>

        {!isDone && (
          <form onSubmit={handleShip} className="flex flex-wrap gap-3 items-center">
            <select
              className="border rounded px-3 py-2"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              required
            >
              <option value="">-- Pilih Gudang Asal --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand text-white px-4 py-2 rounded font-medium disabled:opacity-50"
            >
              {submitting ? 'Memproses...' : 'Kirim Barang & Update Stok'}
            </button>
          </form>
        )}

        {isDone && (
          <p className="text-sm text-gray-500">
            Sales Order ini sudah berstatus <strong>{badge.text}</strong>, tidak ada aksi lagi yang bisa dilakukan.
          </p>
        )}
      </div>
    </div>
  );
}