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

  if (loading) return <div className="min-h-screen wms-bg p-6 relative">Memuat...</div>;
  if (!opname) return <div className="min-h-screen wms-bg p-6 flex items-center justify-center text-[#B3435C] font-medium">{error || 'Tidak ditemukan'}</div>;

  const isDraft = opname.status === 'DRAFT';

  return (
    <div className="min-h-screen wms-bg p-6 relative">

      <div className="wms-orb wms-orb-a" aria-hidden="true" />
      <div className="wms-orb wms-orb-b" aria-hidden="true" />
      <header className="glass-panel flex justify-between items-center px-5 py-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Stock Opname — {opname.warehouse?.name}</h1>
          <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/stock-opnames" className="text-sm text-brand font-semibold hover:underline">← Kembali ke Daftar Stock Opname</Link>
      </header>

      <div className="glass-panel p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className={`px-2 py-1 rounded text-xs font-medium ${isDraft ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
            {isDraft ? 'Sedang Dihitung' : 'Selesai'}
          </span>
          <p className="text-ink-soft text-sm">
            Dibuat {new Date(opname.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            {opname.completedAt && ` · Selesai ${new Date(opname.completedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`}
          </p>
        </div>

        {opname.note && <p className="text-sm text-ink-soft mb-4">Catatan: {opname.note}</p>}

        {error && <p className="text-sm text-[#B3435C] bg-[#B3435C]/10 border border-[#B3435C]/20 rounded-lg px-3 py-2 mb-3">{error}</p>}
        {savedMsg && <p className="text-sm text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-2 mb-3">{savedMsg}</p>}

        <table className="w-full text-sm mb-4">
          <thead className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wider">
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
                <tr key={item.id} className="border-t border-ink/5 text-ink/85">
                  <td className="p-3">
                    {item.product?.name} <span className="text-ink-soft/50">({item.product?.sku})</span>
                  </td>
                  <td className="p-3">{Number(item.systemQty)} {item.product?.unit}</td>
                  <td className="p-3">
                    {isDraft ? (
                      <input
                        type="number"
                        min={0}
                        className="glass-field w-24"
                        value={physicalQty[item.id] ?? ''}
                        onChange={(e) => updateQty(item.id, e.target.value)}
                      />
                    ) : (
                      <span>{Number(item.physicalQty)} {item.product?.unit}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {diff === null ? (
                      <span className="text-ink-soft/50">-</span>
                    ) : diff === 0 ? (
                      <span className="text-ink-soft">Sesuai</span>
                    ) : diff > 0 ? (
                      <span className="text-green-600 font-medium">+{diff} {item.product?.unit}</span>
                    ) : (
                      <span className="text-[#B3435C] font-medium">{diff} {item.product?.unit}</span>
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
              className="px-4 py-2 rounded-xl border border-ink/15 text-ink-soft hover:bg-ink/5 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Hasil Hitung'}
            </button>
            <button
              onClick={handleComplete}
              disabled={saving || completing}
              className="btn-primary px-4 py-2 rounded-xl"
            >
              {completing ? 'Memproses...' : 'Selesaikan & Koreksi Stok'}
            </button>
          </div>
        )}

        {!isDraft && (
          <p className="text-sm text-ink-soft">
            Stock Opname ini sudah selesai. Selisih yang ditemukan sudah otomatis dikoreksi ke stok sistem dan tercatat di Riwayat Stok.
          </p>
        )}
      </div>
    </div>
  );
}