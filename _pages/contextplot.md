---
title: Explore gene expression (context)
author: S. Kim
date: 2026-04-30
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
      <span>Cell</span>
      <select id="cellSelect" style="min-width:160px;">
        <option selected>Mural</option>
        <option>Ciliated</option>
        <option>Dendritic_classical</option>
        <option>Mast&Basophil</option>
        <option>Neuron_bipolar</option>
        <option>Neuron_excitatory</option>
        <option>Platelet</option>
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
    </div>
    <img class="plot-img" id="plotImg" alt="plot" style="display:none;">
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
    <li style="margin:2px 0;">rows = organ &nbsp;·&nbsp; columns = disease &nbsp;·&nbsp; <code>Control</code> always on the left</li>
    <li style="margin:2px 0;">dot <strong>color</strong> = mean expression &nbsp;·&nbsp; dot <strong>size</strong> = coverage (fraction expressing)</li>
    <li style="margin:2px 0;">organ × disease combinations not covered by the database → light grey cell</li>
    <li style="margin:2px 0;">By default rows and (non-Control) columns are ordered by total dotplot signal (mean × coverage)</li>
  </ol>
  <div style="margin-top:6px;">
    <small>Data base: <code id="assetBaseShow">/assets/data/expression_context_profile/</code></small>
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
  // --- config: where the per-cell avg_od / cov_od files live on the site ---
  const ASSET_BASE = "/assets/data/expression_context_profile/";
  document.getElementById("assetBaseShow").textContent = ASSET_BASE;

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
    $("downloadPNG").style.display = "none";
    $("downloadCSV").style.display = "none";
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
    $("resultCard").style.display = "none";
    $("downloadPNG").style.display = "none";
    $("downloadCSV").style.display = "none";
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
  let hasSampleAvg=false;             // true if {cell}_avg.csv.gz was fetched OK
  let pngURL=null, csvURL=null;

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

      // Clean up any previous sample-level file so we don't carry it over to a cell that lacks it.
      try { pyodide.FS.unlink("/work/avg_sample.csv.gz"); } catch(_) {}
      hasSampleAvg = false;

      stage(20, `Fetching ${cell} avg/cov …`);
      // Required (avg_od + cov_od) in parallel; sample-level avg.csv.gz is best-effort.
      const required = Promise.all([
        fetchToFS(ASSET_BASE + `${cell}_avg_od.csv.gz`, "/work/avg_od.csv.gz")
          .then(sz => log(`✅ ${cell}_avg_od.csv.gz (${(sz/1e6).toFixed(2)} MB)`)),
        fetchToFS(ASSET_BASE + `${cell}_cov_od.csv.gz`, "/work/cov_od.csv.gz")
          .then(sz => log(`✅ ${cell}_cov_od.csv.gz (${(sz/1e6).toFixed(2)} MB)`)),
      ]);
      // Optional sample-level file (per-sample expression for the bar plot).
      const optional = fetchToFS(ASSET_BASE + `${cell}_avg.csv.gz`, "/work/avg_sample.csv.gz")
        .then(sz => {
          hasSampleAvg = true;
          log(`✅ ${cell}_avg.csv.gz (${(sz/1e6).toFixed(2)} MB) — bar plot will be enabled`);
        })
        .catch(() => {
          log(`ℹ️ no ${cell}_avg.csv.gz on the server — bar plot will be skipped`);
        });
      await Promise.all([required, optional]);

      assetsLoaded = true;
      currentCellLoaded = cell;
      setDisabled("runBtn", false);
      setStageState("data","done");
      stage(45, `Assets for '${cell}' ready.`);
      log(`🧬 Active model: ${cell}  ·  ${hasSampleAvg ? "dotplot + barplot" : "dotplot"} ready`);
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

    stage(50, "Plotting …");
    log(`▶️ Plot: cell=${cell}, gene=${gene}, sort=${sortMode}`);
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
      const code = `
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
has_sample = ${hasSampleAvg ? "True" : "False"}
cmap_name = "OrRd"

# ---- load avg/cov ----
stage(55, "Reading avg/cov …")
avg = pd.read_csv("/work/avg_od.csv.gz", index_col=0)
cov = pd.read_csv("/work/cov_od.csv.gz", index_col=0)
if not avg.index.equals(cov.index):
    cov = cov.reindex(avg.index)
if not avg.columns.equals(cov.columns):
    cov = cov.reindex(columns=avg.columns)
if gene not in avg.columns:
    raise ValueError(f"gene '{gene}' not found in {cell} (n_genes={avg.shape[1]:,})")

# ---- split o@d index ----
parts = avg.index.to_series().str.split("@", n=1, expand=True)
parts.columns = ["organ", "disease"]
diseases_all = parts["disease"].unique()

# ---- ordering ----
stage(63, "Computing layout …")
if sort_mode == "expression":
    sig = (avg[gene].fillna(0) * cov[gene].fillna(0)).values
    per = pd.DataFrame({"o": parts["organ"].values,
                        "d": parts["disease"].values,
                        "sig": sig})
    organs = per.groupby("o")["sig"].sum().sort_values(ascending=False).index.tolist()
    d_score = per.groupby("d")["sig"].sum()
    rest = d_score.drop(labels=[d for d in ["Control"] if d in d_score.index])\\
                  .sort_values(ascending=False).index.tolist()
else:
    organs = sorted(parts["organ"].unique())
    rest   = sorted(d for d in diseases_all if d != "Control")
control = ["Control"] if "Control" in diseases_all else []
diseases = control + rest

def pivot_g(values, parts, organ_order, disease_order):
    df = pd.DataFrame({"organ":   parts["organ"].values,
                       "disease": parts["disease"].values,
                       "v":       values.values})
    grid = df.pivot(index="organ", columns="disease", values="v")
    return grid.reindex(index=organ_order, columns=disease_order)

A = pivot_g(avg[gene], parts, organs, diseases)
C = pivot_g(cov[gene], parts, organs, diseases)
n_o, n_d = len(organs), len(diseases)

# ---- optionally pre-load sample-level data for the bar plot ----
sample_df = None
if has_sample:
    try:
        stage(70, "Reading sample-level data …")
        sp = "/work/avg_sample.csv.gz"
        with gzip.open(sp, "rt") as fh:
            header = fh.readline().rstrip().split(",")
        needed = [gene, "Organ", "disease", "o@d"]
        missing = [c for c in needed if c not in header]
        if missing:
            print(f"ℹ️ skipping bar plot — missing columns in avg_sample: {missing}")
            sample_df = None
        else:
            keep_idx = [0] + [header.index(c) for c in needed]
            sample_df = pd.read_csv(sp, index_col=0, usecols=keep_idx)
    except Exception as _e:
        print(f"ℹ️ skipping bar plot — {_e}")
        sample_df = None

# ---- figure ----
stage(75, "Drawing dotplot …")
fig_w = max(5.0, CELL_W * n_d + PAD_W)
fig_h_dot = max(2.0, CELL_H * n_o + PAD_H)
if sample_df is not None:
    fig_h_bar = 1.4
    fig = plt.figure(figsize=(fig_w, fig_h_dot + fig_h_bar + 0.4), dpi=150)
    gs = fig.add_gridspec(2, 1, height_ratios=[fig_h_dot, fig_h_bar], hspace=0.55)
    ax = fig.add_subplot(gs[0])
    ax_bar = fig.add_subplot(gs[1])
else:
    fig, ax = plt.subplots(figsize=(fig_w, fig_h_dot), dpi=150)
    ax_bar = None
ax.set_facecolor("white")

present_mask = ~A.isna().values
miss_y, miss_x = np.where(~present_mask)
pres_y, pres_x = np.where(present_mask)
for i, j in zip(miss_y, miss_x):
    ax.add_patch(plt.Rectangle((j-0.5, i-0.5), 1, 1,
                               facecolor=EMPTY_FILL, edgecolor="white",
                               linewidth=0.4, zorder=0))
for i, j in zip(pres_y, pres_x):
    ax.add_patch(plt.Rectangle((j-0.5, i-0.5), 1, 1,
                               facecolor=PRESENT_FILL, edgecolor="white",
                               linewidth=0.4, zorder=0))

cov_vals = np.clip(C.values[pres_y, pres_x], 0, 1)
avg_vals = A.values[pres_y, pres_x]
vmax = max(float(np.nanmax(avg_vals)) if np.isfinite(avg_vals).any() else 1.0, 1e-6)
sc = ax.scatter(pres_x, pres_y, s=cov_vals * SIZE_FACTOR, c=avg_vals,
                cmap=cmap_name, vmin=0, vmax=vmax,
                edgecolor=DOT_EDGE, linewidth=0.4, zorder=2)

ax.set_xticks(range(n_d)); ax.set_xticklabels(diseases, rotation=90, fontsize=5.5)
ax.set_yticks(range(n_o)); ax.set_yticklabels(organs, fontsize=6)
ax.set_xlim(-0.5, n_d - 0.5)
ax.set_ylim(n_o - 0.5, -0.5)
ax.tick_params(length=0, colors="#374151", pad=1)
for sp in ax.spines.values(): sp.set_visible(False)

ax.set_title(f"{gene} expression in {cell}", fontsize=9, weight="semibold",
             color="#111827", pad=10, loc="left")

# ---- compact colorbar — pinned top-right; label on the LEFT (vertical) ----
cax = ax.inset_axes([1.018, 0.91, 0.008, 0.09])
cbar = fig.colorbar(sc, cax=cax)
cbar.ax.yaxis.set_label_position("left")
cbar.set_label("mean exp.", fontsize=4.5, color="#374151", labelpad=2)
cbar.ax.tick_params(labelsize=5, colors="#374151", length=1.5, pad=0.8)
cbar.outline.set_visible(False)

# ---- coverage legend (no built-in title) — bigger pad, tight rows ----
leg_handles = [plt.scatter([], [], s=max(s * SIZE_FACTOR * LEG_DOT_SCALE, 0.5),
                           c="#9ca3af", edgecolor=DOT_EDGE, linewidth=0.3)
               for s in LEG_SIZES]
leg = ax.legend(leg_handles, [f"{s:g}" for s in LEG_SIZES],
                loc="lower left",
                bbox_to_anchor=(1.018, 0.0),
                fontsize=4.5, frameon=False,
                labelspacing=0.35, borderpad=0.05,
                handletextpad=1.2, handlelength=0.4,
                borderaxespad=0.0)

fig.canvas.draw()
leg_bbox = leg.get_window_extent().transformed(ax.transAxes.inverted())
y_center = (leg_bbox.y0 + leg_bbox.y1) / 2.0
ax.text(1.012, y_center, "coverage", rotation=90, fontsize=4.5,
        color="#374151", ha="center", va="center", transform=ax.transAxes)

# ---- bar + strip plot below the dotplot (per-sample expression by o@d) ----
if ax_bar is not None and sample_df is not None:
    stage(85, "Drawing barplot …")
    agg = sample_df.groupby("o@d")[gene].agg(["mean", "sem"]).sort_values("mean", ascending=False)
    od_order  = agg.index.tolist()
    mean_vals = agg["mean"].values
    se_vals   = np.nan_to_num(agg["sem"].values, nan=0.0)
    x_pos = np.arange(len(od_order))
    bar_colors = [disease_color(od.split("@", 1)[1] if "@" in od else "") for od in od_order]

    ax_bar.bar(x_pos, mean_vals, yerr=se_vals, color=bar_colors,
               edgecolor="black", linewidth=0.4, width=0.78,
               alpha=0.55, zorder=1,
               error_kw=dict(ecolor="black", elinewidth=0.5, capsize=1.2, capthick=0.5))

    rng = np.random.default_rng(42)
    JIT = 0.18
    for i, od in enumerate(od_order):
        sub = sample_df.loc[sample_df["o@d"] == od, gene].values.astype(float)
        if len(sub) == 0:
            continue
        x_jit = i + rng.uniform(-JIT, JIT, size=len(sub))
        ax_bar.scatter(x_jit, sub, c=bar_colors[i], edgecolor="black",
                       linewidth=0.3, s=7, zorder=3, alpha=0.95)

    ax_bar.set_xticks(x_pos)
    ax_bar.set_xticklabels(od_order, rotation=90, fontsize=4.5)
    ax_bar.set_xlim(-0.5, len(od_order) - 0.5)
    ax_bar.set_ylabel("mean expression", fontsize=6, color="#374151")
    ax_bar.tick_params(axis="y", labelsize=5, colors="#374151", length=2, pad=1)
    ax_bar.tick_params(axis="x", length=0, colors="#374151", pad=1)
    for sp in ("top", "right"): ax_bar.spines[sp].set_visible(False)
    for sp in ("left", "bottom"):
        ax_bar.spines[sp].set_color("#9ca3af"); ax_bar.spines[sp].set_linewidth(0.5)
    ax_bar.legend(handles=[
        plt.Rectangle((0, 0), 1, 1, color=COLOR_CONTROL, label="Control"),
        plt.Rectangle((0, 0), 1, 1, color=COLOR_CANCER,  label="Cancer"),
        plt.Rectangle((0, 0), 1, 1, color=COLOR_OTHER,   label="Other"),
    ], loc="upper right", fontsize=5, frameon=False,
        handlelength=0.9, handleheight=0.7, labelspacing=0.3, borderpad=0.2)

plt.tight_layout()

stage(92, "Saving PNG …")
buf = io.BytesIO()
plt.savefig(buf, format="png", bbox_inches="tight", dpi=150, facecolor="white")
plt.close(fig)
open("/plot.png","wb").write(buf.getbuffer())

stage(96, "Saving CSV …")
F_ix, G_ix = np.meshgrid(np.arange(n_o), np.arange(n_d), indexing="ij")
df_out = pd.DataFrame({
    "organ":           [organs[i]   for i in F_ix.ravel()],
    "disease":         [diseases[j] for j in G_ix.ravel()],
    "mean_expression": A.values.ravel(),
    "coverage":        C.values.ravel(),
})
df_out.to_csv("/plot.csv", index=False)
print("DONE", n_o, "organs ×", n_d, "diseases")
"OK"
      `;
      await pyodide.runPythonAsync(code);
      stage(100, "Done");
      setStageState("plot","done");

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
      $("resultSummary").innerHTML = `${cell} · ${gene} <span class="stat">organ × disease context</span>`;
      $("resultCard").classList.remove("err");
      $("resultCard").style.display = "block";
      log("✅ Plot ready.");
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
