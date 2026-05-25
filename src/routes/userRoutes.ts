import { Router } from 'express';
import { signup, login, changePassword, forgotPassword, checkEmail, logout, refreshToken } from '../controllers/userController'
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/changepassword', authenticate, changePassword);
router.post('/forgotpassword', forgotPassword);
router.get('/checkemail/:email', checkEmail);
router.post('/logout', authenticate, logout);
router.post('/refreshtoken', refreshToken);

export default router;
