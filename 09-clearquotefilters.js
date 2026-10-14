function clearQuoteFilters(){
  ["qf_search","qf_start","qf_end"].forEach(id=>{const el=document.getElementById(id); if(el) el.value="";});
  const st=document.getElementById("qf_status"); if(st) st.value="";
  renderQuotes();
}
function delQuote(i){
  if(confirm("Teklif / proforma silinsin mi?")){
    state.quotes.splice(i,1);
    saveState();
    renderAll();
  }
}

function quoteToOrder(i){
  const q = state.quotes[i];
  if(!q) return;
  if(!confirm("Bu teklif siparişe çevrilsin mi?")) return;

  const f = state.firmalar.find(x=>x.ad===q.firma);
  const vade = f ? (parseInt(f.vade)||0) : 0;
  const d = new Date(todayISO()+"T00:00:00");
  d.setDate(d.getDate()+vade);

  state.orders.push({
    no:"SIP-"+String(state.orders.length+1).padStart(4,"0"),
    tarih:todayISO(),
    firma:q.firma,
    vade,
    vadeTarih:d.toISOString().slice(0,10),
    iskonto:q.iskonto,
    manualDisc:q.manualDisc,
    durum:"Beklemede",
    kargoFirma:"",
    kargoNo:"",
    kargoDurum:"Yok",
    aciklama:"Tekliften oluşturuldu: " + q.no,
    items:q.items,
    brut:q.brut,
    disc:q.disc,
    kdv:q.kdv,
    total:q.total
  });

  q.durum="Siparişe Döndü";
  saveState();
  renderAll();
  alert("Teklif siparişe çevrildi.");
}

function printQuote(i){
  const q = state.quotes[i];
  if(!q) return;
  const rows = (q.items||[]).map(it=>`
    <tr>
      <td>${it.kod}</td><td>${it.ad}</td><td>${it.qty}</td><td>${money(it.fiyat)}</td><td>${money(it.brut)}</td><td>${money(it.disc)}</td><td>${money(it.kdv)}</td><td>${money(it.total)}</td>
    </tr>
  `).join("");

  const w = window.open("", "_blank");
  w.document.write(`
    <html><head><title>${q.no}</title>
    <style>
      body{font-family:Arial;padding:24px}
      h1{margin-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-top:18px}
      th,td{border:1px solid #999;padding:8px;text-align:left}
      th{background:#eee}
      .right{text-align:right}
    
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

  </style></head>
    <body>
      <h1>TEKLİF / PROFORMA</h1>
      <p><b>No:</b> ${q.no}</p>
      <p><b>Tarih:</b> ${trDate(q.tarih)}</p>
      <p><b>Firma:</b> ${q.firma}</p>
      <p><b>Geçerlilik:</b> ${q.validDays||0} gün</p>
      <table>
        <thead><tr><th>Kod</th><th>Ürün</th><th>Miktar</th><th>Birim</th><th>Birim Fiyat</th><th>Brüt</th><th>İskonto</th><th>KDV</th><th>Toplam</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <h3 class="right">Genel Toplam: ${money(q.total)}</h3>
      <p>${q.aciklama||""}</p>
    </body></html>
  `);
  w.document.close();
  w.print();
}


let sampleSelected = {};
let editingSampleIndex = null;
let editingVisitNo = null;
let visitSampleSelected = {};
function toggleSampleFirma(){
  const manuel = n_firma_mode.value==="manuel";
  n_manuel_box.classList.toggle("hide", !manuel);
  n_kayitli_box.classList.toggle("hide", manuel);
}
function renderSampleProducts(){
  const filter = n_kat_filter.value || "";
  const products = sortedProducts(state.urunler||[]).filter(u=>isProductActiveForUse(u) && (!filter || u.kat===filter));
  sampleProductList.innerHTML = products.map(u=>{
    const sel = sampleSelected[u.kod] || {checked:false,qty:1};
    return `<tr>
      <td class="checkcell"><input type="checkbox" ${sel.checked?'checked':''} onchange="toggleSampleProduct('${u.kod}',this.checked)"></td>
      <td>${u.kod}</td><td>${u.ad}</td><td>${u.kat}</td>
      <td><input class="num" type="number" min="1" step="1" value="${sel.qty}" onchange="setSampleQty('${u.kod}',this.value)"></td>
    </tr>`;
  }).join("");
}
function toggleSampleProduct(kod, checked){ if(!sampleSelected[kod]) sampleSelected[kod]={qty:1}; sampleSelected[kod].checked=checked; renderSampleProducts();}
function setSampleQty(kod, val){ val=parseInt(val)||1; if(val<1) val=1; if(!sampleSelected[kod]) sampleSelected[kod]={checked:false}; sampleSelected[kod].qty=val; renderSampleProducts();}
function saveSample(){
  const items=[];
  Object.entries(sampleSelected).forEach(([kod,sel])=>{
    if(!sel.checked) return;
    const p=state.urunler.find(u=>u.kod===kod); if(!p)return;
    items.push({kod:p.kod,ad:p.ad,kat:p.kat,qty:parseInt(sel.qty)||1});
  });
  const firma = n_firma_mode.value==="manuel" ? n_firma_manual.value.trim() : n_firma.value;
  if(!firma) return alert("Firma seçiniz veya manuel firma yazınız.");
  if(!items.length) return alert("En az bir ürün seçiniz.");

  const obj = {
    no:n_no.value||uid("NUM"),
    tarih:n_tarih.value,
    firma,
    firmaMode:n_firma_mode.value,
    yetkili:n_yetkili.value,
    tel:n_tel.value,
    durum:n_durum.value,
    not:n_not.value,
    items
  };

  if(editingSampleIndex !== null && state.samples[editingSampleIndex]){
    state.samples[editingSampleIndex] = obj;
    alert("Numune güncellendi.");
  } else {
    state.samples.push(obj);
    alert("Numune kaydedildi.");
  }

  saveState();
  clearSampleForm();
  renderAll();
}

function clearSampleForm(){
  editingSampleIndex = null;
  sampleSelected = {};
  n_no.value="NUM-"+String(state.samples.length+1).padStart(4,"0");
  n_tarih.value=todayISO();
  n_firma_mode.value="kayitli";
  toggleSampleFirma();
  n_firma_manual.value="";
  n_yetkili.value="";
  n_tel.value="";
  n_durum.value="Verildi";
  n_not.value="";
  const btn = document.getElementById("saveSampleBtn");
  const cancelBtn = document.getElementById("cancelSampleEditBtn");
  if(btn) btn.textContent = "Numuneyi Kaydet";
  if(cancelBtn) cancelBtn.classList.add("hide");
  renderSampleProducts();
}

function editSample(i){
  const s = state.samples[i];
  if(!s) return;

  editingSampleIndex = i;
  sampleSelected = {};

  n_no.value = s.no || "";
  n_tarih.value = s.tarih || todayISO();

  const isRegistered = state.firmalar.some(f=>f.ad===s.firma);
  n_firma_mode.value = s.firmaMode || (isRegistered ? "kayitli" : "manuel");
  toggleSampleFirma();

  if(n_firma_mode.value === "kayitli"){
    n_firma.value = s.firma || "";
  } else {
    n_firma_manual.value = s.firma || "";
  }

  n_yetkili.value = s.yetkili || "";
  n_tel.value = s.tel || "";
  n_durum.value = s.durum || "Verildi";
  n_not.value = s.not || "";

  (s.items||[]).forEach(item=>{
    sampleSelected[item.kod] = {
      checked:true,
      qty:parseInt(item.qty)||1
    };
  });

  const btn = document.getElementById("saveSampleBtn");
  const cancelBtn = document.getElementById("cancelSampleEditBtn");
  if(btn) btn.textContent = "Numuneyi Güncelle";
  if(cancelBtn) cancelBtn.classList.remove("hide");

  renderSampleProducts();
  document.getElementById("numuneler").scrollIntoView({behavior:"smooth", block:"start"});
}

function cancelSampleEdit(){
  clearSampleForm();
}

function viewSample(i){
  const s = state.samples[i];
  if(!s) return;

  const itemRows = normalizeSampleItemsForVisit(s).map(it=>`
    <tr>
      <td>${it.kod}</td>
      <td>${it.ad}</td>
      <td>${it.kat||""}</td>
      <td class="money">${it.qty}</td>
    </tr>
  `).join("") || `<tr><td colspan="4" class="muted">Ürün yok</td></tr>`;

  sampleDetailContent.innerHTML = `
    <div class="cards">
      <div class="card"><div class="stat-label">Numune No</div><div class="stat-value">${s.no}</div></div>
      <div class="card"><div class="stat-label">Tarih</div><div class="stat-value">${trDate(s.tarih)}</div></div>
      <div class="card"><div class="stat-label">Ürün Sayısı</div><div class="stat-value">${normalizeSampleItemsForVisit(s).length}</div></div>
      <div class="card"><div class="stat-label">Toplam Adet</div><div class="stat-value">${normalizeSampleItemsForVisit(s).reduce((a,b)=>a+(Number(b.qty)||0),0)}</div></div>
      <div class="card"><div class="stat-label">Durum</div><div class="stat-value">${s.durum}</div></div>
      <div class="card"><div class="stat-label">Cari Etki</div><div class="stat-value">Yok</div></div>
    </div>

    <div class="grid-half">
      <div class="card">
        <h2>Firma Bilgisi</h2>
        <p><b>Firma:</b> ${s.firma||""}</p>
        <p><b>Yetkili:</b> ${s.yetkili||""}</p>
        <p><b>Telefon:</b> ${s.tel||""}</p>
      </div>
      <div class="card">
        <h2>Notlar</h2>
        <p>${s.not||""}</p>
      </div>
    </div>

    <div class="card">
      <div class="section-head"><h2>Verilen Numune Ürünleri</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ürün Kodu</th><th>Ürün Adı</th><th>Kategori</th><th>Adet</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>
    </div>
  `;

  sampleDetailCard.classList.remove("hide");
  sampleDetailCard.scrollIntoView({behavior:"smooth", block:"start"});
}

