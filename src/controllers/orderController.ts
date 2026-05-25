import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { OrderStatus, StockMovementType, Role } from '../constant/enum';

// POST /orders - Place new order (US - USER)
export const placeOrder = async (req: Request, res: Response) => {
  const { warehouse_id, items } = req.body; // items: [{ product_id, quantity }]
  const userId = (req as any).userId;

  try {
    if (!warehouse_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: 400, message: 'Missing warehouse_id or items array' });
    }

    // Verify warehouse exists
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouse_id, deleted_at: null } });
    if (!warehouse) {
      return res.status(404).json({ status: 404, message: 'Warehouse not found' });
    }

    // Process order inside transaction to ensure atomicity
    const order = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData = [];
      const stockDeductionUpdates = [];

      for (const item of items) {
        const { product_id, quantity } = item;
        if (!product_id || !quantity || quantity <= 0) {
          throw new Error(`Invalid item: product_id: ${product_id}, quantity: ${quantity}`);
        }

        // Get product details
        const product = await tx.product.findUnique({ where: { id: product_id } });
        if (!product) {
          throw new Error(`Product with ID ${product_id} not found`);
        }

        // Get warehouse inventory
        const inventory = await tx.inventory.findUnique({
          where: {
            warehouse_id_product_id: {
              warehouse_id,
              product_id,
            }
          }
        });

        if (!inventory || inventory.quantity < quantity) {
          throw new Error(`Insufficient stock for product ${product.name} in warehouse. Available: ${inventory?.quantity || 0}, Required: ${quantity}`);
        }

        const price = parseFloat(product.price.toString());
        totalAmount += price * quantity;

        orderItemsData.push({
          product_id,
          quantity,
          price,
        });

        stockDeductionUpdates.push({
          inventoryId: inventory.id,
          quantity,
        });
      }

      // 1. Create the Order
      const newOrder = await tx.order.create({
        data: {
          user_id: userId,
          status: OrderStatus.PENDING,
          total_amount: totalAmount,
          order_items: {
            create: orderItemsData,
          }
        },
        include: {
          order_items: {
            include: { product: true }
          }
        }
      });

      // 2. Update inventory and log stock movements
      for (const update of stockDeductionUpdates) {
        await tx.inventory.update({
          where: { id: update.inventoryId },
          data: { quantity: { decrement: update.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            inventory_id: update.inventoryId,
            type: StockMovementType.OUT,
            quantity: update.quantity,
            reference_id: newOrder.id,
            reason: `Order ${newOrder.id} fulfillment`,
            created_by_id: userId,
          }
        });
      }

      return newOrder;
    });

    return res.status(201).json({
      status: 201,
      message: 'Order placed successfully',
      data: order,
    });
  } catch (error: any) {
    console.error('Error placing order:', error);
    return res.status(400).json({ status: 400, message: error.message || 'Server error while placing order' });
  }
};

// GET /orders - List all orders (AD, WM, LM)
export const listOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        order_items: {
          include: { product: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({
      status: 200,
      message: 'All orders retrieved successfully',
      data: orders,
    });
  } catch (error) {
    console.error('Error listing orders:', error);
    return res.status(500).json({ status: 500, message: 'Server error while retrieving orders' });
  }
};

// GET /orders/my - User's own orders (US)
export const getMyOrders = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    const orders = await prisma.order.findMany({
      where: { user_id: userId },
      include: {
        order_items: {
          include: { product: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({
      status: 200,
      message: 'Your orders retrieved successfully',
      data: orders,
    });
  } catch (error) {
    console.error('Error getting my orders:', error);
    return res.status(500).json({ status: 500, message: 'Server error while retrieving your orders' });
  }
};

// GET /orders/:id - Order details (AD, WM, LM, US)
export const getOrderDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        order_items: {
          include: { product: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ status: 404, message: 'Order not found' });
    }

    // If role is USER, they can only view their own orders
    if (role === Role.USER && order.user_id !== userId) {
      return res.status(403).json({ status: 403, message: 'Forbidden: You cannot view other users\' orders' });
    }

    return res.status(200).json({
      status: 200,
      message: 'Order details retrieved successfully',
      data: order,
    });
  } catch (error) {
    console.error('Error getting order details:', error);
    return res.status(500).json({ status: 500, message: 'Server error while retrieving order details' });
  }
};

// PATCH /orders/:id/status - Update order status (WM, LM)
export const updateOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    if (!status || !Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({ status: 400, message: 'Invalid or missing status value' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ status: 404, message: 'Order not found' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        order_items: {
          include: { product: true }
        }
      }
    });

    return res.status(200).json({
      status: 200,
      message: 'Order status updated successfully',
      data: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ status: 500, message: 'Server error while updating order status' });
  }
};

// PATCH /orders/:id/cancel - Cancel order (US, AD)
export const cancelOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { order_items: true }
    });

    if (!order) {
      return res.status(404).json({ status: 404, message: 'Order not found' });
    }

    // Check permissions
    if (role === Role.USER && order.user_id !== userId) {
      return res.status(403).json({ status: 403, message: 'Forbidden: You can only cancel your own orders' });
    }

    if (order.status === OrderStatus.CANCELLED) {
      return res.status(400).json({ status: 400, message: 'Order is already cancelled' });
    }

    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
      return res.status(400).json({ status: 400, message: `Cannot cancel an order that is already ${order.status}` });
    }

    // Process cancellation inside transaction to restore stock
    const cancelledOrder = await prisma.$transaction(async (tx) => {
      // 1. Update order status to CANCELLED
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: {
          order_items: {
            include: { product: true }
          }
        }
      });

      // 2. Restore inventory stock based on stock movements recorded for this order
      const movements = await tx.stockMovement.findMany({
        where: { reference_id: id, type: StockMovementType.OUT },
      });

      for (const movement of movements) {
        await tx.inventory.update({
          where: { id: movement.inventory_id },
          data: { quantity: { increment: movement.quantity } }
        });

        // Log restocking movement
        await tx.stockMovement.create({
          data: {
            inventory_id: movement.inventory_id,
            type: StockMovementType.IN,
            quantity: movement.quantity,
            reference_id: id,
            reason: `Order ${id} cancellation restoration`,
            created_by_id: userId,
          }
        });
      }

      return updatedOrder;
    });

    return res.status(200).json({
      status: 200,
      message: 'Order cancelled successfully and stock returned',
      data: cancelledOrder,
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({ status: 500, message: 'Server error while cancelling order' });
  }
};

// GET /orders/:id/track - Track order status (US)
export const trackOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ status: 404, message: 'Order not found' });
    }

    // Only order owner can track
    if (order.user_id !== userId) {
      return res.status(403).json({ status: 403, message: 'Forbidden: You can only track your own orders' });
    }

    let statusMessage = '';
    switch (order.status) {
      case OrderStatus.PENDING:
        statusMessage = 'Order has been placed and is pending review.';
        break;
      case OrderStatus.PROCESSING:
        statusMessage = 'Order is currently being packed and processed at the warehouse.';
        break;
      case OrderStatus.SHIPPED:
        statusMessage = 'Order has been dispatched and is on its way to your destination.';
        break;
      case OrderStatus.DELIVERED:
        statusMessage = 'Order has been successfully delivered.';
        break;
      case OrderStatus.CANCELLED:
        statusMessage = 'Order has been cancelled and stock has been restocked.';
        break;
    }

    return res.status(200).json({
      status: 200,
      message: 'Tracking details retrieved successfully',
      data: {
        order_id: order.id,
        status: order.status,
        last_updated: order.updated_at,
        details: statusMessage,
      }
    });
  } catch (error) {
    console.error('Error tracking order:', error);
    return res.status(500).json({ status: 500, message: 'Server error while tracking order' });
  }
};
