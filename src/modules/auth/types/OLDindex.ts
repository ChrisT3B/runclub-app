// Authentication type definitions

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

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;                        // ← Add this
  emergency_contact_name?: string;       // ← Add this  
  emergency_contact_phone?: string;      // ← Add this
  health_conditions?: string;            // ← Add this
  accessLevel: string;
  membershipStatus: string;
  emailVerified: boolean;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface AuthContextValue {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegistrationData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}