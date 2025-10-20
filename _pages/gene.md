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

  <button id="runBtn" type="button" disabled>2: run plot</button>
</div>

<div id="assetHint" style="font-size:12px;color:#666;margin:-6px 0 10px 0;">
  Assets load from <code id="assetBaseShow">/assets/data/expression_profile/</code>.
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
  // --- assets path ---
  const ASSET_BASE = "/assets/data/expression_profile/"; // trailing slash
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
  async function waitForLoadPyodide(timeout=20000){
    return new Promise((res, rej)=>{
      const t0=performance.now();
      (function check(){
        if(typeof globalThis.loadPyodide==="function") return res();
        if(performance.now()-t0>timeout) return rej(new Error("Timeout waiting for loadPyodide()"));
        setTimeout(check,100);
      })();
    });
  }
  async function fetchToFS(path, fsPath){
    const u = path + (path.includes("?") ? "" : "?t=" + Date.now()); // cache-bust
    const r = await fetch(u, { cache:"no-store" });
    if(!r.ok) throw new Error("HTTP " + r.status + " for " + path);
    const buf = new Uint8Array(await r.arrayBuffer());
    pyodide.FS.writeFile(fsPath, buf);
    return buf.length;
  }

  // --- state ---
  let pyodide=null, FS=null;
  let booted=false, pngURL=null;

  // --- boot ---
  $("bootBtn").addEventListener("click", async ()=>{
    try{
      setDisabled("bootBtn", true);
      log("⏳ Boot: waiting for pyodide.js …");
      await waitForLoadPyodide();

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
      setDisabled("runBtn", false);
    }catch(e){
      log("❌ Boot failed: " + (e?.message||e));
      setDisabled("bootBtn", false);
      return;
    }
    setDisabled("bootBtn", false);
  });

  // --- run plot (auto-fetches assets for the selected cell) ---
  $("runBtn").addEventListener("click", async ()=>{
    if(!booted){ alert("Boot first."); return; }

    const cell = $("cellSelect").value.trim();
    const gene = $("geneInput").value.trim();
    if(!gene){ alert("Enter a gene symbol."); return; }

    stage(10, "Fetching fdic.pkl …");
    try{
      const fdicSize = await fetchToFS(ASSET_BASE + "fdic.pkl", "/fdic.pkl");
      log(\`✅ fdic.pkl → /fdic.pkl (\${(fdicSize/1e6).toFixed(2)} MB)\`);
    }catch(e){
      stage(0, "Error");
      log("❌ Could not fetch fdic.pkl: " + (e?.message||e));
      return;
    }

    stage(25, \`Fetching \${cell} matrices …\`);
    try{
      const avgSize = await fetchToFS(ASSET_BASE + \`\${cell}_avg.npy.gz\`, "/avg.npy.gz");
      log(\`✅ \${cell}_avg.npy.gz → /avg.npy.gz (\${(avgSize/1e6).toFixed(2)} MB)\`);
      const covSize = await fetchToFS(ASSET_BASE + \`\${cell}_cov.npy.gz\`, "/cov.npy.gz");
      log(\`✅ \${cell}_cov.npy.gz → /cov.npy.gz (\${(covSize/1e6).toFixed(2)} MB)\`);
    }catch(e){
      stage(0, "Error");
      log("❌ Could not fetch avg/cov: " + (e?.message||e));
      return;
    }

    stage(40, "Plotting …");
    log(\`▶️ Plot: cell=\${cell}, gene=\${gene}\`);

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
cell  = ${JSON.stringify("".concat("${cell}"))}
gene  = ${JSON.stringify("".concat("${gene}"))}

if gene not in genes:
    raise ValueError(f"Gene '{gene}' not in fdic['gene']")

idx = genes.index(gene)

stage(65, "Reading avg/cov …")
with gzip.open("/avg.npy.gz","rb") as f: avg = np.load(f)
with gzip.open("/cov.npy.gz","rb") as f: cov = np.load(f)

d1 = avg[:, idx]    # mean
d2 = cov[:, idx]    # variance proxy

feat = fdic[cell]

mlist = [gene]
X = np.repeat(range(len(feat)), len(mlist)).reshape(-1,len(mlist)).T.flatten()
Y = np.repeat(range(len(mlist)), len(feat)).reshape(-1,len(feat)).flatten()

stage(75, "Making figure …")
fac  = 100.0
padx = 0.5
pady = 0.5

fig = plt.figure()
ax  = plt.gca()
scatt = ax.scatter(x=Y, y=X, s=d2 * fac, c=d1, cmap='OrRd',
                   edgecolor='black', linewidth=0.5)

ax.set_yticks(range(len(feat)))
ax.set_yticklabels(feat)
ax.set_xticks(range(len(mlist)))
ax.set_xticklabels(mlist)
plt.tick_params(axis='x', rotation=90)

plt.ylim(-pady, len(feat)-1+pady)
plt.xlim(-padx, len(mlist)-1+padx)

# legend for sizes
leg = ax.legend(*scatt.legend_elements("sizes", num=5),
                bbox_to_anchor=(1.05,1), title='express.\\nratio',
                loc='upper left')
# center legend title (if multiline)
try:
    leg.get_title().set_ha('center')
    leg.get_title().set_multialignment('center')
except Exception:
    pass

# colorbar top, no ticks
cbar = plt.colorbar(scatt, anchor=(0,0), location='top',
                    fraction=.12, aspect=5, label='mean',
                    orientation='horizontal', pad=0.01)
cbar.set_ticks([])
cbar.ax.tick_params(length=0, labelbottom=False, labeltop=False)

# figure size like your code
fig.set_size_inches(0.3, len(feat)/4.0)

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

  log("Flow → 1) boot → 2) run plot (assets are fetched automatically for the selected cell)");
})();
</script>

{% endraw %}
