import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { uploadToCloudinary } from '../config/cloudinary';

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Prevent role escalation through profile update
    delete updates.role;
    delete updates.password;

    let user;
    if (userId && mongoose.isValidObjectId(userId)) {
      user = await User.findById(userId);
    } else if (req.user) {
      user = req.user;
    }

    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    Object.assign(user, updates);
    await user.save();

    res.json({ data: user.toSafeObject() });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { code: 'NO_FILE', message: 'No file uploaded' } });
    }

    const folder = req.body.folder || 'documents';
    const filename = req.body.filename || req.user?.name?.replace(/\s+/g, '_') || 'doc';

    const uploadResult = await uploadToCloudinary(req.file.buffer, folder, filename);

    res.json({
      data: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        filename: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'UPLOAD_FAILED', message: err.message } });
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    if (!req.file) {
      return res.status(400).json({ error: { code: 'NO_FILE', message: 'Please select an image file to upload' } });
    }

    let avatarUrl = '';

    try {
      const filename = `avatar_${req.user._id}_${Date.now()}`;
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'ayush_avatars', filename);
      avatarUrl = uploadResult.url;
    } catch (cloudinaryErr: any) {
      console.warn('[Cloudinary Notice] Cloudinary upload fallback to base64 data URI:', cloudinaryErr.message);
      const mime = req.file.mimetype || 'image/jpeg';
      avatarUrl = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
    }

    req.user.profilePicture = avatarUrl;
    await req.user.save();

    res.json({
      data: {
        profilePicture: avatarUrl,
        user: req.user.toSafeObject(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'AVATAR_UPLOAD_FAILED', message: err.message } });
  }
};

export const removeAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    req.user.profilePicture = '';
    await req.user.save();

    res.json({
      data: {
        profilePicture: '',
        user: req.user.toSafeObject(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getCandidates = async (_req: AuthRequest, res: Response) => {
  try {
    const candidates = await User.find({ role: { $in: ['student', 'jobseeker'] }, verified: true })
      .select('name email institution department degree location skills verified profilePicture createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: candidates });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.params.userId || req.user?._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Current password and new password are required' } });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 6 characters long' } });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' } });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      data: {
        success: true,
        message: 'Password updated successfully in database',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
