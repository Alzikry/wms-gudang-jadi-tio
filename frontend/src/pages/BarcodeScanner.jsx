import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const READER_ELEMENT_ID = 'barcode-reader';

export default function BarcodeScanner() {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [txType, setTxType] = useState('IN');
  const [txWarehouseId, setTxWarehouseId] = useState('');
  const [txQty, setTxQty] = useState('');
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [txMsg, setTxMsg] = useState('');

  const inputRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    api.get('/warehouses').then((res) => {
      setWarehouses(res.data);
      if (res.data.length === 1) setTxWarehouseId(res.data[0].id);
    }).catch(console.error);

    return () => stopCamera();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function lookupCode(scannedCode) {
    const trimmed = (scannedCode || '').trim();
    if (!trimmed) return;

    setError('');
    setProduct(null);
    setTxMsg('');
    setLoading(true);
    try {
      const res = await api.get(`/barcode/${encodeURIComponent(trimmed)}`);
      setProduct(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Barcode tidak ditemukan');
    } finally {
      setLoading(false);
      setCode('');
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      lookupCode(code);
    }
  }

  async function startCamera() {
    setError('');
    setCameraOn(true);

    // Kasih waktu sedikit biar elemen #barcode-reader sempat ke-render dulu sebelum dipakai
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(READER_ELEMENT_ID);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            lookupCode(decodedText);
            stopCamera();
          },
          () => {} // callback error per-frame, sengaja diabaikan (normal kalau belum ketemu barcode)
        );
      } catch (err) {
        setError('Tidak bisa mengakses kamera: ' + err.message);
        setCameraOn(false);
      }
    }, 100);
  }

  function stopCamera() {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .catch(() => {})
        .finally(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        });
    }
    setCameraOn(false);
  }

  async function handleTransaction(e) {
    e.preventDefault();
    setTxMsg('');
    if (!txWarehouseId) return setTxMsg('Pilih gudang dulu');
    if (!txQty || Number(txQty) <= 0) return setTxMsg('Isi jumlah dulu');

    setTxSubmitting(true);
    try {
      const endpoint = txType === 'IN' ? '/stock/in' : '/stock/out';
      await api.post(endpoint, {
        productId: product.id,
        warehouseId: txWarehouseId,
        quantity: Number(txQty),
      });
      setTxMsg(`✓ ${txType === 'IN' ? 'Barang masuk' : 'Barang keluar'} berhasil dicatat`);
      setTxQty('');
      lookupCode(product.barcode); // refresh info stok terbaru
    } catch (err) {
      setTxMsg(err.response?.data?.message || 'Gagal mencatat transaksi');
    } finally {
      setTxSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen wms-bg p-6 relative">

      <div className="wms-orb wms-orb-a" aria-hidden="true" />
      <div className="wms-orb wms-orb-b" aria-hidden="true" />
      <header className="glass-panel flex justify-between items-center px-5 py-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Scan Barcode</h1>
          <p className="text-ink-soft text-sm">Halo, {user?.name}</p>
        </div>
        <Link to="/dashboard" className="text-sm text-brand font-semibold hover:underline">← Kembali ke Dashboard</Link>
      </header>

      <div className="glass-panel p-5 mb-6">
        <label className="text-sm text-ink-soft mb-1 block">
          Klik kotak ini lalu scan pakai alat scanner (USB/Bluetooth), atau ketik kode manual lalu tekan Enter
        </label>
        <input
          ref={inputRef}
          type="text"
          className="glass-field w-full text-lg"
          placeholder="Menunggu scan..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="mt-3">
          {!cameraOn ? (
            <button onClick={startCamera} className="bg-brand text-white px-4 py-2 rounded font-medium">
              📷 Scan pakai Kamera
            </button>
          ) : (
            <button onClick={stopCamera} className="bg-ink text-white px-4 py-2 rounded font-medium">
              Tutup Kamera
            </button>
          )}
        </div>

        {cameraOn && <div id={READER_ELEMENT_ID} className="mt-4 max-w-sm" />}

        {loading && <p className="text-sm text-ink-soft mt-3">Mencari produk...</p>}
        {error && <p className="text-sm text-[#B3435C] bg-[#B3435C]/10 border border-[#B3435C]/20 rounded-lg px-3 py-2 mt-3">{error}</p>}
      </div>

      {product && (
        <div className="glass-panel p-5">
          <h2 className="text-lg font-semibold mb-1">{product.name}</h2>
          <p className="text-sm text-ink-soft mb-4">
            SKU: {product.sku} · Barcode: {product.barcode} · Kategori: {product.category || '-'}
          </p>

          <table className="w-full text-sm mb-4">
            <thead className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wider">
              <tr>
                <th className="p-2">Gudang</th>
                <th className="p-2">Lokasi Rak</th>
                <th className="p-2">Stok</th>
              </tr>
            </thead>
            <tbody>
              {product.stocks.map((s) => (
                <tr key={s.warehouseId} className="border-t border-ink/5 text-ink/85">
                  <td className="p-2">{s.warehouseName}</td>
                  <td className="p-2">{s.binCode || '-'}</td>
                  <td className="p-2 font-medium text-ink-soft">{s.quantity} {product.unit}</td>
                </tr>
              ))}
              {product.stocks.length === 0 && (
                <tr><td colSpan={3} className="p-2 text-center text-ink-soft/50">Belum ada stok</td></tr>
              )}
            </tbody>
          </table>

          <p className="text-sm mb-4">
            Total stok: <strong>{product.totalStock} {product.unit}</strong>
            {product.totalStock <= product.minStock && (
              <span className="text-[#B3435C] font-semibold ml-2">⚠️ Stok menipis (min {product.minStock})</span>
            )}
          </p>

          <div className="border-t border-ink/5 text-ink/85 pt-4">
            <h3 className="font-medium mb-2">Catat Transaksi Cepat</h3>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setTxType('IN')}
                className={`px-3 py-1.5 rounded text-sm font-medium ${txType === 'IN' ? 'bg-green-600 text-white' : 'bg-white/40 backdrop-blur border border-ink/15 text-ink-soft'}`}
              >
                ⬇️ Barang Masuk
              </button>
              <button
                onClick={() => setTxType('OUT')}
                className={`px-3 py-1.5 rounded text-sm font-medium ${txType === 'OUT' ? 'bg-red-600 text-white' : 'bg-white/40 backdrop-blur border border-ink/15 text-ink-soft'}`}
              >
                ⬆️ Barang Keluar
              </button>
            </div>

            <form onSubmit={handleTransaction} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                className="glass-field"
                value={txWarehouseId}
                onChange={(e) => setTxWarehouseId(e.target.value)}
                required
              >
                <option value="">-- Pilih Gudang --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                placeholder="Jumlah"
                className="glass-field"
                value={txQty}
                onChange={(e) => setTxQty(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={txSubmitting}
                className="btn-primary px-4 py-2 rounded-xl"
              >
                {txSubmitting ? 'Menyimpan...' : 'Catat'}
              </button>
            </form>

            {txMsg && (
              <p className={`text-sm mt-3 ${txMsg.startsWith('✓') ? 'text-green-600' : 'text-[#B3435C]'}`}>{txMsg}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}