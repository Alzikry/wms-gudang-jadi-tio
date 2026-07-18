import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useStockEvents } from '../hooks/useStockEvents';

// Satu sumber data buat semua nav — dipakai bareng oleh tombol desktop, bottom tab mobile,
// dan drawer "Semua Menu". roles: null artinya semua role boleh lihat.
const NAV_ITEMS = [
  { to: '/products', icon: '📋', label: 'Kelola Produk', roles: ['ADMIN', 'STAFF_ADMIN'], group: 'utama' },
  { to: '/stock', icon: '📦', label: 'Transaksi Stok', roles: ['ADMIN', 'STAFF_ADMIN'], group: 'utama' },
  { to: '/stock/history', icon: '🕒', label: 'Riwayat Stok', roles: null, group: 'utama' },
  { to: '/stock/transfer', icon: '🔁', label: 'Transfer Gudang', roles: ['ADMIN', 'STAFF_ADMIN'], group: 'gudang' },
  { to: '/stock/by-warehouse', icon: '🗂️', label: 'Stok per Gudang', roles: null, group: 'gudang' },
  { to: '/warehouses', icon: '🏢', label: 'Kelola Gudang', roles: ['ADMIN', 'STAFF_ADMIN'], group: 'gudang' },
  { to: '/locations', icon: '📍', label: 'Lokasi Gudang', roles: ['ADMIN', 'STAFF_ADMIN'], group: 'gudang' },
  { to: '/stock-opnames', icon: '🧮', label: 'Stock Opname', roles: ['ADMIN', 'MANAGER'], group: 'gudang' },
  { to: '/barcode', icon: '📷', label: 'Scan Barcode', roles: null, group: 'gudang' },
  { to: '/reports', icon: '📊', label: 'Laporan', roles: null, group: 'bisnis' },
  { to: '/suppliers', icon: '🏭', label: 'Data Supplier', roles: ['ADMIN', 'STAFF_ADMIN'], group: 'bisnis' },
  { to: '/purchase-orders', icon: '📋', label: 'Purchase Order', roles: ['ADMIN', 'STAFF_ADMIN'], group: 'bisnis' },
  { to: '/customers', icon: '👥', label: 'Data Customer', roles: ['ADMIN', 'STAFF_ADMIN'], group: 'bisnis' },
  { to: '/sales-orders', icon: '🚚', label: 'Sales Order', roles: ['ADMIN', 'STAFF_ADMIN'], group: 'bisnis' },
  { to: '/reorder', icon: '🔄', label: 'Auto Reorder', roles: ['ADMIN', 'STAFF_ADMIN'], group: 'bisnis' },
  { to: '/stock/adjust', icon: '🔒', label: 'Koreksi Stok', roles: ['ADMIN', 'SUPERVISOR'], group: 'admin' },
  { to: '/users', icon: '👤', label: 'User Management', roles: ['ADMIN'], group: 'admin' },
];

// Urutan prioritas buat isi bottom tab bar mobile (maks 4 slot + Home).
const MOBILE_TAB_PRIORITY = ['/stock', '/stock/history', '/products', '/stock/by-warehouse', '/reports', '/barcode'];

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

  const withStock = products.map((p) => {
    const currentStock = p.stocks?.length ? p.stocks.reduce((sum, s) => sum + Number(s.quantity), 0) : 0;
    return { ...p, currentStock, isLow: currentStock <= p.minStock };
  });

  return (
    <div className="min-h-screen wms-bg pb-24 md:pb-8">
      {/* Ambient glow orbs — dekorasi latar, tidak interaktif */}
      <div className="wms-orb wms-orb-a" aria-hidden="true" />
      <div className="wms-orb wms-orb-b" aria-hidden="true" />

      <div className="relative px-4 pt-6 md:px-8 md:pt-8 max-w-5xl mx-auto">
        {/* ===== HEADER ===== */}
        <header className="glass-panel flex justify-between items-center px-5 py-4 mb-5">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Dashboard Gudang</h1>
            <p className="text-cyan-100/60 text-xs md:text-sm mt-0.5">
              {user?.name} <span className="text-cyan-300/80">· {user?.role}</span>
            </p>
          </div>
          <button
            onClick={logout}
            className="text-xs font-medium text-red-300 bg-red-500/10 border border-red-400/30 rounded-full px-3 py-1.5 hover:bg-red-500/20 transition-colors"
          >
            Keluar
          </button>
        </header>

        {/* ===== NAV DESKTOP ===== */}
        <div className="hidden md:flex mb-5 flex-wrap gap-2.5">
          {visibleItems.map((item) => (
            <Link key={item.to} to={item.to} className="nav-chip">
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </div>

        {/* ===== NAV MOBILE — buka drawer ===== */}
        <button
          onClick={() => setShowMoreMenu(true)}
          className="md:hidden glass-panel w-full mb-5 px-5 py-3.5 text-sm font-medium text-left flex justify-between items-center text-white/90"
        >
          <span className="flex items-center gap-2">
            <span className="text-lg">☰</span> Semua Menu
          </span>
          <span className="text-cyan-300">→</span>
        </button>

        {/* ===== ALERT STOK MENIPIS ===== */}
        {alerts.length > 0 && (
          <div className="glass-panel border-amber-400/30 px-5 py-4 mb-5">
            <p className="text-amber-300 font-semibold text-sm flex items-center gap-2 mb-2">
              <span>⚠️</span> Stok Menipis
            </p>
            <ul className="space-y-1">
              {alerts.map((a, i) => (
                <li key={i} className="text-amber-100/80 text-xs">
                  {a.productName} — sisa <span className="font-mono font-semibold">{a.currentQty}</span> (min {a.minStock})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ===== DAFTAR PRODUK — kartu di mobile, tabel di desktop ===== */}
        <section>
          <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
            Ringkasan Stok
          </h2>

          {/* Mobile: kartu kaca, satu per produk, tidak ada yang kepotong */}
          <div className="md:hidden space-y-3">
            {withStock.map((p) => (
              <div key={p.id} className="glass-panel px-4 py-3.5">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{p.name}</p>
                    <p className="text-cyan-200/50 text-xs font-mono mt-0.5">{p.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-mono font-bold text-lg leading-none ${p.isLow ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {p.currentStock}
                    </p>
                    <p className="text-white/40 text-[11px] mt-1">{p.unit}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                  <span className="text-white/40 text-[11px]">Min. stok: {p.minStock} {p.unit}</span>
                  {p.isLow && (
                    <span className="text-[10px] font-semibold text-rose-300 bg-rose-500/15 border border-rose-400/30 rounded-full px-2 py-0.5">
                      Perlu restock
                    </span>
                  )}
                </div>
              </div>
            ))}
            {withStock.length === 0 && (
              <div className="glass-panel px-5 py-8 text-center text-white/40 text-sm">
                Belum ada produk
              </div>
            )}
          </div>

          {/* Desktop: tabel klasik di dalam kartu kaca */}
          <div className="hidden md:block glass-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/50 text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium">SKU</th>
                  <th className="p-4 font-medium">Nama Produk</th>
                  <th className="p-4 font-medium">Satuan</th>
                  <th className="p-4 font-medium">Min. Stok</th>
                  <th className="p-4 font-medium">Stok Saat Ini</th>
                </tr>
              </thead>
              <tbody>
                {withStock.map((p) => (
                  <tr key={p.id} className="border-t border-white/5 text-white/80">
                    <td className="p-4 font-mono text-cyan-200/70">{p.sku}</td>
                    <td className="p-4 font-medium">{p.name}</td>
                    <td className="p-4 text-white/50">{p.unit}</td>
                    <td className="p-4 text-white/50">{p.minStock}</td>
                    <td className={`p-4 font-mono font-semibold ${p.isLow ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {p.currentStock}
                    </td>
                  </tr>
                ))}
                {withStock.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-white/40">Belum ada produk</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ===== BOTTOM TAB BAR (mobile) ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-3">
        <div className="glass-panel flex justify-around items-center py-2 px-1">
          {mobileTabs.map((tab) => {
            const active = location.pathname === tab.to;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] transition-colors ${
                  active ? 'text-cyan-300 bg-cyan-400/10' : 'text-white/50'
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}
          <button
            onClick={() => setShowMoreMenu(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] text-white/50"
          >
            <span className="text-lg leading-none">☰</span>
            Lainnya
          </button>
        </div>
      </nav>

      {/* ===== DRAWER MENU LENGKAP (mobile) ===== */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowMoreMenu(false)} />
          <div className="relative w-full max-h-[80vh] overflow-y-auto rounded-t-3xl p-5 pb-8 drawer-panel">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-lg text-white">Semua Menu</h2>
              <button onClick={() => setShowMoreMenu(false)} className="text-white/40 text-xl leading-none">✕</button>
            </div>

            {groupedForDrawer.map((group) => (
              <div key={group.key} className="mb-5">
                <p className="text-[11px] uppercase text-white/40 font-semibold mb-2.5 tracking-wider">{group.title}</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setShowMoreMenu(false)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl py-3.5 text-[11px] text-center ${
                        group.key === 'admin' ? 'drawer-tile-admin' : 'drawer-tile'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-white/80 leading-tight">{item.label}</span>
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