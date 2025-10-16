---
title: Annotate Cells in the Browser (Pyodide + Fixed Portable Model)
author: Your Name
date: 2025-10-16
category: Jekyll
layout: post
---

{% raw %}

<h2>Annotate Cells from CSV/CSV.GZ (Pyodide, CellTypist-style logistic)</h2>
<p>
  Input: <code>sample.csv</code> or <code>sample.csv.gz</code> (cells × genes; already 1e4-normalized + <code>log1p</code>).<br>
  Output: <code>pred.csv</code> with <code>cell_id, predicted_label, conf_score, cert_score</code>.<br>
  The logistic model is auto-loaded from <code>/assets/models/level1_model_portable.npz</code>.
</p>

<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
  <input type="file" id="csvInput" accept=".csv,.csv.gz,text/csv" />
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
const $  = (id) => document.getElementById(id);
const log = (m) => { const el = $("log"); el.textContent += (m + "\n"); el.scrollTop = el.scrollHeight; };

let pyodide, FS, csvFile, pyReady=false, modelReady=false;

// read file with progress/speed display
function readFileWithProgress(file,onProgress){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader(); let last=performance.now(), lastLoaded=0;
    reader.onprogress=(e)=>{
      if(e.lengthComputable){
        const pct=Math.round((e.loaded/e.total)*100);
        onProgress?.(pct,e.loaded,e.total,(e.loaded-lastLoaded)/((performance.now()-last)/1000));
        last=performance.now(); lastLoaded=e.loaded;
      }
    };
    reader.onload=()=>resolve(new Uint8Array(reader.result));
    reader.onerror=()=>reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

$("csvInput").addEventListener('change',async(e)=>{
  const f=e.target.files[0]; if(!f) return;
  const bytes=await readFileWithProgress(f,(pct,_,__,rate)=>{
    $("uploadProg").value=pct; $("speedLabel").textContent=`${(rate/1048576).toFixed(2)} MB/s`;
  });
  csvFile={name:f.name,bytes};
  log(`Loaded ${f.name} (${(bytes.length/1e6).toFixed(2)} MB)`);
  $("inspectBtn").disabled=!pyReady; $("runBtn").disabled=!pyReady || !modelReady;
});

$("initBtn").addEventListener('click', async () => {
  if (pyReady) return; $("initBtn").disabled = true; log("Loading Pyodide…");
  const { loadPyodide } = await import("https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js");
  pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/" });
  FS = pyodide.FS; log(`Pyodide ${pyodide.version} ready.`);
  await pyodide.runPythonAsync(`import numpy as np, pandas as pd, gzip, io, json, os`);
  pyReady = true;
  $("inspectBtn").disabled = !csvFile;
  // Auto-load model (required)
  try {
    const url = "/assets/models/level1_model_portable.npz";
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = new Uint8Array(await resp.arrayBuffer());
    FS.writeFile("/tmp_model", buf);
    modelReady = true;
    log("Loaded model from /assets/models/level1_model_portable.npz");
  } catch (e) {
    modelReady = false;
    log("❌ Could not load required model from /assets/models/level1_model_portable.npz");
    alert("Model file missing: /assets/models/level1_model_portable.npz");
  }
  $("runBtn").disabled = !csvFile || !modelReady;
});

$("inspectBtn").addEventListener('click', async ()=>{
  if(!csvFile) return;
  FS.writeFile('/tmp_input', csvFile.bytes);
  const code = `
import pandas as pd, gzip
try:
    df = pd.read_csv(gzip.open('/tmp_input','rt'), index_col=0)
except Exception:
    df = pd.read_csv('/tmp_input', index_col=0)
print('shape', df.shape)
`;
  const out = await pyodide.runPythonAsync(code);
  log(out);
});

$("runBtn").addEventListener('click', async ()=>{
  if(!csvFile){ alert("Select a CSV first."); return; }
  if(!modelReady){ alert("Model not loaded. Check /assets/models/level1_model_portable.npz"); return; }
  $("procProg").value = 5;
  FS.writeFile('/tmp_input', csvFile.bytes);

  const py = `
import numpy as np, pandas as pd, gzip, json, os

def read_any(path):
    try: return pd.read_csv(gzip.open(path,'rt'), index_col=0)
    except Exception: return pd.read_csv(path, index_col=0)

# Load input
X = read_any('/tmp_input')

# Load model (NPZ required)
_npz = np.load('/tmp_model', allow_pickle=True)
loaded = {
    'coef_': _npz['coef_'],
    'intercept_': _npz['intercept_'],
    'classes_': _npz['classes_'],
    'features': _npz['features'] if 'features' in _npz.files else _npz['features_'],
    'scaler_mean_': _npz['scaler_mean_'],
    'scaler_scale_': _npz['scaler_scale_'],
    'with_mean': bool(_npz['with_mean'].flat[0]) if _npz['with_mean'].size else True,
}

# Intersect (case-insensitive) and reorder to model feature order
feat_lower = np.char.lower(loaded['features'].astype(str))
cols_lower = {c.lower(): c for c in X.columns.astype(str)}
present = [cols_lower[g] for g in feat_lower if g in cols_lower]
if len(present) == 0:
    raise ValueError('No overlapping features between input and model.')
ordered_cols, keep_mask = [], []
for g in feat_lower:
    if g in cols_lower:
        ordered_cols.append(cols_lower[g]); keep_mask.append(True)
    else:
        keep_mask.append(False)

coef_keep  = loaded['coef_'][:, keep_mask]
mean_keep  = loaded['scaler_mean_'][keep_mask]
scale_keep = loaded['scaler_scale_'][keep_mask]

X2 = X[ordered_cols].values.astype('float32')

# CellTypist-style scaling
if loaded['with_mean']:
    X2 = (X2 - mean_keep) / (scale_keep + 1e-8)
else:
    X2 = X2 / (scale_keep + 1e-8)

# Stability clip (CellTypist does similar)
X2[X2 > 10] = 10

# Logistic inference
logits = X2 @ coef_keep.T + loaded['intercept_']
if logits.ndim == 1:
    logits = np.column_stack([-logits, logits])

z = logits - logits.max(axis=1, keepdims=True)
e = np.exp(z); P = e / e.sum(axis=1, keepdims=True)
idx = np.argmax(P, axis=1)
labels = loaded['classes_'][idx]
top = P[np.arange(P.shape[0]), idx]
part = np.partition(P, -2, axis=1)[:, -2:]
cert = part[:,1] - part[:,0]

out = pd.DataFrame({'cell_id': X.index, 'predicted_label': labels, 'conf_score': top, 'cert_score': cert})
out.to_csv('/pred.csv', index=False)
`;
  try {
    await pyodide.runPythonAsync(py);
    $("procProg").value = 100;
    const bytes = FS.readFile('/pred.csv');
    const blob  = new Blob([bytes], { type: 'text/csv' });
    const url   = URL.createObjectURL(blob);
    $("downloadLink").href = url;
    $("downloadLink").style.display = 'inline';
    log("✅ Done: pred.csv ready.");
  } catch (err) {
    log("ERROR: " + (err?.message || String(err)));
  }
});
</script>

{% endraw %}
