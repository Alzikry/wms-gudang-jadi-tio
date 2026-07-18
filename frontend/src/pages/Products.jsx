import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = { sku: '', name: '', unit: 'pcs', minStock: 0, barcode: '', preferredSupplierId: '' };

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function loadProducts() {
    api.get('/products').then((res) => setProducts(res.data)).catch(console.error);
  }

  useEffect(() => {
    loadProducts();
    api.get('/suppliers').then((res) => setSuppliers(res.data)).catch(console.error);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        minStock: Number(form.minStock),
        barcode: form.barcode || null,
        preferredSupplierId: form.preferredSupplierId || null,
      };
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan produk');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(product) {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      minStock: product.minStock,
      barcode: product.barcode || '',
      preferredSupplierId: product.preferredSupplierId || '',
    });
  }

  async function handleDelete(id) {
    if (!confirm('Yakin hapus produk ini?')) return;
    try {
      await api.delete(`/products/${id}`);
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus produk');
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <div className="min-h-screen wms-bg p-6">
      <div className="wms-orb wms-orb-a" aria-hidden="true" />
      <div className="wms-orb wms-orb-b" aria-hidden="true" />

      <div className="relative max-w-6xl mx-auto">
        <header className="glass-panel flex justify-between items-center px-5 py-4 mb-6">
          <div>
            <h1 className="font-display text-2xl text-ink">Master Data Produk</h1>
            <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
          </div>
          <Link to="/dashboard" className="text-sm text-brand font-semibold hover:underline">← Kembali ke Dashboard</Link>
        </header>

        {/* Form tambah/edit produk */}
        <form onSubmit={handleSubmit} className="glass-panel p-5 mb-6">
          <h2 className="font-display text-lg text-ink mb-3">{editingId ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>

          {error && (
            <p className="text-sm text-[#B3435C] bg-[#B3435C]/10 border border-[#B3435C]/20 rounded-lg px-3 py-2 mb-3">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
            <input
              type="text"
              placeholder="SKU (kode unik)"
              className="glass-field"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Nama Produk"
              className="glass-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Satuan (pcs, kg, dus, dll)"
              className="glass-field"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
            <input
              type="number"
              placeholder="Stok Minimum"
              className="glass-field"
              value={form.minStock}
              onChange={(e) => setForm({ ...form, minStock: e.target.value })}
              min={0}
            />
            <input
              type="text"
              placeholder="Barcode (opsional)"
              className="glass-field"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
            <select
              className="glass-field"
              value={form.preferredSupplierId}
              onChange={(e) => setForm({ ...form, preferredSupplierId: e.target.value })}
            >
              <option value="">-- Supplier Utama (opsional) --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-4 py-2 rounded-xl"
            >
              {loading ? 'Menyimpan...' : editingId ? 'Update Produk' : 'Tambah Produk'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 rounded-xl border border-ink/15 text-ink-soft hover:bg-ink/5 transition-colors"
              >
                Batal
              </button>
            )}
          </div>
        </form>

        {/* Tabel daftar produk */}
        <div className="glass-panel overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wider">
                <th className="p-3 font-medium">SKU</th>
                <th className="p-3 font-medium">Nama Produk</th>
                <th className="p-3 font-medium">Satuan</th>
                <th className="p-3 font-medium">Min. Stok</th>
                <th className="p-3 font-medium">Barcode</th>
                <th className="p-3 font-medium">Supplier Utama</th>
                <th className="p-3 font-medium">Stok Saat Ini</th>
                <th className="p-3 font-medium">Lokasi Rak</th>
                <th className="p-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-ink/5 text-ink/85">
                  <td className="p-3 font-mono text-ink-soft">{p.sku}</td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.unit}</td>
                  <td className="p-3">{p.minStock}</td>
                  <td className="p-3 text-ink-soft">{p.barcode || '-'}</td>
                  <td className="p-3 text-ink-soft">
                    {p.preferredSupplier?.name || <span className="text-ink-soft/50">Belum di-set</span>}
                  </td>
                  <td className="p-3 font-mono font-semibold">
                    {p.stocks && p.stocks.length > 0
                      ? p.stocks.reduce((sum, s) => sum + Number(s.quantity), 0)
                      : 0}
                  </td>
                  <td className="p-3 text-ink-soft">
                    {(() => {
                      const bin = p.stocks?.find((s) => s.bin)?.bin;
                      return bin ? `${bin.code}${bin.name ? ` - ${bin.name}` : ''}` : '-';
                    })()}
                  </td>
                  <td className="p-3 space-x-3">
                    <button onClick={() => handleEdit(p)} className="text-brand font-semibold hover:underline">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-[#B3435C] font-semibold hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={9} className="p-6 text-center text-ink-soft/60">Belum ada produk</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
