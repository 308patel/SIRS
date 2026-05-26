import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { Role, TransferStatus, StockMovementType } from '../constant/enum';

// Helper: returns accessible warehouse IDs for the current user.
// Returns null for ADMIN/SUPER_ADMIN (no restriction), [] if user has no warehouses.
async function getUserWarehouseIds(userId: string, role: string): Promise<string[] | null> {
  if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
    return null;
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

// POST /transfers - Create transfer request (LM/AD — only between accessible warehouses)
export const createTransfer = async (req: Request, res: Response) => {
  const { source_warehouse_id, destination_warehouse_id, product_id, quantity } = req.body;
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    if (!source_warehouse_id || !destination_warehouse_id || !product_id || !quantity) {
      return res.status(400).json({ status: 400, message: 'Missing required fields' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ status: 400, message: 'Quantity must be greater than 0' });
    }

    if (source_warehouse_id === destination_warehouse_id) {
      return res.status(400).json({ status: 400, message: 'Source and destination warehouses must be different' });
    }

    // Check if warehouses exist
    const sourceWarehouse = await prisma.warehouse.findUnique({ where: { id: source_warehouse_id, deleted_at: null } });
    const destWarehouse = await prisma.warehouse.findUnique({ where: { id: destination_warehouse_id, deleted_at: null } });

    if (!sourceWarehouse || !destWarehouse) {
      return res.status(404).json({ status: 404, message: 'One or both warehouses do not exist' });
    }

    // Enforce warehouse scope: user must be associated with at least one of the two warehouses
    const accessibleIds = await getUserWarehouseIds(userId, role);
    if (accessibleIds !== null) {
      const hasAccess =
        accessibleIds.includes(source_warehouse_id) ||
        accessibleIds.includes(destination_warehouse_id);
      if (!hasAccess) {
        return res.status(403).json({
          status: 403,
          message: 'Forbidden: You are not authorized to create transfers for these warehouses',
        });
      }
    }

    // Check if product exists
    const product = await prisma.product.findUnique({ where: { id: product_id } });
    if (!product) {
      return res.status(404).json({ status: 404, message: 'Product not found' });
    }

    // Create Transfer request
    const transfer = await prisma.transfer.create({
      data: {
        source_warehouse_id,
        destination_warehouse_id,
        product_id,
        quantity,
        status: TransferStatus.PENDING,
        requested_by_id: userId,
      },
      include: {
        source_warehouse: true,
        destination_warehouse: true,
        product: true,
      }
    });

    return res.status(201).json({
      status: 201,
      message: 'Transfer request created successfully',
      data: transfer,
    });
  } catch (error) {
    console.error('Error creating transfer:', error);
    return res.status(500).json({ status: 500, message: 'Server error while creating transfer request' });
  }
};

// GET /transfers - List transfers (ADMIN sees all; WM/LM see only transfers involving their warehouses)
export const listTransfers = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    const accessibleIds = await getUserWarehouseIds(userId, role);

    const whereClause = accessibleIds !== null
      ? {
          OR: [
            { source_warehouse_id: { in: accessibleIds } },
            { destination_warehouse_id: { in: accessibleIds } },
          ],
        }
      : {};

    const transfers = await prisma.transfer.findMany({
      where: whereClause,
      include: {
        source_warehouse: true,
        destination_warehouse: true,
        product: true,
        requested_by: {
          select: { id: true, name: true, email: true, role: true }
        },
        approved_by: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({
      status: 200,
      message: 'Transfers retrieved successfully',
      data: transfers,
    });
  } catch (error) {
    console.error('Error listing transfers:', error);
    return res.status(500).json({ status: 500, message: 'Server error while retrieving transfers' });
  }
};

// GET /transfers/:id - Transfer details (scoped)
export const getTransferDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        source_warehouse: {
          include: { warehouse_location: true, warehouse_capacity: true }
        },
        destination_warehouse: {
          include: { warehouse_location: true, warehouse_capacity: true }
        },
        product: true,
        requested_by: {
          select: { id: true, name: true, email: true, role: true }
        },
        approved_by: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    if (!transfer) {
      return res.status(404).json({ status: 404, message: 'Transfer request not found' });
    }

    // Enforce warehouse scope
    const accessibleIds = await getUserWarehouseIds(userId, role);
    if (accessibleIds !== null) {
      const hasAccess =
        accessibleIds.includes(transfer.source_warehouse_id) ||
        accessibleIds.includes(transfer.destination_warehouse_id);
      if (!hasAccess) {
        return res.status(403).json({
          status: 403,
          message: 'Forbidden: You do not have access to this transfer',
        });
      }
    }

    return res.status(200).json({
      status: 200,
      message: 'Transfer details retrieved successfully',
      data: transfer,
    });
  } catch (error) {
    console.error('Error getting transfer details:', error);
    return res.status(500).json({ status: 500, message: 'Server error while retrieving transfer details' });
  }
};

// PATCH /transfers/:id/approve - Approve transfer (AD)
export const approveTransfer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;

  try {
    const transfer = await prisma.transfer.findUnique({ where: { id } });

    if (!transfer) {
      return res.status(404).json({ status: 404, message: 'Transfer request not found' });
    }

    if (transfer.status !== TransferStatus.PENDING) {
      return res.status(400).json({ status: 400, message: `Cannot approve transfer in status: ${transfer.status}` });
    }

    const updatedTransfer = await prisma.transfer.update({
      where: { id },
      data: {
        status: TransferStatus.APPROVED,
        approved_by_id: userId,
      },
      include: {
        source_warehouse: true,
        destination_warehouse: true,
        product: true,
      }
    });

    return res.status(200).json({
      status: 200,
      message: 'Transfer approved successfully',
      data: updatedTransfer,
    });
  } catch (error) {
    console.error('Error approving transfer:', error);
    return res.status(500).json({ status: 500, message: 'Server error while approving transfer' });
  }
};

// PATCH /transfers/:id/dispatch - Mark as dispatched (WM — must manage source warehouse)
export const dispatchTransfer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        product: true,
      }
    });

    if (!transfer) {
      return res.status(404).json({ status: 404, message: 'Transfer request not found' });
    }

    // Enforce warehouse scope: dispatcher must manage the source warehouse
    const accessibleIds = await getUserWarehouseIds(userId, role);
    if (accessibleIds !== null && !accessibleIds.includes(transfer.source_warehouse_id)) {
      return res.status(403).json({
        status: 403,
        message: 'Forbidden: You can only dispatch transfers from your own warehouse',
      });
    }

    if (transfer.status !== TransferStatus.APPROVED) {
      return res.status(400).json({ status: 400, message: `Cannot dispatch transfer in status: ${transfer.status}. Must be APPROVED.` });
    }

    // Check source warehouse stock
    const sourceInventory = await prisma.inventory.findUnique({
      where: {
        warehouse_id_product_id: {
          warehouse_id: transfer.source_warehouse_id,
          product_id: transfer.product_id,
        }
      }
    });

    console.log(transfer,sourceInventory, transfer.quantity)

    if (!sourceInventory || sourceInventory.quantity < transfer.quantity) {
      return res.status(400).json({
        status: 400,
        message: `Insufficient stock in source warehouse. Available: ${sourceInventory?.quantity || 0}, Required: ${transfer.quantity}`,
      });
    }

    // Transaction to update inventory, add stock movement, and update transfer status
    const result = await prisma.$transaction(async (tx) => {
      // 1. Decrement inventory from source warehouse
      const updatedInventory = await tx.inventory.update({
        where: { id: sourceInventory.id },
        data: { quantity: { decrement: transfer.quantity } },
      });

      // 2. Add StockMovement log for source warehouse (OUT)
      await tx.stockMovement.create({
        data: {
          inventory_id: sourceInventory.id,
          type: StockMovementType.OUT,
          quantity: transfer.quantity,
          reference_id: transfer.id,
          reason: `Stock dispatched for transfer ${transfer.id}`,
          created_by_id: userId,
        }
      });

      // 3. Update Transfer Status
      const updatedTransfer = await tx.transfer.update({
        where: { id: transfer.id },
        data: { status: TransferStatus.DISPATCHED },
        include: {
          source_warehouse: true,
          destination_warehouse: true,
          product: true,
        }
      });

      return updatedTransfer;
    });

    return res.status(200).json({
      status: 200,
      message: 'Transfer marked as dispatched and inventory updated',
      data: result,
    });
  } catch (error) {
    console.error('Error dispatching transfer:', error);
    return res.status(500).json({ status: 500, message: 'Server error while dispatching transfer' });
  }
};

// PATCH /transfers/:id/receive - Confirm receipt at destination (WM — must manage destination warehouse)
export const receiveTransfer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        product: true,
      }
    });

    if (!transfer) {
      return res.status(404).json({ status: 404, message: 'Transfer request not found' });
    }

    // Enforce warehouse scope: receiver must manage the destination warehouse
    const accessibleIds = await getUserWarehouseIds(userId, role);
    if (accessibleIds !== null && !accessibleIds.includes(transfer.destination_warehouse_id)) {
      return res.status(403).json({
        status: 403,
        message: 'Forbidden: You can only receive transfers into your own warehouse',
      });
    }

    if (transfer.status !== TransferStatus.DISPATCHED) {
      return res.status(400).json({ status: 400, message: `Cannot confirm receipt in status: ${transfer.status}. Must be DISPATCHED.` });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get or create inventory record for destination warehouse
      let destInventory = await tx.inventory.findUnique({
        where: {
          warehouse_id_product_id: {
            warehouse_id: transfer.destination_warehouse_id,
            product_id: transfer.product_id,
          }
        }
      });

      if (!destInventory) {
        destInventory = await tx.inventory.create({
          data: {
            warehouse_id: transfer.destination_warehouse_id,
            product_id: transfer.product_id,
            quantity: 0,
            low_stock_threshold: 10,
          }
        });
      }

      // 2. Increment inventory at destination
      await tx.inventory.update({
        where: { id: destInventory.id },
        data: { quantity: { increment: transfer.quantity } },
      });

      // 3. Add StockMovement log for destination warehouse (IN)
      await tx.stockMovement.create({
        data: {
          inventory_id: destInventory.id,
          type: StockMovementType.IN,
          quantity: transfer.quantity,
          reference_id: transfer.id,
          reason: `Stock received from transfer ${transfer.id}`,
          created_by_id: userId,
        }
      });

      // 4. Update Transfer Status
      const updatedTransfer = await tx.transfer.update({
        where: { id: transfer.id },
        data: { status: TransferStatus.RECEIVED },
        include: {
          source_warehouse: true,
          destination_warehouse: true,
          product: true,
        }
      });

      return updatedTransfer;
    });

    return res.status(200).json({
      status: 200,
      message: 'Transfer received and inventory updated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error receiving transfer:', error);
    return res.status(500).json({ status: 500, message: 'Server error while receiving transfer' });
  }
};

// GET /transfers/suggest - Auto-suggest redistribution (LM sees only their warehouses; AD sees all)
export const suggestTransfers = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const role = (req as any).role;

  try {
    const accessibleIds = await getUserWarehouseIds(userId, role);

    // 1. Fetch all products
    const products = await prisma.product.findMany();
    const suggestions: any[] = [];

    for (const product of products) {
      // Fetch inventory for this product, scoped to accessible warehouses
      const inventoryWhere: any = { product_id: product.id };
      if (accessibleIds !== null) {
        inventoryWhere.warehouse_id = { in: accessibleIds };
      }

      const inventories = await prisma.inventory.findMany({
        where: inventoryWhere,
        include: { warehouse: true }
      });

      const needy = inventories.filter(inv => inv.quantity < inv.low_stock_threshold);
      const suppliers = inventories.filter(inv => inv.quantity > inv.low_stock_threshold);

      suppliers.sort((a, b) => (b.quantity - b.low_stock_threshold) - (a.quantity - a.low_stock_threshold));

      for (const target of needy) {
        let deficit = target.low_stock_threshold - target.quantity;

        for (const source of suppliers) {
          if (deficit <= 0) break;

          const availableExcess = source.quantity - source.low_stock_threshold;
          if (availableExcess > 0) {
            const transferQty = Math.min(deficit, availableExcess);
            if (transferQty > 0) {
              suggestions.push({
                product: {
                  id: product.id,
                  name: product.name,
                  sku: product.sku,
                },
                source_warehouse: {
                  id: source.warehouse.id,
                  name: source.warehouse.name,
                  available_stock: source.quantity,
                  low_stock_threshold: source.low_stock_threshold,
                },
                destination_warehouse: {
                  id: target.warehouse.id,
                  name: target.warehouse.name,
                  current_stock: target.quantity,
                  low_stock_threshold: target.low_stock_threshold,
                },
                suggested_quantity: transferQty,
              });

              source.quantity -= transferQty;
              deficit -= transferQty;
            }
          }
        }
      }
    }

    return res.status(200).json({
      status: 200,
      message: 'Redistribution transfer suggestions generated successfully',
      data: suggestions,
    });
  } catch (error) {
    console.error('Error suggesting transfers:', error);
    return res.status(500).json({ status: 500, message: 'Server error while generating redistribution suggestions' });
  }
};
