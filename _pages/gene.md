---
title: gene plot
author: S. Kim
date: 2025-10-16
layout: post
excerpt: ""
---

{% raw %}

<!-- Pyodide -->
<script defer src="https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js"></script>

<div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0;">
  <label>Cell:
    <select id="cellSelect" style="min-width:180px;">
      <option>Whole</option>
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
    <input id="geneInput" type="text" list="geneList" placeholder="Type to search…" style="min-width:220px;">
    <datalist id="geneList"></datalist>
  </label>

  <button id="runBtn" type="button" disabled>Run plot</button>
</div>

<div id="geneErr" style="display:none;font-size:12px;color:#b91c1c;margin:-6px 0 10px 0;"></div>

<!-- Progress -->
<div style="margin:8px 0 4px 0; font-size:13px; color:#555;">Status</div>
<progress id="procProg" max="100" value="0" style="width:100%;"></progress>
<div id="procStatus" style="font-size:12px;color:#777;margin:4px 0 8px 0;">Booting…</div>

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
  // --- fixed asset base ---
  const ASSET_BASE = "/assets/data/expression_profile/"; // trailing slash included

  // --- helpers ---
  const $ = (id)=>document.getElementById(id);
  function log(msg){
    const el = $("log"); el.textContent += msg + "\n";
    const lines = el.textContent.split("\n");
    if(lines.length>400) el.textContent = lines.slice(-400).join("\n");
    el.scrollTop = el.scrollHeight;
  }
  function stage(pct, msg){ $("procProg").value = pct; $("procStatus").textContent = msg; }
  async function waitFor(fnName, t=30000){
    const t0=performance.now();
    return new Promise((res, rej)=>{
      (function check(){
        if(typeof globalThis[fnName]==="function") return res();
        if(performance.now()-t0>t) return rej(new Error("Timeout waiting for "+fnName));
        setTimeout(check,100);
      })();
    });
  }
  async function fetchToFS(url, fsPath){
    const r = await fetch(url + (url.includes("?") ? "" : "?t="+Date.now()), { cache:"no-store" });
    if(!r.ok) throw new Error("HTTP " + r.status + " for " + url);
    const buf = new Uint8Array(await r.arrayBuffer());
    pyodide.FS.writeFile(fsPath, buf);
    return buf.length;
  }
  function showGeneError(msg){ const e=$("geneErr"); e.textContent=msg; e.style.display="block"; }
  function clearGeneError(){ const e=$("geneErr"); e.textContent=""; e.style.display="none"; }

  // --- state ---
  let pyodide=null, FS=null;
  let genesList=[], fdicLoaded=false, booted=false, pngURL=null;

  // gene datalist: render up to 200 matches for speed
  function updateGeneDatalist(prefix){
    const dl = $("geneList"); dl.innerHTML = "";
    if(!genesList.length) return;
    const cap = 200;
    if(!prefix){
      for(let i=0;i<Math.min(cap, genesList.length);i++){
        const opt = document.createElement("option"); opt.value = genesList[i]; dl.appendChild(opt);
      }
      return;
    }
    const p = prefix.toLowerCase();
    let n=0;
    for(const g of genesList){
      if(g.toLowerCase().includes(p)){
        const opt = document.createElement("option"); opt.value = g; dl.appendChild(opt);
        if(++n>=cap) break;
      }
    }
  }
  $("geneInput").addEventListener("input", (e)=>{ clearGeneError(); updateGeneDatalist(e.target.value.trim()); });

  // --- auto boot ---
  (async function autoBoot(){
    try{
      stage(2, "Waiting for Pyodide…");
      await waitFor("loadPyodide", 30000);
      log("⏳ Initializing Pyodide…");
      pyodide = await globalThis.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/" });
      FS = pyodide.FS;
      log("✅ Pyodide " + pyodide.version + " loaded.");
      stage(10, "Loading numpy/pandas/matplotlib…");
      await pyodide.loadPackage(["numpy","pandas","matplotlib"]);
      log("✅ Packages loaded.");
      stage(15, "Importing Python libs…");
      await pyodide.runPythonAsync(`
import sys, io, os, gzip
import numpy as np, pandas as pd
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt
      `);
      log("✅ Python ready.");
      booted = true;

      // Load fdic.pkl and gene list
      stage(20, "Fetching fdic.pkl …");
      const fdSz = await fetchToFS(ASSET_BASE + "fdic.pkl", "/fdic.pkl");
      log(\`✅ fdic.pkl → /fdic.pkl (\${(fdSz/1e6).toFixed(2)} MB)\`);

      stage(35, "Parsing gene list …");
      const result = await pyodide.runPythonAsync(`
import pickle as pkl
with open("/fdic.pkl","rb") as fh:
    _fd = pkl.load(fh)
genes = list(_fd["gene"])
(genes[:5000], len(genes))
      `);
      const genesPreview = result[0];
      const totalGenes   = result[1];
      genesList = Array.isArray(genesPreview) ? genesPreview : [];
      updateGeneDatalist("");
      log(\`ℹ️ Loaded \${totalGenes} genes (showing up to 5000 for autocomplete).\`);
      fdicLoaded = true;

      $("runBtn").disabled = false;
      stage(45, "Ready.");
    }catch(err){
      $("runBtn").disabled = true;
      fdicLoaded = false;
      stage(0, "Error");
      log("❌ Boot error: " + (err?.message||err));
      if(/HTTP 404/i.test(err?.message||"")){
        log("ℹ️ Check that files exist under /assets/data/expression_profile/ (path is case-sensitive).");
      }
    }
  })();

  // --- Run plot ---
  $("runBtn").addEventListener("click", async ()=>{
    if(!booted || !fdicLoaded){ return; }
    clearGeneError();

    const cell = $("cellSelect").value.trim();
    const gene = $("geneInput").value.trim();
    if(!gene){ showGeneError("Please enter a gene symbol."); return; }

    const unhookOut = pyodide.setStdout({ batched: (s)=>{
      (s||"").split(/\r?\n/).forEach(line=>{
        if(!line) return;
        if(line.startsWith("__STAGE__:")){
          const p = line.split(":"); const pct = parseInt(p[1]||"50",10); const msg = p.slice(2).join(":")||"Working…";
          stage(pct, msg);
        } else { log(line); }
      });
    }});
    const unhookErr = pyodide.setStderr({ batched: (s)=>{ s && s.trim() && log("ERR: " + s); } });

    try{
      stage(50, `Fetching ${cell} matrices …`);
      const avgSize = await fetchToFS(ASSET_BASE + `${cell}_avg.npy.gz`, "/avg.npy.gz");
      const covSize = await fetchToFS(ASSET_BASE + `${cell}_cov.npy.gz`, "/cov.npy.gz");
      log(`✅ ${cell}_avg.npy.gz → /avg.npy.gz (${(avgSize/1e6).toFixed(2)} MB)`);
      log(`✅ ${cell}_cov.npy.gz → /cov.npy.gz (${(covSize/1e6).toFixed(2)} MB)`);

      stage(58, "Plotting …");
      const code = `
import os, io, gzip, pickle as pkl
import numpy as np, pandas as pd
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt
def stage(pct,msg): print(f"__STAGE__:{pct}:{msg}")

cell = ${JSON.stringify(cell)}
gene = ${JSON.stringify(gene)}

plt.rcParams['figure.dpi'] = 150

stage(60, "Reading fdic …")
with open("/fdic.pkl","rb") as f: fdic = pkl.load(f)

genes = fdic['gene']
if gene not in genes:
    raise ValueError(f"The gene '{gene}' is not in our gene list. Please choose a valid gene.")

idx = genes.index(gene)

stage(70, "Reading avg/cov …")
with gzip.open("/avg.npy.gz","rb") as f: avg = np.load(f)
with gzip.open("/cov.npy.gz","rb") as f: cov = np.load(f)

d1 = avg[:, idx]    # mean
d2 = cov[:, idx]    # variance proxy

feat = fdic[cell]
mlist = [gene]

X = np.repeat(range(len(feat)), len(mlist)).reshape(-1,len(mlist)).T.flatten()
Y = np.repeat(range(len(mlist)), len(feat)).reshape(-1,len(feat)).flatten()

fac  = 100.0
padx = 0.5
pady = 0.5

fig = plt.figure()
ax  = plt.gca()
scatt = ax.scatter(x=Y, y=X, s=d2 * fac, c=d1, cmap='OrRd',
                   edgecolor='black', linewidth=0.5)

ax.set_yticks(range(len(feat))); ax.set_yticklabels(feat)
ax.set_xticks(range(len(mlist))); ax.set_xticklabels(mlist)
plt.tick_params(axis='x', rotation=90)
plt.ylim(-pady, len(feat)-1+pady); plt.xlim(-padx, len(mlist)-1+padx)

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

fig.set_size_inches(0.3, len(feat)/4.0)

buf = io.BytesIO()
plt.savefig(buf, format="png", bbox_inches="tight", dpi=150)
plt.close(fig)
open("/plot.png","wb").write(buf.getbuffer())
"OK"
      `;
      await pyodide.runPythonAsync(code);

      stage(100, "Done");
      const bytes = pyodide.FS.readFile("/plot.png");
      const blob  = new Blob([bytes], { type: "image/png" });
      if(pngURL) URL.revokeObjectURL(pngURL);
      pngURL = URL.createObjectURL(blob);
      $("plotImg").src = pngURL;
      $("imgWrap").style.display = "block";
      $("downloadPNG").href = pngURL;
      log("✅ Plot ready.");
    }catch(e){
      const msg = (e?.message||String(e));
      stage(0, "Error");
      log("❌ Run error: " + msg);
      if(/not in our gene list/i.test(msg)){
        showGeneError("The gene you entered is not on our gene list.");
      }
      if(/HTTP 404/i.test(msg)){
        log("ℹ️ Check filenames for the selected cell in /assets/data/expression_profile/ (case-sensitive).");
      }
      $("imgWrap").style.display = "none";
    }finally{
      try{ unhookOut && unhookOut(); }catch(_){}
      try{ unhookErr && unhookErr(); }catch(_){}
    }
  });

})();
</script>

{% endraw %}
