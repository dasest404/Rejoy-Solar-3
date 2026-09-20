import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, SolarProject, AppNotification, SystemSettings } from '../types/solar';
import { storageService } from '../services/storage';
import { ExportModule } from '../services/exportImport';
import { ReportCategory } from '../types/reports';

export type SettingsTab = 'general' | 'tally' | 'whatsapp' | 'acl';

export type AppView =
  | 'dashboard'
  | 'crm_leads'
  | 'crm_customers'
  | 'crm_quotations'
  | 'projects_all'
  | 'projects_stage_filtered'
  | 'customer_control_center'
  | 'sales_purchase'
  | 'sales_bom'
  | 'sales_invoices'
  | 'purchase_vendors'
  | 'purchase_orders'
  | 'inventory_products'
  | 'inventory_stock'
  | 'finance'
  | 'hrms'
  | 'service'
  | 'reports'
  | 'settings'
  | 'customer_portal';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

interface AppContextType {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  selectedCustomerId: string | null;
  selectedProjectId: string | null;
  openCustomerControlCenter: (customerId: string, projectId?: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isWhatsAppOpen: boolean;
  whatsAppData: {
    recipientPhone: string;
    recipientName: string;
    type: any;
    data: any;
  } | null;
  openWhatsAppModal: (phone: string, name: string, type: any, data: any) => void;
  closeWhatsAppModal: () => void;
  isImportExportOpen: boolean;
  importExportModule: ExportModule;
  openImportExportModal: (module: ExportModule) => void;
  closeImportExportModal: () => void;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  settings: SystemSettings;
  updateSettings: (newSettings: SystemSettings) => void;
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  stageFilterKey: string | null;
  setStageFilterKey: (key: string | null) => void;
  activeReportCategory: ReportCategory;
  setActiveReportCategory: (category: ReportCategory) => void;
  openReport: (category: ReportCategory) => void;
  activeSettingsTab: SettingsTab;
  setActiveSettingsTab: (tab: SettingsTab) => void;
  openSettingsTab: (tab: SettingsTab) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const getInitialViewFromPath = (): { view: AppView; filterKey: string | null; settingsTab?: SettingsTab } => {
  if (typeof window === 'undefined') {
    return { view: 'dashboard', filterKey: null, settingsTab: 'general' };
  }
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  switch (path) {
    case '/customers':
      return { view: 'crm_customers', filterKey: null };
    case '/crm':
    case '/leads':
      return { view: 'crm_leads', filterKey: null };
    case '/quotations':
      return { view: 'crm_quotations', filterKey: null };
    case '/projects':
      return { view: 'projects_all', filterKey: null };
    case '/site-visits':
      return { view: 'projects_stage_filtered', filterKey: 'site_survey' };
    case '/installations':
      return { view: 'projects_stage_filtered', filterKey: 'module_mounting' };
    case '/services':
    case '/service':
      return { view: 'service', filterKey: null };
    case '/reports':
      return { view: 'reports', filterKey: null };
    case '/settings/acl':
    case '/acl':
    case '/roles':
      return { view: 'settings', filterKey: null, settingsTab: 'acl' };
    case '/settings/tally':
      return { view: 'settings', filterKey: null, settingsTab: 'tally' };
    case '/settings/whatsapp':
      return { view: 'settings', filterKey: null, settingsTab: 'whatsapp' };
    case '/settings':
      return { view: 'settings', filterKey: null, settingsTab: 'general' };
    case '/finance':
      return { view: 'finance', filterKey: null };
    case '/hrms':
      return { view: 'hrms', filterKey: null };
    case '/customer-portal':
    case '/portal':
      return { view: 'customer_portal', filterKey: null };
    case '/control-center':
    case '/customer-control-center':
      return { view: 'customer_control_center', filterKey: null };
    case '/':
    case '/dashboard':
    default:
      return { view: 'dashboard', filterKey: null };
  }
};

const getPathForView = (view: AppView, filterKey?: string | null): string => {
  switch (view) {
    case 'dashboard':
      return '/dashboard';
    case 'crm_leads':
      return '/leads';
    case 'crm_customers':
      return '/customers';
    case 'crm_quotations':
      return '/quotations';
    case 'projects_all':
      return '/projects';
    case 'projects_stage_filtered':
      if (filterKey === 'site_survey') return '/site-visits';
      if (filterKey === 'module_mounting') return '/installations';
      return '/projects';
    case 'customer_control_center':
      return '/control-center';
    case 'finance':
      return '/finance';
    case 'hrms':
      return '/hrms';
    case 'service':
      return '/services';
    case 'reports':
      return '/reports';
    case 'settings':
      return '/settings';
    case 'customer_portal':
      return '/customer-portal';
    default:
      return '/dashboard';
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialRoute = getInitialViewFromPath();
  const [activeView, setActiveViewState] = useState<AppView>(initialRoute.view);
  const [stageFilterKey, setStageFilterKeyInternal] = useState<string | null>(initialRoute.filterKey);
  const [activeReportCategory, setActiveReportCategory] = useState<ReportCategory>('sales');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>(initialRoute.settingsTab || 'general');

  const openReport = (category: ReportCategory) => {
    setActiveReportCategory(category);
    setActiveView('reports');
  };

  const openSettingsTab = (tab: SettingsTab) => {
    setActiveSettingsTab(tab);
    setActiveView('settings');
  };

  const setActiveView = (view: AppView) => {
    setActiveViewState(view);
    if (typeof window !== 'undefined') {
      const targetPath = getPathForView(view, stageFilterKey);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view }, '', targetPath);
      }
    }
  };

  const setStageFilterKey = (key: string | null) => {
    setStageFilterKeyInternal(key);
    if (typeof window !== 'undefined' && activeView === 'projects_stage_filtered') {
      const targetPath = getPathForView('projects_stage_filtered', key);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view: 'projects_stage_filtered', filter: key }, '', targetPath);
      }
    }
  };

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const current = getInitialViewFromPath();
      setActiveViewState(current.view);
      setStageFilterKeyInternal(current.filterKey);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>('cust-1');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>('proj-1');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppData, setWhatsAppData] = useState<{
    recipientPhone: string;
    recipientName: string;
    type: any;
    data: any;
  } | null>(null);

  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importExportModule, setImportExportModule] = useState<ExportModule>('Leads');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(() => storageService.getSettings());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    setNotifications(storageService.getNotifications());
    setSettings(storageService.getSettings());

    const handleStorageUpdate = () => {
      setNotifications(storageService.getNotifications());
      setSettings(storageService.getSettings());
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('solarpulse_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('solarpulse_storage_updated', handleStorageUpdate);
  }, []);

  const openCustomerControlCenter = (customerId: string, projectId?: string) => {
    setSelectedCustomerId(customerId);
    if (projectId) {
      setSelectedProjectId(projectId);
    } else {
      const customers = storageService.getCustomers();
      const c = customers.find(item => item.id === customerId);
      if (c && c.activeProjectId) {
        setSelectedProjectId(c.activeProjectId);
      }
    }
    setActiveView('customer_control_center');
  };

  const openWhatsAppModal = (phone: string, name: string, type: any, data: any) => {
    setWhatsAppData({
      recipientPhone: phone,
      recipientName: name,
      type,
      data
    });
    setIsWhatsAppOpen(true);
  };

  const closeWhatsAppModal = () => {
    setIsWhatsAppOpen(false);
    setWhatsAppData(null);
  };

  const openImportExportModal = (module: ExportModule) => {
    setImportExportModule(module);
    setIsImportExportOpen(true);
  };

  const closeImportExportModal = () => {
    setIsImportExportOpen(false);
  };

  const markNotificationRead = (id: string) => {
    storageService.markNotificationAsRead(id);
    setNotifications(storageService.getNotifications());
  };

  const markAllNotificationsRead = () => {
    storageService.markAllNotificationsAsRead();
    setNotifications(storageService.getNotifications());
  };

  const updateSettings = (newSettings: SystemSettings) => {
    storageService.saveSettings(newSettings);
    setSettings(newSettings);
    showToast('System configuration saved successfully', 'success');
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedCustomerId,
        selectedProjectId,
        openCustomerControlCenter,
        isSearchOpen,
        setIsSearchOpen,
        isWhatsAppOpen,
        whatsAppData,
        openWhatsAppModal,
        closeWhatsAppModal,
        isImportExportOpen,
        importExportModule,
        openImportExportModal,
        closeImportExportModal,
        notifications,
        unreadNotificationsCount,
        markNotificationRead,
        markAllNotificationsRead,
        settings,
        updateSettings,
        toasts,
        showToast,
        removeToast,
        stageFilterKey,
        setStageFilterKey,
        activeReportCategory,
        setActiveReportCategory,
        openReport,
        activeSettingsTab,
        setActiveSettingsTab,
        openSettingsTab,
        refreshTrigger,
        triggerRefresh
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
