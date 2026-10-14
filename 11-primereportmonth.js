function primeReportMonth(){
  ensurePrimeDefaults();
  const m = Number(document.getElementById("rp_prim_month")?.value || Number(todayISO().slice(5,7)));
  return Number.isFinite(m) && m >= 1 && m <= 12 ? m : Number(todayISO().slice(5,7));
}

function primeReportMonthName(){
  const idx = primeReportMonth() - 1;
  return PRIME_MONTHS[idx] || "";
}

function primeReportPeriodText(){
  return `${primeReportMonthName()} ${primeReportYear()}`;
}

function primeRateValue(id){
  const el = document.getElementById(id);
  const n = Number(el ? el.value : 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function primeReportYear(){
  ensurePrimeDefaults();
  const y = Number(document.getElementById("rp_prim_year")?.value || todayISO().slice(0,4));
  return Number.isFinite(y) ? y : Number(todayISO().slice(0,4));
}

function primeSourcePayments(){
  const raw = typeof getPaymentRows === "function" ? getPaymentRows() : (state.payments||[]);
  const seen = new Map();
  raw.forEach(p=>{
    const key = [p.tarih||"", p.firma||"", Number(p.tutar)||0].join("|");
    if(!seen.has(key) || !p.__move){
      seen.set(key, p);
    }
  });
  return Array.from(seen.values());
}

function calcPrimeReportRows(){
  ensurePrimeDefaults();
  const f = reportFilters();
  const year = primeReportYear();
  const month = primeReportMonth();
  const monthName = primeReportMonthName();
  const salesRate = primeRateValue("rp_sales_rate");
  const paymentRate = primeRateValue("rp_payment_rate");
  const mm = String(month).padStart(2,"0");
  const prefix = `${year}-${mm}`;

  // Prim raporunda üstteki Başlangıç/Bitiş tarihleri seçilmişse onları kullan.
  // Tarih seçilmemişse Prim Yılı + Prim Ayı alanlarına göre aylık hesapla.
  const hasDateRange = !!(f.start || f.end);
  const primeDateMatch = (value)=>{
    const d = String(value || "").slice(0,10);
    if(!d) return false;
    if(hasDateRange){
      if(f.start && d < f.start) return false;
      if(f.end && d > f.end) return false;
      return true;
    }
    return d.startsWith(prefix);
  };
  const periodText = hasDateRange
    ? `${f.start || "Başlangıç"} / ${f.end || "Bitiş"}`
    : `${monthName} ${year}`;

  const sales = (state.orders||[])
    .filter(o=>!["Taslak","İptal"].includes(o.durum))
    .filter(o=>primeDateMatch(o.tarih))
    .filter(o=>!f.firma || o.firma===f.firma)
    .reduce((sum,o)=>sum + (Number(o.total)||0),0);

  const payments = primeSourcePayments()
    .filter(p=>primeDateMatch(p.tarih))
    .filter(p=>!f.firma || p.firma===f.firma)
    .reduce((sum,p)=>sum + (Number(p.tutar)||0),0);

  const salesPrime = sales * salesRate / 100;
  const paymentPrime = payments * paymentRate / 100;

  return [{
    "Dönem": periodText,
    "Ay": month,
    "Satış Tutarı": sales,
    "Satış Prim %": salesRate,
    "Satış Primi": salesPrime,
    "Tahsilat Tutarı": payments,
    "Tahsilat Prim %": paymentRate,
    "Tahsilat Primi": paymentPrime,
    "Toplam Prim": salesPrime + paymentPrime
  }];
}

function calcPrimeTotals(rows){
  rows = rows || calcPrimeReportRows();
  return rows.reduce((acc,r)=>{
    acc.sales += Number(r["Satış Tutarı"])||0;
    acc.payments += Number(r["Tahsilat Tutarı"])||0;
    acc.salesPrime += Number(r["Satış Primi"])||0;
    acc.paymentPrime += Number(r["Tahsilat Primi"])||0;
    acc.totalPrime += Number(r["Toplam Prim"])||0;
    return acc;
  }, {sales:0, payments:0, salesPrime:0, paymentPrime:0, totalPrime:0});
}

function renderPrimeSummary(){
  if(!document.getElementById("rp_prime_total")) return;
  ensurePrimeDefaults();
  const rows = calcPrimeReportRows();
  const totals = calcPrimeTotals(rows);
  if(document.getElementById("rp_prime_sales")) rp_prime_sales.textContent = money(totals.salesPrime);
  if(document.getElementById("rp_prime_payment")) rp_prime_payment.textContent = money(totals.paymentPrime);
  if(document.getElementById("rp_prime_total")) rp_prime_total.textContent = money(totals.totalPrime);
}

function primeReportRowsWithAnnualTotal(){
  return calcPrimeReportRows();
}

function salesChartOrders(){
  const f = reportFilters();
  return (state.orders||[]).filter(o=>{
    if(["Taslak","İptal"].includes(o.durum)) return false;
    if(f.firma && o.firma !== f.firma) return false;
    return /^\d{4}-\d{2}-\d{2}/.test(String(o.tarih||""));
  });
}

function salesChartCompactMoney(v){
  const n = Number(v)||0;
  if(Math.abs(n)>=1000000) return (n/1000000).toLocaleString("tr-TR",{maximumFractionDigits:1})+" Mn ₺";
  if(Math.abs(n)>=1000) return (n/1000).toLocaleString("tr-TR",{maximumFractionDigits:0})+" B ₺";
  return n.toLocaleString("tr-TR",{maximumFractionDigits:0})+" ₺";
}

function salesBarChartHtml(items){
  const max = Math.max(1, ...items.map(x=>Number(x.value)||0));
  return `<div style="height:260px;display:flex;align-items:flex-end;gap:7px;padding:18px 8px 4px;border:1px solid var(--border);border-radius:12px;background:linear-gradient(to bottom,#fff,#fafafa)">
    ${items.map(x=>{
      const v=Number(x.value)||0;
      const h=v>0?Math.max(5,(v/max)*190):2;
      return `<div title="${htmlEscape(x.label)}: ${htmlEscape(money(v))}" style="flex:1;min-width:0;height:230px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px">
        <div style="font-size:10px;font-weight:700;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis">${v?salesChartCompactMoney(v):""}</div>
        <div style="width:72%;max-width:42px;min-width:8px;height:${h}px;border-radius:7px 7px 2px 2px;background:linear-gradient(180deg,#2563eb,#60a5fa)"></div>
        <div style="font-size:11px;font-weight:700;white-space:nowrap">${htmlEscape(x.label)}</div>
      </div>`;
    }).join("")}
  </div>`;
}

function renderSalesCharts(){
  const monthBox=document.getElementById("monthly_sales_chart");
  const yearBox=document.getElementById("yearly_sales_chart");
  const yearSel=document.getElementById("sales_chart_year");
  if(!monthBox || !yearBox || !yearSel) return;

  const orders=salesChartOrders();
  const currentYear=String(new Date().getFullYear());
  const years=[...new Set(orders.map(o=>String(o.tarih||"").slice(0,4)).filter(y=>/^\d{4}$/.test(y)))].sort((a,b)=>Number(b)-Number(a));
  if(!years.includes(currentYear)) years.unshift(currentYear);
  const oldSelected=yearSel.value;
  yearSel.innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join("");
  yearSel.value=years.includes(oldSelected)?oldSelected:(years[0]||currentYear);

  const selectedYear=yearSel.value;
  const monthNames=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  const monthly=monthNames.map((label,i)=>({
    label,
    value:orders.filter(o=>String(o.tarih||"").slice(0,7)===`${selectedYear}-${String(i+1).padStart(2,"0")}`).reduce((a,o)=>a+(Number(o.total)||0),0)
  }));
  monthBox.innerHTML=salesBarChartHtml(monthly);
  const monthTotal=monthly.reduce((a,x)=>a+x.value,0);
  const mt=document.getElementById("monthly_sales_chart_total");
  if(mt) mt.textContent=`${selectedYear} toplamı: ${money(monthTotal)}`;

  const yearlyAsc=[...years].sort((a,b)=>Number(a)-Number(b));
  const yearly=yearlyAsc.map(y=>({
    label:y,
    value:orders.filter(o=>String(o.tarih||"").slice(0,4)===y).reduce((a,o)=>a+(Number(o.total)||0),0)
  }));
  yearBox.innerHTML=salesBarChartHtml(yearly);
  const yt=document.getElementById("yearly_sales_chart_total");
  if(yt) yt.textContent=`Toplam: ${money(yearly.reduce((a,x)=>a+x.value,0))}`;
}


function orderPaymentStatusHtml(order){
  if(!order || ["Taslak","İptal"].includes(order.durum)) return '<span class="badge">-</span>';
  const key=paymentOrderKey(order);
  const row=getFirmInvoiceBalances(order.firma).find(x=>x.key===key);
  if(!row) return '<span class="badge">Ödenmedi</span>';
  if(row.remaining<=0.009) return '<span class="badge b-green">Ödendi</span>';
  if(row.paid>0.009) return '<span class="badge b-orange">Kısmi · '+money(row.remaining)+' kaldı</span>';
  return '<span class="badge b-red">Ödenmedi · '+money(row.remaining)+'</span>';
}

function lastCustomerProductPriceHtml(firma, product){
  if(!firma || !product) return '<span class="muted">-</span>';
  const orders=(state.orders||[]).filter(o=>o.firma===firma && !["Taslak","İptal"].includes(o.durum)).slice().sort((a,b)=>String(b.tarih||"").localeCompare(String(a.tarih||"")));
  for(const o of orders){
    const it=(o.items||[]).find(x=>(product.kod && x.kod===product.kod) || (!product.kod && x.ad===product.ad));
    if(it){
      const unit=Number(it.fiyat ?? it.unitPrice ?? 0);
      const disc=Number(it.disc||0);
      return '<div><b>'+money(unit)+'</b></div><small class="muted">'+trDate(o.tarih)+(disc>0?' · İsk. '+money(disc):'')+'</small>';
    }
  }
  return '<span class="muted">İlk satış</span>';
}

function openCustomerStatement(firma){
  const f=(state.firmalar||[]).find(x=>x.ad===firma)||{};
  const moves=[];
  (state.orders||[]).filter(o=>o.firma===firma && !["Taslak","İptal"].includes(o.durum)).forEach(o=>moves.push({date:o.tarih,type:'Satış',no:o.no||'',debit:Number(o.total||0),credit:0}));
  (state.payments||[]).filter(p=>p.firma===firma).forEach(p=>moves.push({date:p.tarih,type:'Tahsilat',no:p.orderNo||'',debit:0,credit:Number(p.tutar||0)}));
  moves.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')) || (a.type==='Satış'?-1:1));
  let bal=0;
  const rows=moves.map(m=>{bal+=m.debit-m.credit;return `<tr><td>${trDate(m.date)}</td><td>${m.type}</td><td>${htmlEscape(m.no)}</td><td>${m.debit?money(m.debit):'-'}</td><td>${m.credit?money(m.credit):'-'}</td><td><b>${money(bal)}</b></td></tr>`}).join('');
  const w=window.open('','_blank'); if(!w) return alert('Tarayıcı açılır pencereyi engelledi.');
  w.document.write(`<html><head><meta charset="utf-8"><title>${htmlEscape(firma)} Ekstre</title><style>body{font-family:Arial;padding:24px;color:#222}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#eee}.sum{margin:16px 0;font-size:18px}</style></head><body><h1>Müşteri Ekstresi</h1><h2>${htmlEscape(firma)}</h2><p>${htmlEscape(f.tel||'')} ${htmlEscape(f.sehir||'')}</p><div class="sum"><b>Güncel Bakiye: ${money(firmaOpenBalance(firma))}</b></div><table><thead><tr><th>Tarih</th><th>İşlem</th><th>Fatura/Sipariş</th><th>Borç</th><th>Tahsilat</th><th>Bakiye</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Hareket yok</td></tr>'}</tbody></table><script>setTimeout(()=>window.print(),300)<\/script></body></html>`); w.document.close();
}

function openPaymentReminderWhatsapp(firma){
  const f=(state.firmalar||[]).find(x=>x.ad===firma)||{};
  let phone=normalizeWhatsAppPhone(f.tel||'');
  if(!phone){ phone=normalizeWhatsAppPhone(prompt('WhatsApp numarasını yazın:','')||''); }
  if(!phone) return;
  const balance=Math.max(0,Number(firmaOpenBalance(firma)||0));
  const overdue=getFirmInvoiceBalances(firma).filter(x=>x.remaining>0.009 && orderDueDate(x.order) && orderDueDate(x.order)<=todayISO());
  const overdueTotal=overdue.reduce((s,x)=>s+x.remaining,0);
  const msg=`Merhaba ${firma}, cari hesabınızda ${money(balance)} açık bakiye bulunmaktadır.${overdueTotal>0?' Vadesi geçmiş tutar: '+money(overdueTotal)+'.':''} Ödeme durumunuzla ilgili bilgi rica ederiz. Teşekkür ederiz.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');
}

function toggleAllPaymentReminderRows(checked){
  document.querySelectorAll('.payment-reminder-check').forEach(cb=>cb.checked=!!checked);
}

function openSelectedPaymentRemindersWhatsapp(){
  const selected=[...document.querySelectorAll('.payment-reminder-check:checked')].map(cb=>cb.dataset.firma).filter(Boolean);
  const firms=[...new Set(selected)];
  if(!firms.length) return alert('Lütfen WhatsApp hatırlatması gönderilecek en az bir cari seçin.');
  let opened=0, missing=[];
  firms.forEach(firma=>{
    const f=(state.firmalar||[]).find(x=>x.ad===firma)||{};
    const phone=normalizeWhatsAppPhone(f.tel||'');
    if(!phone){ missing.push(firma); return; }
    const balance=Math.max(0,Number(firmaOpenBalance(firma)||0));
    const overdue=getFirmInvoiceBalances(firma).filter(x=>x.remaining>0.009 && orderDueDate(x.order) && orderDueDate(x.order)<=todayISO());
    const overdueTotal=overdue.reduce((sum,x)=>sum+x.remaining,0);
    const msg=`Merhaba ${firma}, cari hesabınızda ${money(balance)} açık bakiye bulunmaktadır.${overdueTotal>0?' Vadesi geçmiş tutar: '+money(overdueTotal)+'.':''} Ödeme durumunuzla ilgili bilgi rica ederiz. Teşekkür ederiz.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');
    opened++;
  });
  if(missing.length) alert('Telefon numarası olmayan cariler açılmadı: '+missing.join(', '));
  else if(opened>1) setTimeout(()=>alert(opened+' cari için WhatsApp ekranı açıldı. Tarayıcı açılır pencereleri engellerse bu site için pop-up izni verin.'),100);
}

function renderPaymentReminderCollections(){
  const box=document.getElementById('paymentReminderCollections');
  if(!box) return;
  const today=todayISO();
  const td=new Date(today+'T00:00:00');
  const rows=[];
  (state.firmalar||[]).forEach(f=>{
    getFirmInvoiceBalances(f.ad).filter(x=>x.remaining>0.009).forEach(x=>{
      const due=orderDueDate(x.order);
      if(!due) return;
      const days=Math.floor((td-new Date(due+'T00:00:00'))/86400000);
      if(days>=0) rows.push({firma:f.ad,no:x.key,due,days,remaining:x.remaining});
    });
  });
  rows.sort((a,b)=>b.days-a.days || String(a.firma).localeCompare(String(b.firma),'tr'));
  box.innerHTML='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px"><button class="btn" onclick="toggleAllPaymentReminderRows(true)">Tümünü Seç</button><button class="btn" onclick="toggleAllPaymentReminderRows(false)">Seçimi Kaldır</button><button class="btn whatsapp-btn" onclick="openSelectedPaymentRemindersWhatsapp()">Seçilenlere WhatsApp Gönder</button><span class="muted">Her cari için ayrı WhatsApp mesajı açılır.</span></div><div class="table-wrap"><table><thead><tr><th style="width:42px"><input type="checkbox" onchange="toggleAllPaymentReminderRows(this.checked)" title="Tümünü seç"></th><th>Firma</th><th>Fatura</th><th>Vade</th><th>Gecikme</th><th>Kalan</th><th>İşlem</th></tr></thead><tbody>'+rows.map(x=>`<tr><td><input type="checkbox" class="payment-reminder-check" data-firma="${htmlEscape(x.firma)}"></td><td><b>${htmlEscape(x.firma)}</b></td><td>${htmlEscape(x.no)}</td><td>${trDate(x.due)}</td><td>${x.days===0?'Bugün':x.days+' gün'}</td><td class="money"><b>${money(x.remaining)}</b></td><td><button class="btn whatsapp-btn" onclick="openPaymentReminderWhatsapp('${escapeJsText(x.firma)}')">WhatsApp</button></td></tr>`).join('')+(rows.length?'':'<tr><td colspan="7" class="muted">Vadesi bugün gelen veya geçmiş açık fatura yok.</td></tr>')+'</tbody></table></div>';
}

function renderManagementReports(){
  const aging=document.getElementById('agingReport'), customers=document.getElementById('customerSalesAnalysis'), reminders=document.getElementById('paymentReminderReport');
  if(!aging||!customers||!reminders) return;
  const today=todayISO(); const td=new Date(today+'T00:00:00');
  const buckets=[{n:'Vadesi Geçmedi',v:0},{n:'1–30 Gün',v:0},{n:'31–60 Gün',v:0},{n:'61–90 Gün',v:0},{n:'90+ Gün',v:0}];
  const reminderRows=[];
  (state.firmalar||[]).forEach(f=>{
    getFirmInvoiceBalances(f.ad).filter(x=>x.remaining>0.009).forEach(x=>{
      const due=orderDueDate(x.order); let days=0;
      if(due){ days=Math.floor((td-new Date(due+'T00:00:00'))/86400000); }
      if(!due || days<1) buckets[0].v+=x.remaining; else if(days<=30)buckets[1].v+=x.remaining; else if(days<=60)buckets[2].v+=x.remaining; else if(days<=90)buckets[3].v+=x.remaining; else buckets[4].v+=x.remaining;
      if(due && days>=0) reminderRows.push({firma:f.ad,no:x.key,due,days,remaining:x.remaining});
    });
  });
  aging.innerHTML='<div class="table-wrap"><table><thead><tr><th>Dönem</th><th>Tutar</th></tr></thead><tbody>'+buckets.map(b=>`<tr><td>${b.n}</td><td class="money"><b>${money(b.v)}</b></td></tr>`).join('')+'</tbody></table></div>';
  const stats=(state.firmalar||[]).map(f=>{const os=(state.orders||[]).filter(o=>o.firma===f.ad && !["Taslak","İptal"].includes(o.durum));return {firma:f.ad,sales:os.reduce((s,o)=>s+Number(o.total||0),0),last:os.map(o=>o.tarih).sort().pop()||'',pay:(state.payments||[]).filter(p=>p.firma===f.ad).reduce((s,p)=>s+Number(p.tutar||0),0),bal:firmaOpenBalance(f.ad)}}).filter(x=>x.sales||x.pay).sort((a,b)=>b.sales-a.sales);
  customers.innerHTML='<div class="table-wrap"><table><thead><tr><th>Firma</th><th>Satış</th><th>Tahsilat</th><th>Bakiye</th><th>Son Sipariş</th></tr></thead><tbody>'+stats.map(x=>`<tr><td>${htmlEscape(x.firma)}</td><td class="money">${money(x.sales)}</td><td class="money">${money(x.pay)}</td><td class="money"><b>${money(x.bal)}</b></td><td>${x.last?trDate(x.last):'-'}</td></tr>`).join('')+'</tbody></table></div>';
  reminderRows.sort((a,b)=>b.days-a.days);
  reminders.innerHTML='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><button class="btn" onclick="toggleAllPaymentReminderRows(true)">Tümünü Seç</button><button class="btn" onclick="toggleAllPaymentReminderRows(false)">Seçimi Kaldır</button><button class="btn whatsapp-btn" onclick="openSelectedPaymentRemindersWhatsapp()">Seçilenlere WhatsApp</button><span class="muted">Her cari için ayrı WhatsApp mesajı açılır.</span></div><div class="table-wrap"><table><thead><tr><th style="width:42px"><input type="checkbox" onchange="toggleAllPaymentReminderRows(this.checked)" title="Tümünü seç"></th><th>Firma</th><th>Fatura</th><th>Vade</th><th>Gecikme</th><th>Kalan</th><th>İşlem</th></tr></thead><tbody>'+reminderRows.map(x=>`<tr><td><input type="checkbox" class="payment-reminder-check" data-firma="${htmlEscape(x.firma)}"></td><td>${htmlEscape(x.firma)}</td><td>${htmlEscape(x.no)}</td><td>${trDate(x.due)}</td><td>${x.days===0?'Bugün':x.days+' gün'}</td><td class="money"><b>${money(x.remaining)}</b></td><td><button class="btn whatsapp-btn" onclick="openPaymentReminderWhatsapp('${escapeJsText(x.firma)}')">WhatsApp</button></td></tr>`).join('')+(reminderRows.length?'':'<tr><td colspan="7" class="muted">Vadesi gelen/geçen açık fatura yok.</td></tr>')+'</tbody></table></div>';
}


function renderManagerSummary(){
  const box=document.getElementById('managerSummaryReport'); if(!box) return;
  const input=document.getElementById('manager_summary_month');
  if(input && !input.value) input.value=todayISO().slice(0,7);
  const ym=input?.value||todayISO().slice(0,7);
  const orders=(state.orders||[]).filter(o=>String(o.tarih||'').startsWith(ym)&&!['Taslak','İptal'].includes(o.durum));
  const pays=(state.payments||[]).filter(p=>String(p.tarih||'').startsWith(ym));
  const sales=orders.reduce((s,o)=>s+Number(o.total||0),0), pay=pays.reduce((s,p)=>s+Number(p.tutar||0),0);
  const cust={}; orders.forEach(o=>cust[o.firma]=(cust[o.firma]||0)+Number(o.total||0));
  const prods={}; orders.forEach(o=>(o.items||[]).forEach(it=>{const k=it.ad||it.kod;prods[k]=(prods[k]||0)+(Number(it.qty)||0);}));
  const topCust=Object.entries(cust).sort((a,b)=>b[1]-a[1]).slice(0,5), topProd=Object.entries(prods).sort((a,b)=>b[1]-a[1]).slice(0,5);
  box.innerHTML=`<div class="cards"><div class="card"><div class="stat-label">Aylık Satış</div><div class="stat-value green">${money(sales)}</div></div><div class="card"><div class="stat-label">Aylık Tahsilat</div><div class="stat-value blue">${money(pay)}</div></div><div class="card"><div class="stat-label">Ay Sonu Farkı</div><div class="stat-value orange">${money(sales-pay)}</div></div><div class="card"><div class="stat-label">Sipariş</div><div class="stat-value">${orders.length}</div></div></div><div class="grid-half" style="margin-top:12px"><div><h4>En Çok Satış Yapılan Müşteriler</h4>${topCust.map((x,i)=>`<div>${i+1}. ${htmlEscape(x[0])} — <b>${money(x[1])}</b></div>`).join('')||'<span class="muted">Kayıt yok</span>'}</div><div><h4>En Çok Satılan Ürünler</h4>${topProd.map((x,i)=>`<div>${i+1}. ${htmlEscape(x[0])} — <b>${x[1]}</b></div>`).join('')||'<span class="muted">Kayıt yok</span>'}</div></div>`;
}
function downloadManagementExcel(){
  if(typeof XLSX==='undefined') return alert('Excel kütüphanesi yüklenemedi. İnternet bağlantısını kontrol edip tekrar deneyin.');
  const wb=XLSX.utils.book_new();
  const add=(name,rows)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.length?rows:[{Bilgi:'Kayıt yok'}]),name.slice(0,31));
  add('Satışlar',(state.orders||[]).filter(o=>!['Taslak','İptal'].includes(o.durum)).map(o=>({Sipariş:o.no,Tarih:o.tarih,Firma:o.firma,Durum:o.durum,Tutar:Number(o.total)||0,Vade:o.vadeTarih||''})));
  add('Tahsilatlar',(state.payments||[]).map(p=>({Tarih:p.tarih,Firma:p.firma,Fatura:p.orderNo||'',Tür:p.tip||'',Tutar:Number(p.tutar)||0,Açıklama:p.aciklama||''})));
  const debts=[];(state.firmalar||[]).forEach(f=>getFirmInvoiceBalances(f.ad).filter(x=>x.remaining>0.009).forEach(x=>debts.push({Firma:f.ad,Fatura:x.key,Tarih:x.order.tarih||'',Vade:orderDueDate(x.order)||'',Toplam:x.total,Ödenen:x.paid,Kalan:x.remaining})));
  add('Açık Borçlar',debts); add('Vadesi Geçenler',debts.filter(x=>x.Vade&&x.Vade<=todayISO()));
  add('Ürünler',(state.urunler||[]).map(u=>({Kod:u.kod,Ürün:u.ad,Kategori:u.kat,Birim:u.birim,Fiyat:Number(u.fiyat)||0,Durum:u.durum})));
  add('Müşteriler',(state.firmalar||[]).map(f=>({Kod:f.kod,Firma:f.ad,Telefon:f.tel||'',Şehir:f.sehir||'',Vade:f.vade||0,Bakiye:firmaOpenBalance(f.ad),Durum:f.durum})));
  XLSX.writeFile(wb,'cari_takip_yonetim_raporu.xlsx');
}

function renderReports(){
  if(!document.getElementById("reportText")) return;
  ensurePrimeDefaults();

  const f = reportFilters();
  const rows = reportRows();
  const cleanRows = cleanReportRows(rows);

  const validOrders = state.orders.filter(o=>!["Taslak","İptal"].includes(o.durum) && inReportDate(o.tarih,f) && (!f.firma || o.firma===f.firma));
  const totalSales = validOrders.reduce((s,o)=>s+Number(o.total||0),0);
  const totalPay = state.payments.filter(p=>inReportDate(p.tarih,f) && (!f.firma || p.firma===f.firma)).reduce((s,p)=>s+Number(p.tutar||0),0);
  const sampleCount = state.samples.filter(s=>inReportDate(s.tarih,f) && (!f.firma || s.firma===f.firma)).length;
  const ps = salesPeriodStats();

  rp_total_sales.textContent = money(totalSales);
  rp_total_pay.textContent = money(totalPay);
  rp_open_balance.textContent = money(totalSales-totalPay);
  rp_order_count.textContent = validOrders.length;
  rp_sample_count.textContent = sampleCount;
  rp_row_count.textContent = cleanRows.length;

  const firmaText = f.firma ? f.firma : "Tüm firmalar";
  const dateText = (f.start || f.end) ? `${f.start || "başlangıç"} / ${f.end || "bitiş"}` : "Tüm tarihler";
  rp_filter_text.textContent = `${firmaText} — ${dateText}`;

  reportText.innerHTML = `
    <p><b>Rapor Türü:</b> ${reportTitle()}</p>
    <p><b>Firma Filtresi:</b> ${firmaText}</p>
    <p><b>Tarih Aralığı:</b> ${dateText}</p>
    <p><b>Toplam Satış / Alacak:</b> ${money(totalSales)}</p>
    <p><b>Toplam Tahsilat:</b> ${money(totalPay)}</p>
    <p><b>Açık Bakiye:</b> ${money(totalSales-totalPay)}</p>
    <p><b>Bugünkü Satış:</b> ${money(ps.dailySales)}</p>
    <p><b>Bu Ay Satış:</b> ${money(ps.monthlySales)}</p>
  `;

  if(f.type === "prim"){
    const primeRows = calcPrimeReportRows();
    const primeTotals = calcPrimeTotals(primeRows);
    reportText.innerHTML = `
      <p><b>Rapor Türü:</b> Prim Hesaplama</p>
      <p><b>Firma Filtresi:</b> ${firmaText}</p>
      <p><b>Prim Dönemi:</b> ${(f.start || f.end) ? `${f.start || "Başlangıç"} / ${f.end || "Bitiş"}` : primeReportPeriodText()}</p>
      <p><b>Satış Prim Oranı:</b> %${primeRateValue("rp_sales_rate")}</p>
      <p><b>Tahsilat Prim Oranı:</b> %${primeRateValue("rp_payment_rate")}</p>
      <p><b>Aylık Satış:</b> ${money(primeTotals.sales)}</p>
      <p><b>Aylık Tahsilat:</b> ${money(primeTotals.payments)}</p>
      <p><b>Aylık Satış Primi:</b> ${money(primeTotals.salesPrime)}</p>
      <p><b>Aylık Tahsilat Primi:</b> ${money(primeTotals.paymentPrime)}</p>
      <p><b>Toplam Aylık Prim:</b> ${money(primeTotals.totalPrime)}</p>
    `;
  }

  renderPrimeSummary();
  renderReportTable(rows);
  renderSalesCharts();
  renderManagementReports();
  renderManagerSummary();
}
function tableToExcelHtml(tableId, filename){
  const table = document.getElementById(tableId);
  const title = reportTitle();
  const html = `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        table{border-collapse:collapse}
        th,td{border:1px solid #999;padding:6px}
        th{background:#eeeeee}
      
    /* GENEL HİZALAMA DÜZELTMESİ */
    .main{
      min-width:0;
      max-width:calc(100vw - 255px);
    }

    .topbar{
      align-items:flex-start;
    }

    .page-title{
      min-width:0;
    }

    .page-title h1,
    .page-title p{
      overflow-wrap:anywhere;
    }

    .date-box,
    .pill{
      flex-shrink:0;
    }

    .section-head{
      display:grid !important;
      grid-template-columns:minmax(0,1fr) auto;
      align-items:start !important;
      column-gap:14px;
      row-gap:6px;
      width:100%;
    }

    .section-head h2{
      grid-column:1;
      line-height:1.25;
      white-space:normal;
    }

    .section-head .muted{
      grid-column:1 / -1;
      text-align:left !important;
      white-space:normal !important;
      overflow-wrap:anywhere;
      max-width:100%;
    }

    .section-head input,
    .section-head select,
    .section-head button{
      grid-column:2;
      align-self:start;
    }

    .form-grid{
      display:grid !important;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:14px !important;
      align-items:start;
    }

    .form-grid > div{
      min-width:0;
      display:flex;
      flex-direction:column;
    }

    .form-grid label{
      min-height:18px;
      line-height:18px;
      margin-bottom:7px;
      overflow-wrap:anywhere;
    }

    input,
    select,
    textarea{
      min-width:0;
      height:38px;
      line-height:normal;
    }

    textarea{
      height:auto;
      min-height:76px;
    }

    .span-2{
      grid-column:span 2;
    }

    .span-4{
      grid-column:1 / -1;
    }

    .actions{
      align-items:center;
    }

    .btn{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:40px;
      line-height:1.15;
      white-space:nowrap;
    }

    .table-wrap{
      width:100%;
      max-width:100%;
      overflow-x:auto;
    }

    table{
      width:100%;
      min-width:920px;
      table-layout:auto;
    }

    th,
    td{
      line-height:1.3;
      vertical-align:middle !important;
    }

    th{
      white-space:nowrap;
    }

    td{
      overflow-wrap:anywhere;
    }

    td.money,
    .money{
      text-align:right !important;
      white-space:nowrap;
      font-variant-numeric:tabular-nums;
    }

    .table-actions{
      display:flex !important;
      align-items:center;
      justify-content:flex-start;
      gap:8px;
      flex-wrap:nowrap;
      min-width:max-content;
    }

    .badge{
      white-space:nowrap;
      line-height:1.1;
    }

    .cards{
      align-items:stretch;
    }

    .summary-box{
      align-items:stretch;
    }

    .summary-item{
      min-width:0;
    }

    .summary-item div:last-child{
      overflow-wrap:anywhere;
    }

    @media(max-width:1200px){
      .main{
        max-width:100%;
      }

      .form-grid{
        grid-template-columns:repeat(2,minmax(0,1fr));
      }

      .span-2,
      .span-4{
        grid-column:1 / -1;
      }
    }

    @media(max-width:900px){
      .main{
        max-width:100%;
      }

      .section-head{
        grid-template-columns:1fr;
      }

      .section-head input,
      .section-head select,
      .section-head button{
        grid-column:1;
        width:100%;
        max-width:100% !important;
      }

      .form-grid{
        grid-template-columns:1fr;
      }

      .table-actions{
        flex-wrap:wrap;
      }
    }

  
    /* Checkbox / radio normal boyut */
    input[type="checkbox"],
    input[type="radio"]{
      width:16px !important;
      height:16px !important;
      min-width:16px !important;
      min-height:16px !important;
      padding:0 !important;
      margin:0 6px 0 0;
      vertical-align:middle;
      accent-color:var(--blue);
    }

    .checkcell input[type="checkbox"]{
      margin:0;
    }

    .inline-row label{
      display:inline-flex !important;
      align-items:center;
      gap:6px;
      min-height:auto !important;
      margin:0;
    }

  
    /* Ürün listesi hizalama düzeltmesi */
    .product-table-wrap{
      overflow-x:auto;
      padding-bottom:4px;
    }

    .product-table{
      min-width:1250px;
      table-layout:fixed;
    }

    .product-table th,
    .product-table td{
      white-space:nowrap;
      vertical-align:middle !important;
    }

    .product-table th:nth-child(1),
    .product-table td:nth-child(1){width:90px}

    .product-table th:nth-child(2),
    .product-table td:nth-child(2){
      width:240px;
      white-space:normal;
      overflow-wrap:break-word;
    }

    .product-table th:nth-child(3),
    .product-table td:nth-child(3){width:130px}

    .product-table th:nth-child(4),
    .product-table td:nth-child(4){width:90px}

    .product-table th:nth-child(5),
    .product-table td:nth-child(5){width:90px;text-align:right}

    .product-table th:nth-child(6),
    .product-table td:nth-child(6),
    .product-table th:nth-child(7),
    .product-table td:nth-child(7),
    .product-table th:nth-child(8),
    .product-table td:nth-child(8){
      width:125px;
      text-align:right !important;
      font-variant-numeric:tabular-nums;
    }

    .product-table th:nth-child(9),
    .product-table td:nth-child(9){width:125px;text-align:center}

    .product-table th:nth-child(10),
    .product-table td:nth-child(10){width:90px;text-align:center}

    .product-table th:nth-child(11),
    .product-table td:nth-child(11){width:180px}

    .product-table .table-actions{
      min-width:160px;
      justify-content:flex-start;
      flex-wrap:nowrap;
    }

  
    .filter-bar{
      display:grid;
      grid-template-columns:repeat(5,minmax(0,1fr));
      gap:10px;
      margin-bottom:14px;
      padding:12px;
      background:#f9fafb;
      border:1px solid var(--line);
      border-radius:14px;
    }
    .filter-bar .btn{
      width:100%;
    }
    @media(max-width:1200px){
      .filter-bar{grid-template-columns:repeat(2,minmax(0,1fr))}
    }
    @media(max-width:700px){
      .filter-bar{grid-template-columns:1fr}
    }

    .city-search-note{
      font-size:11px;
      color:#64748b;
      margin-top:4px;
    }

  
    .invoice-box{
      background:#fff;
      border:1px solid var(--line);
      border-radius:16px;
      padding:22px;
      color:#111827;
    }
    .invoice-top{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:18px;
      margin-bottom:18px;
      align-items:start;
    }
    .invoice-title{
      font-size:26px;
      font-weight:900;
      margin:0 0 6px;
    }
    .invoice-meta{
      text-align:right;
      line-height:1.7;
    }
    .invoice-parties{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:16px;
      margin:18px 0;
    }
    .invoice-party{
      border:1px solid var(--line);
      border-radius:14px;
      padding:14px;
      background:#f9fafb;
    }
    .invoice-party h3{
      margin:0 0 8px;
      font-size:15px;
    }
    .invoice-summary{
      max-width:420px;
      margin-left:auto;
      margin-top:16px;
      border:1px solid var(--line);
      border-radius:14px;
      overflow:hidden;
    }
    .invoice-summary-row{
      display:flex;
      justify-content:space-between;
      gap:12px;
      padding:10px 12px;
      border-bottom:1px solid var(--line);
    }
    .invoice-summary-row:last-child{
      border-bottom:0;
      font-weight:900;
      font-size:18px;
      background:#f9fafb;
    }
    .invoice-note{
      margin-top:18px;
      padding:12px;
      border-radius:14px;
      background:#f9fafb;
      border:1px solid var(--line);
    }
    @media(max-width:900px){
      .invoice-top,
      .invoice-parties{
        grid-template-columns:1fr;
      }
      .invoice-meta{
        text-align:left;
      }
    }

  
    .unit-select{
      min-width:86px;
      height:34px;
      padding:6px 8px;
      font-size:13px;
    }

  
    /* Firma listesi hizalama */
    .firma-table-wrap{
      overflow-x:auto;
      padding-bottom:4px;
    }

    .firma-table{
      min-width:1320px;
      table-layout:fixed;
    }

    .firma-table th,
    .firma-table td{
      vertical-align:middle !important;
      white-space:nowrap;
      line-height:1.25;
    }

    .firma-table th:nth-child(1),
    .firma-table td:nth-child(1){width:92px}

    .firma-table th:nth-child(2),
    .firma-table td:nth-child(2){
      width:230px;
      white-space:normal;
      overflow-wrap:break-word;
      font-weight:700;
    }

    .firma-table th:nth-child(3),
    .firma-table td:nth-child(3){width:120px}

    .firma-table th:nth-child(4),
    .firma-table td:nth-child(4){width:120px}

    .firma-table th:nth-child(5),
    .firma-table td:nth-child(5){width:130px}

    .firma-table th:nth-child(6),
    .firma-table td:nth-child(6){width:90px;text-align:center}

    .firma-table th:nth-child(7),
    .firma-table td:nth-child(7){width:110px;text-align:center}

    .firma-table th:nth-child(8),
    .firma-table td:nth-child(8),
    .firma-table th:nth-child(9),
    .firma-table td:nth-child(9){
      width:135px;
      text-align:right !important;
      font-variant-numeric:tabular-nums;
    }

    .firma-table th:nth-child(10),
    .firma-table td:nth-child(10){width:90px;text-align:center}

    .firma-table th:nth-child(11),
    .firma-table td:nth-child(11){width:255px}

    .firma-table .table-actions{
      min-width:240px;
      justify-content:flex-start;
      flex-wrap:nowrap;
    }

    .balance-badge{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width:96px;
      padding:7px 10px;
      border-radius:999px;
      font-weight:900;
      font-size:13px;
      line-height:1;
      white-space:nowrap;
      border:1px solid transparent;
      font-variant-numeric:tabular-nums;
    }

    .balance-ok{
      color:#047857;
      background:#ecfdf5;
      border-color:#a7f3d0;
    }

    .balance-debt{
      color:#b91c1c;
      background:#fef2f2;
      border-color:#fecaca;
    }

    .paid-amount{
      color:#047857;
      font-weight:900;
      white-space:nowrap;
      font-variant-numeric:tabular-nums;
    }

  
    /* Firma listesi kompakt görünüm - yatay kaydırma yok */
    .firma-filter-bar{
      grid-template-columns:1.4fr 1fr 1fr 1fr 1fr .9fr;
    }

    .firma-table-wrap{
      overflow-x:hidden !important;
      max-width:100%;
    }

    .firma-table{
      width:100% !important;
      min-width:0 !important;
      table-layout:fixed !important;
    }

    .firma-table th,
    .firma-table td{
      white-space:normal !important;
      overflow-wrap:anywhere;
      word-break:normal;
      padding:8px 5px !important;
      font-size:12px !important;
      line-height:1.22 !important;
      vertical-align:middle !important;
    }

    .firma-table th{
      font-size:10px !important;
      line-height:1.15 !important;
      text-align:left;
    }

    .firma-table th:nth-child(1),
    .firma-table td:nth-child(1){width:6% !important}

    .firma-table th:nth-child(2),
    .firma-table td:nth-child(2){
      width:16% !important;
      font-weight:700;
    }

    .firma-table th:nth-child(3),
    .firma-table td:nth-child(3){width:8% !important}

    .firma-table th:nth-child(4),
    .firma-table td:nth-child(4){width:8% !important}

    .firma-table th:nth-child(5),
    .firma-table td:nth-child(5){width:9% !important}

    .firma-table th:nth-child(6),
    .firma-table td:nth-child(6){width:6% !important;text-align:center}

    .firma-table th:nth-child(7),
    .firma-table td:nth-child(7){width:7% !important;text-align:center}

    .firma-table th:nth-child(8),
    .firma-table td:nth-child(8),
    .firma-table th:nth-child(9),
    .firma-table td:nth-child(9){
      width:10% !important;
      text-align:right !important;
      font-variant-numeric:tabular-nums;
    }

    .firma-table th:nth-child(10),
    .firma-table td:nth-child(10){width:6% !important;text-align:center}

    .firma-table th:nth-child(11),
    .firma-table td:nth-child(11){width:14% !important}

    .firma-table .table-actions{
      min-width:0 !important;
      width:100%;
      display:grid !important;
      grid-template-columns:1fr 1fr;
      gap:5px;
      white-space:normal !important;
    }

    .firma-table .table-actions .btn{
      width:100%;
      min-height:30px;
      height:auto;
      padding:6px 5px;
      font-size:11px;
      white-space:normal;
      line-height:1.05;
    }

    .firma-table .balance-badge{
      min-width:0;
      width:100%;
      padding:6px 5px;
      font-size:11px;
      white-space:normal;
      line-height:1.05;
    }

    .firma-table .paid-amount{
      white-space:normal;
      font-size:12px;
    }

    @media(max-width:1200px){
      .firma-filter-bar{
        grid-template-columns:repeat(3,minmax(0,1fr));
      }
      .firma-table th,
      .firma-table td{
        font-size:11px !important;
        padding:7px 4px !important;
      }
      .firma-table .table-actions .btn{
        font-size:10px;
        padding:5px 4px;
      }
    }

    @media(max-width:900px){
      .firma-filter-bar{
        grid-template-columns:1fr 1fr;
      }
      .firma-table th,
      .firma-table td{
        font-size:10px !important;
        padding:6px 3px !important;
      }
      .firma-table .table-actions{
        grid-template-columns:1fr;
      }
    }

  
    /* Ödeme takip ve tahsilat filtreleri */
    .payment-filter-bar{
      grid-template-columns:1.2fr 1.1fr 1fr 1fr .9fr .9fr;
    }

    .payment-track-wrap{
      overflow-x:hidden !important;
      max-width:100%;
    }

    .payment-track-table{
      width:100% !important;
      min-width:0 !important;
      table-layout:fixed;
    }

    .payment-track-table th,
    .payment-track-table td{
      white-space:normal !important;
      overflow-wrap:anywhere;
      padding:9px 7px !important;
      font-size:13px;
      line-height:1.25;
      vertical-align:middle !important;
    }

    .payment-track-table th{
      font-size:11px;
      line-height:1.15;
    }

    .payment-track-table th:nth-child(1),
    .payment-track-table td:nth-child(1){width:24%;font-weight:700}

    .payment-track-table th:nth-child(2),
    .payment-track-table td:nth-child(2),
    .payment-track-table th:nth-child(3),
    .payment-track-table td:nth-child(3),
    .payment-track-table th:nth-child(4),
    .payment-track-table td:nth-child(4){
      width:13%;
      text-align:right !important;
      font-variant-numeric:tabular-nums;
    }

    .payment-track-table th:nth-child(5),
    .payment-track-table td:nth-child(5){width:11%;text-align:center}

    .payment-track-table th:nth-child(6),
    .payment-track-table td:nth-child(6){width:11%;text-align:center}

    .payment-track-table th:nth-child(7),
    .payment-track-table td:nth-child(7){width:15%}

    .payment-track-table .table-actions{
      min-width:0 !important;
      width:100%;
      display:grid !important;
      grid-template-columns:1fr;
      gap:5px;
    }

    .payment-track-table .btn{
      width:100%;
      min-height:32px;
      padding:6px 7px;
      font-size:12px;
      white-space:normal;
      line-height:1.1;
    }

    .payment-status{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:100%;
      padding:6px 8px;
      border-radius:999px;
      font-weight:900;
      font-size:12px;
      border:1px solid transparent;
      white-space:normal;
      line-height:1.1;
    }

    .payment-status-ok{
      color:#047857;
      background:#ecfdf5;
      border-color:#a7f3d0;
    }

    .payment-status-debt{
      color:#b91c1c;
      background:#fef2f2;
      border-color:#fecaca;
    }

    @media(max-width:1200px){
      .payment-filter-bar{
        grid-template-columns:repeat(3,minmax(0,1fr));
      }
      .payment-track-table th,
      .payment-track-table td{
        font-size:12px;
        padding:8px 5px !important;
      }
    }

    @media(max-width:800px){
      .payment-filter-bar{
        grid-template-columns:1fr 1fr;
      }
      .payment-track-table th,
      .payment-track-table td{
        font-size:11px;
        padding:7px 4px !important;
      }
    }

  
    .dashboard-click-card{
      cursor:pointer;
      position:relative;
      transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease;
      border:1px solid transparent;
    }

    .dashboard-click-card:hover{
      transform:translateY(-2px);
      box-shadow:0 14px 30px rgba(15,23,42,.14);
      border-color:#f59e0b;
    }

    .dashboard-click-card:focus{
      outline:3px solid rgba(245,158,11,.28);
      outline-offset:2px;
    }

    .stat-link-note{
      margin-top:8px;
      font-size:11px;
      font-weight:800;
      color:#f59e0b;
    }

  
    /* Firmalar kart görünümü - yazı kayması ve yatay kaydırma yok */
    .firma-card-list{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(360px,1fr));
      gap:14px;
      width:100%;
      overflow-x:hidden;
    }

    .firma-card{
      background:#fff;
      border:1px solid #e5e7eb;
      border-radius:18px;
      padding:14px;
      box-shadow:0 8px 22px rgba(15,23,42,.06);
      display:flex;
      flex-direction:column;
      gap:12px;
      min-width:0;
    }

    .firma-card-top{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      min-width:0;
    }

    .firma-card-title{min-width:0}

    .firma-card-name{
      font-size:16px;
      font-weight:900;
      color:#0f172a;
      line-height:1.2;
      overflow-wrap:anywhere;
    }

    .firma-card-code{
      margin-top:4px;
      font-size:12px;
      font-weight:800;
      color:#64748b;
    }

    .firma-card-status{
      flex:0 0 auto;
      font-size:11px;
      font-weight:900;
      padding:6px 9px;
      border-radius:999px;
      background:#eef2ff;
      color:#3730a3;
      border:1px solid #c7d2fe;
      white-space:nowrap;
    }

    .firma-card-info{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:8px;
    }

    .firma-info-box{
      background:#f8fafc;
      border:1px solid #edf2f7;
      border-radius:12px;
      padding:9px;
      min-width:0;
    }

    .firma-info-label{
      font-size:10px;
      line-height:1.1;
      color:#64748b;
      font-weight:900;
      text-transform:uppercase;
      letter-spacing:.02em;
      margin-bottom:5px;
    }

    .firma-info-value{
      font-size:13px;
      line-height:1.2;
      color:#0f172a;
      font-weight:800;
      overflow-wrap:anywhere;
      min-height:16px;
    }

    .firma-money-row{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    }

    .firma-money-box{
      border-radius:14px;
      padding:11px;
      border:1px solid #e5e7eb;
      background:#fff;
      min-width:0;
    }

    .firma-money-label{
      font-size:11px;
      color:#64748b;
      font-weight:900;
      margin-bottom:7px;
    }

    .firma-money-value{
      font-size:15px;
      font-weight:950;
      line-height:1.15;
      overflow-wrap:anywhere;
    }

    .firma-card .paid-amount{
      color:#047857;
      font-weight:950;
      white-space:normal;
    }

    .firma-card .balance-badge{
      width:100%;
      min-width:0;
      padding:8px 9px;
      font-size:13px;
      white-space:normal;
      line-height:1.1;
    }

    .firma-card-actions{
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:7px;
    }

    .firma-card-actions .btn{
      width:100%;
      min-height:34px;
      height:auto;
      padding:7px 6px;
      font-size:12px;
      line-height:1.1;
      white-space:normal;
    }

    .firma-empty{
      grid-column:1/-1;
      padding:18px;
      border:1px dashed #cbd5e1;
      border-radius:16px;
      color:#64748b;
      font-weight:800;
      text-align:center;
      background:#f8fafc;
    }

    @media(max-width:780px){
      .firma-card-list{grid-template-columns:1fr}
      .firma-card-info{grid-template-columns:1fr 1fr}
      .firma-money-row{grid-template-columns:1fr}
      .firma-card-actions{grid-template-columns:1fr 1fr}
    }

    @media(max-width:480px){
      .firma-card-info{grid-template-columns:1fr}
    }

    /* Teklif / Proforma liste hizalama */
    .quote-table-wrap{
      overflow-x:hidden !important;
      max-width:100%;
    }

    .quote-table{
      width:100% !important;
      min-width:0 !important;
      table-layout:fixed !important;
    }

    .quote-table th,
    .quote-table td{
      vertical-align:middle !important;
      white-space:normal !important;
      overflow-wrap:anywhere;
      padding:9px 6px !important;
      line-height:1.22 !important;
      font-size:12px !important;
    }

    .quote-table th{
      font-size:10px !important;
      line-height:1.1 !important;
      color:#475569;
      text-align:left;
    }

    .quote-table th:nth-child(1),
    .quote-table td:nth-child(1){width:10%}

    .quote-table th:nth-child(2),
    .quote-table td:nth-child(2){width:10%;text-align:center}

    .quote-table th:nth-child(3),
    .quote-table td:nth-child(3){
      width:18%;
      font-weight:800;
    }

    .quote-table th:nth-child(4),
    .quote-table td:nth-child(4){width:22%}

    .quote-table th:nth-child(5),
    .quote-table td:nth-child(5){width:8%;text-align:center}

    .quote-table th:nth-child(6),
    .quote-table td:nth-child(6){
      width:12%;
      text-align:right !important;
      font-weight:900;
      font-variant-numeric:tabular-nums;
    }

    .quote-table th:nth-child(7),
    .quote-table td:nth-child(7){width:10%;text-align:center}

    .quote-table th:nth-child(8),
    .quote-table td:nth-child(8){width:10%}

    .quote-table .table-actions{
      min-width:0 !important;
      width:100%;
      display:grid !important;
      grid-template-columns:1fr;
      gap:5px;
      white-space:normal !important;
    }

    .quote-table .table-actions .btn{
      width:100%;
      height:auto;
      min-height:30px;
      padding:6px 4px;
      font-size:10px;
      line-height:1.05;
      white-space:normal;
    }

  
    .warning-click{
      cursor:pointer;
      transition:transform .12s ease, box-shadow .12s ease, border-color .12s ease;
      border:1px solid transparent;
    }

    .warning-click:hover{
      transform:translateY(-1px);
      box-shadow:0 8px 18px rgba(15,23,42,.10);
      border-color:#f59e0b !important;
    }

    .warning-click:focus{
      outline:3px solid rgba(245,158,11,.25);
      outline-offset:2px;
    }

  
    .dash-move-actions{
      display:flex;
      align-items:center;
      gap:5px;
      flex-wrap:wrap;
    }

    .mini-link-btn,
    .mini-pdf-btn{
      border:0;
      border-radius:999px;
      padding:6px 9px;
      font-size:11px;
      font-weight:900;
      cursor:pointer;
      line-height:1;
    }

    .mini-link-btn{
      background:#eff6ff;
      color:#1d4ed8;
      border:1px solid #bfdbfe;
    }

    .mini-pdf-btn{
      background:#fef2f2;
      color:#b91c1c;
      border:1px solid #fecaca;
    }

    .mini-link-btn:hover,
    .mini-pdf-btn:hover{
      filter:brightness(.97);
      transform:translateY(-1px);
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
      <h2>${title}</h2>
      <p>Oluşturma: ${new Date().toLocaleString("tr-TR")}</p>
      ${table.outerHTML}
    </body>
    </html>
  `;
  const blob = new Blob([html], {type:"application/vnd.ms-excel;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
