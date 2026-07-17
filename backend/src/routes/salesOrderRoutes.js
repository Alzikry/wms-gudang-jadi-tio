const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/salesOrderController');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('ADMIN', 'STAFF_ADMIN'), ctrl.create);
router.post('/:id/ship', authorize('ADMIN', 'STAFF_ADMIN'), ctrl.ship);

module.exports = router;