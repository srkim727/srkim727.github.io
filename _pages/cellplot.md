---
title: Explore cell distribution
author: S. Kim
date: 2025-10-16
layout: post
excerpt: ""
---

{% raw %}

<!-- Pyodide -->
<script defer src="https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js"></script>

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
  .pg-wrap .result-card{
    margin-top:14px;padding:12px 14px;border-radius:8px;
    background:var(--ok-light);border:1px solid var(--ok-border);
  }
  .pg-wrap .result-card.err{background:var(--err-light);border-color:var(--err-border);}
  .pg-wrap .result-card .result-head{
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    flex-wrap:wrap;margin-bottom:10px;
  }
  .pg-wrap .result-summary{font-size:14px;color:var(--text);font-weight:500;flex:1;min-width:180px;}
  .pg-wrap .result-summary .stat{color:var(--muted);font-weight:400;font-size:12px;margin-left:6px;}
  .pg-wrap .btn-download{
    background:var(--ok);border-color:var(--ok);color:#fff;padding:0 10px;height:26px;
    font-size:11px;letter-spacing:.01em;
    display:inline-flex;align-items:center;gap:4px;text-decoration:none;font-weight:500;
    border:1px solid var(--ok);border-radius:5px;transition:background .15s,border-color .15s;
  }
  .pg-wrap .btn-download:hover{background:var(--ok-dark);border-color:var(--ok-dark);color:#fff;text-decoration:none;}
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
  .pg-wrap .result-card{position:relative;padding-left:54px;}
  .pg-wrap .result-card::before{
    content:"✓";position:absolute;left:14px;top:12px;
    width:28px;height:28px;border-radius:50%;background:var(--ok);color:#fff;
    display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;
  }
  .pg-wrap .result-card.err::before{content:"×";background:var(--err);font-size:18px;}
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
  <div class="status-line" id="progStatus">Idle</div>

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
        <li>row indicates <code>{cell_annotation_from_the_literature}@{source_literature}</code></li>
        <li><code>SEN</code>: ratio of author_annotated_cells assigned to this PANGEA annotation</li>
        <li><code>PPV</code>: ratio of PANGEA annotation assigned to this author_annotated_cells</li>
        <li><code>CFS</code>: average prediction score (<code>PG_combined_score</code>)</li>
        <li><code>score</code>: overall score = cubic root of these parameters</li>
      </ul>
    </li>
    <li style="margin:2px 0;">Distribution patterns in tumor contexts
      <ul style="margin:6px 0 0 18px;">
        <li>shows results from PANGEA database (both Curated &amp; Re-aligned database)</li>
      </ul>
    </li>
  </ol>
  <div style="margin-top:8px;">
    <small>for each PANGEA cell annotation</small>
  </div>
  <div style="margin-top:6px;">
    <small>Data base: <code id="dataBaseShow">/assets/data/</code></small>
  </div>
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
  // -------- config --------
  const DATA_BASE = "/assets/data/"; // trailing slash
  document.getElementById("dataBaseShow").textContent = DATA_BASE;

  // -------- helpers --------
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
  async function fetchToFS(url, fsPath, {optional=false,label=null}={}){
    try{
      const u = (url.includes("?") ? url : url + "?t=" + Date.now()); // cache-bust
      const r = await fetch(u, { cache: "no-store" });
      if(!r.ok){
        if(optional){
          log(`⚠️ Optional ${label||url} missing: HTTP ${r.status} for ${url}`);
          return false;
        }
        throw new Error(`HTTP ${r.status} for ${url}`);
      }
      const buf = new Uint8Array(await r.arrayBuffer());
      pyodide.FS.writeFile(fsPath, buf);
      log(`✅ ${label||url} → ${fsPath} (${(buf.length/1e6).toFixed(2)} MB)`);
      return true;
    }catch(e){
      if(optional){ log(`⚠️ Optional ${label||url} skipped: ` + (e?.message||e)); return false; }
      throw e;
    }
  }
  function clearImage(){
    $("plotImg").style.display = "none";
    $("plotImg").removeAttribute("src");
    $("resultCard").style.display = "none";
    $("resultCard").classList.remove("err");
    $("resultSummary").textContent = "";
    $("downloadPNG").style.display = "none";
  }

  // -------- static dropdown lists (alphabetical) --------
  const LEVELS = ["level1","level2"];

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

  $("levelSelect").addEventListener("change", ()=>{
    populateCells();
  });

  // -------- state --------
  let pyodide=null, FS=null;
  let booted=false, pngURL=null;

  // -------- boot --------
  async function boot(){
    try{
      setStageState("boot","active");
      log("⏳ Boot: waiting for pyodide.js …");
      await new Promise((res, rej)=>{
        const t0=performance.now();
        (function check(){
          if(typeof globalThis.loadPyodide==="function") return res();
          if(performance.now()-t0>20000) return rej(new Error("Timeout waiting for loadPyodide()"));
          setTimeout(check,100);
        })();
      });

      log("⏳ Boot: initializing Pyodide…");
      pyodide = await globalThis.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/" });
      FS = pyodide.FS;
      log("✅ Pyodide " + pyodide.version + " loaded.");

      log("⏳ Boot: loading core packages (numpy, pandas, matplotlib, micropip) …");
      await pyodide.loadPackage(["numpy","pandas","matplotlib","micropip"]);
      log("✅ Core packages loaded.");

      log("⏳ Installing seaborn via micropip …");
      await pyodide.runPythonAsync(`
import micropip
await micropip.install("seaborn")
      `);
      log("✅ seaborn installed.");

      await pyodide.runPythonAsync(`
import sys, io, os, gzip, pickle as pkl, textwrap
import numpy as np, pandas as pd, seaborn as sns
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.offsetbox import AnchoredText

plt.rcParams['figure.dpi'] = 150

def add_axes_note(ax, text, loc='upper right', fontsize=8, mono=True, frame=True, max_width=60):
    wrapped = textwrap.fill(text, width=max_width)
    kw = dict(size=fontsize)
    if mono: kw['family'] = 'monospace'
    at = AnchoredText(wrapped, loc=loc, prop=kw, frameon=frame, borderpad=0.4)
    if frame:
        at.patch.set_boxstyle("round,pad=0.3,rounding_size=0.8")
        at.patch.set_alpha(0.85)
        at.patch.set_edgecolor('#999')
        at.patch.set_facecolor('#f8f9fb')
    ax.add_artist(at)
    return at

def add_fig_note(fig, text, x=0.01, y=0.99, fontsize=9, mono=True, ha='left', va='top', max_width=120):
    wrapped = textwrap.fill(text, width=max_width)
    kw = dict(fontsize=fontsize, ha=ha, va=va)
    if mono: kw['family'] = 'monospace'
    fig.text(x, y, wrapped, bbox=dict(boxstyle='round,pad=0.3',
                                      facecolor='#f8f9fb', edgecolor='#999', alpha=0.85),
             **kw)
      `);
      log("✅ Python libs imported & backend set.");
      booted = true;
      setStageState("boot","done");
      setDisabled("runBtn", false);
      stage(0, "Ready — choose level/cell and click Explore.");
    }catch(e){
      log("❌ Boot failed: " + (e?.message||e));
      setStageState("boot","err");
    }
  }

  // -------- run --------
  $("runBtn").addEventListener("click", async ()=>{
    if(!booted){ alert("Please wait until the setup finishes."); return; }
    clearImage();
    setStageState("data","active");
    setStageState("plot","pending");

    const level = $("levelSelect").value.trim();
    const cell  = $("cellSelect").value.trim();

    stage(10, "Preparing files …");
    log(`▶️ Explore: level=${level}, cell=${cell}`);

    // derive file paths
    const baseProfile = DATA_BASE + "cell_profile/";
    const f_overall = `${baseProfile}overall_${level}.csv`;
    const f_profile = `${baseProfile}profile_${level}.csv`;
    const f_match   = `${baseProfile}matching_res.csv`;

    // markers
    const f_m_l1 = `${baseProfile}marker/Level1_mdic.pkl`;
    const cell1 = (cell.includes("|") ? cell.split("|")[0] : cell);
    const f_m_l2 = `${baseProfile}marker/${cell1}_mdic.pkl`;

    // TME (optional)
    const tme_dir = `${baseProfile}cancer_dist/`;
    const f_prop  = `${tme_dir}prop_${cell1}.csv`;
    const f_pval  = `${tme_dir}pval_${cell1}.csv`;
    const f_cmap  = `${tme_dir}cmapdic_cat.pkl`;

    try{
      // ensure target dir
      try{ FS.mkdir("/work"); }catch(_){}
      // required
      await fetchToFS(f_overall, "/work/overall.csv", {label:"overall"});
      await fetchToFS(f_profile, "/work/profile.csv", {label:"profile"});
      await fetchToFS(f_match,   "/work/matching.csv", {label:"matching_res"});
      // markers (choose based on level)
      if(level==="level1"){
        await fetchToFS(f_m_l1, "/work/marker.pkl", {label:"Level1 marker dict"});
      }else{
        await fetchToFS(f_m_l2, "/work/marker.pkl", {label:`${cell1} marker dict`});
      }
      // optional TME
      await fetchToFS(f_prop, "/work/prop.csv", {optional:true,label:`TME prop_${cell1}.csv`});
      await fetchToFS(f_pval, "/work/pval.csv", {optional:true,label:`TME pval_${cell1}.csv`});
      await fetchToFS(f_cmap, "/work/cmap.pkl", {optional:true,label:`TME cmapdic_cat.pkl`});
      setStageState("data","done");
    }catch(e){
      stage(0,"Error");
      setStageState("data","err");
      log("❌ Fetch failed: " + (e?.message||e));
      return;
    }

    setStageState("plot","active");
    stage(40, "Running Python …");

    // capture staged prints
    const unhookOut = pyodide.setStdout({
      batched: (s)=>{ (s||"").split(/\r?\n/).forEach(line=> line && log(line)); }
    });
    const unhookErr = pyodide.setStderr({ batched: (s)=>{ s && s.trim() && log("ERR: " + s); } });

    try{
      const code = `
import io, os, pickle as pkl
import numpy as np, pandas as pd, seaborn as sns, matplotlib as mpl
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from math import isfinite

# helpers are already defined in the session:
# - add_axes_note
# - add_fig_note

level = ${JSON.stringify(level)}
cell  = ${JSON.stringify(cell)}
cell1 = (cell.split("|")[0] if "|" in cell else cell)

sns.set_theme(style="ticks", context="notebook", font_scale=0.9)
mpl.rcParams.update({
    'figure.dpi': 150,
    'font.family': 'sans-serif',
    'font.sans-serif': ['Helvetica', 'Arial', 'DejaVu Sans', 'sans-serif'],
    'axes.edgecolor': '#9ca3af',
    'axes.linewidth': 0.8,
    'axes.labelcolor': '#111827',
    'axes.titlecolor': '#111827',
    'axes.titleweight': 'semibold',
    'axes.titlesize': 11,
    'axes.labelsize': 10,
    'xtick.color': '#374151',
    'ytick.color': '#374151',
    'xtick.labelsize': 9,
    'ytick.labelsize': 9,
    'legend.fontsize': 9,
    'legend.frameon': False,
    'savefig.facecolor': 'white',
})

# Site accent colors
ACCENT = '#3b82f6'
ACCENT_LIGHT = '#dbeafe'
GRID_SOFT = '#e5e7eb'

# -------- load markers --------
mls = []
try:
    with open("/work/marker.pkl","rb") as fh:
        mdic = pkl.load(fh)
    if cell in mdic:
        mls = list(mdic[cell])[:10]
except Exception as e:
    pass

# -------- I: Organ distribution --------
overall = pd.read_csv("/work/overall.csv", index_col=0)
prop    = pd.read_csv("/work/profile.csv", index_col=0).fillna(0)

fig, axes = plt.subplots(2, 1, figsize=(7, 10), gridspec_kw = {'height_ratios':[7,3]})

# scatter (all)
sns.scatterplot(data=overall, y='avg', x='spec', s=26, linewidth=0,
                color='#d1d5db', alpha=0.8, ax=axes[0])
# scatter (highlight)
if cell in overall.index:
    sns.scatterplot(data=overall.loc[[cell]], y='avg', x='spec', s=140,
                    linewidth=1.2, edgecolor='white', color=ACCENT, ax=axes[0])
    x, y = float(overall.loc[cell, 'spec']), float(overall.loc[cell, 'avg'])
    axes[0].text(x, y, f"  {cell}", fontsize=9, fontweight='semibold',
                 ha='left', va='center', color=ACCENT)

# stats note inside left panel
if cell in overall.index:
    axes[0].text(overall['spec'].max(), overall['avg'].max(),
                 f"Organ spec.: {overall.loc[cell,'spec']:.2f}\\nAverage prop.: {overall.loc[cell,'avg']:.2f}",
                 va='top', ha='right', fontsize=8, color='#6b7280',
                 bbox=dict(boxstyle='round,pad=0.4', facecolor='#fafbfc',
                           edgecolor=GRID_SOFT, linewidth=0.6))

axes[0].set_xlabel('Organ specificity')
axes[0].set_ylabel('Average proportion')
axes[0].grid(True, linestyle=':', linewidth=0.6, color=GRID_SOFT, alpha=0.8)
axes[0].set_axisbelow(True)

# bar by organ (ordered by mean of the selected cell)
if cell in prop.columns:
    order = prop.groupby('Organ')[cell].mean().sort_values(ascending=False).index
else:
    order = prop['Organ'].unique()

sns.barplot(data=prop, y=cell if cell in prop.columns else 'Organ', x='Organ',
            order=order, ax=axes[1],
            capsize=.15, errorbar='se', errwidth=0.8, errcolor='#6b7280',
            linewidth=0.6, edgecolor='white', color=ACCENT)
axes[1].tick_params(axis='x', rotation=90)
axes[1].set_xlabel("")
axes[1].set_ylabel('Proportion')
axes[1].set_title(cell, pad=8)
axes[1].grid(True, axis='y', linestyle=':', linewidth=0.6, color=GRID_SOFT, alpha=0.8)
axes[1].set_axisbelow(True)

# figure header/footer instead of print()
if mls:
    mtext = 'curated marker: '+','.join(mls)
else:
    mtext = ''

add_fig_note(fig, f"Cell type: {cell}", x=0.01, y=1.11, ha='left', va='bottom', fontsize=11)
add_fig_note(fig, f"{mtext}", x=0.01, y=1.08, ha='left', va='bottom', fontsize=8)
add_fig_note(fig, f"Organ distribution", x=0.01, y=1.05, ha='left', va='bottom', fontsize=9)

sns.despine()
plt.tight_layout()

# save fig 1 into buffer
buf1 = io.BytesIO()
plt.savefig(buf1, format="png", bbox_inches="tight", dpi=150)
plt.close(fig)

# -------- II: Matching annotations --------
mdf = pd.read_csv("/work/matching.csv", index_col=0)
fig2buf = None
if 'PANGEA_annotation' in mdf.columns and (cell in set(mdf['PANGEA_annotation'])):
    mdf1 = (mdf[mdf['PANGEA_annotation']==cell]
            .drop(columns=['PANGEA_annotation'], errors='ignore')
            .head(10))
    metrics = ['SEN','PPV','CFS','score']
    metrics_scatter = metrics[:-1]
    metric_bar = metrics[-1]

    n_rows = len(mdf1.index)
    if n_rows>0:
        n_cols = len(metrics)
        n_cols_scatter = len(metrics_scatter)

        x = np.repeat(np.arange(n_cols_scatter), n_rows)
        y_rows = np.arange(n_rows)[::-1]
        y = np.tile(y_rows, n_cols_scatter)
        vals = np.concatenate([mdf1[m].values for m in metrics_scatter])

        # sizes & colors
        cmap = mpl.cm.RdYlBu_r
        norm01 = mpl.colors.Normalize(vmin=0.0, vmax=1.0)
        sizes = 250 * np.clip(vals, 0, 1)

        fig2, ax = plt.subplots(figsize=(n_cols*2, n_rows*0.6), dpi=150)
        sc = ax.scatter(x, y, s=sizes, c=vals, cmap=cmap, norm=norm01,
                        edgecolor="white", linewidth=0.8)

        ax.set_xticks([0,1,2,3.5])
        ax.set_xticklabels(['SEN','PPV','CFS','score'])
        ax.set_yticks(y_rows)
        ax.set_yticklabels(list(mdf1.index))

        ax.set_xlim(-0.5, n_cols-0.5)
        ax.set_ylim(-0.5, n_rows-0.5)

        sns.despine(bottom=True, left=True)
        ax.set_axisbelow(True)
        ax.grid(True, which='major', axis='both',
                color=GRID_SOFT, linestyle='-', linewidth=0.7, alpha=0.9)

        # inset bar for score
        last_col_center = n_cols - 1
        cell_left = last_col_center - 0.5
        cell_right = last_col_center + 0.5
        cell_width = cell_right - cell_left
        pad_x = 0.05 * cell_width

        axin = ax.inset_axes([cell_left + 0.5, -0.5, cell_width - 2*pad_x, n_rows],
                             transform=ax.transData)
        bar_vals = np.clip(mdf1[metric_bar].values, 0, 1)
        axin.barh(y_rows, bar_vals, height=0.7, color=ACCENT,
                  edgecolor='white', linewidth=0.8)
        axin.set_ylim(ax.get_ylim()); axin.set_xlim(0,1.1)
        axin.set_xticks([]); axin.set_yticks([])
        for sp in axin.spines.values(): sp.set_visible(False)

        add_fig_note(plt.gcf(), f"Matching annotation", x=0.01, y=1.05, ha='left', va='bottom', fontsize=9)

        # colorbar
        shrink = 1 if n_rows==1 else (0.2 + (0.2 / max(1, n_rows/3 + .75)))
        cbar = plt.colorbar(sc, ax=ax, pad=0.2, shrink=shrink, aspect=10)
        cbar.set_label("values")
        cbar.set_ticks([0,0.5,1.0])

        plt.tight_layout()
        fig2buf = io.BytesIO()
        plt.savefig(fig2buf, format="png", bbox_inches="tight", dpi=150)
        plt.close(fig2)

# -------- III: TME association (optional) --------
try:
    has_tme = os.path.exists("/work/prop.csv") and os.path.exists("/work/pval.csv") and os.path.exists("/work/cmap.pkl")
    fig3buf = None
    if has_tme:
        pdf = pd.read_csv("/work/prop.csv", index_col=0)
        df1 = pd.read_csv("/work/pval.csv", index_col=0)
        with open("/work/cmap.pkl", "rb") as fh:
            cmapdic = pkl.load(fh)

        order = ['Control','Non-malignant disease','Cancer_AdjNorm','Cancer_Blood','Cancer_Tumor','Cancer_Metastasis']
        order = [g for g in order if g in set(pdf.get('Cancer_Tissue',[]))]

        def p_to_stars(p):
            if pd.isna(p): return "NA"
            return ("ns" if p >= 0.05 else
                    "*"  if p >= 0.01 else
                    "**" if p >= 0.001 else
                    "***" if p >= 1e-4 else
                    "****")

        # simple horizontal asterisk brackets (compact)
        def annotate_barh_stars(ax, value_col, group_col, pval_df, comparisons, order):
            means = pdf.groupby(group_col)[value_col].mean()
            xmin, xmax = ax.get_xlim()
            xr = xmax - xmin if xmax>xmin else float(max(means.max(),1.0))
            pad  = 0.50 * xr
            sep  = 0.10 * xr
            cap  = 0.025* xr
            doff = 0.03 * xr

            tick_pos = list(ax.get_yticks())
            tick_lab = [t.get_text() for t in ax.get_yticklabels()]
            y_center={}
            if len(tick_pos)==len(tick_lab) and len(tick_pos)>0:
                y_center = {lab: float(pos) for lab,pos in zip(tick_lab,tick_pos)}
            if len(y_center)<len(order):
                rects=[p for p in ax.patches if hasattr(p,"get_y")]
                if len(rects)>=len(order):
                    for lab,r in zip(order, rects[:len(order)]):
                        y_center.setdefault(lab, r.get_y()+0.5*r.get_height())
                else:
                    for i,lab in enumerate(order): y_center.setdefault(lab,float(i))

            placed=[]
            for a,b in comparisons:
                if (a not in order) or (b not in order): continue
                # find pval row
                key=None
                for k in (f"{a}|{b}", f"{b}|{a}", f"{a} vs {b}", f"{b} vs {a}"):
                    if k in pval_df.index: key=k; break
                if key is None: continue
                p=float(pval_df.loc[key, value_col]) if value_col in pval_df.columns else np.nan
                stars=p_to_stars(p)
                y1,y2 = y_center[a], y_center[b]
                ylow, yhigh = sorted((y1,y2))
                x_base = max(float(means.get(a,0.0)), float(means.get(b,0.0))) + pad
                # collision
                x_br = x_base
                while any((ylow<=yyh and yhigh>=yyl and x_br < xb + (cap+doff+sep)) for xb,yyl,yyh in placed):
                    blockers=[xb for xb,yyl,yyh in placed if (ylow<=yyh and yhigh>=yyl)]
                    x_br = max(x_br, max(blockers) + (cap+doff+sep))
                placed.append((x_br, ylow, yhigh))
                # draw
                ax.plot([x_br, x_br], [ylow, yhigh], color="k", lw=1.0, alpha=1.0, zorder=9, clip_on=False)
                ax.plot([x_br-cap, x_br], [yhigh, yhigh], color="k", lw=1.0, alpha=1.0, zorder=9, clip_on=False)
                ax.plot([x_br-cap, x_br], [ylow,  ylow ], color="k", lw=1.0, alpha=1.0, zorder=9, clip_on=False)
                # star a tad below center for readability
                ymid = 0.5*(ylow+yhigh) - 0.30*0.5
                ax.text(x_br+doff, ymid, stars, rotation=270, rotation_mode="anchor",
                        ha="left", va="center", fontsize=7, fontweight="bold", color="k")

            # widen xlim
            right_need = [xb + cap + doff for xb,_,_ in placed] or [xmax]
            ax.set_xlim(xmin, max(xmax, max(right_need) + 0.02*xr))

        # figure
        fig3, ax3 = plt.subplots(figsize=(4, 2.2), dpi=150)
        sns.barplot(data=pdf, x=cell, y='Cancer_Tissue', ax=ax3,
                    palette=cmapdic, order=order, estimator=np.mean,
                    linewidth=0.6, edgecolor='white',
                    errorbar='se', capsize=.15, errwidth=0.8, errcolor='#6b7280')
        ax3.grid(True, axis='x', linestyle=':', linewidth=0.6, color=GRID_SOFT, alpha=0.8)
        ax3.set_axisbelow(True)
        sns.despine()

        ctrls = [x for x in ['Control','Non-malignant disease','Cancer_AdjNorm'] if x in set(pdf['Cancer_Tissue'])]
        comps = [('Cancer_Tumor', c) for c in ctrls]
        # annotate_barh_stars(ax3, cell, 'Cancer_Tissue', df1, comps, order)

        ax3.set_xlabel(cell); ax3.set_ylabel('')
        add_fig_note(plt.gcf(), f"TME distribution", x=0.01, y=1.05, ha='left', va='bottom', fontsize=9)

        plt.tight_layout()
        fig3buf = io.BytesIO()
        plt.savefig(fig3buf, format="png", bbox_inches="tight", dpi=150)
        plt.close(fig3)
except: pass

# -------- Combine figs vertically into one PNG --------
from PIL import Image
imgs=[]
for b in (buf1, fig2buf, fig3buf):
    if b is not None:
        b.seek(0)
        imgs.append(Image.open(b).convert("RGBA"))

if not imgs:
    raise RuntimeError("No figures to display.")

# stack vertically
width = max(im.width for im in imgs)
padded = []
for im in imgs:
    if im.width<width:
        pad = Image.new("RGBA", (width, im.height), (255,255,255,0))
        pad.paste(im, (0,0))
        padded.append(pad)
    else:
        padded.append(im)

total_h = sum(im.height for im in padded) + (len(padded)-1)*20
out = Image.new("RGBA", (width, total_h), (255,255,255,255))
y=0
for i,im in enumerate(padded):
    out.paste(im, (0,y))
    y += im.height + (20 if i<len(padded)-1 else 0)

# write final
with open("/work/explore.png","wb") as fh:
    bio=io.BytesIO()
    out.convert("RGB").save(bio, format="PNG")
    fh.write(bio.getvalue())
"OK"
      `;
      await pyodide.runPythonAsync(code);
      stage(85, "Rendering …");

      const bytes = FS.readFile("/work/explore.png");
      const blob  = new Blob([bytes], { type: "image/png" });
      if(pngURL) URL.revokeObjectURL(pngURL);
      pngURL = URL.createObjectURL(blob);

      const safeCell = cell.replace(/[\s/\\&]+/g, "_");
      const outName = `${level}_${safeCell}.png`;

      $("plotImg").src = pngURL;
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
    }finally{
      try{ unhookOut && unhookOut(); }catch(_){}
      try{ unhookErr && unhookErr(); }catch(_){}
    }
  });

  log("Flow → (auto-boot) → choose level/cell → Explore");
  resetStages();

  // Auto-boot: this inline script only runs on the cellplot page.
  boot();
})();
</script>

{% endraw %}
