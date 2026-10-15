import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Resume } from '../models/Resume';
import { User } from '../models/User';
import { uploadToCloudinary, generateSignedDownloadUrl } from '../config/cloudinary';
import { sanitizeFilename } from '../middleware/upload';
import {
  extractTextFromBuffer,
  parseResumeWithGroq,
  syncResumeToSkillProfile,
} from '../services/resumeService';

export const uploadResume = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Authentication required.' } });
    }

    if (!req.file) {
      return res.status(400).json({ error: { message: 'Resume document file is required.' } });
    }

    const safeOriginalName = sanitizeFilename(req.file.originalname);

    // 1. Upload to Cloudinary with authenticated/private access
    let uploadResult: { url: string; publicId: string };
    try {
      uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: 'resumes',
        filename: `resume_${userId}`,
        isPrivate: true,
        resourceType: 'raw',
      });
    } catch (uploadErr: any) {
      return res.status(502).json({
        error: {
          code: 'STORAGE_ERROR',
          message: `Failed to upload document to secure storage: ${uploadErr.message}`,
        },
      });
    }

    // 2. Create Resume database record
    const resume = new Resume({
      userId,
      fileUrl: uploadResult.url,
      cloudinaryPublicId: uploadResult.publicId,
      originalFilename: safeOriginalName,
      mimeType: req.file.mimetype,
      fileSizeBytes: req.file.size,
      uploadedAt: new Date(),
      extractionStatus: 'processing',
    });

    await resume.save();

    // Link to User
    await User.findByIdAndUpdate(userId, { resumeId: resume._id });

    // 3. Attempt server-side text extraction & Groq entity extraction
    try {
      const extractedText = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
      const parsedData = await parseResumeWithGroq(extractedText);

      resume.extractionStatus = 'completed';
      resume.extractedData = parsedData;
      resume.confirmedData = parsedData; // initial draft for student confirmation
      await resume.save();
    } catch (extractErr: any) {
      console.warn(`[Resume Extraction Notice for user ${userId}]: ${extractErr.message}`);
      resume.extractionStatus = 'failed';
      resume.extractionError = extractErr.message;
      await resume.save();
    }

    return res.status(201).json({
      success: true,
      data: resume,
    });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};

export const getMyResume = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Authentication required.' } });
    }

    const resume = await Resume.findOne({ userId }).sort({ createdAt: -1 });
    if (!resume) {
      return res.status(404).json({ error: { message: 'No resume uploaded yet.' } });
    }

    return res.json({ success: true, data: resume });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};

export const getResumeById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const resume = await Resume.findById(id);

    if (!resume) {
      return res.status(404).json({ error: { message: 'Resume not found.' } });
    }

    // Access authorization: owner, admin, or institution
    const isOwner = resume.userId.toString() === req.user?.id;
    const isPrivileged = ['admin', 'institution'].includes(req.user?.role || '');

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ error: { message: 'Unauthorized to view this resume.' } });
    }

    return res.json({ success: true, data: resume });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};

export const confirmResume = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const confirmedData = req.body;

    const resume = await Resume.findById(id);
    if (!resume) {
      return res.status(404).json({ error: { message: 'Resume not found.' } });
    }

    if (resume.userId.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ error: { message: 'Unauthorized to modify this resume.' } });
    }

    resume.confirmedData = confirmedData;
    resume.extractionStatus = 'completed';
    resume.extractionError = undefined;
    await resume.save();

    // Sync confirmed data into student's SkillProfile and User record
    const { profile, user } = await syncResumeToSkillProfile(resume.userId.toString(), confirmedData);

    return res.json({
      success: true,
      message: 'Resume confirmed and profile synced successfully.',
      data: {
        resume,
        profile,
        user,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};

export const downloadResume = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const resume = await Resume.findById(id);

    if (!resume) {
      return res.status(404).json({ error: { message: 'Resume not found.' } });
    }

    const isOwner = resume.userId.toString() === req.user?.id;
    const isPrivileged = ['admin', 'institution', 'industry'].includes(req.user?.role || '');

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ error: { message: 'Unauthorized to download this resume.' } });
    }

    // Generate signed authenticated Cloudinary URL valid for 60 minutes
    const signedUrl = generateSignedDownloadUrl(resume.cloudinaryPublicId, 3600, 'raw');

    if (req.query.redirect === 'true') {
      return res.redirect(signedUrl);
    }

    return res.json({
      success: true,
      downloadUrl: signedUrl,
      filename: resume.originalFilename,
      expiresInSeconds: 3600,
    });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message } });
  }
};
