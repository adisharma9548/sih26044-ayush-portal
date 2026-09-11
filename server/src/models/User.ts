import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'student' | 'jobseeker' | 'industry' | 'academician' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
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
  ayushDomain?: string;
  facultyId?: string;
  currentDomain?: string;
  targetDomain?: string;
  loginCount: number;
  lastLoginAt?: Date;
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
    roadmaps?: any[];
    createdAt?: Date;
  };
  isEmailVerified: boolean;
  verified: boolean;
  requiresPasswordReset?: boolean;
  passwordChangedAt?: Date;
  academicContextHash?: string;
  academicContextVersion?: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toSafeObject(): any;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, select: false },
    role: {
      type: String,
      required: true,
      enum: ['student', 'jobseeker', 'industry', 'academician', 'admin'],
      default: 'student',
      index: true,
    },
    profilePicture: { type: String, default: '' },
    institution: { type: String, default: '' },
    industry: { type: String, default: '' },
    department: { type: String, default: '' },
    designation: { type: String, default: '' },
    degree: { type: String, default: '' },
    academicField: { type: String, default: '' },
    specialization: { type: String, default: '' },
    graduationYear: { type: Number },
    location: { type: String, default: '' },
    phone: { type: String, default: '' },
    bio: { type: String, default: '' },
    facultyId: { type: String, default: '' },
    currentDomain: { type: String, default: '' },
    targetDomain: { type: String, default: '' },
    loginCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    studyRoadmap: { type: Schema.Types.Mixed, default: null },
    skills: [{ type: String }],
    ayushDomain: {
      type: String,
      default: '',
    },
    isEmailVerified: { type: Boolean, default: false },
    verified: { type: Boolean, default: true },
    requiresPasswordReset: { type: Boolean, default: false },
    passwordChangedAt: { type: Date },
    academicContextHash: { type: String, default: '' },
    academicContextVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, department: 1 });
UserSchema.index({ role: 1, institution: 1 });

// Password hashing hook
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Return safe user object matching frontend expectations
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  delete obj.password;
  return obj;
};

export const User = mongoose.model<IUser>('User', UserSchema);
