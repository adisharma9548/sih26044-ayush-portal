import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './layouts/ProtectedRoute';

// Common / Auth Pages
import { LandingPage } from './pages/common/LandingPage';
import { LoginPage } from './pages/common/LoginPage';
import { SignupPage } from './pages/common/SignupPage';
import { ForgotPasswordPage } from './pages/common/ForgotPasswordPage';
import { NotificationsPage } from './pages/common/NotificationsPage';
import { ProfileSettingsPage } from './pages/common/ProfileSettingsPage';
import { LiveMeetingPage } from './pages/common/LiveMeetingPage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { SkillAssessmentPage } from './pages/student/SkillAssessmentPage';
import { SkillProfilePage } from './pages/student/SkillProfilePage';
import { LearningRecommendationsPage } from './pages/student/LearningRecommendationsPage';
import { InternshipListPage } from './pages/student/InternshipListPage';
import { InternshipDetailPage } from './pages/student/InternshipDetailPage';
import { JobListPage } from './pages/student/JobListPage';
import { JobDetailPage } from './pages/student/JobDetailPage';
import { MyApplicationsPage } from './pages/student/MyApplicationsPage';
import { DigitalPortfolioPage } from './pages/student/DigitalPortfolioPage';
import { CourseWorkspacePage } from './pages/student/CourseWorkspacePage';
import { VerifyCertificatePage } from './pages/common/VerifyCertificatePage';

// Industry Pages
import { IndustryDashboard } from './pages/industry/IndustryDashboard';
import { PostOpportunityPage } from './pages/industry/PostOpportunityPage';
import { PostLearningProgramPage } from './pages/industry/PostLearningProgramPage';
import { ManageApplicantsPage } from './pages/industry/ManageApplicantsPage';
import { CandidateSearchPage } from './pages/industry/CandidateSearchPage';

// Academician Pages
import { AcademicianDashboard } from './pages/academician/AcademicianDashboard';
import { FacultyOpportunitiesPage } from './pages/academician/FacultyOpportunitiesPage';
import { MentorshipWorkshopPage } from './pages/academician/MentorshipWorkshopPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { StudentFacultyProgressPage } from './pages/admin/StudentFacultyProgressPage';
import { AnalyticsReportsPage } from './pages/admin/AnalyticsReportsPage';
import { ManageUsersPage } from './pages/admin/ManageUsersPage';

const getDashboardPath = (role: string) => {
  switch (role) {
    case 'student':
    case 'jobseeker':
      return '/student/dashboard';
    case 'industry':
      return '/industry/dashboard';
    case 'academician':
      return '/academician/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/student/dashboard';
  }
};

const PublicOnlyRoute: React.FC = () => {
  const { isAuthenticated, role, isCheckingAuth } = useAuthStore();
  if (isCheckingAuth) return null;
  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(role)} replace />;
  }
  return <Outlet />;
};

const AdminRouteGate: React.FC = () => {
  const { isAuthenticated, role } = useAuthStore();
  if (isAuthenticated && role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/login?role=admin" replace />;
};

export function App() {
  useEffect(() => {
    useAuthStore.getState().checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Direct Admin URL entry (Shifted out of public tabs & navbar) */}
        <Route path="/admin" element={<AdminRouteGate />} />
        <Route path="/admin/login" element={<Navigate to="/login?role=admin" replace />} />

        {/* Public Routes with Public Layout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/verify/:certId" element={<VerifyCertificatePage />} />

          {/* Guest / Public Only Routes (Auto-redirect if already signed in) */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
        </Route>

        {/* Authenticated Dashboard Shell */}
        <Route element={<DashboardLayout />}>
          {/* Shared Authenticated Pages */}
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfileSettingsPage />} />
          <Route path="/meetings" element={<LiveMeetingPage />} />

          {/* Student & Job Seeker Role Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student', 'jobseeker']} />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/assessment" element={<SkillAssessmentPage />} />
            <Route path="/student/skills" element={<SkillProfilePage />} />
            <Route path="/student/learning" element={<LearningRecommendationsPage />} />
            <Route path="/student/learning/course/:courseId" element={<CourseWorkspacePage />} />
            <Route path="/student/learning/course" element={<CourseWorkspacePage />} />
            <Route path="/student/internships" element={<InternshipListPage />} />
            <Route path="/student/internships/:id" element={<InternshipDetailPage />} />
            <Route path="/student/jobs" element={<JobListPage />} />
            <Route path="/student/jobs/:id" element={<JobDetailPage />} />
            <Route path="/student/applications" element={<MyApplicationsPage />} />
            <Route path="/student/portfolio" element={<DigitalPortfolioPage />} />
          </Route>

          {/* Industry Role Routes */}
          <Route element={<ProtectedRoute allowedRoles={['industry']} />}>
            <Route path="/industry/dashboard" element={<IndustryDashboard />} />
            <Route path="/industry/post" element={<PostOpportunityPage />} />
            <Route path="/industry/post-program" element={<PostLearningProgramPage />} />
            <Route path="/industry/applicants" element={<ManageApplicantsPage />} />
            <Route path="/industry/candidates" element={<CandidateSearchPage />} />
          </Route>

          {/* Academician Role Routes */}
          <Route element={<ProtectedRoute allowedRoles={['academician']} />}>
            <Route path="/academician/dashboard" element={<AcademicianDashboard />} />
            <Route path="/academician/opportunities" element={<FacultyOpportunitiesPage />} />
            <Route path="/academician/mentorship" element={<MentorshipWorkshopPage />} />
          </Route>

          {/* Institution Admin Role Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/progress" element={<StudentFacultyProgressPage />} />
            <Route path="/admin/reports" element={<AnalyticsReportsPage />} />
            <Route path="/admin/users" element={<ManageUsersPage />} />
          </Route>
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
