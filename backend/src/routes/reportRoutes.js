const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

router.use(authenticate);

router.get('/summary', ctrl.summary);
router.get('/export/movements', ctrl.exportMovements);
router.get('/export/products', ctrl.exportProducts);

module.exports = router;