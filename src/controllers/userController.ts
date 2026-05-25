import { Request, Response, NextFunction } from 'express';

import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
