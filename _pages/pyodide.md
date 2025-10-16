---
title: Annotate Cells (Pyodide + Portable CellTypist Model)
author: Your Name
date: 2025-10-16
layout: post
---

{% raw %}

<!-- Load Pyodide from the official CDN -->
<script defer src="https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js"></script>

<h2>bAnnotate Cells from CSV/CSV.GZ (Pyodide, CellTypist-style logistic)</h2>
<p>
  Model: <code>/assets/models/level1_model_portable.npz</code><br>
  Input: cells × genes; 1e4-normalized + <code>log1p</code><br>
  Output: <code>pred.csv</code>
</p>

<!-- Five buttons -->
<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px;">
  <button id="bootBtn" type="button">Boot</button>
  <button id="pingBtn" type="button" disabled>Ping</button>
  <button id="validateBtn" type="button" disabled>Validate assets</button>
  <label for="csvInput" style="display:inline-block;">
    <input type="file" id="csvInput" accept=".csv,.csv.gz,text/csv" style="display:none;">
    <button id="loadFileBtn" type="button" disabled>Load file</button>
  </label>
  <button id="runBtn" type="button" disabled>Run</button>
</div>

<!-- Uploading progress -->
<div style="margin:8px 0 4px 0; font-size:13px; color:#555;">Uploading</div>
<progress id="uploadProg" max="100" value="0" style="width:100%;"></progress>
<div id="uploadStatus" style="font-size:12px;color:#777;margin:4px 0 12px 0;">Waiting for file…</div>

<!-- Processing progress -->
<div style="margin:8px 0 4px 0; font-size:13px; color:#555;">Processing</div>
<progress id="procProg" max="100" value="0" style="width:100%;"></progress>
<div id="procStatus" style="font-size:12px;color:#777;margin:4px 0 8px 0;">Idle</div>

<p id="downloadWrap" style="display:none;margin-top:8px;">
  <a id="downloadLink" download="pred.csv">Download pred.csv</a>
</p>

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
          const rate = (e.loaded-lastLoaded)/((now-last)/1000); // bytes/s
          $("uploadStatus").textContent = `Reading: ${pct}% • ${(rate/1048576).toFixed(2)} MB/s`;
          last = now; lastLoaded = e.loaded;
        }
      };
      reader.onload  = ()=> resolve(new Uint8Array(reader.result));
      reader.onerror = ()=> reject(reader.error || new Error("FileReader error"));
      reader.readAsArrayBuffer(file);
    });
  }

  // ---------- State ----------
  const MODEL_URL = "/assets/models/level1_model_portable.npz";
  let pyodide=null, FS=null;
  let pyReady=false, libsReady=false, modelReady=false, uploaded=false;
  let resultUrl=null;

  // ---------- BOOT ----------
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

      log("⏳ Boot: importing numpy/pandas/gzip …");
      await pyodide.runPythonAsync("import numpy as np, pandas as pd, gzip, io, json, os");
      libsReady = true;
      log("✅ Python libs imported.");
      setDisabled("pingBtn", false);
      setDisabled("validateBtn", false);
      setDisabled("loadFileBtn", false);
    }catch(err){
      log("❌ Boot failed: " + (err?.message || err));
      setDisabled("bootBtn", false);
      return;
    }
    setDisabled("bootBtn", false);
  });

  // ---------- PING ----------
  $("pingBtn").addEventListener("click", async ()=>{
    if(!pyReady){ alert("Boot first."); return; }
    try{
      log("🔔 Ping: Python sanity check …");
      const out = await pyodide.runPythonAsync(`
import numpy as np, pandas as pd
print("numpy", np.__version__)
print("pandas", pd.__version__)
print("sum:", int(np.array([1,2,3]).sum()))
"OK"
      `);
      log("✅ Ping OK: " + out);
    }catch(err){
      log("❌ Ping failed: " + (err?.message || err));
    }
  });

  // ---------- VALIDATE MODEL ----------
  $("validateBtn").addEventListener("click", async ()=>{
    async function fetchModel(url){
      const resp = await fetch(url, { cache: "no-store" });
      if(!resp.ok) throw new Error("HTTP " + resp.status);
      const buf = new Uint8Array(await resp.arrayBuffer());
      return { buf, sizeHeader: resp.headers.get("content-length") };
    }
    try{
      log("🔎 Validate: GET " + MODEL_URL + " …");
      let { buf } = await fetchModel(MODEL_URL);

      // NPZ magic check (ZIP local file header)
      const magicOk = (buf.length >= 4 && buf[0]===0x50 && buf[1]===0x4B && buf[2]===0x03 && buf[3]===0x04);
      if(!magicOk){
        log("⚠️ Not a ZIP magic; retrying (cache-bust) …");
        ({ buf } = await fetchModel(MODEL_URL + "?t=" + Date.now()));
      }
      if(!(buf.length >= 4 && buf[0]===0x50 && buf[1]===0x4B && buf[2]===0x03 && buf[3]===0x04)){
        throw new Error("Model is not a valid .npz (ZIP magic missing). Bytes=" + buf.length);
      }

      FS.writeFile("/tmp_model", buf);
      modelReady = true;
      log(`✅ Model written to /tmp_model (${(buf.length/1e6).toFixed(2)} MB)`);
      $("uploadStatus").textContent = "Waiting for file…";
      setDisabled("runBtn", !uploaded);
    }catch(err){
      modelReady = false;
      setDisabled("runBtn", true);
      log("❌ Validate failed: " + (err?.message || err));
    }
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
      setDisabled("runBtn", !(uploaded && modelReady));
      if(!modelReady) log("ℹ️ Validate assets to load model, then Run will enable.");
    }catch(err){
      uploaded = false;
      $("uploadProg").value = 0;
      $("uploadStatus").textContent = "❌ Upload failed";
      setDisabled("runBtn", true);
      log("❌ File load failed: " + (err?.message || err));
    }
  });

  // ---------- RUN (uses setStdout/setStderr; no stdout option) ----------
  $("runBtn").addEventListener("click", async ()=>{
    if(!uploaded){ alert("Load a CSV first."); return; }
    if(!modelReady){ alert("Validate/Load model first."); return; }
    if(!libsReady){ alert("Boot first."); return; }

    $("procProg").value = 5;
    $("procStatus").textContent = "Starting…";
    log("▶️ Running annotation …");

    const code = `
import numpy as np, pandas as pd, gzip, json, os, io, sys

def stage(pct, msg):
    print(f"__STAGE__:{pct}:{msg}")
    sys.stdout.flush()

def read_any(path):
    try:
        return pd.read_csv(gzip.open(path,'rt'), index_col=0)
    except Exception:
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

stage(55, "Scaling input")
coef_keep  = loaded['coef_'][:, keep_mask]
mean_keep  = loaded['scaler_mean_'][keep_mask]
scale_keep = loaded['scaler_scale_'][keep_mask]
X2 = X[ordered_cols].values.astype('float32')
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
out = pd.DataFrame({'cell_id':_
