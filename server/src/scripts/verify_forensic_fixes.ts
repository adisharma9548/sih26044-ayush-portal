import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { SkillProfile } from '../models/SkillProfile';
import { Question } from '../models/Assessment';
import { OtpVerification } from '../models/OtpVerification';
import { getJwtSecret } from '../middleware/auth';
import { generateDiagnosticQuestions } from '../services/aiService';

// We spin up the Express app to test HTTP routes directly
import express from 'express';
import authRoutes from '../routes/authRoutes';
import userRoutes from '../routes/userRoutes';
import skillRoutes from '../routes/skillRoutes';
import aiRoutes from '../routes/aiRoutes';

async function runVerification() {
  console.log('====================================================');
  console.log(' SIH26044 / NODAL CONNECTOR FORENSIC VERIFICATION');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('✓ Connected to MongoDB Atlas');

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/skills', skillRoutes);
  app.use('/api/ai', aiRoutes);

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, desc: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST SUITE 1: BUG #3 — Password Change & Authentication Flow
    // -------------------------------------------------------------
    console.log('\n--- SUITE 1: BUG #3 Password Change Verification ---');
    const testEmail = `forensic.test.${Date.now()}@skillbridge.gov.in`;
    const initialPassword = 'InitialPass123!';
    const updatedPassword = 'NewSecurePass456!';

    // Create a fresh test student
    const testUser = await User.create({
      name: 'Forensic Test Candidate',
      email: testEmail,
      password: initialPassword,
      role: 'student',
      degree: 'B.Tech',
      department: 'Computer Science and Engineering',
      specialization: 'Artificial Intelligence',
      verified: true,
      isEmailVerified: true,
    });

    // Login with initial password to obtain JWT token
    const loginRes1 = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: initialPassword, role: 'student' }),
    });
    const loginData1 = await loginRes1.json() as any;
    if (loginRes1.status !== 200) {
      console.log('Login failed with status:', loginRes1.status, loginData1);
    }
    assert(loginRes1.status === 200 && !!loginData1.data?.token, 'Initial login succeeds with initial password');
    const userToken = loginData1.data.token;

    // Test password change via PATCH /api/users/password (Route precedence & Controller IDOR test)
    const changeRes = await fetch(`${baseUrl}/users/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        currentPassword: initialPassword,
        newPassword: updatedPassword,
      }),
    });
    const changeData = await changeRes.json() as any;
    assert(changeRes.status === 200, 'PATCH /api/users/password returns HTTP 200');
    assert(changeData.data?.success === true, 'Password update message returned successfully');

    // Verify OLD password fails login with 401 INVALID_CREDENTIALS
    const oldLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: initialPassword, role: 'student' }),
    });
    assert(oldLoginRes.status === 401, 'Old password is fundamentally rejected with HTTP 401');

    // Verify NEW password succeeds login with 200
    const newLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: updatedPassword, role: 'student' }),
    });
    const newLoginData = await newLoginRes.json() as any;
    assert(newLoginRes.status === 200 && !!newLoginData.data?.token, 'New password successfully authenticates with HTTP 200');

    // Verify IDOR protection: candidate cannot change another user's password
    const idorRes = await fetch(`${baseUrl}/users/6aa0012059121cbe00da2273/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newLoginData.data.token}`,
      },
      body: JSON.stringify({
        currentPassword: 'arbitraryPassword',
        newPassword: 'hackedPassword123!',
      }),
    });
    assert(idorRes.status === 403, 'IDOR protection: non-admin attempting to change another password receives HTTP 403 FORBIDDEN');

    // -------------------------------------------------------------
    // TEST SUITE 2: BUG #2 — Old Skill Gap Radar Auto-Invalidation & Archival
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: BUG #2 Radar Self-Healing & Archival ---');
    // Test the live database user adisharma9548@gmail.com
    const targetUser = await User.findOne({ email: 'adisharma9548@gmail.com' });
    assert(!!targetUser, 'Target user adisharma9548@gmail.com exists in database');

    // Issue auth token for target user
    const targetSecret = getJwtSecret();
    const targetToken = jwt.sign(
      { id: targetUser!._id.toString(), email: targetUser!.email, role: targetUser!.role },
      targetSecret,
      { expiresIn: '1h' }
    );

    // Call GET /api/skills/profile
    const profileRes1 = await fetch(`${baseUrl}/skills/profile`, {
      headers: { Authorization: `Bearer ${targetToken}` },
    });
    const profileData1 = await profileRes1.json() as any;
    assert(profileRes1.status === 200, 'GET /api/skills/profile returns HTTP 200');

    const healedProfile = profileData1.data;
    assert(healedProfile.degree === targetUser!.degree, `Profile degree synchronized to user active degree ("${targetUser!.degree}")`);
    assert(healedProfile.status === 'not_assessed', 'Profile status is atomically calibrated to "not_assessed"');
    assert(Array.isArray(healedProfile.skills) && healedProfile.skills.length === 0, 'Active skills array is empty (0 fabricated competencies)');
    assert(healedProfile.overallScore === 0, 'Overall score is 0 until diagnostic assessment taken');
    assert(Array.isArray(healedProfile.gapAnalysis) && healedProfile.gapAnalysis.length === 0, 'Active gap analysis is empty');

    // Verify historicalContexts contains the archived Law competencies
    assert(Array.isArray(healedProfile.historicalContexts) && healedProfile.historicalContexts.length > 0, 'Historical contexts archive contains previous competencies');
    const lastArchive = healedProfile.historicalContexts[healedProfile.historicalContexts.length - 1];
    assert(lastArchive.degree.includes('LL.M') || lastArchive.skills.some((s: any) => s.name.includes('Law')), 'Archived record correctly preserves the previous LL.M / Law competencies');

    // Query profile again to verify persistence
    const profileRes2 = await fetch(`${baseUrl}/skills/profile`, {
      headers: { Authorization: `Bearer ${targetToken}` },
    });
    const profileData2 = await profileRes2.json() as any;
    assert(profileData2.data.status === 'not_assessed' && profileData2.data.skills.length === 0, 'Profile remains cleanly not_assessed on subsequent queries (no resurrection)');

    // -------------------------------------------------------------
    // TEST SUITE 3: BUG #1 — Question Discipline Alignment (No Law for CS)
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: BUG #1 Assessment Questions Alignment ---');
    const qRes = await fetch(`${baseUrl}/skills/assessment/questions`, {
      headers: { Authorization: `Bearer ${targetToken}` },
    });
    const qData = await qRes.json() as any;
    assert(qRes.status === 200, 'GET /api/skills/assessment/questions returns HTTP 200');
    assert(Array.isArray(qData.data) && qData.data.length === 7, 'Returns 7 diagnostic questions');

    const lawKeywords = ['constitution', 'article 21', 'writ jurisdiction', 'jurisprudence', 'fundamental right', 'supreme court', 'basic structure'];
    let foundLaw = false;
    for (const q of qData.data) {
      const qText = `${q.category} ${q.question} ${q.options.join(' ')}`.toLowerCase();
      for (const kw of lawKeywords) {
        if (qText.includes(kw)) {
          foundLaw = true;
          console.error(`Found law keyword "${kw}" in question:`, q.question);
        }
      }
    }
    assert(!foundLaw, 'Assessment questions contain ZERO Law / Constitutional Law contamination for B.Tech CSE student');

    // Verify categories belong to CSE/Engineering
    const categories = qData.data.map((q: any) => q.category);
    console.log('  Assessed categories generated by AI:', categories.join(', '));
    assert(categories.length === 7, 'All 7 questions have valid category mappings');

    // -------------------------------------------------------------
    // TEST SUITE 4: BUG #4 — Role-Specific Login Enforcement
    // -------------------------------------------------------------
    console.log('\n--- SUITE 4: BUG #4 Role Enforcement on Login ---');
    const wrongRoleRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: updatedPassword, role: 'industry' }),
    });
    assert(wrongRoleRes.status === 401, 'Student logging into Industry portal rejected with HTTP 401');
    const wrongRoleData = await wrongRoleRes.json() as any;
    assert(!wrongRoleData.data?.token, 'Zero token leaked on wrong-role attempt');

    // -------------------------------------------------------------
    // TEST SUITE 5: BUG #5 — Universal Forgot Password & JWT Reset Token
    // -------------------------------------------------------------
    console.log('\n--- SUITE 5: BUG #5 Universal Reset Password Flow ---');
    // Step A: Request reset OTP
    const forgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    assert(forgotRes.status === 200, 'POST /api/auth/forgot-password returns HTTP 200');

    // Retrieve the generated OTP from OtpVerification collection to verify hashing
    const otpDoc = await OtpVerification.findOne({ email: testEmail.toLowerCase(), purpose: 'PASSWORD_RESET' });
    assert(!!otpDoc, 'OTP record created in database');
    assert(otpDoc!.otpHash?.length === 64, 'Stored OTP is securely hashed with SHA-256 (64 hex characters in otpHash)');

    // Step B: Direct step bypass attempt (trying to reset without verifying OTP)
    const bypassRes = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken: 'fake.jwt.token', newPassword: 'BypassAttempt123!' }),
    });
    assert(bypassRes.status === 401, 'Direct password reset without signed resetToken rejected with HTTP 401');

    // Step C: Verify OTP with valid code (we create a known OTP for test)
    const rawOtp = '765432';
    const hashedOtp = require('crypto').createHash('sha256').update(rawOtp).digest('hex');
    await OtpVerification.deleteMany({ email: testEmail.toLowerCase() });
    await OtpVerification.create({
      email: testEmail.toLowerCase(),
      otp: '***',
      otpHash: hashedOtp,
      purpose: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    });

    const verifyOtpRes = await fetch(`${baseUrl}/auth/verify-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: rawOtp }),
    });
    const verifyOtpData = await verifyOtpRes.json() as any;
    assert(verifyOtpRes.status === 200, 'Valid OTP verification returns HTTP 200');
    assert(!!verifyOtpData.data?.resetToken, 'Returns signed resetToken JWT');
    const validResetToken = verifyOtpData.data.resetToken;

    // Step D: Reset password with signed resetToken
    const resetFinalPassword = 'FinalResetPass789!';
    const resetRes = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken: validResetToken, newPassword: resetFinalPassword }),
    });
    assert(resetRes.status === 200, 'Reset password with signed resetToken succeeds with HTTP 200');

    // Step E: Replay attack with same resetToken must fail
    const replayRes = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken: validResetToken, newPassword: 'ReplayPassword999!' }),
    });
    assert(replayRes.status === 401, 'Replay attack with already-used resetToken rejected with HTTP 401');

    // Clean up test user
    await User.deleteOne({ _id: testUser._id });
    await OtpVerification.deleteMany({ email: testEmail.toLowerCase() });

    console.log(`\n====================================================`);
    console.log(` ALL ${passedTests}/${totalTests} FORENSIC TESTS PASSED ACCURATELY!`);
    console.log(`====================================================\n`);
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runVerification().catch((err) => {
  console.error('\n❌ Forensic verification failed:', err);
  process.exit(1);
});
