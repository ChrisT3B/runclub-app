// src/modules/auth/types/index.ts
// Authentication type definitions - Updated with React Query integration

import { User as SupabaseUser, Session } from '@supabase/supabase-js';

// Keep your existing interfaces, enhanced
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  healthConditions?: string;
}

// Enhanced User interface to match your database structure
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  health_conditions?: string;
  accessLevel: string;
  membershipStatus: string;
  emailVerified: boolean;
}

// Database Member interface (matches your members table)
export interface Member {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  access_level: 'member' | 'lirf' | 'admin';
  membership_status: 'pending' | 'active' | 'suspended';
  emergency_contact_name: string;
  emergency_contact_phone: string;
  health_conditions: string;
  created_at: string;
  updated_at: string;
}

// Enhanced AuthState with React Query integration
export interface AuthState {
  user: SupabaseUser | null | undefined;
  member: Member | null | undefined;
  session: Session | null | undefined;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

// Enhanced AuthContext with React Query mutations
export interface AuthContextValue {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegistrationData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResponse>;
  updatePassword: (data: UpdatePasswordData) => Promise<AuthResponse>;
  verifyEmail: (token: string) => Promise<EmailVerificationResult>;
  resendVerification: (email: string) => Promise<AuthResponse>;
  permissions: UserPermissions;
  
  // React Query mutation states for loading indicators
  loginMutation: any;
  registerMutation: any;
  verifyEmailMutation: any;
  resendVerificationMutation: any;
  resetPasswordMutation: any;
  updatePasswordMutation: any;
  logoutMutation: any;
}

// Additional types for enhanced functionality
export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResponse<T = any> {
  data: T | null;
  error: AuthError | null;
}

export interface PasswordResetData {
  email: string;
}

export interface UpdatePasswordData {
  password: string;
  confirmPassword: string;
}

export interface EmailVerificationResult {
  success: boolean;
  message: string;
  user?: SupabaseUser | null;  // ← Add | null here

}

// Form validation interfaces
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  healthConditions: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

// Permission system
export interface UserPermissions {
  canManageRuns: boolean;
  canManageMembers: boolean;
  canViewAllBookings: boolean;
  canAssignLIRF: boolean;
  accessLevel: 'member' | 'lirf' | 'admin';
}

// Utility types
export type AccessLevel = Member['access_level'];
export type MembershipStatus = Member['membership_status'];