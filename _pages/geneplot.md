---
title: Gene expression by cell type
author: S. Kim
date: 2025-10-19
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
      <span>Cell</span>
      <select id="cellSelect" style="min-width:160px;">
        <option selected>Whole</option>
        <option>B_mature</option>
        <option>Dendritic_classical</option>
        <option>Ductal</option>
        <option>Endothelial</option>
        <option>Fibroblast</option>
        <option>Macrophage</option>
        <option>Monocyte</option>
        <option>Mural</option>
        <option>Squamous</option>
        <option>T&NK</option>
      </select>
    </label>

    <label class="inline-ctl" style="flex:1;min-width:240px;">
      <span>Genes</span>
      <input id="geneInput" type="text" value="CD3D,KRT5,CDH19,PTPRC,CD79A,MS4A1" style="flex:1;min-width:200px;">
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

  <!-- Result card (plot output + download) -->
  <div class="result-card" id="resultCard" style="display:none;">
    <div class="result-head">
      <div class="result-summary" id="resultSummary"></div>
      <a class="btn-download" id="downloadPNG" download="plot.png" style="display:none;">⬇ Download PNG</a>
      <a class="btn-download" id="downloadCSV" download="plot.csv" style="display:none;">⬇ Download CSV</a>
    </div>
    <img class="plot-img" id="plotImg" alt="plot" style="display:none;">
  </div>
</div>

<!-- Info panel -->
<div class="meta-panel">
  <strong>Gene expression patterns of the cell types</strong>
  <p style="margin:6px 0 8px 0;">This pages shows</p>
  <ol style="margin:0 0 0 18px;">
    <li style="margin:2px 0;">Ratio of cells expressing each gene (dot sizes)</li>
    <li style="margin:2px 0;">Average expression level of each gene (colors), max-normalized per gene so each gene's peak across cell types maps to 1</li>
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
  const BASE = "/assets/data/expression_profile/";
  const FONT = "'DejaVu Sans', Verdana, sans-serif";
  const ORRD = [[255,247,236],[254,232,200],[253,212,158],[253,187,132],[252,141,89],[239,101,72],[215,48,31],[179,0,0],[127,0,0]];
  const $ = (id)=>document.getElementById(id);
  const log = (m)=>{ const el=$("log"); el.textContent += m + "\n"; el.scrollTop = el.scrollHeight; };
  const stage = (p,m)=>{ $("progBar").value = p; $("progStatus").textContent = m; };
  const setStage = (s,st)=>{ const el=$("stage-"+s); el.classList.remove("active","done","err"); if(st) el.classList.add(st); };
  const ctx = document.createElement("canvas").getContext("2d");
  const textW = (s)=>{ ctx.font = "10px " + FONT; return ctx.measureText(s).width; };
  let fdic=null, geneIdx=null, cur=null, seq=0, timer=null, pngURL=null, csvURL=null;

  function hideResult(){
    for(const id of ["resultCard","plotImg","downloadPNG","downloadCSV"]) $(id).style.display = "none";
    $("resultCard").classList.remove("err");
  }

  async function fetchNpy(name){
    const r = await fetch(BASE + name);
    if(!r.ok) throw new Error("HTTP " + r.status + " for " + name);
    let b = new Uint8Array(await r.arrayBuffer());
    if(b[0] === 0x1f && b[1] === 0x8b){
      const s = new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"));
      b = new Uint8Array(await new Response(s).arrayBuffer());
    }
    const v1 = b[6] === 1, h0 = v1 ? 10 : 12;
    const hl = v1 ? b[8] | b[9] << 8 : new DataView(b.buffer, b.byteOffset).getUint32(8, true);
    const hdr = new TextDecoder().decode(b.subarray(h0, h0 + hl));
    const dt = (hdr.match(/'descr':\s*'<f([48])'/) || [])[1];
    const shape = (hdr.match(/'shape':\s*\((\d+),\s*(\d+)\)/) || []).slice(1).map(Number);
    if(!dt || shape.length !== 2) throw new Error("Unsupported array: " + name);
    const buf = b.slice(h0 + hl).buffer;
    return { data: dt === "4" ? new Float32Array(buf) : new Float64Array(buf),
             rows: shape[0], cols: shape[1], fortran: /'fortran_order':\s*True/.test(hdr) };
  }
  const at = (a,i,j)=> a.fortran ? a.data[j*a.rows + i] : a.data[i*a.cols + j];

  function orrd(t){
    t = Math.min(1, Math.max(0, t || 0)) * 8;
    const i = Math.min(7, Math.floor(t)), f = t - i, a = ORRD[i], b = ORRD[i+1];
    return "rgb(" + a.map((v,k)=>Math.round(v + (b[k]-v)*f)).join(",") + ")";
  }

  function sizeTicks(max){
    if(!(max > 0)) return [];
    const raw = max / 5, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1,2,2.5,3,5,6,8,10].map(s=>s*mag).find(s=>s >= raw*0.999999);
    const out = [];
    for(let k=1; k*step <= max*1.000001; k++) out.push(+(k*step).toPrecision(6));
    return out;
  }

  function dotplotSVG(rows, cols, color, ratio){
    const nF = rows.length, nG = cols.length, CW = 11.16 + 5.58/nG, RH = 13.3, T = 3.5, P = 3.5;
    const gw = nG*CW, gh = nF*RH, f = (v)=>+v.toFixed(2);
    const esc = (s)=>String(s).replace(/[&<>"]/g, c=>"&#" + c.charCodeAt(0) + ";");
    const box = [0, 0, gw, gh];
    const fit = (a,b,c,d)=>{ box[0]=Math.min(box[0],a); box[1]=Math.min(box[1],b); box[2]=Math.max(box[2],c); box[3]=Math.max(box[3],d); };
    let lo = Infinity, hi = -Infinity, rmax = 0;
    color.forEach(v=>{ if(v < lo) lo = v; if(v > hi) hi = v; });
    ratio.forEach(v=>{ if(v > rmax) rmax = v; });
    const out = [`<defs><linearGradient id="pgcb">${ORRD.map((c,k)=>`<stop offset="${k/8}" stop-color="rgb(${c})"/>`).join("")}</linearGradient></defs>`];

    for(let i=0;i<nF;i++) for(let j=0;j<nG;j++){
      const k = i*nG + j, r = 5*Math.sqrt(Math.max(0, ratio[k]));
      if(r > 0) out.push(`<circle cx="${f((j+0.5)*CW)}" cy="${f((nF-i-0.5)*RH)}" r="${f(r)}" fill="${orrd(hi > lo ? (color[k]-lo)/(hi-lo) : 0)}" stroke="#000" stroke-width="0.5"/>`);
    }
    out.push(`<rect width="${f(gw)}" height="${f(gh)}" fill="none" stroke="#000" stroke-width="0.8"/>`);
    rows.forEach((s,i)=>{
      const y = f((nF-i-0.5)*RH), w = textW(s);
      out.push(`<path d="M${-T} ${y}H0" stroke="#000" stroke-width="0.8"/><text x="${-T-P}" y="${y}" dy="0.35em" text-anchor="end">${esc(s)}</text>`);
      fit(-T-P-w, y-6, 0, y+6);
    });
    cols.forEach((s,j)=>{
      const x = f((j+0.5)*CW), w = textW(s);
      out.push(`<path d="M${x} ${f(gh)}v${T}" stroke="#000" stroke-width="0.8"/><text transform="translate(${x} ${f(gh+T+P)}) rotate(-90)" dy="0.35em" text-anchor="end">${esc(s)}</text>`);
      fit(x-6, gh, x+6, gh+T+P+w);
    });

    const cbx = gw/2 - 22.5, cby = -18, tw = textW("mean express.");
    out.push(`<rect x="${f(cbx)}" y="${cby}" width="45" height="9" fill="url(#pgcb)" stroke="#000" stroke-width="0.8"/>`,
             `<text x="${f(gw/2)}" y="${cby-7.5}" text-anchor="middle">mean express.</text>`);
    fit(Math.min(cbx, gw/2 - tw/2), cby - 15.5, Math.max(cbx + 45, gw/2 + tw/2), 0);

    const ticks = sizeTicks(100*rmax), lx = gw*1.05 + 5, ly = 5, bp = 4, lh = 11.5, pitch = 14.4;
    const entW = 28 + Math.max(0, ...ticks.map(v=>textW(String(v))));
    const titleW = textW("express."), lw = 2*bp + Math.max(titleW, entW), lhgt = 2*bp + 2*lh + ticks.length*pitch;
    const tx = lx + (lw - titleW)/2, ex = lx + (lw - entW)/2;
    out.push(`<rect x="${f(lx)}" y="${ly}" width="${f(lw)}" height="${f(lhgt)}" rx="2" fill="#fff" stroke="#ccc" stroke-width="0.8"/>`,
             `<text x="${f(tx)}" y="${ly+bp+9}">express.</text><text x="${f(tx)}" y="${f(ly+bp+lh+9)}">ratio</text>`);
    ticks.forEach((v,k)=>{
      const y = f(ly + bp + 2*lh + (k+0.5)*pitch);
      out.push(`<circle cx="${f(ex+10)}" cy="${y}" r="${f(Math.sqrt(v)/2)}"/><text x="${f(ex+28)}" y="${y}" dy="0.35em">${v}</text>`);
    });
    fit(lx, ly, lx + lw, ly + lhgt);

    const pad = 7.2, W = box[2]-box[0]+2*pad, H = box[3]-box[1]+2*pad;
    return { W, H, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(box[0]-pad)} ${f(box[1]-pad)} ${f(W)} ${f(H)}" font-family="${FONT}" font-size="10">${out.join("")}</svg>` };
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
      return await new Promise((ok,no)=>cv.toBlob(b=> b ? ok(b) : no(new Error("PNG encode failed")), "image/png"));
    } finally { URL.revokeObjectURL(url); }
  }

  function pyFloat(x){
    if(Number.isNaN(x)) return "";
    if(!Number.isFinite(x)) return x > 0 ? "inf" : "-inf";
    const a = Math.abs(x);
    if(a !== 0 && (a < 1e-4 || a >= 1e16)) return x.toExponential().replace(/e([+-])(\d)$/, "e$10$2");
    const s = String(x);
    return s.includes(".") ? s : s + ".0";
  }

  async function loadCell(cell){
    const my = ++seq;
    cur = null; $("runBtn").disabled = true; hideResult();
    setStage("data","active"); setStage("plot",null);
    stage(15, "Fetching assets …");
    try{
      const [avg, cov] = await Promise.all([fetchNpy(`${cell}_avg.npy.gz`), fetchNpy(`${cell}_cov.npy.gz`)]);
      if(my !== seq) return;
      const n = fdic[cell].length, g = fdic.gene.length;
      if(avg.rows !== n || cov.rows !== n || avg.cols !== g || cov.cols !== g) throw new Error("Unexpected data shape");
      cur = {cell, avg, cov};
      $("runBtn").disabled = false;
      setStage("data","done"); stage(45, `Assets for '${cell}' ready.`);
      log(`🧬 Active model: ${cell}  ·  ready to plot`);
    }catch(e){
      if(my !== seq) return;
      log("❌ Asset load failed: " + (e?.message||e));
      setStage("data","err"); stage(0, "Asset load failed");
    }
  }

  async function boot(){
    try{
      setStage("boot","active"); stage(5, "Loading gene list …");
      const r = await fetch(BASE + "fdic.json");
      if(!r.ok) throw new Error("HTTP " + r.status + " for fdic.json");
      fdic = await r.json();
      geneIdx = new Map();
      fdic.gene.forEach((g,i)=>{ if(!geneIdx.has(g)) geneIdx.set(g,i); });
      setStage("boot","done");
      await loadCell($("cellSelect").value.trim());
    }catch(e){
      log("❌ Boot failed: " + (e?.message||e));
      setStage("boot","err"); stage(0, "Boot failed");
    }
  }

  $("cellSelect").addEventListener("change", ()=>{
    if(!fdic) return;
    cur = null; $("runBtn").disabled = true;
    setStage("data","active"); setStage("plot",null);
    clearTimeout(timer);
    timer = setTimeout(()=>loadCell($("cellSelect").value.trim()), 150);
  });

  $("runBtn").addEventListener("click", async ()=>{
    const cell = $("cellSelect").value.trim(), geneStr = $("geneInput").value.trim();
    if(!cur || cur.cell !== cell){ alert("Please wait until the assets finish loading."); return; }
    if(!geneStr){ alert("Enter gene symbols (comma-separated)."); return; }
    hideResult(); setStage("plot","active"); stage(60, "Plotting …");
    log(`▶️ Plot: cell=${cell}, genes=${geneStr}`);
    try{
      const genes = geneStr.split(",").map(g=>g.trim()).filter(g=>geneIdx.has(g));
      if(!genes.length) throw new Error("None of the requested genes are present.");
      const feat = fdic[cell], labels = cell !== "Whole" ? feat.map(x=>`${cell}|${x}`) : feat.slice();
      const nF = feat.length, nG = genes.length, f32 = cur.avg.data instanceof Float32Array;
      const avg = new Float64Array(nF*nG), norm = new Float64Array(nF*nG), cov = new Float64Array(nF*nG);
      genes.forEach((g,j)=>{
        const c = geneIdx.get(g);
        let mx = 0;
        for(let i=0;i<nF;i++){ avg[i*nG+j] = at(cur.avg,i,c); cov[i*nG+j] = at(cur.cov,i,c); mx = Math.max(mx, avg[i*nG+j]); }
        for(let i=0;i<nF;i++){ const v = avg[i*nG+j] / (mx > 0 ? mx : 1); norm[i*nG+j] = f32 ? Math.fround(v) : v; }
      });

      const {svg, W, H} = dotplotSVG(labels, genes, norm, cov);
      const png = await svgToPng(svg, W, H);
      const q = (s)=> /[",\n\r]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
      const lines = ["cell_feature,gene,mean_expression,mean_expression_normalized,expression_ratio"];
      for(let i=0;i<nF;i++) for(let j=0;j<nG;j++){
        const k = i*nG + j;
        lines.push([q(labels[i]), q(genes[j]), pyFloat(avg[k]), pyFloat(norm[k]), pyFloat(cov[k])].join(","));
      }

      if(pngURL) URL.revokeObjectURL(pngURL);
      if(csvURL) URL.revokeObjectURL(csvURL);
      pngURL = URL.createObjectURL(png);
      csvURL = URL.createObjectURL(new Blob([lines.join("\n") + "\n"], {type:"text/csv"}));
      const stem = (geneStr.split(",").map(g=>g.trim()).filter(Boolean).slice(0,4).join("_") || "plot").replace(/[\s/\\]+/g,"_");
      $("plotImg").src = pngURL;
      $("plotImg").style.width = Math.round(W*150/72) + "px";
      $("plotImg").style.display = "block";
      for(const [id, url, ext] of [["downloadPNG", pngURL, "png"], ["downloadCSV", csvURL, "csv"]]){
        $(id).href = url;
        $(id).download = `${cell}_${stem}.${ext}`;
        $(id).textContent = `⬇ Download ${cell}_${stem}.${ext}`;
        $(id).style.display = "inline-flex";
      }
      $("resultSummary").innerHTML = `${cell} · ${geneStr.split(',').length} genes <span class="stat">plot rendered</span>`;
      $("resultCard").style.display = "block";
      setStage("plot","done"); stage(100, "Done");
      log("✅ Plot ready.");
    }catch(e){
      stage(0, "Error"); setStage("plot","err");
      $("resultSummary").textContent = e?.message || String(e);
      $("resultCard").classList.add("err");
      $("resultCard").style.display = "block";
      log("❌ Run error: " + (e?.message||e));
    }
  });

  boot();
})();
</script>

{% endraw %}
