---
title: Annotate cells
author: S. Kim
date: 2025-10-16
layout: post
---

{% raw %}

<!-- Load Pyodide from the official CDN -->
<script defer src="https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js"></script>

<!-- pako: robust pure-JS gzip decompressor (handles multi-member gzip / BGZF / trailing padding) -->
<script defer src="https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js"></script>

<!-- h5wasm: HDF5 reader compiled to WASM — used to parse .h5ad (AnnData) inputs -->
<script defer src="https://cdn.jsdelivr.net/npm/h5wasm@0.7.8/dist/iife/h5wasm.js"></script>

<!-- Annotation panel styles -->
<style>
  .annot-wrap{
    --accent:#3b82f6;
    --accent-dark:#2563eb;
    --accent-light:#dbeafe;
    --ok:#10b981;
    --ok-dark:#059669;
    --ok-light:#ecfdf5;
    --ok-border:#a7f3d0;
    --err:#ef4444;
    --err-light:#fef2f2;
    --err-border:#fecaca;
    --muted:#6b7280;
    --text:#111827;
    --border:#e5e7eb;
    --border-strong:#d1d5db;
    --bg-panel:#fafbfc;
    max-width:780px;margin:14px auto;
  }
  .annot-wrap .panel{
    background:var(--bg-panel);border:1px solid var(--border);
    border-radius:10px;padding:16px 18px;
  }
  .annot-wrap .ctrl-row{
    display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px;
  }
  .annot-wrap .btn{
    font:inherit;font-size:13px;height:32px;padding:0 14px;box-sizing:border-box;
    border:1px solid var(--border);background:#fff;color:var(--text);
    border-radius:6px;cursor:pointer;line-height:1;
    transition:background .15s,border-color .15s,box-shadow .15s,color .15s;
  }
  .annot-wrap .btn:hover:not(:disabled){
    border-color:var(--border-strong);box-shadow:0 1px 2px rgba(0,0,0,.05);
  }
  .annot-wrap .btn:disabled{
    color:#9ca3af;background:#f3f4f6;border-color:var(--border);cursor:not-allowed;
  }
  .annot-wrap .btn-primary{
    background:var(--accent);border-color:var(--accent);color:#fff;
  }
  .annot-wrap .btn-primary:hover:not(:disabled){
    background:var(--accent-dark);border-color:var(--accent-dark);
  }
  .annot-wrap .btn-primary:disabled{
    background:#bfdbfe;border-color:#bfdbfe;color:#fff;
  }
  .annot-wrap .model-select{
    display:flex;gap:6px;align-items:center;font-size:13px;color:var(--muted);
  }
  .annot-wrap .model-select select{
    font:inherit;font-size:13px;height:32px;padding:0 28px 0 10px;box-sizing:border-box;
    border:1px solid var(--border);background:#fff;color:var(--text);
    border-radius:6px;cursor:pointer;
  }
  .annot-wrap .model-select select:hover{border-color:var(--border-strong);}

  /* Stepper */
  .annot-wrap .stages{
    display:flex;align-items:center;gap:8px;margin:6px 0 10px 0;
    font-size:12px;color:var(--muted);
  }
  .annot-wrap .stage{display:flex;align-items:center;gap:6px;}
  .annot-wrap .stage-dot{
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:2px solid #e5e7eb;display:flex;align-items:center;justify-content:center;
    font-size:9px;color:#fff;line-height:1;transition:all .2s;
  }
  .annot-wrap .stage.active .stage-dot{
    border-color:var(--accent);box-shadow:0 0 0 4px var(--accent-light);
  }
  .annot-wrap .stage.done .stage-dot{
    background:var(--ok);border-color:var(--ok);
  }
  .annot-wrap .stage.done .stage-dot::after{content:"✓";color:#fff;font-weight:700;}
  .annot-wrap .stage.err .stage-dot{
    background:var(--err);border-color:var(--err);
  }
  .annot-wrap .stage.err .stage-dot::after{content:"×";color:#fff;font-weight:700;font-size:11px;}
  .annot-wrap .stage.active .stage-label,
  .annot-wrap .stage.done .stage-label,
  .annot-wrap .stage.err .stage-label{color:var(--text);font-weight:500;}
  .annot-wrap .stage-sep{flex:1;height:1px;background:var(--border);}

  /* Progress bar */
  .annot-wrap progress#progBar{
    width:100%;height:6px;border:none;background:#f3f4f6;border-radius:3px;
    overflow:hidden;display:block;
  }
  .annot-wrap progress#progBar::-webkit-progress-bar{background:#f3f4f6;border-radius:3px;}
  .annot-wrap progress#progBar::-webkit-progress-value{background:var(--accent);border-radius:3px;transition:width .2s;}
  .annot-wrap progress#progBar::-moz-progress-bar{background:var(--accent);border-radius:3px;}
  .annot-wrap .status-line{
    font-size:12px;color:var(--muted);margin:6px 0 0 0;min-height:1em;
  }
  /* Richer two-line status area with tabular elapsed time */
  .annot-wrap .status-box{margin:8px 0 0 0;}
  .annot-wrap .status-main{
    display:flex;justify-content:space-between;align-items:center;gap:12px;
    font-size:13px;color:var(--text);line-height:1.3;
  }
  .annot-wrap .status-msg{
    font-weight:500;display:inline-flex;align-items:center;gap:7px;flex:1;min-width:0;
  }
  .annot-wrap .status-time{
    color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums;
    white-space:nowrap;letter-spacing:.02em;min-width:58px;text-align:right;
  }
  .annot-wrap .status-sub{
    font-size:11px;color:var(--muted);margin-top:3px;min-height:14px;
    font-variant-numeric:tabular-nums;
  }
  /* Live in-progress spinner (only visible while a run is active) */
  @keyframes annotSpin{to{transform:rotate(360deg);}}
  .annot-wrap .status-box[data-state="running"] .status-msg::before{
    content:"";display:inline-block;width:10px;height:10px;flex-shrink:0;
    border:2px solid #e5e7eb;border-top-color:var(--accent);border-radius:50%;
    animation:annotSpin .8s linear infinite;
  }
  .annot-wrap .status-box[data-state="running"] .status-time{color:var(--accent);}
  .annot-wrap .status-box[data-state="done"] .status-msg{color:var(--ok);}
  .annot-wrap .status-box[data-state="err"] .status-msg{color:var(--err);}
  /* Gentle pulse on the currently-active stage dot */
  @keyframes annotPulse{
    0%,100%{box-shadow:0 0 0 4px var(--accent-light);}
    50%{box-shadow:0 0 0 7px rgba(59,130,246,0.10);}
  }
  .annot-wrap .stage.active .stage-dot{animation:annotPulse 1.6s ease-in-out infinite;}

  /* Result card */
  .annot-wrap .result-card{
    margin-top:14px;padding:12px 14px;border-radius:8px;display:flex;
    align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
    background:var(--ok-light);border:1px solid var(--ok-border);
  }
  .annot-wrap .result-card.err{background:var(--err-light);border-color:var(--err-border);}
  .annot-wrap .result-summary{
    font-size:14px;color:var(--text);font-weight:500;flex:1;min-width:200px;
  }
  .annot-wrap .result-summary .stat{
    color:var(--muted);font-weight:400;font-size:12px;margin-left:6px;
  }
  .annot-wrap .btn-download{
    background:var(--ok);border-color:var(--ok);color:#fff;padding:0 10px;height:26px;
    font-size:11px;letter-spacing:.01em;
    display:inline-flex;align-items:center;gap:4px;text-decoration:none;font-weight:500;
    border:1px solid var(--ok);border-radius:5px;transition:background .15s,border-color .15s;
  }
  .annot-wrap .btn-download:hover{background:var(--ok-dark);border-color:var(--ok-dark);color:#fff;text-decoration:none;}

  /* Info meta-panel (same width, calmer) */
  .annot-wrap .meta-panel{
    background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;
    padding:14px 16px;margin:14px 0 0 0;color:var(--text);font-size:13px;
  }
  .annot-wrap .meta-panel code{background:#eef2f7;padding:1px 4px;border-radius:4px;}
  .annot-wrap .meta-panel ol{margin:6px 0 0 20px;}
  .annot-wrap .meta-panel ul{margin:4px 0 0 18px;}
  .annot-wrap .meta-panel li{margin:2px 0;}

  /* Log details */
  .annot-wrap details.log-wrap{margin-top:12px;}
  .annot-wrap details.log-wrap summary{
    cursor:pointer;font-size:12px;color:var(--muted);padding:4px 0;
  }
  .annot-wrap details.log-wrap summary:hover{color:var(--text);}

  @media (max-width:620px){
    .annot-wrap{margin:8px;}
    .annot-wrap .panel{padding:12px;}
    .annot-wrap .stages{font-size:11px;}
    .annot-wrap .model-select{font-size:12px;}
  }

  /* ---------- polish v2 ---------- */
  .annot-wrap .panel{box-shadow:0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.02);}
  .annot-wrap .meta-panel{box-shadow:0 1px 3px rgba(0,0,0,.03);}
  .annot-wrap .btn:focus-visible,
  .annot-wrap .model-select select:focus-visible,
  .annot-wrap .btn-download:focus-visible,
  .annot-wrap .stage:focus-visible{
    outline:2px solid var(--accent);outline-offset:2px;
  }
  .annot-wrap .btn:active:not(:disabled),
  .annot-wrap .btn-primary:active:not(:disabled),
  .annot-wrap .btn-download:active{transform:translateY(1px);}
  .annot-wrap .meta-panel a{color:var(--accent);text-decoration:none;transition:color .15s;}
  .annot-wrap .meta-panel a:hover{text-decoration:underline;color:var(--accent-dark);}
  .annot-wrap .page-caption{
    font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;
    margin:0 0 8px 4px;display:flex;align-items:center;gap:6px;
  }
  .annot-wrap .page-caption .dot{width:5px;height:5px;border-radius:50%;background:var(--accent);display:inline-block;}
  .annot-wrap .result-card{position:relative;padding-left:54px;}
  .annot-wrap .result-card::before{
    content:"✓";position:absolute;left:14px;top:12px;
    width:28px;height:28px;border-radius:50%;background:var(--ok);color:#fff;
    display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;
  }
  .annot-wrap .result-card.err::before{content:"×";background:var(--err);font-size:18px;}
</style>

<div class="annot-wrap">

<div class="page-caption"><span class="dot"></span>Interactive · PANGEA</div>

<!-- Interactive panel: controls + stepper + progress + result -->
<div class="panel">
  <div class="ctrl-row">
    <label for="csvInput" style="display:inline-block;">
      <input type="file" id="csvInput" accept=".csv,.gz,.csv.gz,.h5ad,.h5,text/csv,application/gzip,application/x-gzip,application/x-hdf5,application/octet-stream" style="display:none;">
      <button class="btn" id="loadFileBtn" type="button" disabled>Load file</button>
    </label>

    <label class="model-select">
      <span>Model</span>
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

    <button class="btn btn-primary" id="runBtn" type="button" disabled>Annotate</button>
  </div>

  <!-- Stepper: Upload → Parse → Annotate -->
  <div class="stages" id="stages">
    <span class="stage" id="stage-upload"><span class="stage-dot"></span><span class="stage-label">Upload</span></span>
    <span class="stage-sep"></span>
    <span class="stage" id="stage-parse"><span class="stage-dot"></span><span class="stage-label">Parse</span></span>
    <span class="stage-sep"></span>
    <span class="stage" id="stage-annotate"><span class="stage-dot"></span><span class="stage-label">Annotate</span></span>
  </div>

  <!-- Unified progress + rich status (main message · elapsed time · sub-detail) -->
  <progress id="progBar" max="100" value="0"></progress>
  <div class="status-box" id="statusBox" data-state="idle">
    <div class="status-main">
      <span class="status-msg" id="progMsg">Waiting for file…</span>
      <span class="status-time" id="progTime">—</span>
    </div>
    <div class="status-sub" id="progSub"></div>
  </div>

  <!-- Result card (success or error) -->
  <div class="result-card" id="resultCard" style="display:none;">
    <div class="result-summary" id="resultSummary"></div>
    <a class="btn-download" id="downloadLink" download="pred.csv" style="display:none;">⬇ Download</a>
  </div>
</div>

<!-- Info panel -->
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
        <li>Supported formats: <code>.csv</code>, <strong><code>.csv.gz</code></strong> (recommended for fastest upload), or <code>.h5ad</code> (AnnData / HDF5)<br>
            <small>For <code>.h5ad</code>: gene names are read from <code>var/_index</code> (or whichever column <code>var.attrs._index</code> points to); cell IDs from <code>obs/_index</code>; the X matrix is auto-detected as dense or sparse (CSR / CSC).</small>
        </li>
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

<!-- Log (collapsed by default) -->
<details class="log-wrap">
  <summary>Log</summary>
  <pre id="log" style="
    background:#0a0f17;
    color:#e8eef7;
    padding:8px 10px;
    border-radius:6px;
    overflow:auto;
    height:200px;
    white-space:pre-wrap;
    font-size:11px;
    line-height:1.3;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    margin-top:6px;">
  </pre>
</details>

</div><!-- /.annot-wrap -->

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
  // ---------- Stage indicator ----------
  function setStageState(name, state){
    const el = $("stage-" + name); if(!el) return;
    el.classList.remove("active","done","err");
    if(state && state !== "pending") el.classList.add(state);
  }
  function resetStages(){
    setStageState("upload", "pending");
    setStageState("parse", "pending");
    setStageState("annotate", "pending");
  }
  function hideResultCard(){
    $("resultCard").style.display = "none";
    $("resultCard").classList.remove("err");
    $("downloadLink").style.display = "none";
    $("resultSummary").textContent = "";
  }
  function showResult(kind, summaryHtml, downloadHref, downloadName){
    const card = $("resultCard");
    card.style.display = "flex";
    card.classList.toggle("err", kind === "err");
    $("resultSummary").innerHTML = summaryHtml;
    if(downloadHref){
      const link = $("downloadLink");
      link.href = downloadHref;
      link.download = downloadName || "pred.csv";
      link.textContent = "⬇ Download " + (downloadName || "pred.csv");
      link.style.display = "inline-flex";
    } else {
      $("downloadLink").style.display = "none";
    }
  }

  function readFileWithProgress(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      let last = performance.now(), lastLoaded = 0;
      reader.onprogress = (e)=>{
        if(e.lengthComputable){
          const pct = Math.round((e.loaded/e.total)*100);
          $("progBar").value = pct;
          const now = performance.now();
          const rate = (e.loaded-lastLoaded)/((now-last)/1000);
          $("progMsg").textContent = "Reading file";
          $("progSub").textContent = `${pct}% · ${(rate/1048576).toFixed(2)} MB/s`;
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

  // ---------- File-type detection ----------
  // HDF5 magic bytes at offset 0: 0x89 'H' 'D' 'F' '\r' '\n' 0x1a '\n'
  function isHDF5(bytes){
    return bytes.length >= 8
        && bytes[0] === 0x89 && bytes[1] === 0x48 && bytes[2] === 0x44 && bytes[3] === 0x46
        && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  function isGzip(bytes){
    return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  }

  // ---------- h5ad (AnnData) parser ----------
  // Reads a .h5ad file via h5wasm. Extracts gene names from var/_index, cell
  // IDs from obs/_index, and the X matrix (dense or CSR/CSC sparse). Builds the
  // same {cellIds, xFlat, keepMask, nCells, nFeat, nMatched} shape as parseCsvBytes.
  let _h5wasmReadyPromise = null;
  async function ensureH5wasm(){
    if (_h5wasmReadyPromise) return _h5wasmReadyPromise;
    await waitForGlobal("h5wasm", 15000);
    _h5wasmReadyPromise = h5wasm.ready.then(() => h5wasm);
    return _h5wasmReadyPromise;
  }

  function _h5IndexColumn(group, fallback){
    // AnnData stores the row-name column under group.attrs._index
    try {
      const a = group.attrs && group.attrs['_index'];
      if (a && a.value) return Array.isArray(a.value) ? a.value[0] : a.value;
    } catch(_) {}
    return fallback;
  }
  function _h5ReadStringArray(file, path){
    const ds = file.get(path);
    if (!ds) throw new Error("h5: missing dataset " + path);
    const v = ds.value;
    return Array.isArray(v) ? v.map(String) : Array.from(v, String);
  }

  async function parseH5adBytes(bytes, featureMap, nFeat, onRowProgress){
    const lib = await ensureH5wasm();
    const tmpName = "input.h5ad";
    // Write the bytes to h5wasm's virtual FS; clean up on exit.
    try { lib.FS.unlink("/" + tmpName); } catch(_) {}
    lib.FS.writeFile("/" + tmpName, bytes);
    const file = new lib.File("/" + tmpName, "r");
    let xFlat = null;
    let keepMask = null;
    let cellIds = [];
    let nCells = 0;
    try {
      // ---- gene names from var ----
      const varGroup = file.get("var");
      if (!varGroup) throw new Error("h5ad: missing /var group");
      const geneCol = _h5IndexColumn(varGroup, "_index");
      const geneNames = _h5ReadStringArray(file, "var/" + geneCol);

      // ---- cell IDs from obs ----
      const obsGroup = file.get("obs");
      if (!obsGroup) throw new Error("h5ad: missing /obs group");
      const cellCol = _h5IndexColumn(obsGroup, "_index");
      cellIds = _h5ReadStringArray(file, "obs/" + cellCol);
      nCells = cellIds.length;

      // ---- build column → feature index map ----
      keepMask = new Uint8Array(nFeat);
      const colToFeatIdx = new Int32Array(geneNames.length);
      for (let i = 0; i < geneNames.length; i++) {
        const g = String(geneNames[i] || "").toLowerCase();
        const fi = featureMap.get(g);
        if (fi === undefined) {
          colToFeatIdx[i] = -1;
        } else {
          colToFeatIdx[i] = fi;
          keepMask[fi] = 1;
        }
      }

      // ---- X matrix: dense Dataset OR sparse Group (CSR / CSC) ----
      const X = file.get("X");
      if (!X) throw new Error("h5ad: missing /X");
      xFlat = new Float32Array(nCells * nFeat);   // pre-sized; missing entries stay 0

      const isGroup = X.constructor && X.constructor.name === "Group";
      if (!isGroup) {
        // ----- dense -----
        const shape = X.shape || [nCells, geneNames.length];
        const totalGenes = shape[1];
        const data = X.value;        // typed array, length = shape[0] * shape[1]
        for (let r = 0; r < nCells; r++) {
          const offSrc = r * totalGenes;
          const offDst = r * nFeat;
          for (let c = 0; c < totalGenes; c++) {
            const fi = colToFeatIdx[c];
            if (fi < 0) continue;
            const v = data[offSrc + c];
            if (v) xFlat[offDst + fi] = v;
          }
          if (onRowProgress && (r % 200 === 0)) onRowProgress(r);
        }
      } else {
        // ----- sparse -----
        let enc = "csr_matrix";
        try {
          const a = X.attrs && X.attrs["encoding-type"];
          if (a && a.value) enc = String(Array.isArray(a.value) ? a.value[0] : a.value);
        } catch(_) {}
        const data    = file.get("X/data").value;
        const indices = file.get("X/indices").value;
        const indptr  = file.get("X/indptr").value;
        if (enc.indexOf("csr") !== -1) {
          // CSR: indptr indexes by row (cell)
          for (let r = 0; r < nCells; r++) {
            const start = indptr[r];
            const end   = indptr[r + 1];
            const offDst = r * nFeat;
            for (let k = start; k < end; k++) {
              const fi = colToFeatIdx[indices[k]];
              if (fi < 0) continue;
              xFlat[offDst + fi] = data[k];
            }
            if (onRowProgress && (r % 200 === 0)) onRowProgress(r);
          }
        } else {
          // CSC: indptr indexes by column (gene); indices are row indices
          const nGenes = colToFeatIdx.length;
          for (let c = 0; c < nGenes; c++) {
            const fi = colToFeatIdx[c];
            if (fi < 0) continue;
            const start = indptr[c];
            const end   = indptr[c + 1];
            for (let k = start; k < end; k++) {
              const r = indices[k];
              xFlat[r * nFeat + fi] = data[k];
            }
            if (onRowProgress && (c % 1000 === 0)) onRowProgress(Math.min(nCells, c));
          }
        }
      }
    } finally {
      try { file.close(); } catch(_) {}
      try { lib.FS.unlink("/" + tmpName); } catch(_) {}
    }

    let nMatched = 0;
    for (let i = 0; i < nFeat; i++) if (keepMask[i]) nMatched++;
    return { cellIds, xFlat, keepMask, nCells, nFeat, nMatched };
  }

  // Dispatcher: pick the right parser by magic bytes.
  async function parseInputBytes(bytes, featureMap, nFeat, onRowProgress){
    if (isHDF5(bytes)) {
      return await parseH5adBytes(bytes, featureMap, nFeat, onRowProgress);
    }
    // Default: CSV (plain or gzipped)
    return await parseCsvBytes(bytes, featureMap, nFeat, onRowProgress);
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

  // ---------- BOOT (auto-run at page load) ----------
  async function boot(){
    try{
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
    }
  }

  // ---------- LOAD FILE ----------
  $("loadFileBtn").addEventListener("click", ()=>{
    if(!pyReady){ alert("Please wait until the setup finishes."); return; }
    $("csvInput").click();
  });

  $("csvInput").addEventListener("change", async (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f){ return; }
    try{
      // Reset leftover state from any previous run
      resetStages();
      setStageState("upload", "active");
      $("progBar").value = 0;
      $("progMsg").textContent = "Reading file…";
      $("progSub").textContent = "";
      $("progTime").textContent = "—";
      $("statusBox").dataset.state = "idle";
      hideResultCard();
      if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }

      fileBytes = await readFileWithProgress(f);
      fileName = f.name;
      uploaded = true;
      setStageState("upload", "done");
      $("progBar").value = 100;
      $("progMsg").textContent = "File ready";
      $("progSub").textContent = `${f.name} · ${(fileBytes.length/1e6).toFixed(2)} MB`;
      log(`📁 ${f.name} (${(fileBytes.length/1e6).toFixed(2)} MB)`);
      setDisabled("runBtn", !libsReady);
    }catch(err){
      uploaded = false;
      fileBytes = null;
      fileName = "";
      setStageState("upload", "err");
      $("progBar").value = 0;
      $("progMsg").textContent = "Upload failed";
      $("progSub").textContent = "";
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
    // Live-tick format: always show hundredths so the last digit always moves.
    const s = ms / 1000;
    if(s < 60) return `${s.toFixed(2)} s`;
    const m = Math.floor(s/60), r = s - m*60;
    return `${m}m ${r.toFixed(2)}s`;
  }

  $("runBtn").addEventListener("click", async ()=>{
    if(!uploaded || !fileBytes){ alert("Load an input file first."); return; }
    if(!libsReady){ alert("Please wait until the setup finishes."); return; }

    const runT0 = performance.now();
    // Mark status as actively running → spinner appears, timer colored accent.
    $("statusBox").dataset.state = "running";
    // Tick the elapsed timer every 50ms so hundredths digit is always moving.
    const tickTimer = setInterval(()=>{
      $("progTime").textContent = fmtElapsed(performance.now() - runT0);
    }, 50);
    const setStage = (pct, msg, sub) => {
      $("progBar").value = pct;
      $("progMsg").textContent = msg;
      if (sub !== undefined) $("progSub").textContent = sub;
      $("progTime").textContent = fmtElapsed(performance.now() - runT0);
    };
    const setSub = (sub) => { $("progSub").textContent = sub; };

    // Clear any previous result/download from a prior Run, reset stages past Upload
    hideResultCard();
    if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }
    setStageState("upload", "done");  // upload is already done if we got here
    setStageState("parse", "pending");
    setStageState("annotate", "pending");

    setStage(5, "Starting…", "preparing pipeline");
    log("▶️ Running annotation …");

    let unhookOut = null, unhookErr = null;
    let parsedNCells = 0, parsedNMatched = 0;
    try {
      setStageState("parse", "active");
      setStage(10, "Fetching model…", "downloading .npz if not cached");
      try {
        await ensureModelInFS();
      } catch(err) {
        clearInterval(tickTimer);
        setStageState("parse", "err");
        $("statusBox").dataset.state = "err";
        showResult("err", `❌ Model fetch error: ${err?.message || err}`);
        log("❌ Model fetch error: " + (err?.message || err));
        return;
      }

      const isH5ad = isHDF5(fileBytes);
      setStage(25, isH5ad ? "Parsing .h5ad…" : "Parsing CSV…",
               isH5ad ? "reading HDF5 datasets" : "decompressing & reading rows");
      const parsed = await parseInputBytes(fileBytes, modelFeatureMap, modelFeatures.length, (n) => {
        setSub(`${isH5ad ? "decoding" : "parsing"} · ${n.toLocaleString()} ${isH5ad ? "cells" : "rows"} so far`);
      });
      parsedNCells = parsed.nCells;
      parsedNMatched = parsed.nMatched;
      log(`📊 Parsed ${parsed.nCells.toLocaleString()} cells × ${parsed.nMatched.toLocaleString()}/${parsed.nFeat.toLocaleString()} model features matched`);

      if (parsed.nMatched === 0) {
        throw new Error("No overlapping features between input and model. Check that gene names/IDs match the model's feature set.");
      }

      setStage(55, "Transferring to Python…",
        `${parsed.nCells.toLocaleString()} cells · ${parsed.nMatched.toLocaleString()}/${parsed.nFeat.toLocaleString()} features matched`);
      const xBytes = new Uint8Array(parsed.xFlat.buffer, parsed.xFlat.byteOffset, parsed.xFlat.byteLength);
      FS.writeFile('/tmp_X.bin', xBytes);
      pyodide.globals.set('cell_ids_js',  parsed.cellIds);
      pyodide.globals.set('keep_mask_js', parsed.keepMask);
      pyodide.globals.set('n_cells_js',   parsed.nCells);
      pyodide.globals.set('n_feat_js',    parsed.nFeat);
      // Release large JS-side buffers now that they're in Pyodide/MEMFS
      parsed.xFlat = null;
      parsed.keepMask = null;

      // Parse phase is now complete; Python is about to take over.
      setStageState("parse", "done");
      setStageState("annotate", "active");

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

stage(60, "Loading metadata…")
n_cells = int(n_cells_js)
n_feat  = int(n_feat_js)
cell_ids  = [str(c) for c in cell_ids_js]
keep_mask = np.frombuffer(bytes(keep_mask_js), dtype=np.uint8).astype(bool)
matched   = int(keep_mask.sum())
if matched == 0:
    raise ValueError('No overlapping features between input and model.')

# Pre-compute reciprocal scale once (outside the batch loop).
_inv_scale = (np.float32(1.0) / (_scaler_scale + np.float32(1e-8))).astype(np.float32)
n_classes  = _coef.shape[0]
bytes_per_row = n_feat * 4

# Pick a batch size that keeps the per-batch X2 below ~200 MB. This avoids the
# numpy "array is too big" cap (≈2 GB on 32-bit WASM) that bites for large
# inputs (e.g. 50k+ cells × ~17k features). The whole input never has to
# exist as one numpy array — we reshape one batch at a time directly from
# /tmp_X.bin via np.fromfile(count=..., offset=...).
BYTES_PER_BATCH = 200 * 1024 * 1024
batch_size = max(256, min(n_cells, BYTES_PER_BATCH // max(1, bytes_per_row)))
n_batches  = (n_cells + batch_size - 1) // batch_size

# Per-cell results — small (n_cells × scalar each).
all_labels = np.empty(n_cells, dtype=object)
all_top    = np.empty(n_cells, dtype=np.float32)
all_cert   = np.empty(n_cells, dtype=np.float32)

for b in range(n_batches):
    start = b * batch_size
    end   = min(start + batch_size, n_cells)
    sz    = end - start
    pct   = 65 + int(30 * (start / max(1, n_cells)))
    stage(pct, f"Predicting batch {b+1}/{n_batches} (cells {start}–{end})…")

    # Read just this slice from disk — never the whole matrix.
    X2 = np.fromfile('/tmp_X.bin', dtype=np.float32,
                     count=sz * n_feat,
                     offset=start * bytes_per_row).reshape(sz, n_feat)
    X2 = np.ascontiguousarray(X2)   # ensure writable, contiguous

    # Scale in-place
    if _with_mean:
        np.subtract(X2, _scaler_mean, out=X2)
    np.multiply(X2, _inv_scale, out=X2)
    np.clip(X2, None, np.float32(10.0), out=X2)
    if matched < n_feat:
        X2[:, ~keep_mask] = 0

    # Logits → softmax → argmax (per batch only)
    logits = X2 @ _coef.T + _intercept
    del X2
    if logits.ndim == 1:
        logits = np.column_stack([-logits, logits])

    z = logits - logits.max(axis=1, keepdims=True)
    np.exp(z, out=z)
    P = z / z.sum(axis=1, keepdims=True)
    del z, logits
    idx = np.argmax(P, axis=1)
    all_labels[start:end] = _classes[idx]
    all_top[start:end]    = P[np.arange(P.shape[0]), idx]
    part = np.partition(P, -2, axis=1)[:, -2:]
    all_cert[start:end]   = part[:, 1] - part[:, 0]
    del P, idx, part

# Free the staging file
try: os.remove('/tmp_X.bin')
except Exception: pass

stage(97, "Writing output…")
import pandas as pd
out = pd.DataFrame({'cell_id': cell_ids,
                    'predicted_label': all_labels,
                    'conf_score': all_top,
                    'cert_score': all_cert})
out.to_csv('/pred.csv', index=False)
print('DONE', n_cells, 'cells,', n_classes, 'classes, features_matched=', matched, '/', n_feat,
      '· batches=', n_batches, '· batch_size=', batch_size)
`;

      await pyodide.runPythonAsync(code);
      const elapsed = fmtElapsed(performance.now() - runT0);
      $("progBar").value = 100;
      $("progMsg").textContent = "Complete";
      $("progSub").textContent = `${parsedNCells.toLocaleString()} cells · ${parsedNMatched.toLocaleString()} features used`;
      $("progTime").textContent = elapsed;
      $("statusBox").dataset.state = "done";
      setStageState("annotate", "done");

      // Build output filename: pred_{input_stem}.csv (strip .csv / .gz / .csv.gz)
      const stem = (fileName || "input")
        .replace(/\.(csv\.gz|gz|csv)$/i, "")
        .replace(/[\s/\\]+/g, "_") || "input";
      const outName = `pred_${stem}.csv`;

      const bytes = FS.readFile("/pred.csv");
      const blob  = new Blob([bytes], { type: "text/csv" });
      if(resultUrl){ URL.revokeObjectURL(resultUrl); }
      resultUrl = URL.createObjectURL(blob);

      const summary = `${parsedNCells.toLocaleString()} cells annotated
        <span class="stat">${parsedNMatched.toLocaleString()} features · ${elapsed}</span>`;
      showResult("ok", summary, resultUrl, outName);
      log(`✅ ${outName} ready in ${elapsed}.`);
    } catch(err) {
      const elapsed = fmtElapsed(performance.now() - runT0);
      $("progMsg").textContent = "Error";
      $("progSub").textContent = (err?.message || String(err)).slice(0, 200);
      $("progTime").textContent = elapsed;
      $("statusBox").dataset.state = "err";
      // Mark whichever stage is currently active as failed
      const active = document.querySelector(".annot-wrap .stage.active");
      if (active) { active.classList.remove("active"); active.classList.add("err"); }
      showResult("err", `${err?.message || err} <span class="stat">after ${elapsed}</span>`);
      log(`❌ Run error after ${elapsed}: ` + (err?.message || err));
    } finally {
      clearInterval(tickTimer);
      try{ unhookOut && unhookOut(); }catch(_){}
      try{ unhookErr && unhookErr(); }catch(_){}
    }
  });

  // Set initial stage state
  resetStages();

  // Auto-boot: this script is inline to the annotate page, so it only runs here.
  boot();
})();
</script>

{% endraw %}
