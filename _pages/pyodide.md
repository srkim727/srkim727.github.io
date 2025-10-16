---
title: Annotate Cells (Pyodide + Fixed Portable Model)
author: Your Name
date: 2025-10-16
category: Jekyll
layout: post
---

{% raw %}

<h2>Annotate Cells from CSV/CSV.GZ (Pyodide, CellTypist-style logistic)</h2>
<p>
  Input: <code>sample.csv</code> or <code>sample.csv.gz</code> (cells × genes; 1e4-normalized + <code>log1p</code>).<br>
  Model: <code>/assets/models/level1_model_portable.npz</code> (auto-loaded).<br>
  Output: <code>pred.csv</code> (<code>cell_id, predicted_label, conf_score, cert_score</code>).
</p>

<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
  <!-- 1) Choose File -->
  <input type="file" id="csvInput" accept=".csv,.csv.gz,text/csv" />
  <!-- 2) Upload -->
  <button id="uploadBtn" type="button" disabled>Upload</button>
  <!-- 3) Run -->
  <button id="runBtn" type="button" disabled>Run Analysis</button>
  <!-- 4) Download -->
  <button id="downloadBtn" type="button" disabled>Download</button>
</div>

<progress id="uploadProg" max="100" value="0" style="width:100%;margin-top:8px;"></progress>
<div id="speedLabel" style="font-size:12px;color:#888;margin-bottom:8px;">0 MB/s</div>
<progress id="procProg" max="100" value="0" style="width:100%;"></progress>

<pre id="log" style="background:#0a0f17;color:#e8eef7;padding:10px;border-radius:6px;overflow:auto;height:260px;white-space:pre-wrap;"></pre>

<script>
(function(){
  function $(id){ return document.getElementById(id); }
  function log(msg){ try { var el = $("log"); el.textContent += msg + "\\n"; el.scrollTop = el.scrollHeight; } catch(_){} }

  var pyodide=null, FS=null;
  var csvFile=null;
  var pyReady=false, modelReady=false, uploaded=false, resultUrl=null;

  // --- Helpers ---
  function setDisabled(id, val){ var el=$(id); if(el){ el.disabled = !!val; } }
  function readFileWithProgress(file, onProgress){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      var last = performance.now(), lastLoaded = 0;
      reader.onprogress = function(e){
        try {
          if (e.lengthComputable){
            var pct = Math.round((e.loaded/e.total)*100);
            var now = performance.now();
            var rate = (e.loaded - lastLoaded)/((now - last)/1000);
            $("uploadProg").value = pct;
            $("speedLabel").textContent = (rate/1048576).toFixed(2) + " MB/s";
            last = now; lastLoaded = e.loaded;
          }
        } catch(err){ log("onprogress err: " + err); }
      };
      reader.onload = function(){ resolve(new Uint8Array(reader.result)); };
      reader.onerror = function(){ reject(reader.error || new Error("FileReader error")); };
      reader.readAsArrayBuffer(file);
    });
  }

  // --- Wire UI after DOM ready ---
  window.addEventListener("DOMContentLoaded", function(){
    log("DOM ready.");

    // Choose file -> enable Upload
    $("csvInput").addEventListener("change", function(e){
      try {
        var f = e.target.files && e.target.files[0];
        if (f){
          log("📁 Selected: " + f.name);
          setDisabled("uploadBtn", false);
          // clear previous results state
          uploaded=false; setDisabled("runBtn", true);
          setDisabled("downloadBtn", true); if(resultUrl){ URL.revokeObjectURL(resultUrl); resultUrl=null; }
        } else {
          log("No file selected.");
          setDisabled("uploadBtn", true);
        }
      } catch(err){ log("csvInput change err: " + err); }
    });

    // Upload -> write to FS
    $("uploadBtn").addEventListener("click", function(){
      try {
        var input = $("csvInput");
        if (!input || !input.files || !input.files[0]){ alert("Choose a file first."); return; }
        if (!pyReady){ alert("Pyodide not ready yet."); return; }

        var f = input.files[0];
        readFileWithProgress(f, null).then(function(bytes){
          csvFile = { name: f.name, bytes: bytes };
          FS.writeFile("/tmp_input", bytes);
          uploaded = true;
          log("📤 Upload OK -> /tmp_input  (" + (bytes.length/1e6).toFixed(2) + " MB)");
          setDisabled("runBtn", !modelReady);
          if(!modelReady){ log("ℹ️ Model still loading; Run will enable when ready."); }
        }).catch(function(err){
          log("Upload failed: " + (err && err.message ? err.message : err));
        });
      } catch(err){ log("uploadBtn click err: " + err); }
    });

    // Run analysis
    $("runBtn").addEventListener("click", function(){
      if (!uploaded){ alert("Upload a CSV first."); return; }
      if (!modelReady){ alert("Model not loaded."); return; }
      try {
        $("procProg").value = 5;
        log("▶️ Running annotation…");
        var code = [
"import numpy as np, pandas as pd, gzip, json, os",
"",
"def read_any(path):",
"    try:",
"        return pd.read_csv(gzip.open(path,'rt'), index_col=0)",
"    except Exception:",
"        return pd.read_csv(path, index_col=0)",
"",
"X = read_any('/tmp_input')",
"_npz = np.load('/tmp_model', allow_pickle=True)",
"loaded = {",
"    'coef_': _npz['coef_'],",
"    'intercept_': _npz['intercept_'],",
"    'classes_': _npz['classes_'],",
"    'features': _npz['features'] if 'features' in _npz.files else _npz['features_'],",
"    'scaler_mean_': _npz['scaler_mean_'],",
"    'scaler_scale_': _npz['scaler_scale_'],",
"    'with_mean': bool(_npz['with_mean'].flat[0]) if _npz['with_mean'].size else True,",
"}",
"",
"feat_lower = np.char.lower(loaded['features'].astype(str))",
"cols_lower = {str(c).lower(): str(c) for c in X.columns.astype(str)}",
"present = [cols_lower[g] for g in feat_lower if g in cols_lower]",
"if len(present) == 0:",
"    raise ValueError('No overlapping features between input and model.')",
"",
"ordered_cols, keep_mask = [], []",
"for g in feat_lower:",
"    if g in cols_lower:",
"        ordered_cols.append(cols_lower[g]); keep_mask.append(True)",
"    else:",
"        keep_mask.append(False)",
"",
"coef_keep  = loaded['coef_'][:, keep_mask]",
"mean_keep  = loaded['scaler_mean_'][keep_mask]",
"scale_keep = loaded['scaler_scale_'][keep_mask]",
"X2 = X[ordered_cols].values.astype('float32')",
"",
"if loaded['with_mean']:",
"    X2 = (X2 - mean_keep) / (scale_keep + 1e-8)",
"else:",
"    X2 = X2 / (scale_keep + 1e-8)",
"",
"X2[X2 > 10] = 10",
"logits = X2 @ coef_keep.T + loaded['intercept_']",
"if logits.ndim == 1:",
"    logits = np.column_stack([-logits, logits])",
"",
"z = logits - logits.max(axis=1, keepdims=True)",
"e = np.exp(z); P = e / e.sum(axis=1, keepdims=True)",
"idx = np.argmax(P, axis=1)",
"labels = loaded['classes_'][idx]",
"top = P[np.arange(P.shape[0]), idx]",
"part = np.partition(P, -2, axis=1)[:, -2:]",
"cert = part[:,1] - part[:,0]",
"",
"out = pd.DataFrame({'cell_id': X.index, 'predicted_label': labels, 'conf_score': top, 'cert_score': cert})",
"out.to_csv('/pred.csv', index=False)",
"print('DONE', X.shape, len(loaded['classes_']))"
].join("\n");

        pyodide.runPythonAsync(code).then(function(){
          try {
            $("procProg").value = 100;
            var bytes = FS.readFile("/pred.csv");
            var blob = new Blob([bytes], { type: "text/csv" });
            if (resultUrl){ URL.revokeObjectURL(resultUrl); }
            resultUrl = URL.createObjectURL(blob);
            setDisabled("downloadBtn", false);
            log("✅ pred.csv ready.");
          } catch(err){
            log("Read pred.csv failed: " + err);
          }
        }).catch(function(err){
          log("Run error: " + (err && err.message ? err.message : err));
        });

      } catch(err){ log("runBtn click err: " + err); }
    });

    // Download results
    $("downloadBtn").addEventListener("click", function(){
      try {
        if (!resultUrl){ alert("No results yet."); return; }
        var a = document.createElement("a");
        a.href = resultUrl;
        a.download = "pred.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        log("⬇️ Download triggered.");
      } catch(err){ log("downloadBtn err: " + err); }
    });

    // --- Initialize Pyodide & model LAST (after listeners) ---
    (function initEnv(){
      try {
        log("⏳ Initializing environment…");
        import("https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js").then(function(m){
          return m.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/" });
        }).then(function(py){
          pyodide = py; FS = pyodide.FS;
          log("✅ Pyodide " + pyodide.version + " loaded.");
          return pyodide.runPythonAsync("import numpy as np, pandas as pd, gzip, io, json, os");
        }).then(function(){
          pyReady = true;
          log("✅ Python libs imported.");
          // fetch model
          return fetch("/assets/models/level1_model_portable.npz", { cache: "no-store" });
        }).then(function(resp){
          if (!resp.ok){ throw new Error("HTTP " + resp.status); }
          return resp.arrayBuffer();
        }).then(function(buf){
          FS.writeFile("/tmp_model", new Uint8Array(buf));
          modelReady = true;
          log("✅ Model loaded from /assets/models/level1_model_portable.npz");
          // enable Run if already uploaded
          setDisabled("runBtn", !uploaded);
        }).catch(function(err){
          log("❌ Init error: " + (err && err.message ? err.message : err));
        });
      } catch(err){ log("initEnv err: " + err); }
    })();
  });
})();
</script>

{% endraw %}
