function delVisit(no){
  if(!confirm("Ziyaret / Materyal kaydı silinsin mi?")) return;
  state.samples = (state.samples||[]).filter(s=>s.visitNo!==no);
  state.visits = (state.visits||[]).filter(v=>v.no!==no);
  if(editingVisitNo === no) clearVisitForm();
  saveState();
  renderAll();
}

function convertVisitToFirma(no){
  const v = (state.visits||[]).find(x=>x.no===no);
  if(!v) return;
  const kod = prompt("Yeni firma kodu giriniz:");
  if(!kod) return;
  if(state.firmalar.some(f=>f.kod===kod)) return alert("Bu firma kodu zaten var.");

  state.firmalar.push({
    kod,
    ad:v.firma||"",
    tur:"Yeni Müşteri",
    sehir:v.sehir||"",
    ilce:v.ilce||"",
    vergi:"",
    vd:"",
    yetkili:v.yetkili||"",
    tel:v.tel||"",
    mail:v.mail||"",
    adres:v.adres||"",
    sevk:v.adres||"",
    vade:30,
    iskonto:"0",
    manualDisc:0,
    durum:"Aktif",
    not:"Ziyaret / Materyal kaydından aktarıldı. " + (v.not||""),
    created:todayISO()
  });

  v.durum = "Müşteriye Dönüştü";
  saveState();
  renderAll();
  alert("Ziyaret kaydı firmaya aktarıldı.");
}


const UNIT_OPTIONS = ["Adet","Koli","Kg","Paket"];
function unitSelectHtml(prefix,kod,current){
  current = current || "Adet";
  return `<select class="unit-select" onchange="setLineUnit('${prefix}','${kod}',this.value)">` +
    UNIT_OPTIONS.map(u=>`<option value="${u}" ${u===current?'selected':''}>${u}</option>`).join("") +
    `</select>`;
}
function setLineUnit(prefix,kod,val){
  if(prefix==="order"){
    if(!orderSelected[kod]) orderSelected[kod]={checked:false,qty:1};
    orderSelected[kod].birim=val;
    renderOrderProducts();
    return;
  }
  if(prefix==="quote"){
    if(!quoteSelected[kod]) quoteSelected[kod]={checked:false,qty:1,manualPrice:null,discount:null,noDiscount:false};
    quoteSelected[kod].birim=val;
    renderQuoteProducts();
    return;
  }
  if(prefix==="discount"){
    if(!discountSelected[kod]) discountSelected[kod]={checked:false,qty:1};
    discountSelected[kod].birim=val;
    renderDiscountProducts();
    return;
  }
}


function resetPaymentDateToToday(){
  const el = document.getElementById("t_tarih");
  if(el) el.value = todayISO();
}

function takePaymentFromFirma(firmaAd){
  go("tahsilatlar");
  setTimeout(()=>{
    resetPaymentDateToToday();
    const firmaEl = document.getElementById("t_firma");
    if(firmaEl){
      firmaEl.value = firmaAd || "";
      updatePaymentFirmBalance();
    }
    const tutarEl = document.getElementById("t_tutar");
    if(tutarEl) tutarEl.focus();
  }, 50);
}

function fillFullPayment(){
  const firmaEl = document.getElementById("t_firma");
  const tutarEl = document.getElementById("t_tutar");
  if(!firmaEl || !tutarEl) return;
  const firma = firmaEl.value;
  if(!firma) return alert("Firma seçiniz.");
  const bakiye = firmaOpenBalance(firma);
  if(bakiye <= 0) return alert("Bu firmanın açık bakiyesi yok.");
  const hidden=document.getElementById("t_order_no"); if(hidden) hidden.value="";
  tutarEl.value = bakiye.toFixed(2);
  renderPaymentInvoices();
}

function toggleVisitFirma(){
  const modeEl = document.getElementById("z_firma_mode");
  const registeredBox = document.getElementById("z_kayitli_box") || document.getElementById("z_firma_box");
  const manualBox = document.getElementById("z_manuel_box") || document.getElementById("z_firma_manual_box");
  if(!modeEl) return;
  const isRegistered = modeEl.value === "kayitli";
  if(registeredBox) registeredBox.classList.toggle("hide", !isRegistered);
  if(manualBox) manualBox.classList.toggle("hide", isRegistered);
}


/* TÜRKİYE İL / İLÇE SELECT SİSTEMİ */
const TR_CITY_DISTRICTS = {"Adana": ["Aladağ", "Ceyhan", "Çukurova", "Feke", "İmamoğlu", "Karaisalı", "Karataş", "Kozan", "Pozantı", "Saimbeyli", "Sarıçam", "Seyhan", "Tufanbeyli", "Yumurtalık", "Yüreğir"], "Adıyaman": ["Besni", "Çelikhan", "Gerger", "Gölbaşı", "Kahta", "Merkez", "Samsat", "Sincik", "Tut"], "Afyonkarahisar": ["Başmakçı", "Bayat", "Bolvadin", "Çay", "Çobanlar", "Dazkırı", "Dinar", "Emirdağ", "Evciler", "Hocalar", "İhsaniye", "İscehisar", "Kızılören", "Merkez", "Sandıklı", "Sinanpaşa", "Sultandağı", "Şuhut"], "Ağrı": ["Diyadin", "Doğubayazıt", "Eleşkirt", "Hamur", "Merkez", "Patnos", "Taşlıçay", "Tutak"], "Aksaray": ["Ağaçören", "Eskil", "Gülağaç", "Güzelyurt", "Merkez", "Ortaköy", "Sarıyahşi", "Sultanhanı"], "Amasya": ["Göynücek", "Gümüşhacıköy", "Hamamözü", "Merkez", "Merzifon", "Suluova", "Taşova"], "Ankara": ["Altındağ", "Ayaş", "Bala", "Beypazarı", "Çamlıdere", "Çankaya", "Çubuk", "Elmadağ", "Etimesgut", "Evren", "Gölbaşı", "Güdül", "Haymana", "Kahramankazan", "Kalecik", "Keçiören", "Kızılcahamam", "Mamak", "Nallıhan", "Polatlı", "Pursaklar", "Sincan", "Şereflikoçhisar", "Yenimahalle"], "Antalya": ["Akseki", "Aksu", "Alanya", "Demre", "Döşemealtı", "Elmalı", "Finike", "Gazipaşa", "Gündoğmuş", "İbradı", "Kaş", "Kemer", "Kepez", "Konyaaltı", "Korkuteli", "Kumluca", "Manavgat", "Muratpaşa", "Serik"], "Ardahan": ["Çıldır", "Damal", "Göle", "Hanak", "Merkez", "Posof"], "Artvin": ["Ardanuç", "Arhavi", "Borçka", "Hopa", "Kemalpaşa", "Merkez", "Murgul", "Şavşat", "Yusufeli"], "Aydın": ["Bozdoğan", "Buharkent", "Çine", "Didim", "Efeler", "Germencik", "İncirliova", "Karacasu", "Karpuzlu", "Koçarlı", "Köşk", "Kuşadası", "Kuyucak", "Nazilli", "Söke", "Sultanhisar", "Yenipazar"], "Balıkesir": ["Altıeylül", "Ayvalık", "Balya", "Bandırma", "Bigadiç", "Burhaniye", "Dursunbey", "Edremit", "Erdek", "Gömeç", "Gönen", "Havran", "İvrindi", "Karesi", "Kepsut", "Manyas", "Marmara", "Savaştepe", "Sındırgı", "Susurluk"], "Bartın": ["Amasra", "Kurucaşile", "Merkez", "Ulus"], "Batman": ["Beşiri", "Gercüş", "Hasankeyf", "Kozluk", "Merkez", "Sason"], "Bayburt": ["Aydıntepe", "Demirözü", "Merkez"], "Bilecik": ["Bozüyük", "Gölpazarı", "İnhisar", "Merkez", "Osmaneli", "Pazaryeri", "Söğüt", "Yenipazar"], "Bingöl": ["Adaklı", "Genç", "Karlıova", "Kiğı", "Merkez", "Solhan", "Yayladere", "Yedisu"], "Bitlis": ["Adilcevaz", "Ahlat", "Güroymak", "Hizan", "Merkez", "Mutki", "Tatvan"], "Bolu": ["Dörtdivan", "Gerede", "Göynük", "Kıbrıscık", "Mengen", "Merkez", "Mudurnu", "Seben", "Yeniçağa"], "Burdur": ["Ağlasun", "Altınyayla", "Bucak", "Çavdır", "Çeltikçi", "Gölhisar", "Karamanlı", "Kemer", "Merkez", "Tefenni", "Yeşilova"], "Bursa": ["Büyükorhan", "Gemlik", "Gürsu", "Harmancık", "İnegöl", "İznik", "Karacabey", "Keles", "Kestel", "Mudanya", "Mustafakemalpaşa", "Nilüfer", "Orhaneli", "Orhangazi", "Osmangazi", "Yenişehir", "Yıldırım"], "Çanakkale": ["Ayvacık", "Bayramiç", "Biga", "Bozcaada", "Çan", "Eceabat", "Ezine", "Gelibolu", "Gökçeada", "Lapseki", "Merkez", "Yenice"], "Çankırı": ["Atkaracalar", "Bayramören", "Çerkeş", "Eldivan", "Ilgaz", "Kızılırmak", "Korgun", "Kurşunlu", "Merkez", "Orta", "Şabanözü", "Yapraklı"], "Çorum": ["Alaca", "Bayat", "Boğazkale", "Dodurga", "İskilip", "Kargı", "Laçin", "Mecitözü", "Merkez", "Oğuzlar", "Ortaköy", "Osmancık", "Sungurlu", "Uğurludağ"], "Denizli": ["Acıpayam", "Babadağ", "Baklan", "Bekilli", "Beyağaç", "Bozkurt", "Buldan", "Çal", "Çameli", "Çardak", "Çivril", "Güney", "Honaz", "Kale", "Merkezefendi", "Pamukkale", "Sarayköy", "Serinhisar", "Tavas"], "Diyarbakır": ["Bağlar", "Bismil", "Çermik", "Çınar", "Çüngüş", "Dicle", "Eğil", "Ergani", "Hani", "Hazro", "Kayapınar", "Kocaköy", "Kulp", "Lice", "Silvan", "Sur", "Yenişehir"], "Düzce": ["Akçakoca", "Cumayeri", "Çilimli", "Gölyaka", "Gümüşova", "Kaynaşlı", "Merkez", "Yığılca"], "Edirne": ["Enez", "Havsa", "İpsala", "Keşan", "Lalapaşa", "Meriç", "Merkez", "Süloğlu", "Uzunköprü"], "Elazığ": ["Ağın", "Alacakaya", "Arıcak", "Baskil", "Karakoçan", "Keban", "Kovancılar", "Maden", "Merkez", "Palu", "Sivrice"], "Erzincan": ["Çayırlı", "İliç", "Kemah", "Kemaliye", "Merkez", "Otlukbeli", "Refahiye", "Tercan", "Üzümlü"], "Erzurum": ["Aşkale", "Aziziye", "Çat", "Hınıs", "Horasan", "İspir", "Karaçoban", "Karayazı", "Köprüköy", "Narman", "Oltu", "Olur", "Palandöken", "Pasinler", "Pazaryolu", "Şenkaya", "Tekman", "Tortum", "Uzundere", "Yakutiye"], "Eskişehir": ["Alpu", "Beylikova", "Çifteler", "Günyüzü", "Han", "İnönü", "Mahmudiye", "Mihalgazi", "Mihalıççık", "Odunpazarı", "Sarıcakaya", "Seyitgazi", "Sivrihisar", "Tepebaşı"], "Gaziantep": ["Araban", "İslahiye", "Karkamış", "Nizip", "Nurdağı", "Oğuzeli", "Şahinbey", "Şehitkamil", "Yavuzeli"], "Giresun": ["Alucra", "Bulancak", "Çamoluk", "Çanakçı", "Dereli", "Doğankent", "Espiye", "Eynesil", "Görele", "Güce", "Keşap", "Merkez", "Piraziz", "Şebinkarahisar", "Tirebolu", "Yağlıdere"], "Gümüşhane": ["Kelkit", "Köse", "Kürtün", "Merkez", "Şiran", "Torul"], "Hakkari": ["Çukurca", "Derecik", "Merkez", "Şemdinli", "Yüksekova"], "Hatay": ["Altınözü", "Antakya", "Arsuz", "Belen", "Defne", "Dörtyol", "Erzin", "Hassa", "İskenderun", "Kırıkhan", "Kumlu", "Payas", "Reyhanlı", "Samandağ", "Yayladağı"], "Iğdır": ["Aralık", "Karakoyunlu", "Merkez", "Tuzluca"], "Isparta": ["Aksu", "Atabey", "Eğirdir", "Gelendost", "Gönen", "Keçiborlu", "Merkez", "Senirkent", "Sütçüler", "Şarkikaraağaç", "Uluborlu", "Yalvaç", "Yenişarbademli"], "İstanbul": ["Adalar", "Arnavutköy", "Ataşehir", "Avcılar", "Bağcılar", "Bahçelievler", "Bakırköy", "Başakşehir", "Bayrampaşa", "Beşiktaş", "Beykoz", "Beylikdüzü", "Beyoğlu", "Büyükçekmece", "Çatalca", "Çekmeköy", "Esenler", "Esenyurt", "Eyüpsultan", "Fatih", "Gaziosmanpaşa", "Güngören", "Kadıköy", "Kağıthane", "Kartal", "Küçükçekmece", "Maltepe", "Pendik", "Sancaktepe", "Sarıyer", "Silivri", "Sultanbeyli", "Sultangazi", "Şile", "Şişli", "Tuzla", "Ümraniye", "Üsküdar", "Zeytinburnu"], "İzmir": ["Aliağa", "Balçova", "Bayındır", "Bayraklı", "Bergama", "Beydağ", "Bornova", "Buca", "Çeşme", "Çiğli", "Dikili", "Foça", "Gaziemir", "Güzelbahçe", "Karabağlar", "Karaburun", "Karşıyaka", "Kemalpaşa", "Kınık", "Kiraz", "Konak", "Menderes", "Menemen", "Narlıdere", "Ödemiş", "Seferihisar", "Selçuk", "Tire", "Torbalı", "Urla"], "Kahramanmaraş": ["Afşin", "Andırın", "Çağlayancerit", "Dulkadiroğlu", "Ekinözü", "Elbistan", "Göksun", "Nurhak", "Onikişubat", "Pazarcık", "Türkoğlu"], "Karabük": ["Eflani", "Eskipazar", "Merkez", "Ovacık", "Safranbolu", "Yenice"], "Karaman": ["Ayrancı", "Başyayla", "Ermenek", "Kazımkarabekir", "Merkez", "Sarıveliler"], "Kars": ["Akyaka", "Arpaçay", "Digor", "Kağızman", "Merkez", "Sarıkamış", "Selim", "Susuz"], "Kastamonu": ["Abana", "Ağlı", "Araç", "Azdavay", "Bozkurt", "Cide", "Çatalzeytin", "Daday", "Devrekani", "Doğanyurt", "Hanönü", "İhsangazi", "İnebolu", "Küre", "Merkez", "Pınarbaşı", "Seydiler", "Şenpazar", "Taşköprü", "Tosya"], "Kayseri": ["Akkışla", "Bünyan", "Develi", "Felahiye", "Hacılar", "İncesu", "Kocasinan", "Melikgazi", "Özvatan", "Pınarbaşı", "Sarıoğlan", "Sarız", "Talas", "Tomarza", "Yahyalı", "Yeşilhisar"], "Kırıkkale": ["Bahşılı", "Balışeyh", "Çelebi", "Delice", "Karakeçili", "Keskin", "Merkez", "Sulakyurt", "Yahşihan"], "Kırklareli": ["Babaeski", "Demirköy", "Kofçaz", "Lüleburgaz", "Merkez", "Pehlivanköy", "Pınarhisar", "Vize"], "Kırşehir": ["Akçakent", "Akpınar", "Boztepe", "Çiçekdağı", "Kaman", "Merkez", "Mucur"], "Kilis": ["Elbeyli", "Merkez", "Musabeyli", "Polateli"], "Kocaeli": ["Başiskele", "Çayırova", "Darıca", "Derince", "Dilovası", "Gebze", "Gölcük", "İzmit", "Kandıra", "Karamürsel", "Kartepe", "Körfez"], "Konya": ["Ahırlı", "Akören", "Akşehir", "Altınekin", "Beyşehir", "Bozkır", "Cihanbeyli", "Çeltik", "Çumra", "Derbent", "Derebucak", "Doğanhisar", "Emirgazi", "Ereğli", "Güneysınır", "Hadim", "Halkapınar", "Hüyük", "Ilgın", "Kadınhanı", "Karapınar", "Karatay", "Kulu", "Meram", "Sarayönü", "Selçuklu", "Seydişehir", "Taşkent", "Tuzlukçu", "Yalıhüyük", "Yunak"], "Kütahya": ["Altıntaş", "Aslanapa", "Çavdarhisar", "Domaniç", "Dumlupınar", "Emet", "Gediz", "Hisarcık", "Merkez", "Pazarlar", "Simav", "Şaphane", "Tavşanlı"], "Malatya": ["Akçadağ", "Arapgir", "Arguvan", "Battalgazi", "Darende", "Doğanşehir", "Doğanyol", "Hekimhan", "Kale", "Kuluncak", "Pütürge", "Yazıhan", "Yeşilyurt"], "Manisa": ["Ahmetli", "Akhisar", "Alaşehir", "Demirci", "Gölmarmara", "Gördes", "Kırkağaç", "Köprübaşı", "Kula", "Salihli", "Sarıgöl", "Saruhanlı", "Selendi", "Soma", "Şehzadeler", "Turgutlu", "Yunusemre"], "Mardin": ["Artuklu", "Dargeçit", "Derik", "Kızıltepe", "Mazıdağı", "Midyat", "Nusaybin", "Ömerli", "Savur", "Yeşilli"], "Mersin": ["Akdeniz", "Anamur", "Aydıncık", "Bozyazı", "Çamlıyayla", "Erdemli", "Gülnar", "Mezitli", "Mut", "Silifke", "Tarsus", "Toroslar", "Yenişehir"], "Muğla": ["Bodrum", "Dalaman", "Datça", "Fethiye", "Kavaklıdere", "Köyceğiz", "Marmaris", "Menteşe", "Milas", "Ortaca", "Seydikemer", "Ula", "Yatağan"], "Muş": ["Bulanık", "Hasköy", "Korkut", "Malazgirt", "Merkez", "Varto"], "Nevşehir": ["Acıgöl", "Avanos", "Derinkuyu", "Gülşehir", "Hacıbektaş", "Kozaklı", "Merkez", "Ürgüp"], "Niğde": ["Altunhisar", "Bor", "Çamardı", "Çiftlik", "Merkez", "Ulukışla"], "Ordu": ["Akkuş", "Altınordu", "Aybastı", "Çamaş", "Çatalpınar", "Çaybaşı", "Fatsa", "Gölköy", "Gülyalı", "Gürgentepe", "İkizce", "Kabadüz", "Kabataş", "Korgan", "Kumru", "Mesudiye", "Perşembe", "Ulubey", "Ünye"], "Osmaniye": ["Bahçe", "Düziçi", "Hasanbeyli", "Kadirli", "Merkez", "Sumbas", "Toprakkale"], "Rize": ["Ardeşen", "Çamlıhemşin", "Çayeli", "Derepazarı", "Fındıklı", "Güneysu", "Hemşin", "İkizdere", "İyidere", "Kalkandere", "Merkez", "Pazar"], "Sakarya": ["Adapazarı", "Akyazı", "Arifiye", "Erenler", "Ferizli", "Geyve", "Hendek", "Karapürçek", "Karasu", "Kaynarca", "Kocaali", "Pamukova", "Sapanca", "Serdivan", "Söğütlü", "Taraklı"], "Samsun": ["Alaçam", "Asarcık", "Atakum", "Ayvacık", "Bafra", "Canik", "Çarşamba", "Havza", "İlkadım", "Kavak", "Ladik", "Ondokuzmayıs", "Salıpazarı", "Tekkeköy", "Terme", "Vezirköprü", "Yakakent"], "Siirt": ["Baykan", "Eruh", "Kurtalan", "Merkez", "Pervari", "Şirvan", "Tillo"], "Sinop": ["Ayancık", "Boyabat", "Dikmen", "Durağan", "Erfelek", "Gerze", "Merkez", "Saraydüzü", "Türkeli"], "Sivas": ["Akıncılar", "Altınyayla", "Divriği", "Doğanşar", "Gemerek", "Gölova", "Gürün", "Hafik", "İmranlı", "Kangal", "Koyulhisar", "Merkez", "Suşehri", "Şarkışla", "Ulaş", "Yıldızeli", "Zara"], "Şanlıurfa": ["Akçakale", "Birecik", "Bozova", "Ceylanpınar", "Eyyübiye", "Halfeti", "Haliliye", "Harran", "Hilvan", "Karaköprü", "Siverek", "Suruç", "Viranşehir"], "Şırnak": ["Beytüşşebap", "Cizre", "Güçlükonak", "İdil", "Merkez", "Silopi", "Uludere"], "Tekirdağ": ["Çerkezköy", "Çorlu", "Ergene", "Hayrabolu", "Kapaklı", "Malkara", "Marmaraereğlisi", "Muratlı", "Saray", "Süleymanpaşa", "Şarköy"], "Tokat": ["Almus", "Artova", "Başçiftlik", "Erbaa", "Merkez", "Niksar", "Pazar", "Reşadiye", "Sulusaray", "Turhal", "Yeşilyurt", "Zile"], "Trabzon": ["Akçaabat", "Araklı", "Arsin", "Beşikdüzü", "Çarşıbaşı", "Çaykara", "Dernekpazarı", "Düzköy", "Hayrat", "Köprübaşı", "Maçka", "Of", "Ortahisar", "Sürmene", "Şalpazarı", "Tonya", "Vakfıkebir", "Yomra"], "Tunceli": ["Çemişgezek", "Hozat", "Mazgirt", "Merkez", "Nazımiye", "Ovacık", "Pertek", "Pülümür"], "Uşak": ["Banaz", "Eşme", "Karahallı", "Merkez", "Sivaslı", "Ulubey"], "Van": ["Bahçesaray", "Başkale", "Çaldıran", "Çatak", "Edremit", "Erciş", "Gevaş", "Gürpınar", "İpekyolu", "Muradiye", "Özalp", "Saray", "Tuşba"], "Yalova": ["Altınova", "Armutlu", "Çınarcık", "Çiftlikköy", "Merkez", "Termal"], "Yozgat": ["Akdağmadeni", "Aydıncık", "Boğazlıyan", "Çandır", "Çayıralan", "Çekerek", "Kadışehri", "Merkez", "Saraykent", "Sarıkaya", "Sorgun", "Şefaatli", "Yenifakılı", "Yerköy"], "Zonguldak": ["Alaplı", "Çaycuma", "Devrek", "Ereğli", "Gökçebey", "Kilimli", "Kozlu", "Merkez"]};

function setInputDatalistOptions(inputEl, values){
  if(!inputEl || inputEl.tagName !== "INPUT") return;
  const listId = inputEl.getAttribute("list");
  if(!listId) return;
  const list = document.getElementById(listId);
  if(!list) return;
  list.innerHTML = values.map(v=>`<option value="${v}"></option>`).join("");
}

function populateCitySelect(cityId, districtId, selectedCity="", selectedDistrict=""){
  const cityEl = document.getElementById(cityId);
  if(!cityEl) return;
  const cities = Object.keys(TR_CITY_DISTRICTS);
  const defaultCity = "İstanbul";
  const oldCity = selectedCity || cityEl.value || defaultCity;

  if(cityEl.tagName === "INPUT"){
    setInputDatalistOptions(cityEl, cities);
    cityEl.value = TR_CITY_DISTRICTS[oldCity] ? oldCity : defaultCity;
  }else{
    cityEl.innerHTML = `<option value="">İl Seçiniz</option>` + cities.map(c=>`<option value="${c}">${c}</option>`).join("");
    cityEl.value = TR_CITY_DISTRICTS[oldCity] ? oldCity : defaultCity;
  }

  populateDistrictSelect(cityId, districtId, selectedDistrict);
}

function populateDistrictSelect(cityId, districtId, selectedDistrict=""){
  const cityEl = document.getElementById(cityId);
  const districtEl = document.getElementById(districtId);
  if(!cityEl || !districtEl) return;
  const city = TR_CITY_DISTRICTS[cityEl.value] ? cityEl.value : "İstanbul";
  const old = selectedDistrict || districtEl.value || "";
  const districts = TR_CITY_DISTRICTS[city] || [];

  if(districtEl.tagName === "INPUT"){
    setInputDatalistOptions(districtEl, districts);
    districtEl.value = districts.includes(old) ? old : "";
  }else{
    districtEl.innerHTML = `<option value="">İlçe Seçiniz</option>` + districts.map(d=>`<option value="${d}">${d}</option>`).join("");
    districtEl.value = districts.includes(old) ? old : "";
  }
}

function populateFilterCitySelect(){
  const el = document.getElementById("ff_city");
  if(!el) return;
  const old = el.value || "";
  el.innerHTML = `<option value="">Tüm İller</option>` + Object.keys(TR_CITY_DISTRICTS).map(c=>`<option value="${c}">${c}</option>`).join("");
  if(old && TR_CITY_DISTRICTS[old]) el.value = old;
}

function initCityDistrictSelects(){
  populateCitySelect("f_sehir","f_ilce");
  populateCitySelect("z_sehir","z_ilce");
  populateFilterCitySelect();
}


/* İl/ilçe selectlerini program ilk yüklendikten sonra kesin doldur */
window.addEventListener('DOMContentLoaded', function(){
  if(typeof initCityDistrictSelects === "function") initCityDistrictSelects();
});
setTimeout(function(){
  if(typeof initCityDistrictSelects === "function") initCityDistrictSelects();
}, 100);

/* İl/ilçe selectleri view değişiminde boş kalmasın */
if(typeof go === "function" && !window.__cityGoWrapped){
  window.__cityGoWrapped = true;
  const __oldGoCity = go;
  go = function(view){
    __oldGoCity(view);
    setTimeout(function(){
      if(typeof initCityDistrictSelects === "function") initCityDistrictSelects();
    }, 50);
  };
}


/* PROGRAM GÜVENLİ BAŞLATMA - tüm fonksiyonlar ve il/ilçe datası tanımlandıktan sonra */
(function bootCariTakip(){
  try{
    if(typeof renderAll === "function") renderAll();
    if(typeof initCityDistrictSelects === "function") initCityDistrictSelects();
  }catch(err){
    console.error("Program başlatma hatası:", err);
    alert("Program başlatılırken hata oluştu: " + (err && err.message ? err.message : err));
  }
})();

