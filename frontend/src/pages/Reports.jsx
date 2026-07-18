import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    api.get('/reports/summary').then((res) => setSummary(res.data)).catch(console.error);
  }, []);

  // Download file Excel dari backend — respons berupa binary, jadi pakai blob
  async function handleExport(type) {
    setExporting(type);
    try {
      const endpoint = type === 'movements' ? '/reports/export/movements' : '/reports/export/products';
      const res = await api.get(endpoint, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = type === 'movements' ? 'riwayat-stok.xlsx' : 'data-produk.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mengunduh file laporan');
      console.error(err);
    } finally {
      setExporting('');
    }
  }

  return (
    <div className="min-h-screen wms-bg p-6 relative">

      <div className="wms-orb wms-orb-a" aria-hidden="true" />
      <div className="wms-orb wms-orb-b" aria-hidden="true" />
      <header className="glass-panel flex justify-between items-center px-5 py-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Laporan</h1>
          <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand font-semibold hover:underline">← Kembali ke Dashboard</Link>
      </header>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel p-4">
          <p className="text-sm text-ink-soft">Total Produk</p>
          <p className="font-display text-2xl text-ink">{summary?.totalProducts ?? '-'}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-ink-soft">Total Gudang</p>
          <p className="font-display text-2xl text-ink">{summary?.totalWarehouses ?? '-'}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-ink-soft">Total Unit Stok</p>
          <p className="font-display text-2xl text-ink">{summary?.totalStockUnits ?? '-'}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-ink-soft">Stok Menipis</p>
          <p className={`font-display text-2xl text-ink ${summary?.lowStockCount > 0 ? 'text-[#B3435C]' : ''}`}>
            {summary?.lowStockCount ?? '-'}
          </p>
        </div>
      </div>

      {/* Tombol export */}
      <div className="glass-panel p-5 mb-6">
        <h2 className="font-display text-lg text-ink mb-3">Export Laporan ke Excel</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport('products')}
            disabled={exporting === 'products'}
            className="bg-green-600 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
          >
            {exporting === 'products' ? 'Menyiapkan...' : '📊 Export Data Produk & Stok'}
          </button>
          <button
            onClick={() => handleExport('movements')}
            disabled={exporting === 'movements'}
            className="bg-blue-600 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
          >
            {exporting === 'movements' ? 'Menyiapkan...' : '📄 Export Riwayat Stok'}
          </button>
        </div>
      </div>

      {/* Daftar produk stok menipis */}
      {summary?.lowStockProducts?.length > 0 && (
        <div className="glass-panel overflow-hidden overflow-x-auto">
          <div className="p-3 border-b border-ink/10 font-medium text-sm text-ink">⚠️ Produk dengan Stok Menipis</div>
          <table className="w-full text-sm">
            <thead className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Nama Produk</th>
                <th className="p-3">Stok Saat Ini</th>
                <th className="p-3">Min. Stok</th>
              </tr>
            </thead>
            <tbody>
              {summary.lowStockProducts.map((p) => (
                <tr key={p.id} className="border-t border-ink/5 text-ink/85">
                  <td className="p-3">{p.sku}</td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-[#B3435C] font-medium">{p.currentStock} {p.unit}</td>
                  <td className="p-3">{p.minStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}