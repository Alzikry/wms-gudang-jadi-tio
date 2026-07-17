import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function StockOpnameDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [opname, setOpname] = useState(null);
  const [physicalQty, setPhysicalQty] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  function loadOpname() {
    return api.get(`/stock-opnames/${id}`).then((res) => {
      setOpname(res.data);
      const defaults = {};
      res.data.items.forEach((item) => {
        defaults[item.id] = item.physicalQty !== null ? Number(item.physicalQty) : '';
      });
      setPhysicalQty(defaults);
    });
  }

  useEffect(() => {
    setLoading(true);
    loadOpname()
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [id]);

  function updateQty(itemId, value) {
    setPhysicalQty((prev) => ({ ...prev, [itemId]: value }));
  }

  async function handleSave() {
    setError('');
    setSavedMsg('');

    const items = opname.items
      .filter((item) => physicalQty[item.id] !== '' && physicalQty[item.id] !== undefined)
      .map((item) => ({ itemId: item.id, physicalQty: Number(physicalQty[item.id]) }));

    if (items.length === 0) return setError('Isi jumlah hasil hitung fisik dulu');

    setSaving(true);
    try {
      await api.put(`/stock-opnames/${id}/items`, { items });
      await loadOpname();
      setSavedMsg('Hasil hitung tersimpan');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan hasil hitung');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setError('');

    const notCounted = opname.items.filter(
      (item) => physicalQty[item.id] === '' || physicalQty[item.id] === undefined
    );
    if (notCounted.length > 0) {
      return setError('Masih ada produk yang belum diisi jumlah fisiknya');
    }

    if (!confirm('Selesaikan Stock Opname ini? Stok sistem akan dikoreksi otomatis sesuai hasil hitung fisik dan tidak bisa diubah lagi.')) {
      return;
    }

    setCompleting(true);
    try {
      await handleSave();
      await api.post(`/stock-opnames/${id}/complete`);
      await loadOpname();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyelesaikan Stock Opname');
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 p-6">Memuat...</div>;
  if (!opname) return <div className="min-h-screen bg-gray-50 p-6 text-red-600">{error || 'Tidak ditemukan'}</div>;

  const isDraft = opname.status === 'DRAFT';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Stock Opname — {opname.warehouse?.name}</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/stock-opnames" className="text-sm text-brand">← Kembali ke Daftar Stock Opname</Link>
      </header>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className={`px-2 py-1 rounded text-xs font-medium ${isDraft ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
            {isDraft ? 'Sedang Dihitung' : 'Selesai'}
          </span>
          <p className="text-gray-500 text-sm">
            Dibuat {new Date(opname.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            {opname.completedAt && ` · Selesai ${new Date(opname.completedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`}
          </p>
        </div>

        {opname.note && <p className="text-sm text-gray-600 mb-4">Catatan: {opname.note}</p>}

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        {savedMsg && <p className="text-green-600 text-sm mb-3">{savedMsg}</p>}

        <table className="w-full text-sm mb-4">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Produk</th>
              <th className="p-3">Stok Sistem</th>
              <th className="p-3">Hasil Hitung Fisik</th>
              <th className="p-3">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {opname.items.map((item) => {
              const diff = item.difference !== null && item.difference !== undefined
                ? Number(item.difference)
                : (physicalQty[item.id] !== '' && physicalQty[item.id] !== undefined
                  ? Number(physicalQty[item.id]) - Number(item.systemQty)
                  : null);

              return (
                <tr key={item.id} className="border-t">
                  <td className="p-3">
                    {item.product?.name} <span className="text-gray-400">({item.product?.sku})</span>
                  </td>
                  <td className="p-3">{Number(item.systemQty)} {item.product?.unit}</td>
                  <td className="p-3">
                    {isDraft ? (
                      <input
                        type="number"
                        min={0}
                        className="border rounded px-2 py-1 w-24"
                        value={physicalQty[item.id] ?? ''}
                        onChange={(e) => updateQty(item.id, e.target.value)}
                      />
                    ) : (
                      <span>{Number(item.physicalQty)} {item.product?.unit}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {diff === null ? (
                      <span className="text-gray-400">-</span>
                    ) : diff === 0 ? (
                      <span className="text-gray-500">Sesuai</span>
                    ) : diff > 0 ? (
                      <span className="text-green-600 font-medium">+{diff} {item.product?.unit}</span>
                    ) : (
                      <span className="text-red-600 font-medium">{diff} {item.product?.unit}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {isDraft && (
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || completing}
              className="px-4 py-2 rounded border font-medium disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Hasil Hitung'}
            </button>
            <button
              onClick={handleComplete}
              disabled={saving || completing}
              className="bg-brand text-white px-4 py-2 rounded font-medium disabled:opacity-50"
            >
              {completing ? 'Memproses...' : 'Selesaikan & Koreksi Stok'}
            </button>
          </div>
        )}

        {!isDraft && (
          <p className="text-sm text-gray-500">
            Stock Opname ini sudah selesai. Selisih yang ditemukan sudah otomatis dikoreksi ke stok sistem dan tercatat di Riwayat Stok.
          </p>
        )}
      </div>
    </div>
  );
}