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
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Laporan</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand">← Kembali ke Dashboard</Link>
      </header>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total Produk</p>
          <p className="text-2xl font-semibold">{summary?.totalProducts ?? '-'}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total Gudang</p>
          <p className="text-2xl font-semibold">{summary?.totalWarehouses ?? '-'}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total Unit Stok</p>
          <p className="text-2xl font-semibold">{summary?.totalStockUnits ?? '-'}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Stok Menipis</p>
          <p className={`text-2xl font-semibold ${summary?.lowStockCount > 0 ? 'text-red-600' : ''}`}>
            {summary?.lowStockCount ?? '-'}
          </p>
        </div>
      </div>

      {/* Tombol export */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-medium mb-3">Export Laporan ke Excel</h2>
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
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-3 border-b font-medium text-sm">⚠️ Produk dengan Stok Menipis</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Nama Produk</th>
                <th className="p-3">Stok Saat Ini</th>
                <th className="p-3">Min. Stok</th>
              </tr>
            </thead>
            <tbody>
              {summary.lowStockProducts.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.sku}</td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-red-600 font-medium">{p.currentStock} {p.unit}</td>
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