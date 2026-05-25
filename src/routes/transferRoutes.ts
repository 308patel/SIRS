import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { Role } from '../constant/enum';
import {
  createTransfer,
  listTransfers,
  getTransferDetails,
  approveTransfer,
  dispatchTransfer,
  receiveTransfer,
  suggestTransfers,
} from '../controllers/transferController';

const router = Router();

// Auto-suggest (GET /transfers/suggest) must be defined before getTransferDetails (GET /transfers/:id)
router.get('/suggest', authenticate, authorize(Role.LOGISTIC_MANAGER, Role.ADMIN), suggestTransfers);

router.post('/', authenticate, authorize(Role.LOGISTIC_MANAGER, Role.ADMIN), createTransfer);

router.get('/', authenticate, authorize(Role.ADMIN, Role.WORKSPACE_MANAGER, Role.LOGISTIC_MANAGER), listTransfers);

router.get('/:id', authenticate, authorize(Role.ADMIN, Role.WORKSPACE_MANAGER, Role.LOGISTIC_MANAGER), getTransferDetails);

router.patch('/:id/approve', authenticate, authorize(Role.ADMIN), approveTransfer);

router.patch('/:id/dispatch', authenticate, authorize(Role.WORKSPACE_MANAGER), dispatchTransfer);

router.patch('/:id/receive', authenticate, authorize(Role.WORKSPACE_MANAGER), receiveTransfer);

export default router;
