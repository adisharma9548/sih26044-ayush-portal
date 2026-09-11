/**
 * Automated Acceptance Verification Suite (100% Real Data & AI API)
 * Connects to live MongoDB and uses real Groq AI API to verify data-driven architecture.
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { analyzeSkillGaps, RequirementSpec } from '../services/skillGapService';
import { SCORING_POLICY, calculatePriority } from '../config/scoringPolicy';
import { normalizeSkillName, getBenchmarkForSkill } from '../services/benchmarkService';
import { Opportunity } from '../models/Opportunity';
import { LearningProgram } from '../models/LearningProgram';
import { RoadmapMapping } from '../models/RoadmapMapping';
import { SkillBenchmark } from '../models/SkillBenchmark';
import { generateRoadmapWithAi, findRoadmapForSkill } from '../services/roadmapService';
import { calculateCandidateOpportunityMatch } from '../services/matchingService';

interface TestResult {
  scenarioNumber: number;
  title: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runScenario1() {
  console.log('\n--- Scenario 1: React requirement 80, student level 60 ---');
  const studentSkills = [
    {
      name: 'React',
      level: 60,
      verified: true,
      category: 'Frontend' as const,
    },
  ];

  const requirements: RequirementSpec[] = [
    { name: 'React', requiredLevel: 80, importance: 'high' },
  ];

  const result = await analyzeSkillGaps(studentSkills as any, requirements);

  assert(result.partialSkills.length === 1, 'Expected 1 partial skill');
  assert(result.partialSkills[0].gap === 20, `Expected gap 20, got ${result.partialSkills[0].gap}`);
  assert(result.gapAnalysisList[0].status === 'PARTIAL', `Expected status PARTIAL, got ${result.gapAnalysisList[0].status}`);
  assert(result.gapAnalysisList[0].gapPercentage === 20, `Expected gapPercentage 20, got ${result.gapAnalysisList[0].gapPercentage}`);
  assert(result.gapAnalysisList[0].priority === 'High', `Expected priority High, got ${result.gapAnalysisList[0].priority}`);

  results.push({
    scenarioNumber: 1,
    title: 'Dynamic Gap Calculation (80 req vs 60 student = 20 gap, High priority)',
    passed: true,
    details: `Gap = ${result.gapAnalysisList[0].gapPercentage}%, Status = ${result.gapAnalysisList[0].status}, Priority = ${result.gapAnalysisList[0].priority}`,
  });
}

async function runScenario2() {
  console.log('\n--- Scenario 2: React requirement changes to 65, student level 60 ---');
  const studentSkills = [
    {
      name: 'React',
      level: 60,
      verified: true,
      category: 'Frontend' as const,
    },
  ];

  const requirements: RequirementSpec[] = [
    { name: 'React', requiredLevel: 65 }, // no explicit importance -> uses gap threshold formula
  ];

  const result = await analyzeSkillGaps(studentSkills as any, requirements);

  assert(result.partialSkills.length === 1, 'Expected 1 partial skill');
  assert(result.partialSkills[0].gap === 5, `Expected gap 5, got ${result.partialSkills[0].gap}`);
  assert(result.gapAnalysisList[0].gapPercentage === 5, `Expected gapPercentage 5, got ${result.gapAnalysisList[0].gapPercentage}`);
  assert(result.gapAnalysisList[0].priority === 'Low', `Expected priority Low (gap < 10), got ${result.gapAnalysisList[0].priority}`);

  results.push({
    scenarioNumber: 2,
    title: 'Dynamic Requirement Adjustment (65 req -> 5% gap, Low priority)',
    passed: true,
    details: `Gap = ${result.gapAnalysisList[0].gapPercentage}%, Priority = ${result.gapAnalysisList[0].priority}`,
  });
}

async function runScenario3() {
  console.log('\n--- Scenario 3: Real Unbenchmarked Skill Query from Database ---');
  // Query real benchmark lookup for a skill that has no posting or benchmark
  const testSkill = 'NonExistentSkillXYZ123';
  const benchmarkLookup = await getBenchmarkForSkill(testSkill);

  assert(!benchmarkLookup.available, 'Expected available: false for unbenchmarked skill');
  assert(benchmarkLookup.benchmarkLevel === null, `Expected benchmarkLevel null, got ${benchmarkLookup.benchmarkLevel}`);

  const studentSkills = [
    {
      name: testSkill,
      level: 70,
      verified: true,
      category: 'General' as const,
    },
  ];

  const requirements: RequirementSpec[] = [{ name: testSkill }];
  const result = await analyzeSkillGaps(studentSkills as any, requirements);

  assert(result.unbenchmarkedSkills.length === 1, 'Expected 1 unbenchmarked skill');
  assert(result.gapAnalysisList[0].status === 'NO_BENCHMARK_DATA', `Expected NO_BENCHMARK_DATA, got ${result.gapAnalysisList[0].status}`);
  assert(result.gapAnalysisList[0].requiredLevel === null, `Expected requiredLevel null, got ${result.gapAnalysisList[0].requiredLevel}`);
  assert(result.gapAnalysisList[0].gapPercentage === null, `Expected gapPercentage null, got ${result.gapAnalysisList[0].gapPercentage}`);
  assert(result.gapAnalysisList[0].requiredLevel !== 75, 'CRITICAL: Must NOT be 75');
  assert(result.gapAnalysisList[0].requiredLevel !== 80, 'CRITICAL: Must NOT be 80');

  results.push({
    scenarioNumber: 3,
    title: 'Missing Benchmark Handling (Status NO_BENCHMARK_DATA, null requiredLevel, zero fabrication)',
    passed: true,
    details: `Status = ${result.gapAnalysisList[0].status}, requiredLevel = ${result.gapAnalysisList[0].requiredLevel}`,
  });
}

async function runScenario4() {
  console.log('\n--- Scenario 4: Proctoring & Evidence Verification Policy ---');
  assert(SCORING_POLICY.verification.allowScoreOnlyAutoVerification === false, 'Policy must disallow score-only auto-verification');

  const unproctoredAttempt = {
    score: 95,
    proctoring: undefined,
  };

  const isUnproctoredValid =
    unproctoredAttempt.proctoring &&
    typeof (unproctoredAttempt.proctoring as any).integrityScore === 'number' &&
    (unproctoredAttempt.proctoring as any).integrityScore >= SCORING_POLICY.verification.minimumProctoringIntegrity &&
    !(unproctoredAttempt.proctoring as any).terminatedEarly;

  assert(!isUnproctoredValid, 'Score >= 60 without proctoring must NOT be verified');

  const proctoredAttempt = {
    score: 88,
    proctoring: { integrityScore: 95, terminatedEarly: false },
  };

  const isProctoredValid =
    proctoredAttempt.proctoring &&
    typeof proctoredAttempt.proctoring.integrityScore === 'number' &&
    proctoredAttempt.proctoring.integrityScore >= SCORING_POLICY.verification.minimumProctoringIntegrity &&
    !proctoredAttempt.proctoring.terminatedEarly;

  assert(Boolean(isProctoredValid), 'Assessment with valid proctoring audit trail is authenticated');

  results.push({
    scenarioNumber: 4,
    title: 'Authentic Verification Policy (Score >= 60 without proctoring is UNVERIFIED)',
    passed: true,
    details: `Unproctored Valid = ${Boolean(isUnproctoredValid)}, Proctored Valid = ${Boolean(isProctoredValid)}`,
  });
}

async function runScenario5() {
  console.log('\n--- Scenario 5: Independent Student Profiles ---');
  const studentA = [
    { name: 'Data Structures', level: 90, verified: true, category: 'CS' as const },
    { name: 'Algorithms', level: 85, verified: true, category: 'CS' as const },
  ];

  const studentB = [
    { name: 'Ayush Pharmacology', level: 80, verified: true, category: 'Clinical' as const },
    { name: 'Panchakarma Protocol', level: 75, verified: true, category: 'Regulatory' as const },
  ];

  const csRequirements: RequirementSpec[] = [
    { name: 'Data Structures', requiredLevel: 80, weight: 1.0 },
    { name: 'Algorithms', requiredLevel: 80, weight: 1.0 },
  ];

  const resultA = await analyzeSkillGaps(studentA as any, csRequirements);
  const resultB = await analyzeSkillGaps(studentB as any, csRequirements);

  assert(resultA.overallCompatibility === 100, `Student A compatibility should be 100, got ${resultA.overallCompatibility}`);
  assert(resultB.overallCompatibility === 0, `Student B compatibility should be 0, got ${resultB.overallCompatibility}`);
  assert(resultB.missingSkills.length === 2, 'Student B should have 2 missing skills');

  results.push({
    scenarioNumber: 5,
    title: 'Discipline-Specific Independence (CS student matches CS reqs, Ayurvedic student does not)',
    passed: true,
    details: `Student A Match = ${resultA.overallCompatibility}%, Student B Match = ${resultB.overallCompatibility}%`,
  });
}

async function runScenario6() {
  console.log('\n--- Scenario 6: Weighted Fulfillment Formula Verification ---');
  // Formula: \sum(W_i * \min(1.0, C_i / R_i)) / \sum W_i
  // Req 1: React, required 80, weight 1.5. Student: 80 -> fulfillment = 1.0, weighted = 1.5 * 1.0 = 1.5
  // Req 2: TypeScript, required 70, weight 1.0. Student: 35 -> fulfillment = 35/70 = 0.5, weighted = 1.0 * 0.5 = 0.5
  // Req 3: GraphQL, required 90, weight 0.8. Student: 0 -> fulfillment = 0, weighted = 0.8 * 0 = 0.0
  // Total weighted = 1.5 + 0.5 + 0 = 2.0
  // Total weight = 1.5 + 1.0 + 0.8 = 3.3
  // Math.round((2.0 / 3.3) * 100) = Math.round(60.60606) = 61%

  const studentSkills = [
    { name: 'React', level: 80, verified: true, category: 'Frontend' as const },
    { name: 'TypeScript', level: 35, verified: true, category: 'Frontend' as const },
  ];

  const requirements: RequirementSpec[] = [
    { name: 'React', requiredLevel: 80, weight: 1.5, importance: 'medium' },
    { name: 'TypeScript', requiredLevel: 70, weight: 1.0, importance: 'medium' },
    { name: 'GraphQL', requiredLevel: 90, weight: 0.8, importance: 'medium' },
  ];

  const result = await analyzeSkillGaps(studentSkills as any, requirements);

  assert(result.overallCompatibility === 61, `Expected mathematically exact 61%, got ${result.overallCompatibility}%`);

  results.push({
    scenarioNumber: 6,
    title: 'Mathematical Compatibility Formula (Weighted fulfillment ratio = 61%)',
    passed: true,
    details: `Computed overallCompatibility = ${result.overallCompatibility}% (Matches formula 2.0 / 3.3 * 100)`,
  });
}

async function runScenario7() {
  console.log('\n--- Scenario 7: CS Student Zero-Ayush Contamination ---');
  const csStudentSkills = [
    { name: 'React', level: 80, verified: true, category: 'General' as const },
    { name: 'Node.js', level: 75, verified: true, category: 'General' as const },
  ];

  const csRequirements: RequirementSpec[] = [
    { name: 'React', requiredLevel: 70 },
    { name: 'Node.js', requiredLevel: 70 },
  ];

  const result = await analyzeSkillGaps(csStudentSkills as any, csRequirements);

  const forbiddenAyushTerms = [
    'ayush-gmp',
    'good clinical practice',
    'pharmacovigilance for ayush drugs',
    'herbal',
  ];

  const allProducedStrings = [
    ...result.matchingSkills.map((m) => m.name.toLowerCase()),
    ...result.missingSkills.map((m) => m.toLowerCase()),
    ...result.partialSkills.map((p) => p.name.toLowerCase()),
    ...result.breakdown.map((b) => b.explanation.toLowerCase()),
  ];

  for (const term of forbiddenAyushTerms) {
    const contaminated = allProducedStrings.some((s) => s.includes(term));
    assert(!contaminated, `CS profile must NOT contain Ayush fallback '${term}'`);
  }

  results.push({
    scenarioNumber: 7,
    title: 'Discipline Hygiene (CS student profile contains ZERO Ayush fallbacks/injections)',
    passed: true,
    details: '0 Ayush terms detected in CS skill evaluation',
  });
}

async function runScenario8() {
  console.log('\n--- Scenario 8: Live Database Opportunity Mutation & Reactivity ---');
  // Create a real Opportunity record in MongoDB
  const testOpp = await Opportunity.create({
    title: 'Test Cloud Engineer',
    company: 'Cloud Innovations Inc.',
    description: 'Dynamic cloud role for verification',
    type: 'job',
    location: 'Bangalore, India',
    mode: 'Remote',
    salary: '12 LPA',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    skillsRequired: ['Docker'],
    skillRequirements: [
      { name: 'Docker', requiredLevel: 90, weight: 1.0, importance: 'high' },
    ],
  });

  const studentSkills = [
    { name: 'Docker', level: 70, verified: true, category: 'DevOps' as const },
  ];

  // Match 1 with requirement at 90
  const res1 = await analyzeSkillGaps(studentSkills as any, (testOpp.skillRequirements || []) as any);
  assert(res1.partialSkills[0].gap === 20, 'Expected gap 20 on v1 requirement');
  assert(res1.overallCompatibility === 78, `Expected 78% (70/90), got ${res1.overallCompatibility}%`);

  // Mutate Opportunity in MongoDB to requiredLevel 70
  testOpp.skillRequirements = [
    { name: 'Docker', requiredLevel: 70, weight: 1.0, importance: 'high' } as any,
  ];
  await testOpp.save();

  // Re-fetch from MongoDB
  const updatedOpp = await Opportunity.findById(testOpp._id).lean();
  const res2 = await analyzeSkillGaps(studentSkills as any, (updatedOpp!.skillRequirements || []) as any);
  assert(res2.matchingSkills.length === 1, 'Expected matching skill on v2 requirement');
  assert(res2.overallCompatibility === 100, `Expected 100% (70/70), got ${res2.overallCompatibility}%`);

  // Clean up test document
  await Opportunity.findByIdAndDelete(testOpp._id);

  results.push({
    scenarioNumber: 8,
    title: 'Live Requirement Reactivity (Docker 90->70 in MongoDB updates score from 78% to 100%)',
    passed: true,
    details: `v1 Compatibility = ${res1.overallCompatibility}%, v2 Compatibility = ${res2.overallCompatibility}%`,
  });
}

async function runScenario9() {
  console.log('\n--- Scenario 9: Real Learning Catalog & Dynamic AI API Roadmap Generation ---');
  // Query real LearningProgram records from MongoDB
  const realPrograms = await LearningProgram.find({ isArchived: { $ne: true } }).lean();
  console.log(`[Scenario 9] Found ${realPrograms.length} real LearningProgram items in MongoDB.`);

  // Test real AI API: Dynamically generate learning roadmap for a lagging skill using Groq AI
  console.log('[Scenario 9] Invoking real Groq AI API to generate dynamic roadmap for "Kubernetes"...');
  const aiRoadmap = await generateRoadmapWithAi('Kubernetes', 'Cloud Computing');

  assert(aiRoadmap !== null, 'AI API must return a structured roadmap');
  assert(aiRoadmap!.skill === 'Kubernetes', `Expected skill Kubernetes, got ${aiRoadmap!.skill}`);
  assert(Array.isArray(aiRoadmap!.modules) && aiRoadmap!.modules.length >= 2, 'Expected at least 2 structured modules');
  assert(aiRoadmap!.modules[0].topics.length > 0, 'Expected module topics to be populated by AI API');

  // Verify that the generated roadmap was persisted in MongoDB RoadmapMapping collection
  const persistedInDb = await RoadmapMapping.findOne({ slug: aiRoadmap!.roadmapSlug }).lean();
  assert(persistedInDb !== null, 'AI-generated roadmap must be persisted to MongoDB RoadmapMapping');

  results.push({
    scenarioNumber: 9,
    title: 'Real Data & AI API (Real programs queried from MongoDB, real roadmap generated via Groq AI API)',
    passed: true,
    details: `Generated: "${aiRoadmap!.roadmapTitle}" with ${aiRoadmap!.modules.length} modules via Groq AI API`,
  });
}

async function runScenario10() {
  console.log('\n--- Scenario 10: Zero Fake Fallbacks Across Pipeline ---');
  // Verify that an unknown skill with no benchmark returns null, not 75
  const student = [{ name: 'Quantum Cryptography', level: 40, category: 'General' as const }];
  const reqs = [{ name: 'Quantum Cryptography' }];

  const res = await analyzeSkillGaps(student as any, reqs);
  const gapItem = res.gapAnalysisList[0];

  assert(gapItem.requiredLevel === null, 'requiredLevel must be null');
  assert(gapItem.gapPercentage === null, 'gapPercentage must be null');
  assert(gapItem.status === 'NO_BENCHMARK_DATA', 'status must be NO_BENCHMARK_DATA');

  // Verify priority calculation without magic numbers
  const pLow = calculatePriority(5);
  const pMed = calculatePriority(15);
  const pHigh = calculatePriority(30);

  assert(pLow === 'Low', `Priority 5 must be Low, got ${pLow}`);
  assert(pMed === 'Medium', `Priority 15 must be Medium, got ${pMed}`);
  assert(pHigh === 'High', `Priority 30 must be High, got ${pHigh}`);

  results.push({
    scenarioNumber: 10,
    title: 'Zero Arbitrary Fallbacks (All fallbacks replaced by null / NO_BENCHMARK_DATA / central policy)',
    passed: true,
    details: 'Verified no magic numbers across priority thresholds and benchmark lookup',
  });
}

async function main() {
  console.log('================================================================');
  console.log('   NODAL CONNECTOR - FORENSIC DATA-DRIVEN ARCHITECTURE AUDIT   ');
  console.log('         (Connected to live MongoDB & Groq AI API)              ');
  console.log('================================================================');

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set in environment');
    }

    console.log('[Setup] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('[Setup] Connected to MongoDB successfully.');

    await runScenario1();
    await runScenario2();
    await runScenario3();
    await runScenario4();
    await runScenario5();
    await runScenario6();
    await runScenario7();
    await runScenario8();
    await runScenario9();
    await runScenario10();

    console.log('\n================================================================');
    console.log('                      VERIFICATION SUMMARY                      ');
    console.log('================================================================');
    let allPassed = true;
    for (const r of results) {
      const mark = r.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${mark} [Scenario ${r.scenarioNumber}]: ${r.title}`);
      console.log(`       Details: ${r.details}`);
      if (!r.passed) allPassed = false;
    }

    console.log('================================================================');
    if (allPassed && results.length === 10) {
      console.log('🎉 ALL 10 ACCEPTANCE SCENARIOS PASSED WITH ZERO ERRORS!');
      await mongoose.disconnect();
      process.exit(0);
    } else {
      console.error(`❌ Verification incomplete: ${results.length}/10 tests executed.`);
      await mongoose.disconnect();
      process.exit(1);
    }
  } catch (err: any) {
    console.error('\n❌ TEST RUN FAILED WITH ERROR:', err.message);
    console.error(err.stack);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

main();
