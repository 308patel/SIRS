import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { Role } from '../constant/enum';
import {
  placeOrder,
  listOrders,
  getMyOrders,
  getOrderDetails,
  updateOrderStatus,
  cancelOrder,
  trackOrder,
} from '../controllers/orderController';

const router = Router();

// Static routes
router.get('/my', authenticate, authorize(Role.USER), getMyOrders);

// General list and create routes
router.post('/', authenticate, authorize(Role.USER), placeOrder);
router.get('/', authenticate, authorize(Role.ADMIN, Role.WORKSPACE_MANAGER, Role.LOGISTIC_MANAGER), listOrders);

// Action and tracking routes
router.patch('/:id/status', authenticate, authorize(Role.WORKSPACE_MANAGER, Role.LOGISTIC_MANAGER), updateOrderStatus);
router.patch('/:id/cancel', authenticate, authorize(Role.USER, Role.ADMIN), cancelOrder);
router.get('/:id/track', authenticate, authorize(Role.USER), trackOrder);

// Detail route (placed last among dynamic routes)
router.get('/:id', authenticate, authorize(Role.ADMIN, Role.WORKSPACE_MANAGER, Role.LOGISTIC_MANAGER, Role.USER), getOrderDetails);

export default router;
