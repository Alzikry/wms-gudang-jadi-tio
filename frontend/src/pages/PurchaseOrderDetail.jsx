import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const statusLabel = {
  DRAFT: { text: 'Draft', color: 'bg-gray-200 text-gray-700' },
  ORDERED: { text: 'Dipesan', color: 'bg-blue-100 text-blue-700' },
  PARTIAL: { text: 'Diterima Sebagian', color: 'bg-yellow-100 text-yellow-700' },
  RECEIVED: { text: 'Diterima Lengkap', color: 'bg-green-100 text-green-700' },
  CANCELLED: { text: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
};

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [receiveQty, setReceiveQty] = useState({}); // { itemId: jumlah }
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function loadPO() {
    api.get(`/purchase-orders/${id}`).then((res) => {
      setPo(res.data);
      // Default jumlah terima = sisa yang belum diterima
      const defaults = {};
      res.data.items.forEach((item) => {
        const remaining = Number(item.quantity) - Number(item.quantityReceived);
        if (remaining > 0) defaults[item.id] = remaining;
      });
      setReceiveQty(defaults);
    }).catch(console.error);
  }

  useEffect(() => {
    loadPO();
    api.get('/warehouses').then((res) => {
      setWarehouses(res.data);
      if (res.data.length > 0) setWarehouseId(res.data[0].id);
    }).catch(console.error);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleReceive(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const items = Object.entries(receiveQty)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([itemId, qty]) => ({ itemId, quantityReceived: Number(qty) }));

    if (items.length === 0) return setError('Isi minimal 1 jumlah terima');
    if (!warehouseId) return setError('Pilih gudang tujuan');

    setLoading(true);
    try {
      await api.post(`/purchase-orders/${id}/receive`, { warehouseId, items });
      setSuccess('Barang berhasil diterima dan stok sudah diperbarui');
      loadPO();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menerima barang');
    } finally {
      setLoading(false);
    }
  }

  if (!po) return <div className="p-6">Memuat...</div>;

  const badge = statusLabel[po.status] || statusLabel.DRAFT;
  const isClosed = po.status === 'RECEIVED' || po.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Detail Purchase Order</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <button onClick={() => navigate('/purchase-orders')} className="text-sm text-brand">
          ← Kembali ke Daftar PO
        </button>
      </header>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-gray-500">Supplier</p>
            <p className="font-medium">{po.supplier?.name}</p>
          </div>
          <span className={`px-3 py-1 rounded text-xs font-medium ${badge.color}`}>{badge.text}</span>
        </div>

        <table className="w-full text-sm mb-4">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Produk</th>
              <th className="p-2">Dipesan</th>
              <th className="p-2">Sudah Diterima</th>
              <th className="p-2">Sisa</th>
              {!isClosed && <th className="p-2">Terima Sekarang</th>}
            </tr>
          </thead>
          <tbody>
            {po.items.map((item) => {
              const remaining = Number(item.quantity) - Number(item.quantityReceived);
              return (
                <tr key={item.id} className="border-t">
                  <td className="p-2">{item.product?.sku} - {item.product?.name}</td>
                  <td className="p-2">{Number(item.quantity)} {item.product?.unit}</td>
                  <td className="p-2">{Number(item.quantityReceived)} {item.product?.unit}</td>
                  <td className="p-2">{remaining} {item.product?.unit}</td>
                  {!isClosed && (
                    <td className="p-2">
                      {remaining > 0 ? (
                        <input
                          type="number"
                          className="border rounded px-2 py-1 w-24"
                          min={0}
                          max={remaining}
                          value={receiveQty[item.id] ?? ''}
                          onChange={(e) => setReceiveQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        />
                      ) : (
                        <span className="text-green-600 text-xs">✓ Lengkap</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {!isClosed && (
          <form onSubmit={handleReceive}>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            {success && <p className="text-green-600 text-sm mb-3">{success}</p>}

            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">Gudang Tujuan</label>
              <select
                className="border rounded px-3 py-2 w-full md:w-64"
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

            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
            >
              {loading ? 'Memproses...' : '✓ Terima Barang & Update Stok'}
            </button>
          </form>
        )}

        {isClosed && (
          <p className="text-sm text-gray-500">
            PO ini sudah berstatus <strong>{badge.text}</strong>, tidak ada aksi lagi yang tersedia.
          </p>
        )}
      </div>
    </div>
  );
}