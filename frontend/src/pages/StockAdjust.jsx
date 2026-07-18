import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function StockAdjust() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [currentQty, setCurrentQty] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/products').then((res) => setProducts(res.data)).catch(console.error);
    api.get('/warehouses').then((res) => setWarehouses(res.data)).catch(console.error);
  }, []);

  // Setiap produk + gudang dipilih, cari tau dulu stok yang tercatat sekarang
  useEffect(() => {
    if (!productId || !warehouseId) {
      setCurrentQty(null);
      return;
    }
    api.get('/stock').then((res) => {
      const found = res.data.find((s) => s.productId === productId && s.warehouseId === warehouseId);
      setCurrentQty(found ? Number(found.quantity) : 0);
    }).catch(console.error);
  }, [productId, warehouseId]);

  // Proteksi tambahan di sisi frontend — kalau bukan ADMIN atau SUPERVISOR, langsung dilempar balik.
  // (Backend juga sudah menolak lewat middleware authorize('ADMIN', 'SUPERVISOR'), ini cuma UX tambahan.)
  if (user && !['ADMIN', 'SUPERVISOR'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!productId || !warehouseId) return setError('Pilih produk dan gudang terlebih dahulu');
    if (newQuantity === '' || Number(newQuantity) < 0) return setError('Isi jumlah stok yang benar (boleh 0)');
    if (!reason.trim()) return setError('Alasan koreksi wajib diisi, untuk jejak audit');

    setLoading(true);
    try {
      const { data } = await api.post('/stock/adjust', {
        productId,
        warehouseId,
        newQuantity: Number(newQuantity),
        reason: reason.trim(),
      });
      setSuccess(
        `Stok berhasil dikoreksi dari ${data.oldQuantity} menjadi ${data.newQuantity} (selisih ${data.difference > 0 ? '+' : ''}${data.difference})`
      );
      setCurrentQty(data.newQuantity);
      setNewQuantity('');
      setReason('');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal melakukan koreksi stok');
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
          <h1 className="font-display text-2xl text-ink">🔒 Koreksi Stok (Admin)</h1>
          <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand font-semibold hover:underline">← Kembali ke Dashboard</Link>
      </header>

      <div className="bg-red-50 border border-red-300 rounded p-3 mb-4 text-sm text-red-700">
        ⚠️ Fitur ini langsung mengubah angka stok tanpa melalui transaksi Masuk/Keluar biasa.
        Gunakan hanya untuk memperbaiki kesalahan data, bukan pengganti proses stok normal.
        Setiap koreksi tercatat permanen di Riwayat Stok dengan alasan yang diisi.
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-5">
        {error && <p className="text-sm text-[#B3435C] bg-[#B3435C]/10 border border-[#B3435C]/20 rounded-lg px-3 py-2 mb-3">{error}</p>}
        {success && <p className="text-sm text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-2 mb-3">{success}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-ink-soft mb-1">Produk</label>
            <select
              className="glass-field w-full"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              <option value="">-- Pilih Produk --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-ink-soft mb-1">Gudang</label>
            <select
              className="glass-field w-full"
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
        </div>

        {currentQty !== null && (
          <div className="bg-ink/5 border border-ink/10 rounded-xl p-3 mb-4 text-sm text-ink">
            Stok tercatat saat ini: <strong>{currentQty}</strong>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-ink-soft mb-1">Jumlah Stok yang Benar</label>
            <input
              type="number"
              placeholder="Masukkan angka stok sebenarnya"
              className="glass-field w-full"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              min={0}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-ink-soft mb-1">Alasan Koreksi (wajib)</label>
            <input
              type="text"
              placeholder="Misal: Salah input, barang rusak, dll"
              className="glass-field w-full"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
        >
          {loading ? 'Memproses...' : '⚠️ Koreksi Stok Sekarang'}
        </button>
      </form>
    </div>
  );
}