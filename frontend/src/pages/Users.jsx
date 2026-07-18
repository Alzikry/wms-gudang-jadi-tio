import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin (Pemilik)', desc: 'Akses penuh ke semua fitur' },
  { value: 'STAFF_ADMIN', label: 'Staff Admin', desc: 'Bisa input semua data, kecuali koreksi stok & stock opname' },
  { value: 'STAFF_GUDANG', label: 'Staff Gudang', desc: 'Hanya bisa melihat stok' },
  { value: 'SUPERVISOR', label: 'Supervisor', desc: 'Bisa koreksi stok manual' },
  { value: 'MANAGER', label: 'Manager', desc: 'Bisa proses stock opname' },
];

const roleBadge = {
  ADMIN: 'bg-red-100 text-red-700',
  STAFF_ADMIN: 'bg-blue-100 text-blue-700',
  STAFF_GUDANG: 'bg-gray-200 text-gray-700',
  SUPERVISOR: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-yellow-100 text-yellow-700',
};

const emptyForm = { name: '', email: '', password: '', role: 'STAFF_GUDANG' };

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function loadUsers() {
    api.get('/users').then((res) => setUsers(res.data)).catch(console.error);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // Proteksi tambahan di frontend — backend juga sudah menolak lewat authorize('ADMIN')
  if (user && user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/users', form);
      setForm(emptyForm);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat user');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(id, role) {
    try {
      await api.put(`/users/${id}`, { role });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah role');
    }
  }

  async function handleToggleActive(u) {
    const action = u.isActive ? 'nonaktifkan' : 'aktifkan';
    if (!confirm(`Yakin mau ${action} user "${u.name}"?`)) return;
    try {
      await api.put(`/users/${u.id}`, { isActive: !u.isActive });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status user');
    }
  }

  return (
    <div className="min-h-screen wms-bg p-6 relative">

      <div className="wms-orb wms-orb-a" aria-hidden="true" />
      <div className="wms-orb wms-orb-b" aria-hidden="true" />
      <header className="glass-panel flex justify-between items-center px-5 py-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">User Management</h1>
          <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand font-semibold hover:underline">← Kembali ke Dashboard</Link>
      </header>

      {/* Form tambah user baru */}
      <form onSubmit={handleSubmit} className="glass-panel p-5 mb-6">
        <h2 className="font-display text-lg text-ink mb-3">Tambah User Baru</h2>

        {error && <p className="text-sm text-[#B3435C] bg-[#B3435C]/10 border border-[#B3435C]/20 rounded-lg px-3 py-2 mb-3">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <input
            type="text"
            placeholder="Nama Lengkap"
            className="glass-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="glass-field"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 karakter)"
            className="glass-field"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            className="glass-field"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-ink-soft mb-3">
          {ROLE_OPTIONS.find((r) => r.value === form.role)?.desc}
        </p>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-4 py-2 rounded-xl"
        >
          {loading ? 'Menyimpan...' : 'Tambah User'}
        </button>
      </form>

      {/* Daftar user */}
      <div className="glass-panel overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wider">
            <tr>
              <th className="p-3">Nama</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-ink/5 text-ink/85">
                <td className="p-3">{u.name} {u.id === user.id && <span className="text-xs text-ink-soft/50">(Anda)</span>}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <select
                    className={`text-xs font-medium px-2 py-1 rounded border-0 ${roleBadge[u.role] || 'bg-gray-100'}`}
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  {u.isActive ? (
                    <span className="text-green-600 text-xs font-medium">Aktif</span>
                  ) : (
                    <span className="text-ink-soft/50 text-xs font-medium">Nonaktif</span>
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleToggleActive(u)}
                    className={u.isActive ? 'text-[#B3435C] font-semibold hover:underline' : 'text-green-600 font-semibold hover:underline'}
                  >
                    {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-ink-soft/60">Belum ada user</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Referensi hak akses tiap role */}
      <div className="glass-panel p-5 mt-6">
        <h2 className="font-display text-sm text-ink mb-3">Referensi Hak Akses Role</h2>
        <table className="w-full text-xs">
          <thead className="text-left text-ink-soft">
            <tr>
              <th className="p-2">Role</th>
              <th className="p-2">Lihat</th>
              <th className="p-2">Input Data</th>
              <th className="p-2">Koreksi Stok</th>
              <th className="p-2">Stock Opname</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-ink/5 text-ink/85"><td className="p-2 font-medium text-ink-soft">Admin</td><td className="p-2">✅</td><td className="p-2">✅</td><td className="p-2">✅</td><td className="p-2">✅</td></tr>
            <tr className="border-t border-ink/5 text-ink/85"><td className="p-2 font-medium text-ink-soft">Staff Admin</td><td className="p-2">✅</td><td className="p-2">✅</td><td className="p-2">❌</td><td className="p-2">❌</td></tr>
            <tr className="border-t border-ink/5 text-ink/85"><td className="p-2 font-medium text-ink-soft">Staff Gudang</td><td className="p-2">✅</td><td className="p-2">❌</td><td className="p-2">❌</td><td className="p-2">❌</td></tr>
            <tr className="border-t border-ink/5 text-ink/85"><td className="p-2 font-medium text-ink-soft">Supervisor</td><td className="p-2">✅</td><td className="p-2">❌</td><td className="p-2">✅</td><td className="p-2">❌</td></tr>
            <tr className="border-t border-ink/5 text-ink/85"><td className="p-2 font-medium text-ink-soft">Manager</td><td className="p-2">✅</td><td className="p-2">❌</td><td className="p-2">❌</td><td className="p-2">✅</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}