---
title: Annotate Cells (Pyodide + Portable CellTypist Model)
author: Your Name
date: 2025-10-16
layout: post
---

{% raw %}

<h2>Annotate Cells from CSV/CSV.GZ (Pyodide, CellTypist-style logistic)</h2>
<p>
  Model is expected at <code>/assets/models/level1_model_portable.npz</code>.<br>
  Input must be cells × genes (1e4-normalized + <code>log1p</code>). Output is <code>pred.csv</code>.
</p>

<!-- Utility controls -->
<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px;">
  <button id="bootBtn" type="button">Boot environment</button>
  <button id="validateBtn" type="button">Validate assets</button>
</div>

<!-- Main flow -->
<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
  <!-- 1) Choose file -->
  <input type="file" id="csvInput" accept=".csv,.csv.gz,text/csv" />
  <!-- 2) Upload -->
  <button id="uploadBtn" type="button" disabled>Upload</button>
  <!-- 3) Run -->
  <button id="runBtn" type="button" disabled>Run analysis</button>
  <!-- 4) Download -->
  <button id="downloadBtn" type="button" disabled>Download</button>
</div>

<progress id="uploadProg" max="100" value="0" style="width:100%;margin-top:8px;"></progress>
<div id="speedLabel" style="font-size:12px;color:#888;margin-bottom:8px;">0 MB/s</div>
<progress id="procProg" max="100" value="0" style="width:100%;"></progress>

<details open style="margin-top:10px;">
  <summary><strong>Boot & run log</strong></summary>
  <pre id="log" style="background:#0a0f17;color:#e8eef7;padding:10px;border-radius:6px;overflow:auto;height:300px;white-space:pre-wrap;"></pre>
</details>

<script>
(function(){
  // --- Minimal DOM helpers ---
  function $(id){ return document.getElementById(id); }
  function log(msg){ try{ var el=$("log"); el.textContent += msg + "\\n"; el.scrollTop = el.scrollHeight; }catch(_){} }
  function setDisabled(id, v){ var el=$(id); if(el) el.disabled = !!v; }

  // --- State ---
  var pyodide=null, FS=null;
  var pyReady=false, libsReady=false, modelReady=false, uploaded=false;
  var csvFile=null, resultUrl=null;
  var MODEL_URL = "/assets/models/level1_model_portable.npz";

  // --- File reader with progress ---
  function readFileWithProgress(file, onProgress){
    return new Promise(function(resolve, reject){
      var reader = new FileReader(), last = performance.now(), lastLoaded = 0;
      reader.onprogress = function(e){
        try{
          if(e.lengthComputable){
            var pct = Math.round((e.loaded/e.total)*100);
            $("uploadProg").value = pct;
            var now = performance.now();
            var rate = (e.loaded-lastLoaded)/((now-last)/1000); // bytes/s
            $("speedLabel").textContent = (rate/1048576).toFixed(2) + " MB/s";
            last = now; lastLoaded = e.loaded;
          }
        }catch(err){ log("progress error: " + err); }
      };
      reader.onload = function(){ resolve(new Uint8Array(reader.result)); };
      reader.onerror = function(){ reject(reader.error || new Error("FileReader error")); };
      reader.readAsArrayBuffer(file);
    });
  }

  // --- Boot (Pyodide + numpy/pandas) ---
  async function bootEnv(){
    try{
      setDisabled("bootBtn", true);
      log("⏳ Boot: loading Pyodide…");
      const { loadPyodide } = await import("https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js");
      pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/" });
      FS = pyodide.FS;
      pyReady = true;
      log("✅ Pyodide " + pyodide.version + " loaded.");

      log("⏳ Boot: importing numpy/pandas/gzip…");
      await pyodide.runPythonAsync("import numpy as np, pandas as pd, gzip, io, json, os");
      libsReady = true;
      log("✅ Python libs imported.");
    }catch(err){
      log("❌ Boot failed: " + (err && err.message ? err.message : err));
    }finally{
      setDisabled("bootBtn", false);
      // Refresh run-button state
      setDisabled("runBtn", !(uploaded && modelReady));
    }
  }

  // --- Validate assets (model existence + size) ---
  async function validateAssets(){
    log("🔎 Validating model at " + MODEL_URL + " …");
    try{
      // Prefer HEAD, fall back to GET if HEAD blocked
      let resp = await fetch(MODEL_URL, { method: "HEAD", cache: "no-store" });
      if(!resp.ok){
        log("ℹ️ HEAD got " + resp.status + ", trying GET…");
        resp = await fetch(MODEL_URL, { cache: "no-store" });
      }
      if(!resp.ok){
        log("❌ Model fetch failed: HTTP " + resp.status);
        modelReady = false; setDisabled("runBtn", true);
        return;
      }
      const len = resp.headers.get("content-length");
      log("✅ Model reachable. " + (len ? ("Size: " + (Number(len)/1e6).toFixed(2) + " MB") : "Size unknown"));
      // If Pyodide is ready, also load it into FS for the run step
      if(pyReady){
        const buf = new Uint8Array(await resp.arrayBuffer());
        FS.writeFile("/tmp_model", buf);
        modelReady = true;
        log("✅ Model loaded into /tmp_model");
        setDisabled("runBtn", !uploaded);
      }else{
        log("ℹ️ Pyodide not booted yet; will load model into FS after boot.");
      }
    }catch(err){
      log("❌ Validate error: " + (err && err.message ? err.message : err));
      modelReady = false; setDisabled("runBtn", true);
    }
  }

  // --- Choose file -> enable Upload ---
  function onChooseFile(e){
    try{
      var f = e.target.files && e.target.files[0];
      if(f){
        log("📁 Selected: " + f.name);
        setDisabled("uploadBtn", false);
        // Reset downstream state
        uploaded = false;
        setDisabled("runBtn", true);
        setDisabled("downloadBtn", true);
        if(resultUrl){ URL.revokeObjectURL(resultUrl); resultUrl = null; }
      }else{
        setDisabled("uploadBtn", true);
      }
    }catch(err){ log("choose-file error: " + err); }
  }

  // --- Upload -> write to FS ---
  async function onUpload(){
    try{
      var input = $("csvInput");
      if(!input || !input.files || !input.files[0]){ alert("Choose a file first."); return; }
      if(!pyReady){ alert("Boot the environment first."); return; }
      var f = input.files[0];
      const bytes = await readFileWithProgress(f);
      csvFile = { name: f.name, bytes: bytes };
      FS.writeFile("/tmp_input", bytes);
      uploaded = true;
      log("📤 Upload OK → /tmp_input (" + (bytes.length/1e6).toFixed(2) + " MB)");
      setDisabled("runBtn", !modelReady);
      if(!modelReady) log("ℹ️ Model not loaded yet. Click ‘Validate assets’ or ‘Boot environment’ first.");
    }catch(err){
      log("❌ Upload failed: " + (err && err.message ? err.message : err));
    }
  }

  // --- Run analysis ---
  async function onRun(){
    if(!uploaded){ alert("Upload a CSV first."); return; }
    if(!modelReady){ alert("Validate/Load model first."); return; }
    if(!libsReady){ alert("Boot environment first."); return; }

    try{
      $("procProg").value = 5;
      log("▶️ Running annotation…");
      const code = `
import numpy as np, pandas as pd, gzip, json, os

def read_any(path):
    try:
        return pd.read_csv(gzip.open(path,'rt'), index_col=0)
    except Exception:
        return pd.read_csv(path, index_col=0)

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
cols_lower = {str(c).lower(): str(c) for c in X.columns.astype(str)}
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
      await pyodide.runPythonAsync(code);
      $("procProg").value = 100;
      const bytes = FS.readFile("/pred.csv");
      const blob  = new Blob([bytes], { type: "text/csv" });
      if(resultUrl){ URL.revokeObjectURL(resultUrl); }
      resultUrl = URL.createObjectURL(blob);
      setDisabled("downloadBtn", false);
      log("✅ pred.csv is ready.");
    }catch(err){
      log("❌ Run error: " + (err && err.message ? err.message : err));
    }
  }

  // --- Download ---
  function onDownload(){
    try{
      if(!resultUrl){ alert("No results yet."); return; }
      var a = document.createElement("a");
      a.href = resultUrl;
      a.download = "pred.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      log("⬇️ Download triggered.");
    }catch(err){
      log("download error: " + err);
    }
  }

  // --- Wire all handlers after DOM ready ---
  window.addEventListener("DOMContentLoaded", function(){
    $("csvInput").addEventListener("change", onChooseFile);
    $("uploadBtn").addEventListener("click", onUpload);
    $("runBtn").addEventListener("click", onRun);
    $("downloadBtn").addEventListener("click", onDownload);
    $("bootBtn").addEventListener("click", bootEnv);
    $("validateBtn").addEventListener("click", async function(){
      // load into FS if Pyodide is already up, otherwise just check reachability
      await validateAssets();
      // If model reached but Pyodide wasn’t booted, load it after boot too
      if(!pyReady) log("ℹ️ After Boot, press ‘Validate assets’ again to load into FS.");
    });

    log("Page loaded. 1) Boot environment → 2) Validate assets → 3) Choose file → 4) Upload → 5) Run → 6) Download");
  });
})();
</script>

{% endraw %}
