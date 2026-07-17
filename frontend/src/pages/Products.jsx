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
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Master Data Produk</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand">← Kembali ke Dashboard</Link>
      </header>

      {/* Form tambah/edit produk */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-medium mb-3">{editingId ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
          <input
            type="text"
            placeholder="SKU (kode unik)"
            className="border rounded px-3 py-2"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Nama Produk"
            className="border rounded px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Satuan (pcs, kg, dus, dll)"
            className="border rounded px-3 py-2"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <input
            type="number"
            placeholder="Stok Minimum"
            className="border rounded px-3 py-2"
            value={form.minStock}
            onChange={(e) => setForm({ ...form, minStock: e.target.value })}
            min={0}
          />
          <input
            type="text"
            placeholder="Barcode (opsional)"
            className="border rounded px-3 py-2"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          />
          <select
            className="border rounded px-3 py-2"
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
            className="bg-brand text-white px-4 py-2 rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : editingId ? 'Update Produk' : 'Tambah Produk'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded border">
              Batal
            </button>
          )}
        </div>
      </form>

      {/* Tabel daftar produk */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">SKU</th>
              <th className="p-3">Nama Produk</th>
              <th className="p-3">Satuan</th>
              <th className="p-3">Min. Stok</th>
              <th className="p-3">Barcode</th>
              <th className="p-3">Supplier Utama</th>
              <th className="p-3">Stok Saat Ini</th>
              <th className="p-3">Lokasi Rak</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.sku}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.unit}</td>
                <td className="p-3">{p.minStock}</td>
                <td className="p-3 text-gray-600">{p.barcode || '-'}</td>
                <td className="p-3 text-gray-600">
                  {p.preferredSupplier?.name || <span className="text-gray-400">Belum di-set</span>}
                </td>
                <td className="p-3 font-medium">
                  {p.stocks && p.stocks.length > 0
                    ? p.stocks.reduce((sum, s) => sum + Number(s.quantity), 0)
                    : 0}
                </td>
                <td className="p-3 text-gray-600">
                  {(() => {
                    const bin = p.stocks?.find((s) => s.bin)?.bin;
                    return bin ? `${bin.code}${bin.name ? ` - ${bin.name}` : ''}` : '-';
                  })()}
                </td>
                <td className="p-3 space-x-3">
                  <button onClick={() => handleEdit(p)} className="text-blue-600">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600">Hapus</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={9} className="p-3 text-center text-gray-400">Belum ada produk</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}