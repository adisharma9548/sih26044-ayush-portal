export type UserRole = 'student' | 'jobseeker' | 'industry' | 'academician' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profilePicture?: string;
  institution?: string;
  industry?: string;
  department?: string;
  designation?: string;
  degree?: string;
  academicField?: string;
  specialization?: string;
  graduationYear?: number;
  location?: string;
  phone?: string;
  bio?: string;
  skills?: string[];
  ayushDomain?: 'Ayurveda' | 'Yoga & Naturopathy' | 'Unani' | 'Siddha' | 'Homoeopathy' | 'Interdisciplinary' | 'Technology & Engineering';
  currentDomain?: string;
  targetDomain?: string;
  loginCount?: number;
  studyRoadmap?: {
    recommendedDays?: number;
    recommendedTimeline?: string;
    retryAfterDate?: string;
    targetedTopics?: string[];
    studyAdvice?: string;
    score?: number;
    totalQuestions?: number;
    correctAnswers?: number;
    wrongAnswers?: number;
    mandatoryNotice?: string;
    roadmaps?: RoadmapGuidance[];
    createdAt?: string;
  };
  verified?: boolean;
}

export interface Internship {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  isRemote?: boolean;
  stipend: string;
  duration: string;
  skillsRequired: string[];
  description: string;
  responsibilities?: string[];
  requirements?: string[];
  postedDate: string;
  deadline: string;
  status: 'active' | 'closed' | 'draft';
  ayushDomain: string;
  openings: number;
  postedBy?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  isRemote?: boolean;
  salary: string;
  experienceLevel: string;
  skillsRequired: string[];
  description: string;
  responsibilities?: string[];
  requirements?: string[];
  postedDate: string;
  deadline: string;
  status: 'active' | 'closed' | 'draft';
  ayushDomain: string;
  openings: number;
  postedBy?: string;
}

export interface SkillItem {
  name: string;
  level: number; // 0 - 100
  industryBenchmark: number; // 0 - 100
  verified: boolean;
  category: 'Phytochemistry' | 'Clinical Practice' | 'Regulatory & GMP' | 'Research Methodology' | 'Pharmacovigilance' | 'General';
}

export interface SkillGap {
  skill: string;
  currentLevel: number;
  requiredLevel: number;
  gapPercentage: number;
  priority: 'High' | 'Medium' | 'Low';
  recommendedProgramId?: string;
}

export interface SkillProfile {
  userId: string;
  overallScore: number; // 0 - 100
  rankPercentile: number;
  skills: SkillItem[];
  gapAnalysis: SkillGap[];
  lastAssessmentDate: string;
}

export interface LearningProgram {
  id: string;
  title: string;
  provider: string;
  providerLogo?: string;
  type: 'course' | 'certification' | 'workshop';
  duration: string;
  skillsCovered: string[];
  description: string;
  rating: number;
  enrolledCount: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  isSponsored?: boolean;
  ayushDomain: string;
  cost: string;
  syllabus?: string[];
}

export type ApplicationStatus = 'applied' | 'in_review' | 'shortlisted' | 'interview_scheduled' | 'offered' | 'rejected';

export interface Application {
  id: string;
  userId: string;
  studentName?: string;
  studentEmail?: string;
  studentInstitute?: string;
  opportunityId: string;
  type: 'internship' | 'job';
  opportunityTitle: string;
  companyName: string;
  status: ApplicationStatus;
  appliedDate: string;
  resumeUrl?: string;
  coverNote?: string;
  interviewDate?: string;
  skillMatchPercentage?: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  type: 'application' | 'mentorship' | 'match' | 'system';
  link?: string;
}

export interface AssessmentQuestion {
  id: number;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  weight: number;
}

export interface Workshop {
  id: string;
  title: string;
  organizer: string;
  facultyName: string;
  date: string;
  time: string;
  mode: 'Online' | 'Offline' | 'Hybrid';
  location?: string;
  capacity: number;
  registeredCount: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  description: string;
  targetAudience: string;
}

export interface FacultyApplication {
  id?: string;
  _id?: string;
  facultyId: string;
  facultyName: string;
  facultyEmail: string;
  institution?: string;
  department?: string;
  proposalText: string;
  experience?: string;
  cvLink?: string;
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface FacultyOpportunity {
  id: string;
  title: string;
  organization: string;
  type: 'FDP' | 'Research Collaboration' | 'Consultancy' | 'Immersion';
  stipendOrGrant: string;
  duration: string;
  deadline: string;
  description: string;
  requirements: string[];
  ayushDomain: string;
  status: 'open' | 'closed';
  postedBy?: any;
  applications?: FacultyApplication[];
}

export interface MentorshipRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  facultyId: string;
  facultyName: string;
  topic: string;
  message: string;
  preferredDate: string;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  meetingLink?: string;
}

export interface StudentCertificate {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  credentialUrl?: string;
  verified: boolean;
  badgeIcon: string;
}

export interface ProjectAssistance {
  facultyId: string;
  facultyName: string;
  facultyEmail: string;
  facultyDesignation?: string;
  assistanceType: 'guidance' | 'review' | 'endorsement' | 'meeting';
  notes: string;
  meetingRoomId?: string;
  createdAt: string;
}

export interface StudentProject {
  id: string;
  title: string;
  role: string;
  technologies: string[];
  description: string;
  link?: string;
  startDate: string;
  endDate: string;
  assistance?: ProjectAssistance[];
}

export interface InstitutionalStudent {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  institution?: string;
  department?: string;
  degree?: string;
  academicField?: string;
  specialization?: string;
  graduationYear?: number;
  skills?: string[];
  profilePicture?: string;
  skillScore?: number;
  rankPercentile?: number;
  assessedSkillsCount?: number;
  lastAssessmentDate?: string;
  projectsCount?: number;
  certificatesCount?: number;
  projects?: StudentProject[];
}

export interface StudentDetailedProfileResponse {
  student: {
    id: string;
    name: string;
    email: string;
    role: string;
    institution?: string;
    department?: string;
    degree?: string;
    academicField?: string;
    specialization?: string;
    graduationYear?: number;
    location?: string;
    bio?: string;
    skills: string[];
    profilePicture?: string;
    studyRoadmap?: any;
    verified?: boolean;
    createdAt?: string;
  };
  skillProfile: SkillProfile;
  portfolio: {
    certificates: StudentCertificate[];
    projects: StudentProject[];
  };
  mentorshipHistory: MentorshipRequest[];
  institutionalDomainMatched?: string;
}

export interface UGCDegreeSuggestion {
  name: string;
  fullName: string;
  category: string;
  ugcApproved: boolean;
  level: string;
}

export interface RoadmapModule {
  title?: string;
  stage?: string;
  description?: string;
  topics: string[];
  moduleUrl?: string;
}

export interface RoadmapGuidance {
  skill: string;
  roadmapTitle?: string;
  roadmapSlug?: string;
  canonicalRoadmap?: string;
  roadmapUrl: string;
  description: string;
  difficulty?: string;
  estimatedHours?: string;
  modules: RoadmapModule[];
  credit: string;
  creditUrl: string;
}

export interface VerifiedInstitution {
  id: string;
  name: string;
  shortName?: string;
  type: 'Central University' | 'State University' | 'Deemed University' | 'Institute of National Importance' | 'Affiliated College' | 'Autonomous College' | 'Private University';
  affiliatingUniversity?: string | null;
  state: string;
  city: string;
  accreditationStatus: string;
  isRecognized: boolean;
}

export interface VerifiedProgram {
  name: string;
  fullName: string;
  level: 'Undergraduate' | 'Postgraduate' | 'Doctorate' | 'Diploma' | 'Integrated';
  academicField: string;
  isVerified: boolean;
}

export interface VerifiedDepartment {
  name: string;
  specializations: string[];
}

export interface ProgramHierarchyResponse {
  institution: string;
  degree: string;
  academicField: string;
  departments: VerifiedDepartment[];
}

export interface AcademicValidationResult {
  isValid: boolean;
  institution: string;
  degree: string;
  academicField: string | null;
  department?: string;
  specialization?: string;
  message: string;
  reason?: string;
}
