import { Router } from 'express';
import { changeCompanyStatus, getCompanies } from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { Role } from '../constant/enum';

const router = Router();

router.patch(
  '/company/:id/status',
  authenticate,
  authorize(Role.SUPER_ADMIN),
  changeCompanyStatus
);

router.get('/company/list', authenticate, authorize(Role.SUPER_ADMIN),getCompanies);

export default router;
