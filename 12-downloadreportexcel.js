function downloadReportExcel(){
  renderReports();
  const name = reportTitle().toLowerCase().replaceAll(" ","_").replaceAll("/","_") + ".xls";
  tableToExcelHtml("reportTable", name);
}
function downloadReportCSV(){
  renderReports();
  const rows = cleanReportRows(reportRows());
  if(!rows.length) return alert("İndirilecek kayıt yok.");
  const keys = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? "").replaceAll('"','""')}"`;
  const lines = [keys.map(esc).join(";")].concat(rows.map(r=>keys.map(k=>{
    const val = r[k];
    return esc(typeof val === "number" ? String(val).replace(".", ",") : val);
  }).join(";")));
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = reportTitle().toLowerCase().replaceAll(" ","_").replaceAll("/","_") + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
function printReport(){
  renderReports();
  const content = document.getElementById("reportPrintArea").outerHTML;
  const w = window.open("", "_blank");
  w.document.write(`
    <html>
    <head>
      <title>${reportTitle()}</title>
      <style>
        body{font-family:Arial;padding:20px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #999;padding:6px;text-align:left}
        th{background:#eee}
        .money{text-align:right}
      
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
    <body>${content}</body>
    </html>
  `);
  w.document.close();
  w.print();
}


function menuButtonLabel(view){
  const btn = document.querySelector(`#menu button[data-view="${view}"]`);
  return btn ? btn.textContent.trim() : view;
}
function currentMenuOrder(){
  return Array.from(document.querySelectorAll("#menu button")).map(b=>b.dataset.view);
}

const DEFAULT_APP_NAME = "Cari Takip";

function ensureAppSettings(){
  if(!state.ayarlar) state.ayarlar = {};
  if(!state.ayarlar.app) state.ayarlar.app = {};
  if(!state.ayarlar.app.name) state.ayarlar.app.name = DEFAULT_APP_NAME;
  if(!state.ayarlar.whatsapp || typeof state.ayarlar.whatsapp !== "object") state.ayarlar.whatsapp = {};
  if(!("accountantPhone" in state.ayarlar.whatsapp)) state.ayarlar.whatsapp.accountantPhone = "";
}

function applyAppIdentity(){
  ensureAppSettings();
  const name = state.ayarlar.app.name || DEFAULT_APP_NAME;
  const logo = state.ayarlar.app.logo || "";

  const brandTitle = document.getElementById("brandTitle");
  const brandLogo = document.getElementById("brandLogo");
  const nameInput = document.getElementById("set_app_name");
  const preview = document.getElementById("set_logo_preview");
  const empty = document.getElementById("set_logo_empty");

  if(brandTitle) brandTitle.textContent = name;
  document.title = name + " - Cari Takip";
  if(nameInput) nameInput.value = name;
  const accountantWhatsappInput = document.getElementById("set_accountant_whatsapp");
  if(accountantWhatsappInput) accountantWhatsappInput.value = state.ayarlar.whatsapp.accountantPhone || "";

  if(brandLogo){
    if(logo){
      brandLogo.src = logo;
      brandLogo.classList.remove("hide");
    }else{
      brandLogo.removeAttribute("src");
      brandLogo.classList.add("hide");
    }
  }

  if(preview){
    if(logo){
      preview.src = logo;
      preview.classList.remove("hide");
      if(empty) empty.classList.add("hide");
    }else{
      preview.removeAttribute("src");
      preview.classList.add("hide");
      if(empty) empty.classList.remove("hide");
    }
  }
}

function loadAppLogoFile(input){
  const file = input && input.files ? input.files[0] : null;
  if(!file) return;
  if(!file.type.startsWith("image/")){
    alert("Lütfen resim dosyası seçiniz.");
    input.value = "";
    return;
  }
  if(file.size > 1024 * 1024){
    alert("Logo dosyası 1 MB altında olmalı.");
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e){
    ensureAppSettings();
    state.ayarlar.app.logo = e.target.result;
    applyAppIdentity();
  };
  reader.readAsDataURL(file);
}

