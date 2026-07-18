import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ReorderSuggestions() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState({});
  const [qtyOverrides, setQtyOverrides] = useState({}); // { productId: jumlah yang mau dipesan }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  function loadSuggestions() {
    setLoading(true);
    api.get('/reorder/suggestions')
      .then((res) => {
        setItems(res.data);
        // default: centang semua produk yang sudah ada Supplier Utama-nya
        const defaults = {};
        const qtyDefaults = {};
        res.data.forEach((p) => {
          if (p.preferredSupplierId) defaults[p.id] = true;
          qtyDefaults[p.id] = p.suggestedQty;
        });
        setSelected(defaults);
        setQtyOverrides(qtyDefaults);
      })
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSuggestions();
  }, []);

  function toggleSelect(id) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSelectAll() {
    const eligible = items.filter((p) => p.preferredSupplierId);
    const allSelected = eligible.every((p) => selected[p.id]);
    const next = { ...selected };
    eligible.forEach((p) => {
      next[p.id] = !allSelected;
    });
    setSelected(next);
  }

  function updateQty(id, value) {
    setQtyOverrides((prev) => ({ ...prev, [id]: value }));
  }

  function resetQty(id, suggestedQty) {
    setQtyOverrides((prev) => ({ ...prev, [id]: suggestedQty }));
  }

  async function handleGenerate() {
    setError('');
    setResult(null);
    const selectedIds = Object.keys(selected).filter((id) => selected[id]);

    if (selectedIds.length === 0) {
      return setError('Pilih minimal 1 produk yang sudah ada Supplier Utama-nya');
    }

    // Validasi: semua jumlah yang mau dipesan harus angka valid > 0
    const invalid = selectedIds.filter((id) => !Number(qtyOverrides[id]) || Number(qtyOverrides[id]) <= 0);
    if (invalid.length > 0) {
      return setError('Ada jumlah order yang kosong atau 0 — isi dulu jumlahnya sebelum membuat draft PO');
    }

    if (!confirm(`Buat draft Purchase Order otomatis untuk ${selectedIds.length} produk terpilih?`)) return;

    setGenerating(true);
    try {
      const payload = {
        items: selectedIds.map((id) => ({
          productId: id,
          quantity: Number(qtyOverrides[id]),
        })),
      };
      const res = await api.post('/reorder/generate', payload);
      setResult(res.data);
      loadSuggestions();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat draft PO otomatis');
    } finally {
      setGenerating(false);
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="min-h-screen wms-bg p-6 relative">

      <div className="wms-orb wms-orb-a" aria-hidden="true" />
      <div className="wms-orb wms-orb-b" aria-hidden="true" />
      <header className="glass-panel flex justify-between items-center px-5 py-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Auto Reorder — Saran Pembelian</h1>
          <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand font-semibold hover:underline">← Kembali ke Dashboard</Link>
      </header>

      <p className="text-sm text-ink-soft mb-4">
        Daftar di bawah ini adalah produk yang stoknya sudah di bawah atau sama dengan batas minimum.
        Kolom <strong>Jumlah Order</strong> sudah diisi saran otomatis, tapi bisa diubah manual sesuai kebutuhan.
        Produk yang belum punya <strong>Supplier Utama</strong> (di halaman Kelola Produk) tidak bisa dipilih —
        set dulu supplier-nya supaya sistem tahu draft PO ini mau dikirim ke mana.
      </p>

      {error && <p className="text-sm text-[#B3435C] bg-[#B3435C]/10 border border-[#B3435C]/20 rounded-lg px-3 py-2 mb-3">{error}</p>}

      {result && (
        <div className="bg-green-50 border border-green-300 rounded p-4 mb-4 text-sm">
          <p className="font-medium text-green-800 mb-2">
            ✓ Berhasil membuat {result.createdPOs.length} draft Purchase Order:
          </p>
          <ul className="list-disc list-inside mb-2">
            {result.createdPOs.map((po) => (
              <li key={po.id}>
                Ke <strong>{po.supplier?.name}</strong> — {po.items.length} produk (
                <Link to={`/purchase-orders/${po.id}`} className="text-brand font-semibold hover:underline underline">
                  lihat detail
                </Link>
                )
              </li>
            ))}
          </ul>
          {result.skipped.length > 0 && (
            <>
              <p className="font-medium text-yellow-700 mt-3 mb-1">⚠️ Dilewati:</p>
              <ul className="list-disc list-inside text-yellow-700">
                {result.skipped.map((s) => (
                  <li key={s.id}>{s.name} — {s.reason}</li>
                ))}
              </ul>
            </>
          )}
          <p className="text-ink-soft mt-3">
            Draft PO ini belum resmi dipesan ke supplier — buka halaman Purchase Order untuk cek & konfirmasi dulu.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-soft">Memuat...</p>
      ) : (
        <div className="glass-panel overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3">
                  <input type="checkbox" onChange={toggleSelectAll} />
                </th>
                <th className="p-3">Produk</th>
                <th className="p-3">Stok Saat Ini</th>
                <th className="p-3">Min. Stok</th>
                <th className="p-3">Jumlah Order</th>
                <th className="p-3">Supplier Utama</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-ink/5 text-ink/85">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={!!selected[p.id]}
                      disabled={!p.preferredSupplierId}
                      onChange={() => toggleSelect(p.id)}
                    />
                  </td>
                  <td className="p-3">{p.name} <span className="text-ink-soft/50">({p.sku})</span></td>
                  <td className="p-3 text-[#B3435C] font-medium">{p.currentStock} {p.unit}</td>
                  <td className="p-3">{p.minStock} {p.unit}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="glass-field w-24"
                        value={qtyOverrides[p.id] ?? ''}
                        onChange={(e) => updateQty(p.id, e.target.value)}
                        disabled={!p.preferredSupplierId}
                        min={1}
                      />
                      <span className="text-ink-soft/50 text-xs">{p.unit}</span>
                      {Number(qtyOverrides[p.id]) !== p.suggestedQty && (
                        <button
                          type="button"
                          onClick={() => resetQty(p.id, p.suggestedQty)}
                          className="text-xs text-brand font-semibold hover:underline underline"
                          title={`Kembalikan ke saran otomatis: ${p.suggestedQty}`}
                        >
                          reset
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    {p.preferredSupplierName || (
                      <span className="text-yellow-600">Belum di-set</span>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-ink-soft/60">
                    Semua stok masih aman, belum ada yang perlu di-reorder 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && (
        <button
          onClick={handleGenerate}
          disabled={generating || selectedCount === 0}
          className="bg-brand text-white px-5 py-2.5 rounded font-medium mt-4 disabled:opacity-50"
        >
          {generating ? 'Membuat draft PO...' : `Buat Draft PO Otomatis (${selectedCount} produk)`}
        </button>
      )}
    </div>
  );
}