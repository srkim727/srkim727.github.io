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
  Input: <code>sample.csv</code> or <code>sample.csv.gz</code> (cells × genes; 1e4-normalized + <code>log1p</code>).<br>
  Model is automatically loaded from <code>/assets/models/level1_model_portable.npz</code>.<br>
  Output: <code>pred.csv</code> with <code>cell_id, predicted_label, conf_score, cert_score</code>.
</p>

<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
  <!-- 1) Choose File -->
  <input type="file" id="csvInput" accept=".csv,.csv.gz,text/csv" />
  <!-- 2) Upload -->
  <button id="uploadBtn" type="button" disabled>Upload</button>
  <!-- 3) Run -->
  <button id="runBtn" type="button" disabled>Run Analysis</button>
  <!-- 4) Download -->
  <a id="downloadLink" download="pred.csv" style="display:none">
    <button type="button">Download Results</button>
  </a>
</div>

<progress id="uploadProg" max="100" value="0" style="width:100%;margin-top:8px;"></progress>
<div id="speedLabel" style="font-size:12px;color:#888;margin-bottom:8px;">0 MB/s</div>
<progress id="procProg" max="100" value="0" style="width:100%;"></progress>
<pre id="log" style="background:#0a0f17;color:#e8eef7;padding:10px;border-radius:6px;overflow:auto;height:260px;white-space:pre-wrap;"></pre>

<script>
(function(){
  const $  = (id) => document.getElementById(id);
  const log = (m) => { const el = $("log"); el.textContent += (m + "\\n"); el.scrollTop = el.scrollHeight; };

  let pyodide, FS, csvFile;
  let pyReady=false, modelReady=false, uploaded=false;

  function enableUploadButtonIfFilePresent(){
    const hasFile = $("csvInput")?.files?.length > 0;
    $("uploadBtn").disabled = !hasFile;
    log(hasFile ? "✔️ File selected. Upload enabled." : "ℹ️ No file selected yet.");
  }

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

  async function initPyodideAndModel(){
    try {
      log("⏳ Loading Pyodide…");
      const { loadPyodide } = await import("https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js");
      pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/" });
      FS = pyodide.FS;
      await pyodide.runPythonAsync(`import numpy as np, pandas as pd, gzip, io, json, os`);
      pyReady = true;
      log(`✅ Pyodide ${pyodide.version} ready.`);
    } catch (e) {
      log("❌ Failed to initialize Pyodide: " + (e?.message || e));
      return;
    }

    try {
      const resp = await fetch("/assets/models/level1_model_portable.npz", { cache: "no-store" });
      if (!resp.ok) throw new Error(\`HTTP \${resp.status}\`);
      const buf = new Uint8Array(await resp.arrayBuffer());
      FS.writeFile("/tmp_model", buf);
      modelReady = true;
      log("✅ Loaded model from /assets/models/level1_model_portable.npz");
    } catch (e) {
      modelReady = false;
      log("❌ Model missing at /assets/models/level1_model_portable.npz (required).");
    }

    // Enable Run button only when uploaded and model are ready
    $("runBtn").disabled = !(uploaded && modelReady);

    // If a file was already chosen before init finished, keep Upload enabled
    enableUploadButtonIfFilePresent();
  }

  // Wait until DOM is fully ready before attaching listeners
  window.addEventListener("DOMContentLoaded", () => {
    // Attach both 'change' and 'input' to be extra safe across browsers
    $("csvInput").addEventListener("change", async (e)=>{
      const f = e.target.files[0];
      if(!f){ enableUploadButtonIfFilePresent(); return; }
      // We only read (upload) when user clicks Upload; here we just enable the button.
      enableUploadButtonIfFilePresent();
      log(`📁 Selected ${f.name}`);
    });

    $("csvInput").addEventListener("input", enableUploadButtonIfFilePresent);

    // Upload: actually read the file and write to FS
    $("uploadBtn").addEventListener("click", async ()=>{
      const f = $("csvInput").files?.[0];
      if(!f){ alert("Please choose a file first."); return; }
      if(!pyReady){ alert("Pyodide not ready yet."); return; }
      try {
        const bytes = await readFileWithProgress(f,(pct,_,__,rate)=>{
          $("uploadProg").value=pct; $("speedLabel").textContent=`${(rate/1048576).toFixed(2)} MB/s`;
        });
        csvFile = { name: f.name, bytes };
        FS.writeFile('/tmp_input', bytes);
        uploaded = true;
        log(`📤 Upload successful: ${f.name} → /tmp_input (${(bytes.length/1e6).toFixed(2)} MB)`);
        $("runBtn").disabled = !modelReady;
        if(!modelReady){
          log("ℹ️ Waiting for model… Run will enable when model loads.");
        }
      } catch (err) {
        log("❌ Upload failed: " + (err?.message || err));
      }
    });

    // Run analysis
    $("runBtn").addEventListener("click", async ()=>{
      if(!uploaded){ alert("Please upload a CSV first."); return; }
      if(!modelReady){ alert("Model not loaded."); return; }

      $("procProg").value = 5;
      log("▶️ Running annotation…");

      const py = `
import numpy as np, pandas as pd, gzip, json, os
def read_any(path):
    try: return pd.read_csv(gzip.open(path,'rt'), index_col=0)
    except Exception: return pd.read_csv(path, index_col=0)

X = read_any('/tmp_input')
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

if loaded['with_mean']:
    X2 = (X2 - mean_keep) / (scale_keep + 1e-8)
else:
    X2 = X2 / (scale_keep + 1e-8)

X2[X2 > 10] = 10
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
print('DONE', X.shape, len(loaded['classes_']))
`;
      try {
        await pyodide.runPythonAsync(py);
        $("procProg").value = 100;
        const bytes = FS.readFile('/pred.csv');
        const blob  = new Blob([bytes], { type: 'text/csv' });
        const url   = URL.createObjectURL(blob);
        $("downloadLink").href = url;
        $("downloadLink").style.display = 'inline';
        log("✅ Done: pred.csv ready. Click 'Download Results' to save.");
      } catch (err) {
        log("❌ ERROR: " + (err?.message || err));
      }
    });

    // Initial state check (in case browser pre-fills the file input)
    enableUploadButtonIfFilePresent();

    // Initialize Pyodide & model after listeners are wired
    initPyodideAndModel();
  });
})();
</script>

{% endraw %}
