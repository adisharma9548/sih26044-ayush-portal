# SIH26044 Forensic Audit Notes & Master Ground Truth

## 1. Ground Truth Problem Statement Analysis

* **Problem ID**: SIH26044
* **Title**: Portal for Academia – Industry Collaboration for Skill Mapping, Internships and Placement
* **Sponsoring Organization**: Ministry of Ayush
* **Category**: Software
* **Theme**: Smart Automation

### Core Challenge & Scope
The core objective of SIH26044 is to resolve the structural competency gap between academic curricula and industry operational expectations. The platform must provide an automated, transparent, and bidirectional ecosystem enabling:
1. Continuous skill mapping and automated diagnostic gap analysis.
2. Direct matchmaking between student capabilities and real-world internships / jobs.
3. Joint academia-industry curriculum alignment, sponsored learning modules, and faculty immersion.
4. Institutional governance, accreditation oversight, and live regulatory progress analytics.

---

## 2. Independent Scope Judgment: Ayush Specialization vs. General Platform Scope

### Analysis
* **Context**: The repository was initially initialized with branding around "Ayush-Connect / SkillBridge" and specifically modeled around Ayush pharmaceutical entities (Dabur, Himalaya, Patanjali, CCRAS, AIIA).
* **Evaluation**:
  1. The problem statement **SIH26044** was officially submitted by the **Ministry of Ayush**. Therefore, having deep domain-specific support for Ayush sectors (Ayurveda, Yoga & Naturopathy, Unani, Siddha, Homoeopathy, Herbal Bio-Pharma) is authentic and directly aligned with the ministry's vision.
  2. **However**, the Ministry of Ayush and modern bio-pharma depend heavily on computer science, AI, data science, bio-informatics, instrumentation engineering, regulatory documentation, and management.
  3. If the portal *only* supports Ayush herbal terms and breaks or excludes standard degree disciplines (B.Tech Computer Science, Data Science, Mechanical, B.Com, MCA, Management etc.), it improperly narrows the scope of the problem statement.
* **Defensible Decision**:
  - The platform must function as a **generalized, multi-stream Academia-Industry Collaboration engine** that treats Ayush, Bio-Pharma, Health-Tech, and Engineering as equal, fully-supported domains under the UGC Section 22 framework.
  - The UGC Degree Selector, AI Diagnostic Assessment, roadmap guidance, and job postings must support both Technology & Engineering tracks and Traditional Medicine & Bio-Pharma tracks seamlessly.

---

## 3. SIH26044 Requirements Checklist & Role Workflows

### Role 1: Student / Job Seeker
- [ ] Profile creation with UGC-recognized degrees and verified skills.
- [ ] Diagnostic skill competency assessment test (with score computation and mandatory application gate).
- [ ] Automated skill gap identification linked to actionable learning paths (roadmap.sh curriculum guidance).
- [ ] Searchable directory of verified internships with stipends, duration, and requirements.
- [ ] Searchable directory of verified graduate jobs with salaries and domain tags.
- [ ] Application submission with resume and cover note.
- [ ] Live application status tracker (`submitted` → `under_review` → `interview_scheduled` → `offered` / `rejected`).
- [ ] Verified digital portfolio with earned certificates and completed projects.
- [ ] Real-time WebRTC technical interview room participation.

### Role 2: Industry / Corporate Partner
- [ ] Enterprise profile management and accreditation verification.
- [ ] Posting of internship opportunities with specific skill criteria and stipends.
- [ ] Posting of full-time job openings with experience and salary specifications.
- [ ] Sponsoring / posting collaborative learning programs and skill modules.
- [ ] Applicant management dashboard with resume review, status updates, and interview scheduling.
- [ ] Talent scout / candidate search filtering by verified skills, degree, and readiness score.
- [ ] Digital MoU creation and collaboration requests with academic institutions.

### Role 3: Academician / Faculty
- [ ] Faculty profile with institution, department, and faculty registration credentials.
- [ ] Access to industry immersion programs, research calls, and joint grant opportunities.
- [ ] Workshop and guest lecture creation and scheduling.
- [ ] 1-on-1 student mentorship request management.
- [ ] Institutional skill gap oversight for departmental cohorts.

### Role 4: Institution Admin / Regulatory Directorate
- [ ] Macro institutional KPI dashboard (total students, active partners, placement rates, average skill index).
- [ ] Partner organization accreditation governance (review, approve, block).
- [ ] Departmental progress analytics and cohort skill trajectory tracking.
- [ ] Regulatory reports with live data export (CSV/metrics).
- [ ] Dedicated administrative alert feed for pending KYC, unsealed MoUs, and infrastructure health.

---

## 4. Complete Repository File Inventory

### Backend (`server/`)
* **Core Server**: `server/src/server.ts`
* **Configuration (3)**:
  - `server/src/config/cloudinary.ts`
  - `server/src/config/db.ts`
  - `server/src/config/redis.ts`
* **Middlewares (4)**:
  - `server/src/middleware/auth.ts`
  - `server/src/middleware/error.ts`
  - `server/src/middleware/sanitize.ts`
  - `server/src/middleware/upload.ts`
* **Models (15)**:
  - `server/src/models/Application.ts`
  - `server/src/models/Assessment.ts`
  - `server/src/models/AuditLog.ts`
  - `server/src/models/CourseProgress.ts`
  - `server/src/models/FacultyOpportunity.ts`
  - `server/src/models/LearningProgram.ts`
  - `server/src/models/Meeting.ts`
  - `server/src/models/MouProposal.ts`
  - `server/src/models/Notification.ts`
  - `server/src/models/Opportunity.ts`
  - `server/src/models/OtpVerification.ts`
  - `server/src/models/Partner.ts`
  - `server/src/models/Portfolio.ts`
  - `server/src/models/Skill.ts`
  - `server/src/models/SkillProfile.ts`
  - `server/src/models/User.ts`
  - `server/src/models/Workshop.ts`
* **Controllers (14)**:
  - `server/src/controllers/academicianController.ts`
  - `server/src/controllers/adminController.ts`
  - `server/src/controllers/aiController.ts`
  - `server/src/controllers/applicationController.ts`
  - `server/src/controllers/authController.ts`
  - `server/src/controllers/internshipController.ts`
  - `server/src/controllers/jobController.ts`
  - `server/src/controllers/learningController.ts`
  - `server/src/controllers/meetingController.ts`
  - `server/src/controllers/mouController.ts`
  - `server/src/controllers/notificationController.ts`
  - `server/src/controllers/skillController.ts`
  - `server/src/controllers/ugcDegreeController.ts`
  - `server/src/controllers/userController.ts`
* **Routes (14)**:
  - `server/src/routes/index.ts`
  - `server/src/routes/academicianRoutes.ts`
  - `server/src/routes/adminRoutes.ts`
  - `server/src/routes/aiRoutes.ts`
  - `server/src/routes/applicationRoutes.ts`
  - `server/src/routes/authRoutes.ts`
  - `server/src/routes/internshipRoutes.ts`
  - `server/src/routes/jobRoutes.ts`
  - `server/src/routes/learningRoutes.ts`
  - `server/src/routes/meetingRoutes.ts`
  - `server/src/routes/mouRoutes.ts`
  - `server/src/routes/notificationRoutes.ts`
  - `server/src/routes/skillRoutes.ts`
  - `server/src/routes/ugcDegreeRoutes.ts`
  - `server/src/routes/userRoutes.ts`
* **Services (7)**:
  - `server/src/services/aiService.ts`
  - `server/src/services/auditService.ts`
  - `server/src/services/emailService.ts`
  - `server/src/services/matchingService.ts`
  - `server/src/services/roadmapService.ts`
  - `server/src/services/skillGapService.ts`
  - `server/src/services/socketService.ts`
* **Seeds (1)**:
  - `server/src/seeds/seedDatabase.ts`

### Frontend (`src/`)
* **Root & Entry**: `src/App.tsx`, `src/main.tsx`, `src/index.css`
* **Layouts (3)**:
  - `src/layouts/DashboardLayout.tsx`
  - `src/layouts/ProtectedRoute.tsx`
  - `src/layouts/PublicLayout.tsx`
* **Common Components (14)**:
  - `src/components/common/AiMatchMatrix.tsx`
  - `src/components/common/Badge.tsx`
  - `src/components/common/Captcha.tsx`
  - `src/components/common/CertificateModal.tsx`
  - `src/components/common/DemoRoleSwitcher.tsx` *(Orphaned / Unused — targeted for deletion in Phase 2)*
  - `src/components/common/Footer.tsx`
  - `src/components/common/GaugeScore.tsx`
  - `src/components/common/Modal.tsx`
  - `src/components/common/MouProposalModal.tsx`
  - `src/components/common/MouReviewModal.tsx`
  - `src/components/common/Navbar.tsx`
  - `src/components/common/RadarChart.tsx`
  - `src/components/common/Sidebar.tsx`
  - `src/components/common/StatCard.tsx`
  - `src/components/common/UGCDegreeSelector.tsx`
  - `src/components/common/UserAvatar.tsx`
* **Specialized Components (3)**:
  - `src/components/meeting/CollaborativeBoard.tsx`
  - `src/components/meeting/WebRtcVideoRoom.tsx`
  - `src/components/student/AiOnboardingModal.tsx`
* **Pages (27)**:
  - **Common (8)**: `LandingPage`, `LoginPage`, `SignupPage`, `ForgotPasswordPage`, `NotificationsPage`, `ProfileSettingsPage`, `VerifyCertificatePage`, `LiveMeetingPage`
  - **Student (11)**: `StudentDashboard`, `InternshipListPage`, `InternshipDetailPage`, `JobListPage`, `JobDetailPage`, `SkillAssessmentPage`, `SkillProfilePage`, `LearningRecommendationsPage`, `CourseWorkspacePage`, `DigitalPortfolioPage`, `MyApplicationsPage`
  - **Industry (5)**: `IndustryDashboard`, `PostOpportunityPage`, `PostLearningProgramPage`, `ManageApplicantsPage`, `CandidateSearchPage`
  - **Academician (3)**: `AcademicianDashboard`, `FacultyOpportunitiesPage`, `MentorshipWorkshopPage`
  - **Admin (4)**: `AdminDashboard`, `ManageUsersPage`, `AnalyticsReportsPage`, `StudentFacultyProgressPage`
* **Hooks (3)**: `useAuth`, `useDebounce`, `useUGCDegreeSearch`
* **Stores (3)**: `useAuthStore`, `useApplicationStore`, `useNotificationStore`
* **Services (2)**: `src/services/api.ts`, `src/services/mockData.ts`
* **Utils (2)**: `src/utils/formatters.ts`, `src/utils/helpers.ts`
* **Types (1)**: `src/types/index.ts`

---

## 5. Dead / Unused / Duplicated Code Inventory
1. **`src/components/common/DemoRoleSwitcher.tsx`**: Never imported or rendered across `src/`. Contains static role switching buttons with hardcoded demo emails. Must be deleted in Phase 2.
2. **`src/pages/student/InternshipDetailPage.tsx:121`**: Hardcoded `88% SKILL MATCH` badge text.
3. **`src/pages/student/StudentDashboard.tsx:327`**: Hardcoded `90% Match` badge with deceptive comment claims.
4. **`server/src/seeds/seedDatabase.ts`**: Hardcoded production admin credentials (`admin@skillbridge.gov.in` / `admin`) printed directly to stdout.
