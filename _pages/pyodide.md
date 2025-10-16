---
title: Annotate Cells from CSV (Pyodide)
author: Tao He
date: 2025-10-16
category: Jekyll
layout: post
---

{% raw %}

<h2>Annotate Cells from CSV (Pyodide, no Scanpy/CellTypist)</h2>
<p>
  Input <code>sample.csv</code>: a cell × gene expression matrix (1e4‑normalized + log1p).<br>
  Output <code>pred.csv</code>: <code>cell_id, predicted_label, conf_score, cert_score</code>.<br>
  Runs entirely in browser (Pyodide, client‑side) — no Scanpy or CellTypist needed.
</p>

<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
  <input type="file" id="csvInput" accept=".csv,text/csv" />
  <input type="file" id="refInput" accept=".csv,text/csv" />
  <button id="initBtn">Initialize Pyodide</button>
  <button id="inspectBtn" disabled>Inspect CSV</button>
  <button id="runBtn" disabled>Run Annotation</button>
  <a id="downloadLink" download="pred.csv" style="display:none">Download pred.csv</a>
</div>

<progress id="uploadProg" max="100" value="0" style="width:100%;margin-top:8px;"></progress>
<div id="speedLabel" style="font-size:12px;color:#888;margin-bottom:8px;">0 MB/s</div>
<progress id="procProg" max="100" value="0" style="width:100%;"></progress>
<pre id="log" style="background:#0a0f17;color:#e8eef7;padding:10px;border-radius:6px;overflow:auto;height:220px;white-space:pre-wrap;"></pre>

<script>
const $ = (id)=>document.getElementById(id);
const log = (m)=>{const el=$("log");el.textContent+=(m+"\n");el.scrollTop=el.scrollHeight;};
let pyodide,FS,csvFile,refFile,pyReady=false;

function readFileWithProgress(file,onProgress){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    const start=performance.now();let last=start,lastLoaded=0;
    reader.onprogress=(e)=>{
      if(e.lengthComputable){
        const pct=Math.round((e.loaded/e.total)*100);
        onProgress(pct,e.loaded,e.total,(e.loaded-lastLoaded)/((performance.now()-last)/1000));
        last=performance.now();lastLoaded=e.loaded;
      }
    };
    reader.onload=()=>resolve(new Uint8Array(reader.result));
    reader.onerror=()=>reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

$("csvInput").addEventListener('change',async(e)=>{
  const f=e.target.files[0];if(!f)return;
  const bytes=await readFileWithProgress(f,(pct,loaded,total,rate)=>{
    $("uploadProg").value=pct;$("speedLabel").textContent=`${(rate/1048576).toFixed(2)} MB/s`;
  });
  csvFile={name:f.name,bytes};
  log(`Loaded ${f.name} (${(bytes.length/1e6).toFixed(2)} MB)`);
  $("inspectBtn").disabled=pyReady;$("runBtn").disabled=pyReady;
});

$("refInput").addEventListener('change',async(e)=>{
  const f=e.target.files[0];if(!f)return;const bytes=await readFileWithProgress(f,()=>{});
  refFile={name:f.name,bytes};log(`Loaded reference ${f.name}`);
});

$("initBtn").addEventListener('click',async()=>{
  if(pyReady)return;$("initBtn").disabled=true;log('Loading Pyodide…');
  import("https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js").then(async({loadPyodide})=>{
    pyodide=await loadPyodide({indexURL:"https://cdn.jsdelivr.net/pyodide/v0.26.3/full/"});FS=pyodide.FS;
    log(`Pyodide ${pyodide.version} ready.`);
    await pyodide.runPythonAsync(`import numpy as np, pandas as pd`);
    pyReady=true;$("inspectBtn").disabled=!csvFile;$("runBtn").disabled=!csvFile;
  });
});

$("inspectBtn").addEventListener('click',async()=>{
  FS.writeFile('/tmp.csv',csvFile.bytes);
  const code=`import pandas as pd\ndf=pd.read_csv('/tmp.csv',index_col=0)\nprint('shape',df.shape)`;
  const out=await pyodide.runPythonAsync(code);log(out);
});

$("runBtn").addEventListener('click',async()=>{
  $("procProg").value=5;FS.writeFile('/tmp.csv',csvFile.bytes);
  if(refFile)FS.writeFile('/ref.csv',refFile.bytes);
  const py=`
import numpy as np,pandas as pd
X=pd.read_csv('/tmp.csv',index_col=0)
if ${Boolean(!!refFile)}:
  ref=pd.read_csv('/ref.csv',index_col=0)
  genes_lower=[g.lower() for g in X.columns]
  ref.index=[g.lower() for g in ref.index]
  common=set(genes_lower).intersection(ref.index)
  ref=ref.loc[list(common)]
  X=X[[c for c in X.columns if c.lower() in common]]
  A=X.values;C=ref.values
  A/=np.linalg.norm(A,axis=1,keepdims=True)+1e-8
  C/=np.linalg.norm(C,axis=0,keepdims=True)+1e-8
  sims=A@C
  idx=np.argmax(sims,axis=1)
  ct=ref.columns
  pred=[ct[i] for i in idx]
  conf=sims[np.arange(sims.shape[0]),idx]
  out=pd.DataFrame({'cell_id':X.index,'predicted_label':pred,'conf_score':conf})
else:
  markers={'T_cells_NK':['CD3D','CD3E','TRAC','NKG7'], 'B_cells':['MS4A1','CD79A','CD74']}
  scores=[];names=[]
  for k,glist in markers.items():
    found=[c for c in glist if c in X.columns]
    s=X[found].mean(axis=1) if found else np.full((X.shape[0],),-10)
    scores.append(s);names.append(k)
  S=np.vstack(scores).T
  idx=np.argmax(S,axis=1)
  pred=[names[i] for i in idx]
  conf=S[np.arange(S.shape[0]),idx]
  out=pd.DataFrame({'cell_id':X.index,'predicted_label':pred,'conf_score':conf})
out.to_csv('/pred.csv',index=False)`;
  await pyodide.runPythonAsync(py);
  $("procProg").value=100;
  const bytes=FS.readFile('/pred.csv');
  const blob=new Blob([bytes],{type:'text/csv'});
  $("downloadLink").href=URL.createObjectURL(blob);
  $("downloadLink").style.display='inline';
  log('Done: pred.csv ready.');
});
</script>

{% endraw %}
