const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/reorderController');

router.use(authenticate);
router.get('/suggestions', ctrl.suggestions);
router.post('/generate', authorize('ADMIN', 'STAFF_ADMIN'), ctrl.generate);

module.exports = router;