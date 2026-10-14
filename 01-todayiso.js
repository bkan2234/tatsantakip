
const KDV = 0.01;
const LSKEY = "cari_takip_ornek_v1";

const state = loadState();


function todayISO(){
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off*60000);
  return local.toISOString().slice(0,10);
}
function trDate(iso){
  if(!iso) return "";
  return new Date(iso+"T00:00:00").toLocaleDateString("tr-TR");
}
function normalizeMoneyValue(n){ n = Number(n)||0; return Math.abs(n) < 0.005 ? 0 : n; }
function money(n){ n = normalizeMoneyValue(n); return n.toLocaleString("tr-TR",{style:"currency",currency:"TRY"}); }
function uid(prefix){
  const n = Math.floor(Math.random()*90000)+10000;
  return prefix + "-" + n;
}
function loadState(){
  const raw = localStorage.getItem(LSKEY);
  if(raw) return JSON.parse(raw);
  return {
    firmalar:[
      {kod:"F001",ad:"ABC Market",tur:"Market",sehir:"İstanbul",ilce:"Esenyurt",vergi:"",vd:"",yetkili:"Ali Bey",tel:"0532 xxx xx xx",mail:"",adres:"",sevk:"",vade:30,iskonto:"20+2",manualDisc:0,durum:"Aktif",not:"",created:todayISO()},
      {kod:"F002",ad:"XYZ Gıda",tur:"Toptancı",sehir:"Ankara",ilce:"",vergi:"",vd:"",yetkili:"",tel:"0544 xxx xx xx",mail:"",adres:"",sevk:"",vade:7,iskonto:"15+5",manualDisc:0,durum:"Aktif",not:"",created:todayISO()}
    ],
    kategoriler:[
      {kod:"K001",ad:"Tahin",sira:1,durum:"Aktif",renk:"Kahverengi",not:""},
      {kod:"K002",ad:"Helva",sira:2,durum:"Aktif",renk:"Turuncu",not:""},
      {kod:"K003",ad:"Kampanya",sira:3,durum:"Aktif",renk:"Kırmızı",not:""}
    ],
    urunler:[
      {kod:"1001",ad:"Tahin 5 KG",kat:"Tahin",birim:"Koli",koli:2,fiyat:500,adetFiyat:250,kgFiyat:100,durum:"Aktif",noDisc:false,not:""},
      {kod:"1002",ad:"Helva 1 KG",kat:"Helva",birim:"Koli",koli:6,fiyat:120,adetFiyat:20,kgFiyat:120,durum:"Aktif",noDisc:false,not:""},
      {kod:"1003",ad:"Özel Kampanya Ürünü",kat:"Kampanya",birim:"Koli",koli:12,fiyat:80,adetFiyat:6.67,kgFiyat:0,durum:"Aktif",noDisc:true,not:"İskonto uygulanmaz"}
    ],
    orders:[],
    quotes:[],
    samples:[],
    visits:[],
    randevular:[],
    payments:[]
  };
}
function saveState(){
  saveStateCore();
  markCloudDirty();
  scheduleCloudAutoSync();
}


function parseManualDiscountParts(value){
  const raw = String(value ?? "").trim().replace(/,/g,".");
  if(!raw) return [];
  return raw
    .split("+")
    .map(x=>Number(String(x).trim()))
    .filter(n=>Number.isFinite(n))
    .map(n=>Math.min(Math.max(n,0),100));
}

function manualDiscountMultiplier(value){
  const parts = parseManualDiscountParts(value);
  if(!parts.length) return 1;
  return parts.reduce((mult,p)=>mult * (1 - p/100), 1);
}

function manualDiscountText(value){
  const raw = String(value ?? "").trim();
  if(!raw) return "Manuel %0";
  return "Manuel %" + raw;
}

function manualDiscountValue(id){
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function discountMultiplier(grup, manualPercent){
  if(grup==="0") return 1;
  if(grup==="15") return 0.85;
  if(grup==="15+5") return 0.85*0.95;
  if(grup==="20") return 0.80;
  if(grup==="20+2") return 0.80*0.98;
  if(grup==="20+5") return 0.80*0.95;
  if(grup==="Manuel"){
    return manualDiscountMultiplier(manualPercent);
  }
  return 1;
}


function productKey(product, index){
  const kod = String(product && product.kod ? product.kod : "").trim();
  if(kod) return kod;
  if(product && product.uid) return String(product.uid);
  return "__row_" + index;
}

function findProductBySelectionKey(key){
  const products = state.urunler || [];
  const direct = products.find(u=>String(u.kod||"")===String(key||""));
  if(direct) return direct;

  const byUid = products.find(u=>String(u.uid||"")===String(key||""));
  if(byUid) return byUid;

  const m = String(key||"").match(/^__row_(\d+)$/);
  if(m){
    const idx = parseInt(m[1],10);
    return products[idx] || null;
  }
  return null;
}

function escapeJsText(v){
  return String(v ?? "").replace(/\\/g,"\\\\").replace(/'/g,"\\'");
}

function getUnitPrice(product, selectedUnit){
  const unit = selectedUnit || product.birim || "Koli";
  if(unit === "Kg"){
    const kg = Number(product.kgFiyat)||0;
    return kg > 0 ? kg : (Number(product.fiyat)||0);
  }
  if(unit === "Adet"){
    const adet = Number(product.adetFiyat)||0;
    return adet > 0 ? adet : (Number(product.fiyat)||0);
  }
  if(unit === "Paket"){
    const paket = Number(product.paketFiyat)||0;
    return paket > 0 ? paket : (Number(product.fiyat)||0);
  }
  return Number(product.fiyat)||0;
}

function calcLineByUnit(product, qty, selectedUnit, discountGroup, manualPercent){
  const unitPrice = getUnitPrice(product, selectedUnit);
  const tempProduct = Object.assign({}, product, {fiyat: unitPrice});
  const c = calcLine(tempProduct, qty, discountGroup, manualPercent);
  c.unitPrice = unitPrice;
  c.birim = selectedUnit || product.birim || "Koli";
  return c;
}

function calcOrderLine(product, sel, discountGroup, manualPercent){
  const normalPrice = getUnitPrice(product, sel.birim || product.birim || "Koli");
  const hasManualPrice = sel.manualPrice !== undefined && sel.manualPrice !== null && String(sel.manualPrice).trim() !== "";
  const manualPrice = hasManualPrice ? Number(sel.manualPrice) : NaN;
  const unitPrice = hasManualPrice && Number.isFinite(manualPrice) && manualPrice >= 0 ? manualPrice : normalPrice;
  const tempProduct = Object.assign({}, product, {fiyat: unitPrice, noDisc: !!(product.noDisc || sel.noDiscount)});
  const c = calcLine(tempProduct, parseInt(sel.qty)||1, discountGroup, manualPercent);
  c.unitPrice = unitPrice;
  c.normalUnitPrice = normalPrice;
  c.manualPrice = hasManualPrice ? unitPrice : null;
  c.birim = sel.birim || product.birim || "Koli";
  return c;
}

function calcLine(product, qty, iskonto, manualPercent){
  qty = parseInt(qty)||0;
  const brut = qty * Number(product.fiyat||0);
  const net = product.noDisc ? brut : brut * discountMultiplier(iskonto, manualPercent);
  const disc = brut - net;
  const kdv = net * KDV;
  return {brut,disc,net,kdv,total:net+kdv};
}
function firmaName(kodOrName){
  const f = state.firmalar.find(x=>x.kod===kodOrName || x.ad===kodOrName);
  return f ? f.ad : kodOrName;
}


function firmaTotalSales(firmaAd){
  return (state.orders||[])
    .filter(o=>o.firma===firmaAd && !["Taslak","İptal"].includes(o.durum))
    .reduce((s,o)=>s+(Number(o.total)||0),0);
}

function firmaLastPaymentDate(firmaAd){
  const dates = (state.payments||[])
    .filter(p=>p.firma===firmaAd && p.tarih)
    .map(p=>p.tarih)
    .sort();
  return dates.length ? dates[dates.length-1] : "";
}

function paymentStatusBadge(firmaAd){
  const bakiye = normalizeMoneyValue(firmaOpenBalance(firmaAd));
  if(bakiye > 0){
    return `<span class="payment-status payment-status-debt">Borç Var</span>`;
  }
  if(bakiye < 0){
    return `<span class="payment-status payment-status-credit">Alacaklı</span>`;
  }
  return `<span class="payment-status payment-status-ok">Borç Yok</span>`;
}

function firmaTotalPayments(firmaAd){
  return (state.payments||[])
    .filter(p=>p.firma===firmaAd)
    .reduce((s,p)=>s+(Number(p.tutar)||0),0);
}


function firmaBalanceLabel(firmaAd){
  const bakiye = normalizeMoneyValue(firmaOpenBalance(firmaAd));
  if(bakiye > 0) return "Açık Bakiye";
  if(bakiye < 0) return "Müşteri Alacağı";
  return "Açık Bakiye";
}

function firmaBalanceDisplayAmount(firmaAd){
  const bakiye = normalizeMoneyValue(firmaOpenBalance(firmaAd));
  return Math.abs(bakiye);
}

function firmaBalanceClass(firmaAd){
  const bakiye = normalizeMoneyValue(firmaOpenBalance(firmaAd));
  if(bakiye > 0) return "balance-debt";
  if(bakiye < 0) return "balance-credit";
  return "balance-ok";
}

function firmaBalanceDetailClass(firmaAd){
  const bakiye = normalizeMoneyValue(firmaOpenBalance(firmaAd));
  if(bakiye > 0) return "orange";
  if(bakiye < 0) return "blue";
  return "green";
}

function firmaBalanceBadge(firmaAd){
  const bakiye = normalizeMoneyValue(firmaOpenBalance(firmaAd));
  if(bakiye > 0){
    return `<span class="balance-badge balance-debt">${money(bakiye)}</span>`;
  }
  if(bakiye < 0){
    return `<span class="balance-badge balance-credit">${money(Math.abs(bakiye))}</span>`;
  }
  return `<span class="balance-badge balance-ok">${money(0)}</span>`;
}

function firmaOpenBalance(firmaAd){
  let sales = 0, pays = 0;
  state.orders.forEach(o=>{
    if(o.firma === firmaAd && !["Taslak","İptal"].includes(o.durum)) sales += Number(o.total||0);
  });
  state.payments.forEach(p=>{
    if(p.firma === firmaAd) pays += Number(p.tutar||0);
  });
  return sales - pays;
}


function scrollOrderArea(id){
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
}

function go(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById(view).classList.add("active");
  document.querySelectorAll(".menu button").forEach(b=>b.classList.toggle("active", b.dataset.view===view || (view==="kategoriler" && b.dataset.view==="urunler") || (view==="tahsilatlar" && b.dataset.view==="siparisler") || (view==="ziyaretler" && b.dataset.view==="teklifler")));
  const pageSelector = document.getElementById("productCategoryPageSelect_"+view);
  if(pageSelector) pageSelector.value = view;
  const groupSelector = document.getElementById("tatsanGroupSelect_"+view);
  if(groupSelector) groupSelector.value = view;
  const titles = {
    dashboard:["Dashboard","Genel cari durum, sipariş, tahsilat ve uyarılar"],
    firmalar:["Firmalar","Firma kartları, vade ve iskonto grubu"],
    siparisler:["Siparişler ve Tahsilatlar","Checkbox ürün seçimi, kademeli iskonto, sabit %1 KDV ve kargo takip"],
    teklifler:["Teklifler ve Ziyaretler","Cari bakiyeye işlemeden fiyat teklifi ve proforma oluştur"],
    numuneler:["Numune Girişi","Katalogdan checkbox ile adetli numune takibi"],
    ziyaretler:["Ziyaret / Numune / Materyal","Ziyaret, bırakılan materyal ve numune ürünlerini tek ekranda takip et"],
    randevular:["Randevular","Firma ve müşteri randevularını takip et"],
    tahsilatlar:["Tahsilatlar","Firmalardan alınan ödemeler"],
    hareketler:["Hareketler","Sipariş ve tahsilat hareketleri"],
    urunler:["Ürün Kataloğu","Manuel ürün kodu, kategori, liste/adet/kg fiyatı"],
    katalog:["Katalog Oluştur","Seçili ürünlerden müşteriye özel fiyatlı A4 katalog hazırla"],
    kategoriler:["Kategoriler","Ürün grupları ve sıralama"],
    raporlar:["Raporlar","Özet cari raporları"],
    ayarlar:["Ayarlar","Demo ayarları"],
    stokdepo:["Stok ve Depo","Stok hareketleri ve sevkiyat"],
    asistan:["İş Asistanı","Kayıtlara dayalı özetler"],
    vadeTakvim:["Vade Takvimi","Açık alacaklar ve tahsilat tarihleri"],
    uyarilar:["Uyarı Merkezi","Geciken işlemler ve kritik stok"],
    islemGecmisi:["İşlem Geçmişi","Desteklenen işlemleri geri alma"],
    iadeler:["Müşteri İadeleri","İade kontrolü, stok ve finansal aksiyon"]
  };
  const pageTitleEl = document.getElementById("pageTitle");
  const pageSubEl = document.getElementById("pageSub");
  if(pageTitleEl) pageTitleEl.textContent = titles[view][0];
  if(pageSubEl) pageSubEl.textContent = titles[view][1];
  renderAll();

  if(view==="tahsilatlar"){
    setTimeout(function(){
      resetPaymentDateToToday();
      updatePaymentFirmBalance();
    }, 0);
  }

  if(view==="randevular"){
    setTimeout(function(){
      if(!editingAppointmentNo) clearAppointmentForm();
      renderAppointments();
    }, 0);
  }
}
document.getElementById("menu").addEventListener("click", e=>{
  if(e.target.dataset.view) go(e.target.dataset.view);

  if(view==="tahsilatlar"){
    setTimeout(refreshPaymentSection, 0);
  }
});

const MENU_VISIBILITY_KEY = "tatsan_menu_visibility_v1";
function menuVisibilityState(){
  try { const value=JSON.parse(localStorage.getItem(MENU_VISIBILITY_KEY)||"{}"); return value && typeof value==="object" && !Array.isArray(value)?value:{}; }
  catch(e){return {};}
}
function applyMenuVisibility(){
  const prefs=menuVisibilityState();
  document.querySelectorAll("#menu button[data-view]").forEach(btn=>{
    const view=btn.dataset.view;
    btn.style.display=(view==="ayarlar" || prefs[view]!==false)?"":"none";
  });
}
function setMenuVisibility(view, visible){
  if(view==="ayarlar") return;
  const prefs=menuVisibilityState();prefs[view]=!!visible;
  localStorage.setItem(MENU_VISIBILITY_KEY,JSON.stringify(prefs));
  applyMenuVisibility();renderSettingsMenuVisibility();
  const active=document.querySelector(".view.active");
  if(!visible && active && active.id===view) go("ayarlar");
}
function renderSettingsMenuVisibility(){
  const el=document.getElementById("settingsMenuVisibility");if(!el)return;
  const prefs=menuVisibilityState();
  el.innerHTML=Array.from(document.querySelectorAll("#menu button[data-view]")).map(btn=>{
    const view=btn.dataset.view, locked=view==="ayarlar";
    return '<label class="settings-menu-item" style="display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer">'+
      '<strong>'+btn.textContent.trim()+'</strong><input type="checkbox" '+(locked||prefs[view]!==false?'checked ':'')+
      (locked?'disabled title="Ayarlar gizlenemez"':'onchange="setMenuVisibility(\''+view+'\',this.checked)"')+'></label>';
  }).join("");
}
function resetMenuVisibility(){localStorage.removeItem(MENU_VISIBILITY_KEY);applyMenuVisibility();renderSettingsMenuVisibility();}
const MENU_ORDER_KEY = "cari_takip_menu_order_v1";

function saveMenuOrder(){
  const order = Array.from(document.querySelectorAll("#menu button")).map(b=>b.dataset.view);
  localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(order));
}

function loadMenuOrder(){
  const menu = document.getElementById("menu");
  if(!menu) return;

  const defaultOrder = Array.from(menu.querySelectorAll("button")).map(b=>b.dataset.view);
  let savedOrder = [];
  try { savedOrder = JSON.parse(localStorage.getItem(MENU_ORDER_KEY) || "[]"); } catch(e){ savedOrder = []; }

  // Yeni eklenen menüler eski kayıt içinde yoksa kaybolmasın
  let finalOrder = savedOrder.length ? savedOrder.filter(v=>defaultOrder.includes(v)) : [...defaultOrder];

  defaultOrder.forEach(v=>{
    if(!finalOrder.includes(v)){
      if(v === "teklifler" && finalOrder.includes("siparisler")){
        finalOrder.splice(finalOrder.indexOf("siparisler")+1, 0, v);
      } else {
        finalOrder.push(v);
      }
    }
  });

  const buttons = Array.from(menu.querySelectorAll("button"));
  const map = {};
  buttons.forEach(b=>map[b.dataset.view]=b);

  finalOrder.forEach(view=>{
    if(map[view]) menu.appendChild(map[view]);
  });

  localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(finalOrder));
}


loadMenuOrder();
applyMenuVisibility();



function ensureNewOrderFirmaEmpty(){
  if(editingOrderIndex === null && document.getElementById("s_firma")){
    s_firma.value = "";
  }
}


/* TATSAN stok modülü: kayıtlar mevcut state ile birlikte saklanır. */
function stockInit(){
 if(!state.stock || typeof state.stock!=='object') state.stock={locations:[],movements:[],limits:{}};
 if(!Array.isArray(state.stock.locations)) state.stock.locations=[];
 if(!Array.isArray(state.stock.movements)) state.stock.movements=[];
 if(!state.stock.limits) state.stock.limits={};
 return state.stock;
}
function stockSafe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function stockName(k){return (state.urunler||[]).find(p=>String(p.kod)===String(k))?.ad||String(k);}
function stockBalance(place,product){return stockInit().movements.filter(m=>m.place===place&&m.product===product).reduce((v,m)=>m.type==='adjust'?Number(m.qty):v+(m.type==='in'?1:-1)*Number(m.qty),0);}
function stockAddLocation(){
 const name=document.getElementById('st_location').value.trim(), type=document.getElementById('st_location_type').value, address=document.getElementById('st_address').value.trim();
 if(!name){alert('Konum adını girin.');return;}
 if(type==='Depo'&&!address){alert('Depo adresini girin.');return;}
 const st=stockInit();if(st.locations.some(l=>l.name.toLocaleLowerCase('tr')===name.toLocaleLowerCase('tr'))){alert('Bu konum zaten kayıtlı.');return;}
 st.locations.push({id:uid('LOC'),name,type,address,active:true});saveState();renderStock();document.getElementById('st_location').value='';document.getElementById('st_address').value='';
}
function stockToggleLocation(id){const l=stockInit().locations.find(x=>x.id===id);if(!l)return;l.active=!l.active;saveState();renderStock();}
function stockAddMovement(){
 const place=document.getElementById('st_place').value,product=document.getElementById('st_product').value,type=document.getElementById('st_type').value,qty=Number(document.getElementById('st_qty').value),note=document.getElementById('st_note').value.trim();
 if(!place||!product){alert('Ürün ve konum seçin.');return;}if(!Number.isFinite(qty)||qty<=0){alert('Sıfırdan büyük miktar girin.');return;}
 if(type==='out'&&stockBalance(place,product)<qty){alert('Yetersiz stok. Mevcut: '+stockBalance(place,product));return;}
 if(!confirm('Stok hareketi kaydedilsin mi?'))return;
 const movement={id:uid('STK'),date:new Date().toISOString(),place,product,type,qty,note};stockInit().movements.push(movement);businessLog('stock-add','Stok hareketi: '+stockName(product)+' / '+qty,{movementId:movement.id});saveState();renderStock();document.getElementById('st_qty').value='';document.getElementById('st_note').value='';
}
function stockSetLimit(product,value){const n=Number(value);if(!Number.isFinite(n)||n<0)return;stockInit().limits[product]=n;saveState();renderStock();}
function stockDeleteMovement(id){const st=stockInit(),m=st.movements.find(x=>x.id===id);if(!m||m.shipmentKey){alert('Sevkiyat kaynaklı hareketler buradan silinemez.');return;}if(!confirm('Bu stok hareketi silinsin mi?'))return;businessLog('stock-delete','Stok hareketi silindi: '+stockName(m.product),{movement:JSON.parse(JSON.stringify(m))});st.movements=st.movements.filter(x=>x.id!==id);saveState();renderAll();}
function renderStock(){
 const st=stockInit(),loc=st.locations,products=state.urunler||[];
 const a=document.getElementById('st_place');if(!a)return;
 const oldPlace=a.value,oldProduct=document.getElementById('st_product').value;
 a.innerHTML='<option value="">Konum seçin</option>'+loc.filter(l=>l.active).map(l=>`<option value="${stockSafe(l.id)}">${stockSafe(l.name)}</option>`).join('');a.value=oldPlace;
 const p=document.getElementById('st_product');p.innerHTML='<option value="">Ürün seçin</option>'+products.map(x=>`<option value="${stockSafe(x.kod)}">${stockSafe(x.kod)} - ${stockSafe(x.ad)}</option>`).join('');p.value=oldProduct;
 const ship=document.getElementById('st_ship_place');if(ship){const chosen=st.shipmentPlace||'';ship.innerHTML='<option value="">Sevkiyatta sor</option>'+loc.filter(l=>l.active).map(l=>`<option value="${stockSafe(l.id)}">${stockSafe(l.name)}</option>`).join('');ship.value=chosen;}
 document.getElementById('stockLocations').innerHTML='<table><thead><tr><th>Konum</th><th>Tür</th><th>Adres</th><th>Durum</th><th></th></tr></thead><tbody>'+loc.map(l=>`<tr><td>${stockSafe(l.name)}</td><td>${stockSafe(l.type)}</td><td>${stockSafe(l.address)}</td><td>${l.active?'Aktif':'Pasif'}</td><td><button class="btn" onclick="stockToggleLocation('${l.id}')">${l.active?'Pasifleştir':'Aktifleştir'}</button></td></tr>`).join('')+'</tbody></table>';
 const combos=[];for(const l of loc)for(const prod of products){const qty=stockBalance(l.id,String(prod.kod));const hasMovement=st.movements.some(m=>m.place===l.id&&m.product===String(prod.kod));if(qty||hasMovement)combos.push({l,prod,qty});}
 const critical=combos.filter(x=>x.qty<=Number(st.limits[x.prod.kod]||0));
 document.getElementById('stockLocationCount').textContent=loc.filter(x=>x.active).length;
 document.getElementById('stockProductCount').textContent=new Set(combos.filter(x=>x.qty>0).map(x=>x.prod.kod)).size;
 document.getElementById('stockCriticalCount').textContent=critical.length;
 document.getElementById('stockBalances').innerHTML=combos.length?combos.map(x=>`<tr><td>${stockSafe(x.l.name)}</td><td>${stockSafe(x.prod.ad)}</td><td>${stockSafe(x.prod.birim||'Koli')}</td><td>${x.qty.toLocaleString('tr-TR')}</td><td><input aria-label="Kritik stok seviyesi" type="number" min="0" step="0.001" style="width:100px" value="${Number(st.limits[x.prod.kod]||0)}" onchange="stockSetLimit('${stockSafe(x.prod.kod)}',this.value)"></td><td>${x.qty<=Number(st.limits[x.prod.kod]||0)?'⚠ Kritik':'Normal'}</td></tr>`).join(''):'<tr><td colspan="6">Henüz stok hareketi yok.</td></tr>';
 document.getElementById('stockMovements').innerHTML=st.movements.slice().reverse().slice(0,200).map(m=>`<tr><td>${new Date(m.date).toLocaleString('tr-TR')}</td><td>${stockSafe(loc.find(l=>l.id===m.place)?.name||'Silinmiş konum')}</td><td>${stockSafe(stockName(m.product))}</td><td>${m.type==='in'?'Giriş':m.type==='out'?'Çıkış':'Sayım'}</td><td>${m.qty}</td><td>${stockSafe(m.note)}</td><td><button class="btn" onclick="stockDeleteMovement('${m.id}')">Sil</button></td></tr>`).join('');
}


/* Müşteri iadeleri: kayıtlar ana state içinde tutulur, Drive JSON ile birlikte aktarılır. */
function returnInit(){if(!Array.isArray(state.customerReturns))state.customerReturns=[];return state.customerReturns;}
function returnUpdateOrders(){
 const firm=document.getElementById('ret_firm')?.value||'',sel=document.getElementById('ret_order');if(!sel)return;
 sel.innerHTML='<option value="">Sipariş seçilmedi</option>'+(state.orders||[]).filter(o=>String(o.firma)===firm).map(o=>'<option value="'+stockSafe(o.no)+'">'+stockSafe(o.no)+' - '+stockSafe(o.tarih||'')+'</option>').join('');
}
function renderReturns(){
 const firm=document.getElementById('ret_firm');if(!firm)return;
 const old=firm.value;firm.innerHTML='<option value="">Firma seçin</option>'+(state.firmalar||[]).map(f=>'<option value="'+stockSafe(f.ad)+'">'+stockSafe(f.ad)+'</option>').join('');firm.value=old;returnUpdateOrders();
 const prod=document.getElementById('ret_product'),oldProd=prod.value;prod.innerHTML='<option value="">Ürün seçin</option>'+(state.urunler||[]).map(p=>'<option value="'+stockSafe(p.kod)+'">'+stockSafe(p.ad)+'</option>').join('');prod.value=oldProd;
 const place=document.getElementById('ret_place'),oldPlace=place.value;place.innerHTML='<option value="">Depo seçin (satılabilir iadede zorunlu)</option>'+stockInit().locations.filter(l=>l.active).map(l=>'<option value="'+stockSafe(l.id)+'">'+stockSafe(l.name)+'</option>').join('');place.value=oldPlace;
 const names={pending:'Karar bekliyor',credit:'Cari mahsup (manuel)',refund:'Para iadesi (manuel)',replace:'Ürün değişimi (manuel)'};
 document.getElementById('returnRows').innerHTML=returnInit().slice().reverse().map(r=>{
 const actions=r.status==='Talep'?`<button class="btn" onclick="returnApprove('${r.id}')">Kontrol Et / Onayla</button> <button class="btn danger" onclick="returnReject('${r.id}')">Reddet</button>`:(r.status==='Onaylandı'&&!r.financeDone&&r.finance!=='pending'?`<button class="btn" onclick="returnFinanceDone('${r.id}')">Finans Aksiyonu Tamamlandı</button>`:'—');
 return `<tr><td>${stockSafe(r.date.slice(0,10))}<div>${stockSafe(r.id)}</div></td><td>${stockSafe(r.firm)}<div>${stockSafe(stockName(r.product))}</div></td><td>${stockSafe(r.qty)}</td><td>${stockSafe(r.reason)}<div>${stockSafe(r.status)}</div></td><td>${stockSafe(names[r.finance]||r.finance)}<div>${Number(r.amount||0).toLocaleString('tr-TR')} ₺</div><div>${r.financeDone?'Tamamlandı':'Bekliyor'}</div></td><td>${actions}</td></tr>`;
 }).join('')||'<tr><td colspan="6">Henüz iade kaydı yok.</td></tr>';
}
function returnCreate(){
 const firm=document.getElementById('ret_firm').value,product=document.getElementById('ret_product').value,qty=Number(document.getElementById('ret_qty').value),condition=document.getElementById('ret_condition').value,place=document.getElementById('ret_place').value,amount=Number(document.getElementById('ret_amount').value);
 if(!firm||!product||!Number.isFinite(qty)||qty<=0)return alert('Firma, ürün ve geçerli miktar zorunludur.');
 if(!Number.isFinite(amount)||amount<0)return alert('Geçerli bir tutar girin.');
 if(condition==='saleable'&&!place)return alert('Satılabilir ürün için kabul deposu seçin.');
 const r={id:uid('IAD'),date:new Date().toISOString(),firm,orderNo:document.getElementById('ret_order').value,product,qty,reason:document.getElementById('ret_reason').value,condition,place,finance:document.getElementById('ret_finance').value,amount,note:document.getElementById('ret_note').value.trim(),status:'Talep',financeDone:false};
 if(!confirm('İade talebi oluşturulsun mu? Henüz stok ve cari hesap değişmeyecek.'))return;
 returnInit().push(r);businessLog('return-request','İade talebi: '+firm+' / '+stockName(product)+' / '+qty,{returnId:r.id});saveState();renderAll();
}
function returnApprove(id){
 const r=returnInit().find(x=>x.id===id);if(!r||r.status!=='Talep')return;
 if(r.condition==='saleable'){
  if(!stockInit().locations.some(l=>l.id===r.place&&l.active))return alert('Kabul deposu aktif değil. Yeni bir talep oluşturun.');
 }
 const desc=r.condition==='saleable'?'Satılabilir stoğa '+r.qty+' birim eklenecek.':r.condition==='quarantine'?'Ürün karantinada tutulacak; satılabilir stok artmayacak.':'Ürün imha/hurda olarak işaretlenecek; satılabilir stok artmayacak.';
 if(!confirm(desc+' İade onaylansın mı?'))return;
 if(r.condition==='saleable'){
  const movement={id:uid('STK'),date:new Date().toISOString(),place:r.place,product:String(r.product),type:'in',qty:r.qty,note:'Onaylı müşteri iadesi '+r.id,returnId:r.id};stockInit().movements.push(movement);r.movementId=movement.id;
 }
 r.status='Onaylandı';r.approvedAt=new Date().toISOString();businessLog('return-approve','İade onayı: '+r.id,{returnId:r.id});saveState();renderAll();
}
function returnReject(id){const r=returnInit().find(x=>x.id===id);if(!r||r.status!=='Talep')return;if(!confirm('İade talebi reddedilsin mi?'))return;r.status='Reddedildi';businessLog('return-reject','İade reddedildi: '+r.id,{returnId:r.id});saveState();renderAll();}
function returnFinanceDone(id){const r=returnInit().find(x=>x.id===id);if(!r||r.status!=='Onaylandı'||r.financeDone||r.finance==='pending')return;if(!confirm('Finansal aksiyonun HARİCEN tamamlandığını onaylıyor musunuz? Bu işlem cari bakiye veya tahsilat kaydı oluşturmaz.'))return;r.financeDone=true;r.financeDoneAt=new Date().toISOString();businessLog('return-finance','İade finans aksiyonu tamamlandı: '+r.id,{returnId:r.id});saveState();renderAll();}

/* Ek modüller: sadece desteklenen işlemlerde kontrollü geri alma */
function businessInit(){if(!state.businessExtra||typeof state.businessExtra!=='object')state.businessExtra={history:[]};if(!Array.isArray(state.businessExtra.history))state.businessExtra.history=[];return state.businessExtra;}
function businessLog(type,description,data){const h=businessInit().history;h.push({id:uid('HST'),date:new Date().toISOString(),type,description,data,undone:false});if(h.length>300)h.splice(0,h.length-300);}
