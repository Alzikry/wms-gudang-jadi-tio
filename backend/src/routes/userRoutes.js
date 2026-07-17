const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.use(authenticate);
router.use(authorize('ADMIN')); // seluruh User Management cuma buat ADMIN

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);

module.exports = router;