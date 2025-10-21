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
    <input id="geneInput" type="text" value="CD19,LRRC15,CD36,COCH,NFAT5,COL1A1,IL6,HSPA1A" style="width:340px;">
  </label>
  <button id="runBtn" type="button" disabled>3: run plot</button>
</div>

<div id="assetHint" style="font-size:12px;color:#666;margin:-6px 0 10px 0;">
  Assets are loaded from <code id="assetBaseShow">/assets/data/expression_profile/</code>.
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

  // --- run plot (multi-gene as in your Python) ---
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
gene_in = ${JSON.stringify(geneStr)}

stage(55, "Reading fdic …")
with open("/fdic.pkl","rb") as f: fdic = pkl.load(f)
genes = fdic['gene']  # list of all known gene symbols

# parse and filter genes
mlist = [g.strip() for g in gene_in.split(",") if g.strip()]
mlist = [g for g in mlist if g in genes]
if not mlist:
    raise ValueError("None of the input genes are present in the profile dictionary.")

# boolean mask for selected genes over the full 'genes' list
idx = np.array([g in mlist for g in genes], dtype=bool)

stage(65, "Reading avg/cov …")
with gzip.open("/avg.npy.gz","rb") as f: avg = np.load(f)
with gzip.open("/cov.npy.gz","rb") as f: cov = np.load(f)

# select columns by mask; rows = features (fdic[cell])
d1 = avg[:, idx]   # mean expression for selected genes
d2 = cov[:, idx]   # "express. ratio" (used for sizes)

feat = fdic[cell]  # list of feature names (y-axis labels)
n_feat = len(feat)
n_gen  = len(mlist)

if d1.shape != (n_feat, n_gen) or d2.shape != (n_feat, n_gen):
    raise ValueError(f"Shape mismatch: d1={d1.shape}, d2={d2.shape}, expected=({n_feat},{n_gen})")

# build the same X,Y as your code
X = np.repeat(range(n_feat), n_gen).reshape(-1,n_gen).T.flatten()
Y = np.repeat(range(n_gen), n_feat).reshape(-1,n_feat).flatten()

# flatten color & size in the same order as X,Y
# We created X by transposing; match that order by transposing first then ravel().
d1_flat = d1.T.flatten()
d2_flat = d2.T.flatten()

# plot params
fac  = 100.0
padx = 0.5
pady = 0.5

stage(75, "Making figure …")
fig = plt.figure()
ax  = plt.gca()
scatt = ax.scatter(x=Y, y=X, s=d2_flat * fac, c=d1_flat, cmap='OrRd',
                   edgecolor='black', linewidth=0.5)

ax.set_yticks(range(n_feat))
ax.set_yticklabels(feat)
ax.set_xticks(range(n_gen))
ax.set_xticklabels(mlist)
plt.tick_params(axis='x', rotation=90)

plt.ylim(-pady, n_feat-1+pady)
plt.xlim(-padx, n_gen-1+padx)

# size legend (keep raw sizes)
leg = ax.legend(*scatt.legend_elements("sizes", num=5),
                bbox_to_anchor=(1.05,1), title='express.\\nratio',
                loc='upper left')
try:
    leg.get_title().set_ha('center')
    leg.get_title().set_multialignment('center')
except Exception:
    pass

# colorbar scaled by number of genes
plt.colorbar(scatt, anchor=(0.5,0), location='top',
             fraction = 0.12 / max(1, n_gen), aspect=5,
             label='mean express.', orientation='horizontal',
             ticks=[], pad=0.02)

# figure size: width grows with number of genes, height with number of features
plt.gcf().set_size_inches(0.1 + 0.2*max(1, n_gen), n_feat / 4.0)

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

