const htmlEscape = (v) => String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const money = (v) => Number(v || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kg = (v) => Number(v || 0).toLocaleString('de-DE', { maximumFractionDigits: 2 });

/**
 * Štampa lista robe (direktan otkup = ULAZ ROBE, prodaja na malo = IZLAZ ROBE).
 * items: [{ materialName, materialCode, weightKg, pricePerKg, total }]
 */
export function printGoodsSlip({
    title = 'ULAZ ROBE',
    partyLabel = 'Od koga je primljeno',
    party,
    doc,
    items,
    createdAt,
    slipNo,
    footLeft = 'Kontrolisao:',
    footRightLabel = 'Primio:',
    targetWindow = null,
}) {
    if (typeof window === 'undefined') return;
    const w = targetWindow || window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    const normalizedItems = Array.isArray(items) ? items : [];
    const rowsHtml = normalizedItems.map((row, idx) => `
        <tr>
            <td>${idx + 1}.</td>
            <td>${htmlEscape(row.materialName || row.materialCode || '-')}</td>
            <td>Kg</td>
            <td class="right">${kg(row.weightKg)}</td>
            <td class="right">${kg(row.weightKg)}</td>
            <td class="right">${money(row.pricePerKg)}</td>
            <td class="right">${money(row.total)}</td>
        </tr>
    `).join('');
    const grandTotal = normalizedItems.reduce((sum, row) => sum + Number(row.total || 0), 0);
    const issuedAt = createdAt ? new Date(createdAt) : new Date();
    w.document.open();
    w.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${htmlEscape(title)}</title>
            <style>
              @page { size: A4; margin: 10mm; }
              body { font-family: Arial, sans-serif; margin: 0; color: #163b67; font-size: 13px; }
              .sheet { border: 2px solid #3b82f6; padding: 10px; }
              .head { display: flex; justify-content: space-between; align-items: center; }
              .title { font-size: 42px; font-weight: 800; letter-spacing: 1px; text-align: center; flex: 1; }
              .meta { font-size: 16px; font-weight: 700; text-align: right; min-width: 220px; }
              .line { border-bottom: 1px solid #3b82f6; margin: 8px 0; }
              .who { font-size: 18px; font-weight: 700; margin: 8px 0 12px; }
              table { width: 100%; border-collapse: collapse; font-size: 15px; color: #1f2937; }
              th, td { border: 1px solid #3b82f6; padding: 6px; }
              th { color: #1e3a8a; font-weight: 700; }
              .right { text-align: right; font-family: 'Courier New', monospace; }
              .sum { margin-top: 10px; display: flex; justify-content: flex-end; font-size: 16px; font-weight: 800; color: #1e3a8a; }
              .foot { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
              .box { border: 1px solid #3b82f6; min-height: 42px; padding: 8px; font-size: 16px; }
            </style>
          </head>
          <body>
            <div class="sheet">
              <div class="head">
                <div style="font-size:14px;font-weight:700;">MILKUS d.o.o. PALE</div>
                <div class="title">${htmlEscape(title)}</div>
                <div class="meta">
                  Datum: ${htmlEscape(issuedAt.toLocaleDateString('de-DE'))}<br/>
                  № ${htmlEscape(slipNo || `POS-${Date.now().toString().slice(-6)}`)}
                </div>
              </div>
              <div class="line"></div>
              <div class="who">${htmlEscape(partyLabel)}: ${htmlEscape(party || '-')}${doc ? ` <span style="font-weight:400;font-size:14px;">(dok. ${htmlEscape(doc)})</span>` : ''}</div>
              <table>
                <thead>
                  <tr>
                    <th style="width:46px">R.br</th>
                    <th>Naziv robe</th>
                    <th style="width:70px">Jed.</th>
                    <th style="width:110px">Bruto</th>
                    <th style="width:110px">Neto</th>
                    <th style="width:100px">Cijena</th>
                    <th style="width:130px">Iznos KM</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
              <div class="sum">UKUPNO: ${money(grandTotal)} KM</div>
              <div class="foot">
                <div class="box">${htmlEscape(footLeft)}</div>
                <div class="box">${htmlEscape(footRightLabel)}</div>
              </div>
            </div>
          </body>
        </html>
    `);
    w.document.close();
    setTimeout(() => {
        try { w.print(); } catch {}
    }, 120);
}
