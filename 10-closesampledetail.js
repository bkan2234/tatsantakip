function closeSampleDetail(){
  sampleDetailCard.classList.add("hide");
  sampleDetailContent.innerHTML = "";
}

function renderSamples(){
  const list = document.getElementById("sampleList");
  if(!list) return;
  if(!state.samples) state.samples = [];

  const qRaw = document.getElementById("nf_search")?.value || "";
  const q = typeof normalizeSearchText === "function" ? normalizeSearchText(qRaw) : String(qRaw).toLocaleLowerCase("tr-TR");
  const status = document.getElementById("nf_status")?.value || "";
  const startDate = document.getElementById("nf_start")?.value || "";
  const endDate = document.getElementById("nf_end")?.value || "";

  const rows = state.samples
    .map((s,idx)=>({s,idx}))
    .filter(({s})=>{
      const items = normalizeSampleItemsForVisit(s);
      const itemText = items.map(it=>`${it.kod||""} ${it.ad||""} ${it.kat||""}`).join(" ");
      const hayRaw = [
        s.no, s.tarih, s.firma, s.yetkili, s.tel, s.mail,
        s.durum, s.not, s.visitNo, itemText
      ].filter(Boolean).join(" ");
      const hay = typeof normalizeSearchText === "function" ? normalizeSearchText(hayRaw) : String(hayRaw).toLocaleLowerCase("tr-TR");
      if(q && !hay.includes(q)) return false;
      if(status && String(s.durum||"") !== status) return false;
      if(startDate && String(s.tarih||"") < startDate) return false;
      if(endDate && String(s.tarih||"") > endDate) return false;
      return true;
    })
    .sort((a,b)=>{
      const dc = String(b.s.tarih||"").localeCompare(String(a.s.tarih||""));
      if(dc) return dc;
      return b.idx - a.idx;
    });

  list.innerHTML = rows.map(({s,idx})=>{
    const items = normalizeSampleItemsForVisit(s);
    if(!Array.isArray(s.items)) s.items = items;
    const firma = s.firma || "";
    const visitText = s.visitNo ? `<div class="muted">Ziyaret: ${s.visitNo}</div>` : "";
    const totalQty = items.reduce((sum,it)=>sum+(parseInt(it.qty)||0),0);
    return `<tr>
      <td>${s.no||""}</td>
      <td>${s.tarih ? trDate(s.tarih) : ""}</td>
      <td>${firma}${visitText}</td>
      <td>${items.length}</td>
      <td>${totalQty}</td>
      <td>${badge(s.durum||"")}</td>
      <td><div class="table-actions">
        <button class="btn" onclick="viewSample(${idx})">Detay</button>
        <button class="btn" onclick="editSample(${idx})">Düzenle</button>
        <button class="btn danger" onclick="delSample(${idx})">Sil</button>
      </div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="7" class="muted">Filtreye uygun numune kaydı yok</td></tr>`;
}
function clearSampleFilters(){
  ["nf_search","nf_start","nf_end"].forEach(id=>{const el=document.getElementById(id); if(el) el.value="";});
  const st=document.getElementById("nf_status"); if(st) st.value="";
  renderSamples();
}
function delSample(i){
  if(confirm("Numune silinsin mi?")){
    state.samples.splice(i,1);
    if(editingSampleIndex===i) clearSampleForm();
    closeSampleDetail();
    saveState();
    renderAll();
  }
}

function paymentOrderKey(order){
  return String(order?.no || order?.id || "").trim();
}

function getFirmInvoiceBalances(firmaAd){
  const orders = (state.orders||[])
    .filter(o=>o.firma===firmaAd && !["Taslak","İptal"].includes(o.durum))
    .map((o,index)=>({order:o,index,key:paymentOrderKey(o), total:Math.max(0,Number(o.total)||0), paid:0}))
    .sort((a,b)=>String(a.order.tarih||"").localeCompare(String(b.order.tarih||"")) || a.index-b.index);

  // Önce doğrudan bir faturaya bağlanmış tahsilatları o faturaya uygula.
  const genericPayments=[];
  (state.payments||[]).filter(p=>p.firma===firmaAd).forEach(p=>{
    const amount=Math.max(0,Number(p.tutar)||0);
    const target=String(p.orderNo || p.faturaNo || "").trim();
    if(target){
      const row=orders.find(x=>x.key===target);
      if(row) row.paid += amount;
      else genericPayments.push(amount);
    }else genericPayments.push(amount);
  });

  // Eski, faturaya bağlanmamış tahsilatları en eski açık faturadan başlayarak mahsup et.
  let genericTotal=genericPayments.reduce((a,b)=>a+b,0);
  orders.forEach(row=>{
    const room=Math.max(0,row.total-row.paid);
    const used=Math.min(room,genericTotal);
    row.paid += used;
    genericTotal -= used;
  });

  return orders.map(row=>({
    ...row,
    paid:Math.min(row.total,row.paid),
    remaining:Math.max(0,row.total-row.paid)
  }));
}

function renderPaymentInvoices(){
  const list=document.getElementById("paymentInvoiceList");
  const firmaEl=document.getElementById("t_firma");
  if(!list || !firmaEl) return;
  const firma=firmaEl.value;
  const selected=String(document.getElementById("t_order_no")?.value||"");
  if(!firma){
    list.innerHTML='<tr><td colspan="8" class="muted">Firma seçiniz.</td></tr>';
    return;
  }
  const rows=getFirmInvoiceBalances(firma).filter(x=>x.remaining>0.009);
  list.innerHTML=rows.map(x=>{
    const checked=selected===x.key ? 'checked' : '';
    const vade=x.order.vadeTarih || x.order.vade || "";
    return `<tr>
      <td><input type="radio" name="payment_invoice" ${checked} onchange="selectPaymentInvoice('${htmlEscape(x.key)}')"></td>
      <td><b>${htmlEscape(x.key||"-")}</b></td>
      <td>${x.order.tarih?trDate(x.order.tarih):"-"}</td>
      <td>${vade?trDate(vade):"-"}</td>
      <td class="money">${money(x.total)}</td>
      <td class="money">${money(x.paid)}</td>
      <td class="money"><b>${money(x.remaining)}</b></td>
      <td><button type="button" class="btn" onclick="selectPaymentInvoice('${htmlEscape(x.key)}',true)">Ödeme Al</button> <button type="button" class="btn" onclick="invoicePaymentHistory('${escapeJsText(firma)}','${escapeJsText(x.key)}')">Geçmiş</button></td>
    </tr>`;
  }).join("") || '<tr><td colspan="8" class="muted">Bu firmanın açık faturası / siparişi yok.</td></tr>';
}

function selectPaymentInvoice(orderNo,focusAmount){
  const hidden=document.getElementById("t_order_no");
  if(hidden) hidden.value=orderNo||"";
  const firma=document.getElementById("t_firma")?.value||"";
  const row=getFirmInvoiceBalances(firma).find(x=>x.key===String(orderNo||""));
  if(row){
    const amount=document.getElementById("t_tutar");
    if(amount) amount.value=row.remaining.toFixed(2);
    const acik=document.getElementById("t_aciklama");
    if(acik && !acik.value.trim()) acik.value=(row.key||"Fatura")+" için tahsilat";
  }
  renderPaymentInvoices();
  if(focusAmount) document.getElementById("t_tutar")?.focus();
}

function updatePaymentFirmBalance(){
  const el = document.getElementById("t_firma_bakiye");
  const firmaEl = document.getElementById("t_firma");
  if(!el || !firmaEl) return;
  const firma = firmaEl.value;
  const hidden=document.getElementById("t_order_no");
  if(hidden) hidden.value="";
  const bakiye = firma ? normalizeMoneyValue(firmaOpenBalance(firma)) : 0;
  if(bakiye < 0){
    el.value = "Müşteri Alacağı: " + money(Math.abs(bakiye));
  }else{
    el.value = money(bakiye);
  }
  renderPaymentInvoices();
}

function savePayment(){
  if(!t_firma.value) return alert("Firma seçiniz.");
  const tutar=Number(t_tutar.value)||0;
  if(tutar<=0) return alert("Tahsilat tutarı giriniz.");
  const orderNo=String(document.getElementById("t_order_no")?.value||"").trim();
  if(orderNo){
    const row=getFirmInvoiceBalances(t_firma.value).find(x=>x.key===orderNo);
    if(!row || row.remaining<=0.009) return alert("Seçilen faturanın açık borcu bulunmuyor.");
    if(tutar-row.remaining>0.009) return alert("Tahsilat tutarı seçilen faturanın kalan borcundan fazla olamaz. Kalan: "+money(row.remaining));
  }
  const payDate = t_tarih.value || todayISO();
  state.payments.push({tarih:payDate,firma:t_firma.value,tutar,tip:t_tip.value,aciklama:t_aciklama.value || "Cariden ödeme alındı",orderNo:orderNo||""});
  saveState();
  t_tarih.value=todayISO();
  t_tutar.value="";
  t_aciklama.value="";
  const hidden=document.getElementById("t_order_no"); if(hidden) hidden.value="";
  renderAll();
  refreshPaymentSection();
  renderPaymentInvoices();
  alert("Tahsilat kaydedildi.");
}

function normalizeFilterAllValue(v){
  const s = String(v ?? "").trim();
  if(!s) return "";
  const low = s.toLocaleLowerCase("tr-TR");
  if(["tümü","tumü","tumu","tüm firmalar","tum firmalar","firma seçiniz","firma seciniz","tüm kategoriler","tum kategoriler"].includes(low)){
    return "";
  }
  return s;
}

function normalizeBalanceFilterValue(v){
  const s = normalizeFilterAllValue(v);
  const low = s.toLocaleLowerCase("tr-TR");
  if(low === "borç var" || low === "borc var") return "debt";
  if(low === "borç yok" || low === "borc yok") return "clear";
  return s;
}


function optionValueIsAll(value, text){
  const raw = String(value ?? "").trim();
  const label = String(text ?? "").trim();
  return normalizeFilterAllValue(raw) === "" || normalizeFilterAllValue(label) === "";
}

function getSelectEffectiveValue(id){
  const el = document.getElementById(id);
  if(!el) return "";

  if(el.selectedIndex === 0){
    const selected = el.options && el.options[0] ? el.options[0] : null;
    const text = selected ? selected.textContent : "";
    const value = selected ? selected.value : el.value;
    if(optionValueIsAll(value, text)) return "";
  }

  const directValue = String(el.value ?? "").trim();
  const normalizedDirect = normalizeFilterAllValue(directValue);
  if(!directValue || normalizedDirect === "") return "";
  return directValue;
}

function setupPaymentFilters(){
  const activeFirms = (state.firmalar||[]).filter(f=>f.durum==="Aktif");
  const pf = document.getElementById("pf_firma");
  if(pf){
    const oldRaw = String(pf.value ?? "").trim();
    const old = normalizeFilterAllValue(oldRaw);
    pf.innerHTML = `<option value="">Tüm Firmalar</option>` + activeFirms.map(f=>`<option value="${f.ad}">${f.kod||""} - ${f.ad||""}</option>`).join("");
    if(old){
      pf.value = old;
    }else{
      pf.value = "";
      pf.selectedIndex = 0;
    }
  }

  const tip = document.getElementById("pf_tip");
  if(tip && normalizeFilterAllValue(tip.value)==="") tip.value = "";

  const bal = document.getElementById("pf_balance");
  if(bal && normalizeFilterAllValue(bal.value)==="") bal.value = "";
}

function refreshPaymentSection(){
  setupPaymentFilters();
  renderPayments();
  renderPaymentTracking();
  renderPaymentReminderCollections();
  setTimeout(function(){
    renderPayments();
    renderPaymentTracking();
    renderPaymentReminderCollections();
  }, 0);
}

function getPaymentRows(){
  const payments = Array.isArray(state.payments) ? state.payments.slice() : [];

  const movementPayments = (typeof getMoves === "function" ? getMoves() : [])
    .filter(m=>String(m.tip||"").toLocaleLowerCase("tr-TR")==="tahsilat")
    .map(m=>({
      tarih:m.tarih,
      firma:m.firma,
      tutar:Number(m.tutar)||0,
      tip:m.odemeTipi || m.paymentType || "Tahsilat",
      aciklama:m.aciklama || "Cari tahsilat",
      __move:true
    }));

  movementPayments.forEach(mp=>{
    const exists = payments.some(p=>
      String(p.tarih||"")===String(mp.tarih||"") &&
      String(p.firma||"")===String(mp.firma||"") &&
      Math.abs((Number(p.tutar)||0)-(Number(mp.tutar)||0)) < 0.01 &&
      String(p.aciklama||"")===String(mp.aciklama||"")
    );
    if(!exists) payments.push(mp);
  });

  return payments;
}

function clearPaymentFilters(){
  ["pf_search","pf_firma","pf_tip","pf_balance","pf_start","pf_end"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = "";
  });
  refreshPaymentSection();
}

function renderPayments(){
  const q=(document.getElementById("pf_search")?.value || "").toLowerCase();
  const firma=getSelectEffectiveValue("pf_firma");
  const tip=normalizeFilterAllValue(getSelectEffectiveValue("pf_tip"));
  const balanceFilter=normalizeBalanceFilterValue(getSelectEffectiveValue("pf_balance"));
  const startDate=document.getElementById("pf_start")?.value || "";
  const endDate=document.getElementById("pf_end")?.value || "";

  const sourceRows = getPaymentRows();
  const rows = sourceRows.filter(p=>{
    const hay=String((p.firma||"")+(p.aciklama||"")+(p.tip||"")).toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(firma && p.firma!==firma) return false;
    if(tip && p.tip!==tip) return false;
    const openBalance = normalizeMoneyValue(firmaOpenBalance(p.firma));
    if(balanceFilter==="debt" && openBalance <= 0) return false;
    if(balanceFilter==="clear" && openBalance > 0) return false;
    if(startDate && p.tarih<startDate) return false;
    if(endDate && p.tarih>endDate) return false;
    return true;
  });

  const list = document.getElementById("paymentList");
  if(!list) return;
  list.innerHTML = rows.map((p)=>{
    const i = (state.payments||[]).indexOf(p);
    const deleteBtn = p.__move ? "" : `<button class="btn danger" onclick="delPayment(${i})">Sil</button>`;
    return `<tr><td>${trDate(p.tarih)}</td><td>${p.firma}</td><td class="money">${money(p.tutar)}</td><td>${p.tip||"Tahsilat"}</td><td>${p.aciklama||""}</td><td><div class="table-actions">${deleteBtn}</div></td></tr>`;
  }).join("") || `<tr><td colspan="6" class="muted">Tahsilat yok</td></tr>`;
}

function renderPaymentTracking(){
  const list = document.getElementById("paymentTrackingList");
  if(!list) return;

  const q = (document.getElementById("pf_search")?.value || "").toLowerCase();
  const selectedFirma = getSelectEffectiveValue("pf_firma");
  const balanceFilter = normalizeBalanceFilterValue(getSelectEffectiveValue("pf_balance"));

  const rows = (state.firmalar||[]).filter(f=>{
    const hay = String((f.kod||"")+(f.ad||"")+(f.tel||"")+(f.sehir||"")+(f.tur||"")).toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(selectedFirma && f.ad !== selectedFirma) return false;
    const openBalance = normalizeMoneyValue(firmaOpenBalance(f.ad));
    if(balanceFilter==="debt" && openBalance <= 0) return false;
    if(balanceFilter==="clear" && openBalance > 0) return false;
    return true;
  });

  list.innerHTML = rows.map(f=>{
    const sales = firmaTotalSales(f.ad);
    const paid = firmaTotalPayments(f.ad);
    const lastPay = firmaLastPaymentDate(f.ad);
    return `<tr>
      <td>${f.ad||""}</td>
      <td class="money">${money(sales)}</td>
      <td class="money"><span class="paid-amount">${money(paid)}</span></td>
      <td class="money">${firmaBalanceBadge(f.ad)}</td>
      <td>${lastPay ? trDate(lastPay) : "-"}</td>
      <td>${paymentStatusBadge(f.ad)}</td>
      <td><div class="table-actions"><button class="btn primary" onclick="takePaymentFromFirma('${f.ad}')">Ödeme Al</button></div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="7" class="muted">Ödeme takip kaydı bulunamadı</td></tr>`;
}

function delPayment(i){if(confirm("Tahsilat silinsin mi?")){state.payments.splice(i,1);saveState();renderAll();}}
function renderMoves(){
  const q=(document.getElementById("mf_search")?.value || "").toLowerCase();
  const firma=document.getElementById("mf_firma")?.value || "";
  const tip=document.getElementById("mf_tip")?.value || "";
  const startDate=document.getElementById("mf_start")?.value || "";
  const endDate=document.getElementById("mf_end")?.value || "";

  const moves = getMoves().filter(m=>{
    const hay=String((m.firma||"")+(m.aciklama||"")+(m.tip||"")).toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(firma && m.firma!==firma) return false;
    if(tip && m.tip!==tip) return false;
    if(startDate && m.tarih<startDate) return false;
    if(endDate && m.tarih>endDate) return false;
    return true;
  });

  moveList.innerHTML = moves.map(m=>{
    const editBtn = `<button class="btn" onclick="editMove('${m.source}',${m.index})">Düzenle</button>`;
    const delBtn = `<button class="btn danger" onclick="deleteMove('${m.source}',${m.index})">Sil</button>`;
    return `<tr>
      <td>${trDate(m.tarih)}</td>
      <td>${m.firma}</td>
      <td>${badge(m.tip)}</td>
      <td class="money">${money(m.tutar)}</td>
      <td>${m.aciklama||""}</td>
      <td><div class="table-actions">${editBtn} ${delBtn}</div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="6" class="muted">Hareket yok</td></tr>`;
}

function editMove(source, index){
  if(source === "payment"){
    const p = state.payments[index];
    if(!p) return;

    const tarih = prompt("Tahsilat tarihi (YYYY-MM-DD):", p.tarih || todayISO());
    if(tarih === null) return;

    const firma = prompt("Firma adı:", p.firma || "");
    if(firma === null) return;

    const tutarText = prompt("Tahsilat tutarı:", p.tutar || 0);
    if(tutarText === null) return;
    const tutar = Number(String(tutarText).replace(",", "."));
    if(!tutar || tutar <= 0) return alert("Geçerli tahsilat tutarı giriniz.");

    const tip = prompt("Ödeme tipi:", p.tip || "Nakit");
    if(tip === null) return;

    const aciklama = prompt("Açıklama:", p.aciklama || "");
    if(aciklama === null) return;

    p.tarih = tarih || todayISO();
    p.firma = firma;
    p.tutar = tutar;
    p.tip = tip || "Nakit";
    p.aciklama = aciklama;

    saveState();
    renderAll();
    alert("Tahsilat hareketi güncellendi.");
    return;
  }

  if(source === "order"){
    const o = state.orders[index];
    if(!o) return;

    const tarih = prompt("Sipariş tarihi (YYYY-MM-DD):", o.tarih || todayISO());
    if(tarih === null) return;

    const durum = prompt("Sipariş durumu: Beklemede / Hazırlanıyor / Sevk Edildi / Tamamlandı / Taslak / İptal", o.durum || "Beklemede");
    if(durum === null) return;

    const aciklama = prompt("Açıklama:", o.aciklama || "");
    if(aciklama === null) return;

    o.tarih = tarih || todayISO();
    o.durum = durum || o.durum;
    o.aciklama = aciklama;

    // Tarih değişirse vade tarihini vade gününe göre yeniden hesapla
    o.vadeTarih = addDaysISO(o.tarih || todayISO(), o.vade);

    saveState();
    renderAll();
    alert("Sipariş hareketi güncellendi.");
  }
}

function deleteMove(source, index){
  if(source === "payment"){
    if(confirm("Bu tahsilat hareketi silinsin mi?")){
      state.payments.splice(index,1);
      saveState();
      renderAll();
    }
    return;
  }

  if(source === "order"){
    if(confirm("Bu sipariş hareketi silinsin mi? Sipariş kaydı da silinir.")){
      state.orders.splice(index,1);
      saveState();
      renderAll();
    }
  }
}

function reportFilters(){
  const type = document.getElementById("r_type")?.value || "ozet";
  const firma = document.getElementById("r_firma")?.value || "";
  const start = document.getElementById("r_start")?.value || "";
  const end = document.getElementById("r_end")?.value || "";
  const status = document.getElementById("r_status")?.value || "";
  const search = (document.getElementById("r_search")?.value || "").toLowerCase();
  return {type,firma,start,end,status,search};
}
function inReportDate(date, f){
  if(!date) return true;
  if(f.start && date < f.start) return false;
  if(f.end && date > f.end) return false;
  return true;
}
function textMatch(row, f){
  if(!f.search) return true;
  return Object.values(row).join(" ").toLowerCase().includes(f.search);
}
function setReportQuickDate(){
  const q = r_quick.value;
  const today = todayISO();
  const now = new Date();
  if(q === "today"){
    r_start.value = today;
    r_end.value = today;
  } else if(q === "week"){
    r_start.value = startOfWeekISO(now);
    r_end.value = today;
  } else if(q === "month"){
    r_start.value = today.slice(0,7) + "-01";
    r_end.value = today;
  } else if(q === "year"){
    r_start.value = today.slice(0,4) + "-01-01";
    r_end.value = today;
  } else if(q === "all"){
    r_start.value = "";
    r_end.value = "";
  }
  renderReports();
}
function reportRows(){
  const f = reportFilters();


  if(f.type === "prim"){
    return primeReportRowsWithAnnualTotal();
  }

  if(f.type === "firma_bakiye"){
    return state.firmalar.map(x=>{
      const sales = state.orders.filter(o=>o.firma===x.ad && !["Taslak","İptal"].includes(o.durum) && inReportDate(o.tarih,f)).reduce((s,o)=>s+Number(o.total||0),0);
      const pay = state.payments.filter(p=>p.firma===x.ad && inReportDate(p.tarih,f)).reduce((s,p)=>s+Number(p.tutar||0),0);
      return {
        "Firma Kodu": x.kod,
        "Firma": x.ad,
        "Şehir": x.sehir || "",
        "Telefon": x.tel || "",
        "Vade": (x.vade||0) + " Gün",
        "İskonto": x.iskonto==="Manuel" ? manualDiscountText(x.manualDisc) : x.iskonto,
        "Toplam Satış": sales,
        "Toplam Tahsilat": pay,
        "Açık Bakiye": sales - pay,
        "Durum": x.durum
      };
    }).filter(r=>(!f.firma || r["Firma"]===f.firma) && textMatch(r,f));
  }

  if(f.type === "siparis" || f.type === "ozet"){
    return state.orders.map(o=>({
      "Sipariş No": o.no,
      "Tarih": trDate(o.tarih),
      "_date": o.tarih,
      "Firma": o.firma,
      "Ürün Sayısı": (o.items||[]).length,
      "Toplam Miktar": (o.items||[]).reduce((s,x)=>s+(Number(x.qty)||0),0),
      "Brüt": o.brut || 0,
      "İskonto": o.disc || 0,
      "KDV": o.kdv || 0,
      "Genel Toplam": o.total || 0,
      "Durum": o.durum,
      "Kargo Firması": o.kargoFirma || "",
      "Kargo Takip No": o.kargoNo || "",
      "Kargo Durumu": o.kargoDurum || "",
      "Açıklama": o.aciklama || ""
    })).filter(r=>(!f.firma || r["Firma"]===f.firma) && inReportDate(r["_date"],f) && (!f.status || r["Durum"]===f.status || r["Kargo Durumu"]===f.status) && textMatch(r,f));
  }

  if(f.type === "tahsilat"){
    return state.payments.map(p=>({
      "Tarih": trDate(p.tarih),
      "_date": p.tarih,
      "Firma": p.firma,
      "Tutar": p.tutar || 0,
      "Ödeme Tipi": p.tip || "",
      "Açıklama": p.aciklama || ""
    })).filter(r=>(!f.firma || r["Firma"]===f.firma) && inReportDate(r["_date"],f) && textMatch(r,f));
  }

  if(f.type === "hareket"){
    return getMoves().map(m=>({
      "Tarih": trDate(m.tarih),
      "_date": m.tarih,
      "Firma": m.firma,
      "İşlem": m.tip,
      "Tutar": m.tutar || 0,
      "Açıklama": m.aciklama || ""
    })).filter(r=>(!f.firma || r["Firma"]===f.firma) && inReportDate(r["_date"],f) && textMatch(r,f));
  }

  if(f.type === "urun_satis"){
    const map = {};
    state.orders.filter(o=>!["Taslak","İptal"].includes(o.durum) && (!f.firma || o.firma===f.firma) && inReportDate(o.tarih,f)).forEach(o=>{
      (o.items||[]).forEach(it=>{
        const key = it.kod + " - " + it.ad;
        if(!map[key]) map[key] = {"Ürün Kodu":it.kod,"Ürün":it.ad,"Kategori":it.kat||"","Toplam Miktar":0,"Brüt":0,"İskonto":0,"KDV":0,"Genel Toplam":0};
        map[key]["Toplam Miktar"] += Number(it.qty)||0;
        map[key]["Brüt"] += Number(it.brut)||0;
        map[key]["İskonto"] += Number(it.disc)||0;
        map[key]["KDV"] += Number(it.kdv)||0;
        map[key]["Genel Toplam"] += Number(it.total)||0;
      });
    });
    return Object.values(map).filter(r=>textMatch(r,f));
  }

  if(f.type === "numune"){
    return state.samples.map(s=>({
      "Numune No": s.no,
      "Tarih": trDate(s.tarih),
      "_date": s.tarih,
      "Firma": s.firma,
      "Ürün Sayısı": (s.items||[]).length,
      "Toplam Adet": (s.items||[]).reduce((a,b)=>a+(Number(b.qty)||0),0),
      "Durum": s.durum,
      "Yetkili": s.yetkili || "",
      "Telefon": s.tel || "",
      "Not": s.not || ""
    })).filter(r=>(!f.firma || r["Firma"]===f.firma) && inReportDate(r["_date"],f) && (!f.status || r["Durum"]===f.status) && textMatch(r,f));
  }

  if(f.type === "ziyaret"){
    return (state.visits||[]).map(v=>({
      "Kayıt No": v.no,
      "Tarih": trDate(v.tarih),
      "_date": v.tarih,
      "Firma": v.firma,
      "Materyaller": visitMaterialsArray(v).join(", "),
      "Numune Ürünleri": visitSampleSummaryText(v),
      "Durum": v.durum,
      "Takip Tarihi": v.takip ? trDate(v.takip) : "",
      "Yetkili": v.yetkili || "",
      "Telefon": v.tel || "",
      "Mail": v.mail || "",
      "Şehir": v.sehir || "",
      "İlçe": v.ilce || "",
      "Not": v.not || ""
    })).filter(r=>(!f.firma || r["Firma"]===f.firma) && inReportDate(r["_date"],f) && (!f.status || r["Durum"]===f.status) && textMatch(r,f));
  }

  if(f.type === "kargo"){
    return state.orders.map(o=>({
      "Sipariş No": o.no,
      "Tarih": trDate(o.tarih),
      "_date": o.tarih,
      "Firma": o.firma,
      "Kargo Firması": o.kargoFirma || "",
      "Kargo Takip No": o.kargoNo || "",
      "Kargo Durumu": o.kargoDurum || "Yok",
      "Sipariş Durumu": o.durum,
      "Genel Toplam": o.total || 0
    })).filter(r=>(!f.firma || r["Firma"]===f.firma) && inReportDate(r["_date"],f) && (!f.status || r["Kargo Durumu"]===f.status || r["Sipariş Durumu"]===f.status) && textMatch(r,f));
  }

  return [];
}
function cleanReportRows(rows){
  return rows.map(r=>{
    const x = {...r};
    delete x._date;
    return x;
  });
}
function reportTitle(){
  const type = reportFilters().type;
  const names = {
    ozet:"Genel Özet / Sipariş Raporu",
    firma_bakiye:"Firma Bakiye Raporu",
    siparis:"Sipariş Raporu",
    tahsilat:"Tahsilat Raporu",
    hareket:"Cari Hareket Raporu",
    urun_satis:"Ürün Satış Raporu",
    numune:"Numune Raporu",
    ziyaret:"Ziyaret / Materyal Raporu",
    kargo:"Kargo Takip Raporu",
    prim:"Prim Hesaplama"
  };
  return names[type] || "Rapor";
}
function renderReportTable(rows){
  rows = cleanReportRows(rows);
  rp_table_title.textContent = reportTitle();
  rp_generated_at.textContent = "Oluşturma: " + new Date().toLocaleString("tr-TR");
  if(!rows.length){
    reportHead.innerHTML = "";
    reportBody.innerHTML = `<tr><td class="muted">Filtreye uygun kayıt yok</td></tr>`;
    return;
  }
  const keys = Object.keys(rows[0]);
  reportHead.innerHTML = `<tr>${keys.map(k=>`<th>${k}</th>`).join("")}</tr>`;
  reportBody.innerHTML = rows.map(r=>`<tr>${keys.map(k=>{
    const val = r[k];
    const isMoney = ["Toplam Satış","Toplam Tahsilat","Açık Bakiye","Brüt","İskonto","KDV","Genel Toplam","Tutar","Satış Tutarı","Tahsilat Tutarı","Satış Primi","Tahsilat Primi","Toplam Prim"].includes(k);
    return `<td class="${isMoney?'money':''}">${isMoney ? money(val) : (val ?? "")}</td>`;
  }).join("")}</tr>`).join("");
}

const PRIME_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

function ensurePrimeDefaults(){
  const today = todayISO();
  const yearEl = document.getElementById("rp_prim_year");
  if(yearEl && !yearEl.value) yearEl.value = today.slice(0,4);
  const monthEl = document.getElementById("rp_prim_month");
  if(monthEl && !monthEl.value) monthEl.value = String(Number(today.slice(5,7)));
  const salesEl = document.getElementById("rp_sales_rate");
  const payEl = document.getElementById("rp_payment_rate");
  if(salesEl && salesEl.value === "") salesEl.value = "0";
  if(payEl && payEl.value === "") payEl.value = "0";
}

function setPrimeReportCurrentYear(){
  const today = todayISO();
  if(document.getElementById("rp_prim_year")) rp_prim_year.value = today.slice(0,4);
  if(document.getElementById("rp_prim_month")) rp_prim_month.value = String(Number(today.slice(5,7)));
  if(document.getElementById("r_type")) r_type.value = "prim";
  renderReports();
}


