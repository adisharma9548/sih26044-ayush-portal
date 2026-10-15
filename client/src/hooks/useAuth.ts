import { useAuthStore } from '../store/useAuthStore';

export const useAuth = () => {
  const {
    user,
    role,
    token,
    isAuthenticated,
    isLoading,
    isCheckingAuth,
    error,
    login,
    signup,
    logout,
    checkAuth,
    updateProfile,
    uploadAvatar,
    removeAvatar,
  } = useAuthStore();

  return {
    user,
    role,
    token,
    isAuthenticated,
    isLoading,
    isCheckingAuth,
    error,
    login,
    signup,
    logout,
    checkAuth,
    refreshUser: checkAuth,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    isStudent: role === 'student',
    isJobSeeker: role === 'jobseeker',
    isIndustry: role === 'industry',
    isAcademician: role === 'academician',
    isInstitution: role === 'institution',
    isAdmin: role === 'admin',
  };
};
