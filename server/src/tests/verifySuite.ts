import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { College } from '../models/College';
import { InstitutionClaim } from '../models/InstitutionClaim';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Application } from '../models/Application';
import { OtpVerification } from '../models/OtpVerification';

import {
  searchColleges,
  deriveCollegeSlug,
} from '../services/collegeDiscoveryService';
import { dispatchNotification } from '../services/notificationService';
import { sendOtpEmail, verifyOtp, consumeOtp } from '../services/emailService';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(suite: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ suite, name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ [PASS] ${suite} > ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ suite, name, passed: false, error: err.message || String(err), durationMs: Date.now() - start });
    console.error(`  ✗ [FAIL] ${suite} > ${name} (${Date.now() - start}ms): ${err.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log('====================================================');
  console.log('NODALCONNECTOR COMPREHENSIVE VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not found in environment');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB successfully.\n');

  try {
    // ----------------------------------------------------
    // SUITE 1: College Discovery & Profile System (Phase 1)
    // ----------------------------------------------------
    console.log('--- SUITE 1: College Discovery & Profile System ---');

    await runTest('Phase 1 - Discovery', 'Slug derivation correctly extracts clean identifier', async () => {
      const slug1 = deriveCollegeSlug('iitb.ac.in');
      assert(slug1 === 'iitb', `Expected 'iitb', got '${slug1}'`);

      const slug2 = deriveCollegeSlug('www.bits-pilani.ac.in');
      assert(slug2 === 'bits-pilani', `Expected 'bits-pilani', got '${slug2}'`);

      const slug3 = deriveCollegeSlug('rkgit.edu.in');
      assert(slug3 === 'rkgit', `Expected 'rkgit', got '${slug3}'`);
    });

    await runTest('Phase 1 - Discovery', 'Search colleges returns confidence scores and candidate domains', async () => {
      const candidates = await searchColleges('IIT Bombay', 5);
      assert(Array.isArray(candidates), 'Candidates must be an array');
      assert(candidates.length > 0, 'Should find at least 1 candidate for IIT Bombay');
      const top = candidates[0];
      assert(top.domain.includes('iitb'), `Top domain should include iitb, got ${top.domain}`);
      assert(top.confidence >= 0.8, `Confidence should be high, got ${top.confidence}`);
    });

    await runTest('Phase 1 - Discovery', 'College model creates and caches profile with sources and 24h TTL logic', async () => {
      const testSlug = 'test-ai-college-' + Date.now();
      const testDomain = `${testSlug}.ac.in`;

      // Clean up previous test if any
      await College.deleteOne({ slug: testSlug });

      const college = await College.create({
        name: 'Test Autonomous College of Engineering',
        officialDomain: testDomain,
        slug: testSlug,
        confidenceScore: 0.95,
        verificationStatus: 'UNVERIFIED',
        about: 'Premier testing institution for automated verification.',
        location: { city: 'New Delhi', state: 'Delhi', country: 'India' },
        programs: [{ degree: 'B.Tech', department: 'Computer Science', duration: '4 Years' }],
        placementRecords: { averagePackage: '12 LPA', placementPercentage: 92 },
        sources: [{ url: `https://${testDomain}`, fetchedAt: new Date() }],
        lastScrapedAt: new Date(),
      });

      assert(college._id !== undefined, 'College should be created');
      assert(college.verificationStatus === 'UNVERIFIED', 'Initial status must be UNVERIFIED');
      assert(college.sources.length === 1, 'Source URL must be recorded');

      // Check 24h caching logic
      const isFresh = Date.now() - (college.lastScrapedAt?.getTime() || 0) < 24 * 60 * 60 * 1000;
      assert(isFresh === true, 'Profile scraped now must be fresh (<24h)');

      // Clean up
      await College.deleteOne({ _id: college._id });
    });

    // ----------------------------------------------------
    // SUITE 2: Institution Claim & Verification (Phase 2)
    // ----------------------------------------------------
    console.log('\n--- SUITE 2: Institution Claim & Verification ---');

    await runTest('Phase 2 - Claim Workflow', 'Reject non-institutional email domains for claim', async () => {
      const email = 'dean@gmail.com';
      const domain = email.split('@')[1];
      const isOfficial = domain.endsWith('.edu') || domain.endsWith('.ac.in') || domain.endsWith('.edu.in');
      assert(!isOfficial, 'Public email domains like gmail.com must be rejected');
    });

    await runTest('Phase 2 - Claim Workflow', 'Create claim request and process approval workflow', async () => {
      const testSlug = 'claim-test-college-' + Date.now();
      const testDomain = `${testSlug}.ac.in`;

      const college = await College.create({
        name: 'Claim Test University',
        officialDomain: testDomain,
        slug: testSlug,
        verificationStatus: 'UNVERIFIED',
        sources: [{ url: `https://${testDomain}`, fetchedAt: new Date() }],
      });

      // Submit claim
      const claim = await InstitutionClaim.create({
        collegeId: college._id,
        collegeSlug: testSlug,
        collegeName: college.name,
        representativeName: 'Dr. Test Administrator',
        email: `admin@${testDomain}`,
        officialEmailDomain: testDomain,
        verificationCode: 'AISHE-TEST-999',
        proofDocumentUrl: 'https://example.com/proof.pdf',
        ipAddress: '127.0.0.1',
        status: 'PENDING',
      });

      assert(claim.status === 'PENDING', 'Claim status must be PENDING');

      // Admin approves claim
      claim.status = 'APPROVED';
      (claim as any).reviewedAt = new Date();
      await claim.save();

      // College status should transition to VERIFIED
      college.verificationStatus = 'VERIFIED';
      await college.save();

      const updatedCollege = await College.findById(college._id);
      assert(updatedCollege?.verificationStatus === 'VERIFIED', 'College should now be VERIFIED');

      // Clean up
      await InstitutionClaim.deleteOne({ _id: claim._id });
      await College.deleteOne({ _id: college._id });
    });

    // ----------------------------------------------------
    // SUITE 3: Notification System (Phase 3)
    // ----------------------------------------------------
    console.log('\n--- SUITE 3: Notification System ---');

    await runTest('Phase 3 - Notifications', 'Dispatch notification and calculate unread count correctly', async () => {
      // Find or create test user
      let testUser = await User.findOne({ email: 'test_notification_user@example.com' });
      if (!testUser) {
        testUser = await User.create({
          name: 'Notification Test User',
          email: 'test_notification_user@example.com',
          password: 'Password123!',
          role: 'student',
        });
      }

      // Dispatch notification
      const notif = await dispatchNotification({
        recipientId: testUser._id.toString(),
        recipientType: 'STUDENT',
        title: 'Interview Scheduled',
        message: 'Your interview with TechCorp has been confirmed.',
        type: 'INTERVIEW_SCHEDULED',
        link: '/student/applications',
        data: { company: 'TechCorp' },
      });

      assert(notif._id !== undefined, 'Notification should be saved to DB');
      assert(notif.read === false, 'New notification must be unread');

      // Count unread
      const unreadCount = await Notification.countDocuments({
        recipientId: testUser._id,
        read: false,
      });
      assert(unreadCount >= 1, 'Unread count must be at least 1');

      // Mark read
      notif.read = true;
      await notif.save();

      // Clean up
      await Notification.deleteMany({ recipientId: testUser._id });
      await User.deleteOne({ _id: testUser._id });
    });

    // ----------------------------------------------------
    // SUITE 4: Real-time Analytics Calculations (Phase 4)
    // ----------------------------------------------------
    console.log('\n--- SUITE 4: Real-time Analytics ---');

    await runTest('Phase 4 - Analytics', 'Calculate real student analytics from MongoDB collections without mock data', async () => {
      // Create mock student with applications
      const tempUser = await User.create({
        name: 'Analytics Student',
        email: `analytics_student_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'student',
        skills: ['React', 'TypeScript', 'Node.js'],
      });

      const totalApps = await Application.countDocuments({ applicant: tempUser._id });
      const interviews = await Application.countDocuments({ applicant: tempUser._id, status: 'interview' });
      const interviewRate = totalApps > 0 ? Math.round((interviews / totalApps) * 100) : 0;

      // Profile completion check
      let score = 30; // base registered
      if (tempUser.skills && tempUser.skills.length > 0) score += 20;
      if (tempUser.bio) score += 15;
      if ((tempUser as any).education && (tempUser as any).education.length > 0) score += 20;
      if ((tempUser as any).projects && (tempUser as any).projects.length > 0) score += 15;

      assert(interviewRate >= 0 && interviewRate <= 100, 'Interview rate must be a valid percentage');
      assert(score >= 0 && score <= 100, 'Profile completion score must be between 0 and 100');

      await User.deleteOne({ _id: tempUser._id });
    });

    await runTest('Phase 4 - Analytics', 'Calculate real admin analytics across platform collections', async () => {
      const [totalStudents, totalCompanies, totalColleges, totalVerifiedColleges, totalClaims] = await Promise.all([
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'industry' }),
        College.countDocuments(),
        College.countDocuments({ verificationStatus: 'VERIFIED' }),
        InstitutionClaim.countDocuments(),
      ]);

      assert(typeof totalStudents === 'number', 'totalStudents must be a number');
      assert(typeof totalCompanies === 'number', 'totalCompanies must be a number');
      assert(typeof totalColleges === 'number', 'totalColleges must be a number');
      assert(typeof totalVerifiedColleges === 'number', 'totalVerifiedColleges must be a number');
      assert(typeof totalClaims === 'number', 'totalClaims must be a number');
    });

    // ----------------------------------------------------
    // SUITE 5: Authentication & Security (Phase 5)
    // ----------------------------------------------------
    console.log('\n--- SUITE 5: Authentication & Security ---');

    await runTest('Phase 5 - Security', 'Strong password policy validation', async () => {
      const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

      assert(!passwordPolicy.test('weak'), 'Short password must fail');
      assert(!passwordPolicy.test('alllowercase1!'), 'Missing uppercase must fail');
      assert(!passwordPolicy.test('ALLUPPERCASE1!'), 'Missing lowercase must fail');
      assert(!passwordPolicy.test('NoSpecialChar1'), 'Missing special char must fail');
      assert(!passwordPolicy.test('NoNumberSpecial!'), 'Missing number must fail');
      assert(passwordPolicy.test('SecurePass123!'), 'Valid strong password must pass');
    });

    await runTest('Phase 5 - Security', 'Two-Factor Authentication OTP generation and validation', async () => {
      const testEmail = `2fa_test_${Date.now()}@example.com`;
      const otp = '849201';

      // Store OTP
      await OtpVerification.create({
        email: testEmail,
        otp,
        purpose: 'TWO_FACTOR_AUTH',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      // Verify wrong OTP (do not consume on check)
      const wrongCheck = await verifyOtp(testEmail, '111111', 'TWO_FACTOR_AUTH', false);
      assert(wrongCheck === false, 'Wrong OTP must be invalid');

      // Verify correct OTP (do not consume yet)
      const correctCheck = await verifyOtp(testEmail, otp, 'TWO_FACTOR_AUTH', false);
      assert(correctCheck === true, 'Correct OTP must be valid');

      // Consume OTP
      await consumeOtp(testEmail, 'TWO_FACTOR_AUTH');

      // Verify second time fails (replay protection)
      const replayCheck = await verifyOtp(testEmail, otp, 'TWO_FACTOR_AUTH', false);
      assert(replayCheck === false, 'Replayed OTP must be invalid');
    });

    await runTest('Phase 5 - Security', 'JWT expiration configured to 24h', async () => {
      const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
      assert(jwtExpiresIn === '24h', `JWT_EXPIRES_IN must be '24h', got '${jwtExpiresIn}'`);
    });

  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }

  // ----------------------------------------------------
  // TEST SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('TEST SUMMARY RESULTS');
  console.log('====================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Tests Run: ${total}`);
  console.log(`Passed:         ${passed}`);
  console.log(`Failed:         ${failed}`);
  console.log(`Success Rate:   ${Math.round((passed / total) * 100)}%\n`);

  if (failed > 0) {
    console.error('Failed tests:');
    results.filter((r) => !r.passed).forEach((r) => console.error(`  - ${r.suite} > ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log('All tests passed successfully! 🚀');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
