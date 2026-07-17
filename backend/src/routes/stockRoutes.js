const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/stockController');
const movementCtrl = require('../controllers/movementController');
const adjustCtrl = require('../controllers/stockAdjustController');

router.use(authenticate);

// Semua role (termasuk Staff Gudang) boleh LIHAT stok & riwayat
router.get('/', ctrl.listStock);
router.get('/movements', movementCtrl.listMovements);

// Input transaksi stok — Admin & Staff Admin saja (Staff Gudang cuma lihat)
router.post('/in', authorize('ADMIN', 'STAFF_ADMIN'), ctrl.stockIn);
router.post('/out', authorize('ADMIN', 'STAFF_ADMIN'), ctrl.stockOut);
router.post('/transfer', authorize('ADMIN', 'STAFF_ADMIN'), ctrl.transfer);

// Koreksi stok manual — Admin & Supervisor saja
router.post('/adjust', authorize('ADMIN', 'SUPERVISOR'), adjustCtrl.adjust);

module.exports = router;