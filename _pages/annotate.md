---
title: Annotate cells online
author: S. Kim
date: 2025-10-16
layout: post
---

{% raw %}

<!-- Load Pyodide from the official CDN -->
<script defer src="https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js"></script>

<!-- PapaParse: fast browser-side CSV parser -->
<script defer src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>

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

  /* Make the Model <select> match the other control buttons */
  .ctrl-row button,
  .ctrl-row select{
    font: inherit;
    height: 28px;
    padding: 0 10px;
    box-sizing: border-box;
    line-height: normal;
  }
</style>

<!-- Controls row -->
<div class="ctrl-row" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px;align-items:center;">
  <button id="bootBtn" type="button">1:boot</button>

  <label for="csvInput" style="display:inline-block;">
    <input type="file" id="csvInput" accept=".csv,.gz,.csv.gz,text/csv,application/gzip,application/x-gzip" style="display:none;">
    <button id="loadFileBtn" type="button" disabled>2:load file</button>
  </label>

  <!-- Model selector -->
  <label style="display:flex;gap:6px;align-items:center;">
    <span style="font-size:13px;color:#555;">3:model</span>
    <select id="modelSel">
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

  <button id="runBtn" type="button" disabled>4:run</button>
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
  <strong>This page conducts cell annotations on the uploaded gene expression files></strong>
  <div style="margin:4px 0 8px 0; font-size:13px; color:#555;">
    This online-page is optimized small number of cells. Limited performance for datasets containing more than thousands of cells. For better and faster performance, use
    <a href="https://github.com/srkim727/pangeapy" target="_blank" rel="noopener">pangeapy API</a>.
  </div>
  <ol>
    <li><strong>Input file configuration</strong>
      <ul>
        <li>Should contain gene expression matrix <code>(cell_barcode × gene_id)</code></li>
        <li>Raw expression must be <code>1e4</code>-normalized &amp; <code>log1p</code>-transformed<br>
            <small>normalized up to 10,000 counts per cell, then log-transformed with 1 pseudocount</small>
        </li>
        <li>File format: <code>.csv</code> or <strong><code>.csv.gz (recommended for faster performance)</code></strong></li>
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
        if (globalThis[fnName] != null) return resolve();
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

  // Decompress gzip (if magic bytes present) and decode to text.
  async function decompressAndDecode(bytes){
    const isGz = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    if(!isGz){
      return new TextDecoder('utf-8').decode(bytes);
    }
    const ds = new DecompressionStream('gzip');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return await new Response(stream).text();
  }

  // Count newlines without allocating a big array.
  function countLines(text){
    let count = 0;
    for(let i = 0; i < text.length; i++){
      if(text.charCodeAt(i) === 10) count++;
    }
    return count;
  }

  // Parse a CSV expression matrix (cell × gene) into a Float32Array.
  async function parseCsvInJs(text, onRowProgress){
    await waitForGlobal("Papa", 10000);
    const estRows = Math.max(1, countLines(text)); // includes header + possible trailing
    return new Promise((resolve, reject) => {
      const cellIds = [];
      let colNames = null;
      let nCols = 0;
      let rowCount = 0;
      let capacity = 0;
      let xFlat = null;
      let lastTick = performance.now();

      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        fastMode: true,
        delimiter: ',',
        step: (row) => {
          const data = row.data;
          if (colNames === null) {
            colNames = data.slice(1);
            nCols = colNames.length;
            capacity = estRows + 4;
            xFlat = new Float32Array(capacity * nCols);
            return;
          }
          if (rowCount >= capacity) {
            const newCap = Math.ceil(capacity * 1.5) + 1;
            const newX = new Float32Array(newCap * nCols);
            newX.set(xFlat);
            xFlat = newX;
            capacity = newCap;
          }
          cellIds.push(data[0]);
          const off = rowCount * nCols;
          for (let i = 0; i < nCols; i++) {
            const v = +data[i + 1];
            xFlat[off + i] = (v === v) ? v : 0;  // v === v is false only for NaN
          }
          rowCount++;
          const now = performance.now();
          if (onRowProgress && now - lastTick > 100) {
            lastTick = now;
            onRowProgress(rowCount);
          }
        },
        complete: () => {
          if (colNames === null) {
            reject(new Error("CSV appears to be empty."));
            return;
          }
          resolve({
            cellIds,
            colNames,
            xFlat: xFlat.subarray(0, rowCount * nCols),
            nCells: rowCount,
            nCols,
          });
        },
        error: (err) => reject(err)
      });
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
  let fileBytes=null, fileName="";
  let modelPath="/tmp_model";   // in Pyodide FS
  let modelFresh=false;         // set false when selection changes
  let modelPromise=null;        // in-flight fetch, for dedupe
  let resultUrl=null;

  // Reset model state when selection changes
  $("modelSel").addEventListener("change", ()=>{
    modelFresh = false;
    modelPromise = null;
    setDisabled("runBtn", !uploaded || !libsReady);
    if (libsReady) {
      ensureModelInFS().catch(err => log("❌ Model prefetch: " + (err?.message || err)));
    }
  });

  // ---------- BOOT (with integrated sanity check) ----------
  $("bootBtn").addEventListener("click", async ()=>{
    try{
      setDisabled("bootBtn", true);
      await waitForGlobal("loadPyodide", 20000);
      pyodide = await globalThis.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/" });
      FS = pyodide.FS;
      pyReady = true;
      await pyodide.loadPackage(["numpy","pandas"]);
      await pyodide.runPythonAsync(`import numpy as np, pandas as pd, gzip, io, json, os`);
      libsReady = true;
      log(`✅ Ready (Pyodide ${pyodide.version})`);

      setDisabled("loadFileBtn", false);
      setDisabled("runBtn", !uploaded);

      // Prefetch the currently-selected model in the background
      ensureModelInFS().catch(err => log("❌ Model prefetch: " + (err?.message || err)));
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
      $("uploadProg").value = 0;
      $("uploadStatus").textContent = "Reading…";
      fileBytes = await readFileWithProgress(f);
      fileName = f.name;
      uploaded = true;
      $("uploadProg").value = 100;
      $("uploadStatus").textContent = `✅ Upload complete • ${(fileBytes.length/1e6).toFixed(2)} MB`;
      log(`📁 ${f.name} (${(fileBytes.length/1e6).toFixed(2)} MB)`);
      setDisabled("runBtn", !libsReady);
    }catch(err){
      uploaded = false;
      fileBytes = null;
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
    const modelName = $("modelSel").selectedOptions[0].text;
    modelPromise = (async () => {
      const resp = await fetch(url);
      if(!resp.ok) throw new Error("Model HTTP " + resp.status);
      const buf = new Uint8Array(await resp.arrayBuffer());

      // Basic ZIP magic check
      const ok = (buf.length >= 4 && buf[0]===0x50 && buf[1]===0x4B && buf[2]===0x03 && buf[3]===0x04);
      if(!ok) log("⚠️ Model doesn't look like a ZIP (npz) – continuing anyway.");

      FS.writeFile(modelPath, buf);
      modelFresh = true;
      log(`🧬 Model: ${modelName} (${(buf.length/1e6).toFixed(2)} MB)`);
    })();
    try {
      await modelPromise;
    } finally {
      modelPromise = null;
    }
  }

  // ---------- RUN ----------
  function fmtElapsed(ms){
    if(ms < 1000) return `${Math.round(ms)} ms`;
    const s = ms / 1000;
    if(s < 60) return `${s.toFixed(1)} s`;
    const m = Math.floor(s/60), r = s - m*60;
    return `${m}m ${r.toFixed(1)}s`;
  }

  $("runBtn").addEventListener("click", async ()=>{
    if(!uploaded || !fileBytes){ alert("Load a CSV first."); return; }
    if(!libsReady){ alert("Boot first."); return; }

    const runT0 = performance.now();
    let currentMsg = "Starting…";
    const tickTimer = setInterval(()=>{
      $("procStatus").textContent = `${currentMsg} • ${fmtElapsed(performance.now() - runT0)}`;
    }, 200);
    const setStage = (pct, msg) => {
      currentMsg = msg;
      $("procProg").value = pct;
      $("procStatus").textContent = `${msg} • ${fmtElapsed(performance.now() - runT0)}`;
    };

    setStage(5, "Starting…");
    log("▶️ Running annotation …");

    let unhookOut = null, unhookErr = null;
    try {
      setStage(10, "Fetching model");
      try {
        await ensureModelInFS();
      } catch(err) {
        clearInterval(tickTimer);
        $("procStatus").textContent = "❌ Model fetch error";
        log("❌ Model fetch error: " + (err?.message || err));
        return;
      }

      setStage(20, "Decoding CSV");
      const text = await decompressAndDecode(fileBytes);

      setStage(30, "Parsing CSV");
      const parsed = await parseCsvInJs(text, (n) => {
        currentMsg = `Parsing CSV (${n.toLocaleString()} rows)`;
      });
      log(`📊 Parsed ${parsed.nCells.toLocaleString()} × ${parsed.nCols.toLocaleString()}`);

      setStage(55, "Transferring to Python");
      const xBytes = new Uint8Array(parsed.xFlat.buffer, parsed.xFlat.byteOffset, parsed.xFlat.byteLength);
      FS.writeFile('/tmp_X.bin', xBytes);
      pyodide.globals.set('col_names_js', parsed.colNames);
      pyodide.globals.set('cell_ids_js', parsed.cellIds);
      pyodide.globals.set('n_cells_js', parsed.nCells);
      pyodide.globals.set('n_cols_js', parsed.nCols);

      unhookOut = pyodide.setStdout({
        batched: (s) => {
          (s || "").split(/\r?\n/).forEach(line=>{
            if(!line) return;
            if(line.startsWith("__STAGE__:")){
              const parts = line.trim().split(":");
              const pct = Math.max(0, Math.min(100, parseInt(parts[1]||"0",10)));
              const msg = parts.slice(2).join(":") || "Working…";
              setStage(pct, msg);
            } else {
              log(line);
            }
          });
        }
      });
      unhookErr = pyodide.setStderr({ batched: (s) => { s && s.trim() && log("ERR: " + s); } });

      const code = `
import numpy as np, gzip, io, sys

def stage(pct, msg):
    print(f"__STAGE__:{pct}:{msg}")
    sys.stdout.flush()

stage(60, "Reading model")
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

stage(65, "Loading matrix")
n_cells = int(n_cells_js)
n_cols  = int(n_cols_js)
X = np.fromfile('/tmp_X.bin', dtype=np.float32).reshape(n_cells, n_cols)
col_names = [str(c) for c in col_names_js]
cell_ids  = [str(c) for c in cell_ids_js]

stage(70, "Preparing features")
feat_arr = (_npz['features'] if 'features' in _npz.files else _npz['features_']).astype(str)
feat_lower = np.char.lower(feat_arr)

col_idx = {}
for i, c in enumerate(col_names):
    lc = c.lower()
    if lc not in col_idx:
        col_idx[lc] = i

keep_mask = np.array([c in col_idx for c in feat_lower], dtype=bool)
if not keep_mask.any():
    raise ValueError('No overlapping features between input and model.')

x_indices = np.array([col_idx[feat_lower[i]] for i in range(len(feat_lower)) if keep_mask[i]], dtype=np.int64)

coef_keep  = _npz['coef_'][:, keep_mask]
mean_keep  = _npz['scaler_mean_'][keep_mask]
scale_keep = _npz['scaler_scale_'][keep_mask]
with_mean  = bool(_npz['with_mean'].flat[0]) if _npz['with_mean'].size else True
intercept  = _npz['intercept_']
classes_   = _npz['classes_']

stage(78, "Scaling input")
X2 = X[:, x_indices]
if with_mean:
    X2 = (X2 - mean_keep) / (scale_keep + 1e-8)
else:
    X2 = X2 / (scale_keep + 1e-8)
X2[X2 > 10] = 10

stage(86, "Computing logits")
logits = X2 @ coef_keep.T + intercept
if logits.ndim == 1:
    logits = np.column_stack([-logits, logits])

stage(92, "Softmax & labels")
z = logits - logits.max(axis=1, keepdims=True)
e = np.exp(z); P = e / e.sum(axis=1, keepdims=True)
idx = np.argmax(P, axis=1)
labels = classes_[idx]
top = P[np.arange(P.shape[0]), idx]
part = np.partition(P, -2, axis=1)[:, -2:]
cert = part[:,1] - part[:,0]

stage(97, "Writing output")
import pandas as pd
out = pd.DataFrame({'cell_id': cell_ids, 'predicted_label': labels, 'conf_score': top, 'cert_score': cert})
out.to_csv('/pred.csv', index=False)
print('DONE', X.shape, len(classes_), 'features_used=', int(keep_mask.sum()))
`;

      await pyodide.runPythonAsync(code);
      const elapsed = fmtElapsed(performance.now() - runT0);
      $("procProg").value = 100;
      $("procStatus").textContent = `Complete • ${elapsed}`;

      const bytes = FS.readFile("/pred.csv");
      const blob  = new Blob([bytes], { type: "text/csv" });
      if(resultUrl){ URL.revokeObjectURL(resultUrl); }
      resultUrl = URL.createObjectURL(blob);
      $("downloadWrap").style.display = "block";
      $("downloadLink").href = resultUrl;
      log(`✅ pred.csv ready in ${elapsed}. Use the link above to download.`);
    } catch(err) {
      const elapsed = fmtElapsed(performance.now() - runT0);
      $("procStatus").textContent = `❌ Error • ${elapsed}`;
      log(`❌ Run error after ${elapsed}: ` + (err?.message || err));
    } finally {
      clearInterval(tickTimer);
      try{ unhookOut && unhookOut(); }catch(_){}
      try{ unhookErr && unhookErr(); }catch(_){}
    }
  });

  log("Flow → 1) Boot  2) Load file  3) Model  4) Run");
  log("🧭 Default model: " + $("modelSel").selectedOptions[0].text + " → " + getModelURL());

  // Auto-boot: this script is inline to the annotate page, so it only runs here.
  $("bootBtn").click();
})();
</script>

{% endraw %}
