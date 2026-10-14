function cloudPayload(){
  return {
    app:"Cari Takip Programı",
    version:"v82",
    savedAt:new Date().toISOString(),
    state:JSON.parse(JSON.stringify(state)),
    menuOrder:typeof currentProgramMenuOrder === "function" ? currentProgramMenuOrder() : []
  };
}


function cloudEncodedLength(text){
  try{
    return encodeURIComponent(String(text||"")).length;
  }catch(e){
    return String(text||"").length * 3;
  }
}

function cloudSleep(ms){
  return new Promise(resolve=>setTimeout(resolve, ms));
}


function cloudPostRequest(action, extra, timeoutMs){
  const cfg = cloudConfig();
  if(!cfg.url) return Promise.reject(new Error("Bulut script linki boş."));
  if(typeof fetch !== "function") return Promise.reject(new Error("Tarayıcı hızlı POST desteklemiyor."));

  const requestId = (extra && extra.requestId) ? String(extra.requestId) : ("POST_" + Date.now() + "_" + Math.random().toString(36).slice(2));
  const body = new URLSearchParams();
  body.set("token", cfg.token);
  body.set("action", action);
  body.set("requestId", requestId);
  Object.entries(extra||{}).forEach(([k,v])=>{
    if(k !== "requestId") body.set(k, v == null ? "" : String(v));
  });

  return new Promise((resolve, reject)=>{
    const timer = setTimeout(()=>{
      reject(new Error("Bulut POST gönderim zaman aşımı."));
    }, timeoutMs || 60000);

    fetch(cfg.url, {
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
      body
    }).then(()=>{
      clearTimeout(timer);
      resolve({ok:true, requestId, storage:"post-sent"});
    }).catch(err=>{
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function cloudWaitPostStatus(requestId, tries){
  const maxTries = tries || 12;
  for(let i=0; i<maxTries; i++){
    await cloudSleep(i === 0 ? 1200 : 900);
    try{
      const res = await cloudRequestWithRetry("post_status", {requestId}, 1);
      if(res && res.ok && res.found){
        return res;
      }
    }catch(err){}
    cloudSetStatus(`POST kayıt doğrulanıyor... ${i+1}/${maxTries}`, false);
  }
  throw new Error("POST gönderildi ama kayıt doğrulanamadı.");
}

async function cloudSaveByPost(text){
  const requestId = "POST_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  cloudSetStatus("Tek sefer hızlı POST kayıt gönderiliyor...", false);
  await cloudPostRequest("save_post", {requestId, data:text}, 90000);
  cloudSetStatus("POST gönderildi, kayıt doğrulanıyor...", false);
  return await cloudWaitPostStatus(requestId, 12);
}

async function cloudRequestWithRetry(action, extra, tries){
  const maxTries = tries || 3;
  let lastErr = null;
  for(let attempt=1; attempt<=maxTries; attempt++){
    try{
      return await cloudRequest(action, extra);
    }catch(err){
      lastErr = err;
      if(attempt >= maxTries) break;
      cloudSetStatus(`${action} bağlantı hatası, tekrar deneniyor... ${attempt+1}/${maxTries}`, true);
      await cloudSleep(900 * attempt);
    }
  }
  throw lastErr || new Error("Bulut bağlantı hatası.");
}

function cloudSplitText(text){
  const chunks = [];
  let current = "";
  const maxEncoded = 2600;

  for(const ch of String(text || "")){
    const test = current + ch;
    if(current && (test.length > CLOUD_CHUNK_SIZE || cloudEncodedLength(test) > maxEncoded)){
      chunks.push(current);
      current = ch;
    }else{
      current = test;
    }
  }

  if(current) chunks.push(current);
  return chunks.length ? chunks : [""];
}

function cloudRequest(action, extra){
  return new Promise((resolve, reject)=>{
    const cfg = validateCloudConfig();
    if(!cfg) return reject(new Error("Bulut ayarı eksik."));

    const callbackName = "ctpCloudCb_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    const params = new URLSearchParams();
    params.set("action", action);
    params.set("token", cfg.token);
    params.set("callback", callbackName);

    Object.keys(extra || {}).forEach(k=>{
      params.set(k, String(extra[k]));
    });

    let done = false;
    const timer = setTimeout(()=>{
      if(done) return;
      done = true;
      cleanup();
      reject(new Error("Bulut bağlantısı zaman aşımına uğradı."));
    }, 60000);

    function cleanup(){
      clearTimeout(timer);
      try{ delete window[callbackName]; }catch(e){ window[callbackName] = undefined; }
      try{ script.remove(); }catch(e){}
    }

    window[callbackName] = function(res){
      if(done) return;
      done = true;
      cleanup();
      if(res && res.ok) resolve(res);
      else reject(new Error((res && (res.error || res.message)) || "Bulut işlem hatası."));
    };

    script.onerror = function(){
      if(done) return;
      done = true;
      cleanup();
      reject(new Error("Bulut script bağlantısı kurulamadı."));
    };

    const sep = cfg.url.includes("?") ? "&" : "?";
    script.src = cfg.url + sep + params.toString();
    if(script.src.length > 4200){
      cleanup();
      reject(new Error("Bulut parçası çok uzun kaldı. Parça boyutu küçültülmeli."));
      return;
    }
    document.body.appendChild(script);
  });
}

async function testCloudConnection(){
  try{
    cloudSetStatus("Bağlantı test ediliyor...", false);
    const res = await cloudRequest("ping");
    cloudSetStatus("Bağlantı başarılı: " + (res.message || "API çalışıyor"), false);
  }catch(err){
    cloudSetStatus("Bağlantı hatası: " + (err.message || err), true);
    alert("Bulut bağlantı hatası: " + (err.message || err));
  }
}

// Single-user, multi-device guard: never silently overwrite a newer remote snapshot.
const CLOUD_BASELINE_KEY = LSKEY + "_cloud_baseline_v2";
function cloudSnapshotFingerprint(value){
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  const copy = JSON.parse(JSON.stringify(parsed));
  // Backup metadata is device-specific and must not trigger false conflicts.
  if(copy && copy.ayarlar && copy.ayarlar.cloud){
    delete copy.ayarlar.cloud.lastSave;
    delete copy.ayarlar.cloud.lastLoad;
  }
  return JSON.stringify(copy);
}
function cloudBaseline(){return localStorage.getItem(CLOUD_BASELINE_KEY) || "";}
function setCloudBaseline(value){localStorage.setItem(CLOUD_BASELINE_KEY, cloudSnapshotFingerprint(value));}
async function cloudPreflight(){
  const remote = await cloudRequest("load");
  if(!remote.data) return;
  const fingerprint = cloudSnapshotFingerprint(remote.data);
  const baseline = cloudBaseline();
  if(!baseline){
    throw new Error("Bulutta mevcut kayıt var. İlk kullanımda önce 'Buluttan Çek' ile kaydı alın; yerel verilerinizi öncesinde JSON yedekleyin.");
  }
  if(fingerprint !== baseline){
    throw new Error("Diğer bilgisayarda yeni kayıt var. Üzerine yazılmadı. Önce yerel verileri JSON olarak yedekleyip Buluttan Çek yapın.");
  }
}
async function cloudCheckOtherDevice(){
  if(!validateCloudConfig()) return;
  if(hasCloudDirty()) return cloudSetStatus("Bu cihazda kaydedilmemiş değişiklik var; buluttan otomatik çekilmedi.",true);
  try{
    const remote=await cloudRequest("load");
    if(!remote.data) return cloudSetStatus("Henüz bulutta veri yok.",false);
    const fp=cloudSnapshotFingerprint(remote.data);
    if(!cloudBaseline()) return cloudSetStatus("Bulutta veri bulundu. Buluttan Çek ile ilk eşitlemeyi yapın.",true);
    if(fp!==cloudBaseline()) cloudSetStatus("Diğer bilgisayarda yeni veri var. Buluttan Çek ile güncelleyin.",true);
    else cloudSetStatus("Bulut ile bu cihaz aynı sürümde.",false);
  }catch(e){cloudSetStatus("Bulut kontrolü: "+e.message,true);}
}
async function cloudSaveNow(silent){
  if(cloudSyncBusy){
    cloudSetStatus("Bulut kaydı zaten devam ediyor. Lütfen bitmesini bekle.", false);
    return;
  }
  if(!validateCloudConfig()) return;
  cloudSyncBusy = true;
  try{
    await cloudPreflight();
    const text = JSON.stringify(cloudPayload());

    try{
      const res = await cloudSaveByPost(text);
      ensureCloudSettings();
      state.ayarlar.cloud.lastSave = new Date().toISOString();
      saveStateCore();
      clearCloudDirty();
      setCloudBaseline(text);
      const count = res && res.count ? " Kayıt: " + res.count : "";
      const storage = res && res.storage ? " • " + res.storage : " • post+sheet";
      cloudSetStatus("Buluta kayıt başarılı." + count + storage, false);
      if(!silent) alert("Buluta kayıt tamamlandı.");
      return;
    }catch(postErr){
      cloudSetStatus("POST hızlı kayıt olmadı, parçalı yedek kayıt deneniyor: " + (postErr.message || postErr), true);
      await cloudSleep(600);
    }

    const chunks = cloudSplitText(text);
    const uploadId = "UP_" + Date.now() + "_" + Math.random().toString(36).slice(2);

    cloudSetStatus(`Yedek parçalı kayıt başlıyor... ${chunks.length} parça`, false);
    await cloudRequestWithRetry("save_start", {uploadId, total:chunks.length}, 3);

    for(let i=0; i<chunks.length; i++){
      const encodedSize = cloudEncodedLength(chunks[i]);
      cloudSetStatus(`Buluta kayıt ediliyor... ${i+1}/${chunks.length} parça (${encodedSize} karakter)`, false);
      await cloudRequestWithRetry("save_chunk", {uploadId, index:i, total:chunks.length, chunk:chunks[i]}, 3);
    }

    cloudSetStatus("Bulut kaydı tamamlanıyor...", false);
    const res = await cloudRequestWithRetry("save_finish", {uploadId}, 3);
    ensureCloudSettings();
    state.ayarlar.cloud.lastSave = new Date().toISOString();
    saveStateCore();
    clearCloudDirty();
    setCloudBaseline(text);
    const count = res && res.count ? " Kayıt: " + res.count : "";
    const storage = res && res.storage ? " • " + res.storage : "";
    cloudSetStatus("Buluta kayıt başarılı." + count + storage, false);
    if(!silent) alert("Buluta kayıt tamamlandı.");
  }catch(err){
    cloudSetStatus("Buluta kayıt tamamlanamadı: " + (err.message || err), true);
    if(!silent) alert("Buluta kayıt tamamlanamadı: " + (err.message || err));
  }finally{
    cloudSyncBusy = false;
  }
}

async function cloudLoadNow(){
  const cfg = validateCloudConfig();
  if(!cfg) return;
  if(!confirm("Buluttaki veri bu programa yüklensin mi? Mevcut local verinin üzerine yazılır.")) return;

  try{
    cloudSetStatus("Buluttan veri çekiliyor...", false);
    const res = await cloudRequest("load");
    if(!res.data) throw new Error("Bulutta kayıtlı veri bulunamadı.");

    const imported = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    const newState = normalizeImportedProgramState(imported);
    const menuOrder = imported && Array.isArray(imported.menuOrder) ? imported.menuOrder : null;

    Object.keys(state).forEach(k=>delete state[k]);
    Object.assign(state, newState);

    ensureCloudSettings();
    state.ayarlar.cloud.url = cfg.url;
    state.ayarlar.cloud.token = cfg.token;
    state.ayarlar.cloud.auto = cfg.auto;
    state.ayarlar.cloud.lastLoad = new Date().toISOString();

    if(menuOrder && typeof programBackupMenuKey === "function"){
      localStorage.setItem(programBackupMenuKey(), JSON.stringify(menuOrder));
    }

    saveStateCore();
    clearCloudDirty();
    setCloudBaseline(res.data);
    renderAll();
    go("ayarlar");
    applyCloudSettings();
    cloudSetStatus("Buluttan veri çekildi ve programa yüklendi.", false);
    alert("Bulut verisi yüklendi.");
  }catch(err){
    cloudSetStatus("Buluttan çekme hatası: " + (err.message || err), true);
    alert("Buluttan çekme hatası: " + (err.message || err));
  }
}

function saveStateCore(){
  localStorage.setItem(LSKEY, JSON.stringify(state));
}

function cloudDelaySeconds(v){const raw=v===undefined?state.ayarlar?.cloud?.delaySeconds:v;const n=Number(raw);return Number.isFinite(n)?Math.max(10,Math.min(3600,Math.round(n))):20;}
function scheduleCloudAutoSync(){
  if(cloudAutoTimer){
    clearTimeout(cloudAutoTimer);
    cloudAutoTimer = null;
  }
  const cfg = cloudConfig();
  if(cfg.auto !== "on" || !cfg.url) return;
  cloudAutoTimer = setTimeout(()=>{
    cloudAutoTimer = null;
    cloudSaveNow(true);
  }, cloudDelaySeconds()*1000);
  cloudSetStatus("Değişiklik kaydedildi. Otomatik bulut kayıt "+cloudDelaySeconds()+" sn sonra çalışacak.", false);
}

function resetDemo(){
  if(confirm("Tüm demo verileri silinip başa dönülsün mü?")){
    localStorage.removeItem(LSKEY);
    location.reload();
  }
}


function toggleFirmaManualDiscount(){
  const box = document.getElementById("f_manual_disc_box");
  if(!box) return;
  box.classList.toggle("hide", f_iskonto.value !== "Manuel");
}
function toggleOrderManualDiscount(){
  const box = document.getElementById("s_manual_disc_box");
  if(!box) return;
  box.classList.toggle("hide", s_iskonto.value !== "Manuel");
}

s_tarih?.addEventListener("change", updateVadeDate);

/* ZİYARET / MATERYAL GÜVENLİ DÜZELTME */
function getVisitMaterialsSafe(){
  return Array.from(document.querySelectorAll(".z_mat:checked, .matCheck:checked")).map(x=>x.value);
}

function clearVisitForm(){
  editingVisitNo = null;
  if(document.getElementById("z_no")) z_no.value = "ZTR-" + String((state.visits||[]).length+1).padStart(4,"0");
  if(document.getElementById("z_tarih")) z_tarih.value = todayISO();
  if(document.getElementById("z_firma_mode")) z_firma_mode.value = "manuel";
  if(typeof toggleVisitFirma === "function") toggleVisitFirma();
  ["z_firma_manual","z_yetkili","z_tel","z_mail","z_takip","z_adres","z_not"].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value="";
  });
  if(typeof populateCitySelect==="function") populateCitySelect("z_sehir","z_ilce","İstanbul","");
  if(document.getElementById("z_firma")) z_firma.value="";
  if(document.getElementById("z_durum")) z_durum.value="İlk Ziyaret";
  document.querySelectorAll(".z_mat, .matCheck").forEach(x=>x.checked=false);
  visitSampleSelected = {};
  toggleVisitSampleArea();
  const btn=document.getElementById("saveVisitBtn");
  const cancelBtn=document.getElementById("cancelVisitEditBtn");
  if(btn) btn.textContent="Ziyaret / Materyal Kaydet";
  if(cancelBtn) cancelBtn.classList.add("hide");
  renderVisitSampleProducts();
}


function visitSampleCheckbox(){
  return Array.from(document.querySelectorAll(".z_mat, .matCheck")).find(x=>x.value==="Numune") || null;
}

function isVisitSampleChecked(){
  const cb = visitSampleCheckbox();
  return !!(cb && cb.checked);
}

function setVisitSampleChecked(value){
  const cb = visitSampleCheckbox();
  if(cb) cb.checked = !!value;
}

function toggleVisitSampleArea(){
  const area = document.getElementById("visitSampleArea");
  const show = isVisitSampleChecked();
  if(area) area.classList.toggle("hide", !show);
  if(show) renderVisitSampleProducts();
}

function visibleVisitSampleProducts(){
  const filter = document.getElementById("z_sample_kat_filter")?.value || "";
  return sortedProducts(state.urunler||[]).filter(u=>isProductActiveForUse(u) && (!filter || u.kat===filter));
}

function renderVisitSampleProducts(){
  const list = document.getElementById("visitSampleProductList");
  if(!list) return;
  const products = visibleVisitSampleProducts();
  list.innerHTML = products.map(u=>{
    const sel = visitSampleSelected[u.kod] || {checked:false,qty:1};
    return `<tr>
      <td class="checkcell"><input type="checkbox" ${sel.checked?'checked':''} onchange="toggleVisitSampleProduct('${u.kod}',this.checked)"></td>
      <td>${u.kod||""}</td>
      <td>${u.ad||""}</td>
      <td>${u.kat||""}</td>
      <td><input class="num" type="number" min="1" step="1" value="${parseInt(sel.qty)||1}" onchange="setVisitSampleQty('${u.kod}',this.value)"></td>
    </tr>`;
  }).join("") || `<tr><td colspan="5" class="muted">Aktif ürün bulunamadı.</td></tr>`;
}

function toggleVisitSampleProduct(kod, checked){
  const old = visitSampleSelected[kod] || {qty:1};
  visitSampleSelected[kod] = {checked:!!checked, qty:parseInt(old.qty)||1};
}

function setVisitSampleQty(kod, value){
  const old = visitSampleSelected[kod] || {checked:true};
  visitSampleSelected[kod] = {checked:!!old.checked, qty:parseInt(value)||1};
}

function getVisitSampleItems(){
  const items = [];
  Object.entries(visitSampleSelected||{}).forEach(([kod,sel])=>{
    if(!sel.checked) return;
    const p = (state.urunler||[]).find(u=>u.kod===kod);
    if(!p || !isProductActiveForUse(p)) return;
    items.push({
      kod:p.kod,
      ad:p.ad,
      kat:p.kat || "",
      birim:"Adet",
      qty:parseInt(sel.qty)||1
    });
  });
  return items;
}

function nextLinkedSampleNo(){
  if(!state.samples) state.samples = [];
  let n = (state.samples||[]).length + 1;
  let no = "";
  do{
    no = "NUM-" + String(n).padStart(4,"0");
    n++;
  }while((state.samples||[]).some(s=>s.no===no));
  return no;
}


function nextMigratedVisitNo(){
  if(!state.visits) state.visits = [];
  let n = (state.visits||[]).length + 1;
  let no = "";
  do{
    no = "ZTR-" + String(n).padStart(4,"0");
    n++;
  }while((state.visits||[]).some(v=>v.no===no));
  return no;
}

function normalizeSampleItemsForVisit(sample){
  const rawItems =
    (sample && Array.isArray(sample.items) && sample.items) ||
    (sample && Array.isArray(sample.urunler) && sample.urunler) ||
    (sample && Array.isArray(sample.products) && sample.products) ||
    (sample && Array.isArray(sample.numuneItems) && sample.numuneItems) ||
    [];

  return rawItems.map(it=>{
    const kod = it.kod || it.code || it.urunKod || it.productCode || "";
    const p = (state.urunler||[]).find(u=>u.kod===kod || u.ad===it.ad || u.ad===it.name || u.ad===it.urun) || {};
    return {
      kod:kod || p.kod || "",
      ad:it.ad || it.name || it.urun || it.productName || p.ad || "",
      kat:it.kat || it.kategori || p.kat || "",
      birim:"Adet",
      qty:parseInt(it.qty || it.miktar || it.adet || it.quantity)||1
    };
  }).filter(it=>it.kod || it.ad);
}

function migrateSamplesToVisits(silent){
  if(!state.samples) state.samples = [];
  if(!state.visits) state.visits = [];
  let count = 0;
  let linkedCount = 0;
  let skippedCount = 0;

  state.samples.forEach(sample=>{
    if(!sample) return;

    const sampleItems = normalizeSampleItemsForVisit(sample);
    const hasAnySampleInfo = sample.no || sample.firma || sample.tarih || sample.not || sampleItems.length;
    if(!hasAnySampleInfo){
      skippedCount++;
      return;
    }

    const linkedVisit = sample.visitNo ? state.visits.find(v=>v.no===sample.visitNo) : null;
    if(linkedVisit){
      if(!Array.isArray(linkedVisit.numuneItems) || !linkedVisit.numuneItems.length){
        linkedVisit.numuneItems = sampleItems;
      }
      if(!Array.isArray(linkedVisit.materyal)) linkedVisit.materyal = visitMaterialsArray(linkedVisit);
      if(!linkedVisit.materyal.includes("Numune")) linkedVisit.materyal.push("Numune");
      linkedVisit.sampleNo = sample.no || linkedVisit.sampleNo || "";
      linkedCount++;
      return;
    }

    const visitNo = nextMigratedVisitNo();
    const visit = {
      no: visitNo,
      tarih: sample.tarih || todayISO(),
      firmaMode: sample.firmaMode || "manuel",
      firma: sample.firma || "",
      yetkili: sample.yetkili || "",
      tel: sample.tel || "",
      sehir: sample.sehir || "",
      ilce: sample.ilce || "",
      materyal: ["Numune"],
      numuneItems: sampleItems,
      sampleNo: sample.no || "",
      durum: "İlk Ziyaret",
      takip: "",
      adres: sample.adres || "",
      not: "Eski Numune Girişi kaydından aktarıldı. " + (sample.not || "")
    };

    state.visits.push(visit);
    sample.visitNo = visitNo;
    sample.source = sample.source || "visit-migrated";
    if(!Array.isArray(sample.items)) sample.items = sampleItems;
    count++;
  });

  if(count > 0 || linkedCount > 0){
    saveState();
    if(!silent) alert(`${count} eski numune kaydı Ziyaret / Numune / Materyal tarafına aktarıldı. ${linkedCount} kayıt zaten bağlıydı/güncellendi.`);
  }else if(!silent){
    alert(`Aktarılacak eski numune kaydı bulunamadı. Toplam eski numune sayısı: ${(state.samples||[]).length}, zaten bağlı olan: ${linkedCount}, boş/geçersiz: ${skippedCount}. Eski listeyi görmek için "Eski Numune Sayfasını Aç" butonunu kullan.`);
  }

  return count;
}


function openOldSamplePage(){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  const sec = document.getElementById("numuneler");
  if(sec) sec.classList.add("active");
  document.querySelectorAll(".menu button").forEach(b=>b.classList.remove("active"));
  const pageTitleEl = document.getElementById("pageTitle");
  const pageSubEl = document.getElementById("pageSub");
  if(pageTitleEl) pageTitleEl.textContent = "Eski Numune Girişi";
  if(pageSubEl) pageSubEl.textContent = "Eski kayıtları kontrol etmek için geçici görünüm";
  renderSamples();
}

function manualMigrateSamplesToVisits(){
  migrateSamplesToVisits(false);
  renderAll();
  renderSamples();
  renderVisits();
}


function syncVisitLinkedSample(visit){
  if(!state.samples) state.samples = [];
  if(!visit) return;
  const items = Array.isArray(visit.numuneItems) ? visit.numuneItems : [];
  const existingIndex = state.samples.findIndex(s=>(s.visitNo && s.visitNo===visit.no) || (visit.sampleNo && s.no===visit.sampleNo));

  if(!items.length){
    if(existingIndex >= 0) state.samples.splice(existingIndex,1);
    visit.sampleNo = "";
    return;
  }

  const sampleNo = visit.sampleNo || (existingIndex >= 0 ? state.samples[existingIndex].no : nextLinkedSampleNo());
  const sampleObj = {
    no: sampleNo,
    tarih: visit.tarih || todayISO(),
    firma: visit.firma || "",
    firmaMode: visit.firmaMode || "manuel",
    yetkili: visit.yetkili || "",
    tel: visit.tel || "",
    mail: visit.mail || "",
    durum: "Verildi",
    not: "Ziyaret / Materyal kaydından numune. " + (visit.not || ""),
    items: items.map(it=>({kod:it.kod, ad:it.ad, kat:it.kat||"", qty:parseInt(it.qty)||1, birim:"Adet"})),
    source: "visit",
    visitNo: visit.no
  };

  if(existingIndex >= 0) state.samples[existingIndex] = sampleObj;
  else state.samples.push(sampleObj);

  visit.sampleNo = sampleNo;
}

function visitSampleSummaryText(v){
  const items = Array.isArray(v && v.numuneItems) ? v.numuneItems : [];
  if(!items.length) return "";
  return items.map(it=>`${it.kod||""} ${it.ad||""} (${parseInt(it.qty)||1} ${it.birim||"Adet"})`.trim()).join(", ");
}

function visitSampleSummaryHtml(v){
  const text = visitSampleSummaryText(v);
  if(!text) return "";
  return `<div class="visit-sample-summary"><b>Numune:</b> ${text}</div>`;
}

function saveVisit(){
  if(!state.visits) state.visits = [];
  if(!state.samples) state.samples = [];

  const modeEl = document.getElementById("z_firma_mode");
  const mode = modeEl ? modeEl.value : "manuel";
  const firma = mode === "kayitli"
    ? (document.getElementById("z_firma") ? z_firma.value : "")
    : (document.getElementById("z_firma_manual") ? z_firma_manual.value.trim() : "");

  if(!firma) return alert("Firma / müşteri adı giriniz.");

  const materials = getVisitMaterialsSafe();
  const numuneItems = getVisitSampleItems();

  if(materials.includes("Numune") && !numuneItems.length){
    return alert("Numune seçildi. Lütfen en az bir numune ürünü seçiniz.");
  }

  if(numuneItems.length && !materials.includes("Numune")){
    materials.push("Numune");
    setVisitSampleChecked(true);
  }

  const oldIdx = editingVisitNo ? state.visits.findIndex(v=>v.no===editingVisitNo) : -1;
  const oldVisit = oldIdx >= 0 ? state.visits[oldIdx] : null;

  const obj = {
    no: document.getElementById("z_no") ? (z_no.value || uid("ZTR")) : uid("ZTR"),
    tarih: document.getElementById("z_tarih") ? (z_tarih.value || todayISO()) : todayISO(),
    firmaMode: mode,
    firma,
    yetkili: document.getElementById("z_yetkili") ? z_yetkili.value : "",
    tel: document.getElementById("z_tel") ? z_tel.value : "",
    mail: document.getElementById("z_mail") ? z_mail.value : "",
    sehir: document.getElementById("z_sehir") ? z_sehir.value : "",
    ilce: document.getElementById("z_ilce") ? z_ilce.value : "",
    materyal: materials,
    numuneItems,
    sampleNo: oldVisit ? (oldVisit.sampleNo || "") : "",
    durum: document.getElementById("z_durum") ? z_durum.value : "İlk Ziyaret",
    takip: document.getElementById("z_takip") ? z_takip.value : "",
    adres: document.getElementById("z_adres") ? z_adres.value : "",
    not: document.getElementById("z_not") ? z_not.value : ""
  };

  if(oldIdx >= 0){
    state.visits[oldIdx] = obj;
    syncVisitLinkedSample(state.visits[oldIdx]);
    alert("Ziyaret / Materyal kaydı güncellendi.");
  } else {
    state.visits.push(obj);
    syncVisitLinkedSample(state.visits[state.visits.length-1]);
    alert(numuneItems.length ? "Ziyaret / Materyal ve numune kaydedildi." : "Ziyaret / Materyal kaydedildi.");
  }

  saveState();
  clearVisitForm();
  renderAll();
  renderVisits();
}

function editVisit(no){
  const v = (state.visits||[]).find(x=>x.no===no);
  if(!v) return;

  editingVisitNo = no;
  if(document.getElementById("z_no")) z_no.value = v.no || "";
  if(document.getElementById("z_tarih")) z_tarih.value = v.tarih || todayISO();

  const isRegistered = state.firmalar.some(f=>f.ad===v.firma);
  if(document.getElementById("z_firma_mode")) z_firma_mode.value = v.firmaMode || (isRegistered ? "kayitli" : "manuel");
  if(typeof toggleVisitFirma === "function") toggleVisitFirma();

  if(document.getElementById("z_firma_mode") && z_firma_mode.value === "kayitli"){
    if(document.getElementById("z_firma")) z_firma.value = v.firma || "";
  } else {
    if(document.getElementById("z_firma_manual")) z_firma_manual.value = v.firma || "";
  }

  if(document.getElementById("z_yetkili")) z_yetkili.value = v.yetkili || "";
  if(document.getElementById("z_tel")) z_tel.value = v.tel || "";
  if(document.getElementById("z_mail")) z_mail.value = v.mail || "";
  if(document.getElementById("z_sehir")) z_sehir.value = v.sehir || "";
  if(document.getElementById("z_ilce")) z_ilce.value = v.ilce || "";
  if(document.getElementById("z_durum")) z_durum.value = v.durum || "İlk Ziyaret";
  if(document.getElementById("z_takip")) z_takip.value = v.takip || "";
  if(document.getElementById("z_adres")) z_adres.value = v.adres || "";
  if(document.getElementById("z_not")) z_not.value = v.not || "";

  const mats = Array.isArray(v.materyal) ? v.materyal : String(v.materyal||"").split(",").map(x=>x.trim()).filter(Boolean);
  document.querySelectorAll(".z_mat, .matCheck").forEach(x=>x.checked = mats.includes(x.value));
  visitSampleSelected = {};
  (v.numuneItems || []).forEach(item=>{
    visitSampleSelected[item.kod] = {checked:true, qty:parseInt(item.qty)||1};
  });
  if((v.numuneItems||[]).length) setVisitSampleChecked(true);
  toggleVisitSampleArea();

  const btn=document.getElementById("saveVisitBtn");
  const cancelBtn=document.getElementById("cancelVisitEditBtn");
  if(btn) btn.textContent="Ziyaret / Materyal Güncelle";
  if(cancelBtn) cancelBtn.classList.remove("hide");

  const sec=document.getElementById("ziyaretler");
  if(sec) sec.scrollIntoView({behavior:"smooth", block:"start"});
  if(typeof populateCitySelect==="function") populateCitySelect("z_sehir","z_ilce",v.sehir||"",v.ilce||"");
}

