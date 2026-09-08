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
    updateProfile,
    uploadAvatar,
    removeAvatar,
    isStudent: role === 'student',
    isJobSeeker: role === 'jobseeker',
    isIndustry: role === 'industry',
    isAcademician: role === 'academician',
    isAdmin: role === 'admin',
  };
};
