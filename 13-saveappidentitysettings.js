function saveAppIdentitySettings(){
  ensureAppSettings();
  const name = (document.getElementById("set_app_name")?.value || "").trim() || DEFAULT_APP_NAME;
  state.ayarlar.app.name = name;
  saveState();
  applyAppIdentity();
  alert("Program ismi / logo kaydedildi.");
}

function resetAppIdentitySettings(){
  if(!confirm("Program adı ve logo sıfırlansın mı?")) return;
  ensureAppSettings();
  state.ayarlar.app.name = DEFAULT_APP_NAME;
  state.ayarlar.app.logo = "";
  const file = document.getElementById("set_app_logo");
  if(file) file.value = "";
  saveState();
  applyAppIdentity();
}

function saveAccountantWhatsappSettings(){
  ensureAppSettings();
  const raw = (document.getElementById("set_accountant_whatsapp")?.value || "").trim();
  const normalized = normalizeWhatsAppPhone(raw);
  if(!normalized){
    alert("Lütfen muhasebecinin WhatsApp numarasını girin.");
    return;
  }
  state.ayarlar.whatsapp.accountantPhone = raw;
  saveState();
  applyAppIdentity();
  alert("Muhasebeci WhatsApp numarası kaydedildi. Siparişler artık bu numaraya gönderilecek.");
}

function getAccountantWhatsappPhone(){
  ensureAppSettings();
  return state.ayarlar.whatsapp.accountantPhone || "";
}

function normalizeHeaderName(v){
  return String(v||"")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı","i")
    .replaceAll("ğ","g")
    .replaceAll("ü","u")
    .replaceAll("ş","s")
    .replaceAll("ö","o")
    .replaceAll("ç","c")
    .replace(/[^a-z0-9]+/g,"");
}

function parseNumberTr(v){
  if(v === null || v === undefined) return 0;
  let s = String(v).trim();
  if(!s) return 0;
  s = s.replace(/\s/g,"").replace(/₺/g,"");
  if(s.includes(",") && s.includes(".")){
    s = s.replace(/\./g,"").replace(",",".");
  }else if(s.includes(",")){
    s = s.replace(",",".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseBoolTr(v){
  const s = String(v||"").trim().toLocaleLowerCase("tr-TR");
  return ["evet","e","yes","true","1","iskonto yok","yok"].includes(s);
}

function detectDelimiter(line){
  if(line.includes("\t")) return "\t";
  if((line.match(/;/g)||[]).length >= (line.match(/,/g)||[]).length) return ";";
  return ",";
}

function parseDelimitedLine(line, delimiter){
  const out = [];
  let cur = "", inQuotes = false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(ch === '"'){
      if(inQuotes && line[i+1] === '"'){
        cur += '"';
        i++;
      }else{
        inQuotes = !inQuotes;
      }
    }else if(ch === delimiter && !inQuotes){
      out.push(cur);
      cur = "";
    }else{
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(x=>String(x||"").trim());
}

function parseProductImportText(text){
  const lines = String(text||"")
    .replace(/\r/g,"")
    .split("\n")
    .map(x=>x.trim())
    .filter(Boolean);

  if(!lines.length) return [];

  const delimiter = detectDelimiter(lines[0]);
  const first = parseDelimitedLine(lines[0], delimiter);
  const normalizedFirst = first.map(normalizeHeaderName);
  const hasHeader = normalizedFirst.some(h=>["urunkodu","kod","urunadi","ad","kategori","birim","listefiyati","fiyat"].includes(h));

  const header = hasHeader ? normalizedFirst : ["urunkodu","urunadi","kategori","birim","koliici","listefiyati","adetfiyat","kgfiyat","durum","iskontoyok","not"];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  function val(cols, names){
    for(const n of names){
      const idx = header.indexOf(n);
      if(idx >= 0) return cols[idx] ?? "";
    }
    return "";
  }

  return dataLines.map(line=>{
    const cols = parseDelimitedLine(line, delimiter);
    return {
      kod: val(cols, ["urunkodu","kod","urunkod"]),
      ad: val(cols, ["urunadi","urunad","ad","adi"]),
      kat: val(cols, ["kategori","kat"]),
      birim: val(cols, ["birim"]),
      koli: val(cols, ["koliici","koli","koliadet"]),
      fiyat: val(cols, ["listefiyati","listefiyat","fiyat","kolifiyat"]),
      adetFiyat: val(cols, ["adetfiyat","adetfiyati"]),
      kgFiyat: val(cols, ["kgfiyat","kgfiyati"]),
      durum: val(cols, ["durum"]),
      noDisc: val(cols, ["iskontoyok","iskontogecersiz","nodisc"]),
      not: val(cols, ["not","aciklama"])
    };
  }).filter(r=>String(r.kod||"").trim() || String(r.ad||"").trim());
}

function normalizeProductImportRow(r){
  const kod = String(r.kod||"").trim();
  const ad = String(r.ad||"").trim();
  if(!kod || !ad) return null;

  const birimRaw = String(r.birim||"Koli").trim();
  const validUnits = ["Adet","Koli","Kg","Paket"];
  const birim = validUnits.find(u=>u.toLocaleLowerCase("tr-TR") === birimRaw.toLocaleLowerCase("tr-TR")) || "Koli";

  return {
    kod,
    ad,
    kat: String(r.kat||"").trim() || "Genel",
    birim,
    koli: parseInt(parseNumberTr(r.koli)) || 1,
    fiyat: parseNumberTr(r.fiyat),
    adetFiyat: parseNumberTr(r.adetFiyat),
    kgFiyat: parseNumberTr(r.kgFiyat),
    durum: String(r.durum||"Aktif").trim() || "Aktif",
    noDisc: parseBoolTr(r.noDisc),
    not: String(r.not||"").trim()
  };
}

function ensureCategoryForProduct(catName){
  const ad = String(catName||"").trim();
  if(!ad) return;
  const exists = (state.kategoriler||[]).some(k=>String(k.ad||"").toLocaleLowerCase("tr-TR") === ad.toLocaleLowerCase("tr-TR"));
  if(!exists){
    if(!state.kategoriler) state.kategoriler = [];
    state.kategoriler.push({
      kod: uid("KAT"),
      ad,
      sira: state.kategoriler.length + 1,
      durum: "Aktif",
      renk: "",
      not: "Excel aktarımı ile eklendi"
    });
  }
}

function importProductRows(rows){
  if(!Array.isArray(rows) || !rows.length){
    alert("Aktarılacak ürün bulunamadı.");
    return {added:0, updated:0, skipped:0};
  }

  if(!state.urunler) state.urunler = [];
  normalizeProductOrder();
  let added = 0, updated = 0, skipped = 0;

  rows.forEach(raw=>{
    const p = normalizeProductImportRow(raw);
    if(!p){
      skipped++;
      return;
    }

    ensureCategoryForProduct(p.kat);

    const idx = state.urunler.findIndex(u=>String(u.kod||"").trim() === p.kod);
    if(idx >= 0){
      p.uid = state.urunler[idx].uid || p.kod;
      p.sira = state.urunler[idx].sira || (idx + 1);
      state.urunler[idx] = Object.assign({}, state.urunler[idx], p);
      updated++;
    }else{
      p.uid = p.kod;
      p.sira = state.urunler.length + 1;
      state.urunler.push(p);
      added++;
    }
  });

  normalizeProductOrder();
  saveState();
  renderAll();

  const msg = `Aktarım tamamlandı.\nYeni eklenen: ${added}\nGüncellenen: ${updated}\nAtlanan: ${skipped}`;
  const box = document.getElementById("product_import_result");
  if(box) box.textContent = msg;
  alert(msg);
  return {added, updated, skipped};
}

function importProductsFromPaste(){
  const text = document.getElementById("product_excel_paste")?.value || "";
  const rows = parseProductImportText(text);
  importProductRows(rows);
}

function clearProductImportArea(){
  const area = document.getElementById("product_excel_paste");
  const file = document.getElementById("product_excel_file");
  const result = document.getElementById("product_import_result");
  if(area) area.value = "";
  if(file) file.value = "";
  if(result) result.textContent = "Henüz aktarım yapılmadı.";
}

function readProductExcelFile(input){
  const file = input && input.files ? input.files[0] : null;
  if(!file) return;

  const name = file.name.toLocaleLowerCase("tr-TR");
  if(name.endsWith(".csv") || name.endsWith(".txt")){
    const reader = new FileReader();
    reader.onload = e=>{
      const rows = parseProductImportText(e.target.result || "");
      importProductRows(rows);
    };
    reader.readAsText(file, "utf-8");
    return;
  }

  if((name.endsWith(".xlsx") || name.endsWith(".xls")) && window.XLSX){
    const reader = new FileReader();
    reader.onload = e=>{
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, {type:"array"});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(sheet, {FS:"\t"});
      const rows = parseProductImportText(csv);
      importProductRows(rows);
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  alert("Bu dosya doğrudan okunamadı. Excel dosyasını CSV olarak kaydedip yükleyebilir veya Excel'den tabloyu kopyalayıp yapıştırabilirsin.");
}

function downloadProductTemplateCsv(){
  const header = "Ürün Kodu;Ürün Adı;Kategori;Birim;Koli İçi;Liste Fiyatı;Adet Fiyat;Kg Fiyat;Durum;İskonto Yok;Not";
  const sample = "1001;Tahin 5 KG;Tahin;Koli;2;500;250;100;Aktif;Hayır;Örnek ürün";
  const csv = "\ufeff" + header + "\n" + sample + "\n";
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "urun_excel_sablonu.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}


let pendingProductPriceUpdates = [];

function downloadProductPriceExcel(){
  if(typeof XLSX==='undefined') return alert('Excel kütüphanesi yüklenemedi. İnternet bağlantısını kontrol edip tekrar deneyin.');
  const rows=sortedProducts(state.urunler||[]).map(u=>({
    'Ürün Kodu':u.kod||'',
    'Ürün Adı':u.ad||'',
    'Kategori':u.kat||'',
    'Mevcut Fiyat':Number(u.fiyat)||0,
    'Yeni Fiyat':Number(u.fiyat)||0
  }));
  const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{'Ürün Kodu':'','Ürün Adı':'','Kategori':'','Mevcut Fiyat':0,'Yeni Fiyat':0}]);
  ws['!cols']=[{wch:16},{wch:36},{wch:22},{wch:16},{wch:16}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Fiyat Güncelleme');
  XLSX.writeFile(wb,'urun_fiyat_guncelleme.xlsx');
}

function priceExcelCell(row,names){
  const norm=x=>String(x||'').toLocaleLowerCase('tr-TR').replace(/[ıİiI]/g,'i').replace(/[^a-z0-9]/g,'');
  const keys=Object.keys(row||{});
  for(const name of names){ const nk=norm(name); const k=keys.find(x=>norm(x)===nk); if(k!==undefined) return row[k]; }
  return '';
}

function readProductPriceExcel(input){
  const file=input?.files?.[0]; if(!file) return;
  if(typeof XLSX==='undefined'){ input.value=''; return alert('Excel kütüphanesi yüklenemedi. İnternet bağlantısını kontrol edip tekrar deneyin.'); }
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      const sheet=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(sheet,{defval:''});
      pendingProductPriceUpdates=rows.map(r=>{
        const kod=String(priceExcelCell(r,['Ürün Kodu','Urun Kodu','Kod'])||'').trim();
        const rawNew=priceExcelCell(r,['Yeni Fiyat','YeniFiyat']);
        const product=(state.urunler||[]).find(u=>String(u.kod||'').trim()===kod);
        if(!kod) return {status:'invalid',kod:'',name:'',oldPrice:0,newPrice:0,change:0};
        if(!product) return {status:'missing',kod,name:String(priceExcelCell(r,['Ürün Adı','Urun Adi'])||''),oldPrice:0,newPrice:parseNumberTr(rawNew),change:0};
        const oldPrice=Number(product.fiyat)||0, newPrice=parseNumberTr(rawNew);
        if(rawNew==='' || rawNew===null || !Number.isFinite(newPrice) || newPrice<0) return {status:'invalid',kod,name:product.ad||'',oldPrice,newPrice:0,change:0,product};
        const changed=Math.abs(newPrice-oldPrice)>0.000001;
        return {status:changed?'changed':'same',kod,name:product.ad||'',oldPrice,newPrice,change:oldPrice?((newPrice-oldPrice)/oldPrice*100):(newPrice?100:0),product};
      });
      renderProductPricePreview();
    }catch(err){ pendingProductPriceUpdates=[]; alert('Excel dosyası okunamadı: '+(err?.message||err)); }
    input.value='';
  };
  reader.readAsArrayBuffer(file);
}

function renderProductPricePreview(){
  const card=document.getElementById('priceUpdatePreviewCard'), body=document.getElementById('priceUpdatePreviewBody'), sum=document.getElementById('priceUpdateSummary');
  if(!card||!body||!sum) return;
  const changed=pendingProductPriceUpdates.filter(x=>x.status==='changed').length;
  const same=pendingProductPriceUpdates.filter(x=>x.status==='same').length;
  const missing=pendingProductPriceUpdates.filter(x=>x.status==='missing').length;
  const invalid=pendingProductPriceUpdates.filter(x=>x.status==='invalid').length;
  sum.textContent=`Değişecek: ${changed} • Değişmeyen: ${same} • Bulunamayan: ${missing} • Hatalı: ${invalid}`;
  body.innerHTML=pendingProductPriceUpdates.map(x=>{
    const label=x.status==='changed'?'Değişecek':x.status==='same'?'Aynı':x.status==='missing'?'Ürün bulunamadı':'Hatalı satır';
    const diff=x.status==='changed'?`${x.change>=0?'+':''}${x.change.toFixed(1)}%`:'—';
    return `<tr><td><b>${label}</b></td><td>${htmlEscape(x.kod||'')}</td><td>${htmlEscape(x.name||'')}</td><td>${x.status==='missing'||x.status==='invalid'?'—':money(x.oldPrice)}</td><td>${x.status==='invalid'?'—':money(x.newPrice)}</td><td>${diff}</td></tr>`;
  }).join('')||'<tr><td colspan="6" class="muted">Excel içinde okunabilir kayıt bulunamadı.</td></tr>';
  card.classList.remove('hide');
  card.scrollIntoView({behavior:'smooth',block:'start'});
}

function applyProductPriceUpdates(){
  const changes=pendingProductPriceUpdates.filter(x=>x.status==='changed'&&x.product);
  if(!changes.length) return alert('Uygulanacak fiyat değişikliği yok.');
  changes.forEach(x=>{ x.product.fiyat=Number(x.newPrice)||0; });
  saveState(); renderAll();
  const count=changes.length;
  pendingProductPriceUpdates=[];
  const card=document.getElementById('priceUpdatePreviewCard'); if(card) card.classList.add('hide');
  alert(`${count} ürünün liste fiyatı güncellendi.`);
}

function cancelProductPriceUpdate(){
  pendingProductPriceUpdates=[];
  const card=document.getElementById('priceUpdatePreviewCard'); if(card) card.classList.add('hide');
  const input=document.getElementById('product_price_excel_file'); if(input) input.value='';
}

function renderSettingsMenuOrder(){
  const box = document.getElementById("settingsMenuOrder");
  if(!box) return;
  const order = currentMenuOrder();
  box.innerHTML = order.map((view,idx)=>`
    <div class="settings-menu-item" data-view="${view}">
      <strong>${idx+1}. ${menuButtonLabel(view)}</strong>
      <div class="small-actions">
        <button class="btn" onclick="moveSettingsMenuItem('${view}',-1)">Yukarı</button>
        <button class="btn" onclick="moveSettingsMenuItem('${view}',1)">Aşağı</button>
      </div>
    </div>
  `).join("");
}
function moveSettingsMenuItem(view, direction){
  const menu = document.getElementById("menu");
  const buttons = Array.from(menu.querySelectorAll("button"));
  const index = buttons.findIndex(b=>b.dataset.view===view);
  if(index < 0) return;

  const newIndex = index + direction;
  if(newIndex < 0 || newIndex >= buttons.length) return;

  if(direction < 0){
    menu.insertBefore(buttons[index], buttons[newIndex]);
  } else {
    menu.insertBefore(buttons[newIndex], buttons[index]);
  }

  saveMenuOrder();
  populateCitySelect('f_sehir','f_ilce');
  populateCitySelect('z_sehir','z_ilce');
  populateFilterCitySelect();
  renderSettingsMenuOrder();
  renderSettingsMenuVisibility();
}
function applySettingsMenuOrder(){
  saveMenuOrder();
  alert("Menü sırası kaydedildi.");
}
function resetMenuOrder(){
  localStorage.removeItem(MENU_ORDER_KEY);
  location.reload();
}

function programJsonStatus(msg, isError){
  const box = document.getElementById("program_json_result");
  if(box){
    box.textContent = msg;
    box.classList.toggle("json-error", !!isError);
    box.classList.toggle("json-ok", !isError);
  }
}

function programBackupMenuKey(){
  return typeof MENU_ORDER_KEY !== "undefined" ? MENU_ORDER_KEY : "cari_takip_menu_order_v1";
}

function currentProgramMenuOrder(){
  try{
    const raw = localStorage.getItem(programBackupMenuKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  }catch(e){
    return [];
  }
}

function programBackupObject(){
  return {
    app:"Cari Takip Programı",
    version:"v66",
    exportedAt:new Date().toISOString(),
    dataKey:LSKEY,
    menuKey:programBackupMenuKey(),
    menuOrder:currentProgramMenuOrder(),
    state:JSON.parse(JSON.stringify(state))
  };
}

function downloadProgramJson(){
  const backup = programBackupObject();
  const date = todayISO();
  const safeName = String((state.ayarlar && state.ayarlar.app && state.ayarlar.app.name) || "cari_takip").replace(/[^\wğüşöçıİĞÜŞÖÇ-]+/gi,"_").replace(/_+/g,"_");
  const filename = `${safeName}_tum_veri_yedek_${date}.json`;
  const blob = new Blob([JSON.stringify(backup,null,2)], {type:"application/json;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  programJsonStatus("JSON yedek indirildi: " + filename, false);
}

function normalizeImportedProgramState(imported){
  const incoming = imported && imported.state ? imported.state : imported;
  if(!incoming || typeof incoming !== "object" || Array.isArray(incoming)){
    throw new Error("JSON içinde program verisi bulunamadı.");
  }
  const normalized = Object.assign({}, incoming);
  ["firmalar","kategoriler","urunler","orders","quotes","samples","visits","randevular","payments"].forEach(key=>{
    if(!Array.isArray(normalized[key])) normalized[key] = [];
  });
  if(!normalized.ayarlar || typeof normalized.ayarlar !== "object") normalized.ayarlar = {};
  if(!normalized.ayarlar.app || typeof normalized.ayarlar.app !== "object") normalized.ayarlar.app = {};
  if(!normalized.ayarlar.app.name) normalized.ayarlar.app.name = DEFAULT_APP_NAME;
  if(!("logo" in normalized.ayarlar.app)) normalized.ayarlar.app.logo = "";
  return normalized;
}

function importProgramJsonObject(imported){
  const newState = normalizeImportedProgramState(imported);
  const firmaCount = newState.firmalar.length;
  const urunCount = newState.urunler.length;
  const orderCount = newState.orders.length;
  const paymentCount = newState.payments.length;

  if(!confirm(`JSON verisi yüklensin mi?\n\nFirma: ${firmaCount}\nÜrün: ${urunCount}\nSipariş: ${orderCount}\nTahsilat: ${paymentCount}\n\nMevcut veriler bu yedekle değiştirilecek.`)){
    programJsonStatus("JSON yükleme iptal edildi.", true);
    return false;
  }

  const menuOrder = imported && Array.isArray(imported.menuOrder) ? imported.menuOrder : null;

  Object.keys(state).forEach(k=>delete state[k]);
  Object.assign(state, newState);

  if(menuOrder) localStorage.setItem(programBackupMenuKey(), JSON.stringify(menuOrder));
  saveState();
  try{ loadMenuOrder(); }catch(e){}
  if(menuOrder) localStorage.setItem(programBackupMenuKey(), JSON.stringify(menuOrder));
  renderAll();
  if(menuOrder) localStorage.setItem(programBackupMenuKey(), JSON.stringify(menuOrder));

  go("ayarlar");
  programJsonStatus(`JSON yüklendi. Firma: ${firmaCount}, Ürün: ${urunCount}, Sipariş: ${orderCount}, Tahsilat: ${paymentCount}`, false);
  alert("JSON verileri başarıyla yüklendi.");
  return true;
}

function importProgramJsonFromText(){
  const el = document.getElementById("program_json_text");
  const text = (el && el.value ? el.value : "").trim();
  if(!text){
    alert("JSON metni boş.");
    programJsonStatus("JSON metni boş.", true);
    return;
  }
  try{
    const parsed = JSON.parse(text);
    importProgramJsonObject(parsed);
  }catch(err){
    alert("JSON okunamadı: " + (err && err.message ? err.message : err));
    programJsonStatus("JSON okunamadı: " + (err && err.message ? err.message : err), true);
  }
}

function readProgramJsonFile(input){
  const file = input && input.files && input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(){
    const text = String(reader.result || "");
    const area = document.getElementById("program_json_text");
    if(area) area.value = text;
    try{
      const parsed = JSON.parse(text);
      importProgramJsonObject(parsed);
    }catch(err){
      alert("JSON dosyası okunamadı: " + (err && err.message ? err.message : err));
      programJsonStatus("JSON dosyası okunamadı: " + (err && err.message ? err.message : err), true);
    }
    if(input) input.value = "";
  };
  reader.onerror = function(){
    alert("Dosya okunamadı.");
    programJsonStatus("Dosya okunamadı.", true);
    if(input) input.value = "";
  };
  reader.readAsText(file, "utf-8");
}

function clearProgramJsonArea(){
  const area = document.getElementById("program_json_text");
  const file = document.getElementById("program_json_file");
  if(area) area.value = "";
  if(file) file.value = "";
  programJsonStatus("JSON alanı temizlendi.", false);
}


let cloudSyncBusy = false;
let cloudAutoTimer = null;
const CLOUD_CHUNK_SIZE = 900;
const CLOUD_AUTO_SYNC_DELAY = 20000; // Varsayılan 20 saniye
const CLOUD_POST_MESSAGE_SOURCE = "cari_takip_cloud_post";

function ensureCloudSettings(){
  ensureAppSettings();
  if(!state.ayarlar.cloud || typeof state.ayarlar.cloud !== "object"){
    state.ayarlar.cloud = {url:"https://script.google.com/macros/s/AKfycbzuWZd8-SFFPTRrPKH42GNqA_mwwtcGmjcQsHwjGLiDlUeatcCqxn0omJ51vs5qOvYA5A/exec", token:"2803320", auto:"off", lastSave:"", lastLoad:""};
  }
  if(!("url" in state.ayarlar.cloud)) state.ayarlar.cloud.url = "https://script.google.com/macros/s/AKfycbzuWZd8-SFFPTRrPKH42GNqA_mwwtcGmjcQsHwjGLiDlUeatcCqxn0omJ51vs5qOvYA5A/exec";
  if(!("token" in state.ayarlar.cloud)) state.ayarlar.cloud.token = "2803320";
  // Eski uygulamanın varsayılan bağlantısı daha önce yerel kaydedildiyse güncelle.
  if(state.ayarlar.cloud.url === "https://script.google.com/macros/s/AKfycbyIo9CcoDJNEIqsQtInyZWDnz3Pz8QApjL-t-e7ERZU_9gjiCxaamkkQgCpMmPxT3JJ/exec" ) state.ayarlar.cloud.url = "https://script.google.com/macros/s/AKfycbzuWZd8-SFFPTRrPKH42GNqA_mwwtcGmjcQsHwjGLiDlUeatcCqxn0omJ51vs5qOvYA5A/exec";
  if(state.ayarlar.cloud.token === "1234") state.ayarlar.cloud.token = "2803320";
  if(!("auto" in state.ayarlar.cloud)) state.ayarlar.cloud.auto = "off";
  if(!Number.isFinite(Number(state.ayarlar.cloud.delaySeconds))) state.ayarlar.cloud.delaySeconds = 20;
  if(!("lastSave" in state.ayarlar.cloud)) state.ayarlar.cloud.lastSave = "";
  if(!("lastLoad" in state.ayarlar.cloud)) state.ayarlar.cloud.lastLoad = "";
  if(!state.ayarlar.cloud.url) state.ayarlar.cloud.url = "https://script.google.com/macros/s/AKfycbzuWZd8-SFFPTRrPKH42GNqA_mwwtcGmjcQsHwjGLiDlUeatcCqxn0omJ51vs5qOvYA5A/exec";
}



const CLOUD_DIRTY_KEY = "cari_takip_cloud_dirty_v1";

function hasCloudDirty(){
  return localStorage.getItem(CLOUD_DIRTY_KEY) === "1";
}

function setCloudDirty(value){
  if(value){
    localStorage.setItem(CLOUD_DIRTY_KEY, "1");
  }else{
    localStorage.removeItem(CLOUD_DIRTY_KEY);
  }
}

function markCloudDirty(){
  setCloudDirty(true);
  renderDashboardCloudStatus();
}

function clearCloudDirty(){
  setCloudDirty(false);
  renderDashboardCloudStatus();
}

function cloudBeforeUnloadHandler(e){
  if(!hasCloudDirty()) return;
  const msg = "Buluta yüklenmemiş değişiklik var. Çıkmadan önce Buluta Kaydet yapmanız önerilir.";
  e.preventDefault();
  e.returnValue = msg;
  return msg;
}

window.addEventListener("beforeunload", cloudBeforeUnloadHandler);

function renderDashboardCloudStatus(){
  const text = document.getElementById("dCloudQuickStatus");
  const dot = document.getElementById("dCloudQuickDot");
  const badge = document.getElementById("dCloudDirtyBadge");
  if(!text && !dot && !badge) return;

  ensureCloudSettings();
  const cfg = cloudConfig();
  const dirty = hasCloudDirty();
  const last = state.ayarlar.cloud.lastSave ? new Date(state.ayarlar.cloud.lastSave).toLocaleString("tr-TR") : "";

  let msg = "";
  if(!cfg.url){
    msg = "Bulut linki eksik";
  }else if(dirty){
    msg = "Buluta yüklenmemiş değişiklik var";
  }else{
    msg = "Buluta aktarılmış";
  }

  msg += cfg.auto === "on" ? " • Otomatik açık" : " • Otomatik kapalı";
  if(last) msg += " • Son kayıt: " + last;

  if(text) text.textContent = msg;
  if(badge){
    badge.textContent = dirty ? "Buluta yükle" : "Güncel";
    badge.classList.toggle("hide", !cfg.url);
    badge.classList.toggle("dirty", dirty);
    badge.classList.toggle("clean", !dirty);
  }
  if(dot){
    dot.classList.toggle("ok", !!cfg.url && !dirty);
    dot.classList.toggle("bad", !cfg.url);
    dot.classList.toggle("warn", !!cfg.url && dirty);
  }
}

function cloudSetStatus(msg, isError){
  const box = document.getElementById("cloud_status");
  const quickBox = document.getElementById("dCloudQuickStatus");
  const quickDot = document.getElementById("dCloudQuickDot");
  const quickBadge = document.getElementById("dCloudDirtyBadge");
  if(box){
    box.textContent = msg;
    box.classList.toggle("json-error", !!isError);
    box.classList.toggle("json-ok", !isError);
  }
  if(quickBox) quickBox.textContent = msg;
  if(quickBadge){
    const dirty = hasCloudDirty();
    quickBadge.textContent = dirty ? "Buluta yükle" : "Güncel";
    quickBadge.classList.toggle("hide", false);
    quickBadge.classList.toggle("dirty", dirty);
    quickBadge.classList.toggle("clean", !dirty);
  }
  if(quickDot){
    const dirty = hasCloudDirty();
    quickDot.classList.toggle("ok", !isError && !dirty);
    quickDot.classList.toggle("bad", !!isError);
    quickDot.classList.toggle("warn", !isError && dirty);
  }
}

function applyCloudSettings(){
  ensureCloudSettings();
  const url = document.getElementById("cloud_api_url");
  const token = document.getElementById("cloud_token");
  const auto = document.getElementById("cloud_auto");
  if(url) url.value = state.ayarlar.cloud.url || "";
  if(token) token.value = state.ayarlar.cloud.token || "2803320";
  if(auto) auto.value = state.ayarlar.cloud.auto || "off";
  const delay=document.getElementById("cloud_delay_seconds");if(delay)delay.value=cloudDelaySeconds();
  const last = state.ayarlar.cloud.lastSave ? (" Son kayıt: " + new Date(state.ayarlar.cloud.lastSave).toLocaleString("tr-TR")) : "";
  cloudSetStatus((state.ayarlar.cloud.url ? "Bulut ayarı hazır." : "Bulut linki girilmedi.") + last, false);
}

function saveCloudSettings(){
  ensureCloudSettings();
  state.ayarlar.cloud.url = (document.getElementById("cloud_api_url")?.value || "").trim();
  state.ayarlar.cloud.token = (document.getElementById("cloud_token")?.value || "").trim() || "2803320";
  state.ayarlar.cloud.auto = document.getElementById("cloud_auto")?.value || "off";
  state.ayarlar.cloud.delaySeconds=cloudDelaySeconds(document.getElementById("cloud_delay_seconds")?.value);
  saveStateCore();
  applyCloudSettings();
  scheduleCloudAutoSync();
  alert("Bulut ayarları kaydedildi.");
}

function cloudConfig(){
  ensureCloudSettings();
  return {
    url:(state.ayarlar.cloud.url || "").trim(),
    token:(state.ayarlar.cloud.token || "2803320").trim(),
    auto:state.ayarlar.cloud.auto || "off"
  };
}

function validateCloudConfig(){
  const cfg = cloudConfig();
  if(!cfg.url){
    cloudSetStatus("Bulut linki eksik.", true);
    alert("Bulut /exec linki giriniz.");
    return null;
  }
  if(!cfg.token){
    cloudSetStatus("Token eksik.", true);
    alert("Token giriniz.");
    return null;
  }
  return cfg;
}

