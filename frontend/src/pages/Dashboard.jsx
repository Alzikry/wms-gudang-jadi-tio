import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useStockEvents } from '../hooks/useStockEvents';

// Satu sumber data buat semua nav — dipakai bareng oleh tombol desktop, bottom tab mobile,
// dan drawer "Semua Menu". roles: null artinya semua role boleh lihat.
const NAV_ITEMS = [
  { to: '/products', icon: '📋', label: 'Kelola Produk', roles: ['ADMIN', 'STAFF_ADMIN'], variant: 'brand', group: 'utama' },
  { to: '/stock', icon: '📦', label: 'Transaksi Stok', roles: ['ADMIN', 'STAFF_ADMIN'], variant: 'dark', group: 'utama' },
  { to: '/stock/history', icon: '🕒', label: 'Riwayat Stok', roles: null, variant: 'outline', group: 'utama' },
  { to: '/stock/transfer', icon: '🔁', label: 'Transfer Gudang', roles: ['ADMIN', 'STAFF_ADMIN'], variant: 'outline', group: 'gudang' },
  { to: '/stock/by-warehouse', icon: '🗂️', label: 'Stok per Gudang', roles: null, variant: 'outline', group: 'gudang' },
  { to: '/warehouses', icon: '🏢', label: 'Kelola Gudang', roles: ['ADMIN', 'STAFF_ADMIN'], variant: 'outline', group: 'gudang' },
  { to: '/locations', icon: '📍', label: 'Lokasi Gudang', roles: ['ADMIN', 'STAFF_ADMIN'], variant: 'outline', group: 'gudang' },
  { to: '/stock-opnames', icon: '🧮', label: 'Stock Opname', roles: ['ADMIN', 'MANAGER'], variant: 'outline', group: 'gudang' },
  { to: '/barcode', icon: '📷', label: 'Scan Barcode', roles: null, variant: 'outline', group: 'gudang' },
  { to: '/reports', icon: '📊', label: 'Laporan', roles: null, variant: 'purple', group: 'bisnis' },
  { to: '/suppliers', icon: '🏭', label: 'Data Supplier', roles: ['ADMIN', 'STAFF_ADMIN'], variant: 'outline', group: 'bisnis' },
  { to: '/purchase-orders', icon: '📋', label: 'Purchase Order', roles: ['ADMIN', 'STAFF_ADMIN'], variant: 'outline', group: 'bisnis' },
  { to: '/customers', icon: '👥', label: 'Data Customer', roles: ['ADMIN', 'STAFF_ADMIN'], variant: 'outline', group: 'bisnis' },
  { to: '/sales-orders', icon: '🚚', label: 'Sales Order', roles: ['ADMIN', 'STAFF_ADMIN'], variant: 'outline', group: 'bisnis' },
  { to: '/reorder', icon: '🔄', label: 'Auto Reorder', roles: ['ADMIN', 'STAFF_ADMIN'], variant: 'orange', group: 'bisnis' },
  { to: '/stock/adjust', icon: '🔒', label: 'Koreksi Stok', roles: ['ADMIN', 'SUPERVISOR'], variant: 'red', group: 'admin' },
  { to: '/users', icon: '👤', label: 'User Management', roles: ['ADMIN'], variant: 'indigo', group: 'admin' },
];

// Urutan prioritas buat isi bottom tab bar mobile (maks 4 slot + Home).
// Diambil yang pertama accessible sesuai role user yang login.
const MOBILE_TAB_PRIORITY = ['/stock', '/stock/history', '/products', '/stock/by-warehouse', '/reports', '/barcode'];

const VARIANT_CLASS = {
  brand: 'bg-brand text-white',
  dark: 'bg-gray-800 text-white',
  outline: 'bg-white border',
  purple: 'bg-purple-600 text-white',
  orange: 'bg-orange-600 text-white',
  red: 'bg-red-600 text-white',
  indigo: 'bg-indigo-600 text-white',
};

const GROUP_LABELS = { gudang: 'Stok & Gudang', bisnis: 'Transaksi Bisnis', admin: 'Khusus Admin' };

export default function Dashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    api.get('/products').then((res) => setProducts(res.data)).catch(console.error);
  }, []);

  const handleUpdated = useCallback(() => {
    api.get('/products').then((res) => setProducts(res.data)).catch(console.error);
  }, []);

  const handleLowAlert = useCallback((data) => {
    setAlerts((prev) => [data, ...prev].slice(0, 5));
  }, []);

  useStockEvents({ onUpdated: handleUpdated, onLowAlert: handleLowAlert });

  const canSee = (item) => !item.roles || item.roles.includes(user?.role);
  const visibleItems = NAV_ITEMS.filter(canSee);

  // Isi bottom tab: Home selalu ada, sisanya 3 slot diambil dari prioritas yang accessible
  const mobileTabs = [
    { to: '/dashboard', icon: '🏠', label: 'Home' },
    ...MOBILE_TAB_PRIORITY
      .map((path) => visibleItems.find((i) => i.to === path))
      .filter(Boolean)
      .slice(0, 3),
  ];

  const groupedForDrawer = ['gudang', 'bisnis', 'admin'].map((g) => ({
    key: g,
    title: GROUP_LABELS[g],
    items: visibleItems.filter((i) => i.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      <div className="p-6">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard Gudang</h1>
            <p className="text-gray-500 text-sm">Halo, {user?.name} ({user?.role})</p>
          </div>
          <button onClick={logout} className="text-sm text-red-600">Keluar</button>
        </header>

        {/* ===== NAV DESKTOP — tombol lengkap, disembunyikan di mobile ===== */}
        <div className="hidden md:flex mb-4 flex-wrap gap-2">
          {visibleItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`inline-block px-4 py-2 rounded text-sm font-medium ${VARIANT_CLASS[item.variant]}`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </div>

        {/* ===== NAV MOBILE — tombol buka drawer, navigasi utama ada di bottom tab bar ===== */}
        <button
          onClick={() => setShowMoreMenu(true)}
          className="md:hidden w-full mb-4 bg-white border rounded-lg px-4 py-3 text-sm font-medium text-left flex justify-between items-center"
        >
          <span>☰ Semua Menu</span>
          <span className="text-gray-400">→</span>
        </button>

        {alerts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mb-4 text-sm">
            <strong>⚠️ Stok Menipis:</strong>
            <ul className="list-disc list-inside">
              {alerts.map((a, i) => (
                <li key={i}>{a.productName} — sisa {a.currentQty} (min {a.minStock})</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Nama Produk</th>
                <th className="p-3">Satuan</th>
                <th className="p-3">Min. Stok</th>
                <th className="p-3">Stok Saat Ini</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const currentStock = p.stocks && p.stocks.length > 0
                  ? p.stocks.reduce((sum, s) => sum + Number(s.quantity), 0)
                  : 0;
                const isLow = currentStock <= p.minStock;
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{p.sku}</td>
                    <td className="p-3">{p.name}</td>
                    <td className="p-3">{p.unit}</td>
                    <td className="p-3">{p.minStock}</td>
                    <td className={`p-3 font-medium ${isLow ? 'text-red-600' : ''}`}>{currentStock}</td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr><td colSpan={5} className="p-3 text-center text-gray-400">Belum ada produk</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== BOTTOM TAB BAR — cuma muncul di mobile, isinya sesuai role ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center py-2 z-40">
        {mobileTabs.map((tab) => {
          const active = location.pathname === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs ${active ? 'text-brand font-semibold' : 'text-gray-500'}`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
        <button
          onClick={() => setShowMoreMenu(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 text-xs text-gray-500"
        >
          <span className="text-lg leading-none">☰</span>
          Lainnya
        </button>
      </nav>

      {/* ===== DRAWER MENU LENGKAP (mobile) — slide-up dari bawah, sesuai role ===== */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMoreMenu(false)} />
          <div className="relative bg-white w-full max-h-[80vh] overflow-y-auto rounded-t-2xl p-5 pb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Semua Menu</h2>
              <button onClick={() => setShowMoreMenu(false)} className="text-gray-400 text-xl leading-none">✕</button>
            </div>

            {groupedForDrawer.map((group) => (
              <div key={group.key} className="mb-5">
                <p className="text-xs uppercase text-gray-400 font-medium mb-2">{group.title}</p>
                <div className="grid grid-cols-3 gap-3">
                  {group.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setShowMoreMenu(false)}
                      className={`flex flex-col items-center gap-1 rounded-lg py-3 text-xs text-center ${
                        group.key === 'admin' ? 'bg-red-50' : 'bg-gray-50'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}