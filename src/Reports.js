import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const API_URL = 'http://localhost:3000/api/v1';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ============================================
// CHART TO IMAGE HELPER
// ============================================
async function chartToImage(chartData, type = 'bar', width = 1400, height = 600) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const colors = ['#2D2B7A', '#00B4D8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    if (type === 'bar') {
      const maxVal = Math.max(...chartData.map(d => d.value));
      const barWidth = (width - 80) / chartData.length;
      const chartHeight = height - 60;

      ctx.fillStyle = '#F8F9FA';
      ctx.fillRect(0, 0, width, height);

      chartData.forEach((d, i) => {
        const barH = maxVal > 0 ? (d.value / maxVal) * chartHeight : 0;
        const x = 40 + i * barWidth + barWidth * 0.1;
        const bw = barWidth * 0.8;
        const y = chartHeight - barH + 20;

        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.roundRect(x, y, bw, barH, [3, 3, 0, 0]);
        ctx.fill();

        ctx.fillStyle = '#2D2B7A';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(d.value, x + bw / 2, y - 5);

        ctx.fillStyle = '#666';
        ctx.font = '9px Arial';
        const label = d.label.length > 10 ? d.label.substring(0, 10) + '…' : d.label;
        ctx.fillText(label, x + bw / 2, height - 10);
      });
    } else if (type === 'pie') {
      const total = chartData.reduce((s, d) => s + d.value, 0);
      let startAngle = -Math.PI / 2;
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(cx, cy) - 30;

      ctx.fillStyle = '#F8F9FA';
      ctx.fillRect(0, 0, width, height);

      chartData.forEach((d, i) => {
        const slice = total > 0 ? (d.value / total) * 2 * Math.PI : 0;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, startAngle + slice);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        const midAngle = startAngle + slice / 2;
        const lx = cx + (r * 0.65) * Math.cos(midAngle);
        const ly = cy + (r * 0.65) * Math.sin(midAngle);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (slice > 0.2) ctx.fillText(`${Math.round(d.value/total*100)}%`, lx, ly);

        startAngle += slice;
      });

      chartData.forEach((d, i) => {
        const lx = 10;
        const ly = 10 + i * 18;
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(lx, ly, 12, 12);
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${d.label}: ${d.value}`, lx + 16, ly + 1);
      });
    }

    resolve(canvas.toDataURL('image/png'));
  });
}

// ============================================
// PDF GENERATOR WITH CHARTS
// ============================================
async function generatePDF(title, subtitle, columns, rows, summaryStats, charts = []) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(45, 43, 122);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DEMARA', 14, 14);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Drug Import Traceability Platform', 14, 21);

  doc.setFontSize(9);
  doc.setTextColor(0, 180, 216);
  doc.text('Powered by DEMARA · Regulatory Consulting', 14, 28);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth - 14, 16, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, pageWidth - 14, 23, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleString('en-SA')}`, pageWidth - 14, 29, { align: 'right' });

  if (summaryStats && summaryStats.length > 0) {
    const boxWidth = (pageWidth - 28) / summaryStats.length;
    summaryStats.forEach((stat, i) => {
      const x = 14 + i * boxWidth;
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(x, 40, boxWidth - 4, 20, 2, 2, 'F');
      doc.setTextColor(45, 43, 122);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(String(stat.value), x + (boxWidth - 4) / 2, 52, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(stat.label, x + (boxWidth - 4) / 2, 57, { align: 'center' });
    });
  }

  let currentY = summaryStats ? 66 : 42;

  if (charts.length > 0) {
    doc.addPage();
    doc.setFillColor(45, 43, 122);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Analytics & Charts', 14, 8);

    let chartY = 18;
    const chartW = (pageWidth - 28) / 2;

    for (let i = 0; i < charts.length; i++) {
      const chart = charts[i];
      const imgData = await chartToImage(chart.data, chart.type, 500, 200);
      const x = i % 2 === 0 ? 14 : 14 + chartW + 4;

      if (i % 2 === 0 && i > 0) chartY += 75;

      doc.setFillColor(248, 249, 250);
      doc.roundedRect(x, chartY, chartW, 80, 2, 2, 'F');

      doc.setTextColor(45, 43, 122);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(chart.title, x + 4, chartY + 7);

      doc.addImage(imgData, 'PNG', x + 2, chartY + 10, chartW - 4, 65, undefined, 'NONE');
    }

    doc.addPage();
    doc.setFillColor(45, 43, 122);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Data', 14, 8);
    currentY = 18;
  }

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: currentY,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: [45, 43, 122],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { left: 14, right: 14 }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `DEMARA Drug Import Traceability Platform · Confidential · Page ${i} of ${pageCount}`,
      pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' }
    );
  }

  return doc;
}

// ============================================
// EXCEL GENERATOR
// ============================================
function generateExcel(filename, sheets) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(sheet => {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    // Style header row
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: col })];
      if (cell) {
        cell.s = {
          fill: { fgColor: { rgb: '2D2B7A' } },
          font: { bold: true, color: { rgb: 'FFFFFF' } }
        };
      }
    }
    ws['!cols'] = sheet.headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ============================================
// REPORT CARDS
// ============================================
function ReportCard({ title, description, icon, onPDF, onExcel, generating }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onPDF}
          disabled={generating}
          className="flex-1 py-2 text-white text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1"
          style={{background: '#2D2B7A'}}
        >
          {generating === 'pdf' ? 'Generating...' : '📄 Export PDF'}
        </button>
        <button
          onClick={onExcel}
          disabled={generating}
          className="flex-1 py-2 text-white text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1"
          style={{background: '#10B981'}}
        >
          {generating === 'excel' ? 'Generating...' : '📊 Export Excel'}
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN REPORTS COMPONENT
// ============================================
export default function Reports({ token }) {
  const [generating, setGenerating] = useState({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const setGen = (key, val) => setGenerating(prev => ({...prev, [key]: val}));

  const fetchTraces = async () => {
    const res = await fetch(`${API_URL}/traces`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return data.traces || [];
  };

  const fetchUsers = async () => {
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return data.users || [];
  };

  // ── Shipment Summary Report ──
  const shipmentPDF = async () => {
    setGen('shipments', 'pdf');
    try {
      const traces = await fetchTraces();
      const released = traces.filter(t => t.current_state === 'RELEASED').length;
      const active = traces.filter(t => t.current_state !== 'RELEASED').length;
      const ports = [...new Set(traces.map(t => t.port_of_entry))].length;

      const summaryStats = [
        { label: 'Total Shipments', value: traces.length },
        { label: 'Released', value: released },
        { label: 'Active', value: active },
        { label: 'Ports Used', value: ports },
      ];

const stateCount = traces.reduce((acc, t) => {
        acc[t.current_state] = (acc[t.current_state] || 0) + 1;
        return acc;
      }, {});

      const countryCount = traces.reduce((acc, t) => {
        acc[t.shipment_country] = (acc[t.shipment_country] || 0) + 1;
        return acc;
      }, {});

      const portCount = traces.reduce((acc, t) => {
        const port = t.port_of_entry.split(' - ')[0].replace('King ', '');
        acc[port] = (acc[port] || 0) + 1;
        return acc;
      }, {});

      const charts = [
        {
          title: 'Shipments by State',
          type: 'bar',
          data: Object.entries(stateCount).map(([label, value]) => ({ label, value }))
        },
        {
          title: 'Shipments by Country',
          type: 'bar',
          data: Object.entries(countryCount).map(([label, value]) => ({ label, value }))
        },
        {
          title: 'Shipments by Port',
          type: 'pie',
          data: Object.entries(portCount).map(([label, value]) => ({ label, value }))
        },
        {
          title: 'Active vs Released',
          type: 'pie',
          data: [
            { label: 'Active', value: active },
            { label: 'Released', value: released }
          ]
        }
      ];

      const columns = ['Trace No.', 'Importer', 'Country', 'Port of Entry', 'State', 'Created', 'Updated'];
      const rows = traces.map(t => [
        t.trace_number, t.importer_name, t.shipment_country,
        t.port_of_entry, t.current_state,
        formatDateShort(t.created_at), formatDateShort(t.updated_at)
      ]);

      const doc = await generatePDF(
        'Shipment Summary Report',
        `All import clearance records · ${new Date().toLocaleDateString('en-SA')}`,
        columns, rows, summaryStats, charts
      );
      doc.save(`DEMARA_Shipment_Summary_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setGen('shipments', null);
    }
  };

  const shipmentExcel = async () => {
    setGen('shipments', 'excel');
    try {
      const traces = await fetchTraces();
      generateExcel('DEMARA_Shipment_Summary', [{
        name: 'Shipments',
        headers: ['Trace No.', 'Importer', 'Country', 'Port of Entry', 'State', 'FASEH Request', 'Created', 'Updated'],
        rows: traces.map(t => [
          t.trace_number, t.importer_name, t.shipment_country,
          t.port_of_entry, t.current_state, t.faseh_request_no,
          formatDateShort(t.created_at), formatDateShort(t.updated_at)
        ])
      }, {
        name: 'Summary by State',
        headers: ['State', 'Count', 'Percentage'],
        rows: Object.entries(traces.reduce((acc, t) => {
          acc[t.current_state] = (acc[t.current_state] || 0) + 1;
          return acc;
        }, {})).map(([state, count]) => [state, count, `${Math.round(count/traces.length*100)}%`])
      }, {
        name: 'Summary by Country',
        headers: ['Country', 'Count'],
        rows: Object.entries(traces.reduce((acc, t) => {
          acc[t.shipment_country] = (acc[t.shipment_country] || 0) + 1;
          return acc;
        }, {})).map(([country, count]) => [country, count])
      }]);
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setGen('shipments', null);
    }
  };

  // ── Dwell Time Report ──
  const dwellPDF = async () => {
    setGen('dwell', 'pdf');
    try {
      const traces = await fetchTraces();
      const released = traces.filter(t => t.current_state === 'RELEASED' && t.total_dwell_minutes);
      const avgDwell = released.length > 0
        ? Math.round(released.reduce((sum, t) => sum + t.total_dwell_minutes, 0) / released.length)
        : 0;

      const summaryStats = [
        { label: 'Total Tracked', value: traces.length },
        { label: 'Released', value: released.length },
        { label: 'Avg Dwell (min)', value: avgDwell },
        { label: 'Avg Dwell (hrs)', value: Math.round(avgDwell/60) },
      ];

      const columns = ['Trace No.', 'Importer', 'Port', 'State', 'Dwell (min)', 'Dwell (hrs)', 'SLA Breached'];
      const rows = traces.map(t => [
        t.trace_number,
        t.importer_name,
        t.port_of_entry,
        t.current_state,
        t.total_dwell_minutes || 'In progress',
        t.total_dwell_minutes ? Math.round(t.total_dwell_minutes / 60) : 'In progress',
        t.sla_breached ? 'YES' : 'No'
      ]);

      const doc = await generatePDF(
        'Dwell Time Analysis Report',
        `Time per shipment from submission to release`,
        columns, rows, summaryStats
      );
      doc.save(`DEMARA_Dwell_Time_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setGen('dwell', null);
    }
  };

  const dwellExcel = async () => {
    setGen('dwell', 'excel');
    try {
      const traces = await fetchTraces();
      generateExcel('DEMARA_Dwell_Time', [{
        name: 'Dwell Time',
        headers: ['Trace No.', 'Importer', 'Country', 'Port', 'State', 'Dwell (min)', 'Dwell (hrs)', 'SLA Breached', 'Created'],
        rows: traces.map(t => [
          t.trace_number, t.importer_name, t.shipment_country,
          t.port_of_entry, t.current_state,
          t.total_dwell_minutes || '', t.total_dwell_minutes ? Math.round(t.total_dwell_minutes/60) : '',
          t.sla_breached ? 'YES' : 'No', formatDateShort(t.created_at)
        ])
      }]);
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setGen('dwell', null);
    }
  };

  // ── User Activity Report ──
  const userPDF = async () => {
    setGen('users', 'pdf');
    try {
      const users = await fetchUsers();
      const active = users.filter(u => u.is_active).length;
      const roles = [...new Set(users.map(u => u.role))].length;

      const summaryStats = [
        { label: 'Total Users', value: users.length },
        { label: 'Active', value: active },
        { label: 'Inactive', value: users.length - active },
        { label: 'Roles', value: roles },
      ];

      const columns = ['Name', 'Email', 'Organisation', 'Role', 'Status', 'Last Login'];
      const rows = users.map(u => [
        u.full_name, u.email, u.organisation_name || '—',
        u.role.replace(/_/g, ' '),
        u.is_active ? 'Active' : 'Inactive',
        formatDateShort(u.last_login_at)
      ]);

      const doc = await generatePDF(
        'User Activity Report',
        `All registered platform users`,
        columns, rows, summaryStats
      );
      doc.save(`DEMARA_User_Activity_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setGen('users', null);
    }
  };

  const userExcel = async () => {
    setGen('users', 'excel');
    try {
      const users = await fetchUsers();
      generateExcel('DEMARA_User_Activity', [{
        name: 'Users',
        headers: ['Name', 'Email', 'Organisation', 'Role', 'Status', 'Last Login', 'Created'],
        rows: users.map(u => [
          u.full_name, u.email, u.organisation_name || '—',
          u.role.replace(/_/g, ' '),
          u.is_active ? 'Active' : 'Inactive',
          formatDateShort(u.last_login_at),
          formatDateShort(u.created_at)
        ])
      }, {
        name: 'Users by Role',
        headers: ['Role', 'Count'],
        rows: Object.entries(users.reduce((acc, u) => {
          acc[u.role] = (acc[u.role] || 0) + 1;
          return acc;
        }, {})).map(([role, count]) => [role.replace(/_/g, ' '), count])
      }]);
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setGen('users', null);
    }
  };

  // ── Revenue Report ──
  const revenuePDF = async () => {
    setGen('revenue', 'pdf');
    try {
      const traces = await fetchTraces();
      const LAB_FEE = 1500;
      const ADMIN_FEE = 350;
      const VAT = 0.15;

      const released = traces.filter(t => t.current_state === 'RELEASED');
      const totalRevenue = released.reduce((sum, t) => {
        const subtotal = LAB_FEE + ADMIN_FEE;
        return sum + subtotal + (subtotal * VAT);
      }, 0);

      const summaryStats = [
        { label: 'Billed Shipments', value: released.length },
        { label: 'Total Revenue (SAR)', value: totalRevenue.toLocaleString() },
        { label: 'Avg per Shipment', value: released.length > 0 ? Math.round(totalRevenue/released.length).toLocaleString() : 0 },
        { label: 'VAT Collected', value: Math.round(totalRevenue * 0.15 / 1.15).toLocaleString() },
      ];

      const columns = ['Trace No.', 'Importer', 'Lab Fee (SAR)', 'Admin Fee (SAR)', 'Subtotal (SAR)', 'VAT (SAR)', 'Total (SAR)'];
      const rows = released.map(t => {
        const subtotal = LAB_FEE + ADMIN_FEE;
        const vat = subtotal * VAT;
        return [
          t.trace_number, t.importer_name,
          LAB_FEE.toLocaleString(), ADMIN_FEE.toLocaleString(),
          subtotal.toLocaleString(), vat.toLocaleString(),
          (subtotal + vat).toLocaleString()
        ];
      });

      const doc = await generatePDF(
        'Revenue Report',
        `Fee collection summary — all cleared shipments`,
        columns, rows, summaryStats
      );
      doc.save(`DEMARA_Revenue_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setGen('revenue', null);
    }
  };

  const revenueExcel = async () => {
    setGen('revenue', 'excel');
    try {
      const traces = await fetchTraces();
      const LAB_FEE = 1500;
      const ADMIN_FEE = 350;
      const VAT = 0.15;
      const released = traces.filter(t => t.current_state === 'RELEASED');

      generateExcel('DEMARA_Revenue', [{
        name: 'Revenue',
        headers: ['Trace No.', 'Importer', 'Country', 'Port', 'Lab Fee (SAR)', 'Admin Fee (SAR)', 'Subtotal (SAR)', 'VAT (SAR)', 'Total (SAR)', 'Released Date'],
        rows: released.map(t => {
          const subtotal = LAB_FEE + ADMIN_FEE;
          const vat = subtotal * VAT;
          return [
            t.trace_number, t.importer_name, t.shipment_country, t.port_of_entry,
            LAB_FEE, ADMIN_FEE, subtotal, vat, subtotal + vat,
            formatDateShort(t.updated_at)
          ];
        })
      }]);
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setGen('revenue', null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-1">Platform Reports</h3>
        <p className="text-xs text-gray-500">Generate PDF and Excel reports for all platform data. All reports include DEMARA branding and are ready to share with SFDA.</p>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-2 gap-4">
        <ReportCard
          title="Shipment Summary Report"
          description="All import clearance shipments with current state, importer, country and port breakdown"
          icon="🚢"
          onPDF={shipmentPDF}
          onExcel={shipmentExcel}
          generating={generating['shipments']}
        />
        <ReportCard
          title="Dwell Time Analysis"
          description="Time each shipment spent in the system — the key metric for the SFDA demo"
          icon="⏱️"
          onPDF={dwellPDF}
          onExcel={dwellExcel}
          generating={generating['dwell']}
        />
        <ReportCard
          title="User Activity Report"
          description="All registered users, roles, organisations and last login activity"
          icon="👥"
          onPDF={userPDF}
          onExcel={userExcel}
          generating={generating['users']}
        />
        <ReportCard
          title="Revenue Report"
          description="Fee collection summary for all released shipments including VAT breakdown"
          icon="💰"
          onPDF={revenuePDF}
          onExcel={revenueExcel}
          generating={generating['revenue']}
        />
      </div>
    </div>
  );
}