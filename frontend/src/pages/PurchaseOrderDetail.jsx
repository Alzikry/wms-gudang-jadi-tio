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
    <div className="min-h-screen wms-bg p-6 relative">

      <div className="wms-orb wms-orb-a" aria-hidden="true" />
      <div className="wms-orb wms-orb-b" aria-hidden="true" />
      <header className="glass-panel flex justify-between items-center px-5 py-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Detail Purchase Order</h1>
          <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
        </div>
        <button onClick={() => navigate('/purchase-orders')} className="text-sm text-brand font-semibold hover:underline">
          ← Kembali ke Daftar PO
        </button>
      </header>

      <div className="glass-panel p-5 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-ink-soft">Supplier</p>
            <p className="font-medium">{po.supplier?.name}</p>
          </div>
          <span className={`px-3 py-1 rounded text-xs font-medium ${badge.color}`}>{badge.text}</span>
        </div>

        <table className="w-full text-sm mb-4">
          <thead className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wider">
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
                <tr key={item.id} className="border-t border-ink/5 text-ink/85">
                  <td className="p-2">{item.product?.sku} - {item.product?.name}</td>
                  <td className="p-2">{Number(item.quantity)} {item.product?.unit}</td>
                  <td className="p-2">{Number(item.quantityReceived)} {item.product?.unit}</td>
                  <td className="p-2">{remaining} {item.product?.unit}</td>
                  {!isClosed && (
                    <td className="p-2">
                      {remaining > 0 ? (
                        <input
                          type="number"
                          className="glass-field w-24"
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
            {error && <p className="text-sm text-[#B3435C] bg-[#B3435C]/10 border border-[#B3435C]/20 rounded-lg px-3 py-2 mb-3">{error}</p>}
            {success && <p className="text-sm text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-2 mb-3">{success}</p>}

            <div className="mb-3">
              <label className="block text-sm text-ink-soft mb-1">Gudang Tujuan</label>
              <select
                className="glass-field w-full md:w-64"
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
          <p className="text-sm text-ink-soft">
            PO ini sudah berstatus <strong>{badge.text}</strong>, tidak ada aksi lagi yang tersedia.
          </p>
        )}
      </div>
    </div>
  );
}