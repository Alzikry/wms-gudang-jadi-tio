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
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-gray-500 text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand">← Kembali ke Dashboard</Link>
      </header>

      {/* Form tambah user baru */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-medium mb-3">Tambah User Baru</h2>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <input
            type="text"
            placeholder="Nama Lengkap"
            className="border rounded px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="border rounded px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 karakter)"
            className="border rounded px-3 py-2"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            className="border rounded px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          {ROLE_OPTIONS.find((r) => r.value === form.role)?.desc}
        </p>

        <button
          type="submit"
          disabled={loading}
          className="bg-brand text-white px-4 py-2 rounded font-medium disabled:opacity-50"
        >
          {loading ? 'Menyimpan...' : 'Tambah User'}
        </button>
      </form>

      {/* Daftar user */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
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
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.name} {u.id === user.id && <span className="text-xs text-gray-400">(Anda)</span>}</td>
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
                    <span className="text-gray-400 text-xs font-medium">Nonaktif</span>
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleToggleActive(u)}
                    className={u.isActive ? 'text-red-600' : 'text-green-600'}
                  >
                    {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="p-3 text-center text-gray-400">Belum ada user</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Referensi hak akses tiap role */}
      <div className="bg-white rounded-xl shadow p-5 mt-6">
        <h2 className="font-medium mb-3 text-sm">Referensi Hak Akses Role</h2>
        <table className="w-full text-xs">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="p-2">Role</th>
              <th className="p-2">Lihat</th>
              <th className="p-2">Input Data</th>
              <th className="p-2">Koreksi Stok</th>
              <th className="p-2">Stock Opname</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t"><td className="p-2 font-medium">Admin</td><td className="p-2">✅</td><td className="p-2">✅</td><td className="p-2">✅</td><td className="p-2">✅</td></tr>
            <tr className="border-t"><td className="p-2 font-medium">Staff Admin</td><td className="p-2">✅</td><td className="p-2">✅</td><td className="p-2">❌</td><td className="p-2">❌</td></tr>
            <tr className="border-t"><td className="p-2 font-medium">Staff Gudang</td><td className="p-2">✅</td><td className="p-2">❌</td><td className="p-2">❌</td><td className="p-2">❌</td></tr>
            <tr className="border-t"><td className="p-2 font-medium">Supervisor</td><td className="p-2">✅</td><td className="p-2">❌</td><td className="p-2">✅</td><td className="p-2">❌</td></tr>
            <tr className="border-t"><td className="p-2 font-medium">Manager</td><td className="p-2">✅</td><td className="p-2">❌</td><td className="p-2">❌</td><td className="p-2">✅</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}