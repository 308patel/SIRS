import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { CompanyStatus } from '../constant/enum';

export const changeCompanyStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // expect ACTIVE / SUSPENDED
  if (!Object.values(CompanyStatus).includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }
  try {
    const updated = await prisma.company.update({
      where: { id: id },
      data: { status },
    });
    res.status(200).json({ status:200, message: 'Status updated', company: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status:500, message: 'Server error while updating status' });
  }
};

export const getCompanies = async (req: Request, res: Response)=>{
  try{
    const companiesList = await prisma.company.findMany();
    const pending:any = [];
    const approved:any= [];
    const rejected:any = []
    companiesList.forEach(c=>{
      if(c.status === CompanyStatus.ACTIVE){
        approved.push(c);
      }else if(c.status === CompanyStatus.PENDING){
        pending.push(c);
      }else{
        rejected.push(c)
      }
    })
    return res.status(200).json({
      status:200,
      message: "company list retrived successfully",
      data: {active:approved, pending: pending, suspended: rejected}
    });

  }catch (error) {
    console.error(error);
    res.status(500).json({ status:500, message: 'Server error while getting companies list' });
  }
}
