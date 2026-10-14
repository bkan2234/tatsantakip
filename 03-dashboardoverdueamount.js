function dashboardOverdueAmount(today){
  const unpaidMap = orderUnpaidAllocationMap();
  return (state.orders || []).reduce((sum,o,index)=>{
    const unpaid = Math.max(0, Number(unpaidMap[index] || 0));
    if(!isOrderOverdueOpen(o, today, unpaid)) return sum;
    return sum + unpaid;
  }, 0);
}

function renderDashboard(){
  const validOrders = state.orders.filter(o=>!["Taslak","İptal"].includes(o.durum));
  const totalSales = validOrders.reduce((s,o)=>s+Number(o.total||0),0);
  const totalPay = state.payments.reduce((s,p)=>s+Number(p.tutar||0),0);
  const today = todayISO();
  const todayPay = state.payments.filter(p=>p.tarih===today).reduce((s,p)=>s+Number(p.tutar||0),0);
  const openOrders = state.orders.filter(o=>!["Tamamlandı","Teslim Edildi","İptal","Taslak"].includes(o.durum)).length;
  const overdue = dashboardOverdueAmount(today);
  dTotalSales.textContent=money(totalSales);
  dTotalPay.textContent=money(totalPay);
  dOpenBal.textContent=money(totalSales-totalPay);
  dTodayPay.textContent=money(todayPay);
  dOpenOrders.textContent=openOrders;
  const orderStatusCounts = (state.orders||[]).reduce((a,o)=>{ a[o.durum]=(a[o.durum]||0)+1; return a; },{});
  const statusTargets = {dStatusWaiting:"Beklemede",dStatusPreparing:"Hazırlanıyor",dStatusReady:"Hazır",dStatusShipped:"Sevk Edildi",dStatusDelivered:"Teslim Edildi"};
  Object.entries(statusTargets).forEach(([id,status])=>{ const el=document.getElementById(id); if(el) el.textContent=orderStatusCounts[status]||0; });
  dOverdue.textContent=money(overdue);
  const monthKey=today.slice(0,7);
  const monthlyPay=(state.payments||[]).filter(p=>String(p.tarih||"").slice(0,7)===monthKey).reduce((s,p)=>s+Number(p.tutar||0),0);
  const pendingQuotes=(state.quotes||[]).filter(q=>["Hazırlandı","Gönderildi"].includes(q.durum)).length;
  if(document.getElementById("dMonthlyPay")) dMonthlyPay.textContent=money(monthlyPay);
  if(document.getElementById("dPendingQuotes")) dPendingQuotes.textContent=pendingQuotes;
  renderDashboardAppointments();

  const ps = salesPeriodStats();
  dDailySales.textContent = money(ps.dailySales);
  dWeeklySales.textContent = money(ps.weeklySales);
  dMonthlySales.textContent = money(ps.monthlySales);
  const thisMonthSalesEl=document.getElementById("dThisMonthSales");
  if(thisMonthSalesEl) thisMonthSalesEl.textContent=money(ps.monthlySales);
  dYearlySales.textContent = money(ps.yearlySales);
  dDailyOrderCount.textContent = ps.dailyCount;
  dWeeklyOrderCount.textContent = ps.weeklyCount;
  dMonthlyOrderCount.textContent = ps.monthlyCount;
  dYearlyOrderCount.textContent = ps.yearlyCount;

  const moves = getMoves().slice(0,6);
  dashMoves.innerHTML = moves.map(m=>`<tr><td>${trDate(m.tarih)}</td><td>${m.firma}</td><td>${dashboardMoveActionHtml(m)}</td><td class="money">${money(m.tutar)}</td><td>${m.aciklama||""}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">Henüz hareket yok</td></tr>`;

  const top = state.firmalar.map(f=>({ad:f.ad,vade:f.vade,bal:firmaOpenBalance(f.ad)})).filter(x=>normalizeMoneyValue(x.bal)>0).sort((a,b)=>b.bal-a.bal).slice(0,5);
  dashTopFirms.innerHTML = top.map(x=>`<tr><td>${x.ad}</td><td class="money orange">${money(x.bal)}</td><td>${x.vade} Gün</td></tr>`).join("") || `<tr><td colspan="3" class="muted">Açık bakiye yok</td></tr>`;

  let warns = "";
  if(openOrders>0) warns += `<div class="warn warning-click" role="button" tabindex="0" onclick="goOrderWarnings()" onkeydown="if(event.key==='Enter'||event.key===' '){goOrderWarnings()}">${openOrders} adet açık sipariş var.</div>`;
  const cargoOpen = state.orders.filter(o=>!["Taslak","İptal"].includes(o.durum) && o.kargoDurum && !["Yok","Teslim Edildi"].includes(o.kargoDurum)).length;
  if(cargoOpen>0) warns += `<div class="warn warning-click" role="button" tabindex="0" onclick="goCargoWarnings()" onkeydown="if(event.key==='Enter'||event.key===' '){goCargoWarnings()}">${cargoOpen} adet kargo takipte.</div>`;
  if(overdue>0) warns += `<div class="warn warning-click" role="button" tabindex="0" onclick="goOverdueWarnings()" onkeydown="if(event.key==='Enter'||event.key===' '){goOverdueWarnings()}">Vadesi geçen açık bakiye: ${money(overdue)}</div>`;
  const sampleFollow = state.samples.filter(s=>s.durum==="Takipte").length;
  if(sampleFollow>0) warns += `<div class="warn warning-click" role="button" tabindex="0" onclick="goSampleWarnings()" onkeydown="if(event.key==='Enter'||event.key===' '){goSampleWarnings()}">${sampleFollow} adet takipte numune var.</div>`;
  const quoteOpen = (state.quotes||[]).filter(q=>!["Reddedildi","Siparişe Döndü"].includes(q.durum)).length;
  if(quoteOpen>0) warns += `<div class="warn warning-click" role="button" tabindex="0" onclick="goQuoteWarnings()" onkeydown="if(event.key==='Enter'||event.key===' '){goQuoteWarnings()}">${quoteOpen} adet açık teklif / proforma var.</div>`;
  const visitFollow = (state.visits||[]).filter(v=>v.takip && v.takip <= todayISO() && !["Olumsuz","Müşteriye Dönüştü"].includes(v.durum)).length;
  if(visitFollow>0) warns += `<div class="warn warning-click" role="button" tabindex="0" onclick="goVisitWarnings()" onkeydown="if(event.key==='Enter'||event.key===' '){goVisitWarnings()}">${visitFollow} yeni müşteri için takip zamanı geldi.</div>`;
  const todayAppointmentCount = dashboardTodayAppointments().length;
  if(todayAppointmentCount>0) warns += `<div class="warn warning-click" role="button" tabindex="0" onclick="goTodayAppointments()" onkeydown="if(event.key==='Enter'||event.key===' '){goTodayAppointments()}">Bugün ${todayAppointmentCount} randevu var.</div>`;

  if(!warns) warns = `<div class="warn" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534">Aktif uyarı yok.</div>`;
  dashWarnings.innerHTML=warns;
}

function badge(tip){
  if(tip==="Sipariş") return `<span class="badge b-green">Sipariş</span>`;
  if(tip==="Tahsilat") return `<span class="badge b-blue">Tahsilat</span>`;
  if(tip==="Numune") return `<span class="badge b-orange">Numune</span>`;
  return `<span class="badge">${tip}</span>`;
}
function getMoves(){
  const orders = state.orders
    .map((o,i)=>({source:"order", index:i, tarih:o.tarih, firma:o.firma, tip:"Sipariş",no:o.no,source:"order", tutar:o.total, aciklama:o.no+" - "+o.durum, durum:o.durum}))
    .filter(m=>!["Taslak","İptal"].includes(m.durum));
  const pays = state.payments.map((p,i)=>({source:"payment", index:i, tarih:p.tarih, firma:p.firma, tip:"Tahsilat",source:"payment", tutar:p.tutar, aciklama:p.tip+" "+(p.aciklama||"")}));
  return [...orders,...pays].sort((a,b)=>String(b.tarih).localeCompare(String(a.tarih)));
}

function saveFirma(){
  const kod=f_kod.value.trim(), ad=f_ad.value.trim();
  if(!kod || !ad) return alert("Firma kodu ve firma adı zorunlu.");
  const obj={kod,ad,tur:f_tur.value,sehir:f_sehir.value,ilce:f_ilce.value,vergi:f_vergi.value,vd:f_vd.value,yetkili:f_yetkili.value,tel:f_tel.value,mail:f_mail.value,adres:f_adres.value,sevk:f_sevk.value,vade:parseInt(f_vade.value)||0,iskonto:f_iskonto.value,manualDisc:Number(f_manual_disc.value)||0,durum:f_durum.value,not:f_not.value,created:todayISO()};
  const i=state.firmalar.findIndex(x=>x.kod===kod);
  if(i>=0) state.firmalar[i]=obj; else state.firmalar.push(obj);
  saveState(); clearFirmaForm(); renderAll();
}
function clearFirmaForm(){["f_kod","f_ad","f_tur","f_vergi","f_vd","f_yetkili","f_tel","f_mail","f_adres","f_sevk","f_not"].forEach(id=>{const el=document.getElementById(id); if(el) el.value="";}); if(typeof populateCitySelect==="function") populateCitySelect("f_sehir","f_ilce","İstanbul",""); f_vade.value=30; f_iskonto.value="15"; f_manual_disc.value=""; f_durum.value="Aktif"; toggleFirmaManualDiscount();}
function renderFirmalar(){
  const q = (document.getElementById("ff_search")?.value || "").toLowerCase();
  const city = (document.getElementById("ff_city")?.value || "").toLowerCase();
  const disc = document.getElementById("ff_discount")?.value || "";
  const status = document.getElementById("ff_status")?.value || "";
  const balanceFilter = document.getElementById("ff_balance")?.value || "";

  const rows = state.firmalar.filter(f=>{
    const hay = String((f.kod||"")+(f.ad||"")+(f.sehir||"")+(f.tel||"")+(f.tur||"")).toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(city && String(f.sehir||"").toLowerCase() !== city) return false;
    if(disc && f.iskonto !== disc) return false;
    if(status && f.durum !== status) return false;
    const openBalance = normalizeMoneyValue(firmaOpenBalance(f.ad));
    if(balanceFilter==="debt" && openBalance <= 0) return false;
    if(balanceFilter==="clear" && openBalance > 0) return false;
    return true;
  });

  firmaList.innerHTML = rows.map(f=>{
    const paid = firmaTotalPayments(f.ad);
    const iskontoText = f.iskonto==="Manuel" ? manualDiscountText(f.manualDisc) : (f.iskonto||"0");
    return `<div class="firma-card">
      <div class="firma-card-top">
        <div class="firma-card-title">
          <div class="firma-card-name">${f.ad||""}</div>
          <div class="firma-card-code">Kod: ${f.kod||""}</div>
        </div>
        <div class="firma-card-status">${f.durum||""}</div>
      </div>

      <div class="firma-card-info">
        <div class="firma-info-box">
          <div class="firma-info-label">Tür</div>
          <div class="firma-info-value">${f.tur||"-"}</div>
        </div>
        <div class="firma-info-box">
          <div class="firma-info-label">İl / İlçe</div>
          <div class="firma-info-value">${f.sehir||"-"}${f.ilce ? " / " + f.ilce : ""}</div>
        </div>
        <div class="firma-info-box">
          <div class="firma-info-label">Telefon</div>
          <div class="firma-info-value">${f.tel||"-"}</div>
        </div>
        <div class="firma-info-box">
          <div class="firma-info-label">Vade</div>
          <div class="firma-info-value">${Number(f.vade)||0} Gün</div>
        </div>
        <div class="firma-info-box">
          <div class="firma-info-label">İskonto</div>
          <div class="firma-info-value">${iskontoText}</div>
        </div>
        <div class="firma-info-box">
          <div class="firma-info-label">Yetkili</div>
          <div class="firma-info-value">${f.yetkili||"-"}</div>
        </div>
      </div>

      <div class="firma-money-row">
        <div class="firma-money-box">
          <div class="firma-money-label">Tahsil Edilen</div>
          <div class="firma-money-value paid-amount">${money(paid)}</div>
        </div>
        <div class="firma-money-box">
          <div class="firma-money-label">${firmaBalanceLabel(f.ad)}</div>
          <div class="firma-money-value">${firmaBalanceBadge(f.ad)}</div>
        </div>
      </div>

      <div class="firma-card-actions">
        <button class="btn" onclick="viewFirma('${f.kod}')">Görüntüle</button>
        <button class="btn" onclick="takePaymentFromFirma('${f.ad}')">Ödeme Al</button>
        <button class="btn" onclick="openCustomerStatement('${escapeJsText(f.ad)}')">Ekstre</button>
        <button class="btn" onclick="showCustomerContacts('${escapeJsText(f.ad)}')">Görüşmeler</button>
        <button class="btn whatsapp-btn" onclick="openPaymentReminderWhatsapp('${escapeJsText(f.ad)}')">WhatsApp</button>
        <button class="btn" onclick="editFirma('${f.kod}')">Düzenle</button>
        <button class="btn danger" onclick="delFirma('${f.kod}')">Sil</button>
      </div>
    </div>`;
  }).join("") || `<div class="firma-empty">Kayıt bulunamadı</div>`;
}

function clearFirmaFilters(){
  ["ff_search","ff_city"].forEach(id=>{const el=document.getElementById(id); if(el) el.value="";});
  ["ff_discount","ff_status","ff_balance"].forEach(id=>{const el=document.getElementById(id); if(el) el.value="";});
  renderFirmalar();
}
function editFirma(kod){const f=state.firmalar.find(x=>x.kod===kod); if(!f)return; f_kod.value=f.kod;f_ad.value=f.ad;f_tur.value=f.tur;f_sehir.value=f.sehir;f_ilce.value=f.ilce;f_vergi.value=f.vergi;f_vd.value=f.vd;f_yetkili.value=f.yetkili;f_tel.value=f.tel;f_mail.value=f.mail;f_adres.value=f.adres;f_sevk.value=f.sevk;f_vade.value=f.vade;f_iskonto.value=f.iskonto;f_manual_disc.value=f.manualDisc||"";f_durum.value=f.durum;f_not.value=f.not;toggleFirmaManualDiscount();
  if(typeof populateCitySelect==="function") populateCitySelect("f_sehir","f_ilce",f.sehir||"",f.ilce||"");
}

function viewFirma(kod){
  const f = state.firmalar.find(x=>x.kod===kod);
  if(!f) return;

  const firmaOrders = state.orders.filter(o=>o.firma===f.ad);
  const firmaPayments = state.payments.filter(p=>p.firma===f.ad);
  const openBalance = firmaOpenBalance(f.ad);
  const totalSales = firmaOrders.filter(o=>!["Taslak","İptal"].includes(o.durum)).reduce((s,o)=>s+Number(o.total||0),0);
  const totalPayments = firmaPayments.reduce((s,p)=>s+Number(p.tutar||0),0);
  const iskontoText = f.iskonto==="Manuel" ? manualDiscountText(f.manualDisc) : f.iskonto;

  const orderRows = firmaOrders.length ? firmaOrders.map(o=>`
    <tr>
      <td>${o.no}</td>
      <td>${trDate(o.tarih)}</td>
      <td>${o.items.length}</td>
      <td class="money">${money(o.total)}</td>
      <td>${o.durum}</td>
      <td>${o.kargoDurum && o.kargoDurum !== "Yok" ? o.kargoDurum : "-"}</td>
    </tr>
  `).join("") : `<tr><td colspan="5" class="muted">Bu firmaya ait sipariş yok</td></tr>`;

  const paymentRows = firmaPayments.length ? firmaPayments.map(p=>`
    <tr>
      <td>${trDate(p.tarih)}</td>
      <td class="money">${money(p.tutar)}</td>
      <td>${p.tip}</td>
      <td>${p.aciklama||""}</td>
    </tr>
  `).join("") : `<tr><td colspan="4" class="muted">Bu firmaya ait tahsilat yok</td></tr>`;

  const moveRows = getMoves().filter(m=>m.firma===f.ad).map(m=>`
    <tr>
      <td>${trDate(m.tarih)}</td>
      <td>${badge(m.tip)}</td>
      <td class="money">${money(m.tutar)}</td>
      <td>${m.aciklama||""}</td>
    </tr>
  `).join("") || `<tr><td colspan="4" class="muted">Bu firmaya ait hareket yok</td></tr>`;

  firmaDetailContent.innerHTML = `
    <div class="cards">
      <div class="card"><div class="stat-label">Toplam Satış</div><div class="stat-value green">${money(totalSales)}</div></div>
      <div class="card"><div class="stat-label">Toplam Tahsilat</div><div class="stat-value blue">${money(totalPayments)}</div></div>
      <div class="card"><div class="stat-label">${firmaBalanceLabel(f.ad)}</div><div class="stat-value ${firmaBalanceDetailClass(f.ad)}">${money(Math.abs(openBalance))}</div></div>
      <div class="card"><div class="stat-label">Vade</div><div class="stat-value">${f.vade||0} Gün</div></div>
      <div class="card"><div class="stat-label">İskonto</div><div class="stat-value">${iskontoText}</div></div>
      <div class="card"><div class="stat-label">Durum</div><div class="stat-value">${f.durum}</div></div>
    </div>

    <div class="grid-half">
      <div class="card">
        <div class="actions">
          <button class="btn primary" onclick="takePaymentFromFirma('${f.ad}')">Bu Cariden Ödeme Al</button>
          <button class="btn" onclick="openCustomerStatement('${escapeJsText(f.ad)}')">Müşteri Ekstresi</button>
          <button class="btn whatsapp-btn" onclick="openPaymentReminderWhatsapp('${escapeJsText(f.ad)}')">WhatsApp Hatırlat</button>
        </div>
        <h2>${f.ad}</h2>
        <p><b>Firma Kodu:</b> ${f.kod}</p>
        <p><b>Firma Türü:</b> ${f.tur||""}</p>
        <p><b>Şehir / İlçe:</b> ${f.sehir||""} ${f.ilce ? "/ " + f.ilce : ""}</p>
        <p><b>Yetkili:</b> ${f.yetkili||""}</p>
        <p><b>Telefon:</b> ${f.tel||""}</p>
        <p><b>E-posta:</b> ${f.mail||""}</p>
        <p><b>Vergi No / TCKN:</b> ${f.vergi||""}</p>
        <p><b>Vergi Dairesi:</b> ${f.vd||""}</p>
      </div>
      <div class="card">
        <h2>Adres Bilgileri</h2>
        <p><b>Adres:</b><br>${f.adres||""}</p>
        <p><b>Teslimat / Sevkiyat Adresi:</b><br>${f.sevk||""}</p>
        <p><b>Notlar:</b><br>${f.not||""}</p>
      </div>
    </div>

    <div class="card">
      <div class="section-head"><h2>Firma Siparişleri</h2></div>
      <div class="table-wrap"><table><thead><tr><th>No</th><th>Tarih</th><th>Ürün Sayısı</th><th>Genel Toplam</th><th>Durum</th><th>Kargo</th></tr></thead><tbody>${orderRows}</tbody></table></div>
    </div>
    <br>
    <div class="card">
      <div class="section-head"><h2>Firma Tahsilatları</h2></div>
      <div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Tutar</th><th>Tip</th><th>Açıklama</th></tr></thead><tbody>${paymentRows}</tbody></table></div>
    </div>
    <br>
    <div class="card">
      <div class="section-head"><h2>Firma Hareketleri</h2></div>
      <div class="table-wrap"><table><thead><tr><th>Tarih</th><th>İşlem</th><th>Tutar</th><th>Açıklama</th></tr></thead><tbody>${moveRows}</tbody></table></div>
    </div>
  `;

  firmaDetailCard.classList.remove("hide");
  firmaDetailCard.scrollIntoView({behavior:"smooth", block:"start"});
  if(typeof populateCitySelect==="function") populateCitySelect("f_sehir","f_ilce",f.sehir||"",f.ilce||"");
}
function closeFirmaDetail(){
  firmaDetailCard.classList.add("hide");
  firmaDetailContent.innerHTML = "";
}

function delFirma(kod){if(confirm("Firma silinsin mi?")){state.firmalar=state.firmalar.filter(x=>x.kod!==kod);closeFirmaDetail();saveState();renderAll();}}


function categoryByName(name){
  return (state.kategoriler||[]).find(k=>String(k.ad||"")===String(name||"")) || null;
}

function isCategoryActive(name){
  const k = categoryByName(name);
  return !k || k.durum === "Aktif";
}

function isProductActiveForUse(product){
  return !!product && product.durum === "Aktif" && isCategoryActive(product.kat);
}

function effectiveProductStatus(product){
  if(!product) return "";
  if(product.durum !== "Aktif") return product.durum || "Pasif";
  return isCategoryActive(product.kat) ? "Aktif" : "Kategori Pasif";
}

function applyCategoryPassiveToProducts(categoryName){
  let count = 0;
  (state.urunler||[]).forEach(u=>{
    if(String(u.kat||"") === String(categoryName||"") && u.durum !== "Pasif"){
      u.durum = "Pasif";
      count++;
    }
  });
  return count;
}

function applyCategoryActiveToProducts(categoryName){
  let count = 0;
  (state.urunler||[]).forEach(u=>{
    if(String(u.kat||"") === String(categoryName||"") && u.durum !== "Aktif"){
      u.durum = "Aktif";
      count++;
    }
  });
  return count;
}

function saveKategori(){
  const kod=k_kod.value.trim(), ad=k_ad.value.trim();
  if(!kod||!ad) return alert("Kategori kodu ve adı zorunlu.");

  const oldCat = state.kategoriler.find(x=>x.kod===kod) || null;
  const eskiAd = oldCat ? oldCat.ad : "";
  const oldDurum = oldCat ? oldCat.durum : "";
  const obj={kod,ad,sira:parseInt(k_sira.value)||1,durum:k_durum.value,renk:k_renk.value,not:k_not.value};

  const i=state.kategoriler.findIndex(x=>x.kod===kod);
  if(i>=0) state.kategoriler[i]=obj; else state.kategoriler.push(obj);

  // Kategori adı değişirse ürünlerdeki kategori bağlantısını da güncelle
  if(eskiAd && eskiAd !== ad){
    state.urunler.forEach(u=>{
      if(u.kat === eskiAd) u.kat = ad;
    });
  }

  let passiveCount = 0;
  let activeCount = 0;
  if(obj.durum === "Pasif"){
    passiveCount = applyCategoryPassiveToProducts(ad);
  }else if(obj.durum === "Aktif"){
    activeCount = applyCategoryActiveToProducts(ad);
  }

  saveState();
  clearKategoriForm();
  renderAll();

  if(obj.durum === "Pasif" && passiveCount > 0){
    alert(`${ad} kategorisi pasife alındı. Bu kategoriye bağlı ${passiveCount} ürün de pasife alındı.`);
  }else if(oldDurum === "Pasif" && obj.durum === "Aktif"){
    alert(`${ad} kategorisi aktife alındı. Bu kategoriye bağlı ${activeCount} ürün de aktife alındı.`);
  }
}
function clearKategoriForm(){
  k_kod.value="";
  k_ad.value="";
  k_sira.value=1;
  k_durum.value="Aktif";
  k_renk.value="";
  k_not.value="";
}
function editKategori(kod){
  const k = state.kategoriler.find(x=>x.kod===kod);
  if(!k) return;
  k_kod.value = k.kod;
  k_ad.value = k.ad;
  k_sira.value = k.sira || 1;
  k_durum.value = k.durum || "Aktif";
  k_renk.value = k.renk || "";
  k_not.value = k.not || "";
  k_kod.scrollIntoView({behavior:"smooth", block:"center"});
}
function renderKategoriler(){
  const q = (document.getElementById("kf_search")?.value || "").toLowerCase();
  const status = document.getElementById("kf_status")?.value || "Aktif";
  katList.innerHTML = state.kategoriler
    .filter(k=>{
      const hay = String((k.kod||"")+(k.ad||"")+(k.renk||"")).toLowerCase();
      if(q && !hay.includes(q)) return false;
      if(status && k.durum !== status) return false;
      return true;
    })
    .sort((a,b)=>(a.sira||0)-(b.sira||0))
    .map(k=>`<tr><td>${k.kod}</td><td>${k.ad}</td><td>${k.sira}</td><td>${k.durum}</td><td>${k.renk||""}</td><td><div class="table-actions"><button class="btn" onclick="editKategori('${k.kod}')">Düzenle</button> <button class="btn danger" onclick="delKategori('${k.kod}')">Sil</button></div></td></tr>`).join("") || `<tr><td colspan="6" class="muted">Kayıt bulunamadı</td></tr>`;
}
function clearKategoriFilters(){
  if(document.getElementById("kf_search")) kf_search.value="";
  if(document.getElementById("kf_status")) kf_status.value="Aktif";
  renderKategoriler();
}
function delKategori(kod){if(confirm("Kategori silinsin mi?")){state.kategoriler=state.kategoriler.filter(x=>x.kod!==kod);saveState();renderAll();}}


function productEditIdentity(product){
  if(!product) return "";
  return String(product.uid || product.kod || "");
}


let pendingProductImage = null;
let catalogSelected = {};

function loadProductImageFile(input){
  const file = input && input.files && input.files[0];
  if(!file) return;
  if(!file.type.startsWith("image/")) return alert("Lütfen bir resim dosyası seçin.");
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      const max = 900, scale = Math.min(1, max/Math.max(img.width,img.height));
      const c=document.createElement("canvas"); c.width=Math.max(1,Math.round(img.width*scale)); c.height=Math.max(1,Math.round(img.height*scale));
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      pendingProductImage=c.toDataURL("image/jpeg",0.78);
      if(document.getElementById("u_resim_info")) u_resim_info.textContent="Resim hazır (sıkıştırıldı)";
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}
function clearProductImage(){ pendingProductImage=""; if(document.getElementById("u_resim")) u_resim.value=""; if(document.getElementById("u_resim_info")) u_resim_info.textContent="Resim kaldırılacak"; }
function updateCatalogCalculatedPrices(){
  const birim=document.getElementById("u_birim")?.value||"Adet";
  const koliPaket=Math.max(1,parseInt(document.getElementById("u_koli_paket")?.value)||1);
  const paketAdet=Math.max(1,parseInt(document.getElementById("u_paket_adet")?.value)||1);
  const multi=birim==="Koli"||birim==="Paket";
  const koliWrap=document.getElementById("u_koli_paket_wrap"), paketWrap=document.getElementById("u_paket_adet_wrap");
  if(koliWrap) koliWrap.style.display=birim==="Koli"?"":"none";
  if(paketWrap) paketWrap.style.display=multi?"":"none";
  const legacy=document.getElementById("u_koli");
  if(legacy){legacy.parentElement.style.display=multi?"none":""; if(multi) legacy.value=birim==="Koli"?koliPaket*paketAdet:paketAdet;}
  const count=multi?(birim==="Koli"?koliPaket*paketAdet:paketAdet):(Number(legacy?.value)||0);
  const price=Number(document.getElementById("u_fiyat")?.value)||0;
  const kg=Number(document.getElementById("u_kg")?.value)||0;
  const unit=document.getElementById("u_adet_fiyat"), weight=document.getElementById("u_kg_fiyat");
  if(unit) unit.value=count>0?(price/count).toFixed(2):"0";
  if(weight) weight.value=kg>0?(price/kg).toFixed(2):"0";
  const cp=Number(document.getElementById("u_koli_fiyat")?.value)||0;
  const pp=Number(document.getElementById("u_paket_fiyat")?.value)||0;
  const ck=Number(document.getElementById("u_koli_kg")?.value)||0;
  const pk=Number(document.getElementById("u_paket_kg")?.value)||0;
  document.getElementById("u_koli_kg_fiyat").value=ck>0?(cp/ck).toFixed(2):"0";
  document.getElementById("u_paket_kg_fiyat").value=pk>0?(pp/pk).toFixed(2):"0";
  if(multi){
    if(unit)unit.value=(birim==="Koli"?(pp>0?pp/paketAdet:cp/count):pp/paketAdet).toFixed(2);
    if(weight)weight.value=(birim==="Koli"?(ck>0?cp/ck:0):(pk>0?pp/pk:0)).toFixed(2);
  }
  const summary=document.getElementById("u_birim_ozet_wrap");
  if(summary) summary.textContent=birim==="Koli"?`1 koli = ${koliPaket} paket × ${paketAdet} adet = ${count} adet. Liste fiyatı 1 koli içindir.`:birim==="Paket"?`1 paket = ${paketAdet} adet. Liste fiyatı 1 paket içindir.`:`Liste fiyatı seçilen ${birim.toLocaleLowerCase('tr-TR')} birimi içindir; adet fiyatı birim içi adede göre hesaplanır.`;
}
["u_fiyat","u_koli","u_kg","u_koli_paket","u_paket_adet","u_koli_fiyat","u_paket_fiyat","u_koli_kg","u_paket_kg"].forEach(id=>document.getElementById(id)?.addEventListener("input",updateCatalogCalculatedPrices));
document.getElementById("u_birim")?.addEventListener("change",updateCatalogCalculatedPrices);
function catalogBasePrice(u){ return Number(u.fiyat)||Number(u.adetFiyat)||Number(u.kgFiyat)||0; }
function catalogFirmaDiscount(){
  const firma=(state.firmalar||[]).find(f=>String(f.kod)===String(document.getElementById("cat_firma")?.value||""));
  return firma ? String(firma.iskonto||firma.indirim||"0") : "0";
}
function renderCatalogBuilder(){
  const fs=document.getElementById("cat_firma"), ks=document.getElementById("cat_kat"); if(!fs||!ks) return;
  const fv=fs.value, kv=ks.value;
  fs.innerHTML='<option value="">Firma seçmeden devam et</option>'+(state.firmalar||[]).filter(f=>f.durum!=="Pasif").map(f=>`<option value="${htmlEscape(f.kod||"")}">${htmlEscape(f.ad||f.kod||"")}</option>`).join(""); fs.value=fv;
  const cats=[...new Set((state.urunler||[]).map(u=>u.kat).filter(Boolean))]; ks.innerHTML='<option value="">Tüm Kategoriler</option>'+cats.map(k=>`<option>${htmlEscape(k)}</option>`).join(""); ks.value=kv;
  renderCatalogProducts();
}
function renderCatalogProducts(){
  const body=document.getElementById("catalogProductList"); if(!body) return;
  const rows=catalogVisibleProducts();
  body.innerHTML=rows.map(u=>{ const key=String(u.uid||u.kod), sel=catalogSelected[key], price=sel?sel.price:catalogBasePrice(u), discount=sel?String(sel.discount??catalogFirmaDiscount()):catalogFirmaDiscount(), noDisc=sel?sel.noDisc:!!u.noDisc; return `<tr><td><input type="checkbox" ${sel?'checked':''} onchange="toggleCatalogProduct('${key.replace(/'/g,"\\'")}',this.checked)"></td><td>${u.image?`<img src="${u.image}" style="width:58px;height:58px;object-fit:contain;border-radius:8px">`:'<span class="muted">Resim yok</span>'}</td><td>${htmlEscape(u.kod||"")}</td><td>${htmlEscape(u.ad||"")}</td><td>${htmlEscape(u.kat||"")}</td><td><input type="number" min="0" step="0.01" value="${price}" style="width:105px" onchange="setCatalogPrice('${key.replace(/'/g,"\\'")}',this.value)"></td><td><input type="text" value="${htmlEscape(discount)}" placeholder="15+5" style="width:80px" ${noDisc?'disabled':''} onchange="setCatalogDiscount('${key.replace(/'/g,"\\'")}',this.value)"></td><td><input type="checkbox" ${noDisc?'checked':''} onchange="setCatalogNoDisc('${key.replace(/'/g,"\\'")}',this.checked)"></td></tr>`; }).join("")||'<tr><td colspan="8" class="muted">Ürün bulunamadı</td></tr>';
}
