function orderShipmentTotals(order){
  const shipped={};
  (order.sevkler||[]).forEach(s=>(s.items||[]).forEach(it=>{shipped[it.kod]=(shipped[it.kod]||0)+(Number(it.qty)||0);}));
  const ordered=(order.items||[]).reduce((a,it)=>a+(Number(it.qty)||0),0);
  const sent=(order.items||[]).reduce((a,it)=>a+Math.min(Number(it.qty)||0,shipped[it.kod]||0),0);
  return {ordered,sent,remaining:Math.max(0,ordered-sent),shipped};
}
function createPartialShipment(index){
  const o=(state.orders||[])[index]; if(!o) return;
  const t=orderShipmentTotals(o); if(t.remaining<=0) return alert("Bu sipariş tamamen sevk edilmiş.");
  const items=[];
  for(const it of (o.items||[])){
    const remain=Math.max(0,(Number(it.qty)||0)-(t.shipped[it.kod]||0));
    if(remain<=0) continue;
    const raw=prompt(`${it.ad} — Sipariş: ${it.qty}, Kalan: ${remain}\nŞimdi sevk edilen miktar:`, String(remain));
    if(raw===null) return;
    const qty=Number(String(raw).replace(',','.'))||0;
    if(qty<0 || qty>remain) return alert(`${it.ad} için sevk miktarı 0-${remain} arasında olmalı.`);
    if(qty>0) items.push({kod:it.kod,ad:it.ad,qty});
  }
  if(!items.length) return alert("Sevk miktarı girilmedi.");
  const st=stockInit();let place=st.shipmentPlace;
  if(!st.locations.some(l=>l.id===place&&l.active)){
    const available=st.locations.filter(l=>l.active);
    if(!available.length)return alert('Otomatik stok düşümü için önce Stok ve Depo bölümünden aktif depo/fabrika tanımlayın.');
    const answer=prompt('Sevkiyat deposu seçin (numara):\n'+available.map((l,i)=>(i+1)+'. '+l.name).join('\n'),'1');
    if(answer===null)return;
    place=available[Number(answer)-1]?.id;
    if(!place)return alert('Geçerli depo seçilmedi.');
  }
  for(const it of items){const balance=stockBalance(place,String(it.kod));if(balance<Number(it.qty))return alert(it.ad+' için yeterli stok yok. Mevcut: '+balance+', gereken: '+it.qty);}
  const shipmentId=uid('SVK');
  const shipment={id:shipmentId,tarih:todayISO(),items,stockPlace:place};
  o.sevkler=o.sevkler||[];o.sevkler.push(shipment);
  for(const it of items)st.movements.push({id:uid('STK'),date:new Date().toISOString(),place,product:String(it.kod),type:'out',qty:Number(it.qty),note:'Otomatik sevkiyat: '+(o.no||''),shipmentKey:shipmentId});
  businessLog('shipment','Sevkiyat ve stok çıkışı: '+(o.no||''),{shipmentId,orderNo:o.no,orderIndex:index});
  const after=orderShipmentTotals(o); o.durum=after.remaining<=0?"Sevk Edildi":"Hazırlanıyor";
  saveState(); renderAll(); alert(`Sevk kaydedildi. Kalan miktar: ${after.remaining}`);
}
function shipmentProgressHtml(o){
  const t=orderShipmentTotals(o); if(!t.ordered) return "";
  return `<div class="muted" style="margin-top:5px">Sevk: ${t.sent}/${t.ordered}${t.remaining?` · Kalan ${t.remaining}`:' · Tamamlandı'}</div>`;
}
function showOrderShipmentHistory(index){
  const o=(state.orders||[])[index]; if(!o) return;
  const lines=(o.sevkler||[]).map((s,i)=>`${i+1}. ${trDate(s.tarih)} — ${(s.items||[]).map(x=>x.ad+': '+x.qty).join(', ')}`);
  alert(lines.length?lines.join('\n'):"Henüz sevkiyat kaydı yok.");
}
function ensureContactHistory(){ if(!Array.isArray(state.gorusmeler)) state.gorusmeler=[]; }
function addCustomerContact(firma){
  ensureContactHistory();
  const note=prompt(`${firma} için görüşme / arama notu:`); if(!note||!note.trim()) return;
  const next=prompt("Tekrar aranacak tarih (YYYY-AA-GG) - boş bırakabilirsiniz:","");
  state.gorusmeler.push({id:uid("GOR"),firma,tarih:todayISO(),not:note.trim(),takip:(next||"").trim()});
  saveState(); renderAll();
}
function showCustomerContacts(firma){
  ensureContactHistory();
  const rows=state.gorusmeler.filter(x=>x.firma===firma).sort((a,b)=>String(b.tarih).localeCompare(String(a.tarih)));
  const txt=rows.map(x=>`${trDate(x.tarih)} — ${x.not}${x.takip?' | Tekrar ara: '+trDate(x.takip):''}`).join('\n');
  if(confirm((txt||"Henüz görüşme kaydı yok.")+"\n\nYeni görüşme eklemek ister misiniz?")) addCustomerContact(firma);
}
function customerFavoriteProducts(firma){
  const map={};
  (state.orders||[]).filter(o=>o.firma===firma&&!['Taslak','İptal'].includes(o.durum)).forEach(o=>(o.items||[]).forEach(it=>{
    const k=it.kod||it.ad; if(!map[k]) map[k]={kod:it.kod,ad:it.ad,qty:0,count:0}; map[k].qty+=Number(it.qty)||0; map[k].count++;
  }));
  return Object.values(map).sort((a,b)=>b.count-a.count||b.qty-a.qty).slice(0,6);
}
function addFavoriteProductToOrder(kod){
  const p=(state.urunler||[]).find(x=>x.kod===kod); if(!p) return;
  orderSelected[kod]=orderSelected[kod]||{checked:true,qty:1,birim:p.birim||"Koli",manualPrice:null,noDiscount:false};
  orderSelected[kod].checked=true; if(!orderSelected[kod].qty) orderSelected[kod].qty=1;
  renderOrderProducts();
}
function renderCustomerFavoriteProducts(){
  const box=document.getElementById('customerFavoriteProducts'); if(!box) return;
  const firma=document.getElementById('s_firma')?.value||''; if(!firma){box.innerHTML='';return;}
  const fav=customerFavoriteProducts(firma);
  box.innerHTML=fav.length?`<div class="warn" style="background:#f8fafc"><b>⭐ Sık Alınan Ürünler:</b> ${fav.map(x=>`<button type="button" class="btn" style="margin:4px" onclick="addFavoriteProductToOrder('${escapeJsText(x.kod)}')">${htmlEscape(x.ad)} (${x.count} sip.)</button>`).join('')}</div>`:'';
}
function invoicePaymentHistory(firma,orderNo){
  const rows=(state.payments||[]).filter(p=>p.firma===firma && String(p.orderNo||p.faturaNo||'')===String(orderNo||'')).sort((a,b)=>String(a.tarih).localeCompare(String(b.tarih)));
  const inv=getFirmInvoiceBalances(firma).find(x=>x.key===String(orderNo||''));
  const lines=rows.map((p,i)=>`${i+1}. ${trDate(p.tarih)} — ${money(Number(p.tutar)||0)} — ${p.tip||'Tahsilat'}${p.aciklama?' — '+p.aciklama:''}`);
  alert(`${orderNo} Ödeme Geçmişi\n\n${lines.length?lines.join('\n'):'Bu faturaya bağlı tahsilat yok.'}\n\nToplam: ${money(inv?.total||0)}\nÖdenen: ${money(inv?.paid||0)}\nKalan: ${money(inv?.remaining||0)}`);
}

function setPremiumOrderStatus(v){
  const sel=document.getElementById("of_status");
  if(sel){sel.value=v;renderOrders();}
}
function renderPremiumOrderOverview(){
  const orders=state.orders||[];
  const live=orders.filter(o=>o.durum!=="İptal"&&o.durum!=="Taslak");
  const count=(values)=>live.filter(o=>values.includes(o.durum)).length;
  const stats=[
    ["▣","Toplam Sipariş",live.length,"Kayıtlı sipariş"],
    ["₺","Toplam Tutar",money(live.reduce((s,o)=>s+(Number(o.total)||0),0)),"Aktif sipariş tutarı"],
    ["✓","Teslim Edilen",count(["Teslim Edildi","Tamamlandı"]),"Tamamlanan sipariş"],
    ["◷","Hazırlanıyor",count(["Hazırlanıyor","Hazır"]),"Hazırlık aşamasında"],
    ["!","Beklemede",count(["Onay Bekliyor","Onaylandı","Beklemede"]),"Onay veya işlem bekliyor"]
  ];
  const k=document.getElementById("orderPremiumKpis");
  if(k)k.innerHTML=stats.map(([icon,label,value,foot])=>`<div class="card order-kpi"><div class="order-kpi-icon">${icon}</div><div><div class="order-kpi-label">${label}</div><div class="order-kpi-value">${value}</div><div class="order-kpi-foot">${foot}</div></div></div>`).join("");
  const tabs=document.getElementById("orderPremiumTabs");
  if(tabs){const current=document.getElementById("of_status")?.value||"";
    const values=[["","Tümü"],["Onay Bekliyor","Onay Bekliyor"],["Hazırlanıyor","Hazırlanıyor"],["Sevk Edildi","Sevk Edildi"],["Teslim Edildi","Teslim Edildi"]];
    tabs.innerHTML=values.map(([v,label])=>`<button type="button" class="${current===v?'active':''}" onclick="setPremiumOrderStatus('${v}')">${label} <span>${v?count([v]):live.length}</span></button>`).join("");
  }
}
function renderOrders(){
  renderPremiumOrderOverview();
  const q=(document.getElementById("of_search")?.value || "").toLowerCase();
  const firma=document.getElementById("of_firma")?.value || "";
  const status=document.getElementById("of_status")?.value || "";
  const startDate=document.getElementById("of_start")?.value || "";
  const endDate=document.getElementById("of_end")?.value || "";

  const unpaidMap = orderUnpaidAllocationMap();
  const today = todayISO();
  const rows = state.orders
    .map((o,idx)=>({o,idx}))
    .filter(({o,idx})=>{
      const hay=String((o.no||"")+(o.firma||"")+(o.kargoNo||"")+(o.aciklama||"")).toLowerCase();
      if(q && !hay.includes(q)) return false;
      if(firma && o.firma!==firma) return false;
      if(status==="__open" && ["Tamamlandı","Teslim Edildi","İptal","Taslak"].includes(o.durum)) return false;
      if(status==="__overdue" && !isOrderOverdueOpen(o, today, unpaidMap[idx])) return false;
      if(status && !["__open","__overdue"].includes(status) && o.durum!==status) return false;
      if(startDate && o.tarih<startDate) return false;
      if(endDate && o.tarih>endDate) return false;
      return true;
    })
    .sort((a,b)=>b.idx-a.idx);

  orderList.innerHTML = rows.map(({o,idx})=>{
    const i = idx;
    const kargoText = o.kargoDurum && o.kargoDurum !== "Yok" ? o.kargoDurum : "-";
    const takipText = o.kargoNo ? o.kargoNo : "-";
    return `<tr>
      <td>${o.no}</td>
      <td>${trDate(o.tarih)}</td>
      <td>${o.firma}</td>
      <td>${o.items.length}</td>
      <td>${o.items.reduce((s,x)=>s+x.qty,0)}</td>
      <td class="money">${money(o.total)}</td>
      <td>${orderStatusSelectHtml(i, o.durum)}<div style="margin-top:6px">${orderPaymentStatusHtml(o)}</div>${shipmentProgressHtml(o)}</td>
      <td>${kargoText}</td>
      <td>${takipText}</td>
      <td><div class="table-actions"><button class="btn" onclick="openInvoicePdf(${i})">PDF Fatura</button> ${o.durum==="Onay Bekliyor"?`<button class="btn primary" onclick="approveOrder(${i})">Onayla</button>`:""} <button class="btn" onclick="createPartialShipment(${i})">Sevk</button> <button class="btn" onclick="showOrderShipmentHistory(${i})">Sevk Geçmişi</button> <button class="btn whatsapp-btn" onclick="openOrderWhatsapp(${i})">WhatsApp</button> <button class="btn" onclick="editOrder(${i})">Düzenle</button> <button class="btn" onclick="editOrderCargo(${i})">Kargo</button> <button class="btn danger" onclick="delOrder(${i})">Sil</button></div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="10" class="muted">Sipariş yok</td></tr>`;
}

let currentInvoiceIndex = null;

function invoicePackPrices(it){
  const p = (state.urunler||[]).find(u=>String(u.kod||"")===String(it.kod||"")) || {};
  const koliIci = Math.max(1, Number(p.koli || p.koliIci || p.koliAdet || 1) || 1);
  const unit = String(it.birim || p.birim || "Adet");
  const linePrice = Number(it.fiyat)||0;
  let koliFiyat = 0, adetFiyat = 0;
  if(unit === "Koli") { koliFiyat = linePrice; adetFiyat = koliIci ? linePrice / koliIci : 0; }
  else if(unit === "Adet") { adetFiyat = linePrice; koliFiyat = linePrice * koliIci; }
  else {
    koliFiyat = Number(p.fiyat)||0;
    adetFiyat = Number(p.adetFiyat)|| (koliIci ? koliFiyat/koliIci : 0);
  }
  return {koliIci, koliFiyat, adetFiyat};
}

function viewInvoice(i){
  const o = state.orders[i];
  if(!o) return;
  currentInvoiceIndex = i;

  const f = state.firmalar.find(x=>x.ad === o.firma) || {};
  const items = o.items || [];

  const itemRows = items.map((it,idx)=>{
    const pack = invoicePackPrices(it);
    return `
    <tr>
      <td>${idx+1}</td>
      <td>${it.kod||""}</td>
      <td>${it.ad||""}</td>
      <td>${it.qty||0}</td>
      <td>${it.birim||"Adet"}</td>
      <td class="money">${money(pack.koliFiyat)}</td>
      <td class="money">${pack.koliIci}</td>
      <td class="money">${money(pack.adetFiyat)}</td>
      <td class="money">${money(it.brut||0)}</td>
      <td class="money">${money(it.disc||0)}</td>
      <td class="money">${money(it.kdv||0)}</td>
      <td class="money">${money(it.total||0)}</td>
    </tr>
  `}).join("");

  const iskontoText = o.iskonto === "Manuel" ? manualDiscountText(o.manualDisc) : (o.iskonto || "0");

  invoiceContent.innerHTML = `
    <div class="invoice-box" id="invoicePrintArea">
      <div style="border:2px solid #dc2626;color:#dc2626;background:#fff5f5;text-align:center;font-weight:900;font-size:22px;letter-spacing:1px;padding:8px 10px;margin-bottom:12px;border-radius:10px;">FATURA DEĞİLDİR</div>
      <div class="invoice-top">
        <div>
          <h1 class="invoice-title">FATURA / SİPARİŞ FORMU</h1>
          <div class="muted">Cari Takip Programı</div>
        </div>
        <div class="invoice-meta">
          <div><b>Sipariş No:</b> ${o.no||""}</div>
          <div><b>Tarih:</b> ${trDate(o.tarih)}</div>
          <div><b>Vade Tarihi:</b> ${o.vadeTarih ? trDate(o.vadeTarih) : ""}</div>
          <div><b>Durum:</b> ${o.durum||""}</div>
        </div>
      </div>

      <div class="invoice-parties">
        <div class="invoice-party">
          <h3>Firma Bilgileri</h3>
          <p><b>Firma:</b> ${o.firma||""}</p>
          <p><b>Yetkili:</b> ${f.yetkili||""}</p>
          <p><b>Telefon:</b> ${f.tel||""}</p>
          <p><b>Vergi No / TCKN:</b> ${f.vergi||""}</p>
          <p><b>Vergi Dairesi:</b> ${f.vd||""}</p>
        </div>
        <div class="invoice-party">
          <h3>Adres / Sevkiyat</h3>
          <p><b>Adres:</b><br>${f.adres||""}</p>
          <p><b>Teslimat Adresi:</b><br>${f.sevk||""}</p>
          <p><b>Kargo:</b> ${o.kargoFirma||""} ${o.kargoNo ? " / " + o.kargoNo : ""}</p>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Ürün Kodu</th>
              <th>Ürün Adı</th>
              <th>Miktar</th>
              <th>Birim</th>
              <th>Koli Fiyatı</th>
              <th>Koli İçi</th>
              <th>Adet Fiyatı</th>
              <th>Brüt</th>
              <th>İskonto</th>
              <th>KDV %1</th>
              <th>Toplam</th>
            </tr>
          </thead>
          <tbody>${itemRows || `<tr><td colspan="12" class="muted">Ürün yok</td></tr>`}</tbody>
        </table>
      </div>

      <div class="invoice-summary">
        <div class="invoice-summary-row"><span>Toplam Brüt</span><b>${money(o.brut||0)}</b></div>
        <div class="invoice-summary-row"><span>İskonto Grubu</span><b>${iskontoText}</b></div>
        <div class="invoice-summary-row"><span>Toplam İskonto</span><b>${money(o.disc||0)}</b></div>
        <div class="invoice-summary-row"><span>KDV %1</span><b>${money(o.kdv||0)}</b></div>
        <div class="invoice-summary-row"><span>Genel Toplam</span><b>${money(o.total||0)}</b></div>
      </div>

      <div class="invoice-note">
        <b>Açıklama:</b> ${o.aciklama||""}
      </div>
    </div>
  `;

  invoiceCard.classList.remove("hide");
  invoiceCard.scrollIntoView({behavior:"smooth", block:"start"});
}

function closeInvoice(){
  currentInvoiceIndex = null;
  invoiceCard.classList.add("hide");
  invoiceContent.innerHTML = "";
}


function invoicePdfHtml(i, draftOrder){
  const o = draftOrder || state.orders[i];
  if(!o) return "";
  const f = state.firmalar.find(x=>x.ad === o.firma) || {};
  const items = o.items || [];
  const iskontoText = o.iskonto === "Manuel" ? manualDiscountText(o.manualDisc) : (o.iskonto || "0");

  const itemRows = items.map((it,idx)=>{
    const pack = invoicePackPrices(it);
    return `
    <tr>
      <td>${idx+1}</td>
      <td>${it.kod||""}</td>
      <td>${it.ad||""}</td>
      <td class="center">${it.qty||0}</td>
      <td class="center">${it.birim||"Adet"}</td>
      <td class="right">${money(pack.koliFiyat)}</td>
      <td class="center">${pack.koliIci}</td>
      <td class="right">${money(pack.adetFiyat)}</td>
      <td class="right">${money(it.brut||0)}</td>
      <td class="right">${money(it.disc||0)}</td>
      <td class="right">${money(it.kdv||0)}</td>
      <td class="right">${money(it.total||0)}</td>
    </tr>
  `}).join("");

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>PDF Fatura - ${o.no||""}</title>
<style>
  @page{size:A4;margin:12mm}
  *{box-sizing:border-box}
  body{
    margin:0;
    background:#e5e7eb;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
  }
  .toolbar{
    position:sticky;
    top:0;
    z-index:10;
    background:#111827;
    color:white;
    padding:10px 14px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:10px;
  }
  .toolbar button{
    border:0;
    border-radius:9px;
    padding:9px 13px;
    font-weight:700;
    cursor:pointer;
  }
  .toolbar .primary{
    background:#2563eb;
    color:white;
  }
  .page{
    width:210mm;
    min-height:297mm;
    margin:18px auto;
    background:white;
    padding:16mm;
    box-shadow:0 10px 35px rgba(0,0,0,.18);
  }
  .not-invoice-band{
    border:2px solid #dc2626;
    color:#dc2626;
    background:#fff5f5;
    text-align:center;
    font-weight:900;
    font-size:22px;
    letter-spacing:1px;
    padding:8px 10px;
    margin-bottom:12px;
    border-radius:10px;
  }
  .top{
    display:grid;
    grid-template-columns:1.2fr .8fr;
    gap:18px;
    border-bottom:3px solid #111827;
    padding-bottom:12px;
    margin-bottom:14px;
  }
  h1{
    margin:0;
    font-size:28px;
    letter-spacing:.5px;
  }
  .sub{
    color:#6b7280;
    margin-top:5px;
    font-size:13px;
  }
  .meta{
    text-align:right;
    font-size:13px;
    line-height:1.7;
  }
  .box-grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:12px;
    margin:14px 0;
  }
  .box{
    border:1px solid #d1d5db;
    border-radius:10px;
    padding:10px;
    min-height:95px;
  }
  .box h3{
    margin:0 0 8px;
    font-size:13px;
    border-bottom:1px solid #e5e7eb;
    padding-bottom:5px;
  }
  p{
    margin:4px 0;
    font-size:12.5px;
    line-height:1.35;
  }
  table{
    width:100%;
    border-collapse:collapse;
    margin-top:12px;
    font-size:11.5px;
  }
  th,td{
    border:1px solid #d1d5db;
    padding:6px;
    vertical-align:top;
  }
  th{
    background:#f3f4f6;
    font-size:10.5px;
    text-transform:uppercase;
  }
  .right{text-align:right;white-space:nowrap}
  .center{text-align:center}
  .summary{
    width:82mm;
    margin-left:auto;
    margin-top:12px;
    border:1px solid #d1d5db;
    border-radius:10px;
    overflow:hidden;
  }
  .summary-row{
    display:flex;
    justify-content:space-between;
    gap:10px;
    padding:8px 10px;
    border-bottom:1px solid #e5e7eb;
    font-size:12.5px;
  }
  .summary-row:last-child{
    border-bottom:0;
    background:#f3f4f6;
    font-weight:900;
    font-size:15px;
  }
  .note{
    margin-top:14px;
    border:1px solid #d1d5db;
    border-radius:10px;
    padding:10px;
    min-height:42px;
    font-size:12px;
  }
  .footer{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:18px;
    margin-top:22px;
  }
  .sign{
    border-top:1px solid #111827;
    padding-top:8px;
    text-align:center;
    font-size:12px;
  }
  @media print{
    body{background:white}
    .toolbar{display:none}
    .page{
      margin:0;
      width:auto;
      min-height:auto;
      box-shadow:none;
      padding:0;
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
  <div class="toolbar">
    <div><b>${draftOrder ? "Kaydetmeden Fatura Önizleme" : "PDF Fatura Önizleme"}:</b> ${o.no||""}</div>
    <div>
      <button class="primary" onclick="window.print()">PDF Kaydet / Yazdır</button>
      <button onclick="window.close()">Kapat</button>
    </div>
  </div>

  <div class="page">
    <div class="not-invoice-band">FATURA DEĞİLDİR</div>
    <div class="top">
      <div>
        <h1>FATURA / SİPARİŞ FORMU</h1>
        <div class="sub">PDF/A4 görünümü</div>
      </div>
      <div class="meta">
        <div><b>Sipariş No:</b> ${o.no||""}</div>
        <div><b>Tarih:</b> ${trDate(o.tarih)}</div>
        <div><b>Vade Tarihi:</b> ${o.vadeTarih ? trDate(o.vadeTarih) : ""}</div>
        <div><b>Durum:</b> ${o.durum||""}</div>
      </div>
    </div>

    <div class="box-grid">
      <div class="box">
        <h3>Firma Bilgileri</h3>
        <p><b>Firma:</b> ${o.firma||""}</p>
        <p><b>Yetkili:</b> ${f.yetkili||""}</p>
        <p><b>Telefon:</b> ${f.tel||""}</p>
        <p><b>Vergi No / TCKN:</b> ${f.vergi||""}</p>
        <p><b>Vergi Dairesi:</b> ${f.vd||""}</p>
      </div>
      <div class="box">
        <h3>Adres / Sevkiyat</h3>
        <p><b>Adres:</b> ${f.adres||""}</p>
        <p><b>Teslimat:</b> ${f.sevk||""}</p>
        <p><b>Kargo:</b> ${o.kargoFirma||""} ${o.kargoNo ? " / " + o.kargoNo : ""}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Ürün Kodu</th>
          <th>Ürün Adı</th>
          <th>Miktar</th>
          <th>Birim</th>
          <th>Koli Fiyatı</th>
          <th>Koli İçi</th>
          <th>Adet Fiyatı</th>
          <th>Brüt</th>
          <th>İskonto</th>
          <th>KDV %1</th>
          <th>Toplam</th>
        </tr>
      </thead>
      <tbody>${itemRows || `<tr><td colspan="12">Ürün yok</td></tr>`}</tbody>
    </table>

    <div class="summary">
      <div class="summary-row"><span>Toplam Brüt</span><b>${money(o.brut||0)}</b></div>
      <div class="summary-row"><span>İskonto Grubu</span><b>${iskontoText}</b></div>
      <div class="summary-row"><span>Toplam İskonto</span><b>${money(o.disc||0)}</b></div>
      <div class="summary-row"><span>KDV %1</span><b>${money(o.kdv||0)}</b></div>
      <div class="summary-row"><span>Genel Toplam</span><b>${money(o.total||0)}</b></div>
    </div>

    <div class="note"><b>Açıklama:</b> ${o.aciklama||""}</div>

    <div class="footer">
      <div class="sign">Teslim Eden</div>
      <div class="sign">Teslim Alan / Kaşe İmza</div>
    </div>
  </div>
</body>
</html>`;
}

