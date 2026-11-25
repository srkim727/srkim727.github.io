---
title: Explore PANGEA cell types
author: S. Kim
date: 2025-10-18
layout: post
excerpt: ""
---

{% raw %}

<style>
  .pg-wrap{
    --accent:#3b82f6; --accent-dark:#2563eb; --accent-light:#dbeafe;
    --ok:#10b981; --ok-dark:#059669; --ok-light:#ecfdf5; --ok-border:#a7f3d0;
    --err:#ef4444; --err-light:#fef2f2; --err-border:#fecaca;
    --muted:#6b7280; --text:#111827;
    --border:#e5e7eb; --border-strong:#d1d5db;
    --bg-panel:#fafbfc;
    max-width:780px;margin:14px auto;
  }
  .pg-wrap .panel{
    background:var(--bg-panel);border:1px solid var(--border);
    border-radius:10px;padding:16px 18px;
  }
  .pg-wrap .ctrl-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px;}
  .pg-wrap .btn{
    font:inherit;font-size:13px;height:32px;padding:0 14px;box-sizing:border-box;
    border:1px solid var(--border);background:#fff;color:var(--text);
    border-radius:6px;cursor:pointer;line-height:1;
    transition:background .15s,border-color .15s,box-shadow .15s,color .15s;
  }
  .pg-wrap .btn:hover:not(:disabled){border-color:var(--border-strong);box-shadow:0 1px 2px rgba(0,0,0,.05);}
  .pg-wrap .btn:disabled{color:#9ca3af;background:#f3f4f6;border-color:var(--border);cursor:not-allowed;}
  .pg-wrap .btn-primary{background:var(--accent);border-color:var(--accent);color:#fff;}
  .pg-wrap .btn-primary:hover:not(:disabled){background:var(--accent-dark);border-color:var(--accent-dark);}
  .pg-wrap .btn-primary:disabled{background:#bfdbfe;border-color:#bfdbfe;color:#fff;}
  .pg-wrap .inline-ctl{display:flex;gap:6px;align-items:center;font-size:13px;color:var(--muted);}
  .pg-wrap .inline-ctl select,
  .pg-wrap .inline-ctl input[type="text"]{
    font:inherit;font-size:13px;height:32px;padding:0 10px;box-sizing:border-box;
    border:1px solid var(--border);background:#fff;color:var(--text);
    border-radius:6px;
  }
  .pg-wrap .inline-ctl select{padding:0 28px 0 10px;cursor:pointer;}
  .pg-wrap .inline-ctl select:hover,
  .pg-wrap .inline-ctl input[type="text"]:focus{border-color:var(--border-strong);outline:none;}

  /* Stepper */
  .pg-wrap .stages{display:flex;align-items:center;gap:8px;margin:6px 0 10px 0;font-size:12px;color:var(--muted);}
  .pg-wrap .stage{display:flex;align-items:center;gap:6px;}
  .pg-wrap .stage-dot{
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:2px solid #e5e7eb;display:flex;align-items:center;justify-content:center;
    font-size:9px;color:#fff;line-height:1;transition:all .2s;
  }
  .pg-wrap .stage.active .stage-dot{border-color:var(--accent);box-shadow:0 0 0 4px var(--accent-light);}
  .pg-wrap .stage.done .stage-dot{background:var(--ok);border-color:var(--ok);}
  .pg-wrap .stage.done .stage-dot::after{content:"✓";color:#fff;font-weight:700;}
  .pg-wrap .stage.err .stage-dot{background:var(--err);border-color:var(--err);}
  .pg-wrap .stage.err .stage-dot::after{content:"×";color:#fff;font-weight:700;font-size:11px;}
  .pg-wrap .stage.active .stage-label,
  .pg-wrap .stage.done .stage-label,
  .pg-wrap .stage.err .stage-label{color:var(--text);font-weight:500;}
  .pg-wrap .stage-sep{flex:1;height:1px;background:var(--border);}

  /* Progress bar */
  .pg-wrap progress#progBar{
    width:100%;height:6px;border:none;background:#f3f4f6;border-radius:3px;overflow:hidden;display:block;
  }
  .pg-wrap progress#progBar::-webkit-progress-bar{background:#f3f4f6;border-radius:3px;}
  .pg-wrap progress#progBar::-webkit-progress-value{background:var(--accent);border-radius:3px;transition:width .2s;}
  .pg-wrap progress#progBar::-moz-progress-bar{background:var(--accent);border-radius:3px;}
  .pg-wrap .status-line{font-size:12px;color:var(--muted);margin:6px 0 0 0;min-height:1em;}

  /* Result card (plot output) */
  .pg-wrap .result-card{ margin-top:14px; }
  .pg-wrap .result-card.err{
    padding:12px 14px;border-radius:8px;
    background:var(--err-light);border:1px solid var(--err-border);
  }
  .pg-wrap .result-card .result-head{
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    flex-wrap:wrap;margin-bottom:10px;
  }
  .pg-wrap .result-summary{font-size:14px;color:var(--text);font-weight:500;flex:1;min-width:180px;}
  .pg-wrap .result-summary .stat{color:var(--muted);font-weight:400;font-size:12px;margin-left:6px;}
  .pg-wrap .btn-download{
    background:var(--ok);border-color:var(--ok);color:#fff !important;padding:0 10px;height:26px;
    font-size:11px;letter-spacing:.01em;
    display:inline-flex;align-items:center;gap:4px;text-decoration:none;font-weight:500;
    border:1px solid var(--ok);border-radius:5px;transition:background .15s,border-color .15s;
  }
  .pg-wrap .btn-download:hover{background:var(--ok-dark);border-color:var(--ok-dark);color:#fff !important;text-decoration:none;}
  .pg-wrap .plot-img{max-width:100%;border:1px solid var(--border);border-radius:6px;background:#fff;display:block;}

  /* Info meta-panel */
  .pg-wrap .meta-panel{
    background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;
    padding:14px 16px;margin:14px 0 0 0;color:var(--text);font-size:13px;
  }
  .pg-wrap .meta-panel code{background:#eef2f7;padding:1px 4px;border-radius:4px;}
  .pg-wrap .meta-panel small{color:var(--muted);}

  /* Log */
  .pg-wrap details.log-wrap{margin-top:12px;}
  .pg-wrap details.log-wrap summary{cursor:pointer;font-size:12px;color:var(--muted);padding:4px 0;}
  .pg-wrap details.log-wrap summary:hover{color:var(--text);}

  @media (max-width:620px){
    .pg-wrap{margin:8px;}
    .pg-wrap .panel{padding:12px;}
    .pg-wrap .stages{font-size:11px;}
    .pg-wrap .btn-download{height:auto;min-height:26px;padding:4px 10px;word-break:break-all;}
  }

  /* ---------- polish v2 ---------- */
  .pg-wrap .panel{box-shadow:0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.02);}
  .pg-wrap .meta-panel{box-shadow:0 1px 3px rgba(0,0,0,.03);}
  .pg-wrap .btn:focus-visible,
  .pg-wrap .inline-ctl select:focus-visible,
  .pg-wrap .inline-ctl input:focus-visible,
  .pg-wrap .btn-download:focus-visible{
    outline:2px solid var(--accent);outline-offset:2px;
  }
  .pg-wrap .btn:active:not(:disabled),
  .pg-wrap .btn-primary:active:not(:disabled),
  .pg-wrap .btn-download:active{transform:translateY(1px);}
  .pg-wrap .meta-panel a{color:var(--accent);text-decoration:none;transition:color .15s;}
  .pg-wrap .meta-panel a:hover{text-decoration:underline;color:var(--accent-dark);}
  .pg-wrap .page-caption{
    font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;
    margin:0 0 8px 4px;display:flex;align-items:center;gap:6px;
  }
  .pg-wrap .page-caption .dot{width:5px;height:5px;border-radius:50%;background:var(--accent);display:inline-block;}
  .pg-wrap .result-card.err{position:relative;padding-left:54px;}
  .pg-wrap .result-card.err::before{
    content:"×";position:absolute;left:14px;top:12px;
    width:28px;height:28px;border-radius:50%;background:var(--err);color:#fff;
    display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;
  }
</style>

<div class="pg-wrap">

<div class="page-caption"><span class="dot"></span>Interactive · PANGEA</div>

<!-- Interactive panel -->
<div class="panel">
  <div class="ctrl-row">
    <label class="inline-ctl">
      <span>Level</span>
      <select id="levelSelect" style="min-width:120px;">
        <option>level1</option>
        <option>level2</option>
      </select>
    </label>

    <label class="inline-ctl" style="flex:1;min-width:220px;">
      <span>Cell</span>
      <select id="cellSelect" style="flex:1;min-width:180px;"></select>
    </label>

    <button class="btn btn-primary" id="runBtn" type="button" disabled>Explore</button>
  </div>

  <!-- Stepper: Boot → Data → Plot -->
  <div class="stages" id="stages">
    <span class="stage" id="stage-boot"><span class="stage-dot"></span><span class="stage-label">Boot</span></span>
    <span class="stage-sep"></span>
    <span class="stage" id="stage-data"><span class="stage-dot"></span><span class="stage-label">Data</span></span>
    <span class="stage-sep"></span>
    <span class="stage" id="stage-plot"><span class="stage-dot"></span><span class="stage-label">Plot</span></span>
  </div>

  <progress id="progBar" max="100" value="0"></progress>
  <div class="status-line" id="progStatus">Loading assets…</div>

  <!-- Result card (plot + download) -->
  <div class="result-card" id="resultCard" style="display:none;">
    <div class="result-head">
      <div class="result-summary" id="resultSummary"></div>
      <a class="btn-download" id="downloadPNG" download="explore.png" style="display:none;">⬇ Download PNG</a>
    </div>
    <img class="plot-img" id="plotImg" alt="plot" style="display:none;">
  </div>
</div>

<!-- Info panel -->
<div class="meta-panel" id="metaPanel">
  <strong>Meta information of the cell types</strong>
  <p style="margin:6px 0 8px 0;">This page shows various information including</p>
  <ol style="margin:0 0 0 18px;">
    <li style="margin:2px 0;">Organ distribution patterns</li>
    <li style="margin:2px 0;">Matching annotation from previous literatures
      <ul style="margin:6px 0 0 18px;">
        <li>row indicates <code>{literature_annotation}@{source_literature}</code></li>
        <li><code>SEN</code>: sensitivity: ratio of <code>{literature_annotation}</code> assigned to this <code>{PANGEA_annotation}</code></li>
        <li><code>PPV</code>: positive-predictive value: ratio of <code>{PANGEA_annotation}</code> assigned to this <code>{literature_annotation}</code></li>
        <li><code>CFS</code>: confidence score: average prediction confidence score (<code>PG_combined_score</code>)</li>
        <li><code>score</code>: overall score, i.e., cubic root of above parameters</li>
      </ul>
    </li>
    <li style="margin:2px 0;">Distribution patterns in tumor contexts
      <ul style="margin:6px 0 0 18px;">
        <li>shows results from PANGEA database (both Curated &amp; Re-aligned database)</li>
      </ul>
    </li>
  </ol>
</div>

<!-- Log (collapsed by default) -->
<details class="log-wrap">
  <summary>Log</summary>
  <pre id="log" style="
    background:#0a0f17;color:#e8eef7;padding:8px 10px;border-radius:6px;overflow:auto;height:200px;
    white-space:pre-wrap;font-size:11px;line-height:1.3;font-family:ui-monospace,Menlo,Consolas,monospace;margin-top:6px;">
  </pre>
</details>

</div><!-- /.pg-wrap -->

<script>
(function(){
  const DATA_BASE = "/assets/data/";
  const FONT = "'DejaVu Sans', Verdana, sans-serif";
  const ACCENT = "#3b82f6", GRID = "#e5e7eb", PAD = 1.08*10.8;
  const DEF = {l:0.125, r:0.9, b:0.11, t:0.88, hs:0.2};
  const RDYLBU = [[0.6470588235294118,0,0.14901960784313725],[0.8431372549019608,0.18823529411764706,0.15294117647058825],
    [0.9568627450980393,0.42745098039215684,0.2627450980392157],[0.9921568627450981,0.6823529411764706,0.3803921568627451],
    [0.996078431372549,0.8784313725490196,0.5647058823529412],[1,1,0.7490196078431373],[0.8784313725490196,0.9529411764705882,0.9725490196078431],
    [0.6705882352941176,0.8509803921568627,0.9137254901960784],[0.4549019607843137,0.6784313725490196,0.8196078431372549],
    [0.27058823529411763,0.4588235294117647,0.7058823529411765],[0.19215686274509805,0.21176470588235294,0.5843137254901961]].reverse();

  const $ = (id)=>document.getElementById(id);
  function setDisabled(id, v){ const el=$(id); if(el) el.disabled = !!v; }
  function log(msg){
    const el=$("log"); el.textContent += msg + "\n";
    const lines = el.textContent.split("\n");
    if(lines.length>500){ el.textContent = lines.slice(-500).join("\n"); }
    el.scrollTop = el.scrollHeight;
  }
  function stage(pct, msg){
    $("progBar").value = pct;
    $("progStatus").textContent = msg;
  }
  function setStageState(name, state){
    const el = $("stage-" + name); if(!el) return;
    el.classList.remove("active","done","err");
    if(state && state !== "pending") el.classList.add(state);
  }
  function resetStages(){
    setStageState("boot","pending"); setStageState("data","pending"); setStageState("plot","pending");
  }
  function clearImage(){
    $("plotImg").style.display = "none";
    $("plotImg").removeAttribute("src");
    $("resultCard").style.display = "none";
    $("resultCard").classList.remove("err");
    $("resultSummary").textContent = "";
    $("downloadPNG").style.display = "none";
  }

  const CELLS_L1 = [
 'Astrocyte','B_GC','B_mature','B_progenitor','Ciliated','Dendritic_classical',
 'Dendritic_plasmacytoid','Ductal','Endothelial','Erythroid','Fibroblast','Hematopoietic',
 'Hepatocyte','Macrophage','Mast&Basophil','Melanocyte','Monocyte','Muller','Mural',
 'Neuron_bipolar','Neuron_excitatory','Neuron_inhibitory','Neutrophil',
 'Oligodendrocyte_mature','Oligodendrocyte_progenitor','Plasma','Platelet','Rod',
 'Schwann','Spermatocyte','Squamous','T&NK'
  ].sort((a,b)=>a.localeCompare(b));

  const CELLS_L2 = [
 'B_mature|CCL4','B_mature|EGR','B_mature|GBP','B_mature|HSP','B_mature|ISG','B_mature|Memory_atypical',
 'B_mature|Memory_switched','B_mature|Memory_unswitched','B_mature|Naive',
 'Dendritic_classical|ACY3','Dendritic_classical|AS-DC','Dendritic_classical|CXCL9','Dendritic_classical|DC1',
 'Dendritic_classical|DC2','Dendritic_classical|DC3','Dendritic_classical|EGR','Dendritic_classical|EREG',
 'Dendritic_classical|FCGR3A','Dendritic_classical|HSP','Dendritic_classical|ISG','Dendritic_classical|LAMP3',
 'Dendritic_classical|Langerhans',
 'Ductal|AT0','Ductal|AT1','Ductal|AT2','Ductal|BEST4','Ductal|Club','Ductal|Collecting-duct',
 'Ductal|Colonocyte','Ductal|Conjunctival','Ductal|DEFB4A','Ductal|Enterocyte','Ductal|Ependymal',
 'Ductal|Gastric','Ductal|Gastrointestinal_common','Ductal|Gingival','Ductal|Gland_CA6',
 'Ductal|Gland_LTF','Ductal|Gland_MUCL1','Ductal|Gland_SOX17','Ductal|Goblet','Ductal|Ionocyte','Ductal|KLK7',
 'Ductal|Pancreatobiliary_acinar','Ductal|Pancreatobiliary_ductal','Ductal|Proximal-tubule','Ductal|Submucosal_mucous',
 'Ductal|Submucosal_serous','Ductal|Thick-ascending','Ductal|Trophoblast_extravillous','Ductal|Trophoblast_villous',
 'Ductal|Tuft','Ductal|Urothelial','Ductal|thin-limb',
 'Endothelial|Arterial','Endothelial|BMP4','Endothelial|CXCR4','Endothelial|Capillary_BBB',
 'Endothelial|Capillary_activated','Endothelial|Capillary_aerocyte','Endothelial|Capillary_general',
 'Endothelial|Lymphatic_HGF','Endothelial|Lymphatic_LYVE1','Endothelial|Sinusoidal','Endothelial|Venous_C7',
 'Endothelial|Venous_CXCL10','Endothelial|Venous_DPEP1','Endothelial|Venous_ISG','Endothelial|Venous_activated',
 'Endothelial|Venous_general',
 'Fibroblast|ADAMDEC1','Fibroblast|Alveolar','Fibroblast|CCL19','Fibroblast|CD36','Fibroblast|CLDN1',
 'Fibroblast|CLEC14A','Fibroblast|COCH','Fibroblast|COX15','Fibroblast|CST2','Fibroblast|Chondrocyte',
 'Fibroblast|Corneal','Fibroblast|Dermal-sheath','Fibroblast|GREM2','Fibroblast|HSP','Fibroblast|IL24',
 'Fibroblast|IL6','Fibroblast|ISG','Fibroblast|ITGB8','Fibroblast|KLK1','Fibroblast|LRRC15','Fibroblast|NRG1',
 'Fibroblast|SYT1','Fibroblast|Satellite','Fibroblast|Universal',
 'Macrophage|Alveolar','Macrophage|CX3CR1','Macrophage|EREG','Macrophage|HSP','Macrophage|ISG','Macrophage|LYVE1',
 'Macrophage|MATK',
 'Monocyte|Classical_CCL4','Monocyte|Classical_FABP5','Monocyte|Classical_IL1R2','Monocyte|Classical_general',
 'Monocyte|HSP','Monocyte|ISG','Monocyte|Intermediate','Monocyte|Non-classical',
 'Mural|CD36','Mural|FGF7','Mural|ISG','Mural|LAMC3','Mural|RERGL','Mural|ROBO2','Mural|SPINT2','Mural|TNFAIP6',
 'Squamous|Basal','Squamous|Ciliary','Squamous|Corneal','Squamous|Eccrine','Squamous|HFSC',
 'Squamous|Keratinocyte_activated','Squamous|Keratinocyte_basal','Squamous|Keratinocyte_granular',
 'Squamous|Keratinocyte_spinous','Squamous|MHCII','Squamous|McSC','Squamous|Myoepithelial','Squamous|Sebaceous',
 'Squamous|Trophoblast','Squamous|Umbrella','Squamous|cTEC',
 'T&NK|ILC','T&NK|NK_CD16','T&NK|NK_CD56','T&NK|NK_CXCR6','T&NK|T&NK_HSP','T&NK|T&NK_ISG',
 'T&NK|T_CD4_CXCL13','T&NK|T_CD4_EM_Tfh','T&NK|T_CD4_EM_Th1','T&NK|T_CD4_EM_Th17','T&NK|T_CD4_EM_Th2',
 'T&NK|T_CD4_EM_Th22','T&NK|T_CD4_EM_Treg','T&NK|T_CD4_Eff_IFNG','T&NK|T_CD4_Eff_IL13','T&NK|T_CD4_Eff_IL17',
 'T&NK|T_CD4_N&CM','T&NK|T_CD4_RM_Th1','T&NK|T_CD4_RM_Th17','T&NK|T_CD4_RM_Treg','T&NK|T_CD4_activated',
 'T&NK|T_CD8_EM','T&NK|T_CD8_EMRA','T&NK|T_CD8_KLRC2','T&NK|T_CD8_MHCII','T&NK|T_CD8_N&CM','T&NK|T_CD8_RM',
 'T&NK|T_CD8_activated','T&NK|T_CD8_exhausted','T&NK|T_MAIT','T&NK|T_gdT_TRDV1','T&NK|T_gdT_TRDV2'
  ].sort((a,b)=>a.localeCompare(b));

  function populateCells(){
    const lvl = $("levelSelect").value.trim();
    const sel = $("cellSelect");
    sel.innerHTML = "";
    const arr = (lvl==="level1") ? CELLS_L1 : CELLS_L2;
    for(const c of arr){
      const opt=document.createElement("option");
      opt.textContent = c; opt.value = c;
      sel.appendChild(opt);
    }
  }
  populateCells();
  $("levelSelect").addEventListener("change", populateCells);

  const n2 = (v)=>+v.toFixed(2);
  const union = (a,b)=> !a ? b : !b ? a : [Math.min(a[0],b[0]), Math.min(a[1],b[1]), Math.max(a[2],b[2]), Math.max(a[3],b[3])];
  const rgbS = (c)=>"rgb(" + c.slice(0,3).map(x=>Math.round(x*255)).join(",") + ")";
  const hexRgb = (h)=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
  const esc = (s)=>String(s).replace(/[&<>"]/g, c=>"&#" + c.charCodeAt(0) + ";");
  const ctx = document.createElement("canvas").getContext("2d");
  const tw = (s,fs,b)=>{ ctx.font = (b ? "bold " : "") + fs + "px " + FONT; return ctx.measureText(s).width; };

  const cache = new Map();
  async function getFile(url, label, {optional=false, json=false}={}){
    try{
      if(!cache.has(url)) cache.set(url, fetch(url).then(async r=>{
        if(!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
        const t = await r.text();
        return {size: t.length, data: json ? JSON.parse(t) : parseCSV(t)};
      }));
      const v = await cache.get(url);
      log(`✅ ${label} (${(v.size/1e6).toFixed(2)} MB)`);
      return v.data;
    }catch(e){
      cache.delete(url);
      if(optional){ log(`⚠️ Optional ${label} missing: ${e?.message||e}`); return null; }
      throw e;
    }
  }

  function parseCSV(t){
    let rows;
    if(t.includes('"')){
      rows = []; let row = [], f = "", q = false;
      for(let i=0;i<t.length;i++){
        const c = t[i];
        if(q){ if(c === '"'){ if(t[i+1] === '"'){ f += '"'; i++; } else q = false; } else f += c; }
        else if(c === '"') q = true;
        else if(c === ","){ row.push(f); f = ""; }
        else if(c === "\n" || c === "\r"){ if(c === "\r" && t[i+1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
        else f += c;
      }
      if(f !== "" || row.length){ row.push(f); rows.push(row); }
    } else rows = t.split(/\r?\n/).map(l=>l.split(","));
    const head = rows.shift().slice(1), body = rows.filter(r=>r.length > 1 || r[0] !== "");
    return { index: body.map(r=>r[0]), has: (c)=>head.includes(c),
             col: (c, num)=>{ const j = head.indexOf(c) + 1; return body.map(r=>num ? (r[j] === "" || r[j] === undefined ? NaN : +r[j]) : r[j]); } };
  }

  function pyDivmod(x, y){
    let mod = x % y, div = (x - mod)/y;
    if(mod && ((y < 0) !== (mod < 0))){ mod += y; div -= 1; }
    let fd = 0;
    if(div){ fd = Math.floor(div); if(div - fd > 0.5) fd += 1; }
    return [fd, mod];
  }
  function maxN(lo, hi, nbins){
    const scale = 10 ** Math.floor(Math.log10((hi - lo)/nbins)), raw = (hi - lo)/nbins;
    const steps = [0.1,0.2,0.25,0.5,1,2,2.5,5,10,20].map(s=>s*scale);
    let ticks = [];
    for(let i = steps.findIndex(s=>s >= raw); i < steps.length; i++){
      const st = steps[i], best = pyDivmod(lo, st)[0]*st;
      let [dl, ml] = pyDivmod(lo - best, st), [dh, mh] = pyDivmod(hi - best, st);
      if(Math.abs(ml/st - 1) < 1e-10) dl += 1;
      if(!(Math.abs(mh/st) < 1e-10)) dh += 1;
      ticks = [];
      for(let k = dl; k <= dh; k++) ticks.push(k*st + best);
      if(ticks.filter(t=>t <= hi && t >= lo).length >= 2) break;
    }
    return ticks;
  }
  function scalarFmt(locs){
    const rint = (y)=>{ const f = Math.floor(y), d = y - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 ? f + 1 : f); };
    let range = Math.max(...locs) - Math.min(...locs);
    if(range === 0) range = Math.max(...locs.map(Math.abs)) || 1;
    const oom = Math.floor(Math.log10(range)), thresh = 1e-3 * 10 ** oom;
    let sig = Math.max(0, 3 - oom);
    while(sig >= 0 && Math.max(...locs.map(v=>Math.abs(v - rint(v * 10 ** sig)/10 ** sig))) < thresh) sig--;
    sig++;
    return (v)=>(Math.abs(v) < 1e-8 ? 0 : v).toFixed(sig).replace("-", "−");
  }
  function autoscale(lo, hi, sticky=[]){
    const mx = Math.max(Math.abs(lo), Math.abs(hi));
    if(hi - lo <= mx*1e-15){ if(!lo && !hi){ lo = -0.05; hi = 0.05; } else { lo -= 0.05*Math.abs(lo); hi += 0.05*Math.abs(hi); } }
    const tol = 1e-5*Math.max(Math.abs(lo), Math.abs(hi), hi - lo), d = 0.05*(hi - lo);
    const b0 = sticky.filter(s=>s < lo + tol), b1 = sticky.filter(s=>s > hi - tol);
    return [b0.length ? Math.max(lo - d, ...b0) : lo - d, b1.length ? Math.min(hi + d, ...b1) : hi + d];
  }
  function autoTicks(A, ax, fs = 9){
    const lim = ax === "x" ? A.xl : A.yl, lo = Math.min(...lim), hi = Math.max(...lim);
    const nb = Math.min(9, Math.max(1, Math.floor(ax === "x" ? A.w/(3*fs) : A.h/(2*fs))));
    const raw = maxN(lo, hi, nb), fmt = scalarFmt(raw), tol = 1e-10*(hi - lo);
    return raw.filter(v=>v >= lo - tol && v <= hi + tol).map(v=>({v, s: fmt(v)}));
  }
  function npArgsort(v){
    const t = v.map((_,i)=>i), sw = (a,b)=>{ const x = t[a]; t[a] = t[b]; t[b] = x; }, stack = [];
    let pl = 0, pr = v.length - 1;
    for(;;){
      while(pr - pl > 15){
        const pm = pl + ((pr - pl) >> 1);
        if(v[t[pm]] < v[t[pl]]) sw(pm, pl);
        if(v[t[pr]] < v[t[pm]]) sw(pr, pm);
        if(v[t[pm]] < v[t[pl]]) sw(pm, pl);
        const vp = v[t[pm]];
        let pi = pl, pj = pr - 1;
        sw(pm, pj);
        for(;;){
          do ++pi; while(v[t[pi]] < vp);
          do --pj; while(vp < v[t[pj]]);
          if(pi >= pj) break;
          sw(pi, pj);
        }
        sw(pi, pr - 1);
        if(pi - pl < pr - pi){ stack.push(pi + 1, pr); pr = pi - 1; } else { stack.push(pl, pi - 1); pl = pi + 1; }
      }
      for(let pi = pl + 1; pi <= pr; ++pi){
        const vi = t[pi], vp = v[vi];
        let pj = pi;
        while(pj > pl && vp < v[t[pj - 1]]){ t[pj] = t[pj - 1]; pj--; }
        t[pj] = vi;
      }
      if(!stack.length) break;
      pr = stack.pop(); pl = stack.pop();
    }
    return t;
  }
  function desat(rgb, p){
    const [r,g,b] = rgb, mx = Math.max(r,g,b), mn = Math.min(r,g,b), l = (mx + mn)/2;
    if(mx === mn) return [r,g,b];
    let s = l <= 0.5 ? (mx - mn)/(mx + mn) : (mx - mn)/(2 - mx - mn);
    const rc = (mx - r)/(mx - mn), gc = (mx - g)/(mx - mn), bc = (mx - b)/(mx - mn);
    const h = (((r === mx ? bc - gc : g === mx ? 2 + rc - bc : 4 + gc - rc)/6) % 1 + 1) % 1;
    s *= p;
    const m2 = l <= 0.5 ? l*(1 + s) : l + s - l*s, m1 = 2*l - m2;
    const f = (x)=>{ x = (x % 1 + 1) % 1; return x < 1/6 ? m1 + (m2 - m1)*x*6 : x < 0.5 ? m2 : x < 2/3 ? m1 + (m2 - m1)*(2/3 - x)*6 : m1; };
    return [f(h + 1/3), f(h), f(h - 1/3)];
  }
  function rdylbu(v){
    const i = Math.min(255, Math.floor(Math.min(Math.max(v, 0), 1)*256)), x = i/255*10, k = Math.min(9, Math.floor(x)), f = x - k;
    return rgbS(RDYLBU[k].map((c,j)=>c + (RDYLBU[k+1][j] - c)*f));
  }
  function erf(x){
    const a = Math.abs(x);
    if(a > 2.5){ let f = 0; for(let k = 60; k >= 1; k--) f = (k/2)/(a + f); return Math.sign(x)*(1 - Math.exp(-a*a)/Math.sqrt(Math.PI)/(a + f)); }
    let term = a, s = a;
    for(let k = 1; k < 200; k++){ term *= -a*a/k; const d = term/(2*k + 1); s += d; if(Math.abs(d) < 1e-17) break; }
    return Math.sign(x)*2/Math.sqrt(Math.PI)*s;
  }
  function mwuP(a, b){
    const n1 = a.length, n2 = b.length, n = n1 + n2, c = a.concat(b);
    const idx = c.map((_,i)=>i).sort((i,j)=>c[i] - c[j] || i - j), rk = new Array(n);
    let tie = 0;
    for(let i = 0; i < n;){
      let j = i;
      while(j + 1 < n && c[idx[j+1]] === c[idx[i]]) j++;
      for(let k = i; k <= j; k++) rk[idx[k]] = (i + j)/2 + 1;
      tie += (j - i + 1)**3 - (j - i + 1); i = j + 1;
    }
    let R1 = 0; for(let k = 0; k < n1; k++) R1 += rk[k];
    const vU = n > 1 ? n1*n2/12*((n + 1) - tie/(n*(n - 1))) : 0;
    if(vU <= 0) return 1;
    const z = (R1 - n1*(n1 + 1)/2 - n1*n2/2)/Math.sqrt(vU);
    return 2*(1 - 0.5*(1 + erf(Math.abs(z)/Math.SQRT2)));
  }
  function stats(v){
    const n = v.length; if(!n) return null;
    const m = v.reduce((a,b)=>a + b, 0)/n;
    const se = n > 1 ? Math.sqrt(v.reduce((a,b)=>a + (b - m)**2, 0)/(n - 1))/Math.sqrt(n) : NaN;
    return {m, se, lo: m - se, hi: m + se};
  }

  function text(o){
    const fs = o.fs, ls = o.ls || 1.2, lh = fs*0.96, ld = fs*0.21;
    const parts = String(o.s).split("\n").map(l=>l.split(/\$_(.)\$/));
    const ws = parts.map(p=>p.reduce((a,s,i)=>a + tw(s, i % 2 ? fs*0.7 : fs, o.b), 0));
    const hd = parts.map(p=>p.length > 1 ? [fs*1.1, fs*0.275] : [lh, ld]), base = [];
    hd.forEach(([h,d],k)=>base.push(k ? base[k-1] + hd[k-1][1] + Math.max(lh - ld, h - d)*ls : h - d));
    const W = Math.max(...ws), Wb = o.rot && !o.anchor ? W*1.0167 : W, Ht = base[base.length - 1] + hd[hd.length - 1][1], h0 = base[0];
    const fx = {left:0, center:0.5, right:1}[o.ha || "left"];
    const fy = {top:0, center:Ht/2, bottom:Ht, baseline:h0, center_baseline:h0/2}[o.va || "baseline"];
    let bx = 0, by = 0, tf = "", box;
    if(!o.rot){ bx = o.x - fx*W; by = o.y - fy; box = [o.x - fx*Wb, by, o.x + (1 - fx)*Wb, by + Ht]; }
    else if(o.anchor){ bx = -fx*W; by = -fy; tf = `translate(${n2(o.x)} ${n2(o.y)}) rotate(-90)`; box = [o.x + by, o.y - (1 - fx)*Wb, o.x + by + Ht, o.y + fx*Wb]; }
    else {
      const L = o.x - fx*Ht, T = o.y - {top:0, center:Wb/2, bottom:Wb}[o.va || "top"];
      tf = `translate(${n2(L)} ${n2(T + W)}) rotate(-90)`; box = [L, T, L + Ht, T + Wb];
    }
    const sh = n2(fs*0.22);
    const lines = parts.map((p,k)=>`<text x="${n2(bx + fx*(W - ws[k]))}" y="${n2(by + base[k])}">` +
      p.map((s,i)=>i % 2 ? `<tspan font-size="${n2(fs*0.7)}" dy="${sh}">${esc(s)}</tspan>` : i ? `<tspan dy="${-sh}">${esc(s)}</tspan>` : esc(s)).join("") + `</text>`).join("");
    return { box, svg: `<g font-size="${fs}"${o.b ? ' font-weight="bold"' : ""} fill="${o.color}"${tf ? ` transform="${tf}"` : ""}>${lines}</g>` };
  }
  function wrap(s, fs, maxW, re = /[^ _|,]+[ _|,]*|[ _|,]+/g){
    if(tw(s, fs) <= maxW) return s;
    const i = s.indexOf("@"), d = i > 0 ? s.slice(i) : "", lines = [""];
    const toks = [...((d ? s.slice(0, i) : s).match(re) || []), ...(!d ? [] : tw(d, fs) <= maxW ? [d] : d.match(re))];
    for(const t of toks){
      const k = lines.length - 1;
      if(lines[k] && tw(lines[k] + t, fs) > maxW) lines.push(t); else lines[k] += t;
    }
    return lines.map(l=>l.trimEnd()).join("\n");
  }

  function mkAx(x0, y0, w, h, xl, yl){
    return {x0, y0, w, h, xl, yl, X: (v)=>x0 + (v - xl[0])/(xl[1] - xl[0])*w, Y: (v)=>y0 + h - (v - yl[0])/(yl[1] - yl[0])*h};
  }
  const clip = (A, id)=>`<clipPath id="${id}"><rect x="${n2(A.x0)}" y="${n2(A.y0)}" width="${n2(A.w)}" height="${n2(A.h)}"/></clipPath>`;
  const rect = (x0, y0, x1, y1, a="")=>`<rect x="${n2(Math.min(x0,x1))}" y="${n2(Math.min(y0,y1))}" width="${n2(Math.abs(x1 - x0))}" height="${n2(Math.abs(y1 - y0))}"${a}/>`;
  function errPath(A, i, lo, hi, vert){
    const c = 0.075, P = (x,y)=>vert ? `${n2(A.X(x))} ${n2(A.Y(y))}` : `${n2(A.X(y))} ${n2(A.Y(x))}`;
    return `M${P(i - c, lo)}L${P(i + c, lo)}M${P(i, lo)}L${P(i, hi)}M${P(i - c, hi)}L${P(i + c, hi)}`;
  }

  function deco(A, o){
    const fs = o.fs || 9, lfs = o.lfs || 10, under = [], over = [], x1 = A.x0 + A.w, y1 = A.y0 + A.h, L = 6, P = 3.5;
    let full = [A.x0, A.y0, x1, y1], lay = full.slice();
    const add = (t, f)=>{ over.push(t.svg); full = union(full, t.box); lay = union(lay, f ? f(t.box) : t.box); return t.box; };
    const tick = `stroke="${o.tc}" stroke-width="1.25"`;
    const grid = (s)=>s === ":" ? `stroke="${GRID}" stroke-width="0.6" stroke-opacity="0.8" stroke-dasharray="0.6 0.99"` : `stroke="${GRID}" stroke-width="0.7" stroke-opacity="0.9"`;
    const xb = (o.xt || []).map(t=>{
      const x = A.X(t.v);
      if(o.gx) under.push(`<path d="M${n2(x)} ${n2(A.y0)}V${n2(y1)}" ${grid(o.gx)}/>`);
      over.push(`<path d="M${n2(x)} ${n2(y1)}v${L}" ${tick}/>`);
      return add(text({x, y: y1 + L + P, s: t.s, fs: o.xfs || fs, color: o.tc, ha: "center", va: "top", rot: o.xrot}));
    });
    const yb = (o.yt || []).map(t=>{
      const y = A.Y(t.v), xe = o.yr ? x1 : A.x0, sg = o.yr ? 1 : -1;
      if(o.gy) under.push(`<path d="M${n2(A.x0)} ${n2(y)}H${n2(x1)}" ${grid(o.gy)}/>`);
      over.push(`<path d="M${n2(xe)} ${n2(y)}h${sg*L}" ${tick}/>`);
      return add(text({x: xe + sg*(L + P), y, s: t.s, fs, color: o.tc, ha: o.yr ? "left" : "right", va: o.yva || "center_baseline"}));
    });
    const cx = A.x0 + A.w/2, cy = A.y0 + A.h/2;
    if(o.xlabel) add(text({x: cx, y: Math.max(y1, ...xb.map(b=>b[3])) + 4, s: o.xlabel, fs: lfs, color: o.lc, ha: "center", va: "top"}), (b)=>[cx - 0.5, b[1], cx + 0.5, b[3]]);
    if(o.ylabel) add(text({x: o.yr ? Math.max(x1, ...yb.map(b=>b[2])) + 4 : Math.min(A.x0, ...yb.map(b=>b[0])) - 4, y: cy, s: o.ylabel, fs: lfs,
      color: o.lc, ha: "center", va: o.yr ? "top" : "bottom", rot: 1, anchor: 1}), (b)=>[b[0], cy - 0.5, b[2], cy + 0.5]);
    if(o.title) add(text({x: cx, y: A.y0 - 8, s: o.title, fs: o.tfs || 11, b: 1, color: "#111827", ha: "center", va: "baseline"}), (b)=>[cx - 0.5, b[1], cx + 0.5, b[3]]);
    if(o.sp) over.push(`<path d="M${n2(A.x0)} ${n2(A.y0)}V${n2(y1)}H${n2(x1)}" fill="none" stroke="${o.sc}" stroke-width="0.8"/>`);
    if(o.outline) over.push(rect(A.x0, A.y0, x1, y1, ` fill="none" stroke="${o.outline}" stroke-width="0.8"`));
    return {under, over, full, lay};
  }

  function tight1(W, H, pos, lay){
    const ml = Math.max(pos[0] - lay[0], 0) + PAD, mr = Math.max(lay[2] - pos[2], 0) + PAD;
    const mt = Math.max(pos[1] - lay[1], 0) + PAD, mb = Math.max(lay[3] - pos[3], 0) + PAD;
    return ml + mr < W && mt + mb < H ? {l: ml/W, r: 1 - mr/W, b: mb/H, t: 1 - mt/H} : null;
  }
  const header = (x, y, s)=>text({x, y, s, fs: 19, b: 1, color: "#111827", va: "bottom"});
  const finish = (parts, box)=>({svg: parts.join(""), box: [box[0] - 7.2, box[1] - 7.2, box[2] + 7.2, box[3] + 7.2]});

  function fig1(D){
    const W = 504, H = 720, F = 13.5, xs = D.ov.map(r=>r[1]), ys = D.ov.map(r=>r[2]), nb = D.bars.length, ok = D.bars.filter(Boolean);
    const xl = autoscale(Math.min(...xs), Math.max(...xs)), yl = autoscale(Math.min(...ys), Math.max(...ys));
    const bl = autoscale(Math.min(0, ...ok.map(b=>isNaN(b.lo) ? b.m : b.lo)), Math.max(0, ...ok.map(b=>isNaN(b.hi) ? b.m : b.hi)), [0]);
    const hl = D.ov.find(r=>r[0] === D.cell), fillB = rgbS(desat(hexRgb(ACCENT), 0.75));
    const build = (p)=>{
      const x0 = p.l*W, w = (p.r - p.l)*W, top = (1 - p.t)*H, ch = (p.t - p.b)*H/(2 + p.hs), u = ch/4;
      const A = mkAx(x0, top, w, 5*u, xl, yl), B = mkAx(x0, top + 5*u + p.hs*ch, w, 3*u, [-0.5, nb - 0.5], bl);
      const st = {fs: F, lfs: 15, tc: "#374151", lc: "#111827", sc: "#9ca3af", sp: 1};
      const dA = deco(A, {...st, xt: autoTicks(A, "x", F), yt: autoTicks(A, "y", F), gx: ":", gy: ":", xlabel: "Organ specificity", ylabel: "Average proportion"});
      const dB = deco(B, {...st, xt: D.order.map((s,v)=>({v, s})), xrot: 1, xfs: Math.min(F, (B.w/nb - 0.4)/0.97), yt: autoTicks(B, "y", F), gy: ":",
        ylabel: "Proportion", title: D.cell, tfs: 16.5});
      const pts = [`<g fill="#d1d5db" fill-opacity="0.8">${D.ov.map(r=>`<circle cx="${n2(A.X(r[1]))}" cy="${n2(A.Y(r[2]))}" r="2.55"/>`).join("")}</g>`], extra = [];
      if(hl){
        const x = A.X(hl[1]), y = A.Y(hl[2]), lw = tw(D.cell, F, 1), sp = tw("  " + D.cell, F, 1) - lw, rt = x + sp + lw <= A.x0 + A.w;
        pts.push(`<circle cx="${n2(x)}" cy="${n2(y)}" r="5.92" fill="${ACCENT}" stroke="#000" stroke-width="0.8"/>`);
        const t1 = text({x: rt ? x + sp : x - sp, y, s: D.cell, fs: F, b: 1, color: ACCENT, ha: rt ? "left" : "right", va: "center"});
        const hb = union(t1.box, [x - 6, y - 6, x + 6, y + 6]);
        const note = (r)=>text({x: A.X(r ? Math.max(...xs) : Math.min(...xs)), y: A.Y(Math.max(...ys)), s: `Organ spec.: ${hl[1].toFixed(2)}\nAverage prop.: ${hl[2].toFixed(2)}`,
          fs: 12, color: "#6b7280", ha: r ? "right" : "left", va: "top"});
        let t2 = note(1), b = t2.box;
        if(b[0] - 9 < hb[2] && hb[0] < b[2] + 9 && b[1] - 9 < hb[3] && hb[1] < b[3] + 9){ t2 = note(0); b = t2.box; }
        extra.push(t1.svg, rect(b[0] - 4.8, b[1] - 4.8, b[2] + 4.8, b[3] + 4.8, ` rx="4.8" fill="#fafbfc" stroke="${GRID}" stroke-width="0.6"`), t2.svg);
        for(const bb of [hb, b]){ dA.full = union(dA.full, bb); dA.lay = union(dA.lay, bb); }
      }
      const bars = D.bars.map((b,i)=>b ? rect(B.X(i - 0.4), B.Y(0), B.X(i + 0.4), B.Y(b.m)) : "").join("");
      const errs = D.bars.map((b,i)=>b && !isNaN(b.se) ? errPath(B, i, b.lo, b.hi, 1) : "").join("");
      const parts = [clip(A, "pc1a"), clip(B, "pc1b"), ...dA.under, `<g clip-path="url(#pc1a)">${pts.join("")}</g>`, ...dA.over, ...extra,
        ...dB.under, `<g clip-path="url(#pc1b)"><g fill="${fillB}" stroke="#000" stroke-width="0.5">${bars}</g>` +
        `<path d="${errs}" fill="none" stroke="#6b7280" stroke-width="0.8" stroke-linecap="round"/></g>`, ...dB.over];
      return {A, B, dA, dB, parts};
    };
    const r1 = build(DEF), dec = (A, d)=>[A.x0 - d.lay[0], d.lay[2] - A.x0 - A.w, A.y0 - d.lay[1], d.lay[3] - A.y0 - A.h];
    const a = dec(r1.A, r1.dA), b = dec(r1.B, r1.dB);
    const ml = Math.max(a[0], b[0], 0) + PAD, mr = Math.max(a[1], b[1], 0) + PAD, mt = Math.max(a[2], 0) + PAD, mb = Math.max(b[3], 0) + PAD;
    const vs = a[3] + b[2] + PAD, va = (H - mt - mb - vs)/2;
    const r = ml + mr < W && mt + mb < H && va > 0 ? build({l: ml/W, r: 1 - mr/W, b: mb/H, t: 1 - mt/H, hs: vs/va}) : r1;
    const parts = [...r.parts];
    let box = union(r.dA.full, r.dB.full), y = box[1] - 16;
    if(D.mls.length){
      const m = text({x: box[0], y, s: wrap("curated marker: " + D.mls.join(", "), 14, box[2] - box[0], /[^ ]+ */g), fs: 14, color: "#374151", va: "bottom"});
      parts.push(m.svg); box = union(box, m.box); y = m.box[1] - 6;
    }
    const h = header(box[0], y, "Organ distribution");
    return finish([...parts, h.svg], union(box, h.box));
  }

  function fig2(D){
    const rows = D.match, n = rows.length;
    if(!n) return null;
    const W = 504, F = 13.5, xc = W - PAD - 38 - tw("1.0", F), lab = rows.map(r=>wrap(r.name, F, xc - 181.6 - PAD)), ln = lab.map(s=>s.split("\n"));
    const hk = ln.map(l=>Math.max(30, l.length*F*1.2 + 8)), tops = hk.map((_,k)=>hk.slice(0, k).reduce((a,b)=>a + b, 0)), h = tops[n - 1] + hk[n - 1];
    const x0 = PAD + Math.max(...ln.flat().map(l=>tw(l, F))) + 9.5, ch = Math.min(140, Math.max(60, 0.5*h));
    const A = mkAx(x0, 0, Math.min(200, Math.max(136, (xc - 22 - x0)/1.1)), h, [-0.5, 3.5], [-0.5, n - 0.5]), C = mkAx(xc, (h - ch)/2, 10, ch, [0, 1], [0, 1]);
    A.Y = (v)=>{ const k = Math.min(n - 1, Math.max(0, n - 1 - Math.round(v))); return tops[k] + hk[k]*(0.5 - v + n - 1 - k); };
    const dA = deco(A, {fs: F, xt: [[0,"SEN"],[1,"PPV"],[2,"CFS"],[3.5,"score"]].map(([v,s])=>({v, s})), yt: lab.map((s,k)=>({v: n - 1 - k, s})), yva: "center",
      tc: "#374151", gx: "-", gy: "-"});
    const dC = deco(C, {fs: F, lfs: 15, yt: [0, 0.5, 1].map(v=>({v, s: v.toFixed(1)})), yr: 1, tc: "#374151", lc: "#111827", ylabel: "values", outline: "#9ca3af"});
    const ix0 = A.X(3), ix1 = A.X(3.9), ib = [ix0, A.y0, ix1, A.y0 + A.h];
    const dots = [0, 1, 2].map(j=>rows.map((r,k)=>{
      const c = Math.min(Math.max(r.v[j], 0), 1);
      return c > 0 ? `<circle cx="${n2(A.X(j))}" cy="${n2(A.Y(n - 1 - k))}" r="${n2(Math.sqrt(250*c)/2)}" fill="${rdylbu(r.v[j])}"/>` : "";
    }).join("")).join("");
    const bars = rows.map((r,k)=>{ const c = tops[k] + hk[k]/2, d = Math.min(0.35*hk[k], 11);
      return rect(ix0, c - d, ix0 + (ix1 - ix0)*Math.min(Math.max(r.v[3], 0), 1)/1.1, c + d); }).join("");
    const grad = `<linearGradient id="pc2g" x1="0" y1="1" x2="0" y2="0">${RDYLBU.map((c,k)=>`<stop offset="${k/10}" stop-color="${rgbS(c)}"/>`).join("")}</linearGradient>`;
    const box = union(union(dA.full, dC.full), ib), hd = header(box[0], box[1] - 14, "Matching annotation");
    return finish([clip(A, "pc2a"), grad, ...dA.under, `<g clip-path="url(#pc2a)" stroke="#000" stroke-width="0.5">${dots}</g>`,
      rect(...ib, ' fill="#fff"'), `<g fill="${ACCENT}" stroke="#000" stroke-width="0.5">${bars}</g>`, ...dA.over,
      rect(C.x0, C.y0, C.x0 + C.w, C.y0 + C.h, ' fill="url(#pc2g)"'), ...dC.over, hd.svg], union(box, hd.box));
  }

  function fig3(D){
    const t = D.tme, cmap = D.cmap;
    if(!t || !t.has(D.cell) || !t.has("Cancer_Tissue")) return null;
    const vals = t.col(D.cell, 1), tis = t.col("Cancer_Tissue"), present = new Set(tis);
    const order = ["Control","Non-malignant disease","Cancer_AdjNorm","Cancer_Blood","Cancer_Tumor","Cancer_Metastasis"].filter(g=>present.has(g));
    if(!order.length || order.some(g=>!cmap[g])) return null;
    const grp = (g)=>vals.filter((v,i)=>tis[i] === g && !isNaN(v)), st = order.map(g=>stats(grp(g))), ok = st.filter(Boolean);
    let xl = autoscale(Math.min(0, ...ok.map(s=>isNaN(s.lo) ? s.m : s.lo)), Math.max(0, ...ok.map(s=>isNaN(s.hi) ? s.m : s.hi)), [0]), br = null;
    const tv = grp("Cancer_Tumor"), cv = grp("Control");
    if(tv.length && cv.length){
      const p = mwuP(tv, cv), mean = (a)=>a.reduce((x,y)=>x + y, 0)/a.length, lfc = Math.log2((mean(tv) + 1e-6)/(mean(cv) + 1e-6));
      const xr = xl[1] - xl[0] > 0 ? xl[1] - xl[0] : 1, xb = xl[1] + 0.04*xr;
      br = {y0: order.indexOf("Control"), y1: order.indexOf("Cancer_Tumor"), xb, cap: 0.012*xr,
        s: `log$_2$FC = ${(lfc < 0 ? "-" : "+") + Math.abs(lfc).toFixed(2)}\np = ${isNaN(p) ? "nan" : p < 0.001 ? "<0.001" : p.toFixed(3)}`};
      xl = [xl[0], xb + 0.32*xr];
    }
    const W = 504, H = 230, F = 13.5, k = order.length, ya = autoscale(-0.4, k - 0.6), yl = br ? [ya[1], ya[0]] : [k - 0.5, -0.5];
    const build = (p)=>{
      const A = mkAx(p.l*W, (1 - p.t)*H, (p.r - p.l)*W, (p.t - p.b)*H, xl, yl);
      const d = deco(A, {fs: F, lfs: 15, xt: autoTicks(A, "x", F), yt: order.map((s,v)=>({v, s})), tc: "#000", lc: "#000", sc: "#000", sp: 1, gx: ":", xlabel: D.cell});
      const bars = st.map((s,i)=>s ? rect(A.X(0), A.Y(i - 0.4), A.X(s.m), A.Y(i + 0.4), ` fill="${rgbS(desat(cmap[order[i]], 0.75))}"`) : "").join("");
      const errs = st.map((s,i)=>s && !isNaN(s.se) ? errPath(A, i, s.lo, s.hi, 0) : "").join("");
      const parts = [clip(A, "pc3a"), ...d.under, `<g clip-path="url(#pc3a)"><g stroke="#000" stroke-width="0.5">${bars}</g>` +
        `<path d="${errs}" fill="none" stroke="#000" stroke-width="0.8" stroke-linecap="round"/></g>`, ...d.over];
      let full = d.full, lay = d.lay;
      if(br){
        const xb = A.X(br.xb), xc = A.X(br.xb - br.cap), ya = A.Y(br.y0), yb = A.Y(br.y1);
        const tt = text({x: xb + 6, y: A.Y((br.y0 + br.y1)/2), s: br.s, fs: 10.5, color: "#000", va: "center", ls: 1.3});
        const lb = [Math.min(xc, xb), Math.min(ya, yb), Math.max(xc, xb), Math.max(ya, yb)];
        parts.push(`<path d="M${n2(xb)} ${n2(ya)}V${n2(yb)}M${n2(xc)} ${n2(ya)}H${n2(xb)}M${n2(xc)} ${n2(yb)}H${n2(xb)}" fill="none" stroke="#000" stroke-width="0.8" stroke-linecap="round"/>`, tt.svg);
        full = union(union(full, lb), tt.box); lay = union(union(lay, lb), tt.box);
      }
      return {pos: [A.x0, A.y0, A.x0 + A.w, A.y0 + A.h], full, lay, parts};
    };
    let r = build(DEF);
    for(let i = 0; i < 2; i++){ const p = tight1(W, H, r.pos, r.lay); if(p) r = build(p); }
    const h = header(r.full[0], r.full[1] - 14, "TME distribution");
    return finish([...r.parts, h.svg], union(r.full, h.box));
  }

  async function svgToPng(svg, W, H){
    const s = Math.min(300/72, Math.sqrt(16e6/(W*H)), 8000/Math.max(W,H));
    const pw = Math.round(W*s), ph = Math.round(H*s);
    const url = URL.createObjectURL(new Blob([svg.replace("<svg ", `<svg width="${pw}" height="${ph}" `)], {type:"image/svg+xml"}));
    try{
      const img = new Image();
      await new Promise((ok,no)=>{ img.onload = ok; img.onerror = ()=>no(new Error("SVG render failed")); img.src = url; });
      const cv = document.createElement("canvas");
      cv.width = pw; cv.height = ph;
      const c2 = cv.getContext("2d");
      c2.fillStyle = "#fff"; c2.fillRect(0, 0, pw, ph);
      c2.drawImage(img, 0, 0, pw, ph);
      return await new Promise((ok,no)=>cv.toBlob(b=>b ? ok(b) : no(new Error("PNG encode failed")), "image/png"));
    } finally { URL.revokeObjectURL(url); }
  }

  let pngURL = null;
  $("runBtn").addEventListener("click", async ()=>{
    clearImage();
    setStageState("data","active");
    setStageState("plot","pending");
    const level = $("levelSelect").value.trim();
    const cell  = $("cellSelect").value.trim();
    const cell1 = cell.includes("|") ? cell.split("|")[0] : cell;
    const base = DATA_BASE + "cell_profile/", tme = base + "cancer_dist/";
    stage(10, "Preparing files …");
    log(`▶️ Explore: level=${level}, cell=${cell}`);

    let F;
    try{
      F = await Promise.all([
        getFile(`${base}overall_${level}.csv`, "overall"),
        getFile(`${base}profile_${level}.csv`, "profile"),
        getFile(`${base}matching_res.csv`, "matching_res"),
        getFile(level === "level1" ? `${base}marker/Level1_mdic.json` : `${base}marker/${cell1}_mdic.json`, `${cell1} marker dict`, {json: true}),
        getFile(`${tme}prop_${cell1}.csv`, `TME prop_${cell1}.csv`, {optional: true}),
        getFile(`${tme}pval_${cell1}.csv`, `TME pval_${cell1}.csv`, {optional: true}),
        getFile(`${tme}cmapdic_cat.json`, "TME cmapdic_cat", {optional: true, json: true}),
      ]);
      setStageState("data","done");
    }catch(e){
      stage(0,"Error");
      setStageState("data","err");
      log("❌ Fetch failed: " + (e?.message||e));
      return;
    }

    setStageState("plot","active");
    stage(40, "Plotting …");
    try{
      const [ov, prof, match, mdic, prop, pval, cmap] = F;
      if(!prof.has(cell)) throw new Error(`'${cell}' not found in profile_${level}.csv`);
      const spec = ov.col("spec", 1), avg = ov.col("avg", 1);
      const organ = prof.col("Organ"), pv = prof.col(cell, 1).map(v=>isNaN(v) ? 0 : v), groups = new Map();
      organ.forEach((o,i)=>{ if(!groups.has(o)) groups.set(o, []); groups.get(o).push(pv[i]); });
      const keys = [...groups.keys()].sort();
      const km = keys.map(k=>{ let s = 0, c = 0; for(const v of groups.get(k)){ const y = v - c, t = s + y; c = t - s - y; s = t; } return s/groups.get(k).length; });
      const ridx = keys.map((_,i)=>keys.length - 1 - i);
      const order = npArgsort(km.slice().reverse()).map(i=>keys[ridx[i]]).reverse();
      const ann = match.has("PANGEA_annotation") ? match.col("PANGEA_annotation") : [];
      const mcols = ["SEN","PPV","CFS","score"].map(c=>match.col(c, 1));
      const D = {
        cell, order, bars: order.map(o=>stats(groups.get(o))),
        ov: ov.index.map((nm,i)=>[nm, spec[i], avg[i]]),
        mls: (mdic[cell] || []).slice(0, 10),
        match: ann.map((a,i)=>a === cell ? {name: match.index[i], v: mcols.map(c=>c[i])} : null).filter(Boolean).slice(0, 10),
        tme: prop && pval && cmap ? prop : null, cmap,
      };
      const figs = [fig1(D), fig2(D), fig3(D)].filter(Boolean);
      const W = Math.max(...figs.map(f=>f.box[2] - f.box[0]));
      let y = 0;
      const body = figs.map((f,i)=>{
        const g = `<g transform="translate(${n2(-f.box[0])} ${n2(y - f.box[1])})">${f.svg}</g>`;
        y += f.box[3] - f.box[1] + (i < figs.length - 1 ? 9.6 : 0);
        return g;
      }).join("");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n2(W)} ${n2(y)}" font-family="${FONT}">${body}</svg>`;
      stage(85, "Rendering …");
      const png = await svgToPng(svg, W, y);
      if(pngURL) URL.revokeObjectURL(pngURL);
      pngURL = URL.createObjectURL(png);

      const safeCell = cell.replace(/[\s/\\&]+/g, "_");
      const outName = `${level}_${safeCell}.png`;

      $("plotImg").src = pngURL;
      $("plotImg").style.width = Math.round(W*150/72) + "px";
      $("plotImg").style.display = "block";
      $("downloadPNG").href = pngURL;
      $("downloadPNG").download = outName;
      $("downloadPNG").textContent = `⬇ Download ${outName}`;
      $("downloadPNG").style.display = "inline-flex";
      $("resultSummary").innerHTML = `${level} · ${cell} <span class="stat">plot rendered</span>`;
      $("resultCard").classList.remove("err");
      $("resultCard").style.display = "block";

      stage(100, "Done");
      setStageState("plot","done");
      log("✅ Plot ready.");
    }catch(e){
      stage(0,"Error");
      setStageState("plot","err");
      $("resultSummary").innerHTML = `${e?.message || e}`;
      $("resultCard").classList.add("err");
      $("resultCard").style.display = "block";
      $("plotImg").style.display = "none";
      $("downloadPNG").style.display = "none";
      log("❌ Run error: " + (e?.message||e));
    }
  });

  log("Flow → choose level/cell → Explore");
  resetStages();
  setStageState("boot","done");
  setDisabled("runBtn", false);
  stage(0, "Ready — choose level/cell and click Explore.");
})();
</script>

{% endraw %}
