---
title: Annotate cells online
author: S. Kim
date: 2025-10-16
layout: post
---

{% raw %}

<!-- Load Pyodide from the official CDN -->
<script defer src="https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js"></script>

<!-- pako: robust pure-JS gzip decompressor (handles multi-member gzip / BGZF / trailing padding) -->
<script defer src="https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js"></script>

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
  <strong>This page conducts cell annotations on the uploaded gene expression files</strong>
  <div style="margin:4px 0 8px 0; font-size:13px; color:#555;">
    This online-page is optimized for small number (~few thousand) of cells. This webpage uses users' resources, so performances can be limited by the user environment. For better and faster performance, use
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

  // Stream-decompress (if gzipped) and parse the CSV in one pipeline.
  // We never materialize the full decompressed text as a single string or Blob.
  // pako's Inflate emits Uint8Array chunks; we TextDecoder-stream them,
  // split on newlines, and write float values directly into a pre-sized
  // Float32Array that's already n_cells × n_feat (columns not in the model
  // are skipped entirely — never converted to float, never stored).
  async function parseCsvBytes(bytes, featureMap, nFeat, onRowProgress){
    const isGz = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    const cellIds = [];
    let colToFeatIdx = null;                    // Int32Array: CSV data-col → feature idx (or -1)
    const keepMask = new Uint8Array(nFeat);     // 1 if feature has an input column
    let rowCount = 0;
    let capacity = 2048;
    let xFlat = new Float32Array(capacity * nFeat);
    const decoder = new TextDecoder('utf-8');
    let leftover = "";
    let lastTick = performance.now();

    function processLine(line){
      if (!line) return;
      const parts = line.split(',');
      if (colToFeatIdx === null) {
        // Header: [indexColName, gene1, gene2, ...]
        const nDataCols = parts.length - 1;
        colToFeatIdx = new Int32Array(nDataCols);
        for (let i = 0; i < nDataCols; i++) {
          const g = parts[i + 1].toLowerCase();
          const fi = featureMap.get(g);
          if (fi === undefined) {
            colToFeatIdx[i] = -1;
          } else {
            colToFeatIdx[i] = fi;
            keepMask[fi] = 1;
          }
        }
        return;
      }
      if (parts.length < colToFeatIdx.length + 1) return;  // short row
      if (rowCount >= capacity) {
        const newCap = Math.ceil(capacity * 1.5) + 1;
        const newX = new Float32Array(newCap * nFeat);
        newX.set(xFlat);
        xFlat = newX;
        capacity = newCap;
      }
      cellIds.push(parts[0]);
      const off = rowCount * nFeat;
      const nDataCols = colToFeatIdx.length;
      for (let i = 0; i < nDataCols; i++) {
        const fi = colToFeatIdx[i];
        if (fi < 0) continue;  // gene not in model — skip
        const v = +parts[i + 1];
        xFlat[off + fi] = (v === v) ? v : 0;
      }
      rowCount++;
    }

    function processTextBuffer(isFinal){
      // leftover already contains any residue; process newline-terminated lines.
      const buf = leftover;
      const len = buf.length;
      let start = 0;
      for (let i = 0; i < len; i++) {
        if (buf.charCodeAt(i) === 10) {  // '\n'
          let end = i;
          if (end > start && buf.charCodeAt(end - 1) === 13) end--;  // strip trailing '\r'
          processLine(buf.substring(start, end));
          start = i + 1;
        }
      }
      leftover = start < len ? buf.substring(start) : "";
      if (isFinal && leftover) {
        // flush final line without trailing newline
        if (leftover.endsWith('\r')) leftover = leftover.substring(0, leftover.length - 1);
        processLine(leftover);
        leftover = "";
      }
      const now = performance.now();
      if (onRowProgress && now - lastTick > 100) {
        lastTick = now;
        onRowProgress(rowCount);
      }
    }

    if (isGz) {
      // Use pako — more lenient than DecompressionStream with multi-member /
      // BGZF-style / padded gzip files produced by some bioinformatics tools.
      await waitForGlobal("pako", 10000);
      const inflator = new pako.Inflate({ chunkSize: 262144 });
      let pakoErr = null;
      inflator.onData = (chunk) => {
        try {
          leftover += decoder.decode(chunk, { stream: true });
          processTextBuffer(false);
        } catch (e) {
          pakoErr = e;
        }
      };
      inflator.push(bytes, true);  // true = end of input
      if (inflator.err && inflator.err !== 1 /* Z_STREAM_END */) {
        throw new Error("Gzip decompression error: " + (inflator.msg || "code " + inflator.err));
      }
      if (pakoErr) throw pakoErr;
      leftover += decoder.decode();  // flush TextDecoder
      processTextBuffer(true);
    } else {
      leftover = decoder.decode(bytes);
      processTextBuffer(true);
    }

    if (colToFeatIdx === null) {
      throw new Error("CSV appears to be empty.");
    }

    let nMatched = 0;
    for (let i = 0; i < nFeat; i++) if (keepMask[i]) nMatched++;
    return {
      cellIds,
      xFlat: xFlat.subarray(0, rowCount * nFeat),
      keepMask,
      nCells: rowCount,
      nFeat,
      nMatched,
    };
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
  let modelReady=false;         // model fetched + parsed in Python + features known in JS
  let modelPromise=null;        // in-flight, for dedupe
  let modelFeatures=null;       // Array<string> lowercased feature names, in model order
  let modelFeatureMap=null;     // Map<string, number> feature-name → index
  let resultUrl=null;

  // Reset model state when selection changes
  $("modelSel").addEventListener("change", ()=>{
    modelReady = false;
    modelPromise = null;
    modelFeatures = null;
    modelFeatureMap = null;
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
      // Reset any leftover state from a previous run
      $("uploadProg").value = 0;
      $("uploadStatus").textContent = "Reading…";
      $("procProg").value = 0;
      $("procStatus").textContent = "Idle";
      $("downloadWrap").style.display = "none";
      if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }

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
      fileName = "";
      $("uploadProg").value = 0;
      $("uploadStatus").textContent = "❌ Upload failed";
      setDisabled("runBtn", true);
      log("❌ File load failed: " + (err?.message || err));
    }
  });

  // ---------- Fetch + parse selected model (called on prefetch / Run) ----------
  // After this runs: /tmp_model has the .npz, Python globals hold the parsed
  // arrays (_coef/_intercept/_classes/_scaler_*/_with_mean/_feat_lower), and
  // JS side has `modelFeatures` + `modelFeatureMap` so CSV parsing can filter
  // columns to only the model's ~2k features.
  async function ensureModelInFS(){
    if (modelReady) return;
    if (modelPromise) return modelPromise;
    if (!libsReady) return; // Python not up yet — don't even start
    const url = getModelURL();
    const modelName = $("modelSel").selectedOptions[0].text;
    modelPromise = (async () => {
      const resp = await fetch(url);
      if(!resp.ok) throw new Error("Model HTTP " + resp.status);
      const buf = new Uint8Array(await resp.arrayBuffer());

      const ok = (buf.length >= 4 && buf[0]===0x50 && buf[1]===0x4B && buf[2]===0x03 && buf[3]===0x04);
      if(!ok) log("⚠️ Model doesn't look like a ZIP (npz) – continuing anyway.");

      FS.writeFile(modelPath, buf);

      // Parse model once and cache parts in Python globals so Run doesn't re-parse.
      await pyodide.runPythonAsync(`
import numpy as np, gzip, io
def _load_npz_any(path):
    try:
        return np.load(path, allow_pickle=True)
    except Exception:
        with gzip.open(path, 'rb') as fh: data = fh.read()
        return np.load(io.BytesIO(data), allow_pickle=True)
_npz = _load_npz_any('/tmp_model')
_feat_arr     = (_npz['features'] if 'features' in _npz.files else _npz['features_']).astype(str)
_feat_lower   = [str(c).lower() for c in _feat_arr]
_coef         = np.asarray(_npz['coef_'],         dtype=np.float32)
_intercept    = np.asarray(_npz['intercept_'],    dtype=np.float32)
_classes      = _npz['classes_']
_scaler_mean  = np.asarray(_npz['scaler_mean_'],  dtype=np.float32)
_scaler_scale = np.asarray(_npz['scaler_scale_'], dtype=np.float32)
_with_mean    = bool(_npz['with_mean'].flat[0]) if _npz['with_mean'].size else True
_npz = None  # release the ZIP reader
`);

      const featList = pyodide.globals.get('_feat_lower').toJs();
      modelFeatures = featList;
      modelFeatureMap = new Map();
      for(let i = 0; i < featList.length; i++) modelFeatureMap.set(featList[i], i);
      modelReady = true;
      log(`🧬 Model: ${modelName} (${(buf.length/1e6).toFixed(2)} MB, ${featList.length} features)`);
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

    // Clear any previous result/download from a prior Run
    $("downloadWrap").style.display = "none";
    if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }

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

      setStage(25, "Parsing CSV");
      const parsed = await parseCsvBytes(fileBytes, modelFeatureMap, modelFeatures.length, (n) => {
        currentMsg = `Parsing CSV (${n.toLocaleString()} rows)`;
      });
      log(`📊 Parsed ${parsed.nCells.toLocaleString()} cells × ${parsed.nMatched.toLocaleString()}/${parsed.nFeat.toLocaleString()} model features matched`);

      if (parsed.nMatched === 0) {
        throw new Error("No overlapping features between input CSV and model. Check that column names are gene symbols/IDs matching the model.");
      }

      setStage(55, "Transferring to Python");
      const xBytes = new Uint8Array(parsed.xFlat.buffer, parsed.xFlat.byteOffset, parsed.xFlat.byteLength);
      FS.writeFile('/tmp_X.bin', xBytes);
      pyodide.globals.set('cell_ids_js',  parsed.cellIds);
      pyodide.globals.set('keep_mask_js', parsed.keepMask);
      pyodide.globals.set('n_cells_js',   parsed.nCells);
      pyodide.globals.set('n_feat_js',    parsed.nFeat);
      // Release large JS-side buffers now that they're in Pyodide/MEMFS
      parsed.xFlat = null;
      parsed.keepMask = null;

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
import numpy as np, sys, os

def stage(pct, msg):
    print(f"__STAGE__:{pct}:{msg}")
    sys.stdout.flush()

# Model already parsed into globals by ensureModelInFS:
#   _coef, _intercept, _classes, _scaler_mean, _scaler_scale, _with_mean
# CSV already filtered to model features by parseCsvBytes; xFlat is
# (n_cells, n_feat) in model feature order. Missing features are zeros,
# and keep_mask_js marks which features have any input.

stage(60, "Loading matrix")
n_cells = int(n_cells_js)
n_feat  = int(n_feat_js)
X2 = np.fromfile('/tmp_X.bin', dtype=np.float32).reshape(n_cells, n_feat)
cell_ids  = [str(c) for c in cell_ids_js]
keep_mask = np.frombuffer(bytes(keep_mask_js), dtype=np.uint8).astype(bool)
matched   = int(keep_mask.sum())
if matched == 0:
    raise ValueError('No overlapping features between input and model.')

# Done with /tmp_X.bin — free MEMFS space.
try: os.remove('/tmp_X.bin')
except Exception: pass

stage(72, "Scaling input")
# In-place scaling: X2 is already writable float32
if _with_mean:
    np.subtract(X2, _scaler_mean, out=X2)
# Multiply by precomputed 1/(scale+eps) — cheaper than division
_inv_scale = (np.float32(1.0) / (_scaler_scale + np.float32(1e-8))).astype(np.float32)
np.multiply(X2, _inv_scale, out=X2)
np.clip(X2, None, np.float32(10.0), out=X2)

# Zero out columns for features not present in input so they contribute 0 to logits
# (matches the keep_mask semantics of the deprecated/original pipeline).
if matched < n_feat:
    X2[:, ~keep_mask] = 0

stage(82, "Computing logits")
logits = X2 @ _coef.T + _intercept
del X2
if logits.ndim == 1:
    logits = np.column_stack([-logits, logits])

stage(90, "Softmax & labels")
z = logits - logits.max(axis=1, keepdims=True)
np.exp(z, out=z)
P = z / z.sum(axis=1, keepdims=True)
del z, logits
idx = np.argmax(P, axis=1)
labels = _classes[idx]
top = P[np.arange(P.shape[0]), idx]
part = np.partition(P, -2, axis=1)[:, -2:]
del P
cert = part[:,1] - part[:,0]

stage(97, "Writing output")
import pandas as pd
out = pd.DataFrame({'cell_id': cell_ids, 'predicted_label': labels, 'conf_score': top, 'cert_score': cert})
out.to_csv('/pred.csv', index=False)
print('DONE', n_cells, 'cells,', len(_classes), 'classes, features_matched=', matched, '/', n_feat)
`;

      await pyodide.runPythonAsync(code);
      const elapsed = fmtElapsed(performance.now() - runT0);
      $("procProg").value = 100;
      $("procStatus").textContent = `Complete • ${elapsed}`;

      // Build output filename: pred_{input_stem}.csv (strip .csv / .gz / .csv.gz)
      const stem = (fileName || "input")
        .replace(/\.(csv\.gz|gz|csv)$/i, "")
        .replace(/[\s/\\]+/g, "_") || "input";
      const outName = `pred_${stem}.csv`;

      const bytes = FS.readFile("/pred.csv");
      const blob  = new Blob([bytes], { type: "text/csv" });
      if(resultUrl){ URL.revokeObjectURL(resultUrl); }
      resultUrl = URL.createObjectURL(blob);
      $("downloadLink").href = resultUrl;
      $("downloadLink").download = outName;
      $("downloadLink").textContent = `Download ${outName}`;
      $("downloadWrap").style.display = "block";
      log(`✅ ${outName} ready in ${elapsed}. Use the link above to download.`);
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
