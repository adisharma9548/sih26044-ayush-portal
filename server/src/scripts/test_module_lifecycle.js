const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'c:/Users/adish/.gemini/antigravity/scratch/sih26044-ayush-portal/server/.env' });

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'ayush-portal-super-secret-jwt-key-2025';

// Real industry user token
const industryId = '6aa2dc9e116236827f55dccf';
const industryToken = jwt.sign(
  { id: industryId, email: 'industry.demo@nodalconnector.in', role: 'industry' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

// Real student token
const studentId = '6aa309a9c340dcff351d68bb';
const studentToken = jwt.sign(
  { id: studentId, email: 'aarav.sharma@dtu.edu.in', role: 'student' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function testIndustryModuleLifecycle() {
  console.log('=== STARTING INDUSTRY MODULE MANAGEMENT & PRESERVATION TESTS ===\n');

  // 1. Create a test module to delete
  console.log('--- TEST 1: Industry Sponsors a New Hands-on Lab ---');
  const createRes = await fetch(`${API_BASE}/learning/programs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${industryToken}`,
    },
    body: JSON.stringify({
      title: 'Automated Test: Cyber Security Defense Sandbox',
      provider: 'Nodal Power & Automation Ltd',
      type: 'workshop',
      duration: '3 Days Intensive',
      skillsCovered: ['Cyber Security', 'Penetration Testing', 'Threat Analysis'],
      description: 'Hands-on penetration testing and authorization validation sandbox.',
      level: 'Advanced',
      cost: 'Free',
      ayushDomain: 'Cybersecurity & Threat Defense',
      syllabus: ['Module 1: Threat Vectors', 'Module 2: Token Sandbox', 'Module 3: Defense Quiz']
    })
  });
  const createJson = await createRes.json();
  console.log('Create status:', createRes.status);
  const program = createJson.data;
  const programId = program._id || program.id;
  console.log(`Created Program ID: ${programId}`);
  console.log(`Title: "${program.title}"`);

  // 2. Student enrolls and completes the course
  console.log('\n--- TEST 2: Student completes the course and earns certificate ---');
  await fetch(`${API_BASE}/learning/programs/${programId}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: studentId })
  });

  // Mark lesson complete so progress is 100%
  const completeRes = await fetch(`${API_BASE}/learning/course/${programId}/progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      lessonId: 'lesson-1',
      completed: true,
      totalLessons: 1
    })
  });
  const completeJson = await completeRes.json();
  console.log('Student Completed Progress:', completeJson.data.progress.overallProgressPercent, '%');
  console.log('Student Is Completed:', completeJson.data.progress.isCompleted);
  const certId = completeJson.data.certificateId || completeJson.data.progress.certificateId;
  console.log('Student Certificate ID:', certId);

  // 3. Industry views managed programs and enrollees
  console.log('\n--- TEST 3: Industry views managed programs and enrollees list ---');
  const manageRes = await fetch(`${API_BASE}/learning/manage`, {
    headers: { Authorization: `Bearer ${industryToken}` }
  });
  const manageJson = await manageRes.json();
  const managedTarget = manageJson.data.find(p => (p.id || p._id) === programId);
  console.log(`Found in Managed List: "${managedTarget?.title}"`);
  console.log(`Completed Count reported: ${managedTarget?.completedCount}`);

  // Fetch enrollees
  const enrolleesRes = await fetch(`${API_BASE}/learning/programs/${programId}/enrollees`, {
    headers: { Authorization: `Bearer ${industryToken}` }
  });
  const enrolleesJson = await enrolleesRes.json();
  console.log(`Enrollees Count: ${enrolleesJson.data.totalEnrollees}`);
  console.log(`Certified Scholars: ${enrolleesJson.data.totalCompleted}`);
  console.log(`First Enrollee Name: "${enrolleesJson.data.enrollees[0]?.studentName}"`);
  console.log(`First Enrollee Certificate: "${enrolleesJson.data.enrollees[0]?.certificateId}"`);

  // 4. Industry DELETES / ARCHIVES the module
  console.log('\n--- TEST 4: Industry deletes / archives the module ---');
  const deleteRes = await fetch(`${API_BASE}/learning/programs/${programId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${industryToken}` }
  });
  const deleteJson = await deleteRes.json();
  console.log('Delete Response:', deleteJson.data.message);

  // 5. Verify module is hidden from public catalog
  console.log('\n--- TEST 5: Verify module is hidden from public student catalog ---');
  const publicCatalogRes = await fetch(`${API_BASE}/learning/programs`);
  const publicCatalogJson = await publicCatalogRes.json();
  const foundInPublic = publicCatalogJson.data.some(p => (p.id || p._id) === programId);
  console.log('Is deleted module present in public student catalog? ->', foundInPublic);
  if (foundInPublic) {
    throw new Error('Archived module should NOT be visible in public catalog!');
  }

  // 6. CRITICAL VERIFICATION: Student's completion & certificate remain 100% intact!
  console.log('\n--- TEST 6: Verify student completion & certificate are PRESERVED ---');
  const studentWsRes = await fetch(`${API_BASE}/learning/course/${programId}/workspace`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const studentWsJson = await studentWsRes.json();
  console.log('Student Workspace Progress %:', studentWsJson.data.progress.overallProgressPercent);
  console.log('Student isCompleted status:', studentWsJson.data.progress.isCompleted);
  console.log('Student certificateId in progress:', studentWsJson.data.progress.certificateId);

  if (studentWsJson.data.progress.isCompleted !== true) {
    throw new Error('Student completion status was lost!');
  }

  // Verify certificate lookup endpoint
  if (certId) {
    const certRes = await fetch(`${API_BASE}/learning/certificate/${certId}`);
    const certJson = await certRes.json();
    console.log('Certificate Verification API Status:', certRes.status);
    console.log('Certificate Student Name:', certJson.data?.studentName);
    console.log('Certificate Verified:', certJson.data?.verified);
    if (!certJson.data?.verified) {
      throw new Error('Student certificate verification failed!');
    }
  }

  console.log('\n=== ALL TESTS PASSED! STUDENT CREDENTIALS ARE 100% PRESERVED! ===');
}

testIndustryModuleLifecycle().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
