import React, { createContext, useReducer, useEffect, ReactNode } from 'react'
import { AuthService } from '../services/authService'
interface AuthState {
  user: any;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegistrationData {
  email: string;
  password: string;
  fullName: string;
}

interface AuthContextValue {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegistrationData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Initial state
const initialState: AuthState = {
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
}

// Action types
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: any }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' }

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        loading: false,
        error: null,
      }
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      }
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      }
    
    default:
      return state
  }
}

// Context
export const AuthContext = createContext<AuthContextValue | null>(null)

// Provider component
interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Initialize auth state
useEffect(() => {
  //console.log('=== AuthContext useEffect triggered ==='); // This should always show

  const initializeAuth = async () => {
    try {
      //console.log('=== initializeAuth function called ===');
      //console.log('AuthService object:', AuthService); // Check if AuthService exists
      
      const user = await AuthService.getCurrentUser()
      //console.log('=== AuthService.getCurrentUser returned ===', user);
      
      dispatch({ type: 'SET_USER', payload: user })
      //console.log('=== Dispatched SET_USER ===');
    } catch (error) {
      console.error('=== AUTH INITIALIZATION ERROR ===', error); // Changed to console.error
      dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize authentication' })
    }
  }

  initializeAuth()
}, [])

  // Login function
  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const user = await AuthService.login(credentials)
      //console.log('=== Login returned user ===', user); // DEBUG
      dispatch({ type: 'SET_USER', payload: user })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Login failed' })
     throw error
    }
  }

  // Register function
  const register = async (data: RegistrationData) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const user = await AuthService.register(data)
      dispatch({ type: 'SET_USER', payload: user })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Registration failed' })
      throw error
    }
  }

  // Logout function
  const logout = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      await AuthService.logout()
      dispatch({ type: 'LOGOUT' })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Logout failed' })
    }
  }

  // Reset password function
  const resetPassword = async (email: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      await AuthService.resetPassword(email)
      dispatch({ type: 'SET_LOADING', payload: false })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Password reset failed' })
      throw error
    }
  }



  // Refresh user function
  const refreshUser = async () => {
    try {
      const user = await AuthService.getCurrentUser()
      dispatch({ type: 'SET_USER', payload: user })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to refresh user data' })
    }
  }

  const contextValue: AuthContextValue = {
    state,
    login,
    register,
    logout,
    resetPassword,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}