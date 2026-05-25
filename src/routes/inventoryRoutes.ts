import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { Role } from '../constant/enum';
import {
  addProductToWarehouse,
  listInventory,
  getStockInWarehouse,
  getStockOfProduct,
  getLowStockItems,
  adjustStock,
  getStockHistory,
  getInventoryAlerts,
} from '../controllers/inventoryController';

const router = Router();

// Static routes must come before dynamic parameter routes
router.get('/low-stock', authenticate, authorize(Role.ADMIN, Role.WORKSPACE_MANAGER, Role.LOGISTIC_MANAGER), getLowStockItems);
router.get('/alerts', authenticate, authorize(Role.ADMIN, Role.WORKSPACE_MANAGER, Role.LOGISTIC_MANAGER), getInventoryAlerts);

router.post('/', authenticate, authorize(Role.WORKSPACE_MANAGER), addProductToWarehouse);
router.get('/', authenticate, authorize(Role.ADMIN, Role.WORKSPACE_MANAGER, Role.LOGISTIC_MANAGER), listInventory);

// Dynamic routes
router.get('/warehouse/:warehouseId', authenticate, authorize(Role.ADMIN, Role.WORKSPACE_MANAGER, Role.LOGISTIC_MANAGER), getStockInWarehouse);
router.get('/product/:productId', authenticate, authorize(Role.ADMIN, Role.WORKSPACE_MANAGER, Role.LOGISTIC_MANAGER), getStockOfProduct);
router.patch('/:id/adjust', authenticate, authorize(Role.WORKSPACE_MANAGER), adjustStock);
router.get('/:id/history', authenticate, authorize(Role.ADMIN, Role.WORKSPACE_MANAGER), getStockHistory);

export default router;
