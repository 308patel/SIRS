import { Router } from 'express';
import { registerCompany, loginCompany, getCompanyUsers, assignAdmin, getPendingCompanyUsers, getActiveCompaniesList } from '../controllers/companyController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { Role } from '../constant/enum';

const router = Router();

router.post('/register', registerCompany);
router.post('/login', loginCompany);
// Additional protected routes can be added here, e.g., router.get('/profile', authenticate, ...);

router.get("/users-list/:company_id", authenticate,  authorize(Role.ADMIN, Role.COMPANY),getCompanyUsers)
router.get("/pending-users/:company_id", authenticate, authorize(Role.ADMIN, Role.COMPANY), getPendingCompanyUsers)
router.get("/active-list", authenticate, getActiveCompaniesList)
router.patch('/assign-admin', authenticate, authorize(Role.COMPANY), assignAdmin);
router.patch('/assign-admin/:userId', authenticate, authorize(Role.COMPANY), assignAdmin);

export default router;
