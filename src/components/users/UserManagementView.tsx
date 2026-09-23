import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth, ROLE_DEFINITIONS } from '../../context/AuthContext';
import { storageService } from '../../services/storage';
import { Employee, UserRole } from '../../types/solar';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit2,
  Lock,
  Mail,
  Phone,
  Briefcase,
  Building,
  Navigation,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  X,
  Eye,
  Key
} from 'lucide-react';

interface UserFormData {
  name: string;
  email: string;
  employeeCode: string;
  department: string;
  designation: string;
  role: UserRole;
  phone: string;
  isFieldWorker: boolean;
  loginEnabled: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  tempPassword?: string;
}

export const UserManagementView: React.FC = () => {
  const { showToast, triggerRefresh } = useApp();
  const { currentUser, isAdmin } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>(() => storageService.getEmployees());
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [fieldWorkerFilter, setFieldWorkerFilter] = useState<string>('ALL');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form state
  const initialForm: UserFormData = {
    name: '',
    email: '',
    employeeCode: `EMP${String(employees.length + 1).padStart(3, '0')}`,
    department: 'Operations',
    designation: 'Solar Engineer',
    role: 'Site Survey Engineer',
    phone: '+91 98000 00000',
    isFieldWorker: true,
    loginEnabled: true,
    status: 'ACTIVE',
    tempPassword: 'User@12345'
  };

  const [formData, setFormData] = useState<UserFormData>(initialForm);

  const reloadEmployees = () => {
    setEmployees(storageService.getEmployees());
  };

  // Filtered employees
  const filteredUsers = useMemo(() => {
    return employees.filter(emp => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        (emp.designation || '').toLowerCase().includes(q) ||
        (emp.department || '').toLowerCase().includes(q) ||
        (emp.systemRole || '').toLowerCase().includes(q);

      const matchesRole = roleFilter === 'ALL' || (emp.systemRole || emp.assignedRole) === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && emp.status === 'ACTIVE' && emp.accountStatus !== 'DISABLED') ||
        (statusFilter === 'DISABLED' && (emp.accountStatus === 'DISABLED' || emp.status === 'INACTIVE'));

      const isFw = Boolean(
        emp.isFieldWorker ??
        [
          'Site Survey Engineer',
          'Site Inspector',
          'Civil Team',
          'Structure Team',
          'Installation Team',
          'Electrical Team',
          'Technician'
        ].includes(emp.systemRole || '')
      );

      const matchesFieldWorker =
        fieldWorkerFilter === 'ALL' ||
        (fieldWorkerFilter === 'YES' && isFw) ||
        (fieldWorkerFilter === 'NO' && !isFw);

      return matchesSearch && matchesRole && matchesStatus && matchesFieldWorker;
    });
  }, [employees, searchTerm, roleFilter, statusFilter, fieldWorkerFilter]);

  // Status stats
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'ACTIVE' && e.accountStatus !== 'DISABLED').length;
    const fieldWorkers = employees.filter(e =>
      Boolean(
        e.isFieldWorker ??
        [
          'Site Survey Engineer',
          'Site Inspector',
          'Civil Team',
          'Structure Team',
          'Installation Team',
          'Electrical Team',
          'Technician'
        ].includes(e.systemRole || '')
      )
    ).length;
    const adminCount = employees.filter(e => e.systemRole === 'Admin').length;

    return { total, active, fieldWorkers, adminCount };
  }, [employees]);

  // Toggle user activation / deactivation
  const handleToggleStatus = (emp: Employee) => {
    if (emp.systemRole === 'Admin' && emp.id === 'emp-1') {
      showToast('The primary Admin account cannot be disabled.', 'error');
      return;
    }

    const isCurrentlyActive = emp.accountStatus !== 'DISABLED' && emp.status !== 'INACTIVE';
    const newStatus = isCurrentlyActive ? 'DISABLED' : 'ACTIVE';

    const updated = employees.map(e => {
      if (e.id === emp.id) {
        return {
          ...e,
          accountStatus: newStatus as any,
          loginEnabled: !isCurrentlyActive,
          status: isCurrentlyActive ? ('INACTIVE' as any) : ('ACTIVE' as any),
          updatedAt: new Date().toISOString()
        };
      }
      return e;
    });

    storageService.saveEmployees(updated);
    setEmployees(updated);
    triggerRefresh();

    showToast(
      `User ${emp.name} account ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully`,
      isCurrentlyActive ? 'warning' : 'success'
    );
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      ...initialForm,
      employeeCode: `EMP${String(employees.length + 1).padStart(3, '0')}`
    });
    setEditingEmployee(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      employeeCode: emp.employeeCode,
      department: emp.department || 'Operations',
      designation: emp.designation,
      role: emp.systemRole || emp.assignedRole || 'Site Survey Engineer',
      phone: emp.phone || '',
      isFieldWorker: Boolean(
        emp.isFieldWorker ??
        [
          'Site Survey Engineer',
          'Site Inspector',
          'Civil Team',
          'Structure Team',
          'Installation Team',
          'Electrical Team',
          'Technician'
        ].includes(emp.systemRole || '')
      ),
      loginEnabled: emp.loginEnabled ?? true,
      status: emp.accountStatus === 'DISABLED' || emp.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });
    setIsCreateModalOpen(true);
  };

  // Submit User Create / Edit
  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Please provide a valid name and email address.', 'error');
      return;
    }

    if (editingEmployee) {
      // Update existing
      const updated = employees.map(emp => {
        if (emp.id === editingEmployee.id) {
          return {
            ...emp,
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            employeeCode: formData.employeeCode.trim(),
            department: formData.department.trim(),
            designation: formData.designation.trim(),
            systemRole: formData.role,
            assignedRole: formData.role,
            phone: formData.phone.trim(),
            isFieldWorker: formData.isFieldWorker,
            loginEnabled: formData.loginEnabled,
            status: formData.status === 'ACTIVE' ? ('ACTIVE' as const) : ('INACTIVE' as const),
            accountStatus: formData.status === 'ACTIVE' ? ('ACTIVE' as const) : ('DISABLED' as const),
            updatedAt: new Date().toISOString()
          };
        }
        return emp;
      });

      storageService.saveEmployees(updated);
      setEmployees(updated);
      showToast(`User ${formData.name} updated successfully`, 'success');
    } else {
      // Create new
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        employeeCode: formData.employeeCode.trim() || `EMP${String(employees.length + 1).padStart(3, '0')}`,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || '+91 98000 00000',
        department: formData.department.trim() || 'Operations',
        designation: formData.designation.trim() || (formData.role as string),
        systemRole: formData.role,
        assignedRole: formData.role,
        isFieldWorker: formData.isFieldWorker,
        loginEnabled: formData.loginEnabled,
        status: formData.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        accountStatus: formData.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED',
        joiningDate: new Date().toISOString().split('T')[0],
        salaryMonthly: 50000,
        accountCreatedAt: new Date().toISOString(),
        accountCreatedBy: currentUser?.name || 'Admin',
        createdAt: new Date().toISOString()
      };

      const updated = [newEmp, ...employees];
      storageService.saveEmployees(updated);
      setEmployees(updated);
      showToast(`User ${newEmp.name} created successfully`, 'success');
    }

    triggerRefresh();
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              System Administration
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Access Control & Role Directory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            User Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage user accounts, roles, departments, employee IDs, and field worker tracking permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reloadEmployees}
            className="p-2.5 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Create User</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Users</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{stats.total}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Configured ERP profiles</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600">Active Accounts</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{stats.active}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Can authenticate into ERP</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600">Field Workers</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">{stats.fieldWorkers}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">GPS location tracking enabled</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600">Admin Authority</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-700">{stats.adminCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Root system administrators</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, employee code, designation..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Roles ({ROLE_DEFINITIONS.length})</option>
            {ROLE_DEFINITIONS.map(r => (
              <option key={r.role} value={r.role}>
                {r.role}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DISABLED">Disabled Only</option>
          </select>

          {/* Field Worker Filter */}
          <select
            value={fieldWorkerFilter}
            onChange={e => setFieldWorkerFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Personnel</option>
            <option value="YES">Field Workers Only</option>
            <option value="NO">Office / Non-Field</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">User & Code</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Operational Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Field Worker</th>
                <th className="py-3 px-4 text-center">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600">No users match your search criteria</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try clearing filters or adding a new user</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(emp => {
                  const roleDef = ROLE_DEFINITIONS.find(
                    r => r.role === (emp.systemRole || emp.assignedRole)
                  );
                  const isFw = Boolean(
                    emp.isFieldWorker ??
                    [
                      'Site Survey Engineer',
                      'Site Inspector',
                      'Civil Team',
                      'Structure Team',
                      'Installation Team',
                      'Electrical Team',
                      'Technician'
                    ].includes(emp.systemRole || '')
                  );
                  const isActive = emp.accountStatus !== 'DISABLED' && emp.status !== 'INACTIVE';
                  const isRootAdmin = emp.systemRole === 'Admin' && emp.id === 'emp-1';

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                            {emp.photoUrl ? (
                              <img
                                src={emp.photoUrl}
                                alt={emp.name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              emp.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{emp.name}</span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {emp.employeeCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{emp.email}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                            roleDef?.badgeColor || 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {emp.systemRole === 'Admin' && <ShieldCheck className="w-3 h-3" />}
                          {emp.systemRole || emp.assignedRole || 'Team Member'}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {emp.department || 'Operations'}
                      </td>

                      {/* Field Worker */}
                      <td className="py-3.5 px-4 text-center">
                        {isFw ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Navigation className="w-3 h-3 text-amber-600" />
                            <span>GPS Tracked</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit User & Role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(emp)}
                            disabled={isRootAdmin}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isRootAdmin
                                ? 'opacity-30 cursor-not-allowed text-slate-400'
                                : isActive
                                ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-700'
                                : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800'
                            }`}
                            title={
                              isRootAdmin
                                ? 'Root Admin cannot be disabled'
                                : isActive
                                ? 'Deactivate User Account'
                                : 'Activate User Account'
                            }
                          >
                            {isActive ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200/80 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingEmployee ? `Edit User: ${editingEmployee.name}` : 'Create New User'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assign role, credentials, department and field worker flags
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="space-y-4 mt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Employee ID / Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeCode}
                    onChange={e => setFormData({ ...formData, employeeCode: e.target.value })}
                    placeholder="e.g. EMP015"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Work Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. name@rejoysolar.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => {
                      const newRole = e.target.value as UserRole;
                      const roleDef = ROLE_DEFINITIONS.find(r => r.role === newRole);
                      const isFwRole = [
                        'Site Survey Engineer',
                        'Site Inspector',
                        'Civil Team',
                        'Structure Team',
                        'Installation Team',
                        'Electrical Team',
                        'Technician'
                      ].includes(newRole);

                      setFormData({
                        ...formData,
                        role: newRole,
                        department: roleDef?.department || formData.department,
                        isFieldWorker: isFwRole
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  >
                    {ROLE_DEFINITIONS.map(r => (
                      <option key={r.role} value={r.role}>
                        {r.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Engineering"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Job Designation
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Senior Site Engineer"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98250 11223"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              {!editingEmployee && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Password
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.tempPassword}
                      onChange={e => setFormData({ ...formData, tempPassword: e.target.value })}
                      placeholder="e.g. User@12345"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    The user will use this password on the /login page
                  </span>
                </div>
              )}

              {/* Toggles */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFieldWorker}
                    onChange={e => setFormData({ ...formData, isFieldWorker: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Field Worker (Live GPS Tracking)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Enable real-time location tracking on the Admin Live Tracking map
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.loginEnabled}
                    onChange={e => setFormData({ ...formData, loginEnabled: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Enable ERP Login
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Allow this user to sign into the system with their credentials
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {editingEmployee ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
