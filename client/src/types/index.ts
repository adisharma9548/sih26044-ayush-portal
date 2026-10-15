export type UserRole = 'student' | 'jobseeker' | 'industry' | 'academician' | 'admin' | 'institution';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountType?: 'real' | 'demo';
  isDemo?: boolean;
  resumeId?: string;
  collegeId?: string;
  locationStructured?: {
    country?: string;
    state?: string;
    district?: string;
    city?: string;
    village?: string;
    rawInput?: string;
  };
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
  twoFactorEnabled?: boolean;
  institutionId?: string;
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
  industryBenchmark?: number | null; // 0 - 100 or null if unavailable
  benchmarkStatus?: 'available' | 'insufficient_data';
  benchmarkSource?: string;
  benchmarkReason?: string;
  verified: boolean;
  verificationStatus?: 'verified' | 'pending' | 'unverified';
  verificationSources?: Array<{
    sourceType: string;
    referenceId?: string;
    evidenceUrl?: string;
    verifiedAt?: string;
    verifiedBy?: string;
    scoreOrRating?: number;
    notes?: string;
  }>;
  category: string;
}

export type SkillGapStatus = 'MATCHED' | 'PARTIAL' | 'MISSING' | 'NO_BENCHMARK_DATA';

export interface SkillGap {
  skill: string;
  currentLevel: number;
  requiredLevel?: number | null;
  gapPercentage?: number | null;
  status?: SkillGapStatus;
  priority?: 'High' | 'Medium' | 'Low' | null;
  recommendedProgramId?: string;
  reason?: string;
}

export interface SkillProfile {
  userId: string;
  overallScore: number; // 0 - 100
  rankPercentile: number;
  skills: SkillItem[];
  gapAnalysis: SkillGap[];
  strengths?: string[];
  lastAssessmentDate: string;
  status?: 'current' | 'stale' | 'not_assessed';
  academicContextHash?: string;
  academicContextVersion?: number;
  academicContext?: {
    degree?: string;
    department?: string;
    specialization?: string;
    institution?: string;
  };
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
  recommendationReason?: string;
  targetedGapSkill?: string;
  gapPriority?: string;
  gapPercentage?: number | null;
}

export interface LearningPathMilestone {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedHours: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  topics: string[];
  learningOutcomes: string[];
  status: 'locked' | 'current' | 'completed';
  completedAt?: string;
  resources: Array<{
    title: string;
    url: string;
    type?: string;
  }>;
}

export interface LearningPath {
  _id?: string;
  id?: string;
  userId: string;
  title: string;
  targetRole: string;
  targetSkill?: string;
  domain: string;
  overview: string;
  milestones: LearningPathMilestone[];
  overallProgress: number;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ApplicationStatus = 'applied' | 'in_review' | 'shortlisted' | 'interview_scheduled' | 'interview_completed' | 'offered' | 'rejected';

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
  type: 'Central University' | 'State University' | 'Deemed University' | 'Institute of National Importance' | 'Affiliated College' | 'Autonomous College' | 'Private University' | 'Higher Education Institution';
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

export interface CollegeSource {
  field: string;
  sourceUrl: string;
  sourceType: string;
}

export interface CollegeLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
}

export interface CollegeContact {
  email?: string;
  phone?: string;
  website?: string;
}

export interface College {
  id?: string;
  _id?: string;
  officialDomain: string;
  slug: string;
  name: string;
  about?: string;
  departments: any[];
  programs: any[];
  skills: any[];
  opportunities: any[];
  collaborations: any[];
  placements: any[];
  location: CollegeLocation;
  contact: CollegeContact;
  verificationStatus: 'UNCLAIMED' | 'VERIFIED';
  sources: CollegeSource[];
  createdAt: string;
  updatedAt: string;
  lastUpdated: string;
}

export interface CollegeSearchResult {
  name: string;
  domain: string;
  location: string;
  confidence: number;
}

export interface InstitutionClaim {
  id: string;
  collegeSlug: string;
  collegeName: string;
  representativeName: string;
  email: string;
  verificationCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminReviewNotes?: string;
  createdAt: string;
}

export interface StudentAnalytics {
  profileCompletion: number;
  applicationsSent: number;
  applicationsViewed: number;
  interviewSuccessRate: number | null;
  averageSkillMatch: number;
  topMatchingJobs: Array<{
    jobId: string;
    title: string;
    company: string;
    type: string;
    matchScore: number;
  }>;
}

export interface CompanyAnalytics {
  totalJobPostings: number;
  totalApplications: number;
  applicationsByStatus: {
    APPLIED: number;
    REVIEWED: number;
    SHORTLISTED: number;
    REJECTED: number;
  };
  averageTimeToHire: number;
  topInDemandSkills: Array<{
    skill: string;
    count: number;
  }>;
  applicantsByEducation: Record<string, number>;
}

export interface AdminAnalytics {
  userCounts: {
    students: number;
    companies: number;
    colleges: number;
    admins: number;
  };
  userGrowth: Array<{
    month: string;
    count: number;
  }>;
  jobActivityStats: {
    posted: number;
    applied: number;
    hired: number;
  };
  placementRate: number;
  topSearchQueries: Array<{
    query: string;
    count: number;
  }>;
  institutionDiscoveryStats: {
    searched: number;
    discovered: number;
    verified: number;
  };
}

export interface IResumeEducation {
  institution?: string;
  degree?: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  grade?: string;
}

export interface IResumeSkill {
  name: string;
  level?: number;
  category?: string;
}

export interface IResumeExperience {
  organization?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface IResumeProject {
  title: string;
  description?: string;
  technologies?: string[];
}

export interface IResumeCertification {
  title: string;
  issuer?: string;
  issueDate?: string;
}

export interface IResumeParsedData {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: {
    city?: string;
    district?: string;
    state?: string;
    country?: string;
  };
  education?: IResumeEducation[];
  skills?: IResumeSkill[];
  experience?: IResumeExperience[];
  certifications?: IResumeCertification[];
  projects?: IResumeProject[];
}

export interface IResume {
  id?: string;
  _id?: string;
  userId: string;
  fileUrl: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  extractionStatus: 'pending' | 'processing' | 'success' | 'completed' | 'failed' | 'not_attempted';
  extractionError?: string;
  extractedData?: IResumeParsedData;
  confirmedData?: IResumeParsedData;
  version?: number;
}

export interface ICareerRole {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  requiredSkills: Array<{
    name: string;
    requiredLevel: number;
    importance: 'critical' | 'high' | 'medium' | 'low';
    weight?: number;
  }>;
  preferredSkills?: Array<{
    name: string;
    requiredLevel?: number;
    importance?: 'critical' | 'high' | 'medium' | 'low';
    weight?: number;
  }>;
  source: string;
  company?: string;
  location?: string;
  type?: 'internship' | 'job';
  stipend?: string;
  salary?: string;
  isOpportunity?: boolean;
  opportunityId?: string;
  recommended?: boolean;
  relevanceScore?: number;
  matchedSkillsCount?: number;
}

export interface IAdminQuestion {
  _id?: string;
  id?: string;
  numericId: number;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  weight: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  status: 'active' | 'retired' | 'under_review';
}

export interface IInstitutionAnalytics {
  college: {
    id: string;
    name: string;
    slug: string;
    type?: string;
    state?: string;
    district?: string;
    city?: string;
    verificationStatus?: string;
    about?: string;
    contact?: { email?: string; phone?: string; website?: string };
    departments?: any[];
  };
  metrics: {
    totalStudents: number;
    assessedStudents: number;
    assessmentParticipationRate: number;
    averageSkillScore: number;
    placementReadyCount: number;
    placementReadinessRate: number;
  };
  departmentBreakdown: Array<{
    department: string;
    studentCount: number;
    assessedCount: number;
    averageScore: number;
  }>;
  topSkills: Array<{
    name: string;
    category: string;
    studentCount: number;
    averageProficiency: number;
  }>;
  laggingSkills: Array<{
    name: string;
    studentsAffected: number;
    averageGapPercentage: number;
  }>;
  recentAssessments: Array<{
    id: string;
    studentName: string;
    studentEmail: string;
    score: number;
    evaluatedAt: string;
    department: string;
  }>;
}


