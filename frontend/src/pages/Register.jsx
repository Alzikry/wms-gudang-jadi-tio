import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registrasi gagal');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-8 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Daftar WMS Pro</h1>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <input
          type="text"
          placeholder="Nama Perusahaan / UMKM"
          className="w-full border rounded px-3 py-2"
          value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Nama Lengkap Anda"
          className="w-full border rounded px-3 py-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full border rounded px-3 py-2"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password (min 6 karakter)"
          className="w-full border rounded px-3 py-2"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {loading ? 'Memproses...' : 'Daftar'}
        </button>

        <p className="text-sm text-center text-gray-500">
          Sudah punya akun? <Link to="/login" className="text-brand">Login</Link>
        </p>
      </form>
    </div>
  );
}
