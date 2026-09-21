import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '../types/solar';
import { formatINR } from './indianNumberWords';

export function generateQuotationPdf(quote: Quotation): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryColor = [217, 119, 6]; // Amber-600 #d97706
  const primaryDark = [180, 83, 9]; // Amber-700
  const slateDark = [15, 23, 42]; // Slate-900 #0f172a
  const slateMuted = [71, 85, 105]; // Slate-600 #475569
  const slateLight = [248, 250, 252]; // Slate-50

  const drawHeader = (pageTitle: string, pageNum: number) => {
    // Top banner bar
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Brand logo text / mark
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text('REJOY', margin, 13);

    doc.setFontSize(8);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text('SOLAR POWER PVT. LTD.', margin + 22, 13);

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(pageTitle.toUpperCase(), pageWidth - margin, 13, { align: 'right' });

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, 17, pageWidth - margin, 17);
  };

  const drawFooter = (pageNum: number) => {
    const y = pageHeight - 8;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y - 3, pageWidth - margin, y - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text('Rejoy Solar Power Pvt. Ltd. | Commercial & Technical Solar EPC Proposal', margin, y);
    doc.text(`Page 0${pageNum} of 06`, pageWidth - margin, y, { align: 'right' });
  };

  // ==========================================
  // PAGE 1: COVER & FORMAL PROPOSAL
  // ==========================================
  drawHeader('Turnkey Solar EPC Proposal', 1);

  // Proposal Title Card
  doc.setFillColor(254, 243, 199); // Amber-100
  doc.roundedRect(margin, 22, contentWidth, 26, 3, 3, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, 22, contentWidth, 26, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('OFFICIAL COMMERCIAL & TECHNICAL PROPOSAL', margin + 6, 28);

  doc.setFontSize(14);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  const capText = `${quote.capacityKw} KW ${quote.panelType || 'DCR'} ${(quote.systemType || 'On-Grid').toUpperCase()} SOLAR PLANT`;
  doc.text(`QUOTATION FOR ${capText}`, margin + 6, 38);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`High-Efficiency Rooftop Photovoltaic Power Generation System`, margin + 6, 44);

  // Metadata Grid
  const metaY = 52;
  doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
  doc.roundedRect(margin, metaY, contentWidth, 14, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, metaY, contentWidth, 14, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('QUOTATION REF', margin + 6, metaY + 5);
  doc.text('DATE OF ISSUE', margin + 55, metaY + 5);
  doc.text('VALIDITY PERIOD', margin + 105, metaY + 5);
  doc.text('SYSTEM CAPACITY', margin + 145, metaY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(quote.quotationNumber, margin + 6, metaY + 10.5);
  doc.text(quote.quotationDate || quote.createdAt, margin + 55, metaY + 10.5);
  doc.text(`${quote.validityDays || 15} Days (${quote.validTill || '15 Days'})`, margin + 105, metaY + 10.5);
  doc.text(`${quote.capacityKw} kWp Grid-Tied`, margin + 145, metaY + 10.5);

  // Two columns: Customer Info & Company Info
  const colWidth = (contentWidth - 6) / 2;
  const colY = 70;
  const colH = 50;

  // Left: Customer Box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, colY, colWidth, colH, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, colY, colWidth, colH, 2, 2, 'D');

  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(margin, colY, colWidth, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('PREPARED FOR (CLIENT DETAILS)', margin + 4, colY + 5);

  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(quote.customerName, margin + 4, colY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  if (quote.companyName) {
    doc.text(`Enterprise: ${quote.companyName}`, margin + 4, colY + 18);
  }
  doc.text(`Site: ${quote.siteAddress || 'Site Location'}`, margin + 4, colY + 23);
  doc.text(`City / State: ${quote.city || 'Chhattisgarh'}`, margin + 4, colY + 28);
  doc.text(`Contact: ${quote.customerPhone || 'N/A'}`, margin + 4, colY + 33);
  doc.text(`Email: ${quote.customerEmail || 'N/A'}`, margin + 4, colY + 38);
  if (quote.customerGst) {
    doc.text(`GSTIN: ${quote.customerGst}`, margin + 4, colY + 43);
  }

  // Right: Contractor Box
  const rightX = margin + colWidth + 6;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rightX, colY, colWidth, colH, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightX, colY, colWidth, colH, 2, 2, 'D');

  doc.setFillColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.roundedRect(rightX, colY, colWidth, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('PREPARED BY (SOLAR EPC CONTRACTOR)', rightX + 4, colY + 5);

  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Rejoy Solar Power Pvt. Ltd.', rightX + 4, colY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Turnkey Solar Engineering & Contracting', rightX + 4, colY + 18);
  doc.text('Corporate Office: Raipur, Chhattisgarh - 492001', rightX + 4, colY + 23);
  doc.text('Phone: +91 98795 44321', rightX + 4, colY + 28);
  doc.text('Email: info@rejoysolar.com / sales@rejoysolar.com', rightX + 4, colY + 33);
  doc.text('Website: www.rejoysolar.com', rightX + 4, colY + 38);
  doc.text('CIN / Registration: Registered Solar EPC', rightX + 4, colY + 43);

  // Executive Letter / Greeting
  const letterY = 126;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Dear ${quote.customerName},`, margin, letterY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  const introText = [
    `Thank you for showing your valued interest in Rejoy Solar Power Pvt. Ltd. We take immense pleasure in submitting our comprehensive commercial and technical proposal for the design, engineering, procurement, erection, testing, and commissioning of a ${quote.capacityKw} kW ${(quote.systemType || 'On-Grid')} Rooftop Solar Power Plant at your premises.`,
    '',
    `Our turnkey EPC solution integrates Tier-1 high-efficiency solar photovoltaic modules, state-of-the-art grid-tied string inverters, heavy-duty elevated hot-dip galvanized mounting structures, and robust electrical balance of systems. The proposed plant is custom-engineered to maximize solar energy generation, reduce your grid power dependence by up to 90%, and deliver long-term, inflation-proof savings for over 25 years.`,
    '',
    `Rejoy Solar handles the complete statutory liaison process with CSPDCL (Chhattisgarh State Power Distribution Co. Ltd.) and CEIG, from initial application to bidirectional net-meter synchronisation, ensuring an effortless transition to clean, green energy.`
  ];
  let curY = letterY + 6;
  introText.forEach(line => {
    if (line === '') {
      curY += 3;
    } else {
      const splitLines = doc.splitTextToSize(line, contentWidth);
      doc.text(splitLines, margin, curY);
      curY += splitLines.length * 4.2;
    }
  });

  // Highlight Box at bottom of Page 1
  const highlightY = curY + 6;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, highlightY, contentWidth, 24, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, highlightY, contentWidth, 24, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('KEY PROPOSAL HIGHLIGHTS', margin + 4, highlightY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`• Total Turnkey Project Cost: ${formatINR(quote.totalProjectCost || quote.totalAmount)} (Inclusive of GST)`, margin + 4, highlightY + 12);
  doc.text(`• Eligible Subsidy Assistance: ${formatINR(quote.totalSubsidy || 0)} (PM Surya Ghar / State Policy)`, margin + 4, highlightY + 17);
  doc.text(`• Net Effective Client Investment: ${formatINR(quote.finalProjectInvestment || (quote.totalProjectCost || quote.totalAmount) - (quote.totalSubsidy || 0))}`, margin + 4, highlightY + 22);

  drawFooter(1);

  // ==========================================
  // PAGE 2: KEY BENEFITS & SYSTEM EXPLANATION
  // ==========================================
  doc.addPage();
  drawHeader('Technical & Environmental Value Proposition', 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('1. KEY BENEFITS OF ON-GRID SOLAR POWER', margin, 24);

  // 6 Benefits Grid (2 cols x 3 rows)
  const benefits = [
    {
      title: 'DRAMATIC ELECTRICITY BILL REDUCTION',
      desc: 'Save up to 80% to 90% on monthly power bills by generating clean kWh onsite. Protect your business or household against escalating grid power expenditures.'
    },
    {
      title: '30-YEAR ENERGY INFLATION HEDGE',
      desc: 'While commercial and retail grid tariffs historically rise by 5-8% annually, solar power cost remains permanently zero once commissioned.'
    },
    {
      title: 'HIGH RELIABILITY & MINIMAL MAINTENANCE',
      desc: 'Solid-state semiconductor generation with zero moving parts. Backed by 25-Year Linear Power Output Warranty on Tier-1 Solar PV Modules.'
    },
    {
      title: 'CARBON FOOTPRINT REDUCTION & ESG',
      desc: `A ${quote.capacityKw} kW solar installation offsets over ${(quote.capacityKw * 1.3).toFixed(1)} tons of CO2 emissions annually, equivalent to planting hundreds of mature trees.`
    },
    {
      title: 'PROPERTY CAPITAL VALUE APPRECIATION',
      desc: 'Rooftop solar infrastructure modernizes premises, elevates real estate appraisal value, and provides prestigious green-building recognition.'
    },
    {
      title: 'ATTRACTIVE PAYBACK & HIGH FINANCIAL IRR',
      desc: 'Generates rapid capital payback within 3 to 4 years. Enjoy virtually free green electricity for the remaining 20+ years of plant lifespan.'
    }
  ];

  const bCardW = (contentWidth - 6) / 2;
  const bCardH = 28;
  let bY = 29;

  benefits.forEach((b, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = margin + col * (bCardW + 6);
    const y = bY + row * (bCardH + 4);

    doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
    doc.roundedRect(x, y, bCardW, bCardH, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, bCardW, bCardH, 2, 2, 'D');

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.circle(x + 5, y + 6, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text(b.title, x + 10, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    const splitDesc = doc.splitTextToSize(b.desc, bCardW - 8);
    doc.text(splitDesc, x + 4, y + 13);
  });

  // Section 2: How On-Grid Solar Works
  const howY = 135;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('2. HOW A SOLAR ON-GRID SYSTEM FUNCTIONS', margin, howY);

  const steps = [
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
  ];

  let stepY = howY + 6;
  steps.forEach(s => {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, stepY, contentWidth, 19, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, stepY, contentWidth, 19, 2, 2, 'D');

    doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.roundedRect(margin + 2, stepY + 2, 18, 5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(s.step, margin + 4, stepY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(s.title, margin + 24, stepY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    const splitDesc = doc.splitTextToSize(s.desc, contentWidth - 8);
    doc.text(splitDesc, margin + 4, stepY + 11.5);

    stepY += 21.5;
  });

  drawFooter(2);

  // ==========================================
  // PAGE 3: BILL OF MATERIALS (BOM) & SERVICES
  // ==========================================
  doc.addPage();
  drawHeader('Bill of Materials & Scope of Work', 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('1. BILL OF MATERIALS (BOM)', margin, 24);

  const bomItems = (quote.items && quote.items.length > 0) ? quote.items : [];
  const tableData = bomItems.map((item, idx) => [
    (idx + 1).toString(),
    item.productName || item.description || 'Solar Component',
    item.make || item.makeModel || 'Tier-1 Standard',
    `${item.quantity} ${item.unit}`,
    formatINR(item.rate || item.unitPrice || 0),
    formatINR(item.amount || item.totalPrice || 0)
  ]);

  autoTable(doc, {
    startY: 27,
    head: [['S.No', 'Product Description', 'Make / Brand', 'Qty / Unit', 'Rate (₹)', 'Amount (₹)']],
    body: tableData,
    foot: [['', 'TOTAL MATERIAL COST (BOM SUBTOTAL)', '', '', '', formatINR(quote.bomSubtotal || quote.baseAmount || 0)]],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [254, 243, 199],
      textColor: [180, 83, 9],
      fontSize: 8,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 62 },
      2: { cellWidth: 36 },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  const afterTableY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 140;

  // Section 2: Our Turnkey Services
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('2. OUR TURNKEY SERVICES (INCLUDED IN PROPOSAL)', margin, afterTableY);

  const services = [
    'Comprehensive 3D Shadow Profiling, Site Topography & Roof Load Assessment.',
    'Complete Structural Design & Wind Load Calculation (Compliant with IS 875 standards).',
    'Procurement, Factory Testing & Safe Onsite Logistics of all PV modules, inverters & BOS.',
    'Precision Mechanical Assembly, Module Clamping & Elevated Structure Erection.',
    'Complete DC & AC Cabling, Combiner Box Wiring, Earthing Pits & Lightning Protection.',
    'End-to-End Liaisoning with CSPDCL / State DISCOM for Net-Metering Approvals & CEIG.',
    'Plant Testing, Commissioning, Inverter Cloud WiFi Monitoring Setup & User Handover.',
    'Comprehensive 5-Year Operation & Preventive Maintenance (O&M) Warranty Support.'
  ];

  let servY = afterTableY + 5;
  services.forEach(s => {
    doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.circle(margin + 2, servY + 1.2, 1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(s, margin + 6, servY + 2.2);
    servY += 4.5;
  });

  // Section 3: Notes & Client Scope
  const notesY = servY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('3. NOTES & BALANCE OF MATERIAL', margin, notesY);

  const notes = [
    '• Net Metering approval is subject to CSPDCL/DISCOM guidelines, transformer capacity, and sanctioned load.',
    '• Client to provide adequate shadow-free roof area and structurally stable roof terrace.',
    '• Client to provide single-phase auxiliary electricity and clean water supply during erection & module cleaning.',
    '• All Balance of Material (BOM) items conform to IEC / BIS specifications with heavy-duty UV resistant conduits.'
  ];

  let nY = notesY + 5;
  notes.forEach(n => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(n, margin, nY);
    nY += 4;
  });

  drawFooter(3);

  // ==========================================
  // PAGE 4: COMMERCIAL PROPOSAL & FINANCIALS
  // ==========================================
  doc.addPage();
  drawHeader('Commercial Proposal & Financial Breakdown', 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('1. TURNKEY PROJECT COST BREAKDOWN', margin, 24);

  const eqPct = quote.gstEquipmentPercent || 70;
  const eqRate = quote.gstEquipmentRate || 5;
  const srvPct = quote.gstServicesPercent || 30;
  const srvRate = quote.gstServicesRate || 18;
  const basePrice = quote.baseProjectPrice || quote.baseAmount || 293848;
  const eqTax = (basePrice * (eqPct / 100) * eqRate) / 100;
  const srvTax = (basePrice * (srvPct / 100) * srvRate) / 100;

  const costRows = [
    ['Solar Plant Capacity', `${quote.capacityKw} kW`],
    ['Cost Per KW', `${formatINR(quote.costPerKw || Math.round(basePrice / quote.capacityKw))} / kW`],
    ['Base Turnkey Project Price (Excl. Tax)', formatINR(basePrice)],
    [`Equipment GST Component (${eqPct}% of Base @ ${eqRate}% GST)`, formatINR(eqTax)],
    [`Services GST Component (${srvPct}% of Base @ ${srvRate}% GST)`, formatINR(srvTax)],
    ['Total GST Amount (Composite EPC Scheme)', formatINR(quote.gstAmount || quote.taxAmount || 26152)],
    ['TOTAL PROJECT COST (GROSS EPC VALUE)', formatINR(quote.totalProjectCost || quote.totalAmount || 320000)],
    ['Central Subsidy Assistance (PM Surya Ghar Scheme)', `- ${formatINR(quote.centralSubsidy || 0)}`],
    ['State Subsidy Assistance (Chhattisgarh State Policy)', `- ${formatINR(quote.stateSubsidy || 0)}`],
    ['TOTAL APPLICABLE SUBSIDY', `- ${formatINR(quote.totalSubsidy || 0)}`],
    ['FINAL NET PROJECT INVESTMENT (CLIENT PAYABLE)', formatINR(quote.finalProjectInvestment || (quote.totalProjectCost || quote.totalAmount) - (quote.totalSubsidy || 0))]
  ];

  autoTable(doc, {
    startY: 27,
    head: [['Financial Parameter / Milestone', 'Amount / Specification']],
    body: costRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 125, fontStyle: 'bold' },
      1: { cellWidth: 57, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.row.index === 6 || data.row.index === 10) {
        data.cell.styles.fillColor = [254, 243, 199];
        data.cell.styles.textColor = [180, 83, 9];
        data.cell.styles.fontSize = 8.5;
      }
    },
    margin: { left: margin, right: margin }
  });

  const costTableEnd = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 110;

  // Cost in Words Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, costTableEnd, contentWidth, 14, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, costTableEnd, contentWidth, 14, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('TOTAL COST IN WORDS:', margin + 4, costTableEnd + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(quote.amountInWords || 'Three Lakh Twenty Thousand Rupees Only', margin + 4, costTableEnd + 10.5);

  // Milestone Payment Terms Table
  const termsY = costTableEnd + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('2. MILESTONE PAYMENT SCHEDULE', margin, termsY);

  const milestones = quote.paymentMilestones && quote.paymentMilestones.length > 0
    ? quote.paymentMilestones
    : [
      { id: '1', title: '10% Advance / Token', percentage: 10, amount: 32000, description: 'Upon signing of purchase order & contract execution' },
      { id: '2', title: '70% Material Procurement', percentage: 70, amount: 224000, description: 'On delivery of PV modules and inverter at site' },
      { id: '3', title: '18% Installation Day', percentage: 18, amount: 57600, description: 'On structural mounting & solar panel installation' },
      { id: '4', title: '2% Grid Connection Completion', percentage: 2, amount: 6400, description: 'On net-metering synchronization & final commissioning' }
    ];

  const milestoneRows = milestones.map((m, idx) => [
    `Stage 0${idx + 1}`,
    m.title,
    m.description || '',
    `${m.percentage}%`,
    formatINR(m.amount)
  ]);

  autoTable(doc, {
    startY: termsY + 4,
    head: [['Stage', 'Milestone', 'Condition / Trigger', 'Share', 'Amount (₹)']],
    body: milestoneRows,
    foot: [['', 'TOTAL CONTRACTUAL PAYMENT', '', '100%', formatINR(quote.totalProjectCost || quote.totalAmount || 320000)]],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [254, 243, 199],
      textColor: [180, 83, 9],
      fontSize: 8,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 46, fontStyle: 'bold' },
      2: { cellWidth: 70 },
      3: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin }
  });

  // Validity Banner
  const valY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 220;
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin, valY, contentWidth, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`* This Quotation is Valid For ${quote.validityDays || 15} Days From The Date Of Issuance (${quote.validTill || '15 Days'}).`, margin + 4, valY + 6.5);

  drawFooter(4);

  // ==========================================
  // PAGE 5: CONTACT, BANKING & SUBSIDY INFO
  // ==========================================
  doc.addPage();
  drawHeader('Contact, Banking & Subsidy Guidelines', 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('1. CONTACT US NOW', margin, 24);

  // Company Contact Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, 28, contentWidth, 34, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, 28, contentWidth, 34, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('Rejoy Solar Power Pvt. Ltd.', margin + 6, 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Registered Corporate Office: Raipur, Chhattisgarh - 492001, India', margin + 6, 41);
  doc.text('Helpline / WhatsApp: +91 98795 44321  |  Customer Care: +91 98250 12345', margin + 6, 47);
  doc.text('Email: info@rejoysolar.com  |  Sales: sales@rejoysolar.com  |  Web: www.rejoysolar.com', margin + 6, 53);
  doc.text('CIN: U40106CT2023PTC014285  |  GSTIN: 22AAACR9241Q1Z8', margin + 6, 59);

  // Bank Details Card
  const bankY = 68;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('2. OFFICIAL BANK ACCOUNT DETAILS (NEFT / RTGS / IMPS)', margin, bankY);

  const bankData = [
    ['Beneficiary Name', 'Rejoy Solar Power Pvt. Ltd.'],
    ['Bank Name', 'HDFC Bank Ltd.'],
    ['Account Number', '50200084729103'],
    ['Account Type', 'Current Account'],
    ['IFSC Code', 'HDFC0001234'],
    ['Branch', 'Raipur Main Branch, Chhattisgarh']
  ];

  autoTable(doc, {
    startY: bankY + 4,
    head: [['Banking Detail', 'Account Information']],
    body: bankData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 122, fontStyle: 'bold', textColor: [180, 83, 9] }
    },
    margin: { left: margin, right: margin }
  });

  // Chhattisgarh Subsidy Guide
  const subY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 125;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('3. CHHATTISGARH SUBSIDY & CSPDCL NET METERING GUIDELINES', margin, subY);

  const subInfo = [
    '• PM Surya Ghar Muft Bijli Yojana provides direct financial assistance of up to ₹78,000 for residential rooftop systems.',
    '• Chhattisgarh State Government provides additional state subsidy of ₹30,000 under the State Solar Promotion Scheme.',
    '• Direct Benefit Transfer (DBT): Subsidy is credited directly into consumer bank account post net-meter inspection by CSPDCL.',
    '• Turnkey Liaison: Rejoy Solar handles complete technical feasibility clearance, documentation, and meter installation with CSPDCL.',
    '• Mandatory Consumer Documents: Recent CSPDCL electricity bill, Aadhaar Card, PAN Card, and cancelled cheque of beneficiary bank account.'
  ];

  let subLineY = subY + 5;
  subInfo.forEach(line => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(line, margin, subLineY);
    subLineY += 4.5;
  });

  // Signatures / Acceptance Box
  const sigY = subLineY + 6;
  const sigW = (contentWidth - 6) / 2;
  const sigH = 34;

  // Left: Rejoy Solar
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, sigY, sigW, sigH, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, sigY, sigW, sigH, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('FOR REJOY SOLAR POWER PVT. LTD.', margin + 4, sigY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Authorized Signatory & Seal', margin + 4, sigY + 28);

  // Right: Customer Acceptance
  const cX = margin + sigW + 6;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cX, sigY, sigW, sigH, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(cX, sigY, sigW, sigH, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('CLIENT ACCEPTANCE & CONFIRMATION', cX + 4, sigY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Accepted By: ________________________________', cX + 4, sigY + 22);
  doc.text('Date & Stamp: _______________________________', cX + 4, sigY + 28);

  drawFooter(5);

  // ==========================================
  // PAGE 6: ELEVATED STRUCTURE & 3D MODEL
  // ==========================================
  doc.addPage();
  drawHeader('Technical Architecture & Elevated Structure', 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('1. ELEVATED STRUCTURE & SOLAR PANEL 3D TECHNICAL DESIGN', margin, 24);

  // 3D Schematic Representation Box
  const diagY = 28;
  const diagH = 92;
  doc.setFillColor(15, 23, 42); // Dark slate blueprint canvas
  doc.roundedRect(margin, diagY, contentWidth, diagH, 3, 3, 'F');

  // Blueprint grid lines
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.3);
  for (let gx = margin + 10; gx < margin + contentWidth; gx += 15) {
    doc.line(gx, diagY, gx, diagY + diagH);
  }
  for (let gy = diagY + 10; gy < diagY + diagH; gy += 15) {
    doc.line(margin, gy, margin + contentWidth, gy);
  }

  // Draw 3D Elevated Structure schematic using vector paths
  doc.setDrawColor(245, 158, 11); // Amber structure lines
  doc.setLineWidth(1.2);

  // Base pillars (columns)
  const p1x = margin + 35;
  const p2x = margin + 85;
  const p3x = margin + 145;
  const floorY = diagY + 80;
  const colTopY = diagY + 38;

  // Foundation blocks
  doc.setFillColor(71, 85, 105);
  doc.rect(p1x - 6, floorY - 2, 12, 4, 'F');
  doc.rect(p2x - 6, floorY - 2, 12, 4, 'F');
  doc.rect(p3x - 6, floorY - 2, 12, 4, 'F');

  // Vertical HDG Columns
  doc.line(p1x, floorY - 2, p1x, colTopY + 8);
  doc.line(p2x, floorY - 2, p2x, colTopY);
  doc.line(p3x, floorY - 2, p3x, colTopY - 6);

  // Bracings
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.line(p1x, floorY - 20, p2x, colTopY + 20);
  doc.line(p2x, floorY - 20, p1x, colTopY + 20);
  doc.line(p2x, floorY - 20, p3x, colTopY + 15);
  doc.line(p3x, floorY - 20, p2x, colTopY + 15);

  // Inclined Rafters (Tilt Angle 15°-22°)
  doc.setDrawColor(56, 189, 248); // Sky blue rafter
  doc.setLineWidth(1.5);
  doc.line(margin + 20, colTopY + 18, margin + 165, colTopY - 14);

  // Solar Modules Array mounted on top
  doc.setFillColor(30, 58, 138); // Deep solar cell blue
  doc.setDrawColor(147, 197, 253);
  doc.setLineWidth(0.8);

  // 4 tilted module panels
  const panelWidth = 32;
  const panelHeight = 16;
  const panelStarts = [margin + 25, margin + 60, margin + 95, margin + 130];

  panelStarts.forEach((px, i) => {
    const py = colTopY + 14 - i * 7;
    // Draw skewed panel
    doc.triangle(px, py, px + panelWidth, py - 6, px + panelWidth - 4, py - 6 + panelHeight, 'FD');
    doc.triangle(px, py, px + panelWidth - 4, py - 6 + panelHeight, px - 4, py + panelHeight, 'FD');
  });

  // Schematic Labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(253, 224, 71); // Yellow label
  doc.text('TIER-1 MONO PERC BIFACIAL MODULES (15°-22° SOUTH TILT)', margin + 35, diagY + 12);
  doc.text('HOT-DIP GALVANIZED (HDG) / PRE-GI HEAVY PURLINS & RAFTERS', margin + 35, diagY + 17);
  doc.text('ELEVATED 7 - 8 FT GROUND CLEARANCE (FULL ROOFTOP WALKABILITY)', margin + 35, floorY - 25);
  doc.text('HEAVY-DUTY RCC PEDESTAL WITH HILTI CHEMICAL ANCHORS', margin + 35, floorY + 6);

  // Section 2: Technical Specifications
  const specY = diagY + diagH + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('2. MOUNTING STRUCTURE & ENGINEERING PARAMETERS', margin, specY);

  const specData = [
    ['Structure Type', quote.structureType || 'Elevated Rooftop HDG / Pre-GI Solar Mounting Structure'],
    ['Clearance Height', 'Minimum 7 to 8 Feet headroom clearance allowing full roof utilization'],
    ['Steel Grade & Coating', 'High-Strength Steel (YSt 310 / 550 MPa) with 80-120 Micron Hot-Dip Galvanization'],
    ['Tilt Angle & Orientation', '15° to 22° True South orientation calculated for maximum annual solar yield'],
    ['Wind Load Rating', 'Aerodynamically certified to withstand sustained wind speeds up to 150 km/h (IS 875)'],
    ['Fasteners & Hardware', 'Grade SS304 Stainless Steel bolts, Belleville washers, and serrated flange nuts'],
    ['Foundation Anchoring', 'M25 RCC Pedestals with Hilti/Fischer Chemical Anchors (Zero roof puncture)'],
    ['Warranty & Lifespan', '25 Years structural integrity warranty designed for harsh weather conditions']
  ];

  autoTable(doc, {
    startY: specY + 4,
    head: [['Engineering Parameter', 'Technical Specification']],
    body: specData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 2.2,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 127, fontStyle: 'normal' }
    },
    margin: { left: margin, right: margin }
  });

  drawFooter(6);

  // Trigger download with clean filename
  const sanitizedCustomer = (quote.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Rejoy_Solar_Quotation_${quote.quotationNumber}_${sanitizedCustomer}.pdf`;
  doc.save(filename);
}
