import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { Role, StockMovementType } from '../constant/enum';

// Helper: get the list of warehouse IDs accessible to the current user.
// ADMIN / SUPER_ADMIN → null (meaning: no filter, see all)
// WORKSPACE_MANAGER / LOGISTIC_MANAGER → warehouses where they are assigned as manager
//   + the warehouse they are directly assigned to as staff (warehouse_id on User)
async function getUserWarehouseIds(userId: string, role: string): Promise<string[] | null> {
  if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
    return null; // no restriction
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      warehouse_id: true,
      warehouse_manager: { select: { id: true } },
      warehouse_logistic_manager: { select: { id: true } },
    },
  });

  if (!user) return [];

  const ids = new Set<string>();

  if (user.warehouse_id) ids.add(user.warehouse_id);
  user.warehouse_manager.forEach((w) => ids.add(w.id));
  user.warehouse_logistic_manager.forEach((w) => ids.add(w.id));

  return Array.from(ids);
}

// POST /inventory - Add product to warehouse (WM)
export const addProductToWarehouse = async (req: Request, res: Response) => {
  const { warehouse_id, product_name, sku, price, description, quantity, low_stock_threshold } = req.body;
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    if (!warehouse_id || !product_name || !sku || price === undefined) {
      return res.status(400).json({ status: 400, message: 'Missing required fields (warehouse_id, product_name, sku, price)' });
    }

    // Check if warehouse exists
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouse_id, deleted_at: null } });
    if (!warehouse) {
      return res.status(404).json({ status: 404, message: 'Warehouse not found' });
    }

    // Enforce warehouse scope: non-admins can only add products to their own warehouses
    const accessibleIds = await getUserWarehouseIds(userId, role);
    if (accessibleIds !== null && !accessibleIds.includes(warehouse_id)) {
      return res.status(403).json({
        status: 403,
        message: 'Forbidden: You are not authorized to manage inventory for this warehouse',
      });
    }

    // Find or create product
    let product = await prisma.product.findUnique({ where: { sku } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: product_name,
          sku,
          price: parseFloat(price),
          description: description || null,
        }
      });
    }

    const qty = quantity !== undefined ? parseInt(quantity) : 0;
    const threshold = low_stock_threshold !== undefined ? parseInt(low_stock_threshold) : 10;

    // Check if inventory link already exists
    let inventory = await prisma.inventory.findUnique({
      where: {
        warehouse_id_product_id: {
          warehouse_id,
          product_id: product.id,
        }
      }
    });

    if (inventory) {
      // Update quantity if already exists
      inventory = await prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: inventory.quantity + qty,
          low_stock_threshold: threshold,
        },
        include: { product: true, warehouse: true }
      });
    } else {
      // Create new inventory
      inventory = await prisma.inventory.create({
        data: {
          warehouse_id,
          product_id: product.id,
          quantity: qty,
          low_stock_threshold: threshold,
        },
        include: { product: true, warehouse: true }
      });
    }

    // Log movement if quantity added > 0
    if (qty > 0) {
      await prisma.stockMovement.create({
        data: {
          inventory_id: inventory.id,
          type: StockMovementType.IN,
          quantity: qty,
          reason: 'Initial stock intake',
          created_by_id: userId,
        }
      });
    }

    return res.status(201).json({
      status: 201,
      message: 'Product added to warehouse inventory successfully',
      data: inventory,
    });
  } catch (error) {
    console.error('Error adding product to warehouse:', error);
    return res.status(500).json({ status: 500, message: 'Server error while adding product to warehouse' });
  }
};

// GET /inventory - List all inventory (AD sees all; WM/LM see only their warehouses)
export const listInventory = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    const accessibleIds = await getUserWarehouseIds(userId, role);

    const whereClause = accessibleIds !== null
      ? { warehouse_id: { in: accessibleIds } }
      : {};

    const inventory = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        warehouse: true,
        product: true,
      },
      orderBy: { updated_at: 'desc' }
    });

    return res.status(200).json({
      status: 200,
      message: 'Inventory list retrieved successfully',
      data: inventory,
    });
  } catch (error) {
    console.error('Error listing inventory:', error);
    return res.status(500).json({ status: 500, message: 'Server error while retrieving inventory list' });
  }
};

// GET /inventory/warehouse/:warehouseId - Stock in specific warehouse (AD, WM, LM)
export const getStockInWarehouse = async (req: Request, res: Response) => {
  const { warehouseId } = req.params;
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    // Enforce warehouse scope
    const accessibleIds = await getUserWarehouseIds(userId, role);
    if (accessibleIds !== null && !accessibleIds.includes(warehouseId)) {
      return res.status(403).json({
        status: 403,
        message: 'Forbidden: You do not have access to this warehouse',
      });
    }

    const inventory = await prisma.inventory.findMany({
      where: { warehouse_id: warehouseId },
      include: {
        product: true,
        warehouse: true,
      }
    });

    return res.status(200).json({
      status: 200,
      message: `Inventory for warehouse ${warehouseId} retrieved successfully`,
      data: inventory,
    });
  } catch (error) {
    console.error('Error getting warehouse stock:', error);
    return res.status(500).json({ status: 500, message: 'Server error while retrieving warehouse stock' });
  }
};

// GET /inventory/product/:productId - Stock of product across accessible warehouses (AD, WM, LM)
export const getStockOfProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    const accessibleIds = await getUserWarehouseIds(userId, role);

    const whereClause: any = { product_id: productId };
    if (accessibleIds !== null) {
      whereClause.warehouse_id = { in: accessibleIds };
    }

    const inventory = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        warehouse: true,
        product: true,
      }
    });

    return res.status(200).json({
      status: 200,
      message: `Stock of product ${productId} across warehouses retrieved successfully`,
      data: inventory,
    });
  } catch (error) {
    console.error('Error getting product stock:', error);
    return res.status(500).json({ status: 500, message: 'Server error while retrieving product stock' });
  }
};

// GET /inventory/low-stock - Items below threshold (AD, WM, LM — scoped)
export const getLowStockItems = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    const accessibleIds = await getUserWarehouseIds(userId, role);

    const whereClause = accessibleIds !== null
      ? { warehouse_id: { in: accessibleIds } }
      : {};

    const allInventory = await prisma.inventory.findMany({
      where: whereClause,
      include: { warehouse: true, product: true }
    });
    const lowStockFiltered = allInventory.filter(item => item.quantity < item.low_stock_threshold);

    return res.status(200).json({
      status: 200,
      message: 'Low stock items retrieved successfully',
      data: lowStockFiltered,
    });
  } catch (error) {
    console.error('Error getting low stock items:', error);
    return res.status(500).json({ status: 500, message: 'Server error while retrieving low stock items' });
  }
};

// PATCH /inventory/:id/adjust - Manual stock adjustment (WM — own warehouse only)
export const adjustStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { quantity, adjustment, reason } = req.body; // quantity = absolute, adjustment = relative delta
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: { product: true, warehouse: true }
    });

    if (!inventory) {
      return res.status(404).json({ status: 404, message: 'Inventory record not found' });
    }

    // Enforce warehouse scope
    const accessibleIds = await getUserWarehouseIds(userId, role);
    if (accessibleIds !== null && !accessibleIds.includes(inventory.warehouse_id)) {
      return res.status(403).json({
        status: 403,
        message: 'Forbidden: You are not authorized to adjust stock for this warehouse',
      });
    }

    let newQuantity = inventory.quantity;
    let change = 0;

    if (quantity !== undefined) {
      newQuantity = parseInt(quantity);
      change = newQuantity - inventory.quantity;
    } else if (adjustment !== undefined) {
      change = parseInt(adjustment);
      newQuantity = inventory.quantity + change;
    } else {
      return res.status(400).json({ status: 400, message: 'Must provide either new absolute quantity or adjustment delta' });
    }

    if (newQuantity < 0) {
      return res.status(400).json({ status: 400, message: 'Stock quantity cannot be adjusted below 0' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedInv = await tx.inventory.update({
        where: { id },
        data: { quantity: newQuantity },
        include: { product: true, warehouse: true }
      });

      await tx.stockMovement.create({
        data: {
          inventory_id: id,
          type: StockMovementType.ADJUSTMENT,
          quantity: change,
          reason: reason || 'Manual stock adjustment',
          created_by_id: userId,
        }
      });

      return updatedInv;
    });

    return res.status(200).json({
      status: 200,
      message: 'Stock adjusted successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return res.status(500).json({ status: 500, message: 'Server error while adjusting stock' });
  }
};

// GET /inventory/:id/history - Stock movement log (AD, WM — scoped)
export const getStockHistory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    const inventory = await prisma.inventory.findUnique({ where: { id } });
    if (!inventory) {
      return res.status(404).json({ status: 404, message: 'Inventory record not found' });
    }

    // Enforce warehouse scope
    const accessibleIds = await getUserWarehouseIds(userId, role);
    if (accessibleIds !== null && !accessibleIds.includes(inventory.warehouse_id)) {
      return res.status(403).json({
        status: 403,
        message: 'Forbidden: You do not have access to this inventory record',
      });
    }

    const history = await prisma.stockMovement.findMany({
      where: { inventory_id: id },
      include: {
        created_by: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({
      status: 200,
      message: 'Stock movement history retrieved successfully',
      data: history,
    });
  } catch (error) {
    console.error('Error getting stock history:', error);
    return res.status(500).json({ status: 500, message: 'Server error while retrieving stock history' });
  }
};

// GET /inventory/alerts - Capacity & low stock alerts (AD, WM, LM — scoped)
export const getInventoryAlerts = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    const accessibleIds = await getUserWarehouseIds(userId, role);

    const inventoryWhereClause = accessibleIds !== null
      ? { warehouse_id: { in: accessibleIds } }
      : {};

    // 1. Low stock alerts
    const allInventory = await prisma.inventory.findMany({
      where: inventoryWhereClause,
      include: { warehouse: true, product: true }
    });
    const lowStockAlerts = allInventory
      .filter(item => item.quantity < item.low_stock_threshold)
      .map(item => ({
        type: 'LOW_STOCK',
        inventory_id: item.id,
        warehouse: { id: item.warehouse.id, name: item.warehouse.name },
        product: { id: item.product.id, name: item.product.name, sku: item.product.sku },
        quantity: item.quantity,
        threshold: item.low_stock_threshold,
        message: `Stock level (${item.quantity}) is below threshold of ${item.low_stock_threshold}`,
      }));

    // 2. Capacity alerts (warehouses utilizing >= 90% of capacity)
    const warehouseWhereClause = accessibleIds !== null
      ? { deleted_at: null, id: { in: accessibleIds } }
      : { deleted_at: null };

    const warehouses = await prisma.warehouse.findMany({
      where: warehouseWhereClause,
      include: {
        warehouse_capacity: true,
        warehouse_inventory: true,
      }
    });

    const capacityAlerts: any[] = [];

    for (const wh of warehouses) {
      const capacityRecord = wh.warehouse_capacity[0];
      if (!capacityRecord) continue;

      const totalCap = parseFloat(capacityRecord.total_capacity.toString());
      if (totalCap <= 0) continue;

      const currentStockCount = wh.warehouse_inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const utilizationPercent = (currentStockCount / totalCap) * 100;

      if (utilizationPercent >= 90) {
        capacityAlerts.push({
          type: 'HIGH_CAPACITY',
          warehouse: { id: wh.id, name: wh.name },
          total_capacity: totalCap,
          unit: capacityRecord.capacity_unit,
          current_stock_count: currentStockCount,
          utilization_percentage: parseFloat(utilizationPercent.toFixed(2)),
          message: `Warehouse capacity utilization is at ${utilizationPercent.toFixed(2)}% (${currentStockCount}/${totalCap} ${capacityRecord.capacity_unit})`,
        });
      }
    }

    return res.status(200).json({
      status: 200,
      message: 'Inventory alerts generated successfully',
      data: {
        low_stock: lowStockAlerts,
        capacity: capacityAlerts,
      }
    });
  } catch (error) {
    console.error('Error generating inventory alerts:', error);
    return res.status(500).json({ status: 500, message: 'Server error while generating inventory alerts' });
  }
};
