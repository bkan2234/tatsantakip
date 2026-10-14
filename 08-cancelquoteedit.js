function cancelQuoteEdit(){
  editingQuoteIndex = null;
  clearQuoteForm();
}

function saveQuote(){
  const obj = buildQuoteFromForm(true);
  if(!obj) return;

  if(editingQuoteIndex !== null && state.quotes && state.quotes[editingQuoteIndex]){
    state.quotes[editingQuoteIndex] = obj;
    alert("Teklif / proforma güncellendi.");
  }else{
    if(!state.quotes) state.quotes=[];
    state.quotes.push(obj);
    alert("Teklif / proforma kaydedildi.");
  }

  saveState();
  clearQuoteForm();
  renderAll();
}

function clearQuoteForm(){
  editingQuoteIndex = null;
  quoteSelected={};
  if(!state.quotes) state.quotes=[];
  q_no.value="TKF-"+String(state.quotes.length+1).padStart(4,"0");
  q_tarih.value=todayISO();
  if(document.getElementById("q_firma")) q_firma.value="";
  q_firma_manual.value="";
  ["q_yetkili","q_tel","q_mail","q_vergi_no","q_vergi_dairesi","q_adres"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
  q_iskonto.value="0";
  q_manual_disc.value="";
  q_valid_days.value=7;
  q_durum.value="Hazırlandı";
  q_aciklama.value="";
  if(document.getElementById("q_pdf_edit")) q_pdf_edit.value="";
  const btn = document.getElementById("saveQuoteBtn");
  const cancelBtn = document.getElementById("cancelQuoteEditBtn");
  if(btn) btn.textContent = "Teklifi Kaydet";
  if(cancelBtn) cancelBtn.classList.add("hide");
  toggleQuoteManualDiscount();
  renderDiscountProducts();
  renderQuoteProducts();
}


function quoteFirmaInfo(q){
  const firma = (state.firmalar||[]).find(f=>f.ad===q.firma) || {};
  const c = q.customerInfo || {};
  return {
    ad: c.ad || q.firma || firma.ad || "",
    adres: c.adres || q.adres || firma.adres || "",
    tel: c.tel || q.tel || firma.tel || "",
    mail: c.mail || q.mail || firma.mail || firma.email || "",
    vergiNo: c.vergiNo || q.vergiNo || firma.vergiNo || firma.vno || firma.vergi || "",
    vergiDairesi: c.vergiDairesi || q.vergiDairesi || firma.vergiDairesi || firma.vd || "",
    yetkili: c.yetkili || q.yetkili || firma.yetkili || ""
  };
}

function quotePdfHtml(q){
  const info = quoteFirmaInfo(q);
  const items = q.items || [];
  const typeTitle = "TEKLİF / PROFORMA";
  const companyLogo = "data:image/jpeg;base64,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";
  const rows = items.map((it,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${it.kod||""}</td>
      <td>${it.ad||""}</td>
      <td>${it.birim||""}</td>
      <td class="right">${Number(it.qty)||0}</td>
      <td class="right">${money(Number(it.fiyat)||0)}</td>
      <td class="right">${money(Number(it.brut)||0)}</td>
      <td class="right">${money(Number(it.disc)||0)}</td>
      <td class="right">${money(Number(it.kdv)||0)}</td>
      <td class="right">${money(Number(it.total)||0)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${q.no||"Teklif Proforma"}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial, sans-serif;margin:0;background:#f1f5f9;color:#0f172a}
  .page{width:210mm;min-height:297mm;margin:0 auto;background:white;padding:18mm;position:relative}
  .top{display:grid;grid-template-columns:1.2fr .8fr;gap:18px;border-bottom:3px solid #0f172a;padding-bottom:14px;align-items:start}
  .company-box{border:1.5px solid #94a3b8;border-radius:9px;padding:10px 12px;background:#fff;min-height:42mm}
  .company-name{font-size:11px;font-weight:900;line-height:1.25;margin-bottom:4px;color:#0f172a;text-transform:uppercase}
  .company-address{font-size:10.5px;line-height:1.3;margin-bottom:6px;color:#0f172a}
  .company-line{font-size:10.5px;line-height:1.25;margin:2px 0;display:grid;grid-template-columns:78px 1fr;gap:5px;color:#0f172a}
  .company-line b{font-weight:900;color:#0f172a}
  .logo-doc{display:flex;flex-direction:column;align-items:flex-end;gap:8px;min-width:0}
  .tatsan-logo{width:58mm;max-width:100%;height:auto;display:block;margin-bottom:4px}
  .doc-title{text-align:right;width:100%}
  .doc-title h2{margin:0;font-size:24px;color:#0f172a}
  .doc-title .no{margin-top:8px;font-size:14px;font-weight:bold}
  .badge{display:inline-block;margin-top:3px;padding:7px 10px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:bold;border:1px solid #bfdbfe}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}
  .box{border:1px solid #e2e8f0;border-radius:12px;padding:12px}
  .box h3{margin:0 0 10px;font-size:13px;color:#334155;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
  .line{font-size:12px;margin:5px 0}
  .line b{display:inline-block;min-width:105px;color:#0f172a}
  table{width:100%;border-collapse:collapse;margin-top:18px;font-size:11px}
  th{background:#0f172a;color:#fff;text-align:left;padding:8px 6px;border:1px solid #0f172a}
  td{padding:7px 6px;border:1px solid #cbd5e1;vertical-align:top}
  .right{text-align:right;white-space:nowrap}
  .totals{margin-top:16px;display:flex;justify-content:flex-end}
  .total-box{width:86mm;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
  .total-row{display:flex;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:12px}
  .total-row:last-child{border-bottom:0;background:#0f172a;color:#fff;font-size:15px;font-weight:bold}
  .note{margin-top:18px;border:1px solid #e2e8f0;border-radius:12px;padding:12px;font-size:12px;color:#334155;min-height:40px}
  .footer{position:absolute;left:18mm;right:18mm;bottom:13mm;text-align:center;color:#64748b;font-size:10px;border-top:1px solid #e2e8f0;padding-top:8px}
  .not-invoice{margin-top:14px;text-align:center;color:#b91c1c;font-weight:900;border:2px solid #fecaca;background:#fef2f2;padding:9px;border-radius:10px}
  .actions{position:fixed;right:18px;top:18px;display:flex;gap:8px}
  .actions button{border:0;border-radius:10px;padding:10px 12px;font-weight:bold;cursor:pointer}
  .print{background:#2563eb;color:white}
  .close{background:#e5e7eb;color:#111827}
  @media print{
    body{background:white}
    .page{margin:0;width:auto;min-height:auto;padding:12mm}
    .actions{display:none}
  }

    .quote-table .table-actions .btn:first-child{
      background:#eff6ff;
      color:#1d4ed8;
      border-color:#bfdbfe;
      font-weight:900;
    }

  </style>
</head>
<body>
  <div class="actions">
    <button class="print" onclick="window.print()">PDF / Yazdır</button>
    <button class="close" onclick="window.close()">Kapat</button>
  </div>
  <div class="page">
    <div class="top">
      <div class="company-box">
        <div class="company-name">TATSAN HELVA SANAYİ TİCARET LİMİTED ŞİRKETİ</div>
        <div class="company-address">ORGANİZE SAN.BÖL. KIZILCIKDERE KÖYÜ NO:5.CADDE NO:11<br>39100 KIRKLARELİ / KIRKLARELİ</div>
        <div class="company-line"><b>Tel</b><span>: 2882634444</span></div>
        <div class="company-line"><b>Faks</b><span>: 2882634440</span></div>
        <div class="company-line"><b>Web Sitesi</b><span>: www.tatsanhelva.com</span></div>
        <div class="company-line"><b>E-posta</b><span>: muhasebe@tatsanhelva.com</span></div>
        <div class="company-line"><b>Vergi Dairesi</b><span>: KIRKLARELİ VERGİ DAİRESİ</span></div>
        <div class="company-line"><b>VKN</b><span>: 8310046736</span></div>
        <div class="company-line"><b>Mersis No</b><span>: 0831004673600001</span></div>
        <div class="company-line"><b>Ticaret Sicil No</b><span>: 1879</span></div>
      </div>
      <div class="logo-doc">
        <img class="tatsan-logo" src="${companyLogo}" alt="Tatsan Logo">
        <div class="doc-title">
          <h2>${typeTitle}</h2>
          <div class="no">No: ${q.no||""}</div>
          <div class="line"><b>Tarih:</b> ${trDate(q.tarih||todayISO())}</div>
          <div class="line"><b>Geçerlilik:</b> ${Number(q.validDays)||0} Gün</div>
        </div>
        <span class="badge">${q.durum||"Hazırlandı"}</span>
      </div>
    </div>

    <div class="info-grid">
      <div class="box">
        <h3>Müşteri Bilgileri</h3>
        <div class="line"><b>Firma:</b> ${info.ad||"-"}</div>
        <div class="line"><b>Yetkili:</b> ${info.yetkili||"-"}</div>
        <div class="line"><b>Telefon:</b> ${info.tel||"-"}</div>
        <div class="line"><b>E-posta:</b> ${info.mail||"-"}</div>
        <div class="line"><b>Vergi No:</b> ${info.vergiNo||"-"}</div>
        <div class="line"><b>Vergi Dairesi:</b> ${info.vergiDairesi||"-"}</div>
        <div class="line"><b>Adres:</b> ${info.adres||"-"}</div>
      </div>
      <div class="box">
        <h3>Teklif Bilgileri</h3>
        <div class="line"><b>İskonto:</b> ${q.iskonto==="Manuel" ? manualDiscountText(q.manualDisc) : (q.iskonto||"0")}</div>
        <div class="line"><b>KDV:</b> %1</div>
        <div class="line"><b>Durum:</b> ${q.durum||"-"}</div>
        <div class="line"><b>Ürün Sayısı:</b> ${items.length}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Kod</th>
          <th>Ürün</th>
          <th>Birim</th>
          <th class="right">Miktar</th>
          <th class="right">Birim Fiyat</th>
          <th class="right">Brüt</th>
          <th class="right">İskonto</th>
          <th class="right">KDV</th>
          <th class="right">Toplam</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="10">Ürün yok</td></tr>`}</tbody>
    </table>

    <div class="totals">
      <div class="total-box">
        <div class="total-row"><span>Toplam Brüt</span><b>${money(Number(q.brut)||0)}</b></div>
        <div class="total-row"><span>Toplam İskonto</span><b>${money(Number(q.disc)||0)}</b></div>
        <div class="total-row"><span>KDV %1</span><b>${money(Number(q.kdv)||0)}</b></div>
        <div class="total-row"><span>Genel Toplam</span><b>${money(Number(q.total)||0)}</b></div>
      </div>
    </div>

    <div class="note">
      <b>Not / Açıklama:</b><br>
      ${q.aciklama||"-"}
      ${q.pdfEdit ? `<br><br><b>PDF Düzenleme Alanı:</b><br>${q.pdfEdit}` : ""}
    </div>

    <div class="not-invoice">BU BELGE FATURA DEĞİLDİR. TEKLİF / PROFORMA AMAÇLIDIR.</div>
    <div class="footer">Tatsan Helva Sanayi Ticaret Limited Şirketi</div>
  </div>
</body>
</html>`;
}

function openQuotePdf(index){
  const q = (state.quotes||[])[index];
  if(!q){
    alert("Teklif / proforma bulunamadı.");
    return;
  }
  const w = window.open("", "_blank");
  if(!w){
    alert("PDF penceresi açılamadı. Tarayıcı pop-up iznini kontrol edin.");
    return;
  }
  w.document.open();
  w.document.write(quotePdfHtml(q));
  w.document.close();
}

function renderQuotes(){
  if(!document.getElementById("quoteList")) return;
  if(!state.quotes) state.quotes=[];
  const q=(document.getElementById("qf_search")?.value || "").toLowerCase();
  const status=document.getElementById("qf_status")?.value || "";
  const startDate=document.getElementById("qf_start")?.value || "";
  const endDate=document.getElementById("qf_end")?.value || "";

  const rows = state.quotes.filter(x=>{
    const ci=x.customerInfo||{};
    const hay=String((x.no||"")+(x.firma||"")+(x.aciklama||"")+(ci.yetkili||"")+(ci.tel||"")+(ci.mail||"")+(ci.vergiNo||"")+(ci.vergiDairesi||"")+(ci.adres||"")).toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(status && x.durum!==status) return false;
    if(startDate && x.tarih<startDate) return false;
    if(endDate && x.tarih>endDate) return false;
    return true;
  });

  quoteList.innerHTML = rows.map((q)=>{
    const i = state.quotes.indexOf(q);
    return `<tr>
    <td>${q.no}</td>
    <td>${trDate(q.tarih)}</td>
    <td>${q.firma}</td>
    <td>${(q.items||[]).length}</td>
    <td>${(q.items||[]).reduce((s,x)=>s+(Number(x.qty)||0),0)}</td>
    <td class="money">${money(q.total)}</td>
    <td>${q.durum}</td>
    <td><div class="table-actions">
      <button class="btn" onclick="openQuotePdf(${i})">PDF Görüntüle</button><button class="btn" onclick="printQuote(${i})">Yazdır</button>
      <button class="btn" onclick="editQuote(${i})">Düzenle</button>
      <button class="btn" onclick="quoteToOrder(${i})">Siparişe Çevir</button>
      <button class="btn danger" onclick="delQuote(${i})">Sil</button>
    </div></td>
  </tr>`;
  }).join("") || `<tr><td colspan="8" class="muted">Teklif / proforma kaydı yok</td></tr>`;
}
