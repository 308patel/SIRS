import { Request, Response } from "express";
import prisma from "../config/prisma";
import { Role, WarehouseStatus } from "../constant/enum";

export const createWareHouse = async (req: Request, res: Response) => {
    try {
        const companyId = (req as any).companyId;
        const company = await prisma.company.findUnique({
            where: {
                id: companyId,
            }
        });

        if (!company) {
            return res.status(404).json({
                status: 400,
                message: "company not found",
            });
        }

        const data: any = {
            name: req.body.name,
            warehouse_company_id: company.id,
            contact_phone: req.body.contact_phone,
            warehouse_code: req.body.warehouse_code,
            operating_hours: req.body.operating_hours,
            status: req.body.status,
            is_active: true,
            created_by_id: company.id,
            updated_by_id: company.id,
            created_at: new Date(),
            updated_at: new Date()
        }

        const isValidId = (id: any) => {
            return id && typeof id === 'string' && id.trim() !== "" && id.trim() !== "null" && id.trim() !== "undefined";
        };

        if (isValidId(req.body.warehouse_manager_id)) {
            const manager = await prisma.user.findFirst({
                where: { id: req.body.warehouse_manager_id, deleted_at: null }
            });
            if (manager) {
                data.warehouse_manager_id = req.body.warehouse_manager_id;
            } else {
                data.warehouse_manager_id = null;
            }
        }

        if (isValidId(req.body.logistic_manager_id)) {
            const manager = await prisma.user.findFirst({
                where: { id: req.body.logistic_manager_id, deleted_at: null }
            });
            if (manager) {
                data.logistic_manager_id = req.body.logistic_manager_id;
            } else {
                data.logistic_manager_id = null;
            }
        }

        const warehouse = await prisma.warehouse.create({
            data
        });

        const warehouseCapacity = await prisma.warehouseCapacity.create({
            data: {
                warehouse_id: warehouse.id,
                total_capacity: req.body.total_capacity,
                capacity_unit: req.body.capacity_unit,
                warehouse_type: req.body.warehouse_type
            }
        });

        const warehouseLocation = await prisma.warehouseLocation.create({
            data: {
                warehouse_id: warehouse.id,
                address_line1: req.body.address_line1,
                address_line2: req.body?.address_line2 || null,
                city: req.body.city,
                state: req.body.state,
                pincode: req.body.pincode,
                country: req.body.country,
                latitude: req.body?.latitude || null,
                longitude: req.body?.longitude || null,
            }
        })

        return res.status(201).json({
            status: 201,
            message: "Warehouse created successfully",
            data: {}
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: 'Server error while creating warehouse' });
    }
}

export const updateWarehouse = async (req: Request, res: Response) => {
    try {
        const companyId = (req as any).companyId;
        const warehouseId = req.params.id;
        const warehouse = await prisma.warehouse.findUnique({
            where: { id: warehouseId, deleted_at: null },
            include: { warehouse_capacity: true, warehouse_location: true },
        });
        if (!warehouse) {
            return res.status(404).json({ status: 404, message: "Warehouse not found" });
        }
        if (warehouse.warehouse_company_id !== companyId) {
            return res.status(403).json({ status: 403, message: "Not authorized to update this warehouse" });
        }

        const data: any = {
            name: req.body.name ?? warehouse.name,
            contact_phone: req.body.contact_phone ?? warehouse.contact_phone,
            operating_hours: req.body.operating_hours ?? warehouse.operating_hours,
            status: req.body.status ?? warehouse.status,
            is_active: req.body.is_active ?? warehouse.is_active,
            updated_by_id: companyId,
            updated_at: new Date(),
        };

        const isValidId = (id: any) => {
            return id && typeof id === 'string' && id.trim() !== "" && id.trim() !== "null" && id.trim() !== "undefined";
        };

        if (req.body.hasOwnProperty('warehouse_manager_id')) {
            const managerId = req.body.warehouse_manager_id;
            if (isValidId(managerId)) {
                const manager = await prisma.user.findFirst({
                    where: { id: managerId, deleted_at: null }
                });
                if (manager) {
                    data.warehouse_manager_id = managerId;
                } else {
                    data.warehouse_manager_id = null;
                }
            } else {
                data.warehouse_manager_id = null;
            }
        }

        if (req.body.hasOwnProperty('logistic_manager_id')) {
            const managerId = req.body.logistic_manager_id;
            if (isValidId(managerId)) {
                const manager = await prisma.user.findFirst({
                    where: { id: managerId, deleted_at: null }
                });
                if (manager) {
                    data.logistic_manager_id = managerId;
                } else {
                    data.logistic_manager_id = null;
                }
            } else {
                data.logistic_manager_id = null;
            }
        }
        const updatedWarehouse = await prisma.warehouse.update({
            where: { id: warehouseId },
            data,
        });
        // Update capacity if provided
        if (req.body.total_capacity || req.body.capacity_unit || req.body.warehouse_type) {
            const capacity = warehouse.warehouse_capacity[0];
            if (capacity) {
                await prisma.warehouseCapacity.update({
                    where: { id: capacity.id },
                    data: {
                        total_capacity: req.body.total_capacity ?? undefined,
                        capacity_unit: req.body.capacity_unit,
                        warehouse_type: req.body.warehouse_type,
                    },
                });
            }
        }
        // Update location if provided
        if (req.body.address_line1 || req.body.city) {
            const location = warehouse.warehouse_location[0];
            if (location) {
                await prisma.warehouseLocation.update({
                    where: { id: location.id },
                    data: {
                        address_line1: req.body.address_line1 ?? undefined,
                        address_line2: req.body?.address_line2 ?? undefined,
                        city: req.body.city ?? undefined,
                        state: req.body.state ?? undefined,
                        pincode: req.body.pincode ?? undefined,
                        country: req.body.country ?? undefined,
                        latitude: req.body?.latitude ?? undefined,
                        longitude: req.body?.longitude ?? undefined,
                    },
                });
            }
        }
        return res.status(200).json({
            status: 200,
            message: "Warehouse updated successfully",
            data: updatedWarehouse,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "Server error while updating warehouse" });
    }
};

export const getAllWarehouses = async (req: Request, res: Response) => {
    try {
        let companyId = (req as any).companyId;
        if (!companyId) {
            const userId = (req as any).userId;
            if (userId) {
                const user = await prisma.user.findUnique({
                    where: { id: userId }
                });
                companyId = user?.company_id || undefined;
            }
        }
        const warehouseList = await prisma.warehouse.findMany({
            where: { warehouse_company_id: companyId, deleted_at: null },
            include: {
                warehouse_manager: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                logistic_manager: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        return res.status(200).json({
            status: 200,
            message: "warehouse list retrived successfully",
            data: warehouseList
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "Server error while retrieving warehouses" });
    }
}

export const getWarehouseById = async (req: Request, res: Response) => {
    try {
        const warehouse = await prisma.warehouse.findUnique({
            where: { id: req.params.warehouse_id, deleted_at: null },
            include: {
                warehouse_capacity: true,
                warehouse_location: true,
                warehouse_manager: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        profile_image: true,
                        role: true,
                        status: true,
                    }
                },
                logistic_manager: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        profile_image: true,
                        role: true,
                        status: true,
                    }
                },
                staff: {
                    where: { deleted_at: null },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                        status: true,
                    }
                },
                warehouse_inventory: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                price: true,
                            }
                        }
                    }
                }
            }
        });
        if (!warehouse) {
            return res.status(404).json({ status: 404, message: "Warehouse not found" });
        }
        return res.status(200).json({
            status: 200,
            message: "Warehouse retrieved successfully",
            data: warehouse
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "Server error while retrieving warehouse" });
    }
}

export const deleteWarehouse = async (req: Request, res: Response) =>{
    try{
        const role = (req as any).role;
        const warehouseId = req.params.warehouse_id;
        const warehouse = await prisma.warehouse.findUnique({
            where: { id: warehouseId, deleted_at: null },
        });
        if (!warehouse) {
            return res.status(404).json({ status: 404, message: "Warehouse not found" });
        }
        if (role === Role.COMPANY) {
            const companyId = (req as any).companyId;
            if (warehouse.warehouse_company_id !== companyId) {
                return res.status(403).json({ status: 403, message: "Not authorized to delete this warehouse" });
            }
        }
        await prisma.warehouse.update({
            where: {
                id: warehouseId
            },
            data:{
                deleted_at:new Date()
            }
        })
        return res.status(200).json({status:200, message:"Warehouse deleted successfully", data:{}})
    }catch(error){
        console.error(error);
        res.status(500).json({ status: 500, message: "Server error while deleting warehouse" });
    }
}

// GET /warehouses/my - Returns only warehouses accessible to the current user.
// Used by the Stock Intake / Registry form warehouse dropdown.
// ADMIN → all company warehouses
// WORKSPACE_MANAGER / LOGISTIC_MANAGER → only warehouses where they are assigned as manager
//   OR directly assigned as staff (warehouse_id on User)
export const getMyWarehouses = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const role = (req as any).role;

        // For ADMIN: return all warehouses of their company (same as getAllWarehouses scoped to company)
        if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { company_id: true } });
            const warehouseList = await prisma.warehouse.findMany({
                where: { warehouse_company_id: user?.company_id ?? undefined, deleted_at: null, is_active: true },
                select: { id: true, name: true, warehouse_code: true, status: true }
            });
            return res.status(200).json({ status: 200, message: 'Accessible warehouses retrieved successfully', data: warehouseList });
        }

        // For WM / LM: look up the user and gather warehouse IDs they are linked to
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                warehouse_id: true,
                warehouse_manager: { select: { id: true, name: true, warehouse_code: true, status: true } },
                warehouse_logistic_manager: { select: { id: true, name: true, warehouse_code: true, status: true } },
            },
        });

        if (!user) {
            return res.status(404).json({ status: 404, message: 'User not found' });
        }

        // Merge warehouse IDs without duplicates
        const warehouseMap = new Map<string, any>();

        user.warehouse_manager.forEach((w) => warehouseMap.set(w.id, w));
        user.warehouse_logistic_manager.forEach((w) => warehouseMap.set(w.id, w));

        // If directly assigned as staff, fetch that warehouse too
        if (user.warehouse_id && !warehouseMap.has(user.warehouse_id)) {
            const staffWarehouse = await prisma.warehouse.findUnique({
                where: { id: user.warehouse_id, deleted_at: null },
                select: { id: true, name: true, warehouse_code: true, status: true },
            });
            if (staffWarehouse) warehouseMap.set(staffWarehouse.id, staffWarehouse);
        }

        const warehouseList = Array.from(warehouseMap.values()).filter((w) => w.status !== 'DELETED');

        return res.status(200).json({
            status: 200,
            message: 'Accessible warehouses retrieved successfully',
            data: warehouseList,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: 'Server error while retrieving accessible warehouses' });
    }
};

export const assignManager = async (req: Request, res: Response) => {
    try {
        const warehouseId = req.params.id;
        const warehouse = await prisma.warehouse.findUnique({
            where: { id: warehouseId, deleted_at: null },
        });

        if (!warehouse) {
            return res.status(404).json({ status: 404, message: "Warehouse not found" });
        }

        const role = (req as any).role;
        let targetCompanyId: string | null = null;
        if (role === Role.COMPANY) {
            targetCompanyId = (req as any).companyId;
        } else {
            const loggedInUserId = (req as any).userId;
            if (loggedInUserId) {
                const loggedInUser = await prisma.user.findUnique({
                    where: { id: loggedInUserId }
                });
                targetCompanyId = loggedInUser?.company_id || null;
            }
        }

        const data: any = {
            updated_at: new Date()
        };

        const isValidId = (id: any) => {
            return id && typeof id === 'string' && id.trim() !== "" && id.trim() !== "null" && id.trim() !== "undefined";
        };

        if (req.body.hasOwnProperty('warehouse_manager_id')) {
            const managerId = req.body.warehouse_manager_id;
            if (isValidId(managerId)) {
                const manager = await prisma.user.findFirst({
                    where: { id: managerId, deleted_at: null }
                });
                if (!manager) {
                    return res.status(404).json({
                        status: 404,
                        message: "Warehouse manager user not found"
                    });
                }

                // Demote the PREVIOUS warehouse_manager (if any and different from new one)
                if (warehouse.warehouse_manager_id && warehouse.warehouse_manager_id !== managerId) {
                    const prevManagerUpdate: any = { role: Role.USER };
                    // Clear their warehouse_id only if they were assigned to this warehouse
                    const prevManager = await prisma.user.findUnique({
                        where: { id: warehouse.warehouse_manager_id },
                        select: { warehouse_id: true }
                    });
                    if (prevManager?.warehouse_id === warehouseId) {
                        prevManagerUpdate.warehouse_id = null;
                    }
                    await prisma.user.update({
                        where: { id: warehouse.warehouse_manager_id },
                        data: prevManagerUpdate
                    });
                }

                // Promote the new manager
                await prisma.user.update({
                    where: { id: managerId },
                    data: {
                        role: Role.WORKSPACE_MANAGER,
                        company_id: targetCompanyId,
                        warehouse_id: warehouseId,
                    }
                });
                data.warehouse_manager_id = managerId;
            } else {
                // Slot is being cleared — demote whoever was in it
                if (warehouse.warehouse_manager_id) {
                    const prevManagerUpdate: any = { role: Role.USER };
                    const prevManager = await prisma.user.findUnique({
                        where: { id: warehouse.warehouse_manager_id },
                        select: { warehouse_id: true }
                    });
                    if (prevManager?.warehouse_id === warehouseId) {
                        prevManagerUpdate.warehouse_id = null;
                    }
                    await prisma.user.update({
                        where: { id: warehouse.warehouse_manager_id },
                        data: prevManagerUpdate
                    });
                }
                data.warehouse_manager_id = null;
            }
        }

        if (req.body.hasOwnProperty('logistic_manager_id')) {
            const managerId = req.body.logistic_manager_id;
            if (isValidId(managerId)) {
                const manager = await prisma.user.findFirst({
                    where: { id: managerId, deleted_at: null }
                });
                if (!manager) {
                    return res.status(404).json({
                        status: 404,
                        message: "Logistic manager user not found"
                    });
                }

                // Demote the PREVIOUS logistic_manager (if any and different from new one)
                if (warehouse.logistic_manager_id && warehouse.logistic_manager_id !== managerId) {
                    const prevManagerUpdate: any = { role: Role.USER };
                    const prevManager = await prisma.user.findUnique({
                        where: { id: warehouse.logistic_manager_id },
                        select: { warehouse_id: true }
                    });
                    if (prevManager?.warehouse_id === warehouseId) {
                        prevManagerUpdate.warehouse_id = null;
                    }
                    await prisma.user.update({
                        where: { id: warehouse.logistic_manager_id },
                        data: prevManagerUpdate
                    });
                }

                // Promote the new logistic manager
                await prisma.user.update({
                    where: { id: managerId },
                    data: {
                        role: Role.LOGISTIC_MANAGER,
                        company_id: targetCompanyId,
                        warehouse_id: warehouseId,
                    }
                });
                data.logistic_manager_id = managerId;
            } else {
                // Slot is being cleared — demote whoever was in it
                if (warehouse.logistic_manager_id) {
                    const prevManagerUpdate: any = { role: Role.USER };
                    const prevManager = await prisma.user.findUnique({
                        where: { id: warehouse.logistic_manager_id },
                        select: { warehouse_id: true }
                    });
                    if (prevManager?.warehouse_id === warehouseId) {
                        prevManagerUpdate.warehouse_id = null;
                    }
                    await prisma.user.update({
                        where: { id: warehouse.logistic_manager_id },
                        data: prevManagerUpdate
                    });
                }
                data.logistic_manager_id = null;
            }
        }

        const updatedWarehouse = await prisma.warehouse.update({
            where: { id: warehouseId },
            data,
        });

        return res.status(200).json({
            status: 200,
            message: "Warehouse managers assigned successfully",
            data: updatedWarehouse
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "Server error while assigning managers" });
    }
};