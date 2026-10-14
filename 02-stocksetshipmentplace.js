function stockSetShipmentPlace(id){stockInit().shipmentPlace=id;saveState();}
function businessUndo(id){
 const entry=businessInit().history.find(x=>x.id===id);if(!entry||entry.undone)return;
 if(!confirm('Bu işlem geri alınsın mı?'))return;
 const st=stockInit(),d=entry.data||{};
 if(entry.type==='stock-add'){
  const m=st.movements.find(x=>x.id===d.movementId);if(!m||m.shipmentKey)return alert('Hareket bulunamadı veya sevkiyata bağlı.');
  if(m.type==='in'&&stockBalance(m.place,m.product)<Number(m.qty))return alert('Bu giriş geri alınırsa stok eksiye düşecek.');
  if(m.type==='adjust')return alert('Sayım düzeltmesini otomatik geri almak güvenli değil. Manuel stok sayımı yapın.');
  st.movements=st.movements.filter(x=>x.id!==m.id);
 }else if(entry.type==='stock-delete'){
  const m=d.movement;if(!m||st.movements.some(x=>x.id===m.id))return alert('Hareket zaten mevcut.');
  if(m.type==='out'&&stockBalance(m.place,m.product)<Number(m.qty))return alert('Silinen stok çıkışını geri almak mevcut stoğu eksiye düşürecek.');
  st.movements.push(m);
 }else if(entry.type==='shipment'){
  const order=(state.orders||[]).find(x=>x.no===d.orderNo)||state.orders[d.orderIndex];
  const ship=order?.sevkler?.find(x=>x.id===d.shipmentId);
  if(!ship)return alert('Sevkiyat kaydı bulunamadı.');
  const moves=st.movements.filter(x=>x.shipmentKey===d.shipmentId);
  if(moves.length!==(ship.items||[]).length)return alert('Sevkiyat stok hareketleri değişmiş; güvenli geri alma yapılamadı.');
  st.movements=st.movements.filter(x=>x.shipmentKey!==d.shipmentId);
  order.sevkler=order.sevkler.filter(x=>x.id!==d.shipmentId);
  const remaining=orderShipmentTotals(order).remaining;
  order.durum=remaining>0?'Hazırlanıyor':'Sevk Edildi';
 }else return alert('Bu işlem için geri alma desteklenmiyor.');
 entry.undone=true;entry.undoneAt=new Date().toISOString();saveState();renderAll();
}
function renderBusinessExtras(){
 const history=document.getElementById('businessHistoryRows');
 if(history)history.innerHTML=businessInit().history.slice().reverse().map(h=>`<tr><td>${new Date(h.date).toLocaleString('tr-TR')}</td><td>${stockSafe(h.type)}</td><td>${stockSafe(h.description)}</td><td>${h.undone?'Geri alındı':`<button class="btn" onclick="businessUndo('${h.id}')">Geri Al</button>`}</td></tr>`).join('')||'<tr><td colspan="4">Henüz işlem yok.</td></tr>';
 const rows=document.getElementById('dueRows');if(!rows)return;
 const month=document.getElementById('dueMonth')?.value||'',today=todayISO(),unpaid=orderUnpaidAllocationMap();
 const invoices=(state.orders||[]).map((o,i)=>({o,i,due:orderDueDate(o),remaining:Number(unpaid[i]||0)})).filter(x=>!isOrderClosedForOverdue(x.o)&&x.remaining>0.009&&x.due);
 const selected=invoices.filter(x=>!month||x.due.startsWith(month)).sort((a,b)=>a.due.localeCompare(b.due));
 const overdue=invoices.filter(x=>x.due<today),soon=invoices.filter(x=>x.due>=today&&x.due<=addDaysISO(today,7));
 const sum=a=>a.reduce((s,x)=>s+x.remaining,0);
 document.getElementById('dueSummary').innerHTML=`<div class="card"><div class="stat-label">Toplam Açık Alacak</div><div class="stat-value">${money(sum(invoices))}</div></div><div class="card"><div class="stat-label">Gecikmiş</div><div class="stat-value">${money(sum(overdue))}</div></div><div class="card"><div class="stat-label">7 Gün İçinde</div><div class="stat-value">${money(sum(soon))}</div></div>`;
 rows.innerHTML=selected.map(x=>`<tr><td>${trDate(x.due)}</td><td>${stockSafe(x.o.firma)}</td><td>${stockSafe(x.o.no)}</td><td>${money(Number(x.o.total||0))}</td><td>${money(x.remaining)}</td><td>${x.due<today?'Gecikti':x.due===today?'Bugün':'Bekliyor'}</td></tr>`).join('')||'<tr><td colspan="6">Bu dönemde açık alacak yok.</td></tr>';
 const alerts=[];
 if(overdue.length)alerts.push('🔴 '+overdue.length+' gecikmiş alacak — '+money(sum(overdue)));
 if(soon.length)alerts.push('🟠 '+soon.length+' yaklaşan tahsilat — '+money(sum(soon)));
 const pending=(state.orders||[]).filter(o=>['Onay Bekliyor','Hazırlanıyor','Beklemede'].includes(o.durum));if(pending.length)alerts.push('📦 '+pending.length+' bekleyen sipariş');
 const st=stockInit();for(const l of st.locations.filter(x=>x.active))for(const p of state.urunler||[]){const has=st.movements.some(m=>m.place===l.id&&m.product===String(p.kod));if(has&&stockBalance(l.id,String(p.kod))<=Number(st.limits[p.kod]||0))alerts.push('⚠ Kritik stok: '+l.name+' / '+p.ad);}
 const area=document.getElementById('businessAlerts');if(area)area.innerHTML=alerts.length?alerts.map(a=>`<div class="card" style="margin:8px 0">${stockSafe(a)}</div>`).join(''):'<div class="card">Şu anda uyarı bulunmuyor.</div>';
}

const DASH_WIDGETS = [["metric_0", "Toplam Satış / Alacak"], ["metric_1", "Toplam Tahsilat"], ["metric_2", "Açık Bakiye"], ["metric_3", "Bugünkü Tahsilat"], ["metric_4", "Açık Sipariş"], ["metric_5", "Vadesi Geçen"], ["metric_6", "Bu Ay Tahsilat"], ["metric_7", "Bekleyen Teklif"], ["metric_8", "Bu Ayki Satış"], ["panel_0", "Sipariş Durum Takibi"], ["panel_1", "Satış Özeti / Satış Adedi"], ["panel_2", "Son Hareketler"], ["panel_3", "Yaklaşan Randevular / Bugünkü Randevular"], ["panel_4", "Açık Bakiyesi Yüksek Firmalar / Uyarılar"]];
const DASH_WIDGET_KEY = 'tatsan_dashboard_widget_visibility_v1';
function dashWidgetPrefs(){try{return JSON.parse(localStorage.getItem(DASH_WIDGET_KEY)||'{}')||{}}catch(e){return {}}}
function applyDashWidgetVisibility(){
  const prefs=dashWidgetPrefs();
  document.querySelectorAll('#dashboard [data-dash-widget]').forEach(el=>{el.style.display=prefs[el.getAttribute('data-dash-widget')]===false?'none':''});
}
function renderDashWidgetChoices(){
  const target=document.getElementById('dashWidgetChoices');if(!target)return;
  const prefs=dashWidgetPrefs();target.innerHTML='';
  DASH_WIDGETS.forEach(([key,title])=>{
    const label=document.createElement('label');label.className='dash-widget-option';
    const cb=document.createElement('input');cb.type='checkbox';cb.checked=prefs[key]!==false;
    cb.addEventListener('change',()=>{const next=dashWidgetPrefs();next[key]=cb.checked;localStorage.setItem(DASH_WIDGET_KEY,JSON.stringify(next));applyDashWidgetVisibility()});
    label.appendChild(cb);label.appendChild(document.createTextNode(' '+title));target.appendChild(label);
  });
}
function toggleDashCustomizer(){const el=document.getElementById('dashCustomizer');if(!el)return;el.classList.toggle('hide');if(!el.classList.contains('hide'))renderDashWidgetChoices()}
function resetDashWidgets(){localStorage.removeItem(DASH_WIDGET_KEY);applyDashWidgetVisibility();renderDashWidgetChoices()}

function renderAll(){
  const todayEl = document.getElementById("today");
  if(todayEl) todayEl.textContent = new Date().toLocaleDateString("tr-TR",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  applyAppIdentity();
  applyCloudSettings();
  renderDashboardCloudStatus();
  ensureDates();
  migrateSamplesToVisits(true);
  normalizeProductOrder();
  renderSelects();
  setupPaymentFilters();
  ensureNewOrderFirmaEmpty();
  updateOrderProductVisibility();
  renderDashboard();
  applyDashWidgetVisibility();
  renderBusinessExtras();
  renderReturns();
  renderFirmalar();
  renderKategoriler();
  ensureDefaultActiveFilters();
  renderUrunler();
  renderCatalogBuilder();
  renderOrderProducts();
  renderOrders();
  renderDiscountProducts();
  renderQuoteProducts();
  renderQuotes();
  renderSampleProducts();
  renderSamples();
  renderAppointments();
  setupVisitFilters();
  renderVisits();
  renderPayments();
  renderPaymentReminderCollections();
  updatePaymentFirmBalance();
  renderMoves();
  renderReports();
  renderStock();
  populateCitySelect('f_sehir','f_ilce');
  populateCitySelect('z_sehir','z_ilce');
  populateFilterCitySelect();
  renderSettingsMenuOrder();
  renderSettingsMenuVisibility();
  toggleFirmaManualDiscount();
  toggleOrderManualDiscount();
}
function ensureDates(){
  ["s_tarih","q_tarih","n_tarih","z_tarih","t_tarih"].forEach(id=>{const el=document.getElementById(id); if(el && !el.value) el.value=todayISO();});
  const sn = document.getElementById("s_no"); if(sn && !sn.value) sn.value = "SIP-" + String(state.orders.length+1).padStart(4,"0");
  const qn = document.getElementById("q_no"); if(qn && !qn.value) qn.value = "TKF-" + String((state.quotes||[]).length+1).padStart(4,"0");
  const nn = document.getElementById("n_no"); if(nn && !nn.value) nn.value = "NUM-" + String(state.samples.length+1).padStart(4,"0");
  const zn = document.getElementById("z_no"); if(zn && !zn.value) zn.value = "ZYR-" + String((state.visits||[]).length+1).padStart(4,"0");
  const re = document.getElementById("r_end"); if(re && !re.value) re.value = todayISO();
  const rs = document.getElementById("r_start"); if(rs && !rs.value){ const d = new Date(); d.setDate(d.getDate()-30); rs.value = d.toISOString().slice(0,10); }
  updateVadeDate();
}

function orderFirmSearchText(firma){
  return normalizeSearchText([
    firma.kod || "",
    firma.ad || "",
    firma.il || "",
    firma.ilce || "",
    firma.sehir || "",
    firma.tel || "",
    firma.telefon || "",
    firma.mail || "",
    firma.yetkili || ""
  ].join(" "));
}

function renderOrderFirmaSelect(){
  const orderFirma = document.getElementById("s_firma");
  if(!orderFirma) return;

  const old = orderFirma.value || "";
  const search = normalizeSearchText(document.getElementById("s_firma_search")?.value || "");
  const activeFirms = (state.firmalar||[]).filter(f=>f.durum==="Aktif");
  const filtered = activeFirms.filter(f=>!search || orderFirmSearchText(f).includes(search));

  let options = `<option value="">Firma seçiniz</option>`;
  if(search && !filtered.length){
    options += `<option value="" disabled>Sonuç bulunamadı</option>`;
  }else{
    options += filtered.map(f=>`<option value="${f.ad}">${f.kod||""} - ${f.ad||""}</option>`).join("");
  }

  orderFirma.innerHTML = options;

  const stillVisible = filtered.some(f=>f.ad===old);
  orderFirma.value = stillVisible ? old : "";
}

function renderSelects(){
  const activeFirms = state.firmalar.filter(f=>f.durum==="Aktif");

  renderOrderFirmaSelect();

  ["q_firma","n_firma","z_firma","t_firma","rd_firma"].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const old=el.value;
    if(id==="q_firma"){
      el.innerHTML = `<option value="">Manuel firma yazacağım</option>` + activeFirms.map(f=>`<option value="${f.ad}">${f.kod} - ${f.ad}</option>`).join("");
      el.value = old || "";
    }else{
      el.innerHTML = activeFirms.map(f=>`<option value="${f.ad}">${f.kod} - ${f.ad}</option>`).join("");
      if(old) el.value=old;
    }
  });

  const rf = document.getElementById("r_firma");
  if(rf){
    const old = rf.value;
    rf.innerHTML = `<option value="">Tüm Firmalar</option>` + activeFirms.map(f=>`<option value="${f.ad}">${f.kod} - ${f.ad}</option>`).join("");
    rf.value = old || "";
  }

  ["of_firma","pf_firma","mf_firma"].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const old=el.value;
    el.innerHTML = `<option value="">Tüm Firmalar</option>` + activeFirms.map(f=>`<option value="${f.ad}">${f.kod} - ${f.ad}</option>`).join("");
    el.value=normalizeFilterAllValue(old)||"";
  });

  const activeCats = state.kategoriler.filter(k=>k.durum==="Aktif").sort((a,b)=>(a.sira||0)-(b.sira||0));
  const ufcat=document.getElementById("uf_cat");
  if(ufcat){
    const old=ufcat.value;
    ufcat.innerHTML = `<option value="">Tüm Kategoriler</option>` + activeCats.map(k=>`<option>${k.ad}</option>`).join("");
    ufcat.value=old||"";
  }

  const ucat=document.getElementById("u_kat");
  if(ucat){
    const old=ucat.value;
    ucat.innerHTML = activeCats.map(k=>`<option>${k.ad}</option>`).join("");
    if(old) ucat.value=old;
  }

  ["d_kat_filter","s_kat_filter","q_kat_filter","n_kat_filter","z_sample_kat_filter"].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const old=el.value;
    el.innerHTML = `<option value="">Tüm Kategoriler</option>` + activeCats.map(k=>`<option>${k.ad}</option>`).join("");
    if(old) el.value=old;
  });
}

function startOfWeekISO(dateObj){
  const d = new Date(dateObj);
  const day = d.getDay() || 7; // Pazartesi 1, Pazar 7
  d.setDate(d.getDate() - day + 1);
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}
function salesPeriodStats(){
  const now = new Date();
  const today = todayISO();
  const weekStart = startOfWeekISO(now);
  const monthPrefix = today.slice(0,7);
  const yearPrefix = today.slice(0,4);

  const validOrders = state.orders.filter(o=>!["Taslak","İptal"].includes(o.durum));
  const sum = fn => validOrders.filter(fn).reduce((s,o)=>s+Number(o.total||0),0);
  const count = fn => validOrders.filter(fn).length;

  return {
    dailySales: sum(o=>o.tarih===today),
    weeklySales: sum(o=>o.tarih>=weekStart && o.tarih<=today),
    monthlySales: sum(o=>String(o.tarih||"").startsWith(monthPrefix)),
    yearlySales: sum(o=>String(o.tarih||"").startsWith(yearPrefix)),
    dailyCount: count(o=>o.tarih===today),
    weeklyCount: count(o=>o.tarih>=weekStart && o.tarih<=today),
    monthlyCount: count(o=>String(o.tarih||"").startsWith(monthPrefix)),
    yearlyCount: count(o=>String(o.tarih||"").startsWith(yearPrefix))
  };
}


function clearOrderListFilters(){
  ["of_search","of_firma","of_start","of_end"].forEach(function(id){
    const el = document.getElementById(id);
    if(el) el.value = "";
  });
}

function scrollToElementSafe(id){
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:"smooth", block:"center"});
}

function tatsanCurrentMonthRange(){
  const today = todayISO();
  const year = Number(today.slice(0,4));
  const month = Number(today.slice(5,7));
  return {start: today.slice(0,7)+"-01", end: year+"-"+String(month).padStart(2,"0")+"-"+String(new Date(year,month,0).getDate()).padStart(2,"0")};
}
function goThisMonthSalesDashboard(){
  go("siparisler");
  setTimeout(function(){
    if(typeof clearOrderListFilters === "function") clearOrderListFilters();
    const range=tatsanCurrentMonthRange();
    const start=document.getElementById("of_start"), end=document.getElementById("of_end");
    if(start) start.value=range.start;
    if(end) end.value=range.end;
    if(typeof renderOrders === "function") renderOrders();
    scrollToElementSafe("orderList");
  },70);
}
function goThisMonthPaymentsDashboard(){
  go("tahsilatlar");
  setTimeout(function(){
    if(typeof clearPaymentFilters === "function") clearPaymentFilters();
    const range=tatsanCurrentMonthRange();
    const start=document.getElementById("pf_start"), end=document.getElementById("pf_end");
    if(start) start.value=range.start;
    if(end) end.value=range.end;
    if(typeof refreshPaymentSection === "function") refreshPaymentSection();
    scrollToElementSafe("paymentList");
  },70);
}

function goTotalSalesDashboard(){
  go("siparisler");
  setTimeout(function(){
    clearOrderListFilters();
    const st = document.getElementById("of_status");
    if(st) st.value = "";
    if(typeof renderOrders === "function") renderOrders();
    scrollToElementSafe("orderList");
  }, 70);
}

function goTotalPaymentsDashboard(){
  go("tahsilatlar");
  setTimeout(function(){
    if(typeof clearPaymentFilters === "function") clearPaymentFilters();
    else if(typeof refreshPaymentSection === "function") refreshPaymentSection();
    scrollToElementSafe("paymentList");
  }, 70);
}

function goOpenBalanceDashboard(){
  go("tahsilatlar");
  setTimeout(function(){
    const search = document.getElementById("pf_search");
    const firma = document.getElementById("pf_firma");
    const tip = document.getElementById("pf_tip");
    const bal = document.getElementById("pf_balance");
    const start = document.getElementById("pf_start");
    const end = document.getElementById("pf_end");
    if(search) search.value = "";
    if(firma) firma.value = "";
    if(tip) tip.value = "";
    if(start) start.value = "";
    if(end) end.value = "";
    if(bal) bal.value = "debt";
    if(typeof refreshPaymentSection === "function") refreshPaymentSection();
    scrollToElementSafe("paymentTrackingList");
  }, 70);
}

function goTodayPaymentDashboard(){
  go("tahsilatlar");
  setTimeout(function(){
    const today = todayISO();
    const search = document.getElementById("pf_search");
    const firma = document.getElementById("pf_firma");
    const tip = document.getElementById("pf_tip");
    const bal = document.getElementById("pf_balance");
    const start = document.getElementById("pf_start");
    const end = document.getElementById("pf_end");
    if(search) search.value = "";
    if(firma) firma.value = "";
    if(tip) tip.value = "";
    if(bal) bal.value = "";
    if(start) start.value = today;
    if(end) end.value = today;
    if(typeof refreshPaymentSection === "function") refreshPaymentSection();
    scrollToElementSafe("paymentList");
  }, 70);
}

function goOverdueDashboard(){
  go("siparisler");
  setTimeout(function(){
    clearOrderListFilters();
    const st = document.getElementById("of_status");
    if(st) st.value = "__overdue";
    if(typeof renderOrders === "function") renderOrders();
    scrollToElementSafe("orderList");
  }, 70);
}


function goOrderWarnings(){
  go("siparisler");
  setTimeout(function(){
    const st=document.getElementById("of_status");
    if(st) st.value="__open";
    renderOrders();
    const list=document.getElementById("orderList");
    if(list) list.scrollIntoView({behavior:"smooth", block:"center"});
  },60);
}

function goOverdueWarnings(){
  goOverdueDashboard();
}

function goCargoWarnings(){
  go("siparisler");
  setTimeout(function(){
    const st=document.getElementById("of_status");
    if(st) st.value="Sevk Edildi";
    renderOrders();
    const list=document.getElementById("orderList");
    if(list) list.scrollIntoView({behavior:"smooth", block:"center"});
  },60);
}

function goSampleWarnings(){
  go("numuneler");
  setTimeout(function(){
    const st=document.getElementById("nf_status");
    if(st) st.value="Takipte";
    renderSamples();
    const list=document.getElementById("sampleList");
    if(list) list.scrollIntoView({behavior:"smooth", block:"center"});
  },60);
}

function goVisitWarnings(){
  go("ziyaretler");
  setTimeout(function(){
    renderVisits();
    const list=document.getElementById("visitList");
    if(list) list.scrollIntoView({behavior:"smooth", block:"center"});
  },60);
}

function goQuoteWarnings(){
  go("teklifler");
  setTimeout(function(){
    const st=document.getElementById("qf_status");
    if(st) st.value="Hazırlandı";
    renderQuotes();
    const list=document.getElementById("quoteList");
    if(list) list.scrollIntoView({behavior:"smooth", block:"center"});
  },60);
}


function findOrderIndexByNo(orderNo){
  return (state.orders||[]).findIndex(o=>String(o.no||"")===String(orderNo||""));
}

function goOrderDetail(orderNo){
  const idx = findOrderIndexByNo(orderNo);
  if(idx < 0){
    alert("Sipariş bulunamadı.");
    return;
  }
  go("siparisler");
  setTimeout(function(){
    const search = document.getElementById("of_search");
    const status = document.getElementById("of_status");
    const firma = document.getElementById("of_firma");
    const start = document.getElementById("of_start");
    const end = document.getElementById("of_end");

    if(search) search.value = orderNo;
    if(status) status.value = "";
    if(firma) firma.value = "";
    if(start) start.value = "";
    if(end) end.value = "";

    renderOrders();

    const list = document.getElementById("orderList");
    if(list) list.scrollIntoView({behavior:"smooth", block:"center"});

    if(typeof viewInvoice === "function"){
      viewInvoice(idx);
    }
  }, 80);
}

function openOrderPdfByNo(orderNo){
  const idx = findOrderIndexByNo(orderNo);
  if(idx < 0){
    alert("Sipariş bulunamadı.");
    return;
  }
  openInvoicePdf(idx);
}

function goOverdueOrders(){
  go("siparisler");
  setTimeout(function(){
    const search = document.getElementById("of_search");
    const firma = document.getElementById("of_firma");
    const status = document.getElementById("of_status");
    const start = document.getElementById("of_start");
    const end = document.getElementById("of_end");

    if(search) search.value = "";
    if(firma) firma.value = "";
    if(start) start.value = "";
    if(end) end.value = "";
    if(status) status.value = "__overdue";

    renderOrders();

    const list = document.getElementById("orderList");
    if(list) list.scrollIntoView({behavior:"smooth", block:"center"});
  }, 70);
}

function dashboardMoveActionHtml(m){
  if(m && m.tip === "Sipariş"){
    const safeNo = String(m.no||"").replace(/'/g,"\\'");
    return `<div class="dash-move-actions">
      <button class="mini-link-btn" onclick="goOrderDetail('${safeNo}')">Sipariş</button>
      <button class="mini-pdf-btn" onclick="openOrderPdfByNo('${safeNo}')">PDF</button>
    </div>`;
  }
  return badge(m.tip);
}


function appointmentActiveForDashboard(r){
  return r && r.tarih && !["İptal","Görüşüldü"].includes(r.durum);
}

function dashboardUpcomingAppointments(limit){
  const today = todayISO();
  const rows = (state.randevular||[])
    .filter(r=>appointmentActiveForDashboard(r) && r.tarih >= today)
    .sort((a,b)=>String((a.tarih||"")+(a.saat||"")).localeCompare(String((b.tarih||"")+(b.saat||""))));
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

function dashboardTodayAppointments(){
  const today = todayISO();
  return (state.randevular||[])
    .filter(r=>appointmentActiveForDashboard(r) && r.tarih === today)
    .sort((a,b)=>String(a.saat||"").localeCompare(String(b.saat||"")));
}

function dashboardAppointmentItemHtml(r){
  const no = String(r.no||"").replace(/'/g,"\\'");
  const when = `${trDate(r.tarih||"")}${r.saat ? " • " + r.saat : ""}`;
  const status = typeof appointmentStatusBadge === "function" ? appointmentStatusBadge(r.durum||"Planlandı") : badge(r.durum||"Planlandı");
  const importance = typeof appointmentImportanceBadge === "function" ? appointmentImportanceBadge(r.onem||"Normal") : "";
  return `<div class="dashboard-appointment-item" onclick="goAppointmentDetail('${no}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){goAppointmentDetail('${no}')}">
    <div class="dashboard-appointment-main">
      <b>${r.firma||"-"}</b>
      <span>${r.yetkili||""}${r.tel ? " • " + r.tel : ""}</span>
      <small>${when} ${r.tip ? " • " + r.tip : ""}</small>
    </div>
    <div class="dashboard-appointment-badges">
      ${status}
      ${importance}
    </div>
  </div>`;
}

function renderDashboardAppointments(){
  const todayBox = document.getElementById("dTodayAppointments");
  const upcomingBox = document.getElementById("dUpcomingAppointments");
  const list = document.getElementById("dashAppointments");
  const todayList = document.getElementById("dashTodayAppointmentList");
  if(!list && !todayList) return;

  if(!state.randevular) state.randevular = [];
  const upcomingAll = dashboardUpcomingAppointments();
  const upcoming = upcomingAll.slice(0,5);
  const todayRows = dashboardTodayAppointments();

  if(todayBox) todayBox.textContent = String(todayRows.length);
  if(upcomingBox) upcomingBox.textContent = String(upcomingAll.length);

  if(list){
    list.innerHTML = upcoming.map(dashboardAppointmentItemHtml).join("") || `<div class="muted dashboard-empty">Yaklaşan randevu yok.</div>`;
  }

  if(todayList){
    todayList.innerHTML = todayRows.map(dashboardAppointmentItemHtml).join("") || `<div class="muted dashboard-empty">Bugün randevu yok.</div>`;
  }
}

function goUpcomingAppointments(){
  go("randevular");
  setTimeout(function(){
    const today = todayISO();
    if(document.getElementById("rdf_search")) rdf_search.value = "";
    if(document.getElementById("rdf_status")) rdf_status.value = "";
    if(document.getElementById("rdf_start")) rdf_start.value = today;
    if(document.getElementById("rdf_end")) rdf_end.value = "";
    renderAppointments();
    const list = document.getElementById("appointmentList");
    if(list) list.scrollIntoView({behavior:"smooth", block:"center"});
  }, 0);
}

function goTodayAppointments(){
  go("randevular");
  setTimeout(function(){
    const today = todayISO();
    if(document.getElementById("rdf_search")) rdf_search.value = "";
    if(document.getElementById("rdf_status")) rdf_status.value = "";
    if(document.getElementById("rdf_start")) rdf_start.value = today;
    if(document.getElementById("rdf_end")) rdf_end.value = today;
    renderAppointments();
    const list = document.getElementById("appointmentList");
    if(list) list.scrollIntoView({behavior:"smooth", block:"center"});
  }, 0);
}

function goAppointmentDetail(no){
  go("randevular");
  setTimeout(function(){
    if(document.getElementById("rdf_search")) rdf_search.value = no || "";
    if(document.getElementById("rdf_status")) rdf_status.value = "";
    if(document.getElementById("rdf_start")) rdf_start.value = "";
    if(document.getElementById("rdf_end")) rdf_end.value = "";
    renderAppointments();
    const list = document.getElementById("appointmentList");
    if(list) list.scrollIntoView({behavior:"smooth", block:"center"});
  }, 0);
}

function isOrderClosedForOverdue(order){
  // "Tamamlandı" sipariş operasyonel olarak bitmiş olabilir; tahsil edilmediyse
  // cari açıdan hâlâ vadesi geçmiş alacak sayılır. Sadece taslak/iptal hariç tutulur.
  return ["Taslak","İptal"].includes(order && order.durum);
}

function addDaysISO(iso, days){
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2])-1, Number(m[3])));
  d.setUTCDate(d.getUTCDate() + (parseInt(days)||0));
  return d.toISOString().slice(0,10);
}

function orderDueDate(order){
  if(!order) return "";
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(order.vadeTarih || ""))) return String(order.vadeTarih);
  // Eski kayıtlarda vadeTarih yoksa sipariş tarihi + vade gününden hesapla.
  return addDaysISO(order.tarih, order.vade);
}

function isOrderOverdueOpen(order, today, unpaidAmount){
  if(!order || isOrderClosedForOverdue(order)) return false;

  // Cari tamamen tahsil edilmişse (veya alacaklı durumdaysa) hiçbir siparişi
  // vadesi geçen olarak gösterme. Kuruş seviyesindeki yuvarlama farklarını da sıfır say.
  const firmaBakiye = normalizeMoneyValue(firmaOpenBalance(order.firma));
  if(firmaBakiye <= 0) return false;

  const dueDate = orderDueDate(order);
  // Bugün vadesi gelenler de bu gruba dahildir.
  if(!(dueDate && dueDate <= today)) return false;

  const unpaid = normalizeMoneyValue(Math.max(0, Number(unpaidAmount || 0)));
  return unpaid > 0;
}

function orderUnpaidAllocationMap(){
  // Tahsilatlar fatura/sipariş numarasına bağlıysa yalnızca o siparişe uygulanır.
  // Genel tahsilatlar ise getFirmInvoiceBalances tarafından eski açık faturalara dağıtılır.
  const map = {};
  (state.orders || []).forEach((o,index)=>{
    if(!o || isOrderClosedForOverdue(o)) return;
    const rows = getFirmInvoiceBalances(o.firma);
    const key = paymentOrderKey(o);
    const row = rows.find(x=>x.order===o) || rows.find(x=>x.key===key);
    map[index] = row ? Math.max(0,Number(row.remaining)||0) : Math.max(0,Number(o.total)||0);
  });
  return map;
}

