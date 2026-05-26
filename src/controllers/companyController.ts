import { Request, response, Response } from 'express';
import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role, CompanyStatus } from '../constant/enum';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Register a new company – status defaults to PENDING
export const registerCompany = async (req: Request, res: Response) => {
  const { name, email, contact_no, password } = req.body;
  try {
    const existing = await prisma.company.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ status:400, message: 'Company email already registered' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const company = await prisma.company.create({
      data: {
        name,
        email,
        contact_no,
        password_hash,
        status: 'PENDING', // default pending status
      },
    });
    const data ={companyId: company.id, status: company.status}
    res.status(201).json({ status:201, message: 'Company registered successfully', data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status:500, message: 'Server error while registering company' });
  }
};

// Login for a company – returns JWT with role "COMPANY"
export const loginCompany = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const company = await prisma.company.findUnique({ where: { email } });
    
    if (!company) return res.status(400).json({ status:400, message: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, company.password_hash);
    
    if (!valid) return res.status(400).json({ status:400, message: 'Invalid credentials' });
    
    if (company.status !== 'ACTIVE') {
      return res.status(403).json({ status:403,message: `Company not active (current status: ${company.status})` });
    }
    const token = jwt.sign(
      { companyId: company.id, role: 'COMPANY' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.status(200).json({ status:200, message: 'Company logged in successfully', data:{token, companyId: company.id} });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status:500, message: 'Server error while logging in' });
  }
};

// Get users for a comapny - resturn all users of that company
export const getCompanyUsers = async (req: Request, res: Response)=> {
  try{
    const page: number = Number(req.query.page) || 1;
    const limit:number = Number(req.query.limit) || 10;
    const offset = ( page - 1 ) * limit;
    let whereCondition:any = {};
    if(req.query.name){
      whereCondition.name = req.query.name
    }

    if(req.query.email){
      whereCondition.name = req.query.email
    }
    const company = await prisma.company.findUnique({where:{
      id: req.params.company_id,
    }});
    
    if(!company){
      return res.status(404).json({status:404, message:"company not found"})
    }

    const usersList = await prisma.user
    .findMany({ 
      where: { company_id: req.params.company_id, deleted_at: null },
      select: { 
        id: true,
        name: true,
        email: true,
        phone: true,
        profile_image: true,
        role: true,
        status: true,
        warehouse_id: true,
        warehouse: {
          select: {
            id: true,
            name: true,
            warehouse_code: true
          }
        }
      }, 
      take: limit, 
      skip: offset, 
      orderBy: { created_at: 'asc' }
    })
    
    const count = await prisma.user
    .count({ where: { company_id: req.params.company_id, deleted_at: null, ...whereCondition
 }})//take: limit , skip: offset 

    return res.status(200).json({status:200, message:"User list retrived successfully", data:{users: usersList, total: count}})
  }catch(error){
    console.error(error);
    res.status(500).json({ status:500, message: 'Error in getting users list' });
  }
}

// Assign user as an admin of the logged-in company (only COMPANY role can call this)
export const assignAdmin = async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const userId = req.body.userId || req.params.userId;

    if (!userId) {
      return res.status(400).json({ status: 400, message: "User ID is required" });
    }

    // Find the user
    const user = await prisma.user.findFirst({
      where: { id: userId, deleted_at: null }
    });

    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found" });
    }

    // Update role to ADMIN and company_id to the logged-in company id
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: Role.ADMIN,
        company_id: companyId,
        requested_company_id: null, // Clear request since they are accepted/assigned
        updated_at: new Date()
      }
    });

    return res.status(200).json({
      status: 200,
      message: "Admin assigned successfully",
      data: updatedUser
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Server error while assigning admin" });
  }
};

export const getPendingCompanyUsers = async (req: Request, res: Response) => {
  try {
    const companyId = req.params.company_id;
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });
    if (!company) {
      return res.status(404).json({ status: 404, message: "Company not found" });
    }
    const pendingUsers = await prisma.user.findMany({
      where: {
        requested_company_id: companyId,
        company_id: null,
        deleted_at: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true
      },
      orderBy: { created_at: 'asc' }
    });
    return res.status(200).json({
      status: 200,
      message: "Pending users retrieved successfully",
      data: pendingUsers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Server error while retrieving pending users" });
  }
};

export const getActiveCompaniesList = async (req: Request, res: Response) => {
  try {
    const activeCompanies = await prisma.company.findMany({
      where: {
        status: CompanyStatus.ACTIVE
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    return res.status(200).json({
      status: 200,
      message: "Active companies retrieved successfully",
      data: activeCompanies
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Server error while retrieving active companies list" });
  }
};