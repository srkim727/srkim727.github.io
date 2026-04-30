---
title: Gene expression by cell type
author: S. Kim
date: 2025-10-19
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
  <p style="margin:6px 0 8px 0;">This page shows various information including</p>
  <ol style="margin:0 0 0 18px;">
    <li style="margin:2px 0;">Ratio of cells expressing each gene (dot sizes)</li>
    <li style="margin:2px 0;">Average expression level of each gene (colors)</li>
  </ol>
  <p style="margin:8px 0 0 0;">
    Expression levels were evaluated in the representative cell atlases
    (both <code>Level1</code> and <code>Level2</code>).
  </p>
  <div style="margin-top:6px;">
    <small>Data base: <code id="assetBaseShow">/assets/data/expression_profile/</code></small>
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
  // --- config: adjust if your assets live elsewhere ---
  const ASSET_BASE = "/assets/data/expression_profile/"; // trailing slash required
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
    // Allow browser HTTP cache (returns 200 first time, 304 thereafter — much faster on revisits).
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

  // --- state ---
  let pyodide=null, FS=null;
  let booted=false, assetsLoaded=false, fdicLoaded=false, isLoadingAssets=false, pngURL=null, csvURL=null;

  // --- reusable asset loader (used by button and dropdown) ---
  async function loadAssetsForCell(cell){
    if(isLoadingAssets) return;                // prevent overlap
    if(!booted){ alert("Please wait until the setup finishes."); return; }
    if(!cell){ alert("Choose a cell."); return; }

    try{
      isLoadingAssets = true;
      setDisabled("assetsBtn", true);
      setDisabled("runBtn", true);
      clearImage();
      setStageState("data","active");
      setStageState("plot","pending");

      // Build a parallel fetch list. Browser HTTP cache makes repeated loads near-instant.
      const tasks = [];
      if(!fdicLoaded || !existsInFS("/fdic.pkl")){
        stage(10, "Fetching assets …");
        tasks.push(
          fetchToFS(ASSET_BASE + "fdic.pkl", "/fdic.pkl").then(sz => {
            log(`✅ fdic.pkl (${(sz/1e6).toFixed(2)} MB)`);
            fdicLoaded = true;
          })
        );
      } else {
        stage(10, "Fetching cell assets …");
      }
      tasks.push(
        fetchToFS(ASSET_BASE + `${cell}_avg.npy.gz`, "/avg.npy.gz").then(sz => {
          log(`✅ ${cell}_avg.npy.gz (${(sz/1e6).toFixed(2)} MB)`);
        }),
        fetchToFS(ASSET_BASE + `${cell}_cov.npy.gz`, "/cov.npy.gz").then(sz => {
          log(`✅ ${cell}_cov.npy.gz (${(sz/1e6).toFixed(2)} MB)`);
        }),
      );
      // All fetches run concurrently — the slowest one bounds total time, not the sum.
      await Promise.all(tasks);

      assetsLoaded = true;
      setDisabled("runBtn", false);
      setStageState("data","done");
      stage(45, `Assets for '${cell}' ready.`);
      log(`🧬 Active model: ${cell}  ·  ready to plot`);
    }catch(e){
      log("❌ Asset load failed: " + (e?.message||e));
      assetsLoaded = false;
      setDisabled("runBtn", true);
      setStageState("data","err");
      stage(0, "Asset load failed");
    }finally{
      isLoadingAssets = false;
      setDisabled("assetsBtn", false);
    }
  }

  // --- boot ---
  async function boot(){
    try{
      setStageState("boot","active");
      stage(2, "Initializing Pyodide…");
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

      stage(5, "Loading Python packages (numpy, pandas, matplotlib)…");
      log("⏳ Boot: loading packages (numpy, pandas, matplotlib) …");
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

      // auto-load for the initially selected cell
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
    // Immediately invalidate — prevents clicking Run between cell change and the debounced reload.
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
    const geneStr = $("geneInput").value.trim();
    if(!geneStr){ alert("Enter gene symbols (comma-separated)."); return; }

    stage(50, "Plotting …");
    log(`▶️ Plot: cell=${cell}, genes=${geneStr}`);
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
import os, io, gzip, pickle as pkl
import numpy as np, pandas as pd
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt

plt.rcParams['figure.dpi'] = 150

def stage(pct,msg):
    print(f"__STAGE__:{pct}:{msg}")

cell = ${JSON.stringify(cell)}
gene = ${JSON.stringify(geneStr)}

# ---- load dictionaries and gene list ----
stage(55, "Reading fdic …")
with open("/fdic.pkl","rb") as file:
    fdic = pkl.load(file)
genes = fdic['gene']  # full gene catalog for indexing

# ---- parse gene list and build ordered index list ----
mlist = [i for i in gene.split(",") if i in genes]
if len(mlist) == 0:
    raise ValueError("None of the requested genes are present.")
idx = [genes.index(i) for i in mlist]   # ordered column indices

# ---- load per-cell arrays ----
stage(65, "Reading avg/cov …")
with gzip.open("/avg.npy.gz","rb") as f:
    avg = np.load(f)
with gzip.open("/cov.npy.gz","rb") as f:
    cov = np.load(f)

# ---- select columns by ordered indices ----
d1 = avg[:, idx]  # mean (color)   — raw
d2 = cov[:, idx]  # express. ratio (size)

# Per-gene max normalize so colors are comparable across genes regardless of scale
d1_max = d1.max(axis=0, keepdims=True)
d1_max = np.where(d1_max > 0, d1_max, 1.0)   # avoid div-by-zero for all-zero cols
d1n = d1 / d1_max                            # relative mean expression, in [0, 1]

feat   = fdic[cell]
n_feat = len(feat)
n_gene = len(mlist)

# ---- grid coordinates ----
X = np.tile(np.arange(n_gene), n_feat)     # col index per dot (x)
Y = np.repeat(np.arange(n_feat), n_gene)   # row index per dot (y)

# ---- styles ----
fac  = 100.0
padx = 0.5
pady = 0.5

sizes = np.ravel(d2).astype(float) * fac
color = np.ravel(d1n).astype(float)   # normalized per gene

stage(75, "Making figure …")
fig = plt.figure()
ax  = plt.gca()
scatt = ax.scatter(x = X, y = Y, s = sizes, c = color, cmap = 'OrRd',
                   edgecolor = 'black', linewidth = .5)

ax.set_yticks(range(len(feat)))
ax.set_yticklabels(feat)
ax.set_xticks(range(len(mlist)))
ax.set_xticklabels(mlist)
plt.tick_params(axis='x', rotation = 90)

plt.ylim(-pady, len(feat)-1+pady)
plt.xlim(-padx, len(mlist)-1+padx)

# size legend
plt.legend(*scatt.legend_elements("sizes", num=5),
           bbox_to_anchor=(1.05,1), title='express.\\nratio', loc='upper left')

# colorbar scales with number of genes
plt.colorbar(scatt, anchor=(0.5,0), location='top',
             fraction = .12 / max(1, len(mlist)), aspect = 5,
             label = 'relative mean express.\\n(per-gene max = 1)',
             orientation = 'horizontal',
             ticks = [], pad = 0.02)

# figure size responsive to gene count and feature count
plt.gcf().set_size_inches(.1 + .2*len(mlist), len(feat) / 4)

stage(88, "Saving PNG …")
buf = io.BytesIO()
plt.savefig(buf, format="png", bbox_inches="tight", dpi=150)
plt.close(fig)
open("/plot.png","wb").write(buf.getbuffer())

# ---- also export long-format CSV of the underlying data ----
stage(95, "Saving CSV …")
F_ix, G_ix = np.meshgrid(np.arange(n_feat), np.arange(n_gene), indexing='ij')
df_out = pd.DataFrame({
    'cell_feature':              [str(feat[i])  for i in F_ix.ravel()],
    'gene':                      [str(mlist[j]) for j in G_ix.ravel()],
    'mean_expression':           d1.ravel().astype(float),
    'mean_expression_normalized':d1n.ravel().astype(float),
    'expression_ratio':          d2.ravel().astype(float),
})
df_out.to_csv("/plot.csv", index=False)
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

      // Build output filename stem: {cell}_{first-few-genes}
      const stem = (geneStr.split(",").map(g=>g.trim()).filter(Boolean).slice(0,4).join("_") || "plot")
        .replace(/[\s/\\]+/g,"_");
      const pngName = `${cell}_${stem}.png`;
      const csvName = `${cell}_${stem}.csv`;

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
      $("resultSummary").innerHTML = `${cell} · ${geneStr.split(',').length} genes <span class="stat">plot rendered</span>`;
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

  // Auto-boot: this inline script only runs on the geneplot page.
  boot();
})();
</script>

{% endraw %}
