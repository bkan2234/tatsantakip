function setProductEditMode(product){
  editingProductUid = productEditIdentity(product);
  const btn = document.getElementById("saveUrunBtn");
  const cancelBtn = document.getElementById("cancelUrunEditBtn");
  if(btn) btn.textContent = "Ürünü Güncelle";
  if(cancelBtn) cancelBtn.classList.remove("hide");
}

function resetProductEditMode(){
  editingProductUid = null;
  const btn = document.getElementById("saveUrunBtn");
  const cancelBtn = document.getElementById("cancelUrunEditBtn");
  if(btn) btn.textContent = "+ Ürün Kaydet";
  if(cancelBtn) cancelBtn.classList.add("hide");
}

function cancelUrunEdit(){
  clearUrunForm();
}

function saveUrun(){
  normalizeProductOrder();
  const kod=u_kod.value.trim(), ad=u_ad.value.trim();
  if(!kod||!ad) return alert("Ürün kodu ve adı zorunlu.");

  const editIndex = editingProductUid
    ? state.urunler.findIndex(x=>productEditIdentity(x)===String(editingProductUid))
    : -1;

  const duplicateIndex = state.urunler.findIndex(x=>String(x.kod||"")===kod);
  if(duplicateIndex >= 0 && duplicateIndex !== editIndex){
    return alert("Bu ürün kodu başka bir üründe kayıtlı. Farklı ürün kodu yazınız.");
  }

  const old = editIndex >= 0 ? state.urunler[editIndex] : (duplicateIndex >= 0 ? state.urunler[duplicateIndex] : null);
  const siraNo = Number(document.getElementById("u_sira") ? u_sira.value : 0) || old?.sira || ((state.urunler||[]).length + 1);

  const obj={
    kod,
    uid: old?.uid || kod,
    sira: siraNo,
    ad,
    kat:u_kat.value,
    birim:u_birim.value,
    koli:parseInt(u_koli.value)||1,
    koliPaket:parseInt(u_koli_paket.value)||1,
    paketAdet:parseInt(u_paket_adet.value)||1,
    fiyat:Number(u_fiyat.value)||0,
    koliFiyat:Number(u_koli_fiyat.value)||0,
    paketFiyat:Number(u_paket_fiyat.value)||0,
    koliKg:Number(u_koli_kg.value)||0,
    paketKg:Number(u_paket_kg.value)||0,
    koliKgFiyat:Number(u_koli_kg_fiyat.value)||0,
    paketKgFiyat:Number(u_paket_kg_fiyat.value)||0,
    toplamKg:Number(u_kg.value)||0,
    adetFiyat:Number(u_adet_fiyat.value)||0,
    kgFiyat:Number(u_kg_fiyat.value)||0,
    durum:u_durum.value,
    noDisc:u_noDisc.value==="true",
    image: pendingProductImage !== null ? pendingProductImage : (old?.image || ""),
    not:u_not.value
  };

  if(editIndex>=0){
    state.urunler[editIndex]=obj;
    alert("Ürün güncellendi.");
  }else if(duplicateIndex>=0){
    state.urunler[duplicateIndex]=obj;
    alert("Ürün güncellendi.");
  }else{
    state.urunler.push(obj);
    alert("Ürün kaydedildi.");
  }

  normalizeProductOrder();
  saveState();
  clearUrunForm();
  renderAll();
}

function clearUrunForm(){
  pendingProductImage = null;
  if(document.getElementById("u_resim")) u_resim.value="";
  if(document.getElementById("u_resim_info")) u_resim_info.textContent="Resim seçilmedi";
  u_kod.value="";
  if(document.getElementById("u_sira")) u_sira.value=(state.urunler||[]).length+1;
  u_ad.value="";
  if(document.getElementById("u_kat") && u_kat.options.length) u_kat.selectedIndex=0;
  u_birim.value="Adet";
  u_koli.value=1;
  u_koli_paket.value=1;
  u_paket_adet.value=1;
  u_fiyat.value=0;
  u_adet_fiyat.value=0;
  u_kg.value=0;
  u_kg_fiyat.value=0;
  ["u_koli_fiyat","u_paket_fiyat","u_koli_kg","u_paket_kg","u_koli_kg_fiyat","u_paket_kg_fiyat"].forEach(id=>{const el=document.getElementById(id);if(el)el.value=0;});
  u_durum.value="Aktif";
  u_noDisc.value="false";
  u_not.value="";
  resetProductEditMode();
  updateCatalogCalculatedPrices();
}

function normalizeProductOrder(){
  if(!state.urunler) state.urunler = [];
  state.urunler.forEach((u,idx)=>{
    if(!u.uid) u.uid = u.kod ? String(u.kod) : ("URUN-" + (idx+1) + "-" + Math.random().toString(16).slice(2,8));
    if(!Number.isFinite(Number(u.sira)) || Number(u.sira) <= 0) u.sira = idx + 1;
  });
  state.urunler.sort((a,b)=>(Number(a.sira)||999999)-(Number(b.sira)||999999) || String(a.ad||"").localeCompare(String(b.ad||""),"tr"));
  state.urunler.forEach((u,idx)=>{ u.sira = idx + 1; });
}

function sortedProducts(list){
  normalizeProductOrder();
  const arr = Array.isArray(list) ? list.slice() : (state.urunler||[]).slice();
  return arr.sort((a,b)=>(Number(a.sira)||999999)-(Number(b.sira)||999999) || String(a.ad||"").localeCompare(String(b.ad||""),"tr"));
}

function clearUrunFilters(){
  if(document.getElementById("uf_search")) uf_search.value="";
  if(document.getElementById("uf_cat")) uf_cat.value="";
  if(document.getElementById("uf_unit")) uf_unit.value="";
  if(document.getElementById("uf_status")) uf_status.value="Aktif";
  if(document.getElementById("uf_disc")) uf_disc.value="";
  renderUrunler();
}

function moveProductOrder(kod, direction){
  normalizeProductOrder();
  const idx = state.urunler.findIndex(u=>String(u.kod||"")===String(kod||""));
  if(idx < 0) return;
  const newIdx = idx + direction;
  if(newIdx < 0 || newIdx >= state.urunler.length) return;
  const temp = state.urunler[idx];
  state.urunler[idx] = state.urunler[newIdx];
  state.urunler[newIdx] = temp;
  state.urunler.forEach((u,i)=>{ u.sira = i + 1; });
  saveState();
  renderAll();
}

function productOrderButtons(kod){
  const safeKod = String(kod||"").replace(/'/g,"\\'");
  return `<button class="btn mini-order-btn" onclick="moveProductOrder('${safeKod}',-1)">Yukarı</button>
          <button class="btn mini-order-btn" onclick="moveProductOrder('${safeKod}',1)">Aşağı</button>`;
}


function ensureDefaultActiveFilters(){
  const uf = document.getElementById("uf_status");
  if(uf && (!uf.value || uf.value === "")) uf.value = "Aktif";
  const kf = document.getElementById("kf_status");
  if(kf && (!kf.value || kf.value === "")) kf.value = "Aktif";
}

function renderUrunler(){
  normalizeProductOrder();
  const q=(document.getElementById("uf_search")?.value || "").toLowerCase();
  const cat=document.getElementById("uf_cat")?.value || "";
  const unit=document.getElementById("uf_unit")?.value || "";
  const status=document.getElementById("uf_status")?.value || "Aktif";
  const disc=document.getElementById("uf_disc")?.value || "";

  const rows = sortedProducts(state.urunler).filter(u=>{
    const hay=String((u.kod||"")+(u.ad||"")+(u.kat||"")).toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(cat && u.kat!==cat) return false;
    if(unit && u.birim!==unit) return false;
    const effStatus = effectiveProductStatus(u);
    if(status==="Aktif" && effStatus!=="Aktif") return false;
    if(status==="Pasif" && effStatus==="Aktif") return false;
    if(disc==="yes" && u.noDisc) return false;
    if(disc==="no" && !u.noDisc) return false;
    return true;
  });

  urunList.innerHTML = rows.map(u=>`<tr>
    <td class="product-order-cell">
      <div class="product-order-no">${Number(u.sira)||0}</div>
      <div class="product-order-buttons">${productOrderButtons(u.kod)}</div>
    </td>
    <td class="product-code-cell">${u.kod||""}</td>
    <td class="product-name-cell">${u.ad||""}</td>
    <td class="product-category-cell">${u.kat||""}</td>
    <td class="product-unit-cell">${u.birim||""}</td>
    <td class="money">${Number(u.koli)||0}</td>
    <td class="money">${money(Number(u.fiyat)||0)}</td>
    <td class="money">${money(Number(u.adetFiyat)||0)}</td>
    <td class="money">${money(Number(u.kgFiyat)||0)}</td>
    <td class="product-discount-cell">${u.noDisc?'<span class="badge b-red">İskonto Yok</span>':'<span class="badge b-green">Uygulanır</span>'}</td>
    <td class="product-status-cell">${effectiveProductStatus(u)==="Kategori Pasif"?'<span class="badge b-red">Kategori Pasif</span>':(u.durum||"")}</td>
    <td class="product-action-cell"><div class="table-actions"><button class="btn" onclick="editUrun('${u.uid || u.kod}')">Düzenle</button> <button class="btn danger" onclick="delUrun('${u.kod}')">Sil</button></div></td>
  </tr>`).join("") || `<tr><td colspan="12" class="muted">Kayıt bulunamadı</td></tr>`;
}

function editUrun(kod){
  normalizeProductOrder();
  const u=state.urunler.find(x=>String(x.kod||"")===String(kod||"") || String(x.uid||"")===String(kod||""));
  if(!u)return;
  u_kod.value=u.kod||"";
  if(document.getElementById("u_sira")) u_sira.value=Number(u.sira)||1;
  u_ad.value=u.ad||"";
  u_kat.value=u.kat||"";
  u_birim.value=u.birim||"Adet";
  u_koli.value=Number(u.koli)||1;
  u_koli_paket.value=Number(u.koliPaket)||1;
  u_paket_adet.value=Number(u.paketAdet)||(u.birim==="Paket"?Number(u.koli)||1:1);
  u_fiyat.value=Number(u.fiyat)||0;
  u_kg.value=Number(u.toplamKg)||0;
  u_koli_fiyat.value=Number(u.koliFiyat)||(u.birim==="Koli"?Number(u.fiyat)||0:0);
  u_paket_fiyat.value=Number(u.paketFiyat)||(u.birim==="Paket"?Number(u.fiyat)||0:0);
  u_koli_kg.value=Number(u.koliKg)||0;
  u_paket_kg.value=Number(u.paketKg)||0;
  updateCatalogCalculatedPrices();
  u_durum.value=u.durum||"Aktif";
  u_noDisc.value=String(!!u.noDisc);
  pendingProductImage = u.image || "";
  if(document.getElementById("u_resim_info")) u_resim_info.textContent = u.image ? "Kayıtlı resim var" : "Resim seçilmedi";
  u_not.value=u.not||"";
  setProductEditMode(u);
  u_kod.scrollIntoView({behavior:"smooth", block:"center"});
}
function delUrun(kod){if(confirm("Ürün silinsin mi?")){state.urunler=state.urunler.filter(x=>x.kod!==kod);saveState();renderAll();}}

let orderSelected = {};
let editingOrderIndex = null;

function hasOrderFirmaSelected(){
  const el = document.getElementById("s_firma");
  return !!(el && String(el.value||"").trim());
}

function updateOrderProductVisibility(){
  const card = document.getElementById("orderProductsCard");
  const placeholder = document.getElementById("orderProductPlaceholder");
  const show = hasOrderFirmaSelected();

  if(card) card.classList.toggle("hide", !show);
  if(placeholder) placeholder.classList.toggle("hide", show);

  return show;
}

function scrollOrderProductsIfReady(){
  if(!hasOrderFirmaSelected()){
    alert("Önce firma seçiniz. Firma seçilince ürün seçimi açılır.");
    const info = document.getElementById("orderInfoCard");
    if(info) info.scrollIntoView({behavior:"smooth", block:"start"});
    return;
  }
  updateOrderProductVisibility();
  scrollOrderArea("orderProductsCard");
}

function orderFirmaChanged(){
  const f = state.firmalar.find(x=>x.ad===s_firma.value);
  if(f){
    s_vade.value = f.vade || 0;
    s_iskonto.value = f.iskonto || "0";
    s_manual_disc.value = f.manualDisc || "";
    toggleOrderManualDiscount();
    updateVadeDate();
  }else{
    s_vade.value = 0;
    s_iskonto.value = "0";
    s_manual_disc.value = "";
    toggleOrderManualDiscount();
    updateVadeDate();
  }
  renderOrderProducts();
  updateOrderProductVisibility();
}

function updateVadeDate(){
  if(!document.getElementById("s_tarih")) return;
  s_vade_tarih.value = addDaysISO(s_tarih.value || todayISO(), s_vade.value);
}

function normalizeSearchText(value){
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/ı/g,"i")
    .trim();
}

function renderOrderProducts(){
  renderCustomerFavoriteProducts();
  if(!document.getElementById("orderProductList")) return;
  const filter = document.getElementById("s_kat_filter") ? s_kat_filter.value : "";
  const search = normalizeSearchText(document.getElementById("s_product_search")?.value || "");
  const selectedOnly = document.getElementById("s_selected_filter") ? s_selected_filter.value === "selected" : false;
  const isk = document.getElementById("s_iskonto") ? s_iskonto.value : "0";
  const manualDisc = manualDiscountValue("s_manual_disc");
  const products = sortedProducts(state.urunler||[]).filter((u,idx)=>{
    if(!isProductActiveForUse(u)) return false;
    const key = productKey(u, idx);
    if(selectedOnly && !(orderSelected[key] && orderSelected[key].checked)) return false;
    if(filter && u.kat!==filter) return false;
    const hay = normalizeSearchText((u.kod||"") + " " + (u.ad||"") + " " + (u.kat||""));
    if(search && !hay.includes(search)) return false;
    return true;
  });

  orderProductList.innerHTML = products.map((u,idx)=>{
    const key = productKey(u, idx);
    const safeKey = escapeJsText(key);
    const sel = orderSelected[key] || {checked:false,qty:1,birim:(u.birim||"Koli")};
    const qty = parseInt(sel.qty)||1;
    const selectedUnit = sel.birim || u.birim || "Koli";
    const c = calcOrderLine(u, sel, isk, manualDisc);
    const iskText = (u.noDisc || sel.noDiscount) ? '<span class="badge b-red">İskonto Yok</span>' : (isk==="Manuel" ? manualDiscountText(manualDisc) : isk);
    return `<tr>
      <td class="checkcell"><input type="checkbox" data-product-key="${safeKey}" ${sel.checked?'checked':''} onchange="toggleOrderProduct('${safeKey}',this.checked)"></td>
      <td>${u.kod||""}</td>
      <td>${u.ad||""}</td>
      <td>${u.kat||""}</td>
      <td>${unitSelectHtml("order",key,selectedUnit)}</td>
      <td>${Number(u.koli)||0}</td>
      <td><input class="num" type="number" min="0" step="0.01" value="${sel.manualPrice!==undefined && sel.manualPrice!==null ? sel.manualPrice : ''}" placeholder="${Number(c.normalUnitPrice||0).toFixed(2)}" title="Boş bırakırsanız ürün kartındaki fiyat kullanılır" onchange="setOrderManualPrice('${safeKey}',this.value)"></td>
      <td>${lastCustomerProductPriceHtml(s_firma.value,u)}</td>
      <td><input class="num" type="number" min="1" step="1" value="${qty}" onchange="setOrderQty('${safeKey}',this.value)"></td>
      <td><label style="display:flex;align-items:center;gap:6px;white-space:nowrap"><input type="checkbox" ${sel.noDiscount?'checked':''} onchange="setOrderNoDiscount('${safeKey}',this.checked)"> İsk. Yok</label><div style="margin-top:4px">${iskText}</div></td>
      <td class="money">${sel.checked?money(c.total):money(0)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="11" class="muted">Aktif ürün yok</td></tr>`;

  renderOrderSummary();
}

function toggleOrderProduct(key,checked){
  if(!orderSelected[key]) orderSelected[key]={checked:false,qty:1,birim:(findProductBySelectionKey(key)?.birim||"Koli")};
  orderSelected[key].checked=checked;
  renderOrderProducts();
}

function setOrderQty(key,val){
  if(!orderSelected[key]) orderSelected[key]={checked:true,qty:1,birim:(findProductBySelectionKey(key)?.birim||"Koli")};
  orderSelected[key].qty=parseInt(val)||1;
  renderOrderProducts();
}

function setOrderManualPrice(key,val){
  if(!orderSelected[key]) orderSelected[key]={checked:true,qty:1,birim:(findProductBySelectionKey(key)?.birim||"Koli")};
  const raw = String(val ?? "").trim().replace(",", ".");
  orderSelected[key].manualPrice = raw === "" ? null : Math.max(0, Number(raw)||0);
  renderOrderProducts();
}

function setOrderNoDiscount(key,checked){
  if(!orderSelected[key]) orderSelected[key]={checked:true,qty:1,birim:(findProductBySelectionKey(key)?.birim||"Koli")};
  orderSelected[key].noDiscount = !!checked;
  renderOrderProducts();
}

function renderOrderSummary(){
  if(!document.getElementById("os_brut")) return;
  const isk = document.getElementById("s_iskonto") ? s_iskonto.value : "0";
  const manualDisc = manualDiscountValue("s_manual_disc");
  let brut=0, disc=0, kdv=0, total=0;

  Object.entries(orderSelected||{}).forEach(([key,sel])=>{
    if(!sel.checked) return;
    const p=findProductBySelectionKey(key);
    if(!p) return;
    const c=calcOrderLine(p, sel, isk, manualDisc);
    brut += c.brut;
    disc += c.disc;
    kdv += c.kdv;
    total += c.total;
  });

  os_brut.textContent=money(brut);
  os_disc.textContent=money(disc);
  os_kdv.textContent=money(kdv);
  os_total.textContent=money(total);
}

function buildOrderFromForm(requireItems){
  const items=[];
  let total=0, brut=0, disc=0, kdv=0;
  const isk = s_iskonto.value || "0";
  const manualDisc = manualDiscountValue("s_manual_disc");

  Object.entries(orderSelected||{}).forEach(([key,sel])=>{
    if(!sel.checked) return;
    const p=findProductBySelectionKey(key);
    if(!p) return;
    const qty = parseInt(sel.qty)||1;
    const selectedUnit = sel.birim || p.birim || "Koli";
    const c=calcOrderLine(p, sel, isk, manualDisc);
    items.push({
      kod:p.kod,
      ad:p.ad,
      kat:p.kat,
      birim:selectedUnit,
      qty:qty,
      fiyat:c.unitPrice,
      normalFiyat:c.normalUnitPrice,
      manuelFiyat:c.manualPrice,
      iskontoGecersiz:!!sel.noDiscount,
      noDisc:!!(p.noDisc || sel.noDiscount),
      brut:c.brut,
      disc:c.disc,
      net:c.net,
      kdv:c.kdv,
      total:c.total
    });
    brut+=c.brut;
    disc+=c.disc;
    kdv+=c.kdv;
    total+=c.total;
  });

  if(!s_firma.value){
    alert("Firma seçiniz.");
    return null;
  }
  if(requireItems && !items.length){
    alert("En az bir ürün seçiniz.");
    return null;
  }

  return {
    no:s_no.value||uid("SIP"),
    tarih:s_tarih.value||todayISO(),
    firma:s_firma.value,
    vade:parseInt(s_vade.value)||0,
    vadeTarih:s_vade_tarih.value,
    iskonto:isk,
    manualDisc:manualDisc,
    durum:s_durum.value,
    kargoFirma:s_kargo_firma.value,
    kargoNo:s_kargo_no.value,
    kargoDurum:s_kargo_durum.value,
    aciklama:s_aciklama.value,
    items:items,
    brut:brut,
    disc:disc,
    kdv:kdv,
    total:total
  };
}

function openOrderDraftInvoicePdf(){
  const obj = buildOrderFromForm(true);
  if(!obj) return;
  obj.no = obj.no || "ÖNİZLEME";
  const html = invoicePdfHtml(null, obj);
  if(!html) return alert("Fatura görseli hazırlanamadı.");
  const w = window.open("", "_blank");
  if(!w){
    alert("Fatura penceresi açılamadı. Tarayıcı pop-up iznini kontrol edin.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function saveOrderDraft(){
  const obj = buildOrderFromForm(true);
  if(!obj) return;

  obj.durum = "Taslak";

  if(editingOrderIndex !== null && state.orders[editingOrderIndex]){
    const previous=state.orders[editingOrderIndex];
    if((previous.sevkler||[]).some(sh=>sh.id&&stockInit().movements.some(m=>m.shipmentKey===sh.id))){alert('Stoktan düşülmüş sevkiyatı bulunan sipariş düzenlenemez. Önce İşlem Geçmişi üzerinden sevkiyatı geri alın.');return;}
    state.orders[editingOrderIndex] = obj;
    alert("Sipariş taslak olarak güncellendi.");
  } else {
    state.orders.push(obj);
    alert("Sipariş taslak olarak kaydedildi.");
  }

  saveState();
  clearOrderForm();
  renderAll();
}

function saveOrder(){
  const obj = buildOrderFromForm(true);
  if(!obj) return;

  if(editingOrderIndex !== null && state.orders[editingOrderIndex]){
    const previous=state.orders[editingOrderIndex];
    if((previous.sevkler||[]).some(sh=>sh.id&&stockInit().movements.some(m=>m.shipmentKey===sh.id))){alert('Stoktan düşülmüş sevkiyatı bulunan sipariş düzenlenemez. Önce İşlem Geçmişi üzerinden sevkiyatı geri alın.');return;}
    state.orders[editingOrderIndex] = obj;
    alert("Sipariş güncellendi.");
  } else {
    obj.durum = "Onay Bekliyor";
    obj.onayTarihi = "";
    state.orders.push(obj);
    alert("Sipariş kaydedildi ve onay bekliyor.");
  }

  saveState();
  clearOrderForm();
  renderAll();
}

function clearOrderForm(){
  editingOrderIndex = null;
  orderSelected = {};
  s_no.value="SIP-"+String(state.orders.length+1).padStart(4,"0");
  s_tarih.value=todayISO();
  if(document.getElementById("s_firma_search")) s_firma_search.value="";
  renderOrderFirmaSelect();
  if(document.getElementById("s_firma")) s_firma.value="";
  orderFirmaChanged();
  s_durum.value="Onay Bekliyor";
  s_kargo_firma.value="";
  s_kargo_no.value="";
  s_kargo_durum.value="Yok";
  s_aciklama.value="";
  const btn = document.getElementById("saveOrderBtn");
  const draftBtn = document.getElementById("saveOrderDraftBtn");
  const cancelBtn = document.getElementById("cancelOrderEditBtn");
  if(btn) btn.textContent = "Siparişi Kaydet";
  if(draftBtn) draftBtn.textContent = "Taslak Olarak Kaydet";
  if(cancelBtn) cancelBtn.classList.add("hide");
  if(document.getElementById("s_product_search")) s_product_search.value = "";
  if(document.getElementById("s_selected_filter")) s_selected_filter.value = "";
  renderOrderProducts();
  if(document.getElementById("s_firma")) s_firma.value="";

  updateOrderProductVisibility();
}

function editOrder(i){
  const o = state.orders[i];
  if(!o) return;

  editingOrderIndex = i;
  orderSelected = {};

  s_no.value = o.no || "";
  s_tarih.value = o.tarih || todayISO();
  if(document.getElementById("s_firma_search")) s_firma_search.value = "";
  renderOrderFirmaSelect();
  s_firma.value = o.firma || "";
  s_vade.value = o.vade || 0;
  s_vade_tarih.value = o.vadeTarih || "";
  s_iskonto.value = o.iskonto || "0";
  s_manual_disc.value = o.manualDisc || "";
  toggleOrderManualDiscount();
  s_durum.value = o.durum || "Beklemede";
  s_kargo_firma.value = o.kargoFirma || "";
  s_kargo_no.value = o.kargoNo || "";
  s_kargo_durum.value = o.kargoDurum || "Yok";
  s_aciklama.value = o.aciklama || "";

  (o.items || []).forEach(item=>{
    orderSelected[item.kod] = {
      checked: true,
      qty: parseInt(item.qty)||1,
      birim: item.birim || "Koli",
      manualPrice: item.manuelFiyat !== undefined && item.manuelFiyat !== null ? item.manuelFiyat : null,
      noDiscount: !!item.iskontoGecersiz
    };
  });

  const btn = document.getElementById("saveOrderBtn");
  const draftBtn = document.getElementById("saveOrderDraftBtn");
  const cancelBtn = document.getElementById("cancelOrderEditBtn");
  if(btn) btn.textContent = "Siparişi Güncelle";
  if(draftBtn) draftBtn.textContent = "Taslak Olarak Güncelle";
  if(cancelBtn) cancelBtn.classList.remove("hide");

  renderOrderProducts();
  updateOrderProductVisibility();
  document.getElementById("siparisler").scrollIntoView({behavior:"smooth", block:"start"});
}
function cancelOrderEdit(){
  clearOrderForm();
}

function goOpenOrders(){
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
    if(status) status.value = "__open";

    renderOrders();

    const list = document.getElementById("orderList");
    if(list) list.scrollIntoView({behavior:"smooth", block:"center"});
  }, 60);
}


function clearOrderFilters(){
  ["of_search","of_firma","of_status","of_start","of_end"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = "";
  });
  renderOrders();

  const list = document.getElementById("orderListCard") || document.getElementById("orderList");
  if(list) list.scrollIntoView({behavior:"smooth", block:"center"});
}


const ORDER_STATUS_OPTIONS = ["Onay Bekliyor","Onaylandı","Beklemede","Hazırlanıyor","Hazır","Sevk Edildi","Teslim Edildi","Tamamlandı","Taslak","İptal"];

function orderStatusSelectHtml(index, currentStatus){
  const current = currentStatus || "Beklemede";
  return `<select class="order-status-select" onchange="updateOrderStatus(${index}, this.value)" title="Sipariş durumunu değiştir">
    ${ORDER_STATUS_OPTIONS.map(s=>`<option value="${s}" ${s===current ? "selected" : ""}>${s}</option>`).join("")}
  </select>`;
}

function updateOrderStatus(index, newStatus){
  const order = (state.orders||[])[index];
  if(!order){
    alert("Sipariş bulunamadı.");
    return;
  }
  if(!ORDER_STATUS_OPTIONS.includes(newStatus)){
    alert("Geçersiz sipariş durumu.");
    renderOrders();
    return;
  }

  if(['İptal','Taslak'].includes(newStatus)&&(order.sevkler||[]).some(sh=>sh.id&&stockInit().movements.some(m=>m.shipmentKey===sh.id))){alert('Stoktan düşülmüş sevkiyat var. Önce İşlem Geçmişi üzerinden sevkiyatı geri alın.');renderOrders();return;}
  order.durum = newStatus;
  saveState();
  renderAll();
}


function normalizeWhatsAppPhone(phone){
  let digits = String(phone||"").replace(/\D/g,"");
  if(!digits) return "";
  if(digits.startsWith("00")) digits = digits.slice(2);
  if(digits.startsWith("90")) return digits;
  if(digits.length === 11 && digits.startsWith("0")) return "90" + digits.slice(1);
  if(digits.length === 10 && digits.startsWith("5")) return "90" + digits;
  return digits;
}

function getFirmPhoneForWhatsapp(firmaAd){
  const f = (state.firmalar||[]).find(x=>x.ad===firmaAd);
  return f ? (f.tel || f.telefon || f.gsm || "") : "";
}


function getFirmForWhatsapp(firmaAd){
  return (state.firmalar||[]).find(x=>x.ad===firmaAd) || null;
}

function orderDiscountText(order, firma){
  const discount = order && order.iskonto ? order.iskonto : (firma && firma.iskonto ? firma.iskonto : "");
  if(discount === "Manuel"){
    const manual = String((order && order.manualDisc) || (firma && firma.manualDisc) || "").trim();
    return manualDiscountText(manual);
  }
  return discount || "-";
}

function firmContactLinesForWhatsapp(firma){
  const vergiNo = (firma && (firma.vergi || firma.vno || firma.vergiNo || firma.taxNo)) || "";
  const teslimat = (firma && (firma.sevk || firma.teslimatAdres || firma.teslimat || firma.sevkiyatAdres)) || "";
  return [
    `VERGİ NO: ${vergiNo || ""}`,
    `Telefon: ${(firma && firma.tel) || ""}`,
    `Mail: ${(firma && firma.mail) || ""}`,
    `Adres: ${(firma && firma.adres) || ""}`,
    `Teslimat Adresi: ${teslimat || ""}`
  ];
}

function orderWhatsappMessage(order){
  const firma = getFirmForWhatsapp(order.firma);
  const lines = [];

  lines.push(`Tarih: ${order.tarih ? trDate(order.tarih) : "-"}`);
  lines.push(`Cari Adı: ${order.firma||"-"}`);
  lines.push(`İskonto Oranı: ${orderDiscountText(order, firma)}`);
  lines.push("");
  lines.push("Ürünler ve Adetleri:");

  (order.items||[]).forEach((item, idx)=>{
    const qty = Number(item.qty)||0;
    const birim = item.birim || "";
    const name = item.ad || item.kod || "Ürün";
    const kodText = item.kod ? ` (${item.kod})` : "";
    const total = Number(item.total)||0;
    lines.push(`${idx+1}) ${name}${kodText}`);
    lines.push(`   Miktar/Adet: ${qty} ${birim}`.trimEnd());
    lines.push(`   Tutar: ${money(total)}`);
    if(idx < (order.items||[]).length - 1) lines.push("");
  });

  lines.push("");
  lines.push(`Genel Toplam: ${money(order.total||0)}`);
  return lines.join("\n");
}

function openOrderWhatsapp(index){
  const order = (state.orders||[])[index];
  if(!order){
    alert("Sipariş bulunamadı.");
    return;
  }

  const phone = normalizeWhatsAppPhone(getAccountantWhatsappPhone());
  if(!phone){
    alert("Muhasebeci WhatsApp numarası kayıtlı değil. Ayarlar > Program İsim / Logo Ayarları bölümünden muhasebeci numarasını kaydedin.");
    return;
  }

  const message = orderWhatsappMessage(order);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}


function approveOrder(index){
  const o=(state.orders||[])[index];
  if(!o) return alert("Sipariş bulunamadı.");
  o.durum="Onaylandı"; o.onayTarihi=todayISO();
  saveState(); renderAll();
}
