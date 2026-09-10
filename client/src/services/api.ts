import {
  User,
  Internship,
  Job,
  SkillProfile,
  LearningProgram,
  Application,
  Notification,
  Workshop,
  FacultyOpportunity,
  MentorshipRequest,
  UserRole,
  StudentCertificate,
  StudentProject,
  AssessmentQuestion,
  UGCDegreeSuggestion,
  VerifiedInstitution,
  VerifiedProgram,
  ProgramHierarchyResponse,
  AcademicValidationResult,
} from '../types';

const rawApiUrl = (import.meta as any).env?.VITE_API_URL || 'https://sih26044-ayush-portal-production.up.railway.app/api';
const BASE_URL = rawApiUrl.replace(/\/+$/, '');

// Production request wrapper with real backend enforcement and HTTP status propagation
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
  timeoutMs: number = 20000
): Promise<{ data: T }> {
  const token = localStorage.getItem('ayush_portal_token');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    clearTimeout(timeoutId);

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json?.error?.message || `Request failed with status ${res.status}`);
      (err as any).status = res.status;
      throw err;
    }
    return json;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Request timed out. Please verify backend server is reachable.');
      (timeoutErr as any).status = 408;
      throw timeoutErr;
    }
    throw err;
  }
}

export const authService = {
  login: async (email: string, password?: string, role: UserRole = 'student'): Promise<{ data: { user: User; token: string } }> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Invalid email or password');
      }
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Login timed out. Please check your network connection and retry.');
      }
      if (err.message && err.message !== 'Failed to fetch') {
        throw err;
      }
      throw new Error('Unable to reach backend server. Please verify the backend is running and reachable.');
    }
  },

  getMe: async (): Promise<{ data: { user: User } }> => {
    const token = localStorage.getItem('ayush_portal_token');
    if (!token) {
      const err = new Error('No token found');
      (err as any).status = 401;
      throw err;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.error?.message || 'Session expired');
        (err as any).status = res.status;
        throw err;
      }
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  },

  sendOtp: async (payload: { email: string; role: string; companyName?: string; facultyId?: string }): Promise<{ data: { success: boolean; message: string } }> => {
    return apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  uploadAvatar: async (file: File): Promise<{ data: { profilePicture: string; user: User } }> => {
    const token = localStorage.getItem('ayush_portal_token');
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await fetch(`${BASE_URL}/users/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json?.error?.message || 'Failed to upload profile picture');
      (err as any).status = res.status;
      throw err;
    }
    return json;
  },

  removeAvatar: async (): Promise<{ data: { profilePicture: string; user: User } }> => {
    return apiRequest('/users/avatar', {
      method: 'DELETE',
    });
  },

  signup: async (userData: Partial<User>): Promise<{ data: { user: User; token: string } }> => {
    try {
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.error?.message || 'Registration failed');
        (err as any).status = res.status;
        throw err;
      }
      return data;
    } catch (err: any) {
      if (err.status) throw err;
      const netErr = new Error('Unable to reach backend server. Please verify the backend is running and reachable.');
      (netErr as any).status = 503;
      throw netErr;
    }
  },

  resetPassword: async (email: string): Promise<{ data: { success: boolean; message: string } }> => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPasswordWithOtp: async (data: { email: string; otp: string; newPassword: string }): Promise<{ data: { success: boolean; message: string } }> => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  changePassword: async (data: { currentPassword: string; newPassword: string; userId?: string }): Promise<{ data: { success: boolean; message: string } }> => {
    const endpoint = data.userId ? `/users/${data.userId}/password` : '/users/password';
    return apiRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateProfile: async (userId: string, updates: Partial<User>): Promise<{ data: User }> => {
    return apiRequest(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }
};

export const internshipService = {
  getAll: async (filter?: { domain?: string; search?: string }): Promise<{ data: Internship[] }> => {
    const params = new URLSearchParams();
    if (filter?.domain) params.append('domain', filter.domain);
    if (filter?.search) params.append('search', filter.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/internships${qs}`);
  },

  getById: async (id: string): Promise<{ data: Internship | null }> => {
    return apiRequest(`/internships/${id}`);
  },

  create: async (payload: Omit<Internship, 'id' | 'postedDate' | 'status'>): Promise<{ data: Internship }> => {
    return apiRequest('/internships', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  apply: async (params: { opportunityId: string; userId: string; coverNote?: string; studentName?: string; studentEmail?: string }): Promise<{ data: Application }> => {
    return apiRequest(`/internships/${params.opportunityId}/apply`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  update: async (id: string, payload: Partial<Internship>): Promise<{ data: Internship }> => {
    return apiRequest(`/internships/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: string): Promise<{ data: { message: string } }> => {
    return apiRequest(`/internships/${id}`, {
      method: 'DELETE',
    });
  }
};

export const jobService = {
  getAll: async (filter?: { domain?: string; search?: string }): Promise<{ data: Job[] }> => {
    const params = new URLSearchParams();
    if (filter?.domain) params.append('domain', filter.domain);
    if (filter?.search) params.append('search', filter.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/jobs${qs}`);
  },

  getById: async (id: string): Promise<{ data: Job | null }> => {
    return apiRequest(`/jobs/${id}`);
  },

  create: async (payload: Omit<Job, 'id' | 'postedDate' | 'status'>): Promise<{ data: Job }> => {
    return apiRequest('/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  apply: async (params: { opportunityId: string; userId: string; coverNote?: string; studentName?: string; studentEmail?: string }): Promise<{ data: Application }> => {
    return apiRequest(`/jobs/${params.opportunityId}/apply`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  update: async (id: string, payload: Partial<Job>): Promise<{ data: Job }> => {
    return apiRequest(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: string): Promise<{ data: { message: string } }> => {
    return apiRequest(`/jobs/${id}`, {
      method: 'DELETE',
    });
  }
};

export const skillService = {
  getProfile: async (userId?: string): Promise<{ data: SkillProfile }> => {
    const qs = userId ? `?userId=${userId}` : '';
    return apiRequest(`/skills/profile${qs}`);
  },

  getQuestions: async (degree?: string, specialization?: string): Promise<{ data: AssessmentQuestion[] }> => {
    const params = new URLSearchParams();
    if (degree) params.append('degree', degree);
    if (specialization) params.append('specialization', specialization);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/skills/assessment/questions${qs}`);
  },

  submitAssessment: async (
    answers: Record<number, number>,
    proctoring?: any,
    questions?: any[]
  ): Promise<{ data: { score: number; profile: SkillProfile } }> => {
    return apiRequest('/skills/assessment/submit', {
      method: 'POST',
      body: JSON.stringify({ answers, proctoring, questions }),
    });
  },

  getPortfolioData: async (userId?: string): Promise<{ data: { certificates: StudentCertificate[]; projects: StudentProject[] } }> => {
    const qs = userId ? `?userId=${userId}` : '';
    return apiRequest(`/skills/portfolio${qs}`);
  },

  addPortfolioProject: async (project: Omit<StudentProject, 'id'>): Promise<{ data: StudentProject }> => {
    return apiRequest('/skills/portfolio/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }
};

export const learningService = {
  getAll: async (): Promise<{ data: LearningProgram[] }> => {
    return apiRequest('/learning/programs');
  },

  enroll: async (programId: string): Promise<{ data: { success: boolean; message: string } }> => {
    return apiRequest(`/learning/programs/${programId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  create: async (payload: Omit<LearningProgram, 'id' | 'rating' | 'enrolledCount'>): Promise<{ data: LearningProgram }> => {
    return apiRequest('/learning/programs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getWorkspace: async (courseId: string): Promise<{ data: any }> => {
    return apiRequest(`/learning/course/${courseId}/workspace`);
  },

  updateProgress: async (courseId: string, data: { lessonId: string; completed: boolean; submittedCode?: string; totalLessons?: number }): Promise<{ data: any }> => {
    return apiRequest(`/learning/course/${courseId}/progress`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getCertificate: async (certId: string): Promise<{ data: any }> => {
    return apiRequest(`/learning/certificate/${certId}`);
  }
};

export const applicationService = {
  getMyApplications: async (userId?: string): Promise<{ data: Application[] }> => {
    const qs = userId ? `?userId=${userId}` : '';
    return apiRequest(`/applications/my${qs}`);
  },

  getCompanyApplicants: async (companyName?: string): Promise<{ data: Application[] }> => {
    const qs = companyName ? `?companyName=${encodeURIComponent(companyName)}` : '';
    return apiRequest(`/applications/company${qs}`);
  },

  updateStatus: async (applicationId: string, status: Application['status']): Promise<{ data: Application }> => {
    return apiRequest(`/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
};

export const notificationService = {
  getAll: async (): Promise<{ data: Notification[] }> => {
    return apiRequest('/notifications');
  },

  markAsRead: async (id: string): Promise<{ data: boolean }> => {
    return apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  markAllAsRead: async (): Promise<{ data: boolean }> => {
    return apiRequest('/notifications/read-all', { method: 'PATCH' });
  },

  clearAll: async (): Promise<{ data: boolean }> => {
    return apiRequest('/notifications', { method: 'DELETE' });
  }
};

export const academicianService = {
  getFacultyOpportunities: async (): Promise<{ data: FacultyOpportunity[] }> => {
    return apiRequest('/academician/opportunities');
  },

  getWorkshops: async (): Promise<{ data: Workshop[] }> => {
    return apiRequest('/academician/workshops');
  },

  createWorkshop: async (workshop: Omit<Workshop, 'id' | 'registeredCount' | 'status'>): Promise<{ data: Workshop }> => {
    return apiRequest('/academician/workshops', {
      method: 'POST',
      body: JSON.stringify(workshop),
    });
  },

  getMentorshipRequests: async (): Promise<{ data: MentorshipRequest[] }> => {
    return apiRequest('/academician/mentorship/requests');
  },

  updateMentorshipStatus: async (id: string, status: MentorshipRequest['status']): Promise<{ data: MentorshipRequest }> => {
    return apiRequest(`/academician/mentorship/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
};

export const adminService = {
  getDashboardStats: async (): Promise<{ data: any }> => {
    return apiRequest('/admin/stats');
  },

  getPartners: async (): Promise<{ data: any[] }> => {
    return apiRequest('/admin/partners');
  },

  approvePartner: async (id: string): Promise<{ data: boolean }> => {
    return apiRequest(`/admin/partners/${id}/approve`, { method: 'PATCH' });
  },

  blockPartner: async (id: string): Promise<{ data: boolean }> => {
    return apiRequest(`/admin/partners/${id}/block`, { method: 'PATCH' });
  },

  getProgressAnalytics: async (): Promise<{ data: any }> => {
    return apiRequest('/admin/progress');
  },

  getReportsAnalytics: async (): Promise<{ data: any }> => {
    return apiRequest('/admin/reports');
  },

  getStudents: async (): Promise<{ data: any[] }> => {
    return apiRequest('/admin/students');
  }
};

export const aiServiceClient = {
  getSpecializations: async (degree: string): Promise<{ data: { degree: string; academicField: string; specializations: string[]; suggestedCareers: string[]; recommendedTopics: string[] } }> => {
    return apiRequest(`/ai/specializations?degree=${encodeURIComponent(degree)}`);
  },

  getDiagnostic: async (
    degree?: string,
    domain?: string,
    targetDomain?: string,
    specialization?: string
  ): Promise<{ data: { degree: string; domain?: string; targetDomain?: string; specialization?: string; questions: any[] } }> => {
    const params = new URLSearchParams();
    if (degree) params.append('degree', degree);
    if (domain) params.append('domain', domain);
    if (specialization) params.append('specialization', specialization);
    if (targetDomain) params.append('targetDomain', targetDomain);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/ai/diagnostic${queryString}`);
  },

  getStudyTimeline: async (
    domain?: string,
    targetDomain?: string,
    failedQuestions?: any[],
    correctCount?: number,
    totalAnswered?: number
  ): Promise<{ data: any }> => {
    return apiRequest('/ai/study-timeline', {
      method: 'POST',
      body: JSON.stringify({ domain, targetDomain, failedQuestions, correctCount, totalAnswered }),
    });
  },

  getRoadmaps: async (skills: string[], degree?: string): Promise<{ data: { roadmaps: any[]; credit: string; creditUrl: string } }> => {
    return apiRequest('/ai/roadmaps', {
      method: 'POST',
      body: JSON.stringify({ skills, degree }),
    });
  },

  submitDiagnostic: async (answers: any[], degree?: string, proctoring?: any): Promise<{ data: { evaluation: any; profile: any } }> => {
    return apiRequest('/ai/diagnostic/submit', {
      method: 'POST',
      body: JSON.stringify({ answers, degree, proctoring }),
    });
  },
};

export const meetingService = {
  schedule: async (data: any): Promise<{ data: any }> => {
    return apiRequest('/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMyMeetings: async (): Promise<{ data: any[] }> => {
    return apiRequest('/meetings');
  },

  getById: async (id: string): Promise<{ data: any }> => {
    return apiRequest(`/meetings/${id}`);
  },
};

export const userService = {
  ...authService,
  getCandidates: async (): Promise<{ data: any[] }> => {
    return apiRequest('/users/candidates');
  },
};

export const mouService = {
  createProposal: async (data: any): Promise<{ data: any }> => {
    return apiRequest('/mous/propose', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getProposals: async (): Promise<{ data: any[] }> => {
    return apiRequest('/mous');
  },

  reviewProposal: async (id: string, status: 'approved' | 'rejected', reviewNotes?: string): Promise<{ data: any }> => {
    return apiRequest(`/mous/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, reviewNotes }),
    });
  },
};

// Client-side cache for high-frequency queries (0ms instant response)
const clientCache = new Map<string, { data: any; expiry: number }>();
const getCached = <T>(key: string): T | null => {
  const entry = clientCache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  return null;
};
const setCached = <T>(key: string, data: T, ttlMs = 10 * 60 * 1000): T => {
  if (clientCache.size > 200) {
    const oldest = clientCache.keys().next().value;
    if (oldest) clientCache.delete(oldest);
  }
  clientCache.set(key, { data, expiry: Date.now() + ttlMs });
  return data;
};

export const ugcService = {
  searchDegrees: async (query: string, type: 'degree' | 'field' = 'degree'): Promise<{ data: { suggestions: UGCDegreeSuggestion[] } }> => {
    const key = `ugc:${type}:${query.trim().toLowerCase()}`;
    const cached = getCached<{ data: { suggestions: UGCDegreeSuggestion[] } }>(key);
    if (cached) return cached;

    const params = new URLSearchParams();
    params.append('q', query);
    params.append('type', type);
    const res = await apiRequest<{ suggestions: UGCDegreeSuggestion[] }>(`/degrees/search?${params.toString()}`);
    return setCached(key, res);
  }
};

export const academicService = {
  searchInstitutions: async (query: string): Promise<{ data: { institutions: VerifiedInstitution[] } }> => {
    const key = `inst:${query.trim().toLowerCase()}`;
    const cached = getCached<{ data: { institutions: VerifiedInstitution[] } }>(key);
    if (cached) return cached;

    const params = new URLSearchParams({ q: query });
    const res = await apiRequest<{ institutions: VerifiedInstitution[] }>(`/academic/institutions?${params.toString()}`);
    return setCached(key, res);
  },

  getPrograms: async (institution: string, affiliatingUniversity?: string): Promise<{ data: { programs: VerifiedProgram[] } }> => {
    const key = `progs:${institution.trim().toLowerCase()}:${(affiliatingUniversity || '').trim().toLowerCase()}`;
    const cached = getCached<{ data: { programs: VerifiedProgram[] } }>(key);
    if (cached) return cached;

    const params = new URLSearchParams({ institution });
    if (affiliatingUniversity) {
      params.append('affiliatingUniversity', affiliatingUniversity);
    }
    const res = await apiRequest<{ programs: VerifiedProgram[] }>(`/academic/programs?${params.toString()}`);
    return setCached(key, res);
  },

  getHierarchy: async (institution: string, degree: string): Promise<{ data: ProgramHierarchyResponse }> => {
    const key = `hier:${institution.trim().toLowerCase()}:${degree.trim().toLowerCase()}`;
    const cached = getCached<{ data: ProgramHierarchyResponse }>(key);
    if (cached) return cached;

    const params = new URLSearchParams({ institution, degree });
    const res = await apiRequest<ProgramHierarchyResponse>(`/academic/hierarchy?${params.toString()}`);
    return setCached(key, res);
  },

  validateCombination: async (payload: {
    institution: string;
    degree: string;
    department?: string;
    specialization?: string;
  }): Promise<{ data: AcademicValidationResult }> => {
    return apiRequest('/academic/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export const api = {
  auth: authService,
  users: userService,
  internships: internshipService,
  jobs: jobService,
  skills: skillService,
  learning: learningService,
  applications: applicationService,
  notifications: notificationService,
  academician: academicianService,
  admin: {
    ...adminService,
    getStudents: async (): Promise<{ data: any[] }> => {
      return apiRequest('/admin/students');
    },
  },
  meetings: meetingService,
  ai: aiServiceClient,
  mous: mouService,
  ugc: ugcService,
  academic: academicService,
};

export default api;
