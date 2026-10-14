function cancelVisitEdit(){
  clearVisitForm();
}


function visitMaterialsArray(v){
  if(Array.isArray(v.materyal)) return v.materyal.filter(Boolean);
  return String(v.materyal||"").split(",").map(x=>x.trim()).filter(Boolean);
}

function visitMaterialsHtml(v){
  const mats = visitMaterialsArray(v);
  if(!mats.length) return `<span class="visit-empty">Materyal seçilmemiş</span>`;
  return mats.map(m=>`<span class="visit-material-chip">${m}</span>`).join("");
}

function visitFirmaTypeText(v){
  return v.firmaMode === "kayitli" ? "Kayıtlı Firma" : "Manuel Müşteri";
}

function visitLocationText(v){
  return [v.sehir||"", v.ilce||""].filter(Boolean).join(" / ") || "-";
}

function visitShortNote(v){
  const n = String(v.not||"").trim();
  if(!n) return "-";
  return n.length > 70 ? n.slice(0,70) + "..." : n;
}

function visitDetailText(v){
  const mats = visitMaterialsArray(v).join(", ") || "Materyal seçilmemiş";
  return [
    "Kayıt No: " + (v.no||""),
    "Tarih: " + (v.tarih ? trDate(v.tarih) : "-"),
    "Firma / Müşteri: " + (v.firma||"-"),
    "Kayıt Tipi: " + visitFirmaTypeText(v),
    "Kime Verildi / Yetkili: " + (v.yetkili||"-"),
    "Telefon: " + (v.tel||"-"),
    "Mail: " + (v.mail||"-"),
    "İl / İlçe: " + visitLocationText(v),
    "Adres / Bölge: " + (v.adres||"-"),
    "Verilen Materyaller: " + mats,
    "Numune Ürünleri: " + (visitSampleSummaryText(v) || "-"),
    "Durum: " + (v.durum||"-"),
    "Takip Tarihi: " + (v.takip ? trDate(v.takip) : "-"),
    "Not: " + (v.not||"-")
  ].join("\n");
}

function viewVisit(no){
  const v = (state.visits||[]).find(x=>x.no===no);
  if(!v) return alert("Ziyaret / materyal kaydı bulunamadı.");
  alert(visitDetailText(v));
}


let editingAppointmentNo = null;

function ensureAppointments(){
  if(!state.randevular) state.randevular = [];
}

function nextAppointmentNo(){
  ensureAppointments();
  return "RND-" + String(state.randevular.length + 1).padStart(4,"0");
}

function toggleAppointmentFirma(){
  const mode = document.getElementById("rd_firma_mode")?.value || "kayitli";
  const kayitli = document.getElementById("rd_kayitli_box");
  const manuel = document.getElementById("rd_manuel_box");
  if(kayitli) kayitli.classList.toggle("hide", mode !== "kayitli");
  if(manuel) manuel.classList.toggle("hide", mode === "kayitli");
}

function appointmentFirmaName(){
  const mode = document.getElementById("rd_firma_mode")?.value || "kayitli";
  if(mode === "kayitli"){
    return document.getElementById("rd_firma")?.value || "";
  }
  return (document.getElementById("rd_firma_manual")?.value || "").trim();
}

function appointmentStatusClass(status){
  const s = String(status||"").toLocaleLowerCase("tr-TR");
  if(s === "planlandı") return "appointment-status-blue";
  if(s === "görüşüldü" || s === "olumlu") return "appointment-status-green";
  if(s === "ertelendi") return "appointment-status-orange";
  if(s === "iptal" || s === "olumsuz") return "appointment-status-red";
  return "appointment-status-gray";
}

function appointmentStatusBadge(status){
  return `<span class="appointment-status ${appointmentStatusClass(status)}">${status||"-"}</span>`;
}

function appointmentImportanceBadge(onem){
  const s = String(onem||"Normal");
  const cls = s === "Yüksek" ? "importance-high" : (s === "Düşük" ? "importance-low" : "importance-normal");
  return `<span class="importance-badge ${cls}">${s}</span>`;
}

function appointmentDateTimeText(r){
  const d = r.tarih ? trDate(r.tarih) : "-";
  const t = r.saat || "";
  return t ? `${d}<br><b>${t}</b>` : d;
}

function saveAppointment(){
  ensureAppointments();
  const firma = appointmentFirmaName();
  if(!firma) return alert("Firma / müşteri seçiniz veya yazınız.");
  const tarih = document.getElementById("rd_tarih")?.value || "";
  if(!tarih) return alert("Randevu tarihi giriniz.");

  const obj = {
    no: document.getElementById("rd_no")?.value || nextAppointmentNo(),
    tarih,
    saat: document.getElementById("rd_saat")?.value || "",
    firmaMode: document.getElementById("rd_firma_mode")?.value || "kayitli",
    firma,
    yetkili: document.getElementById("rd_yetkili")?.value || "",
    tel: document.getElementById("rd_tel")?.value || "",
    tip: document.getElementById("rd_tip")?.value || "Ziyaret",
    durum: document.getElementById("rd_durum")?.value || "Planlandı",
    onem: document.getElementById("rd_onem")?.value || "Normal",
    hatirlatma: document.getElementById("rd_hatirlatma")?.value || "",
    not: document.getElementById("rd_not")?.value || ""
  };

  const idx = editingAppointmentNo ? state.randevular.findIndex(r=>r.no===editingAppointmentNo) : -1;
  if(idx >= 0){
    state.randevular[idx] = obj;
    alert("Randevu güncellendi.");
  }else{
    state.randevular.push(obj);
    alert("Randevu kaydedildi.");
  }

  saveState();
  clearAppointmentForm();
  renderAll();
}

function clearAppointmentForm(){
  ensureAppointments();
  editingAppointmentNo = null;
  if(document.getElementById("rd_no")) rd_no.value = nextAppointmentNo();
  if(document.getElementById("rd_tarih")) rd_tarih.value = todayISO();
  if(document.getElementById("rd_saat")) rd_saat.value = "";
  if(document.getElementById("rd_firma_mode")) rd_firma_mode.value = "kayitli";
  if(document.getElementById("rd_firma")) rd_firma.value = "";
  if(document.getElementById("rd_firma_manual")) rd_firma_manual.value = "";
  if(document.getElementById("rd_yetkili")) rd_yetkili.value = "";
  if(document.getElementById("rd_tel")) rd_tel.value = "";
  if(document.getElementById("rd_tip")) rd_tip.value = "Ziyaret";
  if(document.getElementById("rd_durum")) rd_durum.value = "Planlandı";
  if(document.getElementById("rd_onem")) rd_onem.value = "Normal";
  if(document.getElementById("rd_hatirlatma")) rd_hatirlatma.value = "";
  if(document.getElementById("rd_not")) rd_not.value = "";

  const btn = document.getElementById("saveAppointmentBtn");
  const cancelBtn = document.getElementById("cancelAppointmentEditBtn");
  if(btn) btn.textContent = "Randevuyu Kaydet";
  if(cancelBtn) cancelBtn.classList.add("hide");
  toggleAppointmentFirma();
}

function editAppointment(no){
  ensureAppointments();
  const r = state.randevular.find(x=>x.no===no);
  if(!r) return;
  editingAppointmentNo = no;

  if(document.getElementById("rd_no")) rd_no.value = r.no || "";
  if(document.getElementById("rd_tarih")) rd_tarih.value = r.tarih || todayISO();
  if(document.getElementById("rd_saat")) rd_saat.value = r.saat || "";
  const isRegistered = (state.firmalar||[]).some(f=>f.ad===r.firma);
  if(document.getElementById("rd_firma_mode")) rd_firma_mode.value = r.firmaMode || (isRegistered ? "kayitli" : "manuel");
  toggleAppointmentFirma();
  if(document.getElementById("rd_firma_mode") && rd_firma_mode.value === "kayitli"){
    if(document.getElementById("rd_firma")) rd_firma.value = r.firma || "";
  }else{
    if(document.getElementById("rd_firma_manual")) rd_firma_manual.value = r.firma || "";
  }
  if(document.getElementById("rd_yetkili")) rd_yetkili.value = r.yetkili || "";
  if(document.getElementById("rd_tel")) rd_tel.value = r.tel || "";
  if(document.getElementById("rd_tip")) rd_tip.value = r.tip || "Ziyaret";
  if(document.getElementById("rd_durum")) rd_durum.value = r.durum || "Planlandı";
  if(document.getElementById("rd_onem")) rd_onem.value = r.onem || "Normal";
  if(document.getElementById("rd_hatirlatma")) rd_hatirlatma.value = r.hatirlatma || "";
  if(document.getElementById("rd_not")) rd_not.value = r.not || "";

  const btn = document.getElementById("saveAppointmentBtn");
  const cancelBtn = document.getElementById("cancelAppointmentEditBtn");
  if(btn) btn.textContent = "Randevuyu Güncelle";
  if(cancelBtn) cancelBtn.classList.remove("hide");

  const sec = document.getElementById("randevular");
  if(sec) sec.scrollIntoView({behavior:"smooth", block:"start"});
}

function delAppointment(no){
  if(!confirm("Randevu silinsin mi?")) return;
  ensureAppointments();
  state.randevular = state.randevular.filter(r=>r.no!==no);
  if(editingAppointmentNo === no) clearAppointmentForm();
  saveState();
  renderAll();
}

function clearAppointmentFilters(){
  ["rdf_search","rdf_status","rdf_start","rdf_end"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = "";
  });
  renderAppointments();
}

function setAppointmentTodayFilter(){
  const today = todayISO();
  if(document.getElementById("rdf_start")) rdf_start.value = today;
  if(document.getElementById("rdf_end")) rdf_end.value = today;
  if(document.getElementById("rdf_status")) rdf_status.value = "";
  renderAppointments();
  const list = document.getElementById("appointmentList");
  if(list) list.scrollIntoView({behavior:"smooth", block:"center"});
}

function renderAppointmentSummary(){
  const box = document.getElementById("appointmentSummary");
  if(!box) return;
  ensureAppointments();
  const today = todayISO();
  const active = state.randevular.filter(r=>!["İptal","Görüşüldü"].includes(r.durum));
  const todayRows = active.filter(r=>r.tarih===today);
  const upcoming = active.filter(r=>r.tarih && r.tarih>=today).sort((a,b)=>String(a.tarih+a.saat).localeCompare(String(b.tarih+b.saat))).slice(0,5);
  box.innerHTML = `
    <div class="appointment-summary-card"><b>Bugün</b><span>${todayRows.length}</span></div>
    <div class="appointment-summary-card"><b>Bekleyen</b><span>${active.length}</span></div>
    <div class="appointment-mini-list">
      ${upcoming.map(r=>`<div class="appointment-mini-item"><b>${r.firma||"-"}</b><span>${trDate(r.tarih)} ${r.saat||""}</span></div>`).join("") || `<div class="muted">Yaklaşan randevu yok</div>`}
    </div>
  `;
}

function renderAppointments(){
  ensureAppointments();
  const list = document.getElementById("appointmentList");
  if(!list){
    renderAppointmentSummary();
    return;
  }

  const q = (document.getElementById("rdf_search")?.value || "").toLowerCase();
  const status = document.getElementById("rdf_status")?.value || "";
  const startDate = document.getElementById("rdf_start")?.value || "";
  const endDate = document.getElementById("rdf_end")?.value || "";

  const rows = state.randevular.filter(r=>{
    const hay = String((r.no||"")+(r.firma||"")+(r.yetkili||"")+(r.tel||"")+(r.tip||"")+(r.durum||"")+(r.not||"")).toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(status && r.durum !== status) return false;
    if(startDate && r.tarih < startDate) return false;
    if(endDate && r.tarih > endDate) return false;
    return true;
  }).sort((a,b)=>String(a.tarih+a.saat).localeCompare(String(b.tarih+b.saat)));

  list.innerHTML = rows.map(r=>`<tr>
    <td>${r.no||""}</td>
    <td>${appointmentDateTimeText(r)}</td>
    <td><div class="appointment-firma">${r.firma||""}</div><div class="appointment-type">${r.firmaMode==="manuel"?"Manuel":"Kayıtlı Firma"}</div></td>
    <td>${r.yetkili||"-"}</td>
    <td>${r.tel||"-"}</td>
    <td>${r.tip||""}</td>
    <td>${appointmentStatusBadge(r.durum)}</td>
    <td>${appointmentImportanceBadge(r.onem)}</td>
    <td class="appointment-note">${r.not||"-"}</td>
    <td><div class="table-actions">
      <button class="btn" onclick="editAppointment('${r.no}')">Düzenle</button>
      <button class="btn danger" onclick="delAppointment('${r.no}')">Sil</button>
    </div></td>
  </tr>`).join("") || `<tr><td colspan="10" class="muted">Randevu kaydı yok</td></tr>`;

  renderAppointmentSummary();
}


function visitFilterText(value){
  if(typeof normalizeSearchText === "function") return normalizeSearchText(value || "");
  return String(value || "").toLocaleLowerCase("tr-TR");
}

function visitOptionHtml(value){
  const safe = String(value || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  return `<option value="${safe}">${safe}</option>`;
}

function setupVisitFilters(){
  if(!state.visits) state.visits = [];

  const firmaEl = document.getElementById("zf_firma");
  if(firmaEl){
    const old = firmaEl.value || "";
    const names = Array.from(new Set([
      ...(state.visits||[]).map(v=>v.firma||""),
      ...(state.firmalar||[]).map(f=>f.ad||"")
    ].filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b),"tr"));
    firmaEl.innerHTML = `<option value="">Tümü</option>` + names.map(visitOptionHtml).join("");
    firmaEl.value = names.includes(old) ? old : "";
  }

  const cityEl = document.getElementById("zf_city");
  if(cityEl){
    const old = cityEl.value || "";
    const cities = Array.from(new Set((state.visits||[]).map(v=>v.sehir||"").filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b),"tr"));
    cityEl.innerHTML = `<option value="">Tümü</option>` + cities.map(visitOptionHtml).join("");
    cityEl.value = cities.includes(old) ? old : "";
  }

  const statusEl = document.getElementById("zf_status");
  if(statusEl){
    const old = statusEl.value || "";
    const statuses = ["İlk Ziyaret","Telefon ile Arandı","WhatsApp İletişim","Mail Atıldı","Tekrar Aranacak","Teklif Bekliyor","Sipariş Potansiyeli Var","Bizim Marka Satıyor","Olumsuz","Müşteriye Dönüştü"];
    statusEl.innerHTML = `<option value="">Tümü</option>` + statuses.map(visitOptionHtml).join("");
    statusEl.value = statuses.includes(old) ? old : "";
  }

  const materialEl = document.getElementById("zf_material");
  if(materialEl){
    const old = materialEl.value || "";
    const materials = ["Kart","Fiyat Listesi","Katalog","Broşür","Numune","Diğer"];
    materialEl.innerHTML = `<option value="">Tümü</option>` + materials.map(visitOptionHtml).join("");
    materialEl.value = materials.includes(old) ? old : "";
  }
}

function clearVisitFilters(){
  ["zf_search","zf_firma","zf_city","zf_status","zf_follow","zf_material","zf_start","zf_end"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = "";
  });
  renderVisits();
}


function filteredVisitRows(searchText){
  if(!state.visits) state.visits = [];
  const q = visitFilterText(searchText ?? (document.getElementById("zf_search")?.value || ""));
  const firmaFilter = document.getElementById("zf_firma")?.value || "";
  const cityFilter = document.getElementById("zf_city")?.value || "";
  const status = document.getElementById("zf_status")?.value || "";
  const followFilter = document.getElementById("zf_follow")?.value || "";
  const materialFilter = document.getElementById("zf_material")?.value || "";
  const startDate = document.getElementById("zf_start")?.value || "";
  const endDate = document.getElementById("zf_end")?.value || "";

  return state.visits
    .map((v,idx)=>({v,idx}))
    .filter(({v})=>{
      const mats = visitMaterialsArray(v);
      const mat = mats.join(" ");
      const hay = visitFilterText(
        (v.no||"")+" "+
        (v.firma||"")+" "+
        (v.yetkili||"")+" "+
        (v.tel||"")+" "+
        (v.mail||"")+" "+
        (v.sehir||"")+" "+
        (v.ilce||"")+" "+
        (v.adres||"")+" "+
        (v.durum||"")+" "+
        (v.not||"")+" "+
        visitSampleSummaryText(v)+" "+
        mat
      );
      if(q && !hay.includes(q)) return false;
      if(firmaFilter && v.firma !== firmaFilter) return false;
      if(cityFilter && v.sehir !== cityFilter) return false;
      if(status && v.durum !== status) return false;
      if(followFilter === "var" && !v.takip) return false;
      if(followFilter === "yok" && v.takip) return false;
      if(materialFilter && !mats.includes(materialFilter)) return false;
      if(startDate && v.tarih < startDate) return false;
      if(endDate && v.tarih > endDate) return false;
      return true;
    })
    .sort((a,b)=>{
      const dateCmp = String(b.v.tarih||"").localeCompare(String(a.v.tarih||""));
      if(dateCmp) return dateCmp;
      return b.idx - a.idx;
    })
    .map(x=>x.v);
}

function visitExcelTableHtml(rows){
  rows = rows || filteredVisitRows();
  const bodyRows = rows.map((v,idx)=>`
    <tr>
      <td>${idx+1}</td>
      <td>${htmlEscape(v.no||"")}</td>
      <td>${htmlEscape(v.tarih ? trDate(v.tarih) : "")}</td>
      <td>${htmlEscape(v.firma||"")}</td>
      <td>${htmlEscape(visitFirmaTypeText(v))}</td>
      <td>${htmlEscape(v.yetkili||"")}</td>
      <td>${htmlEscape(v.tel||"")}</td>
      <td>${htmlEscape(v.mail||"")}</td>
      <td>${htmlEscape(visitLocationText(v))}</td>
      <td>${htmlEscape(visitMaterialsArray(v).join(", "))}</td>
      <td>${htmlEscape(visitSampleSummaryText(v))}</td>
      <td>${htmlEscape(v.durum||"")}</td>
      <td>${htmlEscape(v.takip ? trDate(v.takip) : "")}</td>
      <td>${htmlEscape(v.adres||"")}</td>
      <td>${htmlEscape(v.not||"")}</td>
    </tr>
  `).join("");

  const filterText = [
    document.getElementById("zf_search")?.value ? "Arama: " + document.getElementById("zf_search").value : "",
    document.getElementById("zf_firma")?.value ? "Firma: " + document.getElementById("zf_firma").value : "",
    document.getElementById("zf_city")?.value ? "Şehir: " + document.getElementById("zf_city").value : "",
    document.getElementById("zf_status")?.value ? "Durum: " + document.getElementById("zf_status").value : "",
    document.getElementById("zf_follow")?.value ? "Takip: " + (document.getElementById("zf_follow").value === "var" ? "Takip Var" : "Takip Yok") : "",
    document.getElementById("zf_material")?.value ? "Materyal: " + document.getElementById("zf_material").value : "",
    document.getElementById("zf_start")?.value ? "Başlangıç: " + trDate(document.getElementById("zf_start").value) : "",
    document.getElementById("zf_end")?.value ? "Bitiş: " + trDate(document.getElementById("zf_end").value) : ""
  ].filter(Boolean).join(" | ") || "Tüm kayıtlar";

  return `<html>
<head>
<meta charset="UTF-8">
<style>
  table{border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:12px}
  th,td{border:1px solid #999;padding:6px;vertical-align:top}
  th{background:#eeeeee;font-weight:bold}
  .title{font-size:18px;font-weight:bold;margin-bottom:6px}
  .muted{color:#555;margin-bottom:12px}


    /* ===== 2026 MODERN ARAYÜZ YENİLEME ===== */
    :root{
      --bg:#f4f7fb;--panel:#ffffff;--text:#10213d;--muted:#718096;--line:#e2e8f0;
      --blue:#1769e0;--green:#16a765;--red:#df3f3f;--orange:#f59e0b;--dark:#0d2340;
      --soft:#f8fafc;--shadow:0 8px 24px rgba(15,35,64,.07);--radius:14px;
    }
    body{font-family:Inter,"Segoe UI",Arial,Helvetica,sans-serif;background:linear-gradient(180deg,#f7f9fc 0,#f1f5f9 100%);color:var(--text)}
    .sidebar{width:235px;background:linear-gradient(180deg,#0b2442 0%,#0b1d35 100%);padding:20px 12px;box-shadow:8px 0 30px rgba(7,25,47,.08);border-right:1px solid rgba(255,255,255,.05)}
    .main{max-width:calc(100vw - 235px);padding:20px 22px 32px}
    .app-brand{padding:2px 8px 18px!important;margin:0 0 10px!important;border-bottom:1px solid rgba(255,255,255,.1);display:flex!important;align-items:center;gap:10px}
    .brand-title{font-size:22px;font-weight:900;letter-spacing:.3px;color:#fff}
    .brand-title:after{content:"Cari Takip Sistemi";display:block;font-size:10px;font-weight:500;letter-spacing:.5px;color:#9fb4ce;margin-top:4px}
    .menu{gap:4px}
    .menu button{position:relative;padding:11px 12px 11px 40px;border-radius:9px;font-size:13px;font-weight:600;color:#c9d6e5;transition:.18s ease}
    .menu button:before{position:absolute;left:13px;top:50%;transform:translateY(-50%);width:18px;text-align:center;font-size:15px;opacity:.95}
    .menu button[data-view="dashboard"]:before{content:"⌂"}.menu button[data-view="firmalar"]:before{content:"♙"}.menu button[data-view="siparisler"]:before{content:"▤"}.menu button[data-view="teklifler"]:before{content:"▧"}.menu button[data-view="ziyaretler"]:before{content:"◈"}.menu button[data-view="randevular"]:before{content:"◷"}.menu button[data-view="tahsilatlar"]:before{content:"₺"}.menu button[data-view="hareketler"]:before{content:"⇄"}.menu button[data-view="urunler"]:before{content:"▦"}.menu button[data-view="katalog"]:before{content:"▥"}.menu button[data-view="kategoriler"]:before{content:"◫"}.menu button[data-view="raporlar"]:before{content:"▥"}.menu button[data-view="ayarlar"]:before{content:"⚙"}
    .menu button:hover{background:rgba(255,255,255,.08);color:#fff;transform:translateX(2px)}
    .menu button.active{background:linear-gradient(135deg,#1473ed,#1762cf);box-shadow:0 7px 18px rgba(23,105,224,.3);color:#fff}
    .topbar{background:#fff;border:1px solid var(--line);border-radius:13px;padding:12px 15px;margin-bottom:15px;box-shadow:0 3px 12px rgba(15,35,64,.04);align-items:center!important}
    .topbar h1{font-size:22px;letter-spacing:-.4px}.topbar .subtitle{font-size:12px;margin-top:3px}.topbar .pill{background:#f7f9fc;border-color:#e4eaf1;color:#52657d;padding:8px 11px}
    .topbar-actions{display:flex;align-items:center;gap:8px;margin-left:auto;margin-right:8px;flex-wrap:wrap;justify-content:flex-end}
    .top-quick{border:1px solid #dbe4ef;background:#fff;color:#233955;padding:8px 11px;border-radius:8px;font-weight:750;font-size:12px;cursor:pointer;box-shadow:0 2px 5px rgba(15,35,64,.03)}
    .top-quick.primary{background:#1769e0;border-color:#1769e0;color:#fff}.top-quick.success{background:#16a765;border-color:#16a765;color:#fff}
    .top-quick:hover{transform:translateY(-1px);box-shadow:0 5px 12px rgba(15,35,64,.1)}
    .card{border:1px solid #e3e9f1;border-radius:13px;box-shadow:0 4px 14px rgba(15,35,64,.055);padding:15px}
    .cards{gap:11px;margin-bottom:14px}.dashboard-click-card{min-height:126px;position:relative;overflow:hidden;background:linear-gradient(145deg,#fff,#fbfdff)}
    .dashboard-click-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#1769e0;border-radius:4px}.dashboard-click-card:nth-child(2):before{background:#16a765}.dashboard-click-card:nth-child(3):before{background:#f59e0b}.dashboard-click-card:nth-child(4):before{background:#0ea5e9}.dashboard-click-card:nth-child(5):before{background:#8b5cf6}.dashboard-click-card:nth-child(6):before{background:#df3f3f}
    .stat-label{font-size:11px;letter-spacing:.25px;color:#6b7d92}.stat-value{font-size:23px;letter-spacing:-.6px;margin-top:8px}.stat-note{font-size:11px}.stat-link-note{font-size:10px!important;color:#8b9aab!important}
    .section-head h2{font-size:16px;color:#142a47}.section-head{border-bottom:1px solid #edf1f6;padding-bottom:10px;margin-bottom:12px}
    .btn{border-radius:8px;padding:8px 11px;font-size:12px;box-shadow:0 1px 3px rgba(15,35,64,.04);transition:.15s ease}.btn.primary{background:linear-gradient(135deg,#1769e0,#135ecb)}.btn:hover{transform:translateY(-1px);box-shadow:0 4px 10px rgba(15,35,64,.09)}
    input,select,textarea{border-radius:8px;border-color:#dbe3ed;padding:9px 10px;transition:.15s ease}input:focus,select:focus,textarea:focus{outline:none;border-color:#6ca6f5;box-shadow:0 0 0 3px rgba(23,105,224,.09)}
    label{font-size:11px;color:#61738a}
    .table-wrap{border:1px solid #e5eaf1;border-radius:10px;background:#fff}.table-wrap table{border-collapse:separate;border-spacing:0}th{position:sticky;top:0;z-index:2;background:#f7f9fc!important;color:#52657d;font-size:10.5px;letter-spacing:.2px;padding:10px 8px}td{padding:9px 8px;font-size:12.5px}tbody tr:nth-child(even){background:#fbfcfe}tbody tr:hover{background:#f0f6ff}
    .badge{border-radius:6px;padding:4px 7px;font-size:10.5px}.b-green{background:#e5f8ee;color:#087c45}.b-blue{background:#e7f0ff;color:#1559b7}.b-red{background:#ffe9e9;color:#b42323}.b-orange{background:#fff2da;color:#a45a00}
    .summary-item{border-radius:9px;background:linear-gradient(180deg,#fbfdff,#f5f8fc);border-color:#e0e7f0}.summary-item div:last-child{color:#122b4c}
    .dashboard-cloud-quick{border-radius:12px!important;box-shadow:0 3px 12px rgba(15,35,64,.04)!important}
    @media(max-width:1200px){.sidebar{width:215px}.main{max-width:calc(100vw - 215px)}.topbar-actions{display:none}}
    @media(max-width:900px){.sidebar{width:100%}.main{max-width:100vw}.brand-title:after{display:none}.menu button{padding-left:34px}}
</style>
</head>
<body>
  <div class="title">Ziyaret / Numune / Materyal Listesi</div>
  <div class="muted">Oluşturma: ${new Date().toLocaleString("tr-TR")}</div>
  <div class="muted">Filtre: ${htmlEscape(filterText)}</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Kayıt No</th>
        <th>Tarih</th>
        <th>Firma / Müşteri</th>
        <th>Kayıt Tipi</th>
        <th>Yetkili</th>
        <th>Telefon</th>
        <th>Mail</th>
        <th>İl / İlçe</th>
        <th>Materyaller</th>
        <th>Numune Ürünleri</th>
        <th>Durum</th>
        <th>Takip Tarihi</th>
        <th>Adres / Bölge</th>
        <th>Not</th>
      </tr>
    </thead>
    <tbody>${bodyRows || `<tr><td colspan="15">Filtreye uygun kayıt yok</td></tr>`}</tbody>
  </table>
</body>
</html>`;
}

function downloadVisitExcel(){
  const rows = filteredVisitRows();
  if(!rows.length){
    alert("Excel indirmek için filtreye uygun ziyaret / numune / materyal kaydı yok.");
    return;
  }

  const filename = "ziyaret_numune_materyal_" + todayISO() + ".xls";
  const blob = new Blob(["\uFEFF" + visitExcelTableHtml(rows)], {type:"application/vnd.ms-excel;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderVisits(searchText){
  const list = document.getElementById("visitList");
  if(!list) return;
  if(!state.visits) state.visits = [];
  if(typeof setupVisitFilters === "function") setupVisitFilters();

  const rows = filteredVisitRows(searchText);

  list.innerHTML = rows.map(v=>{
    const takip = v.takip ? `<div><b>Takip:</b> ${trDate(v.takip)}</div>` : `<div class="muted">Takip yok</div>`;
    return `<tr>
      <td>${v.no||""}</td>
      <td>${v.tarih ? trDate(v.tarih) : ""}</td>
      <td>
        <div class="visit-firma-name">${v.firma||""}</div>
        <div class="visit-type">${visitFirmaTypeText(v)}</div>
      </td>
      <td>
        <div class="visit-person">${v.yetkili||"-"}</div>
      </td>
      <td>${v.tel||"-"}</td>
      <td>${v.mail||"-"}</td>
      <td>${visitLocationText(v)}</td>
      <td><div class="visit-materials">${visitMaterialsHtml(v)}</div>${visitSampleSummaryHtml(v)}</td>
      <td>
        <div>${badge(v.durum||"")}</div>
        ${takip}
      </td>
      <td class="visit-note-cell">${visitShortNote(v)}</td>
      <td><div class="table-actions">
        <button class="btn" onclick="viewVisit('${v.no}')">Detay</button>
        <button class="btn" onclick="editVisit('${v.no}')">Düzenle</button>
        <button class="btn" onclick="convertVisitToFirma('${v.no}')">Firmaya Aktar</button>
        <button class="btn danger" onclick="delVisit('${v.no}')">Sil</button>
      </div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="11" class="muted">Ziyaret / materyal kaydı yok</td></tr>`;
}

function clearVisitFilters(){
  ["zf_search","zf_firma","zf_city","zf_status","zf_follow","zf_material","zf_start","zf_end"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = "";
  });
  renderVisits();
}

