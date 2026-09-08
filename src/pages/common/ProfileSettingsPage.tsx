import React, { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { User, ShieldCheck, Mail, Phone, MapPin, Building, Award, KeyRound, BellRing, Save, Camera, Trash2, Loader2, GraduationCap } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { UserAvatar } from '../../components/common/UserAvatar';
import { UGCDegreeSelector } from '../../components/common/UGCDegreeSelector';

export const ProfileSettingsPage: React.FC = () => {
  const { user, role, updateProfile, uploadAvatar, removeAvatar, isLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [successMsg, setSuccessMsg] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    institution: user?.institution || '',
    department: user?.department || '',
    degree: user?.degree || '',
    graduationYear: user?.graduationYear ? String(user.graduationYear) : '',
    bio: user?.bio || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailAlerts: true,
    smsAlerts: false,
    opportunityMatchAlerts: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image size should be less than 5MB.');
      return;
    }

    setIsUploading(true);
    setAvatarError('');
    try {
      await uploadAvatar(file);
      setSuccessMsg('Profile picture updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploading(true);
    setAvatarError('');
    try {
      await removeAvatar();
      setSuccessMsg('Profile picture removed. Reverted to initial letter avatar.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to remove profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      name: formData.name,
      phone: formData.phone,
      location: formData.location,
      bio: formData.bio,
      institution: formData.institution,
      department: formData.department,
      degree: formData.degree,
      graduationYear: formData.graduationYear ? parseInt(formData.graduationYear, 10) : undefined,
    });
    setSuccessMsg('Profile updated successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (formData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    try {
      await api.auth.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      setSuccessMsg('Security credentials updated successfully in database.');
      setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please check your current password.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Profile & Account Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your verified credentials, contact data, and security settings
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="flex flex-col items-center gap-2">
          <UserAvatar user={user} size="xl" className="ring-4 ring-slate-100" />
          <div className="flex items-center gap-2 mt-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              <span>{user?.profilePicture ? 'Change Photo' : 'Upload Photo'}</span>
            </button>
            {user?.profilePicture && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isUploading}
                title="Remove photo and use name initial"
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {avatarError && <p className="text-[10px] text-red-600 max-w-[160px] text-center">{avatarError}</p>}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
            <Badge variant="emerald" size="sm">
              VERIFIED {role.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">{user?.institution || 'Institution Not Specified'}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 mt-3">
            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {user?.email}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {user?.location || 'India'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>General Profile</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'security'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Security & Password</span>
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'preferences'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>Notifications</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Email (Locked)</label>
              <input
                type="email"
                disabled
                value={formData.email}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Contact</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Location / City</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Institution / Enterprise</label>
              <input
                type="text"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Department / Division</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <UGCDegreeSelector
                value={formData.degree}
                onChange={(val) => setFormData(prev => ({ ...prev, degree: val }))}
                placeholder="Search UGC qualification (e.g. B.Tech, MCA, BAMS)..."
                label="Degree / Academic Field (UGC Section 22)"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Graduation / Completion Year</label>
              <input
                type="number"
                name="graduationYear"
                min="1970"
                max="2035"
                placeholder="e.g. 2026"
                value={formData.graduationYear}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Professional Bio & Research Focus</label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <form onSubmit={handleSavePassword} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="max-w-md space-y-4">
            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {passwordError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
              <input
                type="password"
                required
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
              <input
                type="password"
                required
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                required
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              Update Password
            </button>
          </div>
        </form>
      )}

      {activeTab === 'preferences' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900">Email Alerts on Application Status</p>
                <p className="text-[11px] text-slate-500">Receive an email whenever an industry recruiter reviews or shortlists your profile</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-emerald-500" />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900">AI Skill-Match Recommendations</p>
                <p className="text-[11px] text-slate-500">Weekly digests of newly posted opportunities matching your skill profile</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-emerald-500" />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900">SMS / WhatsApp Interview Alerts</p>
                <p className="text-[11px] text-slate-500">High-priority SMS reminders 2 hours before scheduled technical interviews</p>
              </div>
              <input type="checkbox" className="rounded text-emerald-600 focus:ring-emerald-500" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
