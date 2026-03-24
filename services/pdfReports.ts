import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  UserProfile,
  InventoryItem,
  Patient,
  Diagnosis,
  Payment,
  Referral,
  Task,
  Reminder,
} from '../types';

const PAGE_MARGIN = 14;
const HEADER_BOX_WIDTH = 120;

function shortCode(id: string): string {
  const compact = id.replace(/-/g, '');
  return compact.length <= 12 ? compact.toUpperCase() : compact.slice(0, 12).toUpperCase();
}

function formatKesAmount(n: number): string {
  return n.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatExpiryPdf(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function drawFacilityHeader(
  doc: jsPDF,
  facility: UserProfile,
  reportTitle: string,
  yearLabel?: string
): number {
  const pageW = doc.internal.pageSize.getWidth();
  let y = PAGE_MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175);
  doc.text('MamaSafe', PAGE_MARGIN, y + 6);

  const boxX = PAGE_MARGIN + 42;
  const boxY = y;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(boxX, boxY, HEADER_BOX_WIDTH, 36);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const upperName = (facility.name || 'Facility').toUpperCase();
  doc.text(upperName, boxX + 3, boxY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const tag =
    facility.role === 'pharmacy'
      ? 'PHARMACY — PATIENT CARE & INVENTORY'
      : 'CLINIC — MATERNAL & CLINICAL CARE';
  doc.text(tag, boxX + 3, boxY + 13);

  const addr = facility.location || '';
  doc.text(addr ? `ADDRESS: ${addr}` : 'ADDRESS: —', boxX + 3, boxY + 19);

  const phone = facility.phone || '';
  const email = facility.email || '';
  doc.text(`TEL: ${phone || '—'}`, boxX + 3, boxY + 25);
  doc.text(email ? `EMAIL: ${email}` : 'EMAIL: —', boxX + 3, boxY + 31);

  y = boxY + 44;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(reportTitle.toUpperCase(), pageW / 2, y, { align: 'center' });
  if (yearLabel) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(yearLabel, pageW / 2, y + 5, { align: 'center' });
    y += 10;
  } else {
    y += 8;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN, y, pageW - PAGE_MARGIN, y);
  return y + 6;
}

function triggerDownload(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

export function downloadInventoryStockPdf(
  facility: UserProfile,
  items: InventoryItem[],
  title = 'INVENTORY STOCK LIST'
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const year = new Date().getFullYear().toString();
  let y = drawFacilityHeader(doc, facility, title, year);

  const body = items.map((row) => [
    shortCode(row.id),
    `${row.name} (${row.unit})`,
    row.unitPriceKes != null && !Number.isNaN(Number(row.unitPriceKes))
      ? formatKesAmount(Number(row.unitPriceKes))
      : '—',
    (row.supplier && String(row.supplier).trim()) || '—',
    formatExpiryPdf(row.expiryDate),
    String(row.stock),
    String(row.minLevel),
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        'CODE',
        'PRODUCT / ITEM',
        'UNIT PRICE (KES)',
        'SUPPLIER',
        'EXPIRY',
        'CURRENT STOCK',
        'MIN LEVEL',
      ],
    ],
    body,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 28 },
      2: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Generated ${new Date().toLocaleString()} · Low stock when current ≤ min level.`,
    PAGE_MARGIN,
    finalY + 8
  );

  triggerDownload(doc, `mamasafe-inventory-${year}-${Date.now()}.pdf`);
}

export function downloadPatientDiagnosisPdf(
  facility: UserProfile,
  patient: Patient,
  diagnoses: Diagnosis[],
  options?: { visitDate?: string }
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = drawFacilityHeader(doc, facility, 'PATIENT DIAGNOSIS REPORT');

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient', PAGE_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(`Name: ${patient.name}`, PAGE_MARGIN, y);
  y += 5;
  doc.text(`Age: ${patient.age} · Phone: ${patient.phone || '—'} · Location: ${patient.location || '—'}`, PAGE_MARGIN, y);
  y += 5;
  if (options?.visitDate) {
    doc.text(`Visit date: ${options.visitDate}`, PAGE_MARGIN, y);
    y += 5;
  }
  y += 4;

  const body = diagnoses.map((d) => {
    const dateStr = (d.diagnosisDate || d.createdAt || '').slice(0, 10);
    const info = [
      d.diagnosisName,
      d.diagnosisCode ? `ICD-10: ${d.diagnosisCode}` : '',
      `${d.diagnosisType} · ${d.severity || '—'}`,
    ]
      .filter(Boolean)
      .join(' · ');
    const treatment = d.description?.trim() || '—';
    return [dateStr, info, treatment];
  });

  autoTable(doc, {
    startY: y,
    head: [['DATE', 'DIAGNOSIS / INFORMATION', 'TREATMENT / NOTES']],
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 75 },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated ${new Date().toLocaleString()} · Confidential clinical record.`, PAGE_MARGIN, finalY + 8);

  triggerDownload(doc, `mamasafe-diagnosis-${patient.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}

export function downloadVisitPaymentSummaryPdf(
  facility: UserProfile,
  patient: Patient,
  payments: Payment[],
  totalTreatmentAmount: number | null | undefined
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = drawFacilityHeader(doc, facility, 'PAYMENT SUMMARY');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient', PAGE_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(`${patient.name} · ${patient.phone || '—'}`, PAGE_MARGIN, y);
  y += 8;

  const sumPaid = payments.reduce((s, p) => s + (Number.isFinite(p.amount) ? p.amount : 0), 0);
  const totalDue =
    totalTreatmentAmount != null && totalTreatmentAmount > 0 ? totalTreatmentAmount : null;
  const balance = totalDue != null ? Math.max(0, totalDue - sumPaid) : null;

  doc.setFont('helvetica', 'bold');
  doc.text('Visit totals (KES)', PAGE_MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(
    totalDue != null
      ? `Total treatment: ${totalDue.toFixed(2)} · Amount paid: ${sumPaid.toFixed(2)} · Balance due: ${balance!.toFixed(2)}`
      : `Amount collected (no total set): ${sumPaid.toFixed(2)} · Set “total treatment” in workflow to track balance.`,
    PAGE_MARGIN,
    y,
    { maxWidth: 180 }
  );
  y += 12;

  const body = payments.map((p) => [
    p.paymentType,
    p.amount.toFixed(2),
    p.paymentMethod,
    p.paymentStatus,
    p.paymentDate ? String(p.paymentDate).slice(0, 16).replace('T', ' ') : '—',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['TYPE', 'AMOUNT PAID', 'METHOD', 'STATUS', 'DATE']],
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right' },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated ${new Date().toLocaleString()}`, PAGE_MARGIN, finalY + 8);

  triggerDownload(doc, `mamasafe-payments-${patient.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}

function clipCell(s: string, max = 120): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/**
 * Full patient profile export (details, medications, referrals, tasks, reminders) for clinics/pharmacies.
 */
export function downloadPatientInformationPdf(
  facility: UserProfile,
  patient: Patient,
  context: {
    referrals: Referral[];
    tasks: Task[];
    reminders: Reminder[];
  }
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = drawFacilityHeader(doc, facility, 'PATIENT INFORMATION RECORD');

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient identification', PAGE_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(`Name: ${patient.name}`, PAGE_MARGIN, y);
  y += 4;
  doc.text(
    `Patient ID: ${shortCode(patient.id)} · Age: ${patient.age} · Phone: ${patient.phone || '—'}`,
    PAGE_MARGIN,
    y
  );
  y += 4;
  doc.text(`Location: ${patient.location || '—'}`, PAGE_MARGIN, y);
  y += 4;
  doc.text(
    `Patient type: ${patient.patientType === 'inpatient' ? 'Inpatient' : 'Outpatient'} · Risk: ${patient.riskStatus}`,
    PAGE_MARGIN,
    y
  );
  y += 4;
  if (patient.conditionType) {
    doc.text(`Primary condition: ${String(patient.conditionType)}`, PAGE_MARGIN, y);
    y += 4;
  }
  if (patient.gestationalWeeks != null) {
    doc.text(`Gestational weeks: ${patient.gestationalWeeks}`, PAGE_MARGIN, y);
    y += 4;
  }
  doc.text(
    `Next appointment: ${patient.nextAppointment ? new Date(patient.nextAppointment).toLocaleDateString() : '—'}`,
    PAGE_MARGIN,
    y
  );
  y += 4;
  if (patient.nextFollowUpDate) {
    doc.text(
      `Next follow-up: ${new Date(patient.nextFollowUpDate).toLocaleDateString()}`,
      PAGE_MARGIN,
      y
    );
    y += 4;
  }
  doc.text(
    `Last check-in: ${patient.lastCheckIn ? new Date(patient.lastCheckIn).toLocaleDateString() : '—'}`,
    PAGE_MARGIN,
    y
  );
  y += 6;

  if (patient.alerts && patient.alerts.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Alerts', PAGE_MARGIN, y);
    doc.setFont('helvetica', 'normal');
    y += 4;
    patient.alerts.slice(0, 8).forEach((a) => {
      doc.text(`• ${clipCell(a.message || '', 100)}`, PAGE_MARGIN, y);
      y += 4;
    });
    y += 2;
  }

  const meds = patient.medications || [];
  if (meds.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Medications', PAGE_MARGIN, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    const medBody = meds.map((m) => [
      clipCell(m.name, 40),
      clipCell(m.dosage, 24),
      clipCell(m.frequency, 24),
      clipCell(m.instructions || '—', 50),
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Medication', 'Dosage', 'Frequency', 'Instructions']],
      body: medBody,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
    y += 6;
  }

  const refs = context.referrals;
  if (refs.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Referrals', PAGE_MARGIN, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    const refBody = refs.map((r) => [
      clipCell(`${r.fromFacility} → ${r.toFacility}`, 55),
      clipCell(r.reason, 60),
      r.status,
      new Date(r.createdAt).toLocaleDateString(),
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Route', 'Reason', 'Status', 'Created']],
      body: refBody,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
    y += 6;
  }

  const tasks = context.tasks;
  if (tasks.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Tasks', PAGE_MARGIN, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    const taskBody = tasks.map((t) => [
      t.type,
      t.resolved ? 'Done' : 'Open',
      clipCell(t.deadline, 40),
      clipCell(t.notes || '—', 55),
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Type', 'Status', 'Deadline', 'Notes']],
      body: taskBody,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
    y += 6;
  }

  const rems = context.reminders;
  if (rems.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Reminders', PAGE_MARGIN, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    const remBody = rems.map((r) => [
      r.type,
      r.channel,
      r.sent ? 'Sent' : 'Pending',
      new Date(r.scheduledFor).toLocaleString(),
      clipCell(r.message, 70),
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Type', 'Channel', 'State', 'Scheduled', 'Message']],
      body: remBody,
      theme: 'grid',
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
  }

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Generated ${new Date().toLocaleString()} · Confidential — for authorized clinical use only.`,
    PAGE_MARGIN,
    Math.min(finalY + 10, 285)
  );

  const safeName = patient.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
  triggerDownload(doc, `mamasafe-patient-${safeName || 'record'}-${Date.now()}.pdf`);
}
