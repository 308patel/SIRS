import { Router } from 'express';
import { registerCompany, loginCompany, getCompanyUsers } from '../controllers/companyController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { Role } from '../constant/enum';

const router = Router();

router.post('/register', registerCompany);
router.post('/login', loginCompany);
// Additional protected routes can be added here, e.g., router.get('/profile', authenticate, ...);

router.get("/users-list/:company_id", authenticate,  authorize(Role.SUPER_ADMIN, Role.COMPANY),getCompanyUsers)
export default router;
