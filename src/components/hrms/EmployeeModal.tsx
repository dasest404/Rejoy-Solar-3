import React, { useState, useEffect } from 'react';
import { Employee } from '../../types/solar';
import { X, UserPlus, Save, AlertCircle, Building2, Briefcase, Phone, Mail, Calendar, DollarSign, Image, MapPin } from 'lucide-react';
import { validateEmployee, DuplicateRecordError } from '../../services/validation';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  employeeToEdit?: Employee | null;
  existingEmployees: Employee[];
}

const DEPARTMENTS: Employee['department'][] = [
  'Management',
  'Sales',
  'Engineering',
  'Civil',
  'Structure',
  'Electrical',
  'Operations',
  'Finance',
  'HR',
  'Service',
  'Installation'
];

const STATUSES: Employee['status'][] = [
  'ACTIVE',
  'ON LEAVE',
  'IN FIELD',
  'TERMINATED'
];

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employeeToEdit,
  existingEmployees
}) => {
  const isEditing = Boolean(employeeToEdit);

  const [formData, setFormData] = useState({
    name: '',
    employeeCode: '',
    department: 'Engineering' as Employee['department'],
    designation: '',
    phone: '',
    email: '',
    joiningDate: new Date().toISOString().slice(0, 10),
    salaryMonthly: 45000,
    status: 'ACTIVE' as Employee['status'],
    photoUrl: '',
    currentSiteLocation: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employeeToEdit) {
      setFormData({
        name: employeeToEdit.name || '',
        employeeCode: employeeToEdit.employeeCode || '',
        department: employeeToEdit.department || 'Engineering',
        designation: employeeToEdit.designation || '',
        phone: employeeToEdit.phone || '',
        email: employeeToEdit.email || '',
        joiningDate: employeeToEdit.joiningDate || new Date().toISOString().slice(0, 10),
        salaryMonthly: employeeToEdit.salaryMonthly ?? 45000,
        status: employeeToEdit.status || 'ACTIVE',
        photoUrl: employeeToEdit.photoUrl || '',
        currentSiteLocation: employeeToEdit.currentSiteLocation || ''
      });
    } else {
      // Suggest next employee code
      const nextNum = existingEmployees.length + 101;
      setFormData({
        name: '',
        employeeCode: `EMP-${nextNum}`,
        department: 'Engineering',
        designation: '',
        phone: '+91 ',
        email: '',
        joiningDate: new Date().toISOString().slice(0, 10),
        salaryMonthly: 45000,
        status: 'ACTIVE',
        photoUrl: '',
        currentSiteLocation: ''
      });
    }
    setErrors({});
  }, [employeeToEdit, isOpen, existingEmployees.length]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.';
    }

    const trimmedCode = formData.employeeCode.trim();
    if (!trimmedCode) {
      newErrors.employeeCode = 'Employee code is required.';
    }

    if (!formData.designation.trim()) {
      newErrors.designation = 'Designation/role is required.';
    }

    const trimmedPhone = formData.phone.trim();
    if (!trimmedPhone || trimmedPhone.replace(/\D/g, '').length < 8) {
      newErrors.phone = 'Valid contact phone number is required (at least 8 digits).';
    }

    const trimmedEmail = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address (e.g. name@company.com).';
    }

    if (!formData.joiningDate) {
      newErrors.joiningDate = 'Joining date is required.';
    }

    if (formData.salaryMonthly < 0 || isNaN(formData.salaryMonthly)) {
      newErrors.salaryMonthly = 'Salary must be a non-negative number.';
    }

    // Comprehensive duplicate validation across code, phone, and email
    const dupCheck = validateEmployee(
      {
        name: formData.name,
        employeeCode: formData.employeeCode,
        phone: formData.phone,
        email: formData.email
      },
      existingEmployees,
      employeeToEdit?.id
    );

    if (!dupCheck.valid && dupCheck.field) {
      newErrors[dupCheck.field] = dupCheck.message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const finalEmployee: Employee = {
        id: employeeToEdit ? employeeToEdit.id : `emp-${Date.now()}`,
        name: formData.name.trim(),
        employeeCode: formData.employeeCode.trim().toUpperCase(),
        department: formData.department,
        designation: formData.designation.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        joiningDate: formData.joiningDate,
        salaryMonthly: Number(formData.salaryMonthly),
        status: formData.status,
        photoUrl: formData.photoUrl.trim() || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        currentSiteLocation: formData.currentSiteLocation.trim() || undefined
      };

      onSave(finalEmployee);
      onClose();
    } catch (err: unknown) {
      if (err instanceof DuplicateRecordError) {
        setErrors(prev => ({ ...prev, [err.field]: err.message }));
      } else if (err instanceof Error) {
        setErrors(prev => ({ ...prev, general: err.message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
              {isEditing ? <Briefcase className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 id="employee-modal-title" className="font-bold text-base text-slate-900">
                {isEditing ? `Edit Employee: ${employeeToEdit?.name}` : 'Register New Solar EPC Employee'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isEditing ? 'Update workforce profile, compensation, and operational details' : 'Add team member to internal HR directory and site operations'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {Object.keys(errors).length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Please correct the following issues:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-700">
                  {Object.values(errors).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Row 1: Name & Employee Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Vikramaditya Rathore"
                className={`w-full text-xs border rounded-xl p-2.5 bg-white transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                  errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Employee Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.employeeCode}
                onChange={e => setFormData({ ...formData, employeeCode: e.target.value })}
                placeholder="e.g. EMP-109"
                className={`w-full text-xs border rounded-xl p-2.5 font-mono uppercase bg-white transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                  errors.employeeCode ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {errors.employeeCode && <p className="text-[11px] text-rose-600 mt-1">{errors.employeeCode}</p>}
            </div>
          </div>

          {/* Row 2: Department & Designation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Department <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value as Employee['department'] })}
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>Designation <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={e => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Lead Site Engineer"
                className={`w-full text-xs border rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                  errors.designation ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {errors.designation && <p className="text-[11px] text-rose-600 mt-1">{errors.designation}</p>}
            </div>
          </div>

          {/* Row 3: Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Phone Number <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98250 11223"
                className={`w-full text-xs border rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                  errors.phone ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {errors.phone && <p className="text-[11px] text-rose-600 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Corporate Email <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="vikram@solarpulse.com"
                className={`w-full text-xs border rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                  errors.email ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {errors.email && <p className="text-[11px] text-rose-600 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Row 4: Joining Date, Salary, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Joining Date <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="date"
                required
                value={formData.joiningDate}
                onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Monthly Salary (₹) <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={formData.salaryMonthly}
                onChange={e => setFormData({ ...formData, salaryMonthly: parseFloat(e.target.value) || 0 })}
                className={`w-full text-xs border rounded-xl p-2.5 font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                  errors.salaryMonthly ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {errors.salaryMonthly && <p className="text-[11px] text-rose-600 mt-1">{errors.salaryMonthly}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as Employee['status'] })}
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                {STATUSES.map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Optional Current Site Location & Photo URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Current Site / Base Location <span className="text-[10px] text-slate-400 font-normal">(Optional)</span></span>
              </label>
              <input
                type="text"
                value={formData.currentSiteLocation}
                onChange={e => setFormData({ ...formData, currentSiteLocation: e.target.value })}
                placeholder="e.g. Sanand Solar Park 50MW Site"
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-slate-400" />
                <span>Photo / Avatar URL <span className="text-[10px] text-slate-400 font-normal">(Optional)</span></span>
              </label>
              <input
                type="url"
                value={formData.photoUrl}
                onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Update Employee' : 'Register Employee'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
