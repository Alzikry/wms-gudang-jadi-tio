const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/barcodeController');

router.use(authenticate);
router.get('/:code', ctrl.lookup);

module.exports = router;