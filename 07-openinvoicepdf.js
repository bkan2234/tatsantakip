function openInvoicePdf(i){
  if(i === null || i === undefined) return alert("Önce fatura seçiniz.");
  const html = invoicePdfHtml(i);
  if(!html) return alert("Fatura bulunamadı.");
  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function printInvoice(){
  if(currentInvoiceIndex === null) return alert("Önce fatura görüntüleyin.");
  openInvoicePdf(currentInvoiceIndex);
}

function editOrderCargo(i){
  const o = state.orders[i];
  if(!o) return;
  const firma = prompt("Kargo firması:", o.kargoFirma || "");
  if(firma === null) return;
  const no = prompt("Kargo takip no:", o.kargoNo || "");
  if(no === null) return;
  const durum = prompt("Kargo durumu: Yok / Hazırlanıyor / Kargoya Verildi / Dağıtımda / Teslim Edildi / Sorunlu", o.kargoDurum || "Yok");
  if(durum === null) return;

  o.kargoFirma = firma;
  o.kargoNo = no;
  o.kargoDurum = durum || "Yok";
  delete o.kargoLink;
  saveState();
  renderAll();
}
function delOrder(i){if((state.orders[i]?.sevkler||[]).some(s=>s.id&&stockInit().movements.some(m=>m.shipmentKey===s.id)))return alert("Stoktan düşülmüş sevkiyatı bulunan sipariş silinemez. Önce İşlem Geçmişi üzerinden sevkiyatı geri alın.");if(confirm("Sipariş silinsin mi?")){state.orders.splice(i,1);if(editingOrderIndex===i) clearOrderForm();closeInvoice();saveState();renderAll();}}



let discountSelected = {};

function toggleDiscountManual(){
  const box = document.getElementById("d_manual_disc_box");
  if(!box) return;
  box.classList.toggle("hide", d_iskonto.value !== "Manuel");
}


function htmlEscape(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

function visibleDiscountProducts(){
  const filter = document.getElementById("d_kat_filter") ? d_kat_filter.value : "";
  return sortedProducts(state.urunler||[]).filter(u=>isProductActiveForUse(u) && (!filter || u.kat===filter));
}

function selectAllDiscountProducts(){
  const products = visibleDiscountProducts();
  if(!products.length){
    alert("Seçilecek aktif ürün bulunamadı.");
    return;
  }

  products.forEach((u,idx)=>{
    const key = productKey(u, idx);
    const old = discountSelected[key] || {};
    discountSelected[key] = {
      checked:true,
      qty:parseInt(old.qty)||1,
      birim:old.birim || u.birim || "Koli"
    };
  });

  renderDiscountProducts();
}



function discountPdfQuantityText(product, qty, birim){
  const unit = birim || (product && product.birim) || "";
  const amount = parseInt(qty)||1;
  const koliIci = Number((product && (product.koli || product.koliIci || product.koliIciAdet || product.koliAdet)) || 0);
  if(unit === "Koli" && koliIci > 0){
    return `${amount} Koli x ${koliIci}`;
  }
  return `${amount} ${unit}`.trim();
}

function productExtraPriceText(product, discountGroup, manualPercent){
  const parts = [];
  const kg = Number(product && product.kgFiyat)||0;
  const adet = Number(product && product.adetFiyat)||0;
  const mult = product && product.noDisc ? 1 : discountMultiplier(discountGroup || "0", manualPercent || "");
  const kdvMult = 1.01;

  if(kg > 0){
    parts.push("Kg KDV'li: " + money(kg * kdvMult));
    parts.push("İsk. Kg KDV'li: " + money(kg * mult * kdvMult));
  }

  if(adet > 0){
    parts.push("Adet KDV'li: " + money(adet * kdvMult));
    parts.push("İsk. Adet KDV'li: " + money(adet * mult * kdvMult));
  }

  return parts.join("<br>");
}

function getDiscountPdfRows(){
  const isk = document.getElementById("d_iskonto") ? d_iskonto.value : "0";
  const manualDisc = manualDiscountValue("d_manual_disc");
  const rows = [];
  const totals = {brut:0, disc:0, net:0, kdv:0, total:0};

  Object.entries(discountSelected||{}).forEach(([key,sel])=>{
    if(!sel.checked) return;
    const p = findProductBySelectionKey(key);
    if(!p || !isProductActiveForUse(p)) return;

    const qty = parseInt(sel.qty)||1;
    const birim = sel.birim || p.birim || "Koli";
    const c = calcLineByUnit(p, qty, birim, isk, manualDisc);
    const iskText = p.noDisc ? "İskonto Yok" : (isk==="Manuel" ? manualDiscountText(manualDisc) : isk);

    rows.push({
      kod:p.kod || "",
      ad:p.ad || "",
      kat:p.kat || "",
      birim,
      qty,
      quantityText:discountPdfQuantityText(p, qty, birim),
      unitPrice:c.unitPrice,
      extraPrices:productExtraPriceText(p, isk, manualDisc),
      brut:c.brut,
      iskonto:iskText,
      disc:c.disc,
      net:c.net,
      kdv:c.kdv,
      total:c.total
    });

    totals.brut += c.brut;
    totals.disc += c.disc;
    totals.net += c.net;
    totals.kdv += c.kdv;
    totals.total += c.total;
  });

  return {rows, totals, iskonto:isk, manualDisc};
}

function discountPdfHtml(data){
  const created = new Date().toLocaleString("tr-TR");
  const iskontoText = data.iskonto === "Manuel" ? manualDiscountText(data.manualDisc) : data.iskonto;
  const rowsHtml = data.rows.map((r,idx)=>`
    <tr>
      <td>${idx+1}</td>
      <td>${htmlEscape(r.kod)}</td>
      <td>${htmlEscape(r.ad)}</td>
      <td>${htmlEscape(r.kat)}</td>
      <td class="center">${htmlEscape(r.quantityText || ((r.qty||"") + " " + (r.birim||"")).trim())}</td>
      <td class="money">${money(r.unitPrice)}</td>
      <td class="extra-price-cell">${r.extraPrices || "-"}</td>
      <td class="money">${money(r.brut)}</td>
      <td>${htmlEscape(r.iskonto)}<br><small>${money(r.disc)}</small></td>
      <td class="money">${money(r.kdv)}</td>
      <td class="money">${money(r.total)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>İskonto Hesaplayıcı PDF</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#111827;background:#fff}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:3px solid #111827;padding-bottom:14px;margin-bottom:18px}
  h1{margin:0;font-size:24px}
  .muted{color:#6b7280;font-size:12px}
  .badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#eef2ff;color:#3730a3;font-weight:700}
  table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}
  th{background:#111827;color:#fff;text-align:left;padding:8px;border:1px solid #111827}
  td{padding:8px;border:1px solid #d1d5db;vertical-align:top}
  .money{text-align:right;white-space:nowrap}
  .center{text-align:center;white-space:nowrap}
  .extra-price-cell{min-width:115px;line-height:1.35}
  small{color:#6b7280}
  .summary{margin-top:18px;margin-left:auto;width:360px;border:1px solid #d1d5db}
  .summary div{display:flex;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #e5e7eb}
  .summary div:last-child{border-bottom:0;background:#111827;color:#fff;font-weight:800;font-size:15px}
  .actions{display:flex;justify-content:flex-end;margin-bottom:12px}
  .print-btn{border:0;background:#111827;color:#fff;padding:10px 14px;border-radius:8px;font-weight:700;cursor:pointer}
  @media print{
    body{margin:12mm}
    .actions{display:none}
    table{font-size:10px}
    th,td{padding:5px}
  }
</style>
</head>
<body>
  <div class="actions"><button class="print-btn" onclick="window.print()">Yazdır / PDF Kaydet</button></div>
  <div class="top">
    <div>
      <h1>İskonto Hesaplayıcı</h1>
      <div class="muted">PDF Görünümü - ${htmlEscape(created)}</div>
    </div>
    <div class="badge">İskonto: ${htmlEscape(iskontoText || "-")}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Kod</th>
        <th>Ürün</th>
        <th>Kategori</th>
        <th>Miktar</th>
        <th>Liste Fiyatı</th>
        <th>Kg / Adet KDV'li Fiyat</th>
        <th>Brüt</th>
        <th>İskonto</th>
        <th>KDV %1</th>
        <th>Genel Toplam</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="summary">
    <div><span>Toplam Brüt</span><b>${money(data.totals.brut)}</b></div>
    <div><span>Toplam İskonto</span><b>${money(data.totals.disc)}</b></div>
    <div><span>Net Tutar</span><b>${money(data.totals.net)}</b></div>
    <div><span>KDV %1</span><b>${money(data.totals.kdv)}</b></div>
    <div><span>Genel Toplam</span><b>${money(data.totals.total)}</b></div>
  </div>
</body>
</html>`;
}


function discountExcelTableHtml(data){
  const iskontoText = data.iskonto === "Manuel" ? manualDiscountText(data.manualDisc) : data.iskonto;
  const rowsHtml = data.rows.map((r,idx)=>`
    <tr>
      <td>${idx+1}</td>
      <td>${htmlEscape(r.kod)}</td>
      <td>${htmlEscape(r.ad)}</td>
      <td>${htmlEscape(r.kat)}</td>
      <td>${htmlEscape(r.quantityText || ((r.qty||"") + " " + (r.birim||"")).trim())}</td>
      <td>${r.extraPrices || "-"}</td>
      <td>${money(r.unitPrice)}</td>
      <td>${money(r.brut)}</td>
      <td>${htmlEscape(r.iskonto)}</td>
      <td>${money(r.disc)}</td>
      <td>${money(r.net)}</td>
      <td>${money(r.kdv)}</td>
      <td>${money(r.total)}</td>
    </tr>
  `).join("");

  return `<html>
<head>
<meta charset="UTF-8">
<style>
  table{border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:12px}
  th,td{border:1px solid #999;padding:6px;vertical-align:top}
  th{background:#eeeeee;font-weight:bold}
  .money{text-align:right;white-space:nowrap}
  .summary td{font-weight:bold;background:#f3f4f6}
</style>
</head>
<body>
  <h2>İskonto Hesaplayıcı</h2>
  <p><b>Tarih:</b> ${new Date().toLocaleString("tr-TR")}</p>
  <p><b>İskonto:</b> ${htmlEscape(iskontoText || "-")}</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Kod</th>
        <th>Ürün</th>
        <th>Kategori</th>
        <th>Miktar</th>
        <th>Kg / Adet KDV'li Fiyat</th>
        <th>Liste Fiyatı</th>
        <th>Brüt</th>
        <th>İskonto Tipi</th>
        <th>İskonto Tutarı</th>
        <th>Net</th>
        <th>KDV %1</th>
        <th>Genel Toplam</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <br>
  <table>
    <tbody class="summary">
      <tr><td>Toplam Brüt</td><td class="money">${money(data.totals.brut)}</td></tr>
      <tr><td>Toplam İskonto</td><td class="money">${money(data.totals.disc)}</td></tr>
      <tr><td>Net Tutar</td><td class="money">${money(data.totals.net)}</td></tr>
      <tr><td>KDV %1</td><td class="money">${money(data.totals.kdv)}</td></tr>
      <tr><td>Genel Toplam</td><td class="money">${money(data.totals.total)}</td></tr>
    </tbody>
  </table>
</body>
</html>`;
}

function downloadDiscountExcel(){
  const data = getDiscountPdfRows();
  if(!data.rows.length){
    alert("Excel indirmek için en az bir ürün seçiniz.");
    return;
  }

  const filename = "iskonto_hesaplayici_" + todayISO() + ".xls";
  const blob = new Blob(["\uFEFF" + discountExcelTableHtml(data)], {type:"application/vnd.ms-excel;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openDiscountPdf(){
  const data = getDiscountPdfRows();
  if(!data.rows.length){
    alert("PDF görmek için en az bir ürün seçiniz.");
    return;
  }

  const w = window.open("", "_blank");
  if(!w){
    alert("PDF penceresi açılamadı. Tarayıcı pop-up iznini kontrol edin.");
    return;
  }

  w.document.open();
  w.document.write(discountPdfHtml(data));
  w.document.close();
}

function renderDiscountProducts(){
  if(!document.getElementById("discountProductList")) return;

  const isk = document.getElementById("d_iskonto") ? d_iskonto.value : "0";
  const manualDisc = manualDiscountValue("d_manual_disc");
  const products = visibleDiscountProducts();

  discountProductList.innerHTML = products.map((u,idx)=>{
    const key = productKey(u, idx);
    const safeKey = escapeJsText(key);
    const sel = discountSelected[key] || {checked:false,qty:1,birim:(u.birim||"Koli")};
    const qty = parseInt(sel.qty)||1;
    const selectedUnit = sel.birim || u.birim || "Koli";
    const c = calcLineByUnit(u, qty, selectedUnit, isk, manualDisc);
    const iskText = u.noDisc ? '<span class="badge b-red">İskonto Yok</span>' : (isk==="Manuel" ? manualDiscountText(manualDisc) : isk);
    return `<tr>
      <td class="checkcell"><input type="checkbox" data-product-key="${safeKey}" ${sel.checked?'checked':''} onchange="toggleDiscountProduct('${safeKey}',this.checked)"></td>
      <td>${u.kod||""}</td>
      <td>${u.ad||""}</td>
      <td>${u.kat||""}</td>
      <td>${unitSelectHtml("discount",key,selectedUnit)}</td>
      <td class="money">${Number(u.koli)||0}</td>
      <td class="money">${money(c.unitPrice)}</td>
      <td><input class="num" type="number" min="1" step="1" value="${qty}" onchange="setDiscountQty('${safeKey}',this.value)"></td>
      <td class="money">${sel.checked?money(c.brut):money(0)}</td>
      <td>${iskText}<br><span class="muted">${sel.checked?money(c.disc):money(0)}</span></td>
      <td class="money">${sel.checked?money(c.kdv):money(0)}</td>
      <td class="money">${sel.checked?money(c.total):money(0)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="12" class="muted">${onlySelected?'Seçili ürün yok':'Aktif ürün yok'}</td></tr>`;

  renderDiscountSummary();
}

function toggleDiscountProduct(key,checked){
  if(!discountSelected[key]) discountSelected[key]={checked:false,qty:1,birim:(findProductBySelectionKey(key)?.birim||"Koli")};
  discountSelected[key].checked=checked;
  renderDiscountProducts();
}

function setDiscountQty(key,val){
  if(!discountSelected[key]) discountSelected[key]={checked:true,qty:1,birim:(findProductBySelectionKey(key)?.birim||"Koli")};
  discountSelected[key].qty=parseInt(val)||1;
  renderDiscountProducts();
}

function renderDiscountSummary(){
  if(!document.getElementById("ds_brut")) return;

  const isk = document.getElementById("d_iskonto") ? d_iskonto.value : "0";
  const manualDisc = manualDiscountValue("d_manual_disc");
  let brut=0, disc=0, net=0, kdv=0, total=0;

  Object.entries(discountSelected||{}).forEach(([key,sel])=>{
    if(!sel.checked) return;
    const p = findProductBySelectionKey(key);
    if(!p) return;
    const c = calcLineByUnit(p, parseInt(sel.qty)||1, sel.birim || p.birim || "Koli", isk, manualDisc);
    brut += c.brut;
    disc += c.disc;
    net += c.net;
    kdv += c.kdv;
    total += c.total;
  });

  ds_brut.textContent = money(brut);
  ds_disc.textContent = money(disc);
  ds_net.textContent = money(net);
  ds_kdv.textContent = money(kdv);
  ds_total.textContent = money(total);
}

function clearDiscountCalc(){
  discountSelected = {};
  if(document.getElementById("d_iskonto")) d_iskonto.value = "0";
  if(document.getElementById("d_manual_disc")) d_manual_disc.value = "0";
  toggleDiscountManual();
  renderDiscountProducts();
}


let quoteSelected = {};
let editingProductUid = null;
let editingQuoteIndex = null;

function toggleQuoteManualDiscount(){
  const box = document.getElementById("q_manual_disc_box");
  if(!box) return;
  box.classList.toggle("hide", q_iskonto.value !== "Manuel");
}

function fillQuoteCustomerFieldsFromFirm(f){
  if(!f) return;
  const setVal = (id,val)=>{ const el=document.getElementById(id); if(el) el.value = val || ""; };
  setVal("q_yetkili", f.yetkili || "");
  setVal("q_tel", f.tel || "");
  setVal("q_mail", f.mail || f.email || "");
  setVal("q_vergi_no", f.vergiNo || f.vno || f.vergi || "");
  setVal("q_vergi_dairesi", f.vergiDairesi || f.vd || "");
  setVal("q_adres", f.adres || "");
}

function quoteFirmaChanged(){
  const f = state.firmalar.find(x=>x.ad===q_firma.value);
  if(f){
    q_iskonto.value = f.iskonto || "0";
    q_manual_disc.value = f.manualDisc || "";
    fillQuoteCustomerFieldsFromFirm(f);
    toggleQuoteManualDiscount();
  }
  renderDiscountProducts();
  renderQuoteProducts();
}

function quoteLineCalc(product, sel, globalDiscount, globalManualDisc){
  const selectedUnit = sel.birim || product.birim || "Koli";
  const normalPrice = getUnitPrice(product, selectedUnit);
  const hasManualPrice = sel.manualPrice !== undefined && sel.manualPrice !== null && String(sel.manualPrice).trim() !== "";
  const manualPrice = hasManualPrice ? Number(sel.manualPrice) : NaN;
  const unitPrice = hasManualPrice && Number.isFinite(manualPrice) && manualPrice >= 0 ? manualPrice : normalPrice;

  const lineDiscount = sel.discount !== undefined && sel.discount !== null && String(sel.discount).trim() !== ""
    ? String(sel.discount).trim()
    : (globalDiscount === "Manuel" ? String(globalManualDisc || "0") : String(globalDiscount || "0"));
  const noDiscount = !!(product.noDisc || sel.noDiscount);

  const tempProduct = Object.assign({}, product, {fiyat:unitPrice, noDisc:noDiscount});
  // Teklif/Proforma satırındaki iskonto değeri doğrudan manuel ifade olarak hesaplanır.
  // Böylece 17.5, 12,5, 15+5, 20+2 gibi değerlerin tamamı çalışır.
  const c = calcLine(tempProduct, parseInt(sel.qty)||1, "Manuel", lineDiscount);
  c.unitPrice = unitPrice;
  c.normalUnitPrice = normalPrice;
  c.manualPrice = hasManualPrice ? unitPrice : null;
  c.lineDiscount = noDiscount ? "0" : lineDiscount;
  c.noDiscount = noDiscount;
  c.birim = selectedUnit;
  return c;
}

function renderQuoteProducts(){
  if(!document.getElementById("quoteProductList")) return;
  const filter = q_kat_filter.value || "";
  const isk = q_iskonto.value || "0";
  const manualDisc = manualDiscountValue("q_manual_disc");
  const onlySelected = !!document.getElementById("q_only_selected")?.checked;
  const products = sortedProducts(state.urunler||[]).map((u,idx)=>({u,idx})).filter(x=>{
    const u=x.u;
    if(!isProductActiveForUse(u) || (filter && u.kat!==filter)) return false;
    if(!onlySelected) return true;
    const key=productKey(u,x.idx);
    return !!quoteSelected[key]?.checked;
  });

  quoteProductList.innerHTML = products.map(({u,idx})=>{
    const key = productKey(u, idx);
    const safeKey = escapeJsText(key);
    const sel = quoteSelected[key] || {checked:false,qty:1,birim:(u.birim||"Koli"),manualPrice:null,discount:null,noDiscount:false};
    const qty = parseInt(sel.qty)||1;
    const selectedUnit = sel.birim || u.birim || "Koli";
    const c = quoteLineCalc(u, sel, isk, manualDisc);
    const inheritedDiscount = isk==="Manuel" ? String(manualDisc||"0") : String(isk||"0");
    const shownDiscount = sel.discount !== undefined && sel.discount !== null ? sel.discount : inheritedDiscount;
    return `<tr>
      <td class="checkcell"><input type="checkbox" data-product-key="${safeKey}" ${sel.checked?'checked':''} onchange="toggleQuoteProduct('${safeKey}',this.checked)"></td>
      <td>${u.kod||""}</td>
      <td>${u.ad||""}</td>
      <td>${u.kat||""}</td>
      <td>${unitSelectHtml("quote",key,selectedUnit)}</td>
      <td>${Number(u.koli)||0}</td>
      <td class="money">${money(c.normalUnitPrice)}</td>
      <td><input class="num" type="number" min="0" step="0.01" value="${sel.manualPrice!==undefined && sel.manualPrice!==null ? sel.manualPrice : ''}" placeholder="${Number(c.normalUnitPrice||0).toFixed(2)}" title="Boş bırakırsanız liste fiyatı kullanılır" onchange="setQuoteManualPrice('${safeKey}',this.value)"></td>
      <td><input class="num" type="number" min="1" step="1" value="${qty}" onchange="setQuoteQty('${safeKey}',this.value)"></td>
      <td><input type="text" value="${htmlEscape(String(shownDiscount||'0'))}" placeholder="15+5" style="width:78px" ${c.noDiscount?'disabled':''} onchange="setQuoteLineDiscount('${safeKey}',this.value)"></td>
      <td><label style="display:flex;align-items:center;gap:5px;white-space:nowrap"><input type="checkbox" ${sel.noDiscount?'checked':''} onchange="setQuoteNoDiscount('${safeKey}',this.checked)"> İsk. Yok</label>${u.noDisc?'<div class="muted" style="margin-top:3px">Ürün kartında kapalı</div>':''}</td>
      <td class="money">${sel.checked?money(c.total):money(0)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="12" class="muted">Aktif ürün yok</td></tr>`;

  renderQuoteSummary();
}

function toggleQuoteProduct(key,checked){
  if(!quoteSelected[key]) quoteSelected[key]={checked:false,qty:1,birim:(findProductBySelectionKey(key)?.birim||"Koli"),manualPrice:null,discount:null,noDiscount:false};
  quoteSelected[key].checked=checked;
  renderQuoteProducts();
}

function setQuoteQty(key,val){
  if(!quoteSelected[key]) quoteSelected[key]={checked:true,qty:1,birim:(findProductBySelectionKey(key)?.birim||"Koli"),manualPrice:null,discount:null,noDiscount:false};
  quoteSelected[key].qty=parseInt(val)||1;
  renderQuoteProducts();
}

function setQuoteManualPrice(key,val){
  if(!quoteSelected[key]) quoteSelected[key]={checked:true,qty:1,birim:(findProductBySelectionKey(key)?.birim||"Koli"),manualPrice:null,discount:null,noDiscount:false};
  const raw=String(val??"").trim();
  quoteSelected[key].manualPrice = raw==="" ? null : Math.max(0,Number(raw)||0);
  renderQuoteProducts();
}

function setQuoteLineDiscount(key,val){
  if(!quoteSelected[key]) quoteSelected[key]={checked:true,qty:1,birim:(findProductBySelectionKey(key)?.birim||"Koli"),manualPrice:null,discount:null,noDiscount:false};
  quoteSelected[key].discount = String(val||"0").trim() || "0";
  renderQuoteProducts();
}

function setQuoteNoDiscount(key,checked){
  if(!quoteSelected[key]) quoteSelected[key]={checked:true,qty:1,birim:(findProductBySelectionKey(key)?.birim||"Koli"),manualPrice:null,discount:null,noDiscount:false};
  quoteSelected[key].noDiscount=!!checked;
  renderQuoteProducts();
}

function renderQuoteSummary(){
  if(!document.getElementById("qs_brut")) return;
  const isk = q_iskonto.value || "0";
  const manualDisc = manualDiscountValue("q_manual_disc");
  let brut=0, disc=0, kdv=0, total=0;

  Object.entries(quoteSelected||{}).forEach(([key,sel])=>{
    if(!sel.checked) return;
    const p=findProductBySelectionKey(key);
    if(!p) return;
    const c=quoteLineCalc(p, sel, isk, manualDisc);
    brut += c.brut;
    disc += c.disc;
    kdv += c.kdv;
    total += c.total;
  });

  qs_brut.textContent=money(brut);
  qs_disc.textContent=money(disc);
  qs_kdv.textContent=money(kdv);
  qs_total.textContent=money(total);
}


function buildQuoteFromForm(requireItems){
  if(!state.quotes) state.quotes=[];
  const items=[];
  let total=0, brut=0, disc=0, kdv=0;
  const isk = q_iskonto.value || "0";
  const manualDisc = manualDiscountValue("q_manual_disc");
  const firma = (q_firma_manual.value.trim() || q_firma.value || "").trim();

  Object.entries(quoteSelected||{}).forEach(([key,sel])=>{
    if(!sel.checked) return;
    const p=findProductBySelectionKey(key);
    if(!p) return;
    const qty=parseInt(sel.qty)||1;
    const selectedUnit = sel.birim || p.birim || "Koli";
    const c=quoteLineCalc(p, sel, isk, manualDisc);
    items.push({kod:p.kod,ad:p.ad,kat:p.kat,birim:selectedUnit,qty,fiyat:c.unitPrice,listeFiyat:c.normalUnitPrice,manuelFiyat:c.manualPrice,satirIskonto:c.lineDiscount,iskontoGecersiz:!!sel.noDiscount,noDisc:!!c.noDiscount,brut:c.brut,disc:c.disc,net:c.net,kdv:c.kdv,total:c.total});
    brut+=c.brut; disc+=c.disc; kdv+=c.kdv; total+=c.total;
  });

  if(!firma){
    alert("Firma seçiniz veya manuel firma yazınız.");
    return null;
  }
  if(requireItems && !items.length){
    alert("En az bir ürün seçiniz.");
    return null;
  }

  return {
    no:q_no.value || uid("TKF"),
    tarih:q_tarih.value || todayISO(),
    firma,
    customerInfo:{
      ad:firma,
      yetkili:document.getElementById("q_yetkili") ? q_yetkili.value.trim() : "",
      tel:document.getElementById("q_tel") ? q_tel.value.trim() : "",
      mail:document.getElementById("q_mail") ? q_mail.value.trim() : "",
      vergiNo:document.getElementById("q_vergi_no") ? q_vergi_no.value.trim() : "",
      vergiDairesi:document.getElementById("q_vergi_dairesi") ? q_vergi_dairesi.value.trim() : "",
      adres:document.getElementById("q_adres") ? q_adres.value.trim() : ""
    },
    iskonto:isk,
    manualDisc,
    validDays:parseInt(q_valid_days.value)||0,
    durum:q_durum.value || "Hazırlandı",
    aciklama:q_aciklama.value || "",
    pdfEdit:document.getElementById("q_pdf_edit") ? q_pdf_edit.value : "",
    items, brut, disc, kdv, total
  };
}

function openQuoteDraftPdf(){
  const q = buildQuoteFromForm(true);
  if(!q) return;
  q.no = q.no || "ÖNİZLEME";
  q.durum = q.durum || "Hazırlandı";
  const w = window.open("", "_blank");
  if(!w){
    alert("PDF penceresi açılamadı. Tarayıcı pop-up iznini kontrol edin.");
    return;
  }
  w.document.open();
  w.document.write(quotePdfHtml(q));
  w.document.close();
}

function editQuote(index){
  const q = (state.quotes||[])[index];
  if(!q){
    alert("Teklif / proforma bulunamadı.");
    return;
  }

  editingQuoteIndex = index;
  quoteSelected = {};

  q_no.value = q.no || "";
  q_tarih.value = q.tarih || todayISO();

  const registered = (state.firmalar||[]).find(f=>f.ad===q.firma);
  if(registered){
    q_firma.value = q.firma;
    q_firma_manual.value = "";
  }else{
    q_firma.value = "";
    q_firma_manual.value = q.firma || "";
  }

  const customerInfo = q.customerInfo || {};
  if(document.getElementById("q_yetkili")) q_yetkili.value = customerInfo.yetkili || q.yetkili || (registered ? registered.yetkili : "") || "";
  if(document.getElementById("q_tel")) q_tel.value = customerInfo.tel || q.tel || (registered ? registered.tel : "") || "";
  if(document.getElementById("q_mail")) q_mail.value = customerInfo.mail || q.mail || (registered ? (registered.mail || registered.email) : "") || "";
  if(document.getElementById("q_vergi_no")) q_vergi_no.value = customerInfo.vergiNo || q.vergiNo || (registered ? (registered.vergiNo || registered.vno || registered.vergi) : "") || "";
  if(document.getElementById("q_vergi_dairesi")) q_vergi_dairesi.value = customerInfo.vergiDairesi || q.vergiDairesi || (registered ? (registered.vergiDairesi || registered.vd) : "") || "";
  if(document.getElementById("q_adres")) q_adres.value = customerInfo.adres || q.adres || (registered ? registered.adres : "") || "";

  q_iskonto.value = q.iskonto || "0";
  q_manual_disc.value = q.manualDisc || "";
  q_valid_days.value = q.validDays || 7;
  q_durum.value = q.durum || "Hazırlandı";
  q_aciklama.value = q.aciklama || "";
  if(document.getElementById("q_pdf_edit")) q_pdf_edit.value = q.pdfEdit || "";

  (q.items||[]).forEach(item=>{
    const key = item.kod || productKey(item, 0);
    quoteSelected[key] = {
      checked:true,
      qty:parseInt(item.qty)||1,
      birim:item.birim || "Koli",
      manualPrice:item.manuelFiyat !== undefined && item.manuelFiyat !== null ? item.manuelFiyat : (item.listeFiyat !== undefined && Number(item.fiyat)!==Number(item.listeFiyat) ? item.fiyat : null),
      discount:item.satirIskonto !== undefined ? item.satirIskonto : null,
      noDiscount:!!item.iskontoGecersiz
    };
  });

  const btn = document.getElementById("saveQuoteBtn");
  const cancelBtn = document.getElementById("cancelQuoteEditBtn");
  if(btn) btn.textContent = "Teklifi Güncelle";
  if(cancelBtn) cancelBtn.classList.remove("hide");

  toggleQuoteManualDiscount();
  renderQuoteProducts();
  document.getElementById("teklifler").scrollIntoView({behavior:"smooth", block:"start"});
}

