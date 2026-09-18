import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { storageService } from '../../services/storage';
import { Lead, Customer, Quotation } from '../../types/solar';
import { StatusBadge } from '../common/StatusBadge';
import { validateCustomer, DuplicateRecordError } from '../../services/validation';
import {
  Users,
  Building2,
  FileText,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Sparkles,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Calculator,
  Kanban
} from 'lucide-react';

export const CrmView: React.FC<{ defaultTab?: 'LEADS' | 'CUSTOMERS' | 'QUOTATIONS' }> = ({
  defaultTab = 'LEADS'
}) => {
  const { openCustomerControlCenter, openWhatsAppModal, openImportExportModal, showToast, triggerRefresh, refreshTrigger } = useApp();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'LEADS' | 'CUSTOMERS' | 'QUOTATIONS'>(defaultTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [leadViewMode, setLeadViewMode] = useState<'KANBAN' | 'LIST'>('KANBAN');

  // New Lead Modal state
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    customerName: '',
    companyName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Ahmedabad',
    solarCapacityKw: 50,
    estimatedValue: 2400000,
    source: 'Direct Referral',
    notes: 'Inquired for factory rooftop solar installation.'
  });

  // New Customer Modal state
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>({});
  const [customerForm, setCustomerForm] = useState({
    name: '',
    companyName: '',
    customerType: 'Commercial' as 'Residential' | 'Commercial' | 'Industrial',
    phone: '',
    email: '',
    siteAddress: '',
    city: 'Ahmedabad',
    capacityKw: 25,
    estimatedValue: 1250000
  });

  // Quotation Builder Modal state
  const [isNewQuotationOpen, setIsNewQuotationOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    customerName: 'Apex Polychem Ltd',
    capacityKw: 100,
    ratePerWp: 42,
    panelBrand: 'Waaree 540Wp Bifacial Mono PERC',
    inverterBrand: 'Sungrow 110kW String Inverter',
    structureType: 'HDG 15° Fixed Tilt',
    gstRatePercent: 13.8,
    discountAmount: 50000
  });

  const leads = useMemo(() => storageService.getLeads(), [refreshTrigger]);
  const customers = useMemo(() => storageService.getCustomers(), [refreshTrigger]);
  const quotations = useMemo(() => storageService.getQuotations(), [refreshTrigger]);

  // Filtered lists
  const filteredLeads = useMemo(() => {
    return leads.filter(l =>
      l.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm) ||
      (l.companyName && l.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [leads, searchTerm]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q =>
      q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [quotations, searchTerm]);

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.customerName || !leadForm.phone) {
      showToast('Customer name and phone are required', 'error');
      return;
    }

    storageService.addLead({
      ...leadForm,
      status: 'NEW',
      assignedToId: currentUser.id,
      assignedToName: currentUser.name
    });

    setIsNewLeadOpen(false);
    showToast('New solar lead registered successfully', 'success');
    triggerRefresh();
  };

  const handleConvertToCustomerAndProject = (lead: Lead) => {
    // Pre-validate for duplicate customer
    const validation = validateCustomer(
      {
        name: lead.customerName,
        companyName: lead.companyName,
        phone: lead.phone,
        email: lead.email,
        city: lead.city
      },
      customers
    );

    if (!validation.valid) {
      showToast(validation.message || 'Cannot convert: A customer with these details already exists.', 'error');
      return;
    }

    try {
      const result = storageService.convertLeadToCustomerAndProject(
        lead.id,
        currentUser.name,
        currentUser.role
      );
      showToast(`Lead converted! Created Customer & Project ${result.project.projectCode}`, 'success');
      triggerRefresh();
      openCustomerControlCenter(result.customer.id, result.project.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error converting lead to customer';
      showToast(msg, 'error');
    }
  };

  const handleCreateCustomerAndProject = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerErrors({});

    const errs: Record<string, string> = {};
    if (!customerForm.name.trim()) errs.name = 'Customer name is required';
    if (!customerForm.phone.trim()) errs.phone = 'Phone number is required';

    if (Object.keys(errs).length > 0) {
      setCustomerErrors(errs);
      showToast('Customer name and phone number are required', 'error');
      return;
    }

    // Duplicate validation
    const validation = validateCustomer(customerForm, customers);
    if (!validation.valid) {
      setCustomerErrors({ [validation.field || 'general']: validation.message || 'Duplicate customer details detected' });
      showToast(validation.message || 'Duplicate customer details detected', 'error');
      return;
    }

    try {
      const result = storageService.createCustomerAndProject(
        customerForm,
        currentUser.name,
        currentUser.role
      );

      setIsNewCustomerOpen(false);
      showToast(`Created Customer "${result.customer.name}" & Project ${result.project.projectCode}. Stage 1 initialized.`, 'success');
      triggerRefresh();
      openCustomerControlCenter(result.customer.id, result.project.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating customer';
      showToast(msg, 'error');
      if (err instanceof DuplicateRecordError) {
        setCustomerErrors({ [err.field]: err.message });
      }
    }
  };

  const calculateQuoteFinancials = () => {
    const baseAmount = quoteForm.capacityKw * 1000 * quoteForm.ratePerWp;
    const discounted = Math.max(0, baseAmount - quoteForm.discountAmount);
    const gstAmount = (discounted * quoteForm.gstRatePercent) / 100;
    const totalAmount = discounted + gstAmount;
    return { baseAmount, discounted, gstAmount, totalAmount };
  };

  const handleSaveQuotation = () => {
    const { baseAmount, gstAmount, totalAmount } = calculateQuoteFinancials();
    const newQuote: Quotation = {
      id: `quote-${Date.now()}`,
      quotationNumber: `QTN-2026-${Math.floor(100 + Math.random() * 900)}`,
      customerId: 'cust-1',
      customerName: quoteForm.customerName,
      capacityKw: quoteForm.capacityKw,
      ratePerWp: quoteForm.ratePerWp,
      baseAmount,
      taxAmount: gstAmount,
      totalAmount,
      status: 'SENT',
      createdAt: new Date().toISOString().slice(0, 10),
      validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      panelBrand: quoteForm.panelBrand,
      inverterBrand: quoteForm.inverterBrand,
      structureType: quoteForm.structureType
    };

    storageService.saveQuotation(newQuote);
    setIsNewQuotationOpen(false);
    showToast(`Quotation ${newQuote.quotationNumber} generated and saved`, 'success');
    triggerRefresh();
  };

  const kanbanColumns = [
    { key: 'NEW', title: 'New Inquiries', color: 'bg-slate-100 text-slate-700' },
    { key: 'CONTACTED', title: 'Contacted', color: 'bg-blue-100 text-blue-800' },
    { key: 'QUALIFIED', title: 'Survey / Qualified', color: 'bg-purple-100 text-purple-800' },
    { key: 'PROPOSAL', title: 'Proposal Sent', color: 'bg-amber-100 text-amber-800' },
    { key: 'WON', title: 'Won / Customer', color: 'bg-emerald-100 text-emerald-800' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              Sales Pipeline
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Inquiry to Commercial Solar EPC Conversion</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            CRM & Commercial Pipeline
          </h1>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'LEADS' && (
            <button
              onClick={() => setIsNewLeadOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Solar Lead</span>
            </button>
          )}

          {activeTab === 'CUSTOMERS' && (
            <button
              onClick={() => {
                setCustomerForm({
                  name: '',
                  companyName: '',
                  customerType: 'Commercial',
                  phone: '+91 ',
                  email: '',
                  siteAddress: '',
                  city: 'Ahmedabad',
                  capacityKw: 25,
                  estimatedValue: 1250000
                });
                setCustomerErrors({});
                setIsNewCustomerOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          )}

          {activeTab === 'QUOTATIONS' && (
            <button
              onClick={() => setIsNewQuotationOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-2xs"
            >
              <Calculator className="w-4 h-4" />
              <span>Generate Quotation</span>
            </button>
          )}

          <button
            onClick={() => openImportExportModal(activeTab === 'CUSTOMERS' ? 'Customers' : 'Leads')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Excel Hub</span>
          </button>
        </div>
      </div>

      {/* View Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('LEADS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'LEADS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Leads Pipeline ({leads.length})
          </button>
          <button
            onClick={() => setActiveTab('CUSTOMERS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'CUSTOMERS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customers Directory ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('QUOTATIONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'QUOTATIONS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quotations & Proposals ({quotations.length})
          </button>
        </div>

        {/* Search & Layout toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {activeTab === 'LEADS' && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setLeadViewMode('KANBAN')}
                className={`p-1.5 rounded-lg ${leadViewMode === 'KANBAN' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                title="Kanban Board"
              >
                <Kanban className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLeadViewMode('LIST')}
                className={`p-1.5 rounded-lg ${leadViewMode === 'LIST' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                title="List View"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: LEADS VIEW */}
      {activeTab === 'LEADS' && (
        <>
          {leadViewMode === 'KANBAN' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {kanbanColumns.map((col) => {
                const columnLeads = filteredLeads.filter(l => l.status === col.key);

                return (
                  <div key={col.key} className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${col.color}`}>
                        {col.title}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{columnLeads.length}</span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {columnLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <h4 className="font-bold text-xs text-slate-900 group-hover:text-amber-700 leading-tight">
                                {lead.customerName}
                              </h4>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                                {lead.solarCapacityKw} kW
                              </span>
                            </div>

                            {lead.companyName && (
                              <p className="text-[11px] text-slate-500 truncate">{lead.companyName}</p>
                            )}

                            <p className="text-xs font-black text-slate-800 mt-2">
                              ₹{(lead.estimatedValue / 100000).toFixed(1)} Lakh
                            </p>

                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                              {lead.notes}
                            </p>
                          </div>

                          {/* Card bottom actions */}
                          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                            <button
                              onClick={() =>
                                openWhatsAppModal(lead.phone, lead.customerName, 'LEAD_WELCOME', {
                                  capacityKw: lead.solarCapacityKw
                                })
                              }
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Send WhatsApp Welcome"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>

                            {lead.status !== 'WON' ? (
                              <button
                                onClick={() => handleConvertToCustomerAndProject(lead)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold transition-colors"
                              >
                                <span>Convert</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Project Active
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {columnLeads.length === 0 && (
                        <div className="h-28 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[11px] text-slate-400">
                          No inquiries in this stage
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Lead Name</th>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Capacity</th>
                      <th className="py-3 px-4">Est. Value</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{lead.customerName}</td>
                        <td className="py-3.5 px-4 text-slate-600">{lead.companyName || '—'}</td>
                        <td className="py-3.5 px-4 font-bold text-amber-800">{lead.solarCapacityKw} kW</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">₹{lead.estimatedValue.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 text-slate-500">{lead.city}</td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={lead.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{lead.source}</td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() =>
                              openWhatsAppModal(lead.phone, lead.customerName, 'LEAD_WELCOME', {
                                capacityKw: lead.solarCapacityKw
                              })
                            }
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md"
                          >
                            <MessageSquare className="w-4 h-4 inline" />
                          </button>
                          {lead.status !== 'WON' && (
                            <button
                              onClick={() => handleConvertToCustomerAndProject(lead)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px]"
                            >
                              Convert to Project
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: CUSTOMERS DIRECTORY */}
      {activeTab === 'CUSTOMERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              onClick={() => openCustomerControlCenter(cust.id, cust.activeProjectId)}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-amber-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                    {cust.customerType}
                  </span>
                  <span className="text-xs font-bold text-amber-700 group-hover:underline flex items-center gap-1">
                    <span>Control Center</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 group-hover:text-amber-700 transition-colors">
                  {cust.name}
                </h3>
                {cust.companyName && (
                  <p className="text-xs text-slate-500 mt-0.5">{cust.companyName}</p>
                )}

                <div className="space-y-1.5 mt-4 text-xs text-slate-600">
                  <p className="flex items-center gap-2 truncate">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cust.phone}</span>
                  </p>
                  <p className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cust.email}</span>
                  </p>
                  <p className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cust.siteAddress}, {cust.city}</span>
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Sanctioned: {cust.sanctionedLoadKw || 100} kW</span>
                <span className="font-bold text-slate-800">GST: {cust.gstNumber || 'Unregistered'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: QUOTATIONS & PROPOSALS */}
      {activeTab === 'QUOTATIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Rate (₹/Wp)</th>
                  <th className="py-3 px-4">Total Amount (₹)</th>
                  <th className="py-3 px-4">Valid Till</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{q.quotationNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{q.customerName}</td>
                    <td className="py-3.5 px-4 font-bold text-amber-800">{q.capacityKw} kW</td>
                    <td className="py-3.5 px-4 text-slate-600">₹{q.ratePerWp}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">₹{q.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-slate-500">{q.validTill}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={q.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() =>
                          openWhatsAppModal('919879544321', q.customerName, 'QUOTATION_SHARE', {
                            quotationNumber: q.quotationNumber,
                            capacityKw: q.capacityKw,
                            amount: q.totalAmount
                          })
                        }
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"
                        title="Share on WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => showToast(`Proposal PDF generated for ${q.quotationNumber}`, 'info')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px]"
                      >
                        View PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW LEAD MODAL */}
      {isNewLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-base text-slate-900">Add New Solar Inquiry</h3>
              <button onClick={() => setIsNewLeadOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={leadForm.customerName}
                    onChange={e => setLeadForm({ ...leadForm, customerName: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. Ramesh Patel"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company / Facility Name</label>
                  <input
                    type="text"
                    value={leadForm.companyName}
                    onChange={e => setLeadForm({ ...leadForm, companyName: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                    placeholder="e.g. Acme Polymers"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={leadForm.phone}
                    onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                    placeholder="+91 98250 12345"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={e => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                    placeholder="info@acme.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Est. Solar Capacity (kW)</label>
                  <input
                    type="number"
                    value={leadForm.solarCapacityKw}
                    onChange={e => {
                      const kw = Number(e.target.value);
                      setLeadForm({ ...leadForm, solarCapacityKw: kw, estimatedValue: kw * 48000 });
                    }}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Est. Project Value (₹)</label>
                  <input
                    type="number"
                    value={leadForm.estimatedValue}
                    onChange={e => setLeadForm({ ...leadForm, estimatedValue: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City / Region</label>
                <input
                  type="text"
                  value={leadForm.city}
                  onChange={e => setLeadForm({ ...leadForm, city: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewLeadOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-2xs"
                >
                  Register Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW QUOTATION GENERATOR MODAL */}
      {isNewQuotationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900">Commercial Solar EPC Proposal Builder</h3>
              </div>
              <button onClick={() => setIsNewQuotationOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={quoteForm.customerName}
                    onChange={e => setQuoteForm({ ...quoteForm, customerName: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plant Capacity (kW)</label>
                  <input
                    type="number"
                    value={quoteForm.capacityKw}
                    onChange={e => setQuoteForm({ ...quoteForm, capacityKw: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Turnkey Rate (₹ / Watt-peak)</label>
                  <input
                    type="number"
                    value={quoteForm.ratePerWp}
                    onChange={e => setQuoteForm({ ...quoteForm, ratePerWp: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Commercial Discount (₹)</label>
                  <input
                    type="number"
                    value={quoteForm.discountAmount}
                    onChange={e => setQuoteForm({ ...quoteForm, discountAmount: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Base EPC Cost ({quoteForm.capacityKw} kW @ ₹{quoteForm.ratePerWp}/Wp):</span>
                  <span className="font-semibold">₹{(quoteForm.capacityKw * 1000 * quoteForm.ratePerWp).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Discount:</span>
                  <span className="text-emerald-700 font-semibold">- ₹{quoteForm.discountAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST ({quoteForm.gstRatePercent}% Composite EPC):</span>
                  <span>₹{calculateQuoteFinancials().gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-amber-200">
                  <span>Net Estimated Turnkey Value:</span>
                  <span className="text-amber-800">₹{calculateQuoteFinancials().totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsNewQuotationOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuotation}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-2xs"
                >
                  Generate Official Proposal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW CUSTOMER MODAL */}
      {isNewCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900">Add New Commercial / Industrial Customer</h3>
              </div>
              <button onClick={() => setIsNewCustomerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerAndProject} className="p-5 space-y-4">
              {customerErrors.general && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <span className="font-bold">Error:</span> {customerErrors.general}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={customerForm.name}
                    onChange={e => {
                      setCustomerForm({ ...customerForm, name: e.target.value });
                      if (customerErrors.name) setCustomerErrors({ ...customerErrors, name: '' });
                    }}
                    className={`w-full text-xs border rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 ${
                      customerErrors.name ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                    }`}
                    placeholder="e.g. Ramesh Patel"
                  />
                  {customerErrors.name && (
                    <p className="text-[11px] text-red-600 font-medium mt-1">{customerErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company / Enterprise Name</label>
                  <input
                    type="text"
                    value={customerForm.companyName}
                    onChange={e => {
                      setCustomerForm({ ...customerForm, companyName: e.target.value });
                      if (customerErrors.companyName) setCustomerErrors({ ...customerErrors, companyName: '' });
                    }}
                    className={`w-full text-xs border rounded-xl p-2.5 ${
                      customerErrors.companyName ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                    }`}
                    placeholder="e.g. Acme Polymers Ltd"
                  />
                  {customerErrors.companyName && (
                    <p className="text-[11px] text-red-600 font-medium mt-1">{customerErrors.companyName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={customerForm.phone}
                    onChange={e => {
                      setCustomerForm({ ...customerForm, phone: e.target.value });
                      if (customerErrors.phone) setCustomerErrors({ ...customerErrors, phone: '' });
                    }}
                    className={`w-full text-xs border rounded-xl p-2.5 ${
                      customerErrors.phone ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                    }`}
                    placeholder="+91 98250 12345"
                  />
                  {customerErrors.phone && (
                    <p className="text-[11px] text-red-600 font-medium mt-1">{customerErrors.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={e => {
                      setCustomerForm({ ...customerForm, email: e.target.value });
                      if (customerErrors.email) setCustomerErrors({ ...customerErrors, email: '' });
                    }}
                    className={`w-full text-xs border rounded-xl p-2.5 ${
                      customerErrors.email ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                    }`}
                    placeholder="contact@acme.com"
                  />
                  {customerErrors.email && (
                    <p className="text-[11px] text-red-600 font-medium mt-1">{customerErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Type</label>
                  <select
                    value={customerForm.customerType}
                    onChange={e => setCustomerForm({ ...customerForm, customerType: e.target.value as any })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white"
                  >
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Residential">Residential</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City / Region</label>
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={e => setCustomerForm({ ...customerForm, city: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                    placeholder="e.g. Ahmedabad"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Site / Factory Address</label>
                <input
                  type="text"
                  value={customerForm.siteAddress}
                  onChange={e => setCustomerForm({ ...customerForm, siteAddress: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                  placeholder="Plot No. 42, GIDC Phase II"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Solar Plant Capacity (kW)</label>
                  <input
                    type="number"
                    value={customerForm.capacityKw}
                    onChange={e => {
                      const kw = Number(e.target.value);
                      setCustomerForm({ ...customerForm, capacityKw: kw, estimatedValue: kw * 50000 });
                    }}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contract Value (₹)</label>
                  <input
                    type="number"
                    value={customerForm.estimatedValue}
                    onChange={e => setCustomerForm({ ...customerForm, estimatedValue: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-2xs"
                >
                  Create Customer & Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
