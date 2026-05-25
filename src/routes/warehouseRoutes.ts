import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { createWareHouse, deleteWarehouse, getAllWarehouses, getWarehouseById, updateWarehouse } from '../controllers/WarehouseController';
import { Role } from '../constant/enum';

const router = Router();


router.post('/',authenticate,authorize(Role.COMPANY), createWareHouse);
router.get("/", authenticate, authorize(Role.ADMIN, Role.COMPANY), getAllWarehouses)
router.get("/:warehouse_id", authenticate, authorize(Role.ADMIN, Role.COMPANY), getWarehouseById)
router.put('/:id',authenticate,authorize(Role.ADMIN, Role.COMPANY), updateWarehouse);
router.delete("/:warehouse_id",authenticate,authorize(Role.COMPANY), deleteWarehouse);


export default router;
