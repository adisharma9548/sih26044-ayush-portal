import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User } from '../models/User';
import { Skill } from '../models/Skill';
import { Question, AssessmentAttempt } from '../models/Assessment';
import { SkillProfile } from '../models/SkillProfile';
import { Opportunity } from '../models/Opportunity';
import { Application } from '../models/Application';
import { LearningProgram } from '../models/LearningProgram';
import { Workshop, Mentorship } from '../models/Workshop';
import { Partner } from '../models/Partner';
import { Notification } from '../models/Notification';
import { Portfolio } from '../models/Portfolio';
import { FacultyOpportunity } from '../models/FacultyOpportunity';
import { AuditLog } from '../models/AuditLog';
import { Meeting } from '../models/Meeting';

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set in environment variables');
    }

    console.log('[Seed] Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('[Seed] Connected to Atlas. Purging legacy mockups, dummy users, and fake records...');

    const modelsToClean = [
      User,
      Skill,
      Question,
      SkillProfile,
      Opportunity,
      Application,
      LearningProgram,
      Workshop,
      Mentorship,
      Partner,
      Notification,
      Portfolio,
      FacultyOpportunity,
      AuditLog,
      Meeting,
      AssessmentAttempt,
    ];

    for (const model of modelsToClean) {
      await (model as any).deleteMany({});
    }
    console.log('[Seed] Database completely cleansed of all mockups and dummy applicants.');

    // 1. Seed Pre-configured Administrator via Environment Bootstrap
    const crypto = await import('crypto');
    const adminEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@nodalconnector.in').toLowerCase().trim();
    const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    const isGeneratedPassword = !process.env.BOOTSTRAP_ADMIN_PASSWORD && !process.env.ADMIN_PASSWORD;

    console.log(`[Seed] Initializing System Administrator (${adminEmail})...`);
    await User.create({
      name: 'System Administrator',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      institution: 'NodalConnector National Directorate',
      department: 'Platform Administration & Security',
      designation: 'Lead Administrator',
      location: 'New Delhi, India',
      bio: 'Administrator account for NodalConnector National Collaboration and Competency Mapping Portal.',
      isEmailVerified: true,
      verified: true,
      requiresPasswordReset: true,
    });

    // 2. Only Administrator account is retained per specification. All other collections remain clean.
    console.log('[Seed] All other collections (Opportunities, Applications, Questions, Partners) left pristine for real data.');

    // 3. System Audit Log
    console.log('[Seed] Recording System Initialization Audit Log...');
    await AuditLog.create({
      userEmail: adminEmail,
      userRole: 'admin',
      action: 'SYSTEM_INITIALIZATION',
      entity: 'System',
      status: 'SUCCESS',
      details: {
        platform: 'NodalConnector National Portal',
        version: '2.0.0-clean',
        environment: process.env.NODE_ENV || 'development',
        adminAccount: adminEmail,
        requiresPasswordReset: true,
      },
    });

    console.log('------------------------------------------------------------');
    console.log(' [SUCCESS] Database clean & re-seed completed successfully!');
    console.log(' -> All fake mockups, dummy students, & applications deleted.');
    console.log(` -> Admin Account initialized: ${adminEmail}`);
    if (isGeneratedPassword) {
      console.log(' -> Temporary bootstrap password generated. (Please set ADMIN_PASSWORD in your .env or reset via OTP).');
    } else {
      console.log(' -> Configured with custom password from environment variables.');
    }
    console.log(' -> Password reset flag (requiresPasswordReset) set to TRUE for security.');
    console.log('------------------------------------------------------------');

    process.exit(0);
  } catch (err: any) {
    console.error('[Seed Error] Failed to seed database:', err.message);
    process.exit(1);
  }
};

seedDatabase();
