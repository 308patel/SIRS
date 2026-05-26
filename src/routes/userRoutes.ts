import { Router } from 'express';
import { 
  signup, 
  login, 
  changePassword, 
  forgotPassword, 
  checkEmail, 
  logout, 
  refreshToken,
  getUserProfile,
  getOwnProfile,
  updateUserProfile,
  deactivateUser,
  softDeleteUser,
  selectCompany,
  acceptJoinRequest
} from '../controllers/userController'
import { authenticate, authorize } from '../middleware/authMiddleware';
import { Role } from '../constant/enum';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/changepassword', authenticate, changePassword);
router.post('/forgotpassword', forgotPassword);
router.get('/checkemail/:email', checkEmail);
router.post('/logout', authenticate, logout);
router.post('/refreshtoken', refreshToken);

// Profile and User Management routes
router.get('/me', authenticate, getOwnProfile);
router.get('/:id', authenticate, authorize(Role.SUPER_ADMIN, Role.ADMIN), getUserProfile);
router.patch('/:id', authenticate, authorize(Role.ADMIN, Role.COMPANY), updateUserProfile);
router.patch('/:id/deactivate', authenticate, authorize(Role.ADMIN), deactivateUser);
router.delete('/:id', authenticate, authorize(Role.SUPER_ADMIN, Role.ADMIN), softDeleteUser);

// Company Selection & Acceptance routes
router.post('/select-company', authenticate, selectCompany);
router.patch('/select-company', authenticate, selectCompany);
router.patch('/:id/accept-join', authenticate, authorize(Role.ADMIN, Role.COMPANY), acceptJoinRequest);
router.patch('/accept-join', authenticate, authorize(Role.ADMIN, Role.COMPANY), acceptJoinRequest);

export default router;
