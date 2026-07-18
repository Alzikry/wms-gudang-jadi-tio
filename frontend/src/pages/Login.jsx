import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal');
    }
  }

  return (
    <div className="min-h-screen wms-bg flex items-center justify-center px-4">
      <div className="wms-orb wms-orb-a" aria-hidden="true" />
      <div className="wms-orb wms-orb-b" aria-hidden="true" />

      <form
        onSubmit={handleSubmit}
        className="glass-panel relative w-full max-w-sm p-9 space-y-4"
      >
        <div className="glass-signature absolute top-0 left-6 right-6" />

        <div className="mb-2">
          <h1 className="font-display text-2xl text-ink">Masuk ke WMS Pro</h1>
          <p className="text-sm text-ink-soft mt-1">Kelola gudang Anda dengan tenang.</p>
        </div>

        {error && (
          <p className="text-sm text-[#B3435C] bg-[#B3435C]/10 border border-[#B3435C]/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1.5">Email</label>
          <input
            type="email"
            placeholder="nama@perusahaan.com"
            className="glass-field"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1.5">Kata sandi</label>
          <input
            type="password"
            placeholder="••••••••"
            className="glass-field"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full rounded-xl py-3 mt-2"
        >
          {loading ? 'Memproses...' : 'Masuk'}
        </button>

        <p className="text-sm text-center text-ink-soft pt-1">
          Belum punya akun?{' '}
          <Link to="/register" className="text-brand font-semibold hover:underline">
            Daftar
          </Link>
        </p>
      </form>
    </div>
  );
}
