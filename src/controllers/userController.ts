import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role, UserStatus } from '../constant/enum';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const signup = async (req: Request, res: Response) => {
  const { name, email, phone, password, role, company_id } = req.body;
  try {
    const existing = await prisma.user.findMany({ where: { email } });
    console.log("Existing: ", existing);
    if (existing.length > 0) return res.status(400).json({ status:400, message: 'Email already in use' });

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {

        name,
        email,
        phone,
        password_hash,
        role: role ? role : 'USER',
      },
    });
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ status:201, message: 'User registered successfully', data:{token, userId: user.id} });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status:500, message: 'Server error while registering user' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(400).json({ status:400, message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) return res.status(400).json({ status:400, message: 'Invalid credentials' });

    // Generate access token (short-lived) and refresh token (long-lived)
    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // Update last login timestamp
    await prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
    // Return both tokens to client
    res.status(200).json({
      status: 200,
      message: 'User logged in successfully',
      data: { accessToken, refreshToken, userId: user.id },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status:500, message: 'Server error while logging in' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) return res.status(404).json({ status:404, message: 'User not found' });

    const valid = await bcrypt.compare(oldPassword, user.password_hash);

    if (!valid) return res.status(400).json({ status:400, message: 'Old password incorrect' });

    const password_hash = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({ where: { id: userId }, data: { password_hash } });
    res.status(200).json({ status:200, message: 'Password updated successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status:500, message: 'Server error while changing password' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  // placeholder: generate reset token and email it (implementation depends on email service)
  res.json({ message: 'Password reset link sent (mock)' });
};

export const checkEmail = async (req: Request, res: Response) => {
  const { email } = req.params;
  const user = await prisma.user.findUnique({ where: { email } });
  res.status(200).json({ status:200, message: 'Email checked successfully', data:{exists: !!user} });
};

export const logout = async (req: Request, res: Response) => {
  res.status(200).json({ status:200, message: 'Logged out (client should discard token)' });
};

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken, token } = req.body;
  const providedToken = refreshToken || token;
  if (!providedToken) {
    return res.status(400).json({ status: 400, message: 'Refresh token required' });
  }
  try {
    // Verify the provided refresh token
    const payload = jwt.verify(providedToken as string, JWT_SECRET) as any;
    // Issue a new access token (short-lived) and optionally a new refresh token
    const newAccessToken = jwt.sign({ userId: payload.userId, role: payload.role }, JWT_SECRET, { expiresIn: '1d' });
    const newRefreshToken = jwt.sign({ userId: payload.userId, role: payload.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({
      status: 200,
      message: 'Token refreshed successfully',
      data: { token: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (e) {
    res.status(401).json({ status: 401, message: 'Invalid refresh token' });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, deleted_at: null },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            warehouse_code: true
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found' });
    }
    const { password_hash, ...profile } = user;
    res.status(200).json({
      status: 200,
      message: 'User profile retrieved successfully',
      data: profile,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: 500, message: 'Server error while retrieving user profile' });
  }
};

export const getOwnProfile = async (req: Request, res: Response) => {
  try {
    const role = (req as any).role;
    if (role === Role.COMPANY) {
      const companyId = (req as any).companyId;
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (!company) {
        return res.status(404).json({ status: 404, message: 'Company not found' });
      }
      const { password_hash, ...profile } = company;
      return res.status(200).json({
        status: 200,
        message: 'Own profile retrieved successfully',
        data: profile,
      });
    } else {
      const userId = (req as any).userId;
      const user = await prisma.user.findFirst({
        where: { id: userId, deleted_at: null },
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              warehouse_code: true
            }
          },
          company: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      if (!user) {
        return res.status(404).json({ status: 404, message: 'User not found' });
      }
      const { password_hash, ...profile } = user;
      return res.status(200).json({
        status: 200,
        message: 'Own profile retrieved successfully',
        data: profile,
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: 500, message: 'Server error while retrieving own profile' });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, deleted_at: null },
    });
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found' });
    }

    const updaterRole = (req as any).role;
    let loggedInCompanyId: string | null = null;
    if (updaterRole === Role.COMPANY) {
      loggedInCompanyId = (req as any).companyId;
    } else {
      const adminUser = await prisma.user.findUnique({
        where: { id: (req as any).userId }
      });
      loggedInCompanyId = adminUser?.company_id || null;
    }

    if (!loggedInCompanyId || user.company_id !== loggedInCompanyId) {
      return res.status(403).json({ status: 403, message: "Not authorized to update this user" });
    }

    const { name, phone, role, status, warehouse_id } = req.body;

    if (warehouse_id !== undefined) {
      if (warehouse_id !== null && warehouse_id !== "") {
        const wh = await prisma.warehouse.findFirst({
          where: { id: warehouse_id, deleted_at: null }
        });
        if (!wh) {
          return res.status(404).json({ status: 404, message: 'Warehouse not found' });
        }
        if (!user.company_id) {
          return res.status(400).json({ status: 400, message: "User must belong to a company before being assigned to a warehouse" });
        }
        if (wh.warehouse_company_id !== user.company_id) {
          return res.status(400).json({ status: 400, message: "Warehouse does not belong to the user's company" });
        }

        // User is being moved to a DIFFERENT warehouse
        if (user.warehouse_id && user.warehouse_id !== wh.id) {
          // Step 1: Clear manager/logistic_manager slots in the OLD warehouse
          //         if this user was holding them. This prevents the ghost-manager bug.
          const oldWarehouse = await prisma.warehouse.findUnique({
            where: { id: user.warehouse_id },
            select: { warehouse_manager_id: true, logistic_manager_id: true }
          });
          if (oldWarehouse) {
            const clearData: any = {};
            if (oldWarehouse.warehouse_manager_id === req.params.id) {
              clearData.warehouse_manager_id = null;
            }
            if (oldWarehouse.logistic_manager_id === req.params.id) {
              clearData.logistic_manager_id = null;
            }
            if (Object.keys(clearData).length > 0) {
              await prisma.warehouse.update({
                where: { id: user.warehouse_id },
                data: clearData,
              });
            }
          }

          // Step 2: Reset the user's role to USER since they no longer manage the old warehouse
          await prisma.user.update({ where: { id: req.params.id }, data: { role: Role.USER } });
        }
      } else {
        // warehouse_id is being cleared (empty string or null) — also clean up old warehouse manager slots
        if (user.warehouse_id) {
          const oldWarehouse = await prisma.warehouse.findUnique({
            where: { id: user.warehouse_id },
            select: { warehouse_manager_id: true, logistic_manager_id: true }
          });
          if (oldWarehouse) {
            const clearData: any = {};
            if (oldWarehouse.warehouse_manager_id === req.params.id) {
              clearData.warehouse_manager_id = null;
            }
            if (oldWarehouse.logistic_manager_id === req.params.id) {
              clearData.logistic_manager_id = null;
            }
            if (Object.keys(clearData).length > 0) {
              await prisma.warehouse.update({
                where: { id: user.warehouse_id },
                data: clearData,
              });
            }
          }
          // Reset role to USER when warehouse is unassigned
          await prisma.user.update({ where: { id: req.params.id }, data: { role: Role.USER } });
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        name: name !== undefined ? name : undefined,
        phone: phone !== undefined ? phone : undefined,
        role: role !== undefined ? role : undefined,
        status: status !== undefined ? status : undefined,
        warehouse_id: warehouse_id !== undefined ? (warehouse_id === "" ? null : warehouse_id) : undefined,
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            warehouse_code: true
          }
        }
      }
    });


    const { password_hash, ...profile } = updated;
    res.status(200).json({
      status: 200,
      message: 'User profile updated successfully',
      data: profile,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: 500, message: 'Server error while updating user profile' });
  }
};

export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, deleted_at: null },
    });
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found' });
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: { status: UserStatus.INACTIVE },
    });

    res.status(200).json({
      status: 200,
      message: 'User deactivated successfully',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: 500, message: 'Server error while deactivating user' });
  }
};

export const softDeleteUser = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, deleted_at: null },
    });
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found' });
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: { deleted_at: new Date() },
    });

    res.status(200).json({
      status: 200,
      message: 'User soft deleted successfully',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: 500, message: 'Server error while deleting user' });
  }
};

// User selects a company to join
export const selectCompany = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ status: 400, message: "Company ID is required" });
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ status: 404, message: "Company not found" });
    }

    // Update user's requested_company_id
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        requested_company_id: companyId,
        updated_at: new Date()
      }
    });

    const { password_hash, ...profile } = updatedUser;
    return res.status(200).json({
      status: 200,
      message: "Company selection request submitted successfully",
      data: profile
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Server error while selecting company" });
  }
};

// Admin/Company accepts a user's join request
export const acceptJoinRequest = async (req: Request, res: Response) => {
  try {
    const role = (req as any).role;
    const userId = req.body.userId || req.params.id;
    const warehouse_id = req.body.warehouse_id || req.body.warehouseId || req.body.workshopId || req.body.workshop_id;

    if (!userId) {
      return res.status(400).json({ status: 400, message: "User ID is required" });
    }

    let targetCompanyId: string | null = null;

    if (role === Role.COMPANY) {
      targetCompanyId = (req as any).companyId;
    } else {
      const adminUserId = (req as any).userId;
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId }
      });
      targetCompanyId = adminUser?.company_id || null;
    }

    if (!targetCompanyId) {
      return res.status(403).json({
        status: 403,
        message: "Accepting administrator/company is not associated with any company"
      });
    }

    // Fetch the target user
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, deleted_at: null }
    });

    if (!targetUser) {
      return res.status(404).json({ status: 404, message: "User not found" });
    }

    if (!targetUser.requested_company_id) {
      return res.status(400).json({
        status: 400,
        message: "User has not requested to join any company"
      });
    }

    if (targetUser.requested_company_id !== targetCompanyId) {
      return res.status(403).json({
        status: 403,
        message: "Not authorized: the user has requested to join a different company"
      });
    }

    // Validate warehouse_id if provided
    if (warehouse_id) {
      const wh = await prisma.warehouse.findFirst({
        where: { id: warehouse_id, deleted_at: null }
      });
      if (!wh) {
        return res.status(404).json({ status: 404, message: 'Warehouse not found' });
      }
      if (wh.warehouse_company_id !== targetCompanyId) {
        return res.status(400).json({ status: 400, message: "Warehouse does not belong to the user's company" });
      }
    }

    // Update the target user: set company_id to the selected company, clear requested_company_id, and assign warehouse_id if provided
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        company_id: targetUser.requested_company_id,
        requested_company_id: null,
        warehouse_id: warehouse_id || null,
        updated_at: new Date()
      }
    });

    const { password_hash, ...profile } = updatedUser;
    return res.status(200).json({
      status: 200,
      message: "User join request accepted successfully",
      data: profile
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Server error while accepting join request" });
  }
};
