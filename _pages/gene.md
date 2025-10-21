---
title: Annotate cells (Online) — Plot
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

  <label>Gene:
    <input id="geneInput" type="text" value="CD79A" style="width:140px;">
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
    background:#0a0f17;color:#e8eef7;padding:6px;border-radius:6px;overflow:auto;height:240px;
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
    if(lines.length>300){ el.textContent = lines.slice(-300).join("\n"); }
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
import sys, io, os, gzip
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

  // --- load assets button (still available) ---
  $("assetsBtn").addEventListener("click", async ()=>{
    const cell = $("cellSelect").value.trim();
    await loadAssetsForCell(cell);
  });

  // --- AUTO-RELOAD when cell changes ---
  let cellReloadTimer=null;
  $("cellSelect").addEventListener("change", ()=>{
    if(!booted) return;          // wait until boot
    const cell = $("cellSelect").value.trim();
    log(`🔁 Cell changed → reloading assets for '${cell}' …`);
    clearTimeout(cellReloadTimer);
    cellReloadTimer = setTimeout(()=> loadAssetsForCell(cell), 150); // small debounce
  });

  // --- run plot ---
  $("runBtn").addEventListener("click", async ()=>{
    if(!assetsLoaded){ alert("Load assets first."); return; }
    const cell = $("cellSelect").value.trim();
    const gene = $("geneInput").value.trim();
    if(!gene){ alert("Enter a gene symbol."); return; }

    stage(50, "Plotting …");
    log(`▶️ Plot: cell=${cell}, gene=${gene}`);
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

# read pickle
stage(55, "Reading fdic …")
with open("/fdic.pkl","rb") as f: fdic = pkl.load(f)

genes = fdic['gene']
cell  = ${JSON.stringify(cell)}
gene  = ${JSON.stringify(gene)}

if gene not in genes:
    raise ValueError(f"Gene '{gene}' not in fdic['gene']")

idx = genes.index(gene)

stage(65, "Reading avg/cov …")
with gzip.open("/avg.npy.gz","rb") as f: avg = np.load(f)
with gzip.open("/cov.npy.gz","rb") as f: cov = np.load(f)

# 1-D, numeric, safe sizes
d1 = np.ravel(avg[:, idx]).astype('float64')
d2 = np.ravel(cov[:, idx]).astype('float64')
d2 = np.clip(np.nan_to_num(d2, nan=0.0, posinf=0.0, neginf=0.0), 0, None)

feat = fdic[cell]
n = len(feat)
if d1.shape[0] != n or d2.shape[0] != n:
    raise ValueError(f"Length mismatch: len(feat)={n}, d1={d1.shape}, d2={d2.shape}")

# single gene column
X = np.arange(n)
Y = np.zeros(n, dtype=float)

stage(75, "Making figure …")
fac  = 100.0
padx = 0.5
pady = 0.5

fig = plt.figure()
ax  = plt.gca()
scatt = ax.scatter(x=Y, y=X, s=d2 * fac, c=d1, cmap='OrRd',
                   edgecolor='black', linewidth=0.5)

ax.set_yticks(range(n))
ax.set_yticklabels(feat)
ax.set_xticks([0.0])
ax.set_xticklabels([gene])
plt.tick_params(axis='x', rotation=90)

plt.ylim(-pady, n-1+pady)
plt.xlim(-padx, 0+padx)

leg = ax.legend(*scatt.legend_elements("sizes", num=5),
                bbox_to_anchor=(1.05,1), title='express.\\nratio',
                loc='upper left')
try:
    leg.get_title().set_ha('center')
    leg.get_title().set_multialignment('center')
except Exception:
    pass

cbar = plt.colorbar(scatt, anchor=(0,0), location='top',
                    fraction=.12, aspect=5, label='mean',
                    orientation='horizontal', pad=0.01)
cbar.set_ticks([])
cbar.ax.tick_params(length=0, labelbottom=False, labeltop=False)

fig.set_size_inches(0.3, n/4.0)

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

  log("Flow → 1) boot → 2) (auto) load assets → 3) run plot");
})();
</script>

{% endraw %}
