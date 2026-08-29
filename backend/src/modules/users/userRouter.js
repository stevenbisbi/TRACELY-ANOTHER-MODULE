const express = require('express');
const userController = require('./userController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

// Públicas
router.post('/register', userController.registerUser);
router.post('/login',    userController.loginUser);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password',  userController.resetPassword);

// Autenticadas
router.get('/me',   authenticate, userController.getMe);
router.get('/',     authenticate, authorize('admin'), userController.getAllUsers);
router.get('/:id',  authenticate, userController.getOneUser);
router.put('/:id',  authenticate, userController.updateUser);
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);

module.exports = router;
