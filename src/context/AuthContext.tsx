import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, UserRole } from '../types/solar';
import { storageService } from '../services/storage';
import {
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  sendPasswordReset,
  subscribeToAuthState,
  isFirebaseConfigured,
  getFirebaseErrorMessage
} from '../services/firebase';

export interface RoleDefinition {
  role: UserRole;
  department: string;
  description: string;
  badgeColor: string;
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role: 'Super Admin',
    department: 'Management',
    description: 'Full system control, financial authority & executive oversight',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  {
    role: 'Admin',
    department: 'Administration',
    description: 'User management, configuration, operational administration',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300'
  },
  {
    role: 'Project Manager',
    department: 'Operations',
    description: 'Manages all projects, approves workflow stages, coordinates teams',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  {
    role: 'Site Survey Engineer',
    department: 'Engineering',
    description: 'Executes technical surveys, captures GPS & roof feasibility',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  {
    role: 'Sales Manager',
    department: 'Sales',
    description: 'Leads, CRM pipeline, quotation builder, customer conversion',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  {
    role: 'Sales Executive',
    department: 'Sales',
    description: 'Handles new inquiries, proposal follow-ups, and lead logging',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300'
  },
  {
    role: 'Structure Team',
    department: 'Structure',
    description: 'Structure mounting checklists, fabrication photos & tilt alignment',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300'
  },
  {
    role: 'Civil Team',
    department: 'Civil',
    description: 'Foundation casting, pedestal waterproofing, civil task checklists',
    badgeColor: 'bg-stone-100 text-stone-800 border-stone-300'
  },
  {
    role: 'Installation Team',
    department: 'Installation',
    description: 'Solar PV module clamping, string cabling, and field safety',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300'
  },
  {
    role: 'Electrical Team',
    department: 'Electrical',
    description: 'Inverters, ACDB/DCDB, LT breaker tapping, chemical earth pits',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300'
  },
  {
    role: 'Accountant',
    department: 'Finance',
    description: 'Payments, invoices, ledger, cash flow, and Tally sync queue',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300'
  },
  {
    role: 'HR Manager',
    department: 'HR',
    description: 'Employee directory, daily attendance, GPS logs, payroll & leave',
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-300'
  },
  {
    role: 'Service Manager',
    department: 'Service',
    description: 'Service breakdown tickets, preventive maintenance, AMC renewals',
    badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  },
  {
    role: 'Technician',
    department: 'Service',
    description: 'On-site breakdown troubleshooting, inverter repair, panel washing',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300'
  },
  {
    role: 'Customer',
    department: 'Customer',
    description: 'Client Portal: view project progress, invoices, warranties',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  }
];

// Compatibility wrapper for SettingsView and existing consumers
export const PRESET_PERSONAS = ROLE_DEFINITIONS.map(r => ({
  profile: {
    id: `role-${r.role.toLowerCase().replace(/\s+/g, '-')}`,
    name: r.role,
    email: `${r.role.toLowerCase().replace(/\s+/g, '.')}@solarpulse.com`,
    role: r.role,
    phone: '+91 98000 00000',
    department: r.department,
    designation: r.role
  },
  description: r.description,
  badgeColor: r.badgeColor
}));

export interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: User | null;
  currentRole: UserRole;
  loading: boolean;
  isAuthenticated: boolean;
  isFirebaseReady: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (
    email: string,
    pass: string,
    name: string,
    role?: UserRole,
    department?: string,
    designation?: string,
    phone?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateRole: (newRole: UserRole) => void;
  switchPersona: (profile: UserProfile) => void;
  canAccessModule: (moduleName: string) => boolean;
  hasPermission: (permissionId: string) => boolean;
  canApproveStage: () => boolean;
  canEditFinancials: () => boolean;
  canAccessHR: () => boolean;
  canManageProjectAssignments: () => boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  isFieldStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_PROFILE_STORAGE_KEY = 'solarpulse_firebase_profile_';
const OFFLINE_SESSION_STORAGE_KEY = 'solarpulse_offline_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isFirebaseReady = isFirebaseConfigured();

  // Helper to build or retrieve an application profile associated with the Firebase User
  const resolveProfileForUser = (user: User): UserProfile => {
    const storageKey = USER_PROFILE_STORAGE_KEY + user.uid;
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          id: user.uid,
          email: user.email || parsed.email || ''
        };
      } catch {
        // fallback to fresh build
      }
    }

    const defaultRole: UserRole = 'Super Admin';
    const profile: UserProfile = {
      id: user.uid,
      name: user.displayName || (user.email ? user.email.split('@')[0] : 'Solar User'),
      email: user.email || '',
      role: defaultRole,
      phone: user.phoneNumber || '+91 98250 11223',
      department: 'Management',
      designation: 'Managing Director',
      assignedProjects: []
    };

    localStorage.setItem(storageKey, JSON.stringify(profile));
    return profile;
  };

  // Monitor Firebase Auth state changes
  useEffect(() => {
    if (isFirebaseReady) {
      const unsubscribe = subscribeToAuthState((user) => {
        setFirebaseUser(user);
        if (user) {
          const profile = resolveProfileForUser(user);
          setCurrentUser(profile);
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Offline / Developer mode if Firebase keys are not yet added to .env
      const savedOffline = localStorage.getItem(OFFLINE_SESSION_STORAGE_KEY);
      if (savedOffline) {
        try {
          const parsed = JSON.parse(savedOffline);
          setCurrentUser(parsed);
        } catch {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    }
  }, [isFirebaseReady]);

  // Persist active user profile changes
  const saveUserProfile = (profile: UserProfile) => {
    setCurrentUser(profile);
    if (profile.id) {
      localStorage.setItem(USER_PROFILE_STORAGE_KEY + profile.id, JSON.stringify(profile));
    }
    if (!isFirebaseReady) {
      localStorage.setItem(OFFLINE_SESSION_STORAGE_KEY, JSON.stringify(profile));
    }
  };

  const login = async (email: string, pass: string): Promise<void> => {
    setLoading(true);
    try {
      if (isFirebaseReady) {
        const user = await loginWithEmail(email, pass);
        setFirebaseUser(user);
        const profile = resolveProfileForUser(user);
        saveUserProfile(profile);
      } else {
        // Fallback for pre-configuration local testing
        const offlineProfile: UserProfile = {
          id: 'usr-local-' + Date.now(),
          name: email.split('@')[0] || 'Solar Team Member',
          email: email.trim(),
          role: 'Super Admin',
          phone: '+91 98250 11223',
          department: 'Management',
          designation: 'Managing Director',
          assignedProjects: []
        };
        saveUserProfile(offlineProfile);
      }
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole = 'Super Admin',
    department?: string,
    designation?: string,
    phone: string = '+91 98250 11223'
  ): Promise<void> => {
    setLoading(true);
    try {
      if (isFirebaseReady) {
        const user = await registerWithEmail(email, pass, name);
        setFirebaseUser(user);
        const newProfile: UserProfile = {
          id: user.uid,
          name: name.trim() || (user.email ? user.email.split('@')[0] : 'Solar User'),
          email: user.email || email.trim(),
          role,
          phone,
          department: department || 'Operations',
          designation: designation || role,
          assignedProjects: []
        };
        saveUserProfile(newProfile);
      } else {
        const offlineProfile: UserProfile = {
          id: 'usr-local-' + Date.now(),
          name: name.trim() || email.split('@')[0],
          email: email.trim(),
          role,
          phone,
          department: department || 'Operations',
          designation: designation || role,
          assignedProjects: []
        };
        saveUserProfile(offlineProfile);
      }
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      if (isFirebaseReady) {
        await logoutUser();
      }
      localStorage.removeItem(OFFLINE_SESSION_STORAGE_KEY);
      setFirebaseUser(null);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    if (!isFirebaseReady) {
      throw new Error('Firebase Auth is not configured yet. Set VITE_FIREBASE_API_KEY in .env.');
    }
    try {
      await sendPasswordReset(email);
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    }
  };

  const updateRole = (newRole: UserRole) => {
    if (!currentUser) return;
    const def = ROLE_DEFINITIONS.find(r => r.role === newRole);
    const updated: UserProfile = {
      ...currentUser,
      role: newRole,
      department: def?.department || currentUser.department,
      designation: def?.role || currentUser.designation
    };
    saveUserProfile(updated);
  };

  const switchPersona = (profile: UserProfile) => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      role: profile.role,
      department: profile.department || currentUser.department,
      designation: profile.designation || currentUser.designation
    };
    saveUserProfile(updated);
  };

  const currentRole: UserRole = currentUser?.role || 'Super Admin';
  const isCustomer = currentRole === 'Customer';
  const isSuperAdmin = currentRole === 'Super Admin' || currentRole === 'Admin';
  const isProjectManager = currentRole === 'Project Manager';
  const isFieldStaff = [
    'Site Survey Engineer',
    'Civil Team',
    'Structure Team',
    'Installation Team',
    'Electrical Team',
    'Technician'
  ].includes(currentRole);

  const hasPermission = (permissionId: string): boolean => {
    if (isSuperAdmin) return true;
    return storageService.hasAclPermission(currentRole, permissionId);
  };

  const canApproveStage = (): boolean => {
    return isSuperAdmin || isProjectManager || hasPermission('projects.stage_approve');
  };

  const canEditFinancials = (): boolean => {
    return isSuperAdmin || currentRole === 'Accountant' || hasPermission('finance.invoices') || hasPermission('finance.receipts');
  };

  const canAccessHR = (): boolean => {
    return isSuperAdmin || currentRole === 'HR Manager' || hasPermission('hrms.manage');
  };

  const isAdmin = isSuperAdmin;

  const canManageProjectAssignments = (): boolean => {
    return isSuperAdmin || hasPermission('projects.assign_team');
  };

  const canAccessModule = (moduleName: string): boolean => {
    if (isSuperAdmin) return true;

    if (isCustomer) {
      return ['customer_portal', 'my_project', 'my_documents', 'my_payments', 'service_request'].includes(moduleName);
    }

    // Dynamic ACL checks:
    switch (moduleName) {
      case 'dashboard':
        return true;
      case 'crm':
      case 'leads':
        return hasPermission('crm.leads.view') || ['Sales Manager', 'Sales Executive', 'Project Manager'].includes(currentRole);
      case 'quotations':
        return hasPermission('crm.quotations.create') || ['Sales Manager', 'Sales Executive', 'Project Manager'].includes(currentRole);
      case 'sales_purchase':
      case 'sales':
      case 'purchase':
      case 'inventory':
      case 'bom':
      case 'vendors':
        return hasPermission('inventory.view') || !isCustomer;
      case 'customers':
      case 'projects':
      case 'workflow':
        return hasPermission('projects.view') || true;
      case 'site_survey':
        return hasPermission('survey.view') || isSuperAdmin || isProjectManager || currentRole === 'Site Survey Engineer' || currentRole.includes('Sales');
      case 'finance':
      case 'invoices':
      case 'accounting':
      case 'tally':
        return hasPermission('finance.view') || isSuperAdmin || currentRole === 'Accountant';
      case 'hrms':
      case 'employees':
      case 'attendance':
      case 'payroll':
        return hasPermission('hrms.view') || isSuperAdmin || currentRole === 'HR Manager';
      case 'service':
      case 'amc':
        return hasPermission('service.tickets_view') || isSuperAdmin || isProjectManager || currentRole === 'Service Manager' || currentRole === 'Technician';
      case 'reports':
        return hasPermission('reports.view') || isSuperAdmin || isProjectManager || currentRole === 'Sales Manager' || currentRole === 'Accountant';
      case 'settings':
      case 'roles':
        return hasPermission('settings.view') || isSuperAdmin;
      default:
        return true;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        currentRole,
        loading,
        isAuthenticated: Boolean(currentUser),
        isFirebaseReady,
        login,
        register,
        logout,
        resetPassword,
        updateRole,
        switchPersona,
        canAccessModule,
        hasPermission,
        canApproveStage,
        canEditFinancials,
        canAccessHR,
        canManageProjectAssignments,
        isAdmin,
        isCustomer,
        isFieldStaff
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
