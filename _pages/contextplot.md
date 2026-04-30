---
title: Gene expression by organ × disease
author: S. Kim
date: 2025-10-20
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

  .pg-wrap progress#progBar{
    width:100%;height:6px;border:none;background:#f3f4f6;border-radius:3px;overflow:hidden;display:block;
  }
  .pg-wrap progress#progBar::-webkit-progress-bar{background:#f3f4f6;border-radius:3px;}
  .pg-wrap progress#progBar::-webkit-progress-value{background:var(--accent);border-radius:3px;transition:width .2s;}
  .pg-wrap progress#progBar::-moz-progress-bar{background:var(--accent);border-radius:3px;}
  .pg-wrap .status-line{font-size:12px;color:var(--muted);margin:6px 0 0 0;min-height:1em;}

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
    background:var(--ok);border-color:var(--ok);color:#fff;padding:0 10px;height:26px;
    font-size:11px;letter-spacing:.01em;
    display:inline-flex;align-items:center;gap:4px;text-decoration:none;font-weight:500;
    border:1px solid var(--ok);border-radius:5px;transition:background .15s,border-color .15s;
  }
  .pg-wrap .btn-download:hover{background:var(--ok-dark);border-color:var(--ok-dark);color:#fff;text-decoration:none;}
  .pg-wrap .plot-img{max-width:100%;border:1px solid var(--border);border-radius:6px;background:#fff;display:block;}

  .pg-wrap .meta-panel{
    background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;
    padding:14px 16px;margin:14px 0 0 0;color:var(--text);font-size:13px;
  }
  .pg-wrap .meta-panel code{background:#eef2f7;padding:1px 4px;border-radius:4px;}
  .pg-wrap .meta-panel small{color:var(--muted);}

  .pg-wrap details.log-wrap{margin-top:12px;}
  .pg-wrap details.log-wrap summary{cursor:pointer;font-size:12px;color:var(--muted);padding:4px 0;}
  .pg-wrap details.log-wrap summary:hover{color:var(--text);}

  @media (max-width:620px){
    .pg-wrap{margin:8px;}
    .pg-wrap .panel{padding:12px;}
    .pg-wrap .stages{font-size:11px;}
  }

  /* polish v2 */
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
        <option>Astrocyte</option>
        <option>B_GC</option>
        <option>B_mature</option>
        <option>B_progenitor</option>
        <option>Ciliated</option>
        <option>Dendritic_classical</option>
        <option>Dendritic_plasmacytoid</option>
        <option>Ductal</option>
        <option>Endothelial</option>
        <option>Erythroid</option>
        <option>Fibroblast</option>
        <option>Hematopoietic</option>
        <option>Hepatocyte</option>
        <option>Macrophage</option>
        <option>Mast&Basophil</option>
        <option>Melanocyte</option>
        <option>Monocyte</option>
        <option>Muller</option>
        <option selected>Mural</option>
        <option>Neuron_bipolar</option>
        <option>Neuron_excitatory</option>
        <option>Neuron_inhibitory</option>
        <option>Neutrophil</option>
        <option>Oligodendrocyte_mature</option>
        <option>Oligodendrocyte_progenitor</option>
        <option>Plasma</option>
        <option>Platelet</option>
        <option>Rod</option>
        <option>Schwann</option>
        <option>Spermatocyte</option>
        <option>Squamous</option>
        <option>T&NK</option>
      </select>
    </label>

    <label class="inline-ctl" style="flex:1;min-width:200px;">
      <span>Gene</span>
      <input id="geneInput" type="text" value="TNFAIP6" style="flex:1;min-width:160px;">
    </label>

    <label class="inline-ctl">
      <span>Sort</span>
      <select id="sortSelect" style="min-width:130px;">
        <option value="expression" selected>by expression</option>
        <option value="alpha">alphabetical</option>
      </select>
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

  <!-- Result card (plot output + downloads) -->
  <div class="result-card" id="resultCard" style="display:none;">
    <div class="result-head">
      <div class="result-summary" id="resultSummary"></div>
      <a class="btn-download" id="downloadPNG" download="plot.png" style="display:none;">⬇ Download PNG</a>
      <a class="btn-download" id="downloadCSV" download="plot.csv" style="display:none;">⬇ Download CSV</a>
      <a class="btn-download" id="downloadEnrichmentPNG" download="enrichment.png" style="display:none;">⬇ Download enrichment</a>
    </div>
    <img class="plot-img" id="plotImg" alt="plot" style="display:none;">
    <img class="plot-img" id="plotImgEnrichment" alt="enrichment plot" style="display:none;margin-top:12px;">
  </div>
</div>

<!-- Info panel -->
<div class="meta-panel">
  <strong>Gene expression in organ × disease context</strong>
  <p style="margin:6px 0 8px 0;">
    For a chosen cell type and gene, the dotplot shows mean expression and coverage
    across organ × disease combinations from the PANGEA database.
  </p>
  <ol style="margin:0 0 0 18px;">
    <li style="margin:2px 0;">rows = organ &nbsp;·&nbsp; columns = disease</li>
    <li style="margin:2px 0;">dot <strong>color</strong> = mean expression &nbsp;&amp;&nbsp; dot <strong>size</strong> = coverage (fraction expressing)</li>
    <li style="margin:2px 0;">organ × disease combinations not covered by the database → light grey cell</li>
  </ol>

  <p style="margin:12px 0 6px 0;"><strong>Enrichment plot</strong></p>
  <p style="margin:0 0 6px 0;">GSEA-style test of preferential expression in Disease (vs Control) and Tumor (vs non-tumor) samples, ranked by gene expression (pseudobulk).</p>
  <ol style="margin:0 0 0 18px;">
    <li style="margin:2px 0;"><code>NES</code> = normalized ES from 200-permutation null</li>
    <li style="margin:2px 0;"><code>FDR</code> = GSEA-style false discovery rate from the pooled-NES permutation distribution across both contrasts</li>
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
  // --- config: where the per-cell avg_od / cov_od files live on the site ---
  const ASSET_BASE = "/assets/data/expression_context_profile/";

  // --- helpers ---
  const $ = (id)=>document.getElementById(id);
  function setDisabled(id, v){ const el=$(id); if(el) el.disabled = !!v; }
  function log(msg){
    const el=$("log"); el.textContent += msg + "\n";
    const lines = el.textContent.split("\n");
    if(lines.length>400){ el.textContent = lines.slice(-400).join("\n"); }
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
  function hideResultCard(){
    $("resultCard").style.display = "none";
    $("resultCard").classList.remove("err");
    $("resultSummary").textContent = "";
    $("plotImg").style.display = "none";
    $("plotImg").removeAttribute("src");
    $("plotImgEnrichment").style.display = "none";
    $("plotImgEnrichment").removeAttribute("src");
    $("downloadPNG").style.display = "none";
    $("downloadCSV").style.display = "none";
    $("downloadEnrichmentPNG").style.display = "none";
  }
  async function fetchToFS(path, fsPath){
    const r = await fetch(path);
    if(!r.ok) throw new Error("HTTP " + r.status + " for " + path);
    const buf = new Uint8Array(await r.arrayBuffer());
    pyodide.FS.writeFile(fsPath, buf);
    return buf.length;
  }
  function existsInFS(path){
    try{ pyodide.FS.stat(path); return true; }catch(_){ return false; }
  }
  function clearImage(){
    $("plotImg").style.display = "none";
    $("plotImg").removeAttribute("src");
    $("plotImgEnrichment").style.display = "none";
    $("plotImgEnrichment").removeAttribute("src");
    $("resultCard").style.display = "none";
    $("downloadPNG").style.display = "none";
    $("downloadCSV").style.display = "none";
    $("downloadEnrichmentPNG").style.display = "none";
  }
  function waitForGlobal(fnName, timeoutMs){
    return new Promise((resolve, reject)=>{
      const t0 = performance.now();
      (function check(){
        if (globalThis[fnName] != null) return resolve();
        if (performance.now() - t0 > timeoutMs) return reject(new Error("Timeout waiting for "+fnName));
        setTimeout(check, 100);
      })();
    });
  }

  // --- state ---
  let pyodide=null, FS=null;
  let booted=false, assetsLoaded=false, isLoadingAssets=false;
  let currentCellLoaded=null;
  let samplesReady=false;             // true once {cell}_samples.npz finished downloading
  let samplesPromise=null;            // in-flight samples fetch (non-blocking)
  let pngURL=null, csvURL=null, epngURL=null;

  // --- reusable asset loader for a cell type ---
  async function loadAssetsForCell(cell){
    if(isLoadingAssets) return;
    if(!booted){ alert("Please wait until the setup finishes."); return; }
    if(!cell){ alert("Choose a cell."); return; }
    try{
      isLoadingAssets = true;
      setDisabled("runBtn", true);
      clearImage();
      setStageState("data","active");
      setStageState("plot","pending");

      // 1) context bundle (small, REQUIRED) — gates the Run button.
      // 2) samples bundle (larger, OPTIONAL) — fetched in background; bar plot
      //    appears only if it finishes before the user clicks Run, or on the
      //    next click after it lands.
      try { pyodide.FS.unlink("/work/context.npz"); } catch(_) {}
      try { pyodide.FS.unlink("/work/samples.npz"); } catch(_) {}
      samplesReady = false;
      samplesPromise = null;

      stage(20, `Fetching ${cell} context …`);
      const sz = await fetchToFS(ASSET_BASE + `${cell}_context.npz`, "/work/context.npz");
      log(`✅ ${cell}_context.npz (${(sz/1e6).toFixed(2)} MB) — dotplot ready`);

      // Kick off samples fetch in the background (no await).
      samplesPromise = fetchToFS(ASSET_BASE + `${cell}_samples.npz`, "/work/samples.npz")
        .then(sz2 => {
          // Only adopt result if user hasn't switched cells in the meantime.
          if (currentCellLoaded === cell) {
            samplesReady = true;
            log(`✅ ${cell}_samples.npz (${(sz2/1e6).toFixed(2)} MB) — bar plot enabled`);
          }
        })
        .catch(() => {
          if (currentCellLoaded === cell) {
            log(`ℹ️ no ${cell}_samples.npz on the server — bar plot will be skipped`);
          }
        });

      assetsLoaded = true;
      currentCellLoaded = cell;
      setDisabled("runBtn", false);
      setStageState("data","done");
      stage(45, `Assets for '${cell}' ready (sample data still loading in background).`);
    }catch(e){
      log("❌ Asset load failed: " + (e?.message||e));
      assetsLoaded = false;
      currentCellLoaded = null;
      setDisabled("runBtn", true);
      setStageState("data","err");
      stage(0, "Asset load failed");
    }finally{
      isLoadingAssets = false;
    }
  }

  // --- boot (auto-run on page load) ---
  async function boot(){
    try{
      setStageState("boot","active");
      stage(2, "Initializing Pyodide…");
      log("⏳ Boot: waiting for pyodide.js …");

      // Cache-warm: kick off the initial cell's data fetch IN PARALLEL with
      // Pyodide loading. When loadAssetsForCell runs after boot the npz files
      // are already in the browser HTTP cache, so its explicit fetch is
      // ~instant. Saves ~1–3 s on first-load wall time.
      const _initialCell = $("cellSelect").value.trim();
      if (_initialCell) {
        fetch(ASSET_BASE + `${_initialCell}_context.npz`).catch(()=>{});
        fetch(ASSET_BASE + `${_initialCell}_samples.npz`).catch(()=>{});
        log(`⏳ Pre-fetching ${_initialCell} (parallel to Pyodide boot)…`);
      }

      await waitForGlobal("loadPyodide", 20000);

      log("⏳ Boot: initializing Pyodide…");
      pyodide = await globalThis.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/" });
      FS = pyodide.FS;
      log("✅ Pyodide " + pyodide.version + " loaded.");
      try{ FS.mkdir("/work"); }catch(_){}

      stage(5, "Loading Python packages (numpy, pandas, matplotlib)…");
      await pyodide.loadPackage(["numpy","pandas","matplotlib"]);
      log("✅ Packages loaded.");

      stage(8, "Importing Python libs…");
      await pyodide.runPythonAsync(`
import sys, io, os, gzip, pickle as pkl
import numpy as np, pandas as pd
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt
print("numpy", np.__version__)
print("pandas", pd.__version__)
print("matplotlib", mpl.__version__)
      `);
      log("✅ Python libs imported & backend set.");
      booted = true;
      setStageState("boot","done");

      const initialCell = $("cellSelect").value.trim();
      log(`🔄 Auto-load assets for initial cell: ${initialCell}`);
      await loadAssetsForCell(initialCell);
    }catch(e){
      log("❌ Boot failed: " + (e?.message||e));
      setStageState("boot","err");
      stage(0, "Boot failed");
    }
  }

  // --- AUTO-RELOAD when cell changes ---
  let cellReloadTimer=null;
  $("cellSelect").addEventListener("change", ()=>{
    if(!booted) return;
    const cell = $("cellSelect").value.trim();
    // immediately invalidate, prevents Run with stale data
    assetsLoaded = false;
    setDisabled("runBtn", true);
    setStageState("data","active");
    setStageState("plot","pending");
    log(`🔁 Cell changed → reloading assets for '${cell}' …`);
    clearTimeout(cellReloadTimer);
    cellReloadTimer = setTimeout(()=> loadAssetsForCell(cell), 150);
  });

  // --- run plot ---
  $("runBtn").addEventListener("click", async ()=>{
    if(!assetsLoaded){ alert("Please wait until the assets finish loading."); return; }
    const cell = $("cellSelect").value.trim();
    const gene = $("geneInput").value.trim();
    const sortMode = $("sortSelect").value.trim();
    if(!gene){ alert("Enter a gene symbol."); return; }

    // If sample-level data is still streaming in the background, wait for it
    // so the bar plot is included. Without this, fast-clicking users on bigger
    // cells (Mural/Ductal/T&NK) would see only the dotplot.
    if (samplesPromise && !samplesReady) {
      stage(48, "Waiting for sample-level data …");
      log("⏳ samples.npz still loading — waiting before plot …");
      try { await samplesPromise; } catch(_) { /* 404 etc. handled in catch */ }
    }

    stage(50, "Plotting …");
    log(`▶️ Plot: cell=${cell}, gene=${gene}, sort=${sortMode}, samples=${samplesReady}`);
    clearImage();
    setStageState("plot","active");

    const unhookOut = pyodide.setStdout({
      batched: (s)=>{
        (s||"").split(/\r?\n/).forEach(line=>{
          if(!line) return;
          if(line.startsWith("__STAGE__:")){
            const p = line.split(":");
            const pct = parseInt(p[1]||"50",10);
            const msg = p.slice(2).join(":") || "Working…";
            stage(pct, msg);
          }else{
            log(line);
          }
        });
      }
    });
    const unhookErr = pyodide.setStderr({ batched: (s)=>{ s && s.trim() && log("ERR: " + s); } });

    try{
      // Two-phase render: dotplot first (Phase A) so it paints fast,
      // enrichment compute second (Phase B) — it kicks off only after
      // the dotplot is already on screen.
      const codeA = `
import os, io, gzip, sys
import numpy as np, pandas as pd
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt

def stage(pct, msg):
    print(f"__STAGE__:{pct}:{msg}")
    sys.stdout.flush()

# ---- aesthetic constants (matched to dotplot_organ_disease.py) ----
EMPTY_FILL    = "#e5e7eb"
PRESENT_FILL  = "#fafbfc"
DOT_EDGE      = "black"
SIZE_FACTOR   = 75
LEG_DOT_SCALE = 0.22
LEG_SIZES     = [0, 0.25, 0.5, 0.75, 1.0]
CELL_W = 0.15
CELL_H = 0.19
PAD_W  = 1.5
PAD_H  = 0.5

# bar plot
CANCER_PREFIXES = ("Tumor", "Metastasis")
COLOR_CONTROL   = "#9ca3af"
COLOR_CANCER    = "#dc2626"
COLOR_OTHER     = "#f59e0b"

def disease_color(d):
    if d == "Control": return COLOR_CONTROL
    if any(d.startswith(p) for p in CANCER_PREFIXES): return COLOR_CANCER
    return COLOR_OTHER

cell      = ${JSON.stringify(cell)}
gene      = ${JSON.stringify(gene)}
sort_mode = ${JSON.stringify(sortMode)}
has_sample = ${samplesReady ? "True" : "False"}
cmap_name = "OrRd"

# ---- load compressed npz bundle (cached per cell across runs) ----
# A persistent dict in globals() lets us skip npz load + index parsing when the
# user hits Run repeatedly with different genes on the same cell.
stage(55, "Reading bundle …")
if "_ctx_cache" not in globals():
    _ctx_cache = {"cell": None}
if _ctx_cache.get("cell") != cell:
    _z = np.load("/work/context.npz", allow_pickle=True)
    od_arr = _z["od_index"]
    # split "Organ@Disease" once, vectorized
    _split = np.array([s.split("@", 1) if isinstance(s, str) else (str(s).split("@", 1)) for s in od_arr])
    _ctx_cache = {
        "cell":     cell,
        "genes":    _z["genes"],
        "od_index": od_arr,
        "avg_od":   _z["avg_od"],          # float16
        "cov_od":   _z["cov_od_u8"],       # uint8
        "organs":   _split[:, 0].astype(str),
        "diseases": _split[:, 1].astype(str),
    }
genes_arr        = _ctx_cache["genes"]
od_index_arr     = _ctx_cache["od_index"]
organs_per_od    = _ctx_cache["organs"]
diseases_per_od  = _ctx_cache["diseases"]
avg_od_full      = _ctx_cache["avg_od"]
cov_od_full      = _ctx_cache["cov_od"]

if gene not in genes_arr:
    raise ValueError(f"gene '{gene}' not found in {cell} (n_genes={genes_arr.size:,})")
g_idx = int(np.where(genes_arr == gene)[0][0])

# Pull only the gene's column from each matrix (cheap — float16 / uint8).
avg_col = avg_od_full[:, g_idx].astype(np.float32)
cov_col = cov_od_full[:, g_idx].astype(np.float32) * np.float32(1.0/255.0)

diseases_all = np.unique(diseases_per_od)

# ---- ordering (pure numpy, no pandas groupby) ----
stage(63, "Computing layout …")
sig = np.nan_to_num(avg_col) * np.nan_to_num(cov_col)

# Sum signal per organ and per disease in one shot via numpy bincount-style accumulation
def _agg_sum(keys, values):
    uniq, inv = np.unique(keys, return_inverse=True)
    out = np.zeros(uniq.size, dtype=np.float32)
    np.add.at(out, inv, values.astype(np.float32))
    return uniq, out

if sort_mode == "expression":
    o_uniq, o_sum = _agg_sum(organs_per_od, sig)
    organs = o_uniq[np.argsort(-o_sum)].tolist()
    d_uniq, d_sum = _agg_sum(diseases_per_od, sig)
    order = np.argsort(-d_sum)
    rest = [str(d) for d in d_uniq[order] if d != "Control"]
else:
    organs = sorted(np.unique(organs_per_od).tolist())
    rest   = sorted(d for d in diseases_all if d != "Control")
control = ["Control"] if "Control" in diseases_all else []
diseases = control + rest

# ---- pivot via direct numpy indexing (skips pandas DataFrame.pivot) ----
o_to_idx = {o: i for i, o in enumerate(organs)}
d_to_idx = {d: j for j, d in enumerate(diseases)}
n_o, n_d = len(organs), len(diseases)
A = np.full((n_o, n_d), np.nan, dtype=np.float32)
C = np.full((n_o, n_d), np.nan, dtype=np.float32)
for i_od, (o, d) in enumerate(zip(organs_per_od, diseases_per_od)):
    ii = o_to_idx.get(o); jj = d_to_idx.get(d)
    if ii is None or jj is None:
        continue
    A[ii, jj] = avg_col[i_od]
    C[ii, jj] = cov_col[i_od]

# ---- optionally read sample-level data from the separate samples.npz ----
sample_df = None
if has_sample and os.path.exists("/work/samples.npz"):
    try:
        stage(70, "Reading sample-level data …")
        _smp = np.load("/work/samples.npz", allow_pickle=True)
        # samples.npz uses the same gene order as context.npz (built that way at conversion).
        sample_col = _smp["sample_avg"][:, g_idx].astype(np.float32)
        sample_df = pd.DataFrame({
            gene:       sample_col,
            "Organ":    [str(x) for x in _smp["sample_organ"]],
            "disease":  [str(x) for x in _smp["sample_disease"]],
            "o@d":      [str(x) for x in _smp["sample_o_d"]],
        }, index=[str(x) for x in _smp["sample_id"]])
    except Exception as _e:
        print(f"ℹ️ skipping bar plot — {_e}")
        sample_df = None

# ---- figure ----
stage(75, "Drawing dotplot …")
# ---- Layout: rows=disease, cols=organ; barplot on the right; legends above ----
# Each bar row is rendered at the SAME visual height as one dotplot cell
# (DOT_Y_PER), so the right panel reads like a horizontal extension of the
# dotplot's row height. TOP_N_BARS is capped so the barplot panel never
# exceeds the dotplot height.
DOT_X_PER = 0.11                              # inch per organ column
DOT_Y_PER = 0.18                              # inch per disease row
TOP_N_BARS_REQ = 10                           # preferred number of o@d bars
fig_w_dot = max(3.5, DOT_X_PER * n_o + PAD_W)
fig_h_dot = max(1.6, DOT_Y_PER * n_d + PAD_H)
fig_w_bar = 2.2

# Match per-bar visual height to one dotplot cell, then size the bar panel.
desired_h_bar = TOP_N_BARS_REQ * DOT_Y_PER
if desired_h_bar >= fig_h_dot:
    TOP_N_BARS = max(1, int((fig_h_dot - 0.1) / DOT_Y_PER))
    fig_h_bar = TOP_N_BARS * DOT_Y_PER
else:
    TOP_N_BARS = TOP_N_BARS_REQ
    fig_h_bar = desired_h_bar
# Tiny floor so the (fig_h_dot - fig_h_bar) gridspec row never collapses to 0.
fig_h_bar = min(fig_h_bar, fig_h_dot - 0.05)

# 3-row × 2-col gridspec — ax spans rows 1+2 (full dotplot height), ax_bar
# sits only in row 1 (smaller, top-aligned with dotplot). Tight `top` and a
# small top-row ratio keep the title close to the plots.
TOP_LEG_RATIO = 0.28
if sample_df is not None:
    fig = plt.figure(figsize=(fig_w_dot + fig_w_bar + 1.2, fig_h_dot + 0.7), dpi=150)
    gs = fig.add_gridspec(
        3, 2,
        height_ratios=[TOP_LEG_RATIO, fig_h_bar, fig_h_dot - fig_h_bar],
        width_ratios=[fig_w_dot, fig_w_bar],
        hspace=0.04, wspace=0.40,
        top=0.96, bottom=0.10, left=0.07, right=0.93,
    )
    ax     = fig.add_subplot(gs[1:, 0])
    ax_bar = fig.add_subplot(gs[1, 1])
else:
    fig = plt.figure(figsize=(fig_w_dot, fig_h_dot + 0.7), dpi=150)
    gs = fig.add_gridspec(
        2, 1,
        height_ratios=[TOP_LEG_RATIO, fig_h_dot],
        hspace=0.04,
        top=0.96, bottom=0.10, left=0.10, right=0.97,
    )
    ax     = fig.add_subplot(gs[1, 0])
    ax_bar = None
ax.set_facecolor("white")

# Title — top-left of the figure, sitting right above the legend zone
fig.suptitle(f"{gene} expression in {cell}",
             fontsize=11, weight="semibold", color="#111827",
             x=0.07, y=0.985, ha="left")

# ---- Swap axes for the plot only (CSV still uses A,C in (n_o, n_d) order) ----
A_p = A.T   # plot view: (n_d, n_o)
C_p = C.T

present_mask = ~np.isnan(A_p)
pres_y, pres_x = np.where(present_mask)

# Background lattice as a SINGLE imshow (was n_o*n_d Rectangle add_patch calls).
import matplotlib.colors as _mcolors
_bg = present_mask.astype(np.int8)   # 0 = NaN cell, 1 = present
_bg_cmap = _mcolors.ListedColormap([EMPTY_FILL, PRESENT_FILL])
ax.imshow(_bg, cmap=_bg_cmap, vmin=0, vmax=1,
          interpolation="nearest", aspect="auto",
          extent=[-0.5, n_o - 0.5, n_d - 0.5, -0.5], zorder=0)

cov_vals = np.clip(C_p[pres_y, pres_x], 0, 1)
avg_vals = A_p[pres_y, pres_x]
vmax = max(float(np.nanmax(avg_vals)) if np.isfinite(avg_vals).any() else 1.0, 1e-6)
sc = ax.scatter(pres_x, pres_y, s=cov_vals * SIZE_FACTOR, c=avg_vals,
                cmap=cmap_name, vmin=0, vmax=vmax,
                edgecolor=DOT_EDGE, linewidth=0.4, zorder=2)

# x = organ, y = disease (swapped)
ax.set_xticks(range(n_o)); ax.set_xticklabels(organs, rotation=90, fontsize=5.5)
ax.set_yticks(range(n_d)); ax.set_yticklabels(diseases, fontsize=6)
ax.set_xlim(-0.5, n_o - 0.5)
ax.set_ylim(n_d - 0.5, -0.5)
ax.tick_params(length=0, colors="#374151", pad=1)
for sp in ax.spines.values(): sp.set_visible(False)

# ---- Legends placed ABOVE the dotplot (in the empty top gridspec row) ----
import matplotlib.ticker as _mticker

# (1) horizontal colorbar — mean exp.  Compact: short bar (~12% width),
# thin (~3% height), label on the LEFT (inline) to save vertical space.
cax = ax.inset_axes([0.0, 1.04, 0.12, 0.04])
cbar = fig.colorbar(sc, cax=cax, orientation="horizontal")
cbar.set_label("mean\\nexp.", fontsize=5, color="#374151", labelpad=2,
               rotation=0, ha="right", va="center")
cbar.ax.yaxis.set_label_coords(-0.10, 0.5)
cbar.ax.xaxis.set_major_locator(_mticker.MaxNLocator(nbins=2))
cbar.ax.tick_params(labelsize=5, colors="#374151", length=1.5, pad=0.8)
cbar.outline.set_visible(False)

# (2) coverage legend — small horizontal row of dots, anchored just above ax.
leg_handles = [plt.scatter([], [], s=max(s * SIZE_FACTOR * LEG_DOT_SCALE, 0.5),
                           c="#9ca3af", edgecolor=DOT_EDGE, linewidth=0.3)
               for s in LEG_SIZES]
ax.legend(leg_handles, [f"{s:g}" for s in LEG_SIZES],
          loc="lower left",
          bbox_to_anchor=(0.20, 1.02),
          title="coverage", title_fontsize=5,
          fontsize=5, frameon=False,
          ncol=len(LEG_SIZES), columnspacing=0.5,
          handletextpad=0.3, handlelength=0.6,
          borderpad=0.0, borderaxespad=0.0)

# ---- Bar + strip plot to the RIGHT of the dotplot (horizontal bars) ----
if ax_bar is not None and sample_df is not None:
    stage(85, "Drawing barplot …")
    # Cap to top-N o@d combinations so labels stay readable. Sort descending
    # by mean, take the top N, then reverse to ascending so the largest ends
    # up at the TOP of the barplot (matplotlib's y axis points up).
    agg_full  = sample_df.groupby("o@d")[gene].agg(["mean", "sem"]).sort_values("mean", ascending=False)
    n_show    = min(int(TOP_N_BARS), len(agg_full))
    agg       = agg_full.head(n_show).iloc[::-1]
    od_order  = agg.index.tolist()
    mean_vals = agg["mean"].values
    se_vals   = np.nan_to_num(agg["sem"].values, nan=0.0)
    y_pos = np.arange(len(od_order))
    bar_colors = [disease_color(od.split("@", 1)[1] if "@" in od else "") for od in od_order]

    ax_bar.barh(y_pos, mean_vals, xerr=se_vals, color=bar_colors,
                edgecolor="black", linewidth=0.4, height=0.78,
                alpha=0.55, zorder=1,
                error_kw=dict(ecolor="black", elinewidth=0.5, capsize=1.2, capthick=0.5))

    rng = np.random.default_rng(42)
    JIT = 0.18
    for i, od in enumerate(od_order):
        sub = sample_df.loc[sample_df["o@d"] == od, gene].values.astype(float)
        if len(sub) == 0:
            continue
        y_jit = i + rng.uniform(-JIT, JIT, size=len(sub))
        ax_bar.scatter(sub, y_jit, c=bar_colors[i], edgecolor="black",
                       linewidth=0.3, s=7, zorder=3, alpha=0.95)

    # y-tick labels on the RIGHT so they extend AWAY from the dotplot.
    ax_bar.yaxis.tick_right()
    ax_bar.yaxis.set_label_position("right")
    ax_bar.set_yticks(y_pos)
    ax_bar.set_yticklabels(od_order, fontsize=5)
    ax_bar.set_ylim(-0.5, len(od_order) - 0.5)
    bar_xlabel = "mean expression" if n_show == len(agg_full) else f"mean expression  (top {n_show} of {len(agg_full)})"
    ax_bar.set_xlabel(bar_xlabel, fontsize=6, color="#374151")
    ax_bar.tick_params(axis="x", labelsize=5, colors="#374151", length=2, pad=1)
    ax_bar.tick_params(axis="y", length=0, colors="#374151", pad=1)
    for sp in ("top", "right"): ax_bar.spines[sp].set_visible(False)
    for sp in ("left", "bottom"):
        ax_bar.spines[sp].set_color("#9ca3af"); ax_bar.spines[sp].set_linewidth(0.5)

    # Category legend just above the barplot
    ax_bar.legend(handles=[
        plt.Rectangle((0, 0), 1, 1, color=COLOR_CONTROL, label="Control"),
        plt.Rectangle((0, 0), 1, 1, color=COLOR_CANCER,  label="Cancer"),
        plt.Rectangle((0, 0), 1, 1, color=COLOR_OTHER,   label="Other"),
    ], loc="lower left",
        bbox_to_anchor=(0.0, 1.02),
        ncol=3, fontsize=5, frameon=False,
        handlelength=0.7, handleheight=0.6,
        labelspacing=0.0, borderpad=0.0, borderaxespad=0.0,
        columnspacing=0.6, handletextpad=0.3)

stage(92, "Saving PNG …")
buf = io.BytesIO()
plt.savefig(buf, format="png", bbox_inches="tight", dpi=150, facecolor="white")
plt.close(fig)
open("/plot.png","wb").write(buf.getbuffer())

stage(94, "Saving CSV …")
F_ix, G_ix = np.meshgrid(np.arange(n_o), np.arange(n_d), indexing="ij")
df_out = pd.DataFrame({
    "organ":           [organs[i]   for i in F_ix.ravel()],
    "disease":         [diseases[j] for j in G_ix.ravel()],
    "mean_expression": A.ravel(),
    "coverage":        C.ravel(),
})
df_out.to_csv("/plot.csv", index=False)

print("DONE_A", n_o, "organs ×", n_d, "diseases")
"OK"
      `;

      // Phase B uses globals from Phase A (sample_df, cell, gene, COLOR_*,
      // os, io, np, pd, plt, mpl, stage). All persist across runPythonAsync.
      const codeB = `
# ---- GSEA-style enrichment plot (only when sample-level data is available) ----
# Disease and tumor contrasts share one ranked-by-expression metric (z-scored
# across samples). Layout: disease ES + rug LEFT, tumor ES + rug RIGHT, with
# a shared rank-gradient + ranked-metric panel underneath spanning both cols.
#
# NES (effect-size) is computed from a small permutation null (n_perms=200)
# as ES / mean(|same-signed null peak ES|), Subramanian 2005.
# p-value is a two-sided Mann-Whitney U test on the per-sample expression
# values between hit and non-hit samples — well-calibrated for any n,
# unlike the GSEA permutation p which floors at 1/n_perms with large n.
# q-value is BH-adjustment of (p_disease, p_tumor) for this gene.
try: os.unlink("/plot_enrichment.png")
except FileNotFoundError: pass

if sample_df is not None and len(sample_df) >= 8:
    stage(95, "Computing enrichment …")

    def _running_es(hit_mask, w, n, n_hit):
        if n_hit == 0 or n_hit == n: return 0.0, np.zeros(n), 0
        hit_w_sum = float(w[hit_mask].sum())
        if hit_w_sum == 0: return 0.0, np.zeros(n), 0
        steps = np.where(hit_mask, w / hit_w_sum, -1.0 / (n - n_hit))
        running = np.cumsum(steps)
        peak = int(np.argmax(np.abs(running)))
        return float(running[peak]), running, peak

    def _fmt_pq(v):
        if not np.isfinite(v): return "n/a"
        if v < 0.001: return "<0.001"
        return f"{v:.3f}"

    def _gsea_fdr(nes_obs, all_null_nes, all_obs_nes):
        # GSEA-style FDR on pooled NES distributions across all contrasts.
        if not np.isfinite(nes_obs): return float("nan")
        if nes_obs >= 0:
            ssn = all_null_nes[all_null_nes >= 0]
            sso = all_obs_nes[all_obs_nes >= 0]
            if ssn.size == 0 or sso.size == 0: return 1.0
            num   = float((ssn >= nes_obs).sum()) / ssn.size
            denom = float((sso >= nes_obs).sum()) / sso.size
        else:
            ssn = all_null_nes[all_null_nes < 0]
            sso = all_obs_nes[all_obs_nes < 0]
            if ssn.size == 0 or sso.size == 0: return 1.0
            num   = float((ssn <= nes_obs).sum()) / ssn.size
            denom = float((sso <= nes_obs).sum()) / sso.size
        if denom == 0: return float(min(num, 1.0))
        return float(min(num / denom, 1.0))

    def _enrich(values, hits, n_perms=200, rng_seed=42):
        n = values.size
        metric = values.astype(np.float64)
        mu = float(np.nanmean(metric)); sigma = float(np.nanstd(metric))
        if sigma > 0: metric = (metric - mu) / sigma
        else:        metric = metric - mu
        order = np.argsort(-metric, kind="stable")
        sorted_metric = metric[order].astype(np.float32)
        sorted_hits = hits[order]
        n_hit = int(sorted_hits.sum())
        w = np.abs(sorted_metric).astype(np.float64)
        es, running, peak = _running_es(sorted_hits, w, n, n_hit)
        null = np.zeros(n_perms, dtype=np.float64)
        if 0 < n_hit < n and n_perms > 0:
            rng = np.random.default_rng(rng_seed)
            shuf = np.tile(sorted_hits, (n_perms, 1))
            shuf = rng.permuted(shuf, axis=1)
            sums = (shuf.astype(np.float64) * w[None, :]).sum(axis=1)
            sums[sums == 0] = 1.0
            miss_step = -1.0 / (n - n_hit)
            steps = np.where(shuf, w[None, :] / sums[:, None], miss_step)
            run_all = np.cumsum(steps, axis=1)
            peak_idx = np.argmax(np.abs(run_all), axis=1)
            null = run_all[np.arange(n_perms), peak_idx]
        pos = null[null >= 0]; neg = null[null < 0]
        denom_pos = max(float(pos.mean()) if pos.size > 0 else 1.0, 1e-12)
        denom_neg = max(float(abs(neg).mean()) if neg.size > 0 else 1.0, 1e-12)
        nes = float(es / denom_pos) if es >= 0 else float(es / denom_neg)
        nes_null = np.where(null >= 0, null / denom_pos, null / denom_neg)
        return dict(running=running, sorted_metric=sorted_metric, sorted_hits=sorted_hits,
                    es=es, peak=peak, nes=nes, nes_null=nes_null,
                    n_hit=n_hit, n=n, fdr=float("nan"))

    expr_s     = sample_df[gene].values.astype(np.float32)
    diseases_s = sample_df["disease"].astype(str).values
    is_disease = diseases_s != "Control"
    is_tumor   = np.array([d.startswith("Tumor") or d.startswith("Metastasis")
                           for d in diseases_s])

    # Skip enrichment if either contrast is degenerate (all-hit or no-hit).
    skip_enrichment = (is_disease.all() or (~is_disease).all()
                       or is_tumor.all()   or (~is_tumor).all())
    if skip_enrichment:
        print("ℹ️ enrichment skipped (no contrast — all samples on one side)")
    else:
        res_dis = _enrich(expr_s, is_disease, n_perms=200, rng_seed=42)
        res_tum = _enrich(expr_s, is_tumor,   n_perms=200, rng_seed=43)
        # Pool NES distributions across both contrasts → GSEA-style FDR.
        all_null = np.concatenate([res_dis["nes_null"], res_tum["nes_null"]])
        all_obs  = np.array([res_dis["nes"], res_tum["nes"]], dtype=np.float64)
        res_dis["fdr"] = _gsea_fdr(res_dis["nes"], all_null, all_obs)
        res_tum["fdr"] = _gsea_fdr(res_tum["nes"], all_null, all_obs)

        stage(97, "Drawing enrichment …")
        _FONT = {"family": "sans-serif"}

        # Two truly-independent enrichment columns (each with its own gradient
        # and ranked metric, so the left + right read as 2 self-contained plots).
        # Shorter Y than before — the per-column metric/gradient lets the figure
        # be more compact vertically.
        fig_e = plt.figure(figsize=(5.4, 2.2), dpi=150)
        LEFT_E, RIGHT_E = 0.10, 0.97
        gs_e = fig_e.add_gridspec(
            4, 2,
            height_ratios=[1.6, 0.18, 0.10, 0.55],
            width_ratios=[1, 1],
            hspace=0.07, wspace=0.24,
            top=0.78, bottom=0.18, left=LEFT_E, right=RIGHT_E,
        )
        # Disease column (left)
        ax_es_d = fig_e.add_subplot(gs_e[0, 0])
        ax_h_d  = fig_e.add_subplot(gs_e[1, 0], sharex=ax_es_d)
        ax_g_d  = fig_e.add_subplot(gs_e[2, 0], sharex=ax_es_d)
        ax_m_d  = fig_e.add_subplot(gs_e[3, 0], sharex=ax_es_d)
        # Tumor column (right)
        ax_es_t = fig_e.add_subplot(gs_e[0, 1])
        ax_h_t  = fig_e.add_subplot(gs_e[1, 1], sharex=ax_es_t)
        ax_g_t  = fig_e.add_subplot(gs_e[2, 1], sharex=ax_es_t)
        ax_m_t  = fig_e.add_subplot(gs_e[3, 1], sharex=ax_es_t)

        def _draw_es(ax, res, color, label):
            n = res["n"]; running = res["running"]; x = np.arange(n)
            ax.plot(x, running, color=color, linewidth=1.1, zorder=3)
            ax.fill_between(x, 0, running, color=color, alpha=0.18, zorder=2)
            ax.axhline(0, color="#9ca3af", linewidth=0.4, zorder=0)
            fdr_str = _fmt_pq(res["fdr"])
            ax.text(0.0, 1.04, label, fontsize=7, va="bottom", ha="left",
                    transform=ax.transAxes, color="#111827", weight="bold", **_FONT)
            ax.text(0.985, 0.95,
                    f"NES={res['nes']:+.2f}\\nFDR={fdr_str}",
                    fontsize=6, va="top", ha="right",
                    transform=ax.transAxes, color="#374151",
                    linespacing=1.3, **_FONT)
            ax.set_ylabel("ES", fontsize=7, color="#374151", **_FONT)
            ax.tick_params(axis="y", labelsize=6, colors="#374151", length=2, pad=1)
            ax.tick_params(axis="x", length=0, colors="#374151")
            plt.setp(ax.get_xticklabels(), visible=False)
            ax.set_xlim(0, n)
            for sp in ("top", "right"): ax.spines[sp].set_visible(False)
            for sp in ("left", "bottom"):
                ax.spines[sp].set_color("#9ca3af"); ax.spines[sp].set_linewidth(0.5)

        def _draw_rug(ax, res):
            # Two-tone rug — grey ticks for non-hits, black ticks for hits on
            # top so the smaller group still reads through when one side dominates.
            n = res["n"]
            sh = res["sorted_hits"]
            miss_x = np.where(~sh)[0]
            hit_x  = np.where(sh)[0]
            ax.vlines(miss_x, 0, 1, color=COLOR_CONTROL, linewidth=0.5, alpha=0.7,  zorder=1)
            ax.vlines(hit_x,  0, 1, color="black",        linewidth=0.5, alpha=0.95, zorder=2)
            ax.set_xlim(0, n); ax.set_ylim(0, 1)
            ax.set_yticks([]); ax.set_xticks([])
            plt.setp(ax.get_xticklabels(), visible=False)
            for sp in ("top", "bottom"):
                ax.spines[sp].set_visible(True)
                ax.spines[sp].set_color("#9ca3af"); ax.spines[sp].set_linewidth(0.4)
            for sp in ("left", "right"): ax.spines[sp].set_visible(False)

        def _draw_grad(ax, sm, n):
            img = np.asarray(sm).reshape(1, -1)
            vmax = float(np.nanmax(np.abs(img))) or 1.0
            ax.imshow(img, aspect="auto", cmap="RdBu_r", vmin=-vmax, vmax=vmax,
                      extent=[0, n, 0, 1], interpolation="nearest")
            ax.set_xlim(0, n); ax.set_ylim(0, 1)
            ax.set_xticks([]); ax.set_yticks([])
            plt.setp(ax.get_xticklabels(), visible=False)
            for sp in ax.spines.values(): sp.set_visible(False)

        def _draw_metric_e(ax, sm, n):
            x = np.arange(n)
            ax.fill_between(x, 0, sm, color="#9ca3af", alpha=0.6, linewidth=0)
            ax.axhline(0, color="#9ca3af", linewidth=0.4)
            ax.set_ylabel("Rank\\n(z-score)", fontsize=6.5, color="#374151", **_FONT)
            ax.set_xlabel(f"samples (n={n})", fontsize=6.5, color="#374151", **_FONT)
            ax.tick_params(labelsize=5.5, colors="#374151", length=2, pad=1)
            ax.set_xlim(0, n)
            for sp in ("top", "right"): ax.spines[sp].set_visible(False)
            for sp in ("left", "bottom"):
                ax.spines[sp].set_color("#9ca3af"); ax.spines[sp].set_linewidth(0.5)

        # left: disease
        _draw_es(ax_es_d, res_dis, COLOR_OTHER,  "Disease enrichment")
        _draw_rug(ax_h_d, res_dis)
        _draw_grad(ax_g_d, res_dis["sorted_metric"], res_dis["n"])
        _draw_metric_e(ax_m_d, res_dis["sorted_metric"], res_dis["n"])

        # right: tumor
        _draw_es(ax_es_t, res_tum, COLOR_CANCER, "Tumor enrichment")
        _draw_rug(ax_h_t, res_tum)
        _draw_grad(ax_g_t, res_tum["sorted_metric"], res_tum["n"])
        _draw_metric_e(ax_m_t, res_tum["sorted_metric"], res_tum["n"])

        fig_e.suptitle(f"{gene} expression in {cell}",
                       fontsize=8.5, weight="bold",
                       color="#111827",
                       x=(LEFT_E + RIGHT_E) / 2, y=0.94,
                       ha="center", **_FONT)

        buf2 = io.BytesIO()
        plt.savefig(buf2, format="png", bbox_inches="tight", dpi=150, facecolor="white")
        plt.close(fig_e)
        open("/plot_enrichment.png", "wb").write(buf2.getbuffer())

print("DONE_B")
"OK"
      `;

      // ---- PHASE A: dotplot + barplot + CSV — display ASAP ----
      await pyodide.runPythonAsync(codeA);

      const pngBytes = FS.readFile("/plot.png");
      const pngBlob  = new Blob([pngBytes], { type: "image/png" });
      if(pngURL) URL.revokeObjectURL(pngURL);
      pngURL = URL.createObjectURL(pngBlob);

      const csvBytes = FS.readFile("/plot.csv");
      const csvBlob  = new Blob([csvBytes], { type: "text/csv" });
      if(csvURL) URL.revokeObjectURL(csvURL);
      csvURL = URL.createObjectURL(csvBlob);

      const safeCell = cell.replace(/[\s/\\&]+/g, "_");
      const safeGene = gene.replace(/[\s/\\&]+/g, "_");
      const pngName = `${safeCell}_${safeGene}_context.png`;
      const csvName = `${safeCell}_${safeGene}_context.csv`;

      $("plotImg").src = pngURL;
      $("plotImg").style.display = "block";
      $("downloadPNG").href = pngURL;
      $("downloadPNG").download = pngName;
      $("downloadPNG").textContent = `⬇ Download ${pngName}`;
      $("downloadPNG").style.display = "inline-flex";
      $("downloadCSV").href = csvURL;
      $("downloadCSV").download = csvName;
      $("downloadCSV").textContent = `⬇ Download ${csvName}`;
      $("downloadCSV").style.display = "inline-flex";

      // Hide stale enrichment image until Phase B repopulates it (or fails).
      $("plotImgEnrichment").style.display = "none";
      $("downloadEnrichmentPNG").style.display = "none";

      $("resultSummary").innerHTML = `${cell} · ${gene} <span class="stat">organ × disease context</span>`;
      $("resultCard").classList.remove("err");
      $("resultCard").style.display = "block";
      setStageState("plot","done");
      stage(85, "Dotplot ready · computing enrichment …");
      log("✅ Dotplot rendered — computing enrichment …");

      // Yield to the browser event loop so the dotplot actually paints before
      // Phase B (matplotlib + permutation) starts blocking the main thread.
      // Two double-rAF + setTimeout to be sure the paint fires.
      await new Promise(r => requestAnimationFrame(()=> requestAnimationFrame(()=> setTimeout(r, 0))));

      // ---- PHASE B: enrichment compute + render ----
      try {
        await pyodide.runPythonAsync(codeB);
        try {
          const epngBytes = FS.readFile("/plot_enrichment.png");
          const epngBlob  = new Blob([epngBytes], { type: "image/png" });
          if(epngURL) URL.revokeObjectURL(epngURL);
          epngURL = URL.createObjectURL(epngBlob);
          const epngName = `${safeCell}_${safeGene}_enrichment.png`;
          $("plotImgEnrichment").src = epngURL;
          $("plotImgEnrichment").style.display = "block";
          $("downloadEnrichmentPNG").href = epngURL;
          $("downloadEnrichmentPNG").download = epngName;
          $("downloadEnrichmentPNG").textContent = `⬇ Download ${epngName}`;
          $("downloadEnrichmentPNG").style.display = "inline-flex";
          log("✅ Enrichment ready.");
        } catch(_) {
          // No enrichment file (degenerate contrast or no sample data) — silent.
        }
      } catch(eb) {
        log("⚠️ Enrichment failed: " + (eb?.message||eb));
      }

      stage(100, "Done");
    }catch(e){
      stage(0, "Error");
      setStageState("plot","err");
      $("resultSummary").innerHTML = `${e?.message || e}`;
      $("resultCard").classList.add("err");
      $("resultCard").style.display = "block";
      $("plotImg").style.display = "none";
      $("downloadPNG").style.display = "none";
      $("downloadCSV").style.display = "none";
      log("❌ Run error: " + (e?.message||e));
    }finally{
      try{ unhookOut && unhookOut(); }catch(_){}
      try{ unhookErr && unhookErr(); }catch(_){}
    }
  });

  log("Flow → (auto-boot) → choose cell (auto-loads) → Explore");
  resetStages();

  // Auto-boot: this inline script only runs on the contextplot page.
  boot();
})();
</script>

{% endraw %}
