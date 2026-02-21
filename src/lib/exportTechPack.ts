export interface TechPackData {
  sampleNumber: string
  sampleName: string
  year: string
  season: string
  division: string
  subCategory: string
  sampleType: string
  status: string
  supplierName: string
  mainFactoryCode: string
  originCountry: string
  thumbnailDataUrl: string
  colors: Array<{ colorCode: string; colorName: string; status: string }>
  mainFabric: { materialCode: string; materialName: string; placement?: string; costPerUnit: string; unit?: string; fabricSupplier: string }
  subFabrics: Array<{ materialCode: string; materialName: string; placement?: string; costPerUnit: string; unit?: string; fabricSupplier: string }>
  subMaterials: Array<{ materialCode: string; materialName: string; placement?: string; costPerUnit: string; unit?: string; fabricSupplier: string }>
  sizeInfo: string
  sizeOptions: string[]
  measurementPoints: string[]
  getMeasurementValue: (part: string, size: string) => string
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildColorRows(colors: TechPackData['colors']): string {
  if (colors.length === 0) return '<tr><td colspan="4" class="empty-cell">No colors assigned</td></tr>'
  return colors.map((c, i) => `
    <tr>
      <td class="cell-center">${i + 1}</td>
      <td>${esc(c.colorCode)}</td>
      <td>${esc(c.colorName)}</td>
      <td><span class="status-badge">${esc(c.status.replace(/_/g, ' '))}</span></td>
    </tr>`).join('')
}

function buildBomRows(data: TechPackData): string {
  const all = [
    { type: 'Main Fabric', ...data.mainFabric },
    ...data.subFabrics.map((m) => ({ type: 'Sub Fabric', ...m })),
    ...data.subMaterials.map((m) => ({ type: 'Sub Material', ...m })),
  ]
  if (all.length === 0) return '<tr><td colspan="6" class="empty-cell">No materials</td></tr>'
  return all.map((m) => `
    <tr>
      <td><span class="type-tag type-${m.type.toLowerCase().replace(/\s/g, '-')}">${esc(m.type)}</span></td>
      <td class="mono">${esc(m.materialCode || '-')}</td>
      <td>${esc(m.materialName || '-')}</td>
      <td>${esc(m.placement || '-')}</td>
      <td class="cell-right mono">${esc(m.costPerUnit || '-')}</td>
      <td class="cell-center">${esc(m.unit || '-')}</td>
    </tr>`).join('')
}

function buildSpecRows(data: TechPackData): string {
  if (data.measurementPoints.length === 0) {
    return `<tr><td colspan="${data.sizeOptions.length + 1}" class="empty-cell">No measurement data</td></tr>`
  }
  return data.measurementPoints.map((part, idx) => {
    const sizeCells = data.sizeOptions.map((s) =>
      `<td class="cell-center mono">${esc(data.getMeasurementValue(part, s) || '-')}</td>`
    ).join('')
    return `<tr class="${idx % 2 === 1 ? 'alt-row' : ''}"><td class="part-name">${esc(part)}</td>${sizeCells}</tr>`
  }).join('')
}

export async function exportTechPack(data: TechPackData) {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const sizeHeaders = data.sizeOptions.map((s) => `<th class="size-col">${esc(s)}</th>`).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Tech Pack – ${esc(data.sampleNumber || 'NEW')}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

  :root {
    --navy: #0f172a;
    --navy-light: #1e293b;
    --accent: #3b82f6;
    --accent-light: #dbeafe;
    --slate: #64748b;
    --slate-light: #94a3b8;
    --border: #e2e8f0;
    --bg-subtle: #f8fafc;
    --bg-alt: #f1f5f9;
    --text: #0f172a;
    --text-secondary: #475569;
    --white: #ffffff;
    --success: #059669;
    --success-bg: #d1fae5;
    --warning: #d97706;
    --warning-bg: #fef3c7;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  @page {
    size: A4;
    margin: 0;
  }

  body {
    font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--text);
    background: var(--white);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 0;
    margin: 0 auto;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }

  /* ── Header Bar ── */
  .header-bar {
    background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);
    padding: 28px 36px 24px;
    position: relative;
    overflow: hidden;
  }
  .header-bar::after {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 200px; height: 100%;
    background: linear-gradient(135deg, transparent 50%, rgba(59,130,246,0.12) 50%);
  }
  .header-brand {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 4px;
  }
  .header-title {
    font-size: 26px;
    font-weight: 700;
    color: var(--white);
    letter-spacing: -0.5px;
    line-height: 1.2;
  }
  .header-sub {
    font-size: 12px;
    color: var(--slate-light);
    margin-top: 6px;
    font-weight: 400;
  }
  .header-sub span {
    color: var(--accent);
    font-weight: 500;
  }

  /* ── Accent Strip ── */
  .accent-strip {
    height: 3px;
    background: linear-gradient(90deg, var(--accent), #8b5cf6, #ec4899);
  }

  /* ── Content Area ── */
  .content {
    padding: 24px 36px 20px;
  }

  /* ── Section Headers ── */
  .section {
    margin-bottom: 22px;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--navy);
  }
  .section-header h2 {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--navy);
  }
  .section-header .line {
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .section-tag {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--accent);
    background: var(--accent-light);
    padding: 2px 8px;
    border-radius: 3px;
  }

  /* ── Info Grid ── */
  .info-layout {
    display: flex;
    gap: 24px;
  }
  .info-image {
    flex-shrink: 0;
    width: 140px;
    height: 170px;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    background: var(--bg-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .info-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .info-image .placeholder {
    font-size: 10px;
    color: var(--slate-light);
    text-align: center;
  }
  .info-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }
  .info-item {
    padding: 7px 12px;
    border-bottom: 1px solid var(--border);
  }
  .info-item:nth-child(odd) { border-right: 1px solid var(--border); }
  .info-label {
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--slate);
    margin-bottom: 2px;
  }
  .info-value {
    font-size: 11px;
    font-weight: 500;
    color: var(--text);
  }

  /* ── Tables ── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  th {
    background: var(--navy);
    color: var(--white);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 8px 10px;
    text-align: left;
    white-space: nowrap;
  }
  td {
    padding: 7px 10px;
    border-bottom: 1px solid var(--border);
    font-size: 10px;
    color: var(--text-secondary);
    vertical-align: middle;
  }
  .alt-row td { background: var(--bg-subtle); }
  .cell-center { text-align: center; }
  .cell-right { text-align: right; }
  .mono { font-family: 'DM Mono', 'SF Mono', monospace; font-size: 10px; }
  .empty-cell {
    text-align: center;
    color: var(--slate-light);
    font-style: italic;
    padding: 16px;
  }
  .part-name { font-weight: 600; color: var(--text); }
  .size-col { text-align: center; min-width: 44px; }

  /* ── Badges & Tags ── */
  .status-badge {
    display: inline-block;
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 3px;
    background: var(--bg-alt);
    color: var(--text-secondary);
  }
  .type-tag {
    display: inline-block;
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.3px;
    padding: 2px 8px;
    border-radius: 3px;
    white-space: nowrap;
  }
  .type-main-fabric { background: var(--navy); color: var(--white); }
  .type-sub-fabric { background: var(--accent-light); color: var(--accent); }
  .type-sub-material { background: var(--warning-bg); color: var(--warning); }

  /* ── Footer ── */
  .page-footer {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 12px 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border);
    background: var(--white);
  }
  .page-footer span {
    font-size: 8px;
    color: var(--slate-light);
    letter-spacing: 0.5px;
  }
  .page-num {
    font-weight: 600;
    color: var(--navy) !important;
  }

  /* ── Page 2 Specific ── */
  .spec-table th { text-align: center; }
  .spec-table th:first-child { text-align: left; }

  @media print {
    body { background: white; }
    .page { box-shadow: none; }
  }
  @media screen {
    body { background: #e2e8f0; padding: 20px 0; }
    .page { box-shadow: 0 4px 24px rgba(0,0,0,0.12); margin: 20px auto; border-radius: 2px; }
  }
</style>
</head>
<body>

<!-- ════════════ PAGE 1: SAMPLE INFO ════════════ -->
<div class="page">
  <div class="header-bar">
    <div class="header-brand">Tech Pack</div>
    <div class="header-title">${esc(data.sampleName || 'Untitled Sample')}</div>
    <div class="header-sub">
      <span>${esc(data.sampleNumber)}</span>&ensp;·&ensp;${esc(data.season)} ${esc(data.year)}&ensp;·&ensp;${esc(data.division)}
    </div>
  </div>
  <div class="accent-strip"></div>

  <div class="content">
    <!-- Sample Information -->
    <div class="section">
      <div class="section-header">
        <h2>Sample Information</h2>
        <div class="line"></div>
        <span class="section-tag">${esc(data.status.replace(/_/g, ' ') || 'Draft')}</span>
      </div>
      <div class="info-layout">
        <div class="info-image">
          ${data.thumbnailDataUrl
            ? `<img src="${data.thumbnailDataUrl}" alt="Sample" />`
            : '<div class="placeholder">No Image</div>'}
        </div>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Sample No.</div><div class="info-value">${esc(data.sampleNumber || '-')}</div></div>
          <div class="info-item"><div class="info-label">Type</div><div class="info-value">${esc(data.sampleType || '-')}</div></div>
          <div class="info-item"><div class="info-label">Year</div><div class="info-value">${esc(data.year || '-')}</div></div>
          <div class="info-item"><div class="info-label">Season</div><div class="info-value">${esc(data.season || '-')}</div></div>
          <div class="info-item"><div class="info-label">Division</div><div class="info-value">${esc(data.division || '-')}</div></div>
          <div class="info-item"><div class="info-label">Sub Category</div><div class="info-value">${esc(data.subCategory || '-')}</div></div>
          <div class="info-item"><div class="info-label">Supplier</div><div class="info-value">${esc(data.supplierName || '-')}</div></div>
          <div class="info-item"><div class="info-label">Main Factory</div><div class="info-value">${esc(data.mainFactoryCode || '-')}</div></div>
          <div class="info-item"><div class="info-label">Origin</div><div class="info-value">${esc(data.originCountry || '-')}</div></div>
          <div class="info-item"><div class="info-label">Sample Name</div><div class="info-value">${esc(data.sampleName || '-')}</div></div>
        </div>
      </div>
    </div>

    <!-- Colorways -->
    <div class="section">
      <div class="section-header">
        <h2>Colorways</h2>
        <div class="line"></div>
        <span class="section-tag">${data.colors.length} color${data.colors.length !== 1 ? 's' : ''}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:40px">No.</th>
            <th>Color Code</th>
            <th>Color Name</th>
            <th style="width:100px">Status</th>
          </tr>
        </thead>
        <tbody>${buildColorRows(data.colors)}</tbody>
      </table>
    </div>

    <!-- Bill of Materials -->
    <div class="section">
      <div class="section-header">
        <h2>Bill of Materials</h2>
        <div class="line"></div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:90px">Type</th>
            <th style="width:110px">Code</th>
            <th>Name</th>
            <th>Placement</th>
            <th style="width:80px;text-align:right">Unit Price</th>
            <th style="width:50px;text-align:center">Unit</th>
          </tr>
        </thead>
        <tbody>${buildBomRows(data)}</tbody>
      </table>
    </div>
  </div>

  <div class="page-footer">
    <span>Generated on ${esc(dateStr)}</span>
    <span class="page-num">1 / 2</span>
  </div>
</div>

<!-- ════════════ PAGE 2: SPEC INFORMATION ════════════ -->
<div class="page">
  <div class="header-bar">
    <div class="header-brand">Tech Pack</div>
    <div class="header-title">Spec Information</div>
    <div class="header-sub">
      <span>${esc(data.sampleNumber)}</span>&ensp;·&ensp;${esc(data.sampleName)}&ensp;·&ensp;Size Group: ${esc(data.sizeInfo || '-')}
    </div>
  </div>
  <div class="accent-strip"></div>

  <div class="content">
    <div class="section">
      <div class="section-header">
        <h2>Measurement Points</h2>
        <div class="line"></div>
        <span class="section-tag">${data.measurementPoints.length} point${data.measurementPoints.length !== 1 ? 's' : ''}</span>
      </div>
      <table class="spec-table">
        <thead>
          <tr>
            <th style="text-align:left">Part</th>
            ${sizeHeaders || '<th class="size-col">Size</th>'}
          </tr>
        </thead>
        <tbody>${buildSpecRows(data)}</tbody>
      </table>
    </div>
  </div>

  <div class="page-footer">
    <span>Generated on ${esc(dateStr)}</span>
    <span class="page-num">2 / 2</span>
  </div>
</div>

</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) {
    alert('Pop-up blocked. Please allow pop-ups for this site.')
    return
  }
  w.document.write(html)
  w.document.close()

  w.onload = () => {
    setTimeout(() => w.print(), 400)
  }
}
