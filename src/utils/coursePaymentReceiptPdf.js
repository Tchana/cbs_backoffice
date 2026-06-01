import { computeStudentPaymentTotals } from "./coursePaymentTotals";

const MARGIN = 16;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 285;

const money = (v, currency = "XAF") =>
  `${Number(v || 0).toLocaleString("fr-FR")} ${currency}`;

const amountNum = (v) => Number(v || 0).toLocaleString("fr-FR");

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatMethod = (m) => {
  const map = {
    cash: "Cash",
    mobile_money: "Mobile money",
    bank_transfer: "Bank transfer",
    card: "Card",
    other: "Other",
  };
  return map[m] || m || "—";
};

const studentDisplayName = (student) => {
  const name = `${student?.first_name || ""} ${student?.last_name || ""}`.trim();
  return name || student?.email || "Student";
};

export const buildCoursePaymentReceiptNumber = (paymentId) => {
  const year = new Date().getFullYear();
  const suffix = (paymentId || "").replace(/-/g, "").slice(0, 8).toUpperCase();
  return `CCP-${year}-${suffix || "00000000"}`;
};

function createPdfDoc() {
  return import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFont("helvetica");
    return doc;
  });
}

function drawOrgHeader(doc, y, title, subtitle) {
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, PAGE_W, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Center for Biblical Studies", MARGIN, 12);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(title, MARGIN, 22);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, MARGIN, 28);
  }
  doc.setTextColor(30, 30, 30);
  return 38;
}

function drawMetaGrid(doc, y, rows) {
  const colW = CONTENT_W / 2;
  let yy = y;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  for (let i = 0; i < rows.length; i += 2) {
    const left = rows[i];
    const right = rows[i + 1];
    if (left) {
      doc.text(left.label, MARGIN, yy);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text(left.value, MARGIN, yy + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
    }
    if (right) {
      doc.text(right.label, MARGIN + colW, yy);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text(right.value, MARGIN + colW, yy + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
    }
    yy += 14;
  }
  doc.setTextColor(30, 30, 30);
  return yy + 4;
}

function drawSectionTitle(doc, y, title) {
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text(title.toUpperCase(), MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  return y + 8;
}

function drawTable(doc, startY, columns, rows, options = {}) {
  const rowH = options.rowH || 8;
  const headerH = options.headerH || 9;
  let y = startY;

  const ensurePage = (need) => {
    if (y + need > FOOTER_Y) {
      doc.addPage();
      y = MARGIN + 8;
    }
  };

  ensurePage(headerH + 4);
  doc.setFillColor(245, 246, 250);
  doc.rect(MARGIN, y - 5, CONTENT_W, headerH, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 100);
  let x = MARGIN + 2;
  for (const col of columns) {
    const text = col.header;
    if (col.align === "right") {
      doc.text(text, x + col.width - 2, y, { align: "right" });
    } else {
      doc.text(text, x, y);
    }
    x += col.width;
  }
  y += headerH;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);

  rows.forEach((row, idx) => {
    ensurePage(rowH + 2);
    if (idx % 2 === 1) {
      doc.setFillColor(252, 252, 253);
      doc.rect(MARGIN, y - 5, CONTENT_W, rowH, "F");
    }
    doc.setFontSize(9);
    x = MARGIN + 2;
    columns.forEach((col, ci) => {
      const raw = row[ci] ?? "";
      const text = String(raw);
      if (col.align === "right") {
        doc.text(text, x + col.width - 2, y, { align: "right" });
      } else {
        const clipped =
          text.length > 42 ? `${text.slice(0, 40)}…` : text;
        doc.text(clipped, x, y);
      }
      x += col.width;
    });
    y += rowH;
  });

  doc.setDrawColor(230, 230, 230);
  doc.line(MARGIN, y - 3, MARGIN + CONTENT_W, y - 3);
  return y + 4;
}

function setRgb(doc, method, rgb) {
  doc[method](rgb[0], rgb[1], rgb[2]);
}

function drawSummaryCards(doc, y, cards) {
  const cardW = (CONTENT_W - 8) / Math.min(cards.length, 4);
  let x = MARGIN;
  const cardH = 22;
  for (const card of cards) {
    setRgb(doc, "setFillColor", card.highlight ? [238, 242, 255] : [248, 249, 252]);
    doc.setDrawColor(220, 220, 230);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 110);
    doc.text(card.label, x + 4, y + 7);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    setRgb(doc, "setTextColor", card.highlight ? [67, 56, 202] : [30, 30, 30]);
    doc.text(card.value, x + 4, y + 16);
    doc.setFont("helvetica", "normal");
    x += cardW + 8 / Math.max(cards.length - 1, 1);
  }
  doc.setTextColor(30, 30, 30);
  return y + cardH + 10;
}

function drawFooter(doc) {
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(
    "Center for Biblical Studies — official course payment record",
    MARGIN,
    FOOTER_Y
  );
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} / ${pages}`, PAGE_W - MARGIN, FOOTER_Y, { align: "right" });
  }
}

/**
 * Single deposit receipt PDF.
 */
export const downloadCourseDepositReceiptPdf = async ({
  student,
  payment,
  allocations = [],
}) => {
  if (!payment || payment.voided_at) return;

  const doc = await createPdfDoc();
  const receiptNumber = buildCoursePaymentReceiptNumber(payment.id);
  const lines = (allocations || []).filter((a) => !a.voided_at);
  const allocSum = lines.reduce((s, a) => s + Number(a.amount || 0), 0);

  let y = drawOrgHeader(doc, 0, "Payment Receipt", receiptNumber);

  y = drawMetaGrid(doc, y, [
    { label: "Student", value: studentDisplayName(student) },
    { label: "Date", value: formatDate(payment.operation_date || payment.paid_at) },
    ...(student?.email
      ? [
          { label: "Email", value: student.email },
          { label: "Method", value: formatMethod(payment.payment_method) },
        ]
      : [{ label: "Method", value: formatMethod(payment.payment_method) }]),
    ...(payment.reference
      ? [{ label: "Reference", value: payment.reference }]
      : []),
  ]);

  y = drawSummaryCards(doc, y, [
    { label: "Amount received", value: money(payment.amount), highlight: true },
    { label: "Assigned to courses", value: money(allocSum) },
    {
      label: "Unassigned (credit)",
      value: money(Math.max(Number(payment.amount) - allocSum, 0)),
    },
  ]);

  if (payment.notes) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Notes: ${payment.notes}`, MARGIN, y);
    y += 10;
  }

  y = drawSectionTitle(doc, y, "Applied to courses");

  if (lines.length === 0) {
    doc.setFontSize(9);
    doc.text("No course breakdown for this deposit.", MARGIN, y);
    y += 8;
  } else {
    y = drawTable(
      doc,
      y,
      [
        { header: "Course", width: 100 },
        { header: "Amount (XAF)", width: CONTENT_W - 100, align: "right" },
      ],
      lines.map((row) => [row.course?.title || "Course", amountNum(row.amount)])
    );
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "This receipt confirms payment received and how it was applied to course fees.",
    MARGIN,
    y + 4
  );

  drawFooter(doc);
  doc.save(`${receiptNumber}.pdf`);
};

/**
 * Full student course payment report (balances + history).
 */
export const downloadStudentCoursePaymentReportPdf = async ({
  student,
  balances = [],
  payments = [],
  allocations = [],
}) => {
  const doc = await createPdfDoc();
  const totals = computeStudentPaymentTotals({ balances, payments, allocations });
  const reportRef = `CCR-${new Date().getFullYear()}-${(student?.student_id || student?.id || "")
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase()}`;

  const activePayments = (payments || []).filter((p) => !p.voided_at);
  const activeAllocations = (allocations || []).filter((a) => !a.voided_at);

  let y = drawOrgHeader(doc, 0, "Student Payment Report", reportRef);

  y = drawMetaGrid(doc, y, [
    { label: "Student", value: studentDisplayName(student) },
    { label: "Generated", value: formatDate(new Date().toISOString()) },
    ...(student?.email ? [{ label: "Email", value: student.email }] : []),
  ]);

  y = drawSummaryCards(doc, y, [
    { label: "Total owed", value: money(totals.totalOwed), highlight: true },
    { label: "Total deposits", value: money(totals.totalDeposits) },
    { label: "Assigned", value: money(totals.totalAllocated) },
    { label: "Credit", value: money(totals.creditBalance) },
  ]);

  y = drawSectionTitle(doc, y, "Course balances");

  if (totals.courseRows.length === 0) {
    doc.setFontSize(9);
    doc.text("No courses with a catalog fee.", MARGIN, y);
    y += 10;
  } else {
    const tableRows = totals.courseRows.map((b) => [
      b.course_title || "—",
      amountNum(b.course_price),
      amountNum(b.amount_paid),
      amountNum(b.balance_due),
    ]);
    tableRows.push([
      "TOTAL",
      amountNum(totals.totalCoursePrice),
      amountNum(totals.totalPaidOnCourses),
      amountNum(totals.totalOwed),
    ]);

    y = drawTable(
      doc,
      y,
      [
        { header: "Course", width: 72 },
        { header: "Fee", width: 36, align: "right" },
        { header: "Paid", width: 36, align: "right" },
        { header: "Owed", width: CONTENT_W - 144, align: "right" },
      ],
      tableRows
    );

    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(
      "Total owed = sum of (course fee − paid) per course, for courses with a catalog fee only.",
      MARGIN,
      y
    );
    y += 8;
  }

  y = drawSectionTitle(doc, y, "Deposit history");

  if (activePayments.length === 0) {
    doc.setFontSize(9);
    doc.text("No deposits recorded.", MARGIN, y);
    y += 10;
  } else {
    for (const p of activePayments) {
      if (y > FOOTER_Y - 35) {
        doc.addPage();
        y = MARGIN + 8;
      }
      const receiptNo = buildCoursePaymentReceiptNumber(p.id);
      doc.setFillColor(248, 249, 252);
      doc.roundedRect(MARGIN, y, CONTENT_W, 7, 1, 1, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(
        `${formatDate(p.operation_date)} — ${money(p.amount)}`,
        MARGIN + 3,
        y + 5
      );
      doc.setFont("helvetica", "normal");
      y += 10;
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      doc.text(
        `${formatMethod(p.payment_method)} · ${receiptNo}${p.reference ? ` · Ref: ${p.reference}` : ""}`,
        MARGIN + 3,
        y
      );
      y += 6;
      const linked = activeAllocations.filter((a) => a.payment_id === p.id);
      for (const a of linked) {
        doc.setTextColor(50, 50, 50);
        doc.text(
          `    ${a.course?.title || "Course"}: ${money(a.amount)}`,
          MARGIN + 3,
          y
        );
        y += 5;
      }
      if (linked.length === 0) {
        doc.setTextColor(120, 120, 120);
        doc.text("    (No course lines on this deposit)", MARGIN + 3, y);
        y += 5;
      }
      y += 4;
      doc.setTextColor(30, 30, 30);
    }
  }

  const creditOnly = activeAllocations.filter(
    (a) => a.source === "credit" && !a.payment_id
  );
  if (creditOnly.length > 0) {
    y = drawSectionTitle(doc, y, "Credit applications");
    y = drawTable(
      doc,
      y,
      [
        { header: "Date", width: 44 },
        { header: "Course", width: 80 },
        { header: "Amount", width: CONTENT_W - 124, align: "right" },
      ],
      creditOnly.map((a) => [
        formatDate(a.operation_date).split(",")[0],
        a.course?.title || "—",
        amountNum(a.amount),
      ])
    );
  }

  drawFooter(doc);
  const safeName =
    studentDisplayName(student).replace(/[^\w\s-]/g, "").trim() || "student";
  doc.save(`${reportRef}-${safeName}.pdf`);
};
