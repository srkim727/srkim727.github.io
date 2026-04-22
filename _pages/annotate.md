---
title: Annotate cells online
author: S. Kim
date: 2025-10-16
layout: post
---

{% raw %}

<!-- Load Pyodide from the official CDN -->
<script defer src="https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js"></script>

<!-- Annotation panel styles -->
<style>
  .meta-panel{
    background:#f8f9fb;border:1px solid #e5e7eb;border-radius:8px;
    padding:12px 14px;margin:10px 0 14px 0;color:#111;font-size:14px;
  }
  .meta-panel code{background:#eef2f7;padding:1px 4px;border-radius:4px}
  .meta-panel ol{margin:6px 0 0 20px}
  .meta-panel ul{margin:4px 0 0 18px}
  .meta-panel li{margin:2px 0}
</style>

<!-- Controls row -->
<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px;align-items:center;">
  <button id="bootBtn" type="button">1:boot</button>

  <!-- Model selector -->
  <label style="display:flex;gap:6px;align-items:center;">
    <span style="font-size:13px;color:#555;">Model</span>
    <select id="modelSel" style="padding:4px 6px;">
      <option value="level1_Whole_model_portable.npz" selected>Whole (level1)</option>
      <option value="level2_B_mature_model_portable.npz">B_mature (level2)</option>
      <option value="level2_Dendritic_classical_model_portable.npz">Dendritic_classical (level2)</option>
      <option value="level2_Ductal_model_portable.npz">Ductal (level2)</option>
      <option value="level2_Endothelial_model_portable.npz">Endothelial (level2)</option>
      <option value="level2_Fibroblast_model_portable.npz">Fibroblast (level2)</option>
      <option value="level2_Macrophage_model_portable.npz">Macrophage (level2)</option>
      <option value="level2_Monocyte_model_portable.npz">Monocyte (level2)</option>
      <option value="level2_Mural_model_portable.npz">Mural (level2)</option>
      <option value="level2_Squamous_model_portable.npz">Squamous (level2)</option>
      <option value="level2_T&NK_model_portable.npz">T&NK (level2)</option>
    </select>
  </label>

  <label title="Safer but slower (disables SIMD)">
    <input type="checkbox" id="safe"> Safe mode
  </label>

  <label for="csvInput" style="display:inline-block;">
    <input type="file" id="csvInput" accept=".csv,.csv.gz,text/csv" style="display:none;">
    <button id="loadFileBtn" type="button" disabled>2:load file</button>
  </label>

  <button id="runBtn" type="button" disabled>3:run</button>
</div>

<!-- Uploading progress -->
<div style="margin:8px 0 4px 0; font-size:13px; color:#555;">Uploading</div>
<progress id="uploadProg" max="100" value="0" style="width:100%;"></progress>
<div id="uploadStatus" style="font-size:12px;color:#777;margin:4px 0 12px 0;">Waiting for file…</div>

<!-- Processing progress -->
<div style="margin:8px 0 4px 0; font-size:13px; color:#555;">Processing</div>
<progress id="procProg" max="100" value="0" style="width:100%;"></progress>
<div id="procStatus" style="font-size:12px;color:#777;margin:4px 0 8px 0;">Idle</div>

<!-- Download link -->
<p id="downloadWrap" style="display:none;margin-top:8px;">
  <a id="downloadLink" download="pred.csv">Download pred.csv</a>
</p>

<!-- ✨ Annotations moved here: below controls & progress, just above the Log window -->
<div class="meta-panel">
  <strong>This page conducts cell annotations on the uploaded gene expression files</strong>
  <ol>
    <li><strong>Input file configuration</strong>
      <ul>
        <li>Should contain gene expression matrix <code>(cell_barcode × gene_id)</code></li>
        <li>Raw expression must be <code>1e4</code>-normalized &amp; <code>log1p</code>-transformed<br>
            <small>normalized up to 10,000 counts per cell, then log-transformed with 1 pseudocount</small>
        </li>
        <li>File format: <code>.csv</code> or <code>.csv.gz</code></li>
      </ul>
    </li>
    <li><strong>Cell annotation</strong>
      <ul>
        <li>Performed per cell barcode with a selectable model</li>
        <li>PANGEA provides one Level1 model and ten Level2 models</li>
        <li>Level1: 32 cell types; Level2 (combined): 165 annotations</li>
        <li>Predictions are based on pre-trained logistic regression models</li>
        <li>Results may differ from the original <code>PANGEApy</code> package
          (<a href="https://github.com/srkim727/pangeapy" target="_blank" rel="noopener">github.com/srkim727/pangeapy</a>)
        </li>
      </ul>
    </li>
    <li><strong>Output file configuration</strong>
      <ul>
        <li>Output file: <code>pred.csv</code> with three columns for each cell barcode</li>
        <li><code>predicted_label</code> – predicted cell label from the selected model</li>
        <li><code>conf_score</code> – confidence score from the model prediction</li>
        <li><code>cert_score</code> – certainty compared to other labels within the model</li>
      </ul>
    </li>
  </ol>
</div>

<!-- Log -->
<details open style="margin-top:10px;">
  <summary><strong>Log</strong></summary>
  <pre id="log" style="
    background:#0a0f17;
    color:#e8eef7;
    padding:6px;
    border-radius:6px;
    overflow:auto;
    height:220px;
    white-space:pre-wrap;
    font-size:11px;
    line-height:1.25;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
  </pre>
</details>

<script>
(function(){
  // ---------- Helpers ----------
  function $(id){ return document.getElementById(id); }
  function setDisabled(elOrId, v){ const el = typeof elOrId==="string" ? $(elOrId) : elOrId; if(el) el.disabled = !!v; }
  function log(m){
    const el = $("log"); if(!el) return;
    el.textContent += (m + "\n");
    const MAX_LINES = 300;
    const lines = el.textContent.split("\n");
    if (lines.length > MAX_LINES){ el.textContent = lines.slice(-MAX_LINES).join("\n"); }
    el.scrollTop = el.scrollHeight;
  }
  function waitForGlobal(fnName, timeoutMs){
    return new Promise((resolve, reject)=>{
      const t0 = performance.now();
      (function check(){
        if (typeof globalThis[fnName] === "function") return resolve();
        if (performance.now() - t0 > timeoutMs) return reject(new Error("Timeout waiting for "+fnName));
        setTimeout(check, 100);
      })();
    });
  }
  function readFileWithProgress(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      let last = performance.now(), lastLoaded = 0;
      reader.onprogress = (e)=>{
        if(e.lengthComputable){
          const pct = Math.round((e.loaded/e.total)*100);
          $("uploadProg").value = pct;
          const now = performance.now();
          const rate = (e.loaded-lastLoaded)/((now-last)/1000);
          $("uploadStatus").textContent = `Reading: ${pct}% • ${(rate/1048576).toFixed(2)} MB/s`;
          last = now; lastLoaded = e.loaded;
        }
      };
      reader.onload  = ()=> resolve(new Uint8Array(reader.result));
      reader.onerror = ()=> reject(reader.error || new Error("FileReader error"));
      reader.readAsArrayBuffer(file);
    });
  }

  // ---------- Model selection ----------
  const MODEL_BASE = "/assets/models/";
  function getModelURL(){
    const f = $("modelSel").value || "level1_Whole_model_portable.npz";
    return MODEL_BASE + f;
  }

  // ---------- State ----------
  let pyodide=null, FS=null;
  let pyReady=false, libsReady=false, uploaded=false;
  let modelPath="/tmp_model";   // in Pyodide FS
  let modelFresh=false;         // set false when selection changes
  let modelPromise=null;        // in-flight fetch, for dedupe
  let resultUrl=null;

  // Reset model state when selection changes
  $("modelSel").addEventListener("change", ()=>{
    modelFresh = false;
    modelPromise = null;
    setDisabled("runBtn", !uploaded || !libsReady);
    log("🧭 Model selected: " + $("modelSel").selectedOptions[0].text + " → " + getModelURL());
    if (libsReady) {
      ensureModelInFS().catch(err => log("⚠️ Model prefetch: " + (err?.message || err)));
    }
  });

  // ---------- BOOT (with integrated sanity check) ----------
  $("bootBtn").addEventListener("click", async ()=>{
    try{
      setDisabled("bootBtn", true);
      log("⏳ Boot: waiting for pyodide.js …");
      await waitForGlobal("loadPyodide", 20000);

      log("⏳ Boot: initializing Pyodide…");
      pyodide = await globalThis.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/" });
      FS = pyodide.FS;
      pyReady = true;
      log("✅ Pyodide " + pyodide.version + " loaded.");

      log("⏳ Boot: loading packages (numpy, pandas) …");
      await pyodide.loadPackage(["numpy","pandas"]);
      log("✅ Packages loaded.");

      log("⏳ Boot: importing libs & running sanity check …");
      const pingOut = await pyodide.runPythonAsync(`
import numpy as np, pandas as pd, gzip, io, json, os
print("numpy", np.__version__)
print("pandas", pd.__version__)
print("sum:", int(np.array([1,2,3]).sum()))
"OK"
      `);
      libsReady = true;
      log("✅ Sanity check OK: " + pingOut);

      setDisabled("loadFileBtn", false);
      setDisabled("runBtn", !uploaded);

      // Prefetch the currently-selected model in the background
      ensureModelInFS().catch(err => log("⚠️ Model prefetch: " + (err?.message || err)));
    }catch(err){
      log("❌ Boot failed: " + (err?.message || err));
      setDisabled("bootBtn", false);
      return;
    }
    setDisabled("bootBtn", false);
  });

  // ---------- LOAD FILE ----------
  $("loadFileBtn").addEventListener("click", ()=>{
    if(!pyReady){ alert("Boot first."); return; }
    $("csvInput").click();
  });

  $("csvInput").addEventListener("change", async (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f){ return; }
    try{
      log("📁 Selected: " + f.name);
      $("uploadProg").value = 0;
      $("uploadStatus").textContent = "Reading…";
      const bytes = await readFileWithProgress(f);
      FS.writeFile("/tmp_input", bytes);
      uploaded = true;
      $("uploadProg").value = 100;
      $("uploadStatus").textContent = `✅ Upload complete • ${(bytes.length/1e6).toFixed(2)} MB`;
      log(`📤 Loaded into FS → /tmp_input (${(bytes.length/1e6).toFixed(2)} MB)`);
      setDisabled("runBtn", !libsReady);
      if(!libsReady) log("ℹ️ Boot first, then Run will enable.");
    }catch(err){
      uploaded = false;
      $("uploadProg").value = 0;
      $("uploadStatus").textContent = "❌ Upload failed";
      setDisabled("runBtn", true);
      log("❌ File load failed: " + (err?.message || err));
    }
  });

  // ---------- Fetch selected model into Pyodide FS (called from Run) ----------
  async function ensureModelInFS(){
    if (modelFresh) return;
    if (modelPromise) return modelPromise;
    const url = getModelURL();
    log("🔎 Fetching model: " + url);
    modelPromise = (async () => {
      const resp = await fetch(url);
      if(!resp.ok) throw new Error("Model HTTP " + resp.status);
      const buf = new Uint8Array(await resp.arrayBuffer());

      // Basic ZIP magic check
      const ok = (buf.length >= 4 && buf[0]===0x50 && buf[1]===0x4B && buf[2]===0x03 && buf[3]===0x04);
      if(!ok) log("⚠️ Model doesn't look like a ZIP (npz) – continuing anyway.");

      FS.writeFile(modelPath, buf);
      modelFresh = true;
      log(`✅ Model cached at ${modelPath} (${(buf.length/1e6).toFixed(2)} MB)`);
    })();
    try {
      await modelPromise;
    } finally {
      modelPromise = null;
    }
  }

  // ---------- RUN ----------
  $("runBtn").addEventListener("click", async ()=>{
    if(!uploaded){ alert("Load a CSV first."); return; }
    if(!libsReady){ alert("Boot first."); return; }

    $("procProg").value = 5;
    $("procStatus").textContent = "Starting…";
    log("▶️ Running annotation …");

    // fetch model for current selection
    try{
      await ensureModelInFS();
    }catch(err){
      $("procStatus").textContent = "❌ Model fetch error";
      log("❌ Model fetch error: " + (err?.message || err));
      return;
    }

    const code = `
import numpy as np, pandas as pd, gzip, json, os, io, sys

def stage(pct, msg):
    print(f"__STAGE__:{pct}:{msg}")
    sys.stdout.flush()

def read_any(path):
    with open(path, 'rb') as fh:
        magic = fh.read(2)
    if magic == b'\x1f\x8b':
        return pd.read_csv(gzip.open(path, 'rt'), index_col=0)
    return pd.read_csv(path, index_col=0)

stage(10, "Loading input")
X = read_any('/tmp_input')
# Optional guard against non-numeric columns:
# X = X.apply(pd.to_numeric, errors='coerce').fillna(0.0)

stage(20, "Reading model")
def load_npz_any(path):
    try:
        return np.load(path, allow_pickle=True)
    except Exception as e1:
        try:
            with gzip.open(path, 'rb') as fh: data = fh.read()
            return np.load(io.BytesIO(data), allow_pickle=True)
        except Exception as e2:
            raise EOFError(f"Failed to read model as npz. Direct: {e1}; Gzip-fallback: {e2}")
_npz = load_npz_any('/tmp_model')

stage(40, "Preparing features")
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
X.columns = X.columns.astype(str).str.lower()
keep_mask = np.isin(feat_lower, X.columns.values)
if not keep_mask.any():
    raise ValueError('No overlapping features between input and model.')

stage(55, "Scaling input")
coef_keep  = loaded['coef_'][:, keep_mask]
mean_keep  = loaded['scaler_mean_'][keep_mask]
scale_keep = loaded['scaler_scale_'][keep_mask]
X2 = X.reindex(columns=feat_lower[keep_mask]).values.astype('float32', copy=False)
if loaded['with_mean']:
    X2 = (X2 - mean_keep) / (scale_keep + 1e-8)
else:
    X2 = X2 / (scale_keep + 1e-8)
X2[X2 > 10] = 10

stage(75, "Computing logits")
logits = X2 @ coef_keep.T + loaded['intercept_']
if logits.ndim == 1:
    logits = np.column_stack([-logits, logits])

stage(85, "Softmax & labels")
z = logits - logits.max(axis=1, keepdims=True)
e = np.exp(z); P = e / e.sum(axis=1, keepdims=True)
idx = np.argmax(P, axis=1)
labels = loaded['classes_'][idx]
top = P[np.arange(P.shape[0]), idx]
part = np.partition(P, -2, axis=1)[:, -2:]
cert = part[:,1] - part[:,0]

stage(95, "Writing output")
out = pd.DataFrame({'cell_id': X.index, 'predicted_label': labels, 'conf_score': top, 'cert_score': cert})
out.to_csv('/pred.csv', index=False)
print('DONE', X.shape, len(loaded['classes_']))
`;

    // capture staged progress
    const unhookOut = pyodide.setStdout({
      batched: (s) => {
        (s || "").split(/\r?\n/).forEach(line=>{
          if(!line) return;
          if(line.startsWith("__STAGE__:")){
            const parts = line.trim().split(":");
            const pct = Math.max(0, Math.min(100, parseInt(parts[1]||"0",10)));
            const msg = parts.slice(2).join(":") || "Working…";
            $("procProg").value = pct;
            $("procStatus").textContent = msg;
          } else {
            log(line);
          }
        });
      }
    });
    const unhookErr = pyodide.setStderr({ batched: (s) => { s && s.trim() && log("ERR: " + s); } });

    try{
      await pyodide.runPythonAsync(code);
      $("procProg").value = 100;
      $("procStatus").textContent = "Complete";

      const bytes = FS.readFile("/pred.csv");
      const blob  = new Blob([bytes], { type: "text/csv" });
      if(resultUrl){ URL.revokeObjectURL(resultUrl); }
      resultUrl = URL.createObjectURL(blob);
      $("downloadWrap").style.display = "block";
      $("downloadLink").href = resultUrl;
      log("✅ pred.csv ready. Use the link above to download.");
    }catch(err){
      $("procStatus").textContent = "❌ Error";
      log("❌ Run error: " + (err?.message || err));
    }finally{
      try{ unhookOut && unhookOut(); }catch(_){}
      try{ unhookErr && unhookErr(); }catch(_){}
    }
  });

  log("Flow → 1) Boot  2) Load file  3) Run");
  log("🧭 Default model: " + $("modelSel").selectedOptions[0].text + " → " + getModelURL());

  // Auto-boot: this script is inline to the annotate page, so it only runs here.
  $("bootBtn").click();
})();
</script>

{% endraw %}
