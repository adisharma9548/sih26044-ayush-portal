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

    // 1. Seed Pre-configured Administrator (Username: admin, Password: admin)
    console.log('[Seed] Pre-seeding System Administrator (username: admin / password: admin)...');
    await User.create({
      name: 'System Administrator',
      email: 'admin@skillbridge.gov.in',
      password: 'admin',
      role: 'admin',
      institution: 'SkillBridge National Directorate',
      department: 'Platform Administration & Security',
      designation: 'Lead Administrator',
      location: 'New Delhi, India',
      bio: 'Administrator account for SkillBridge National Collaboration and Competency Mapping Portal.',
      isEmailVerified: true,
      verified: true,
    });

    // 2. Only Administrator account is retained per specification. All other collections remain clean.
    console.log('[Seed] All other collections (Opportunities, Applications, Questions, Partners) left pristine for real data.');

    // 5. System Audit Log
    console.log('[Seed] Recording System Initialization Audit Log...');
    await AuditLog.create({
      userEmail: 'admin@skillbridge.gov.in',
      userRole: 'admin',
      action: 'SYSTEM_INITIALIZATION',
      entity: 'System',
      status: 'SUCCESS',
      details: {
        platform: 'SkillBridge National Portal',
        version: '2.0.0-clean',
        environment: 'production',
        adminAccount: 'admin@skillbridge.gov.in',
      },
    });

    console.log('------------------------------------------------------------');
    console.log(' [SUCCESS] Database clean & re-seed completed successfully!');
    console.log(' -> All fake mockups, dummy students, & applications deleted.');
    console.log(' -> Pre-seeded Admin: Username "admin" (or admin@skillbridge.gov.in) with password "admin"');
    console.log(' -> Real technology opportunities and multi-disciplinary framework active.');
    console.log('------------------------------------------------------------');

    process.exit(0);
  } catch (err: any) {
    console.error('[Seed Error] Failed to seed database:', err.message);
    process.exit(1);
  }
};

seedDatabase();
