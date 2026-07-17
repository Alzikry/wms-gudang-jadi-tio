# WMS Pro — Fondasi Project

Fondasi awal aplikasi gudang sesuai blueprint `wms-blueprint-v3-lengkap.html`.
Stack: **React (Vite) + Tailwind** di frontend, **Node.js + Express + Socket.io + Prisma** di backend, **PostgreSQL** sebagai database.

## Struktur folder

```
wms-project/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # struktur database (sesuai tab "Database" blueprint)
│   │   └── seed.js            # data awal buat testing
│   ├── src/
│   │   ├── config/prisma.js
│   │   ├── controllers/       # auth, produk, stok
│   │   ├── middleware/        # JWT auth + RBAC, error handler
│   │   ├── routes/
│   │   ├── sockets/           # real-time (stock:updated, stock:low_alert, user:activity)
│   │   ├── utils/jwt.js
│   │   ├── app.js
│   │   └── server.js
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/              # Login, Register, Dashboard
    │   ├── components/         # ProtectedRoute
    │   ├── context/            # AuthContext
    │   ├── services/           # api.js (axios), socket.js
    │   └── hooks/               # useStockEvents
    └── .env.example
```

## Yang sudah jadi (Phase 1 MVP — sesuai blueprint)

- ✅ Auth & User Management — register (bikin company + admin pertama), login, JWT access+refresh token, RBAC (ADMIN/MANAGER/STAFF)
- ✅ Master Data Produk — CRUD produk + kategori
- ✅ Stok Real-time — barang masuk/keluar dengan transaction-safe update (anti race condition), broadcast `stock:updated` & `stock:low_alert` via Socket.io
- ✅ PWA dasar (manifest via vite-plugin-pwa)
- ✅ Struktur database lengkap (users, products, stock, stock_movements, warehouses, purchase_orders, companies, notifications, dst)

## Yang BELUM dibuat (langkah selanjutnya)

- Penerimaan Barang (Purchase Order) — endpoint & UI
- Pengeluaran Barang (Picking/Packing) — endpoint & UI
- Lokasi Gudang (Bin), Transfer Antar Gudang, Stock Opname (Phase 2)
- Barcode Scanner, Integrasi Marketplace, Auto Reorder (Phase 3 — premium)
- Laporan & Analitik (export Excel/PDF)

Kita bangun bertahap sesuai urutan blueprint — bilang aja kalau mau lanjut ke bagian mana.

---

## Cara jalanin di Windows (PowerShell)

### 1. Siapkan PostgreSQL

Paling gampang pakai **Supabase** (gratis, sudah termasuk Postgres + hosting):
1. Buat project di https://supabase.com
2. Ambil **Connection String** (Settings → Database → Connection string → URI)

Atau kalau mau lokal, install PostgreSQL dari https://www.postgresql.org/download/windows/

### 2. Setup Backend

```powershell
cd backend
npm install
copy .env.example .env
```

Buka `.env`, isi `DATABASE_URL` dengan connection string Postgres lo, dan ganti `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` dengan string random (bebas, asal panjang & unik).

```powershell
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Backend jalan di `http://localhost:4000`. Login default hasil seed: `[email protected]` / `password123`.

### 3. Setup Frontend

Buka terminal PowerShell baru:

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend jalan di `http://localhost:5173`.

### 4. Test alur

1. Buka `http://localhost:5173/register` → bikin akun baru, atau langsung `/login` pakai akun seed.
2. Masuk ke Dashboard → akan muncul daftar produk.
3. Buka 2 tab browser sekaligus, login dengan akun yang sama company — coba hit endpoint `POST /api/stock/in` lewat Postman, lalu lihat Dashboard di kedua tab auto-update tanpa refresh (real-time via Socket.io).

## Testing endpoint stok (pakai Postman/Thunder Client)

```
POST http://localhost:4000/api/stock/in
Authorization: Bearer <accessToken dari login>
Content-Type: application/json

{
  "productId": "<id produk dari GET /api/products>",
  "warehouseId": "<id warehouse, lihat di Prisma Studio>",
  "quantity": 50
}
```

Lihat data via `npx prisma studio` di folder backend.
