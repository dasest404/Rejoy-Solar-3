import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sun,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Zap,
  Leaf,
  DollarSign
} from 'lucide-react';
import { Quotation } from '../../types/solar';
import { formatINR } from '../../utils/indianNumberWords';
import { generateQuotationPdf } from '../../utils/quotationPdfGenerator';

interface QuotationPdfPreviewModalProps {
  quotation: Quotation;
  isOpen: boolean;
  onClose: () => void;
  onShareWhatsApp?: (quote: Quotation) => void;
}

export const QuotationPdfPreviewModal: React.FC<QuotationPdfPreviewModalProps> = ({
  quotation,
  isOpen,
  onClose,
  onShareWhatsApp
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    generateQuotationPdf(quotation);
  };

  const scrollToPage = (pageIndex: number) => {
    const pageEl = document.getElementById(`quotation-page-${pageIndex}`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Safe Financial Fallbacks
  const basePrice = quotation.baseProjectPrice || quotation.baseAmount || 293848;
  const eqPct = quotation.gstEquipmentPercent || 70;
  const eqRate = quotation.gstEquipmentRate || 5;
  const srvPct = quotation.gstServicesPercent || 30;
  const srvRate = quotation.gstServicesRate || 18;
  const eqTax = Math.round((basePrice * (eqPct / 100) * eqRate) / 100);
  const srvTax = Math.round((basePrice * (srvPct / 100) * srvRate) / 100);
  const totalGst = quotation.gstAmount || quotation.taxAmount || eqTax + srvTax;
  const totalProjectCost = quotation.totalProjectCost || quotation.totalAmount || basePrice + totalGst;
  const centralSubsidy = quotation.centralSubsidy || 0;
  const stateSubsidy = quotation.stateSubsidy || 0;
  const totalSubsidy = quotation.totalSubsidy || (centralSubsidy + stateSubsidy);
  const finalInvestment = quotation.finalProjectInvestment || (totalProjectCost - totalSubsidy);
  const costPerKw = quotation.costPerKw || Math.round(basePrice / quotation.capacityKw);

  const bomItems = quotation.items && quotation.items.length > 0 ? quotation.items : [];

  const milestones = quotation.paymentMilestones && quotation.paymentMilestones.length > 0
    ? quotation.paymentMilestones
    : [
      { id: '1', title: '10% Advance / Token', percentage: 10, amount: Math.round(totalProjectCost * 0.1), description: 'Upon signing of purchase order & contract execution' },
      { id: '2', title: '70% Material Procurement', percentage: 70, amount: Math.round(totalProjectCost * 0.7), description: 'On delivery of PV modules and inverter at site' },
      { id: '3', title: '18% Installation Day', percentage: 18, amount: Math.round(totalProjectCost * 0.18), description: 'On structural mounting & solar panel installation' },
      { id: '4', title: '2% Grid Connection Completion', percentage: 2, amount: Math.round(totalProjectCost * 0.02), description: 'On net-metering synchronization & final commissioning' }
    ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      {/* Top Toolbar (Hidden during Print) */}
      <div className="print:hidden flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900 border-b border-slate-800 text-white select-none z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
            <Sun className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Quotation Preview: {quotation.quotationNumber}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {quotation.capacityKw} kW {(quotation.systemType || 'On-Grid').toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {quotation.customerName} {quotation.companyName ? `• ${quotation.companyName}` : ''}
            </p>
          </div>
        </div>

        {/* Page Jump Quick Buttons */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
          {[
            { page: 1, label: '1. Cover' },
            { page: 2, label: '2. Benefits' },
            { page: 3, label: '3. BOM' },
            { page: 4, label: '4. Cost' },
            { page: 5, label: '5. Contact' },
            { page: 6, label: '6. 3D Model' }
          ].map(p => (
            <button
              key={p.page}
              onClick={() => scrollToPage(p.page)}
              className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors font-medium text-[11px]"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700/60 text-xs">
            <button
              onClick={() => setZoom(z => Math.max(60, z - 10))}
              className="p-1 text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-bold text-[11px] text-slate-200">{zoom}%</span>
            <button
              onClick={() => setZoom(z => Math.min(130, z + 10))}
              className="p-1 text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1 text-slate-400 hover:text-white ml-1"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {onShareWhatsApp && (
            <button
              onClick={() => onShareWhatsApp(quotation)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-xs transition-colors"
            title="Download PDF document"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors"
            title="Print Quotation"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-1"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Document Scroll View */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/60 print:p-0 print:m-0 print:bg-white print:overflow-visible"
      >
        <div
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-150 ease-out print:transform-none"
        >
          {/* ==========================================
              PAGE 1: COVER & FORMAL PROPOSAL
              ========================================== */}
          <div
            id="quotation-page-1"
            className="w-[210mm] min-h-[297mm] max-h-[297mm] bg-white text-slate-900 shadow-2xl mx-auto mb-10 p-[14mm] relative flex flex-col justify-between box-border rounded-xs print:shadow-none print:m-0 print:mb-0 print:rounded-none print:break-after-page print:page-break-after-always overflow-hidden"
          >
            {/* Top Amber Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />

            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <img src="/logo-dark.png" alt="Rejoy Solar Power Pvt. Ltd." className="h-10 w-auto object-contain" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                    Turnkey Solar EPC Proposal
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">Rejoy Solar Power Pvt. Ltd.</p>
                </div>
              </div>

              {/* Title Hero */}
              <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-1">
                  OFFICIAL COMMERCIAL & TECHNICAL PROPOSAL
                </span>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  QUOTATION FOR {quotation.capacityKw} KW {quotation.panelType || 'DCR'}{' '}
                  {(quotation.systemType || 'On-Grid').toUpperCase()} SOLAR PLANT
                </h1>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  High-Efficiency Rooftop Photovoltaic Power Generation System with Net Metering
                </p>
              </div>

              {/* Metadata Bar */}
              <div className="mt-4 grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Quotation Ref</span>
                  <span className="font-bold text-slate-900 text-xs">{quotation.quotationNumber}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Date of Issue</span>
                  <span className="font-bold text-slate-800 text-xs">{quotation.quotationDate || quotation.createdAt}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Validity Period</span>
                  <span className="font-bold text-amber-800 text-xs">{quotation.validityDays || 15} Days ({quotation.validTill || '15 Days'})</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">System Capacity</span>
                  <span className="font-bold text-slate-900 text-xs">{quotation.capacityKw} kWp Grid-Tied</span>
                </div>
              </div>

              {/* Two Column Client & Contractor Details */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                {/* Client Box */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="bg-amber-600 px-3 py-1.5 text-white font-bold text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Prepared For (Client Details)</span>
                  </div>
                  <div className="p-3.5 space-y-1.5 text-xs text-slate-700">
                    <p className="text-sm font-bold text-slate-900">{quotation.customerName}</p>
                    {quotation.companyName && (
                      <p className="text-slate-600 font-semibold">{quotation.companyName}</p>
                    )}
                    <p className="text-slate-500 flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>{quotation.siteAddress || 'Site Location'}, {quotation.city || 'Chhattisgarh'}</span>
                    </p>
                    <p className="text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{quotation.customerPhone || 'N/A'}</span>
                    </p>
                    <p className="text-slate-500 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{quotation.customerEmail || 'N/A'}</span>
                    </p>
                    {quotation.customerGst && (
                      <p className="text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">GSTIN:</span> {quotation.customerGst}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contractor Box */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="bg-slate-900 px-3 py-1.5 text-white font-bold text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Prepared By (Solar EPC Contractor)</span>
                  </div>
                  <div className="p-3.5 space-y-1.5 text-xs text-slate-700">
                    <p className="text-sm font-bold text-amber-800">Rejoy Solar Power Pvt. Ltd.</p>
                    <p className="text-slate-600 font-medium">Turnkey Solar Engineering & Contracting</p>
                    <p className="text-slate-500 flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>Corporate Office: Raipur, Chhattisgarh - 492001</span>
                    </p>
                    <p className="text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>+91 98795 44321 / +91 98250 12345</span>
                    </p>
                    <p className="text-slate-500 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>info@rejoysolar.com / sales@rejoysolar.com</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Web:</span> www.rejoysolar.com
                    </p>
                  </div>
                </div>
              </div>

              {/* Executive Formal Letter */}
              <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 space-y-2 leading-relaxed">
                <p className="font-bold text-slate-900">Dear {quotation.customerName},</p>
                <p>
                  Thank you for showing your valued interest in <strong>Rejoy Solar Power Pvt. Ltd.</strong> We take immense pleasure in submitting our comprehensive commercial and technical proposal for the design, engineering, procurement, erection, testing, and commissioning of a <strong>{quotation.capacityKw} kW {(quotation.systemType || 'On-Grid')} Rooftop Solar Power Plant</strong> at your premises.
                </p>
                <p>
                  Our turnkey EPC solution integrates Tier-1 high-efficiency solar photovoltaic modules, state-of-the-art grid-tied string inverters, heavy-duty elevated hot-dip galvanized mounting structures, and robust electrical balance of systems. The proposed plant is custom-engineered to maximize solar energy generation, reduce your grid power dependence by up to 90%, and deliver long-term, inflation-proof savings for over 25 years.
                </p>
                <p>
                  Rejoy Solar handles the complete statutory liaison process with CSPDCL (Chhattisgarh State Power Distribution Co. Ltd.) and CEIG, from initial feasibility application to bidirectional net-meter synchronisation, ensuring an effortless transition to clean, green energy.
                </p>
              </div>

              {/* Highlight Banner */}
              <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-black uppercase text-amber-800 block mb-1">
                  KEY PROPOSAL HIGHLIGHTS
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Total Project Cost</span>
                    <span className="font-bold text-slate-900">{formatINR(totalProjectCost)}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Total Subsidy Assistance</span>
                    <span className="font-bold text-emerald-700">{formatINR(totalSubsidy)}</span>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-amber-800 block font-bold">Net Final Investment</span>
                    <span className="font-black text-amber-900">{formatINR(finalInvestment)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Page 1 Footer */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
              <span>Rejoy Solar Power Pvt. Ltd. • Turnkey Solar EPC Solutions</span>
              <span>Page 01 of 06</span>
            </div>
          </div>

          {/* ==========================================
              PAGE 2: KEY BENEFITS & SYSTEM EXPLANATION
              ========================================== */}
          <div
            id="quotation-page-2"
            className="w-[210mm] min-h-[297mm] max-h-[297mm] bg-white text-slate-900 shadow-2xl mx-auto mb-10 p-[14mm] relative flex flex-col justify-between box-border rounded-xs print:shadow-none print:m-0 print:mb-0 print:rounded-none print:break-after-page print:page-break-after-always overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />

            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <img src="/logo-dark.png" alt="Rejoy Solar" className="h-8 w-auto object-contain" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                    Technical & Environmental Value Proposition
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">Page 02 / 06</p>
                </div>
              </div>

              {/* Section 1: Key Benefits */}
              <div className="mt-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>1. Key Benefits of Solar On-Grid System</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      icon: <TrendingDown className="w-4 h-4 text-amber-600" />,
                      title: 'DRAMATIC ELECTRICITY BILL REDUCTION',
                      desc: 'Save up to 80% to 90% on monthly power bills by generating clean kWh onsite. Protect your business or household against escalating grid power expenditures.'
                    },
                    {
                      icon: <ShieldCheck className="w-4 h-4 text-blue-600" />,
                      title: '30-YEAR ENERGY INFLATION HEDGE',
                      desc: 'While commercial and retail grid tariffs historically rise by 5-8% annually, solar power cost remains permanently zero once commissioned.'
                    },
                    {
                      icon: <Zap className="w-4 h-4 text-amber-500" />,
                      title: 'HIGH RELIABILITY & MINIMAL MAINTENANCE',
                      desc: 'Solid-state semiconductor generation with zero moving parts. Backed by 25-Year Linear Power Output Warranty on Tier-1 Solar PV Modules.'
                    },
                    {
                      icon: <Leaf className="w-4 h-4 text-emerald-600" />,
                      title: 'CARBON OFFSET & ENVIRONMENTAL ESG',
                      desc: `A ${quotation.capacityKw} kW installation offsets over ${(quotation.capacityKw * 1.3).toFixed(1)} tons of CO2 emissions annually, equivalent to planting hundreds of mature trees.`
                    },
                    {
                      icon: <Building2 className="w-4 h-4 text-purple-600" />,
                      title: 'PROPERTY CAPITAL VALUE APPRECIATION',
                      desc: 'Rooftop solar infrastructure modernizes premises, elevates real estate appraisal value, and provides prestigious green-building recognition.'
                    },
                    {
                      icon: <DollarSign className="w-4 h-4 text-indigo-600" />,
                      title: 'ATTRACTIVE PAYBACK & HIGH FINANCIAL IRR',
                      desc: 'Generates rapid capital payback within 3 to 4 years. Enjoy virtually free green electricity for the remaining 20+ years of plant lifespan.'
                    }
                  ].map((b, i) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5">
                        {b.icon}
                        <h4 className="text-[11px] font-bold text-slate-900">{b.title}</h4>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-relaxed pl-5">{b.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: How On-Grid Solar Functions */}
              <div className="mt-5">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5 mb-3">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>2. How a Solar On-Grid System Functions</span>
                </h3>

                <div className="space-y-2">
                  {[
                    {
                      step: 'STEP 1',
                      title: 'Solar PV Array Absorption',
                      desc: 'High-efficiency mono-crystalline/bifacial solar panels absorb solar irradiance and generate direct current (DC) electricity seamlessly during daylight hours.'
                    },
                    {
                      step: 'STEP 2',
                      title: 'Synchronous Grid Inverter',
                      desc: 'A state-of-the-art grid-tie string inverter transforms DC electricity into regulated 3-phase/single-phase alternating current (AC) matching utility grid frequency and voltage.'
                    },
                    {
                      step: 'STEP 3',
                      title: 'Priority Onsite Consumption',
                      desc: 'Solar electricity first powers internal appliances, lighting, machinery, and air conditioning loads, drastically reducing instantaneous grid power draw.'
                    },
                    {
                      step: 'STEP 4',
                      title: 'Bi-Directional Net Metering',
                      desc: 'Surplus solar energy generated beyond current load demand is automatically exported to the CSPDCL utility grid. The bi-directional net meter accurately logs export units.'
                    },
                    {
                      step: 'STEP 5',
                      title: 'Grid Offset & Nighttime Credit',
                      desc: 'During nighttime or heavy cloud cover, power is smoothly imported from the grid. At the end of each billing cycle, exported units offset imported units, leaving a nominal energy bill.'
                    }
                  ].map((s, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2.5 bg-white border border-slate-200 rounded-xl">
                      <span className="px-2 py-1 bg-amber-600 text-white rounded-md text-[9px] font-black tracking-wider shrink-0">
                        {s.step}
                      </span>
                      <div className="text-xs">
                        <span className="font-bold text-slate-900">{s.title}: </span>
                        <span className="text-slate-600">{s.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Page 2 Footer */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
              <span>Rejoy Solar Power Pvt. Ltd. • Technical Proposal</span>
              <span>Page 02 of 06</span>
            </div>
          </div>

          {/* ==========================================
              PAGE 3: BILL OF MATERIALS (BOM) & SERVICES
              ========================================== */}
          <div
            id="quotation-page-3"
            className="w-[210mm] min-h-[297mm] max-h-[297mm] bg-white text-slate-900 shadow-2xl mx-auto mb-10 p-[14mm] relative flex flex-col justify-between box-border rounded-xs print:shadow-none print:m-0 print:mb-0 print:rounded-none print:break-after-page print:page-break-after-always overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />

            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <img src="/logo-dark.png" alt="Rejoy Solar" className="h-8 w-auto object-contain" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                    Bill of Materials & Scope of Work
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">Page 03 / 06</p>
                </div>
              </div>

              {/* BOM Table */}
              <div className="mt-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-500" />
                    <span>1. Bill of Materials (BOM)</span>
                  </span>
                  <span className="text-[10px] font-normal text-slate-500">
                    {bomItems.length} Proposed Items
                  </span>
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-2.5 text-center w-8">#</th>
                        <th className="py-2 px-3">Product Description</th>
                        <th className="py-2 px-3">Make / Brand</th>
                        <th className="py-2 px-3 text-center">Qty / Unit</th>
                        <th className="py-2 px-3 text-right">Rate (₹)</th>
                        <th className="py-2 px-3 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {bomItems.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {item.productName || item.description}
                            {item.specification && (
                              <p className="text-[9px] text-slate-500 font-normal">{item.specification}</p>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-700 font-medium">{item.make || item.makeModel}</td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {formatINR(item.rate || item.unitPrice || 0)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatINR(item.amount || item.totalPrice || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-amber-50 border-t-2 border-amber-300 font-bold text-xs text-amber-950">
                      <tr>
                        <td colSpan={5} className="py-2 px-3 text-right uppercase tracking-wider text-[10px]">
                          Total Material Cost (BOM Subtotal):
                        </td>
                        <td className="py-2 px-3 text-right text-amber-900 font-black">
                          {formatINR(quotation.bomSubtotal || basePrice)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Turnkey Services */}
              <div className="mt-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>2. Our Turnkey Services (Included in Proposal)</span>
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                  {[
                    'Comprehensive 3D Shadow Profiling & Roof Load Assessment',
                    'Complete Structural Design & Wind Load Calculation (IS 875 compliant)',
                    'Procurement, Factory Testing & Safe Logistics of PV modules & inverters',
                    'Precision Mechanical Assembly & Elevated Structure Erection',
                    'DC & AC Cabling, Combiner Box Wiring, Earthing & Lightning Protection',
                    'End-to-End Liaisoning with CSPDCL for Net-Metering Approvals & CEIG',
                    'Plant Testing, Commissioning, WiFi Monitoring Setup & User Handover',
                    'Comprehensive 5-Year Operation & Preventive Maintenance (O&M) Warranty'
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5 p-1.5 bg-slate-50 border border-slate-200/60 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-[10px] leading-snug">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes & Balance of Material */}
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-600 space-y-1">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  3. Notes & Balance of Material (BOM) Standard Inclusions
                </h4>
                <p>• Net Metering approval is subject to CSPDCL/DISCOM guidelines, transformer capacity, and sanctioned load.</p>
                <p>• Client to provide adequate shadow-free roof area and structurally stable roof terrace for elevated structure.</p>
                <p>• Client to provide single-phase auxiliary electricity and clean water supply during erection & module cleaning.</p>
                <p>• Balance of Material includes Polycab solar cables, chemical earthing pits, Type-II SPDs, and heavy-duty conduits.</p>
              </div>
            </div>

            {/* Page 3 Footer */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
              <span>Rejoy Solar Power Pvt. Ltd. • Bill of Materials</span>
              <span>Page 03 of 06</span>
            </div>
          </div>

          {/* ==========================================
              PAGE 4: COMMERCIAL PROPOSAL & FINANCIALS
              ========================================== */}
          <div
            id="quotation-page-4"
            className="w-[210mm] min-h-[297mm] max-h-[297mm] bg-white text-slate-900 shadow-2xl mx-auto mb-10 p-[14mm] relative flex flex-col justify-between box-border rounded-xs print:shadow-none print:m-0 print:mb-0 print:rounded-none print:break-after-page print:page-break-after-always overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />

            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <img src="/logo-dark.png" alt="Rejoy Solar" className="h-8 w-auto object-contain" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                    Commercial Proposal & Financial Breakdown
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">Page 04 / 06</p>
                </div>
              </div>

              {/* Financial Summary Table */}
              <div className="mt-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5 mb-2">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  <span>1. Turnkey Project Cost Breakdown</span>
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs text-xs">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-700">Solar Plant Capacity</td>
                        <td className="py-2 px-3 font-bold text-slate-900 text-right">{quotation.capacityKw} kW</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-700">Cost Per KW</td>
                        <td className="py-2 px-3 font-bold text-slate-900 text-right">{formatINR(costPerKw)} / kW</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-700">Base Turnkey Project Price (Excl. Tax)</td>
                        <td className="py-2 px-3 font-bold text-slate-900 text-right">{formatINR(basePrice)}</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="py-1.5 px-3 text-slate-500 pl-6 text-[11px]">
                          Equipment Component ({eqPct}% of Base @ {eqRate}% GST)
                        </td>
                        <td className="py-1.5 px-3 text-slate-600 text-right text-[11px]">{formatINR(eqTax)}</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="py-1.5 px-3 text-slate-500 pl-6 text-[11px]">
                          Services Component ({srvPct}% of Base @ {srvRate}% GST)
                        </td>
                        <td className="py-1.5 px-3 text-slate-600 text-right text-[11px]">{formatINR(srvTax)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-700">Total GST Amount (Composite EPC Scheme)</td>
                        <td className="py-2 px-3 font-bold text-slate-800 text-right">{formatINR(totalGst)}</td>
                      </tr>
                      <tr className="bg-amber-100 font-bold text-amber-950 border-t-2 border-amber-300">
                        <td className="py-2.5 px-3 uppercase tracking-wider text-[11px]">TOTAL PROJECT COST (GROSS EPC VALUE)</td>
                        <td className="py-2.5 px-3 font-black text-amber-900 text-right text-sm">{formatINR(totalProjectCost)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-emerald-700">Central Subsidy Assistance (PM Surya Ghar Scheme)</td>
                        <td className="py-2 px-3 font-bold text-emerald-700 text-right">- {formatINR(centralSubsidy)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-emerald-700">State Subsidy Assistance (Chhattisgarh State Policy)</td>
                        <td className="py-2 px-3 font-bold text-emerald-700 text-right">- {formatINR(stateSubsidy)}</td>
                      </tr>
                      <tr className="bg-emerald-50 font-bold text-emerald-900">
                        <td className="py-2 px-3 uppercase text-[11px]">TOTAL APPLICABLE SUBSIDY</td>
                        <td className="py-2 px-3 font-black text-right">- {formatINR(totalSubsidy)}</td>
                      </tr>
                      <tr className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-sm">
                        <td className="py-3 px-3 uppercase tracking-wider">FINAL NET PROJECT INVESTMENT (CLIENT PAYABLE)</td>
                        <td className="py-3 px-3 text-right text-base font-black">{formatINR(finalInvestment)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Amount in Words */}
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">Total Cost in Words:</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {quotation.amountInWords || 'Three Lakh Twenty Thousand Rupees Only'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Quotation Validity</span>
                  <span className="font-bold text-amber-800 text-xs">
                    Valid for {quotation.validityDays || 15} Days
                  </span>
                </div>
              </div>

              {/* Milestone Payment Schedule */}
              <div className="mt-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5 mb-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span>2. Milestone Payment Schedule</span>
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-3 w-16 text-center">Stage</th>
                        <th className="py-2 px-3">Milestone Title</th>
                        <th className="py-2 px-3">Condition / Trigger</th>
                        <th className="py-2 px-3 text-center w-20">Share (%)</th>
                        <th className="py-2 px-3 text-right w-28">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {milestones.map((m, idx) => (
                        <tr key={m.id || idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center font-bold text-slate-400">Stage 0{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{m.title}</td>
                          <td className="py-2 px-3 text-slate-600 font-medium">{m.description}</td>
                          <td className="py-2 px-3 text-center font-bold text-amber-800">{m.percentage}%</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{formatINR(m.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold text-xs text-slate-900 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="py-2 px-3 text-right uppercase tracking-wider text-[10px]">
                          Total Contractual Payment:
                        </td>
                        <td className="py-2 px-3 text-center text-amber-800 font-black">100%</td>
                        <td className="py-2 px-3 text-right text-slate-900 font-black">{formatINR(totalProjectCost)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Validity Notice */}
              <div className="mt-3 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-center text-xs font-bold text-amber-900">
                * This Quotation is Valid For {quotation.validityDays || 15} Days From The Date Of Issuance ({quotation.validTill || '15 Days'}).
              </div>
            </div>

            {/* Page 4 Footer */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
              <span>Rejoy Solar Power Pvt. Ltd. • Financial Proposal</span>
              <span>Page 04 of 06</span>
            </div>
          </div>

          {/* ==========================================
              PAGE 5: CONTACT, BANKING & SUBSIDY INFO
              ========================================== */}
          <div
            id="quotation-page-5"
            className="w-[210mm] min-h-[297mm] max-h-[297mm] bg-white text-slate-900 shadow-2xl mx-auto mb-10 p-[14mm] relative flex flex-col justify-between box-border rounded-xs print:shadow-none print:m-0 print:mb-0 print:rounded-none print:break-after-page print:page-break-after-always overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />

            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <img src="/logo-dark.png" alt="Rejoy Solar" className="h-8 w-auto object-contain" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                    Contact, Banking & Subsidy Guidelines
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">Page 05 / 06</p>
                </div>
              </div>

              {/* Section 1: Contact Card */}
              <div className="mt-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5 mb-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span>1. Contact Us Now</span>
                </h3>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
                  <p className="text-sm font-bold text-amber-800">Rejoy Solar Power Pvt. Ltd.</p>
                  <p className="text-slate-600">Registered Corporate Office: Raipur, Chhattisgarh - 492001, India</p>
                  <p className="text-slate-600">Helpline / WhatsApp: +91 98795 44321 | Support: +91 98250 12345</p>
                  <p className="text-slate-600">Email: info@rejoysolar.com | Sales: sales@rejoysolar.com | Web: www.rejoysolar.com</p>
                  <p className="text-[11px] text-slate-500">CIN: U40106CT2023PTC014285 | GSTIN: 22AAACR9241Q1Z8</p>
                </div>
              </div>

              {/* Section 2: Bank Account Details */}
              <div className="mt-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>2. Official Bank Account Details (NEFT / RTGS / IMPS)</span>
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs text-xs">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 w-48 bg-slate-50">Beneficiary Name</td>
                        <td className="py-2 px-3 font-bold text-slate-900">Rejoy Solar Power Pvt. Ltd.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 bg-slate-50">Bank Name</td>
                        <td className="py-2 px-3 font-bold text-slate-800">HDFC Bank Ltd.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 bg-slate-50">Account Number</td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-800 text-sm">50200084729103</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 bg-slate-50">Account Type</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">Current Account</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 bg-slate-50">IFSC Code</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">HDFC0001234</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 bg-slate-50">Branch</td>
                        <td className="py-2 px-3 text-slate-700">Raipur Main Branch, Chhattisgarh</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Chhattisgarh Subsidy Info */}
              <div className="mt-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5 mb-2">
                  <Leaf className="w-4 h-4 text-emerald-600" />
                  <span>3. Chhattisgarh Subsidy & CSPDCL Net Metering Guidelines</span>
                </h3>

                <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2 text-xs text-slate-700">
                  <p>
                    • <strong>PM Surya Ghar Muft Bijli Yojana:</strong> Provides direct financial assistance of up to ₹78,000 for residential rooftop systems up to 3 kW and proportionate subsidies for larger systems.
                  </p>
                  <p>
                    • <strong>Chhattisgarh State Policy:</strong> Additional state subsidy assistance of ₹30,000 is credited directly into the consumer&apos;s bank account via DBT post-commissioning.
                  </p>
                  <p>
                    • <strong>Turnkey Liaison:</strong> Rejoy Solar handles the entire application, technical feasibility clearance, documentation, and bi-directional meter synchronisation with CSPDCL.
                  </p>
                  <p>
                    • <strong>Mandatory Consumer Documents:</strong> Recent CSPDCL electricity bill, Aadhaar Card, PAN Card, and cancelled cheque of beneficiary bank account.
                  </p>
                </div>
              </div>

              {/* Signatures & Stamp */}
              <div className="mt-5 grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div className="p-4 border border-slate-200 rounded-xl h-28 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase text-amber-800">
                    For Rejoy Solar Power Pvt. Ltd.
                  </span>
                  <div className="text-[10px] text-slate-400">
                    <p>Authorized Signatory & Seal</p>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl h-28 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-700">
                    Client Acceptance & Confirmation
                  </span>
                  <div className="text-[10px] text-slate-400 space-y-1">
                    <p>Accepted By: ________________________________</p>
                    <p>Date & Stamp: _______________________________</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Page 5 Footer */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
              <span>Rejoy Solar Power Pvt. Ltd. • Contact & Guidelines</span>
              <span>Page 05 of 06</span>
            </div>
          </div>

          {/* ==========================================
              PAGE 6: ELEVATED STRUCTURE & 3D MODEL
              ========================================== */}
          <div
            id="quotation-page-6"
            className="w-[210mm] min-h-[297mm] max-h-[297mm] bg-white text-slate-900 shadow-2xl mx-auto mb-10 p-[14mm] relative flex flex-col justify-between box-border rounded-xs print:shadow-none print:m-0 print:mb-0 print:rounded-none print:break-after-page print:page-break-after-always overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />

            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <img src="/logo-dark.png" alt="Rejoy Solar" className="h-8 w-auto object-contain" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                    Technical Architecture & Elevated Structure
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">Page 06 / 06</p>
                </div>
              </div>

              {/* 3D Elevated Structure Graphic */}
              <div className="mt-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5 mb-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>1. Elevated Structure & Solar Panel 3D Technical Design</span>
                </h3>

                {/* SVG Blueprint Visualization */}
                <div className="w-full h-64 bg-slate-950 rounded-2xl p-4 relative overflow-hidden border border-slate-800 shadow-inner flex flex-col justify-between">
                  {/* Subtle Grid Background */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: 'radial-gradient(circle, #f59e0b 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }}
                  />

                  {/* Header overlay */}
                  <div className="relative z-10 flex items-center justify-between text-[10px] text-amber-400 font-mono">
                    <span>ELEVATED STRUCTURE BLUEPRINT [CAD-3D]</span>
                    <span>WIND RESISTANCE: 150 KM/H</span>
                  </div>

                  {/* SVG Structure Drawing */}
                  <svg className="w-full h-44 relative z-10" viewBox="0 0 700 240" fill="none">
                    {/* Rooftop Floor Line */}
                    <line x1="40" y1="210" x2="660" y2="210" stroke="#475569" strokeWidth="3" />
                    <text x="50" y="230" fill="#64748b" fontSize="10" fontFamily="monospace">ROOFTOP CONCRETE SLAB LEVEL</text>

                    {/* Pedestals / Foundation Blocks */}
                    <rect x="120" y="195" width="40" height="15" fill="#334155" stroke="#64748b" strokeWidth="1" />
                    <rect x="330" y="195" width="40" height="15" fill="#334155" stroke="#64748b" strokeWidth="1" />
                    <rect x="540" y="195" width="40" height="15" fill="#334155" stroke="#64748b" strokeWidth="1" />

                    {/* Columns (Legs) */}
                    <line x1="140" y1="195" x2="140" y2="105" stroke="#d97706" strokeWidth="5" />
                    <line x1="350" y1="195" x2="350" y2="85" stroke="#d97706" strokeWidth="5" />
                    <line x1="560" y1="195" x2="560" y2="65" stroke="#d97706" strokeWidth="5" />

                    {/* Diagonal Bracings */}
                    <line x1="140" y1="170" x2="350" y2="115" stroke="#b45309" strokeWidth="2" strokeDasharray="4 2" />
                    <line x1="350" y1="170" x2="140" y2="115" stroke="#b45309" strokeWidth="2" strokeDasharray="4 2" />
                    <line x1="350" y1="170" x2="560" y2="95" stroke="#b45309" strokeWidth="2" strokeDasharray="4 2" />
                    <line x1="560" y1="170" x2="350" y2="95" stroke="#b45309" strokeWidth="2" strokeDasharray="4 2" />

                    {/* Tilted Rafter Beam (15°-22° South Tilt) */}
                    <line x1="80" y1="115" x2="620" y2="58" stroke="#38bdf8" strokeWidth="6" />

                    {/* Solar Panels Mounted on Top */}
                    {[
                      { x: 100, y: 108, w: 100, h: 45 },
                      { x: 230, y: 95, w: 100, h: 45 },
                      { x: 360, y: 82, w: 100, h: 45 },
                      { x: 490, y: 69, w: 100, h: 45 }
                    ].map((p, i) => (
                      <g key={i}>
                        {/* 3D Tilted Panel Polygon */}
                        <polygon
                          points={`${p.x},${p.y} ${p.x + 90},${p.y - 12} ${p.x + 105},${p.y - 2} ${p.x + 15},${p.y + 10}`}
                          fill="#1e3a8a"
                          stroke="#60a5fa"
                          strokeWidth="1.5"
                        />
                        {/* Panel Cell Grid */}
                        <line x1={p.x + 30} y1={p.y + 2} x2={p.x + 100} y2={p.y - 7} stroke="#3b82f6" strokeWidth="0.8" />
                        <line x1={p.x + 60} y1={p.y - 2} x2={p.x + 95} y2={p.y - 10} stroke="#3b82f6" strokeWidth="0.8" />
                      </g>
                    ))}

                    {/* Clearance Dimension Marker */}
                    <line x1="80" y1="195" x2="80" y2="115" stroke="#fde047" strokeWidth="1.5" markerEnd="url(#arrow)" />
                    <text x="45" y="155" fill="#fde047" fontSize="10" fontWeight="bold" fontFamily="sans-serif">7 - 8 FT</text>

                    {/* Sunlight Irradiance Rays */}
                    <line x1="200" y1="10" x2="240" y2="50" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
                    <line x1="340" y1="5" x2="370" y2="45" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
                    <line x1="480" y1="10" x2="500" y2="45" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
                    <text x="350" y="20" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">SOLAR IRRADIANCE (SOUTH FACING 15°-22°)</text>
                  </svg>

                  {/* Legend underneath graphic */}
                  <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1">
                    <span className="text-amber-300 font-medium">■ Hot-Dip Galvanized (HDG) Steel Frame</span>
                    <span className="text-sky-300 font-medium">■ Heavy-Duty Purlins & Rafters</span>
                    <span className="text-blue-300 font-medium">■ Tier-1 Bifacial PV Array</span>
                    <span className="text-yellow-300 font-medium">■ Full Roof Usability (Walkable)</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Technical Specifications Table */}
              <div className="mt-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>2. Mounting Structure & Engineering Parameters</span>
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs text-xs">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 w-52 bg-slate-50">Structure Type</td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {quotation.structureType || 'Elevated Rooftop HDG / Pre-GI Solar Mounting Structure'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 bg-slate-50">Clearance Height</td>
                        <td className="py-2 px-3 text-slate-800">
                          Minimum 7 to 8 Feet headroom clearance allowing full roof utilization for gardening / leisure
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 bg-slate-50">Steel Grade & Coating</td>
                        <td className="py-2 px-3 text-slate-800">
                          High-Strength Steel (YSt 310 / 550 MPa) with 80-120 Micron Hot-Dip Galvanization
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 bg-slate-50">Tilt Angle & Orientation</td>
                        <td className="py-2 px-3 text-slate-800">
                          15° to 22° True South orientation calculated for maximum annual solar yield in Central India
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 bg-slate-50">Wind Load Rating</td>
                        <td className="py-2 px-3 font-bold text-emerald-700">
                          Aerodynamically certified to withstand sustained wind speeds up to 150 km/h (IS 875 Part 3)
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 bg-slate-50">Fasteners & Hardware</td>
                        <td className="py-2 px-3 text-slate-800">
                          Grade SS304 Stainless Steel bolts, Belleville spring washers, and serrated flange nuts
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 bg-slate-50">Foundation Anchoring</td>
                        <td className="py-2 px-3 text-slate-800">
                          M25 RCC Pedestals with Hilti/Fischer Chemical Anchors (Zero roof puncture / waterproof)
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-500 bg-slate-50">Warranty & Lifespan</td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          25 Years structural integrity warranty designed for harsh outdoor environmental conditions
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Page 6 Footer */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
              <span>Rejoy Solar Power Pvt. Ltd. • Technical Architecture</span>
              <span>Page 06 of 06</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
