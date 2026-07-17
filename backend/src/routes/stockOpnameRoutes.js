const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/stockOpnameController');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('ADMIN', 'MANAGER'), ctrl.create);
router.put('/:id/items', ctrl.saveItems);
router.post('/:id/complete', authorize('ADMIN', 'MANAGER'), ctrl.complete);

module.exports = router;