import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { 
  createWareHouse, 
  deleteWarehouse, 
  getAllWarehouses, 
  getWarehouseById, 
  updateWarehouse,
  assignManager,
  getMyWarehouses,
} from '../controllers/WarehouseController';
import { Role } from '../constant/enum';

const router = Router();


router.post('/',authenticate,authorize(Role.COMPANY), createWareHouse);
router.get("/", authenticate, authorize(Role.ADMIN, Role.COMPANY, Role.WORKSPACE_MANAGER, Role.LOGISTIC_MANAGER), getAllWarehouses)

// Must be before /:warehouse_id so it is not shadowed by the dynamic param
router.get("/my", authenticate, authorize(Role.ADMIN, Role.WORKSPACE_MANAGER, Role.LOGISTIC_MANAGER), getMyWarehouses)

router.get("/:warehouse_id", authenticate, authorize(Role.ADMIN, Role.COMPANY, Role.WORKSPACE_MANAGER, Role.LOGISTIC_MANAGER), getWarehouseById)
router.put('/:id',authenticate,authorize(Role.ADMIN, Role.COMPANY), updateWarehouse);
router.delete("/:warehouse_id",authenticate,authorize(Role.ADMIN, Role.COMPANY), deleteWarehouse);

// Admin-specific warehouse management
router.patch('/:id/assign-manager', authenticate, authorize(Role.ADMIN, Role.COMPANY), assignManager);


export default router;
