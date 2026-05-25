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
            warehouse_code: "oplkjlkjlk",
            operating_hours: req.body.operating_hours,
            status: req.body.status,
            is_active: true,
            created_by_id: company.id,
            updated_by_id: company.id,
            created_at: new Date(),
            updated_at: new Date()
        }
        if (req.body.warehouse_manager_id) {
            data.warehouse_manager_id = req.body.warehouse_manager_id;
        }

        if (req.body.logistic_manager_id) {
            data.logistic_manager_id = req.body.logistic_manager_id;
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
        if (req.body.warehouse_manager_id) data.warehouse_manager_id = req.body.warehouse_manager_id;
        if (req.body.logistic_manager_id) data.logistic_manager_id = req.body.logistic_manager_id;
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
        const companyId = (req as any).companyId;
        const warehouseList = await prisma.warehouse.findMany({ where: { warehouse_company_id: companyId, deleted_at: null } });
        return res.status(200).json({
            status: 200,
            message: "warehouse list retrived successfully",
            data: warehouseList
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "Server error while updating warehouse" });
    }
}

export const getWarehouseById = async (req: Request, res: Response) => {
    try {
        const companyId = (req as any).companyId;
        const warehouseList = await prisma.warehouse.findUnique({
            where: { id: req.params.warehouse_id, deleted_at:null }, include: {
                warehouse_capacity: true,
                warehouse_location: true,
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
            }
        });
        return res.status(200).json({
            status: 200,
            message: "warehouse retrived successfully",
            data: warehouseList
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "Server error while retriving warehouse" });
    }
}

export const deleteWarehouse = async (req: Request, res: Response) =>{
    try{
        const companyId = (req as any).companyId;
        const warehouseId = req.params.warehouse_id;
        const warehouse = await prisma.warehouse.findUnique({
            where: { id: warehouseId, deleted_at: null },
        });
        if (!warehouse) {
            return res.status(404).json({ status: 404, message: "Warehouse not found" });
        }
        if (warehouse.warehouse_company_id !== companyId) {
            return res.status(403).json({ status: 403, message: "Not authorized to update this warehouse" });
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