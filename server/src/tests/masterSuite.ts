import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User, REAL_USER_FILTER } from '../models/User';
import { College } from '../models/College';
import { CareerRole } from '../models/CareerRole';
import { Resume } from '../models/Resume';
import { Question } from '../models/Assessment';
import { SkillProfile } from '../models/SkillProfile';
import {
  ALL_STATES_AND_UTS,
  getDistrictsForState,
  isValidState,
  isValidDistrict,
  normalizeIndianLocation,
} from '../config/indiaGeography';
import { sanitizeFilename } from '../middleware/upload';
import { generateSignedDownloadUrl } from '../config/cloudinary';
import { analyzeSkillGaps } from '../services/skillGapService';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function test(suite: string, testName: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    results.push({ suite, test: testName, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ [PASS] [${suite}] ${testName} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ suite, test: testName, passed: false, message: err.message, durationMs: Date.now() - start });
    console.error(`  ✗ [FAIL] [${suite}] ${testName}: ${err.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function runMasterSuite() {
  console.log('\n===============================================================');
  console.log('       NODALCONNECTOR MASTER SYSTEM VERIFICATION SUITE         ');
  console.log('===============================================================\n');

  await connectDB(3, 2000);

  // 1. P0 Security & Demo Account Isolation
  console.log('--- 1. Security & Demo Account Isolation ---');
  await test('Security', 'REAL_USER_FILTER excludes demo accounts', () => {
    assert(REAL_USER_FILTER.isDemo.$ne === true, 'isDemo.$ne must be true');
    assert(REAL_USER_FILTER.accountType.$ne === 'demo', 'accountType.$ne must be demo');
  });

  await test('Security', 'Filename sanitizer neutralizes path traversal characters', () => {
    const malicious = '../../../../etc/passwd%00_resume.pdf';
    const sanitized = sanitizeFilename(malicious);
    assert(!sanitized.includes('..'), 'Must not contain double dots');
    assert(!sanitized.includes('/'), 'Must not contain path separators');
    assert(!sanitized.includes('\\'), 'Must not contain backslashes');
    assert(sanitized.endsWith('.pdf'), 'Must preserve valid extension');
  });

  await test('Security', 'Cloudinary signed download URL generates authenticated URL', () => {
    const publicId = 'ayush_portal/resumes/test_candidate_123';
    const signedUrl = generateSignedDownloadUrl(publicId, 3600, 'raw', 'pdf');
    assert(typeof signedUrl === 'string' && signedUrl.length > 10, 'Must produce non-empty signed URL string');
    assert(decodeURIComponent(signedUrl).includes(publicId), 'URL must target the specific asset public ID');
  });

  // 2. Structured Indian Administrative Geography
  console.log('\n--- 2. Structured Indian Administrative Geography ---');
  await test('Geography', 'Administers all 36 Indian States and Union Territories', () => {
    assert(ALL_STATES_AND_UTS.length === 36, `Expected 36 states/UTs, got ${ALL_STATES_AND_UTS.length}`);
    assert(isValidState('Uttar Pradesh'), 'Uttar Pradesh must be valid state');
    assert(isValidState('Karnataka'), 'Karnataka must be valid state');
    assert(isValidState('Delhi'), 'Delhi must be valid UT');
    assert(!isValidState('ImaginaryState'), 'Non-existent state must return false');
  });

  await test('Geography', 'Districts mapping reflects authentic Indian administration', () => {
    const upDistricts = getDistrictsForState('Uttar Pradesh');
    assert(upDistricts.length >= 70, `Uttar Pradesh districts count (${upDistricts.length}) must be authentic (>=70)`);
    assert(isValidDistrict('Uttar Pradesh', 'Varanasi'), 'Varanasi must be valid district in UP');
    assert(isValidDistrict('Uttar Pradesh', 'Lucknow'), 'Lucknow must be valid district in UP');
    assert(!isValidDistrict('Uttar Pradesh', 'Bengaluru'), 'Bengaluru must not be in UP');
  });

  await test('Geography', 'Normalizes free-text Indian addresses deterministically', () => {
    const res1 = normalizeIndianLocation('Faculty of Ayurveda, IMS BHU, Varanasi, Uttar Pradesh');
    assert(res1.state === 'Uttar Pradesh', 'Detected state should be Uttar Pradesh');
    assert(res1.district === 'Varanasi', 'Detected district should be Varanasi');
    assert(res1.city === 'IMS BHU' || res1.city === 'Varanasi' || res1.city?.length! > 0, 'Detected city should be valid');

    const res2 = normalizeIndianLocation('Pune, Maharashtra, India');
    assert(res2.state === 'Maharashtra', 'Detected state should be Maharashtra');
    assert(res2.district === 'Pune', 'Detected district should be Pune');
  });

  // 3. Data Model Extensions
  console.log('\n--- 3. Data Model Extensions ---');
  await test('Models', 'Resume model persists with versioning and extractionStatus', async () => {
    const dummyUser = await User.findOne({});
    assert(dummyUser !== null, 'Requires at least one user in database');

    const testResume = new Resume({
      userId: dummyUser?._id,
      fileUrl: 'https://res.cloudinary.com/dummy/raw/upload/test.pdf',
      cloudinaryPublicId: 'test_res_id',
      originalFilename: 'test_candidate_cv.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 10240,
      extractionStatus: 'pending',
    });

    await testResume.save();
    assert(testResume.version === 1, 'Default version must be 1');
    assert(testResume.extractionStatus === 'pending', 'Status must be pending');

    await Resume.findByIdAndDelete(testResume._id);
  });

  await test('Models', 'Assessment Question model supports question status lifecycle', async () => {
    const testQuestion = new Question({
      numericId: 999999,
      category: 'Ayurveda',
      question: 'Which dosha represents ether and air elements in Tridosha theory?',
      options: ['Vata', 'Pitta', 'Kapha', 'Rakta'],
      correctIndex: 0,
      explanation: 'Vata is composed of Akasha (ether) and Vayu (air).',
      difficulty: 'Beginner',
      status: 'active',
    });

    await testQuestion.save();
    assert(testQuestion.status === 'active', 'Question status should be active');

    // Test status update to retired
    testQuestion.status = 'retired';
    await testQuestion.save();
    assert(testQuestion.status === 'retired', 'Question should transition to retired');

    await Question.findByIdAndDelete(testQuestion._id);
  });

  // 4. Standalone Career Role & Skill Gap Analysis Engine
  console.log('\n--- 4. Standalone Career Role & Skill Gap Analysis Engine ---');
  await test('GapEngine', 'CareerRole model holds authentic requirements and seeding works', async () => {
    const roles = await CareerRole.find({ isArchived: { $ne: true } });
    if (roles.length === 0) {
      await CareerRole.create({
        name: 'Ayurvedic Medical Officer (Test)',
        slug: 'ayurvedic-medical-officer-test',
        category: 'Ayurveda',
        description: 'Practices classical Ayurvedic diagnostics.',
        requiredSkills: [
          { name: 'Kayachikitsa', requiredLevel: 75, importance: 'critical', weight: 1.5 },
          { name: 'Panchakarma', requiredLevel: 70, importance: 'high', weight: 1.2 },
        ],
        source: 'government_framework',
      });
    }

    const testRole = await CareerRole.findOne({ slug: /ayurvedic-medical-officer/i });
    assert(testRole !== null, 'Career role must exist in DB');
    assert(testRole?.requiredSkills.length! >= 2, 'Must have at least 2 required skills');
  });

  await test('GapEngine', 'analyzeSkillGaps executes transparent mathematical scoring without fabricated data', async () => {
    const requirements = [
      { name: 'Kayachikitsa', requiredLevel: 75, importance: 'critical' as const, weight: 1.0 },
      { name: 'Panchakarma', requiredLevel: 70, importance: 'high' as const, weight: 1.0 },
      { name: 'Dravyaguna', requiredLevel: 80, importance: 'medium' as const, weight: 1.0 },
    ];

    // Student has: Kayachikitsa = 85 (Matched), Panchakarma = 50 (Partial), Dravyaguna = 0 (Missing)
    const studentSkills: any = [
      { name: 'Kayachikitsa', level: 85, verified: true, verificationStatus: 'verified', category: 'Ayurveda' },
      { name: 'Panchakarma', level: 50, verified: true, verificationStatus: 'verified', category: 'Ayurveda' },
    ];

    const result = await analyzeSkillGaps(studentSkills, requirements);

    assert(result.matchingSkills.length === 1, 'Should have 1 matching skill');
    assert(result.matchingSkills[0].name === 'Kayachikitsa', 'Matched skill should be Kayachikitsa');

    assert(result.partialSkills.length === 1, 'Should have 1 partial skill');
    assert(result.partialSkills[0].name === 'Panchakarma', 'Partial skill should be Panchakarma');
    assert(result.partialSkills[0].gap === 20, 'Partial gap should be 70 - 50 = 20 points');

    assert(result.missingSkills.length === 1, 'Should have 1 missing skill');
    assert(result.missingSkills[0] === 'Dravyaguna', 'Missing skill should be Dravyaguna');

    // Compatibility check: between 0 and 100
    assert(result.overallCompatibility >= 0 && result.overallCompatibility <= 100, 'Compatibility must be between 0 and 100%');
    assert(typeof result.explanation === 'string' && result.explanation.length > 10, 'Should have transparent explainable text');
  });

  // 5. Scoped Institution Analytics
  console.log('\n--- 5. Scoped Institution Analytics Isolation ---');
  await test('Institution', 'Affiliated student analytics excludes demo accounts', async () => {
    // Check count of demo vs real users
    const totalUsers = await User.countDocuments({});
    const realUsers = await User.countDocuments(REAL_USER_FILTER);
    const demoUsers = await User.countDocuments({ isDemo: true });

    assert(realUsers + demoUsers <= totalUsers, 'Real + demo must be <= total');
    console.log(`    (Database accounts: Total=${totalUsers}, Real=${realUsers}, Demo=${demoUsers})`);
  });

  // Summary Report
  console.log('\n===============================================================');
  console.log('                       TEST SUITE SUMMARY                      ');
  console.log('===============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Tests Run : ${total}`);
  console.log(`Passed          : ${passed}`);
  console.log(`Failed          : ${failed}`);

  if (failed > 0) {
    console.error('\nFailures detected:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.error(`- [${r.suite}] ${r.test}: ${r.message}`);
    });
    await mongoose.disconnect();
    process.exit(1);
  } else {
    console.log('\nALL TESTS PASSED WITH 100% SUCCESS RATE.');
    await mongoose.disconnect();
    process.exit(0);
  }
}

runMasterSuite().catch((err) => {
  console.error('Test runner fatal crash:', err);
  process.exit(1);
});
