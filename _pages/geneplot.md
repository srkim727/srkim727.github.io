---
title: Explore gene expression
author: S. Kim
date: 2025-10-16
layout: post
excerpt: ""
---

{% raw %}

<!-- Pyodide -->
<script defer src="https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js"></script>

<style>
  .meta-panel{
    background:#f8f9fb;border:1px solid #e5e7eb;border-radius:8px;
    padding:10px 12px;margin:8px 0 12px 0;color:#111;font-size:14px;
  }
  .meta-panel code{background:#eef2f7;padding:1px 4px;border-radius:4px}
  .meta-panel small{color:#666}
</style>

<div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0;">
  <button id="bootBtn" type="button">1: boot</button>
  <button id="assetsBtn" type="button" disabled>2: load assets</button>

  <label>Cell:
    <select id="cellSelect" style="width:180px;">
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

  <label>Genes (comma-sep):
    <input id="geneInput" type="text" value="CD3D,KRT5,CDH19,PTPRC,CD79A,MS4A1" style="width:360px;">
  </label>
  <button id="runBtn" type="button" disabled>3: run plot</button>
</div>

<!-- Annotation panel -->
<div class="meta-panel">
  <strong>Gene expression patterns of the cell types.</strong>
  <p style="margin:6px 0 8px 0;">This page shows various information including</p>
  <ol style="margin:0 0 0 18px;">
    <li style="margin:2px 0;">Ratio of cells expressing each gene</li>
    <li style="margin:2px 0;">Average expression level of each gene</li>
  </ol>
  <p style="margin:8px 0 0 0;">
    Expression levels were evaluated in the representative cell atlases
    (both <code>Level1</code> and <code>Level2</code>).
  </p>
  <div style="margin-top:6px;">
    <small>Data base: <code id="assetBaseShow">/assets/data/expression_profile/</code></small>
  </div>
</div>

<!-- Processing progress -->
<div style="margin:8px 0 4px 0; font-size:13px; color:#555;">Processing</div>
<progress id="procProg" max="100" value="0" style="width:100%;"></progress>
<div id="procStatus" style="font-size:12px;color:#777;margin:4px 0 8px 0;">Idle</div>

<!-- Output image -->
<div id="imgWrap" style="display:none;margin:10px 0;">
  <img id="plotImg" alt="plot" style="max-width:100%;border:1px solid #e5e7eb;border-radius:6px;">
  <div style="margin-top:6px;">
    <a id="downloadPNG" download="plot.png">Download PNG</a>
  </div>
</div>

<details open style="margin-top:10px;">
  <summary><strong>Log</strong></summary>
  <pre id="log" style="
    background:#0a0f17;color:#e8eef7;padding:6px;border-radius:6px;overflow:auto;height:260px;
    white-space:pre-wrap;font-size:11px;line-height:1.25;font-family:ui-monospace,Menlo,Consolas,monospace;">
  </pre>
</details>

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
    $("procProg").value = pct;
    $("procStatus").textContent = msg;
  }
  async function fetchToFS(path, fsPath){
    const u = (path.includes("?") ? path : path + "?t=" + Date.now()); // bust cache
    const r = await fetch(u, { cache:"no-store" });
    if(!r.ok) throw new Error("HTTP " + r.status + " for " + path);
    const buf = new Uint8Array(await r.arrayBuffer());
    pyodide.FS.writeFile(fsPath, buf);
    return buf.length;
  }
  function existsInFS(path){
    try{ pyodide.FS.stat(path); return true; }catch(_){ return false; }
  }
  function clearImage(){
    $("imgWrap").style.display = "none";
    $("plotImg").removeAttribute("src");
  }

  // --- state ---
  let pyodide=null, FS=null;
  let booted=false, assetsLoaded=false, fdicLoaded=false, isLoadingAssets=false, pngURL=null;

  // --- reusable asset loader (used by button and dropdown) ---
  async function loadAssetsForCell(cell){
    if(isLoadingAssets) return;                // prevent overlap
    if(!booted){ alert("Boot first."); return; }
    if(!cell){ alert("Choose a cell."); return; }

    try{
      isLoadingAssets = true;
      setDisabled("assetsBtn", true);
      setDisabled("runBtn", true);
      clearImage();

      // ensure fdic is available once
      if(!fdicLoaded || !existsInFS("/fdic.pkl")){
        stage(5, "Fetching fdic.pkl …");
        const fdicSize = await fetchToFS(ASSET_BASE + "fdic.pkl", "/fdic.pkl");
        log(`✅ fdic.pkl → /fdic.pkl (${(fdicSize/1e6).toFixed(2)} MB)`);
        fdicLoaded = true;
      }else{
        log("ℹ️ fdic.pkl already in FS; skipping download.");
      }

      // per-cell assets
      stage(20, `Fetching ${cell}_avg.npy.gz …`);
      const avgSize = await fetchToFS(ASSET_BASE + `${cell}_avg.npy.gz`, "/avg.npy.gz");
      log(`✅ ${cell}_avg.npy.gz → /avg.npy.gz (${(avgSize/1e6).toFixed(2)} MB)`);

      stage(35, `Fetching ${cell}_cov.npy.gz …`);
      const covSize = await fetchToFS(ASSET_BASE + `${cell}_cov.npy.gz`, "/cov.npy.gz");
      log(`✅ ${cell}_cov.npy.gz → /cov.npy.gz (${(covSize/1e6).toFixed(2)} MB)`);

      // quick smoke: fdic keys
      const info = await pyodide.runPythonAsync(`
import pickle as pkl
with open("/fdic.pkl","rb") as fh:
    _fd = pkl.load(fh)
list(_fd.keys())[:5]
      `);
      log("ℹ️ fdic keys (first 5): " + JSON.stringify(info));

      assetsLoaded = true;
      setDisabled("runBtn", false);
      stage(45, `Assets for '${cell}' loaded. Ready.`);
    }catch(e){
      log("❌ Asset load failed: " + (e?.message||e));
      assetsLoaded = false;
      setDisabled("runBtn", true);
      stage(0, "Idle");
    }finally{
      isLoadingAssets = false;
      setDisabled("assetsBtn", false);
    }
  }

  // --- boot ---
  $("bootBtn").addEventListener("click", async ()=>{
    try{
      setDisabled("bootBtn", true);
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

      log("⏳ Boot: loading packages (numpy, pandas, matplotlib) …");
      await pyodide.loadPackage(["numpy","pandas","matplotlib"]);
      log("✅ Packages loaded.");

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
      setDisabled("assetsBtn", false);

      // auto-load for the initially selected cell
      const initialCell = $("cellSelect").value.trim();
      log(`🔄 Auto-load assets for initial cell: ${initialCell}`);
      await loadAssetsForCell(initialCell);
    }catch(e){
      log("❌ Boot failed: " + (e?.message||e));
      setDisabled("bootBtn", false);
      return;
    }
    setDisabled("bootBtn", false);
  });

  // --- load assets button ---
  $("assetsBtn").addEventListener("click", async ()=>{
    const cell = $("cellSelect").value.trim();
    await loadAssetsForCell(cell);
  });

  // --- AUTO-RELOAD when cell changes ---
  let cellReloadTimer=null;
  $("cellSelect").addEventListener("change", ()=>{
    if(!booted) return;
    const cell = $("cellSelect").value.trim();
    log(`🔁 Cell changed → reloading assets for '${cell}' …`);
    clearTimeout(cellReloadTimer);
    cellReloadTimer = setTimeout(()=> loadAssetsForCell(cell), 150);
  });

  // --- run plot ---
  $("runBtn").addEventListener("click", async ()=>{
    if(!assetsLoaded){ alert("Load assets first."); return; }
    const cell = $("cellSelect").value.trim();
    const geneStr = $("geneInput").value.trim();
    if(!geneStr){ alert("Enter gene symbols (comma-separated)."); return; }

    stage(50, "Plotting …");
    log(`▶️ Plot: cell=${cell}, genes=${geneStr}`);
    clearImage();

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
d1 = avg[:, idx]  # mean (color)
d2 = cov[:, idx]  # express. ratio (size)

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
color = np.ravel(d1).astype(float)

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
             label = 'mean express.', orientation = 'horizontal',
             ticks = [], pad = 0.02)

# figure size responsive to gene count and feature count
plt.gcf().set_size_inches(.1 + .2*len(mlist), len(feat) / 4)

stage(90, "Saving PNG …")
buf = io.BytesIO()
plt.savefig(buf, format="png", bbox_inches="tight", dpi=150)
plt.close(fig)
open("/plot.png","wb").write(buf.getbuffer())
"OK"
      `;
      await pyodide.runPythonAsync(code);
      stage(100, "Done");

      const bytes = FS.readFile("/plot.png");
      const blob  = new Blob([bytes], { type: "image/png" });
      if(pngURL) URL.revokeObjectURL(pngURL);
      pngURL = URL.createObjectURL(blob);
      $("plotImg").src = pngURL;
      $("imgWrap").style.display = "block";
      $("downloadPNG").href = pngURL;
      log("✅ Plot ready.");
    }catch(e){
      stage(0, "Error");
      log("❌ Run error: " + (e?.message||e));
      $("imgWrap").style.display = "none";
    }finally{
      try{ unhookOut && unhookOut(); }catch(_){}
      try{ unhookErr && unhookErr(); }catch(_){}
    }
  });

  log("Flow → 1) boot → 2) load assets → 3) run plot");
})();
</script>

{% endraw %}
