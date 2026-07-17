const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/productController');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('ADMIN', 'STAFF_ADMIN'), ctrl.create);
router.put('/:id', authorize('ADMIN', 'STAFF_ADMIN'), ctrl.update);
router.delete('/:id', authorize('ADMIN', 'STAFF_ADMIN'), ctrl.remove);

module.exports = router;