import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { College } from '../models/College';
import { normalizeIndianLocation } from '../config/indiaGeography';

const DEMO_EMAILS = [
  'student.demo@nodalconnector.in',
  'industry.demo@nodalconnector.in',
  'academia.demo@nodalconnector.in',
];

async function runMigration() {
  console.log('[Migration] Starting user geography, demo flag, and college linking migration...');
  await connectDB(3, 2000);

  const users = await User.find({});
  console.log(`[Migration] Found ${users.length} total users to inspect.`);

  let demoCount = 0;
  let realCount = 0;
  let geographyUpdated = 0;
  let collegeLinked = 0;

  for (const user of users) {
    let changed = false;

    // 1. Account type & demo flag
    const isDemoEmail = DEMO_EMAILS.includes(user.email.toLowerCase()) || user.email.toLowerCase().includes('demo');
    if (isDemoEmail) {
      if (!user.isDemo || user.accountType !== 'demo') {
        user.isDemo = true;
        user.accountType = 'demo';
        changed = true;
        demoCount++;
      }
    } else {
      if (user.isDemo === undefined || user.isDemo === null || !user.accountType) {
        user.isDemo = false;
        user.accountType = 'real';
        changed = true;
        realCount++;
      }
    }

    // 2. Structured geography migration
    const anyUser = user as any;
    if (!user.locationStructured || (!user.locationStructured.state && !user.locationStructured.city)) {
      const rawLocation = user.location || anyUser.state || anyUser.city || '';
      if (rawLocation) {
        const normalized = normalizeIndianLocation(rawLocation);
        user.locationStructured = {
          state: normalized.state || anyUser.state || '',
          district: normalized.district || anyUser.district || '',
          city: normalized.city || anyUser.city || '',
          country: 'India',
          village: '',
          rawInput: rawLocation,
          source: 'user_entered',
        };
        changed = true;
        geographyUpdated++;
      }
    }

    // 3. College reference linking
    if (!user.collegeId && (user.institution || (user as any).college)) {
      const collegeName = (user.institution || (user as any).college || '').trim();
      if (collegeName) {
        const matchedCollege = await College.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${collegeName}$`, 'i') } },
            { slug: collegeName.toLowerCase().replace(/[^a-z0-9]/g, '-') },
          ],
        });
        if (matchedCollege) {
          user.collegeId = matchedCollege._id as any;
          changed = true;
          collegeLinked++;
        }
      }
    }

    if (changed) {
      await user.save();
    }
  }

  console.log('[Migration Complete] Summary:');
  console.log(`- Flagged as Demo: ${demoCount}`);
  console.log(`- Confirmed as Real: ${realCount}`);
  console.log(`- Structured Geography Updated: ${geographyUpdated}`);
  console.log(`- Colleges Linked: ${collegeLinked}`);

  await mongoose.disconnect();
  console.log('[Migration] Disconnected from DB.');
}

runMigration().catch((err) => {
  console.error('[Migration Error]', err);
  process.exit(1);
});
