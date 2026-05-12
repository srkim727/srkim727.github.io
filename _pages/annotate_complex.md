---
title: Annotate cells (latest)
author: S. Kim
date: 2025-10-15
layout: post
---

{% raw %}

<!-- Load Pyodide from the official CDN -->
<script defer src="https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js"></script>

<!-- pako: robust pure-JS gzip decompressor (handles multi-member gzip / BGZF / trailing padding) -->
<script defer src="https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js"></script>

<!-- h5wasm: HDF5 reader compiled to WASM — used to parse .h5ad (AnnData) inputs -->
<script defer src="https://cdn.jsdelivr.net/npm/h5wasm@0.7.8/dist/iife/h5wasm.js"></script>

<!-- Annotation panel styles (shared with /pages/annotate/) -->
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
  .annot-wrap .pipeline-tag{
    display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);
    margin-left:auto;padding:0 8px;height:32px;border:1px dashed var(--border);
    border-radius:6px;background:#fff;
  }
  .annot-wrap .pipeline-tag strong{color:var(--text);font-weight:600;}

  /* Stepper */
  .annot-wrap .stages{
    display:flex;align-items:center;gap:6px;margin:6px 0 10px 0;
    font-size:12px;color:var(--muted);flex-wrap:wrap;
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
  .annot-wrap .stage-sep{flex:1;height:1px;background:var(--border);min-width:12px;}

  /* Progress bar */
  .annot-wrap progress#progBar{
    width:100%;height:6px;border:none;background:#f3f4f6;border-radius:3px;
    overflow:hidden;display:block;
  }
  .annot-wrap progress#progBar::-webkit-progress-bar{background:#f3f4f6;border-radius:3px;}
  .annot-wrap progress#progBar::-webkit-progress-value{background:var(--accent);border-radius:3px;transition:width .2s;}
  .annot-wrap progress#progBar::-moz-progress-bar{background:var(--accent);border-radius:3px;}
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
  @keyframes annotSpin{to{transform:rotate(360deg);}}
  .annot-wrap .status-box[data-state="running"] .status-msg::before{
    content:"";display:inline-block;width:10px;height:10px;flex-shrink:0;
    border:2px solid #e5e7eb;border-top-color:var(--accent);border-radius:50%;
    animation:annotSpin .8s linear infinite;
  }
  .annot-wrap .status-box[data-state="running"] .status-time{color:var(--accent);}
  .annot-wrap .status-box[data-state="done"] .status-msg{color:var(--ok);}
  .annot-wrap .status-box[data-state="err"] .status-msg{color:var(--err);}
  @keyframes annotPulse{
    0%,100%{box-shadow:0 0 0 4px var(--accent-light);}
    50%{box-shadow:0 0 0 7px rgba(59,130,246,0.10);}
  }
  .annot-wrap .stage.active .stage-dot{animation:annotPulse 1.6s ease-in-out infinite;}

  /* Level2 group breakdown */
  .annot-wrap .l2-list{
    margin-top:10px;border:1px solid var(--border);border-radius:8px;
    background:#fff;font-size:12px;display:none;overflow:hidden;
  }
  .annot-wrap .l2-list.show{display:block;}
  .annot-wrap .l2-row{
    display:flex;align-items:center;gap:10px;padding:6px 10px;
    border-bottom:1px solid var(--border);
  }
  .annot-wrap .l2-row:last-child{border-bottom:none;}
  .annot-wrap .l2-row .l2-name{flex:1;color:var(--text);font-weight:500;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
  .annot-wrap .l2-row .l2-count{
    color:var(--muted);font-variant-numeric:tabular-nums;min-width:80px;text-align:right;
  }
  .annot-wrap .l2-row .l2-state{
    width:14px;height:14px;border-radius:50%;background:#fff;border:2px solid #e5e7eb;
    flex-shrink:0;font-size:9px;color:#fff;display:flex;align-items:center;justify-content:center;
  }
  .annot-wrap .l2-row.skip{opacity:.5;}
  .annot-wrap .l2-row.skip .l2-state{border-style:dashed;}
  .annot-wrap .l2-row.active .l2-state{
    border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-light);
    animation:annotPulse 1.6s ease-in-out infinite;
  }
  .annot-wrap .l2-row.done .l2-state{background:var(--ok);border-color:var(--ok);}
  .annot-wrap .l2-row.done .l2-state::after{content:"✓";}
  .annot-wrap .l2-row.err .l2-state{background:var(--err);border-color:var(--err);}
  .annot-wrap .l2-row.err .l2-state::after{content:"×";font-size:10px;}

  /* Result card */
  .annot-wrap .result-card{
    margin-top:14px;display:flex;
    align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
  }
  .annot-wrap .result-card.err{
    padding:12px 14px;border-radius:8px;
    background:var(--err-light);border:1px solid var(--err-border);
  }
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

  /* ---------- Meta-prediction result panel ---------- */
  .annot-wrap .meta-result{
    margin-top:14px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;
    background:#fff;display:none;
  }
  .annot-wrap .meta-result.show{display:block;}
  .annot-wrap .meta-result h4{
    margin:0 0 6px 0;font-size:13px;font-weight:600;color:var(--text);
    display:flex;align-items:center;gap:8px;
  }
  .annot-wrap .meta-result .h4-note{
    font-size:12px;color:var(--muted);font-weight:400;
  }
  .annot-wrap .meta-result .meta-section{
    margin-top:12px;padding-top:10px;border-top:1px dashed var(--border);
  }
  .annot-wrap .meta-result .meta-section:first-of-type{border-top:none;padding-top:0;margin-top:8px;}
  .annot-wrap .meta-section-title{
    font-size:12px;font-weight:600;color:var(--text);
    margin-bottom:6px;display:flex;align-items:baseline;gap:8px;
  }
  .annot-wrap .meta-section-title .sub-note{
    font-weight:400;font-size:12px;color:var(--muted);
  }
  .annot-wrap .meta-top{
    font-size:13px;font-weight:600;color:var(--text);display:flex;align-items:baseline;gap:8px;
    margin-bottom:6px;
  }
  .annot-wrap .meta-top .meta-prob{
    font-weight:500;color:var(--accent);font-size:12px;font-variant-numeric:tabular-nums;
  }
  .annot-wrap .meta-sep{
    margin:14px 0 12px 0;border-top:1px solid var(--border);
  }
  .annot-wrap table.meta-probs{
    width:100% !important;border-collapse:collapse !important;
    font-size:12px !important;font-variant-numeric:tabular-nums;
    table-layout:fixed;margin:0 !important;
  }
  .annot-wrap table.meta-probs td{
    padding:6px 10px !important;vertical-align:middle !important;
    border:none !important;border-bottom:1px solid var(--border) !important;
    font-size:12px !important;line-height:1.4 !important;background:transparent !important;
  }
  .annot-wrap table.meta-probs tr:last-child td{border-bottom:none !important;}
  .annot-wrap table.meta-probs .pb-name{
    color:var(--text);font-family:ui-monospace,SFMono-Regular,Menlo,monospace !important;
    white-space:nowrap !important;overflow:hidden;text-overflow:ellipsis;width:38%;
  }
  .annot-wrap table.meta-probs .pb-bar-cell{width:auto;}
  .annot-wrap table.meta-probs .pb-bar{
    position:relative;height:10px;background:#f3f4f6;border-radius:3px;overflow:hidden;
  }
  .annot-wrap table.meta-probs .pb-fill{
    position:absolute;left:0;top:0;height:100%;background:var(--accent-light);border-radius:3px;
    transition:width .25s ease-out;
  }
  .annot-wrap table.meta-probs tr.top .pb-fill{background:var(--accent);}
  .annot-wrap table.meta-probs .pb-pct{
    width:64px;text-align:right !important;color:var(--muted);white-space:nowrap !important;
  }
  .annot-wrap table.meta-probs tr.top .pb-name{font-weight:600;color:var(--text);}
  .annot-wrap table.meta-probs tr.top .pb-pct{color:var(--accent);font-weight:600;}

  .annot-wrap .meta-warn{
    font-size:12px;color:#92400e;padding:8px 10px;background:#fef9e7;
    border:1px solid #fde68a;border-radius:6px;margin-top:4px;
  }

  /* Top abundant cell types */
  .annot-wrap table.abund-list{
    width:100% !important;border-collapse:collapse !important;
    font-size:12px !important;font-variant-numeric:tabular-nums;
    table-layout:fixed;margin:0 !important;
  }
  .annot-wrap table.abund-list td{
    padding:6px 10px !important;vertical-align:middle !important;
    border:none !important;border-bottom:1px solid var(--border) !important;
    font-size:12px !important;line-height:1.4 !important;background:transparent !important;
  }
  .annot-wrap table.abund-list tr:last-child td{border-bottom:none !important;}
  .annot-wrap table.abund-list .rank{color:var(--muted);width:24px;text-align:right !important;}
  .annot-wrap table.abund-list .name{
    color:var(--text);font-family:ui-monospace,SFMono-Regular,Menlo,monospace !important;
    white-space:nowrap !important;overflow:hidden;text-overflow:ellipsis;
  }
  .annot-wrap table.abund-list .pct-cell{width:34%;}
  .annot-wrap table.abund-list .pb-bar{
    position:relative;height:10px;background:#f3f4f6;border-radius:3px;overflow:hidden;
  }
  .annot-wrap table.abund-list .pb-fill{
    position:absolute;left:0;top:0;height:100%;background:var(--accent-light);border-radius:3px;
  }
  .annot-wrap table.abund-list tr.top .pb-fill{background:var(--accent);}
  .annot-wrap table.abund-list .pct{
    width:64px;text-align:right !important;color:var(--muted);white-space:nowrap !important;
  }
  .annot-wrap table.abund-list .count{
    width:72px;text-align:right !important;color:var(--muted);white-space:nowrap !important;
  }
  .annot-wrap table.abund-list tr.top .name{font-weight:600;color:var(--text);}
  .annot-wrap table.abund-list tr.top .pct{color:var(--accent);font-weight:600;}

  /* Expandable "show all" PG_annotations list */
  .annot-wrap details.abund-all{margin-top:6px;}
  .annot-wrap details.abund-all > summary{
    cursor:pointer;font-size:12px;color:var(--muted);padding:6px 2px;
    user-select:none;list-style:none;display:flex;align-items:center;gap:6px;
  }
  .annot-wrap details.abund-all > summary::-webkit-details-marker{display:none;}
  .annot-wrap details.abund-all > summary::before{
    content:"▸";display:inline-block;color:var(--muted);transition:transform .15s;
    font-size:10px;width:10px;text-align:center;
  }
  .annot-wrap details.abund-all[open] > summary::before{transform:rotate(90deg);}
  .annot-wrap details.abund-all > summary:hover{color:var(--text);}
  .annot-wrap details.abund-all[open] > summary{color:var(--text);font-weight:500;}
  .annot-wrap .abund-all-wrap{
    max-height:320px;overflow-y:auto;border:1px solid var(--border);
    border-radius:6px;margin-top:4px;
  }

  /* Info meta-panel */
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
    .annot-wrap .pipeline-tag{margin-left:0;margin-top:6px;}
  }

  /* ---------- polish ---------- */
  .annot-wrap .panel{box-shadow:0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.02);}
  .annot-wrap .meta-panel{box-shadow:0 1px 3px rgba(0,0,0,.03);}
  .annot-wrap .btn:focus-visible,
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
  .annot-wrap .result-card.err{position:relative;padding-left:54px;}
  .annot-wrap .result-card.err::before{
    content:"×";position:absolute;left:14px;top:12px;
    width:28px;height:28px;border-radius:50%;background:var(--err);color:#fff;
    display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;
  }
</style>

<div class="annot-wrap">

<div class="page-caption"><span class="dot"></span>Hierarchical · PANGEA</div>

<!-- Interactive panel: controls + stepper + progress + result -->
<div class="panel">
  <div class="ctrl-row">
    <label for="csvInput" style="display:inline-block;">
      <input type="file" id="csvInput" accept=".csv,.gz,.csv.gz,.h5ad,.h5,text/csv,application/gzip,application/x-gzip,application/x-hdf5,application/octet-stream" style="display:none;">
      <button class="btn" id="loadFileBtn" type="button" disabled>Load file</button>
    </label>

    <button class="btn btn-primary" id="runBtn" type="button" disabled>Annotate (hierarchical)</button>
  </div>

  <!-- Stepper: Upload → Parse → Level1 → Level2 → Meta → Output -->
  <div class="stages" id="stages">
    <span class="stage" id="stage-upload"><span class="stage-dot"></span><span class="stage-label">Upload</span></span>
    <span class="stage-sep"></span>
    <span class="stage" id="stage-parse"><span class="stage-dot"></span><span class="stage-label">Parse</span></span>
    <span class="stage-sep"></span>
    <span class="stage" id="stage-level1"><span class="stage-dot"></span><span class="stage-label">Level1</span></span>
    <span class="stage-sep"></span>
    <span class="stage" id="stage-level2"><span class="stage-dot"></span><span class="stage-label">Level2</span></span>
    <span class="stage-sep"></span>
    <span class="stage" id="stage-meta"><span class="stage-dot"></span><span class="stage-label">Meta</span></span>
    <span class="stage-sep"></span>
    <span class="stage" id="stage-output"><span class="stage-dot"></span><span class="stage-label">Output</span></span>
  </div>

  <progress id="progBar" max="100" value="0"></progress>
  <div class="status-box" id="statusBox" data-state="idle">
    <div class="status-main">
      <span class="status-msg" id="progMsg">Waiting for file…</span>
      <span class="status-time" id="progTime">—</span>
    </div>
    <div class="status-sub" id="progSub"></div>
  </div>

  <!-- Per-Level2-model progress breakdown (populated after Level1) -->
  <div class="l2-list" id="l2List"></div>

  <!-- Result card (success or error) -->
  <div class="result-card" id="resultCard" style="display:none;">
    <div class="result-summary" id="resultSummary"></div>
    <a class="btn-download" id="downloadLink" download="pred.csv" style="display:none;">⬇ Download</a>
  </div>

  <!-- Meta-prediction panel (organ + phenotype probability distributions, top-abundant cell types) -->
  <div class="meta-result" id="metaResult"></div>
</div>

<!-- Info panel -->
<div class="meta-panel">
  <strong>Hierarchical cell annotation: Level1 → Level2</strong>
  <div style="margin:4px 0 8px 0; font-size:13px; color:#555;">
    Mirrors the <a href="https://github.com/srkim727/pangeapy" target="_blank" rel="noopener">pangeapy</a>
    hierarchical annotation flow in the browser. Level1 runs on every cell;
    Level2 runs only on groups whose Level1 label has ≥ 50 cells and a matching Level2 model.
    For large inputs or many samples, use the <a href="https://github.com/srkim727/pangeapy" target="_blank" rel="noopener">pangeapy API</a> instead.
  </div>
  <ol>
    <li><strong>Input file configuration</strong>
      <ul>
        <li>Should contain gene expression matrix <code>(cell_barcode × gene_id)</code></li>
        <li>Raw expression must be <code>1e4</code>-normalized &amp; <code>log1p</code>-transformed<br>
            <small>normalized up to 10,000 counts per cell, then log-transformed with 1 pseudocount</small>
        </li>
        <li>Supported formats: <code>.csv</code>, <code>.csv.gz</code>, <code>.h5ad</code>, or <code>.h5</code> (10x Cell Ranger v2 / v3)</li>
      </ul>
    </li>
    <li><strong>Pipeline</strong>
      <ul>
        <li><strong>Level1</strong> — runs the <code>Whole</code> model on every cell (32 broad cell types)</li>
        <li><strong>Level2</strong> — for each Level1 label that has ≥ 50 cells <em>and</em> a matching Level2 model
          (<code>B_mature</code>, <code>Dendritic_classical</code>, <code>Ductal</code>, <code>Endothelial</code>,
          <code>Fibroblast</code>, <code>Macrophage</code>, <code>Monocyte</code>, <code>Mural</code>,
          <code>Squamous</code>, <code>T&amp;NK</code>), run the corresponding model on just those cells</li>
        <li>Level2 models are downloaded on demand (only the ones needed)</li>
      </ul>
    </li>
    <li><strong>Meta prediction</strong> — mirrors <code>MetaAnnotator().annotate()</code>
      <ul>
        <li>Filter cells: <code>Level1|conf_score &gt; 0.5</code> AND <code>Level2|conf_score &gt; 0.5</code></li>
        <li>If fewer than <strong>500</strong> cells remain, meta is skipped</li>
        <li>Build a composition vector (Level1 proportions + per-Level1 Level2 proportions with ≥ 50 cells)</li>
        <li><strong>Organ predictor</strong> → top organ + probability distribution</li>
        <li><strong>Phenotype predictor</strong>: Blood model if organ=Blood (prob ≥ 0.5), otherwise Tissue model</li>
        <li>Requires <code>meta_*_portable.npz</code> in <code>/assets/models/</code> — see <code>tools/convert_meta_models.py</code></li>
      </ul>
    </li>
    <li><strong>Output file configuration</strong> — <code>pred.csv</code> with columns
      <ul>
        <li><code>cell_id</code></li>
        <li><code>Level1|predicted_label</code>, <code>Level1|conf_score</code></li>
        <li><code>Level2|predicted_label</code>, <code>Level2|conf_score</code> (blank if no Level2 was run for that cell)</li>
        <li><code>PG_annotations</code> — <code>Level1|Level2</code> concatenated, or just <code>Level1</code> when no Level2</li>
        <li><code>PG_combined_score</code> — geometric mean of the available level scores</li>
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
  // ---------- Constants ----------
  const MODEL_BASE = "/assets/models/";
  const LEVEL1_FILE = "level1_Whole_model_portable.npz";
  const LEVEL1_NAME = "Whole (level1)";
  // Mapping: Level1 label (case-sensitive, matches model classes_) → Level2 model file
  const LEVEL2_MODELS = [
    { label: "B_mature",            file: "level2_B_mature_model_portable.npz" },
    { label: "Dendritic_classical", file: "level2_Dendritic_classical_model_portable.npz" },
    { label: "Ductal",              file: "level2_Ductal_model_portable.npz" },
    { label: "Endothelial",         file: "level2_Endothelial_model_portable.npz" },
    { label: "Fibroblast",          file: "level2_Fibroblast_model_portable.npz" },
    { label: "Macrophage",          file: "level2_Macrophage_model_portable.npz" },
    { label: "Monocyte",            file: "level2_Monocyte_model_portable.npz" },
    { label: "Mural",               file: "level2_Mural_model_portable.npz" },
    { label: "Squamous",            file: "level2_Squamous_model_portable.npz" },
    { label: "T&NK",                file: "level2_T&NK_model_portable.npz" },
  ];
  const N_CUTOFF = 50;

  // Meta-prediction constants (mirror pangeapy/meta.py defaults).
  const META_ORGAN_FILE   = "meta_Organ_predictor_portable.npz";
  const META_BLOOD_FILE   = "meta_Blood_predictor_portable.npz";
  const META_TISSUE_FILE  = "meta_Tissue_predictor_portable.npz";
  const META_L1_CUTOFF    = 0.5;   // Level1 conf-score cutoff for composition
  const META_L2_CUTOFF    = 0.5;   // Level2 conf-score cutoff for composition
  const META_GROUP_CUTOFF = 50;    // per-Level1-type cell count for Level2 prop inclusion
  const META_TOTAL_CUTOFF = 500;   // total cells (after filtering) required to run meta
  const META_BLOOD_PROB_CUTOFF = 0.5;  // organ-prob threshold to switch to Blood phenotype model
  const META_TOP_N = 5;                // how many top classes to display per meta model
  const TOP_ABUNDANT_N = 5;

  // ---------- Helpers ----------
  function $(id){ return document.getElementById(id); }
  function setDisabled(elOrId, v){ const el = typeof elOrId==="string" ? $(elOrId) : elOrId; if(el) el.disabled = !!v; }
  function log(m){
    const el = $("log"); if(!el) return;
    el.textContent += (m + "\n");
    const MAX_LINES = 400;
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
  function setStageState(name, state){
    const el = $("stage-" + name); if(!el) return;
    el.classList.remove("active","done","err");
    if(state && state !== "pending") el.classList.add(state);
  }
  function resetStages(){
    ["upload","parse","level1","level2","meta","output"].forEach(s => setStageState(s, "pending"));
  }
  function clearMetaResult(){
    const el = $("metaResult"); el.innerHTML = ""; el.classList.remove("show");
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
  function clearL2List(){
    const el = $("l2List"); el.innerHTML = ""; el.classList.remove("show");
  }
  function renderL2List(groups){
    // groups: [{label, count, willRun, file}, ...]
    const el = $("l2List");
    el.innerHTML = "";
    if (!groups.length) { el.classList.remove("show"); return; }
    for (const g of groups) {
      const row = document.createElement("div");
      row.className = "l2-row" + (g.willRun ? "" : " skip");
      row.dataset.label = g.label;
      row.innerHTML = `
        <span class="l2-state"></span>
        <span class="l2-name">${g.label}</span>
        <span class="l2-count">${g.count.toLocaleString()} cells${g.willRun ? "" : " · skipped"}</span>
      `;
      el.appendChild(row);
    }
    el.classList.add("show");
  }
  function setL2RowState(label, state){
    const row = $("l2List").querySelector(`.l2-row[data-label="${CSS.escape(label)}"]`);
    if (!row) return;
    row.classList.remove("active","done","err");
    if (state && state !== "pending") row.classList.add(state);
  }

  // ---------- Meta-result rendering ----------
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => (
      {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]
    ));
  }

  function renderProbSection(label, result, subNote){
    const sec = document.createElement("div");
    sec.className = "meta-section";

    const title = document.createElement("div");
    title.className = "meta-section-title";
    title.innerHTML = subNote
      ? `${escapeHtml(label)} <span class="sub-note">${escapeHtml(subNote)}</span>`
      : escapeHtml(label);
    sec.appendChild(title);

    if (!result || result.error) {
      const warn = document.createElement("div");
      warn.className = "meta-warn";
      warn.textContent = `Unavailable: ${result?.error || "model not loaded"}`;
      sec.appendChild(warn);
      return sec;
    }

    const top = document.createElement("div");
    top.className = "meta-top";
    top.innerHTML = `${escapeHtml(result.top)} <span class="meta-prob">${(result.topProb*100).toFixed(1)}%</span>`;
    sec.appendChild(top);

    if (result.nFeatPresent != null) {
      const cov = document.createElement("div");
      cov.style.cssText = "font-size:11px;color:var(--muted);margin-bottom:4px;";
      cov.textContent = `${result.nFeatPresent}/${result.nFeatTotal} composition features matched`;
      sec.appendChild(cov);
    }

    const allPairs = result.classes.map((c, i) => [String(c), Number(result.probs[i])])
      .sort((a, b) => b[1] - a[1]);
    const pairs = allPairs.slice(0, META_TOP_N);
    const maxProb = pairs.length ? pairs[0][1] : 0;
    const tbl = document.createElement("table");
    tbl.className = "meta-probs";
    pairs.forEach(([name, prob], i) => {
      const tr = document.createElement("tr");
      if (i === 0) tr.className = "top";
      const w = maxProb > 0 ? Math.max(1, (prob / maxProb) * 100) : 0;
      tr.innerHTML =
        `<td class="pb-name" title="${escapeHtml(name)}">${escapeHtml(name)}</td>` +
        `<td class="pb-bar-cell"><div class="pb-bar"><div class="pb-fill" style="width:${w.toFixed(2)}%;"></div></div></td>` +
        `<td class="pb-pct">${(prob*100).toFixed(1)}%</td>`;
      tbl.appendChild(tr);
    });
    sec.appendChild(tbl);
    return sec;
  }

  // Build a row for the abund-list table (rank, name, bar, pct, count).
  function _abundRow(name, count, rank, totalCells, maxPct, isTop){
    const pct = (count / totalCells) * 100;
    const tr = document.createElement("tr");
    if (isTop) tr.className = "top";
    const w = maxPct > 0 ? Math.max(1, (pct / maxPct) * 100) : 0;
    tr.innerHTML =
      `<td class="rank">${rank}</td>` +
      `<td class="name" title="${escapeHtml(name)}">${escapeHtml(name)}</td>` +
      `<td class="pct-cell"><div class="pb-bar"><div class="pb-fill" style="width:${w.toFixed(2)}%;"></div></div></td>` +
      `<td class="pct">${pct.toFixed(1)}%</td>` +
      `<td class="count">${count.toLocaleString()}</td>`;
    return tr;
  }

  function renderMetaResult(meta, topAbundant, allAbundant, totalCells){
    const el = $("metaResult");
    el.innerHTML = "";

    // ===== 1. Top abundant cell types (shown first) =====
    if (topAbundant && topAbundant.length && totalCells > 0) {
      const totalLabels = (allAbundant && allAbundant.length) ? allAbundant.length : topAbundant.length;
      const h = document.createElement("h4");
      h.innerHTML = `Top abundant cell types ` +
        `<span class="h4-note">PG_annotations, top ${topAbundant.length} of ${totalLabels.toLocaleString()}</span>`;
      el.appendChild(h);

      const top1 = topAbundant[0];
      const top1Pct = (top1[1] / totalCells) * 100;
      const topDiv = document.createElement("div");
      topDiv.className = "meta-top";
      topDiv.innerHTML =
        `${escapeHtml(top1[0])} ` +
        `<span class="meta-prob">${top1Pct.toFixed(1)}% · ${top1[1].toLocaleString()} cells</span>`;
      el.appendChild(topDiv);

      // Top-N table (always visible)
      const maxPct = top1Pct;
      const tbl = document.createElement("table");
      tbl.className = "abund-list";
      topAbundant.forEach(([name, count], i) => {
        tbl.appendChild(_abundRow(name, count, i + 1, totalCells, maxPct, i === 0));
      });
      el.appendChild(tbl);

      // Collapsible "show all" — only render if there are more entries than topAbundant
      if (allAbundant && allAbundant.length > topAbundant.length) {
        const remaining = allAbundant.length - topAbundant.length;
        const det = document.createElement("details");
        det.className = "abund-all";
        const sum = document.createElement("summary");
        sum.textContent = `Show all ${allAbundant.length.toLocaleString()} PG_annotations (${remaining.toLocaleString()} more)`;
        det.appendChild(sum);

        const wrap = document.createElement("div");
        wrap.className = "abund-all-wrap";
        const fullTbl = document.createElement("table");
        fullTbl.className = "abund-list";
        // Same bar-scaling baseline as the top table so they're visually comparable.
        allAbundant.forEach(([name, count], i) => {
          fullTbl.appendChild(_abundRow(name, count, i + 1, totalCells, maxPct, i === 0));
        });
        wrap.appendChild(fullTbl);
        det.appendChild(wrap);
        el.appendChild(det);
      }

      // Visual separator before Meta prediction block
      const sep = document.createElement("div");
      sep.className = "meta-sep";
      el.appendChild(sep);
    }

    // ===== 2. Meta prediction (organ + phenotype) =====
    const h2 = document.createElement("h4");
    h2.innerHTML = `Meta prediction <span class="h4-note">organ &amp; phenotype, based on cell composition</span>`;
    el.appendChild(h2);

    if (meta.skipped) {
      const warn = document.createElement("div");
      warn.className = "meta-warn";
      if (meta.reason === "insufficient_cells") {
        warn.textContent =
          `Skipped: ${Number(meta.nKept||0).toLocaleString()} cells remain after the conf-score filter `+
          `(Level1>${META_L1_CUTOFF} AND Level2>${META_L2_CUTOFF}); ` +
          `pangeapy requires ≥ ${META_TOTAL_CUTOFF}.`;
      } else if (meta.reason === "error") {
        warn.textContent = `Skipped: ${meta.error || "internal error"}`;
      } else {
        warn.textContent = `Skipped: ${meta.reason}`;
      }
      el.appendChild(warn);
    } else {
      const note = document.createElement("div");
      note.style.cssText = "font-size:11px;color:var(--muted);margin:2px 0 8px 0;";
      note.textContent =
        `Composition built from ${Number(meta.nKept||0).toLocaleString()} / `+
        `${Number(meta.nTotal||0).toLocaleString()} cells `+
        `(Level1 conf > ${META_L1_CUTOFF} AND Level2 conf > ${META_L2_CUTOFF})`;
      el.appendChild(note);

      el.appendChild(renderProbSection("Organ", meta.organ));

      if (meta.pheno) {
        const phenoLabel = `Phenotype (${meta.phenoUsed || "?"})`;
        const phenoNote = meta.phenoUsed === "Blood"
          ? `Blood model selected — organ=Blood with prob ≥ ${META_BLOOD_PROB_CUTOFF}`
          : `Tissue model selected — organ ≠ Blood (or Blood prob < ${META_BLOOD_PROB_CUTOFF})`;
        el.appendChild(renderProbSection(phenoLabel, meta.pheno, phenoNote));
      }
    }

    el.classList.add("show");
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

  // ---------- CSV parser (same shape as /pages/annotate/) ----------
  async function parseCsvBytes(bytes, featureMap, nFeat, onRowProgress){
    const isGz = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    const cellIds = [];
    let colToFeatIdx = null;
    const keepMask = new Uint8Array(nFeat);
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
      if (parts.length < colToFeatIdx.length + 1) return;
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
        if (fi < 0) continue;
        const v = +parts[i + 1];
        xFlat[off + fi] = (v === v) ? v : 0;
      }
      rowCount++;
    }

    function processTextBuffer(isFinal){
      const buf = leftover;
      const len = buf.length;
      let start = 0;
      for (let i = 0; i < len; i++) {
        if (buf.charCodeAt(i) === 10) {
          let end = i;
          if (end > start && buf.charCodeAt(end - 1) === 13) end--;
          processLine(buf.substring(start, end));
          start = i + 1;
        }
      }
      leftover = start < len ? buf.substring(start) : "";
      if (isFinal && leftover) {
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
      await waitForGlobal("pako", 10000);
      const inflator = new pako.Inflate({ chunkSize: 262144 });
      let pakoErr = null;
      inflator.onData = (chunk) => {
        try {
          leftover += decoder.decode(chunk, { stream: true });
          processTextBuffer(false);
        } catch (e) { pakoErr = e; }
      };
      inflator.push(bytes, true);
      if (inflator.err && inflator.err !== 1) {
        throw new Error("Gzip decompression error: " + (inflator.msg || "code " + inflator.err));
      }
      if (pakoErr) throw pakoErr;
      leftover += decoder.decode();
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

  function isHDF5(bytes){
    return bytes.length >= 8
        && bytes[0] === 0x89 && bytes[1] === 0x48 && bytes[2] === 0x44 && bytes[3] === 0x46
        && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }

  let _h5wasmReadyPromise = null;
  async function ensureH5wasm(){
    if (_h5wasmReadyPromise) return _h5wasmReadyPromise;
    await waitForGlobal("h5wasm", 15000);
    _h5wasmReadyPromise = h5wasm.ready.then(() => h5wasm);
    return _h5wasmReadyPromise;
  }
  function _h5IndexColumn(group, fallback){
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
    try { lib.FS.unlink("/" + tmpName); } catch(_) {}
    lib.FS.writeFile("/" + tmpName, bytes);
    const file = new lib.File("/" + tmpName, "r");
    let xFlat = null;
    let keepMask = null;
    let cellIds = [];
    let nCells = 0;
    try {
      const varGroup = file.get("var");
      if (!varGroup) throw new Error("h5ad: missing /var group");
      const geneCol = _h5IndexColumn(varGroup, "_index");
      const geneNames = _h5ReadStringArray(file, "var/" + geneCol);

      const obsGroup = file.get("obs");
      if (!obsGroup) throw new Error("h5ad: missing /obs group");
      const cellCol = _h5IndexColumn(obsGroup, "_index");
      cellIds = _h5ReadStringArray(file, "obs/" + cellCol);
      nCells = cellIds.length;

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

      const X = file.get("X");
      if (!X) throw new Error("h5ad: missing /X");
      xFlat = new Float32Array(nCells * nFeat);

      const isGroup = X.constructor && X.constructor.name === "Group";
      if (!isGroup) {
        const shape = X.shape || [nCells, geneNames.length];
        const totalGenes = shape[1];
        const data = X.value;
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
        let enc = "csr_matrix";
        try {
          const a = X.attrs && X.attrs["encoding-type"];
          if (a && a.value) enc = String(Array.isArray(a.value) ? a.value[0] : a.value);
        } catch(_) {}
        const data    = file.get("X/data").value;
        const indices = file.get("X/indices").value;
        const indptr  = file.get("X/indptr").value;
        if (enc.indexOf("csr") !== -1) {
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

  // Probe an HDF5 file to classify its layout. Returns:
  //   { kind: "h5ad" }                    — AnnData (/var, /obs, /X)
  //   { kind: "10x", version, group }     — 10x Cell Ranger (v3: /matrix, v2: /<genome>)
  //   { kind: "unknown" }
  async function _detectHdf5Layout(bytes){
    const lib = await ensureH5wasm();
    const tmpName = "_probe.h5";
    try { lib.FS.unlink("/" + tmpName); } catch(_) {}
    lib.FS.writeFile("/" + tmpName, bytes);
    const file = new lib.File("/" + tmpName, "r");
    try {
      // 10x v3
      if (file.get("matrix") && file.get("matrix/data") && file.get("matrix/indices") && file.get("matrix/indptr")) {
        return { kind: "10x", version: "v3", group: "matrix" };
      }
      // h5ad
      if (file.get("var") && file.get("obs") && file.get("X")) {
        return { kind: "h5ad" };
      }
      // 10x v2 — single genome group at root with data/indices/indptr/barcodes
      let rootKeys = [];
      try { rootKeys = (typeof file.keys === "function") ? (file.keys() || []) : []; } catch(_) {}
      const skip = new Set(["var", "obs", "X", "matrix", "uns", "obsm", "varm", "layers", "raw", "obsp", "varp"]);
      for (const k of rootKeys) {
        if (skip.has(k)) continue;
        try {
          const g = file.get(k);
          if (!g || (g.constructor && g.constructor.name !== "Group")) continue;
          if (file.get(`${k}/data`) && file.get(`${k}/indices`) && file.get(`${k}/indptr`) && file.get(`${k}/barcodes`)) {
            return { kind: "10x", version: "v2", group: k };
          }
        } catch(_) {}
      }
      return { kind: "unknown" };
    } finally {
      try { file.close(); } catch(_) {}
      try { lib.FS.unlink("/" + tmpName); } catch(_) {}
    }
  }

  // ---------- 10x Cell Ranger HDF5 parser ----------
  // Reads 10x CSC sparse where shape = [n_genes, n_cells]; indptr indexes
  // columns (= barcodes/cells), indices are row indices (= gene indices).
  // groupName is "matrix" (v3) or the genome key like "GRCh38" (v2).
  async function parse10xBytes(bytes, groupName, version, featureMap, nFeat, onRowProgress){
    const lib = await ensureH5wasm();
    const tmpName = "input.h5";
    try { lib.FS.unlink("/" + tmpName); } catch(_) {}
    lib.FS.writeFile("/" + tmpName, bytes);
    const file = new lib.File("/" + tmpName, "r");
    let xFlat = null;
    let keepMask = null;
    let cellIds = [];
    let nCells = 0;
    try {
      cellIds = _h5ReadStringArray(file, `${groupName}/barcodes`);
      nCells = cellIds.length;

      // Prefer gene symbol; fall back to ID if name dataset is missing.
      let geneNames;
      const namePath = (version === "v3") ? `${groupName}/features/name` : `${groupName}/gene_names`;
      const idPath   = (version === "v3") ? `${groupName}/features/id`   : `${groupName}/genes`;
      if (file.get(namePath)) {
        geneNames = _h5ReadStringArray(file, namePath);
      } else if (file.get(idPath)) {
        geneNames = _h5ReadStringArray(file, idPath);
      } else {
        throw new Error(`10x ${version}: missing gene-name dataset under ${groupName}`);
      }

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

      xFlat = new Float32Array(nCells * nFeat);
      const data    = file.get(`${groupName}/data`).value;
      const indices = file.get(`${groupName}/indices`).value;
      const indptr  = file.get(`${groupName}/indptr`).value;
      for (let c = 0; c < nCells; c++) {
        const start = indptr[c];
        const end   = indptr[c + 1];
        const offDst = c * nFeat;
        for (let k = start; k < end; k++) {
          const fi = colToFeatIdx[indices[k]];
          if (fi < 0) continue;
          xFlat[offDst + fi] = data[k];
        }
        if (onRowProgress && (c % 200 === 0)) onRowProgress(c);
      }
    } finally {
      try { file.close(); } catch(_) {}
      try { lib.FS.unlink("/" + tmpName); } catch(_) {}
    }

    let nMatched = 0;
    for (let i = 0; i < nFeat; i++) if (keepMask[i]) nMatched++;
    return { cellIds, xFlat, keepMask, nCells, nFeat, nMatched };
  }

  async function parseInputBytes(bytes, featureMap, nFeat, onRowProgress){
    if (isHDF5(bytes)) {
      const layout = await _detectHdf5Layout(bytes);
      if (layout.kind === "h5ad") {
        return await parseH5adBytes(bytes, featureMap, nFeat, onRowProgress);
      }
      if (layout.kind === "10x") {
        return await parse10xBytes(bytes, layout.group, layout.version, featureMap, nFeat, onRowProgress);
      }
      throw new Error("HDF5 file: cannot detect layout — expected h5ad (/var, /obs, /X) or 10x Cell Ranger (/matrix or /<genome>).");
    }
    return await parseCsvBytes(bytes, featureMap, nFeat, onRowProgress);
  }

  // ---------- State ----------
  let pyodide=null, FS=null;
  let pyReady=false, libsReady=false, uploaded=false;
  let fileBytes=null, fileName="";
  // Caches: modelFile → { features: string[], featureMap: Map, bytesPath: string }
  const modelCache = new Map();
  // Currently-loaded model in Python globals (one at a time)
  let activeModelFile = null;
  let resultUrl=null;

  // ---------- BOOT ----------
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

      // Prefetch Level1 in the background — Level2 are lazy-loaded.
      ensureModelLoaded(LEVEL1_FILE, LEVEL1_NAME).catch(err =>
        log("❌ Level1 prefetch: " + (err?.message || err)));
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
      resetStages();
      setStageState("upload", "active");
      $("progBar").value = 0;
      $("progMsg").textContent = "Reading file…";
      $("progSub").textContent = "";
      $("progTime").textContent = "—";
      $("statusBox").dataset.state = "idle";
      hideResultCard();
      clearL2List();
      clearMetaResult();
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

  // ---------- Model loading ----------
  // Downloads the .npz once per model (cached in modelCache + Pyodide FS),
  // then makes it the "active" model by reparsing it into the Python globals
  // (_coef, _intercept, _classes, _scaler_mean, _scaler_scale, _with_mean).
  // Side-effect: sets `activeModelFile`.
  async function ensureModelLoaded(modelFile, displayName){
    if (!libsReady) throw new Error("Pyodide not ready yet.");

    let entry = modelCache.get(modelFile);
    if (!entry) {
      const url = MODEL_BASE + modelFile;
      const resp = await fetch(url);
      if(!resp.ok) throw new Error(`Model HTTP ${resp.status} for ${modelFile}`);
      const buf = new Uint8Array(await resp.arrayBuffer());
      const ok = (buf.length >= 4 && buf[0]===0x50 && buf[1]===0x4B && buf[2]===0x03 && buf[3]===0x04);
      if(!ok) log(`⚠️ ${modelFile} doesn't look like a ZIP (npz) – continuing anyway.`);
      const bytesPath = "/_model_" + modelFile.replace(/[^A-Za-z0-9_.-]/g, "_");
      FS.writeFile(bytesPath, buf);
      entry = { bytesPath, sizeBytes: buf.length, features: null, featureMap: null, displayName };
      modelCache.set(modelFile, entry);
      log(`📦 Fetched ${displayName || modelFile} (${(buf.length/1e6).toFixed(2)} MB)`);
    }

    if (activeModelFile === modelFile && entry.features != null) {
      return entry;
    }

    pyodide.globals.set('_model_bytes_path', entry.bytesPath);
    await pyodide.runPythonAsync(`
import numpy as np, gzip, io
def _load_npz_any(path):
    try:
        return np.load(path, allow_pickle=True)
    except Exception:
        with gzip.open(path, 'rb') as fh: data = fh.read()
        return np.load(io.BytesIO(data), allow_pickle=True)
_npz = _load_npz_any(_model_bytes_path)
_feat_arr     = (_npz['features'] if 'features' in _npz.files else _npz['features_']).astype(str)
_feat_lower   = [str(c).lower() for c in _feat_arr]
_coef         = np.asarray(_npz['coef_'],         dtype=np.float32)
_intercept    = np.asarray(_npz['intercept_'],    dtype=np.float32)
_classes      = _npz['classes_']
_scaler_mean  = np.asarray(_npz['scaler_mean_'],  dtype=np.float32)
_scaler_scale = np.asarray(_npz['scaler_scale_'], dtype=np.float32)
_with_mean    = bool(_npz['with_mean'].flat[0]) if _npz['with_mean'].size else True
_npz = None
`);
    if (entry.features == null) {
      const featList = pyodide.globals.get('_feat_lower').toJs();
      entry.features = featList;
      entry.featureMap = new Map();
      for (let i = 0; i < featList.length; i++) entry.featureMap.set(featList[i], i);
      log(`🧬 Loaded ${displayName || modelFile} (${featList.length} features)`);
    }
    activeModelFile = modelFile;
    return entry;
  }

  // ---------- Time helpers ----------
  function fmtElapsed(ms){
    const s = ms / 1000;
    if(s < 60) return `${s.toFixed(2)} s`;
    const m = Math.floor(s/60), r = s - m*60;
    return `${m}m ${r.toFixed(2)}s`;
  }

  // ---------- Prediction primitive ----------
  // Assumes the active model is already loaded in Python (_coef etc.) and that
  // /tmp_X.bin holds the row-major float32 matrix of shape (n_cells × n_feat)
  // already projected into the active model's feature space.
  // Globals consumed: keep_mask_js, n_cells_js, n_feat_js
  // Globals produced: _last_labels (np.array[object]), _last_scores (np.float32)
  async function runPredictionOnActiveModel(unhookOutFn, unhookErrFn){
    const code = `
import numpy as np, sys, os

def stage(pct, msg):
    print(f"__STAGE__:{pct}:{msg}")
    sys.stdout.flush()

n_cells = int(n_cells_js)
n_feat  = int(n_feat_js)
keep_mask = np.frombuffer(bytes(keep_mask_js), dtype=np.uint8).astype(bool)
matched   = int(keep_mask.sum())
if matched == 0:
    raise ValueError('No overlapping features between input and the active model.')

_inv_scale = (np.float32(1.0) / (_scaler_scale + np.float32(1e-8))).astype(np.float32)
n_classes  = _coef.shape[0]
bytes_per_row = n_feat * 4
BYTES_PER_BATCH = 200 * 1024 * 1024
batch_size = max(256, min(n_cells, BYTES_PER_BATCH // max(1, bytes_per_row)))
n_batches  = (n_cells + batch_size - 1) // batch_size

all_labels = np.empty(n_cells, dtype=object)
all_top    = np.empty(n_cells, dtype=np.float32)

for b in range(n_batches):
    start = b * batch_size
    end   = min(start + batch_size, n_cells)
    sz    = end - start
    pct   = 5 + int(90 * (start / max(1, n_cells)))
    stage(pct, f"Predicting batch {b+1}/{n_batches} (cells {start}–{end})…")
    X2 = np.fromfile('/tmp_X.bin', dtype=np.float32,
                     count=sz * n_feat,
                     offset=start * bytes_per_row).reshape(sz, n_feat)
    X2 = np.ascontiguousarray(X2)
    if _with_mean:
        np.subtract(X2, _scaler_mean, out=X2)
    np.multiply(X2, _inv_scale, out=X2)
    np.clip(X2, None, np.float32(10.0), out=X2)
    if matched < n_feat:
        X2[:, ~keep_mask] = 0
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
    del P, idx

try: os.remove('/tmp_X.bin')
except Exception: pass

_last_labels = all_labels
_last_scores = all_top
print(f"__PRED_DONE__:{n_cells}:{n_classes}:{matched}/{n_feat}:{n_batches}")
`;
    await pyodide.runPythonAsync(code);
  }

  // ---------- RUN (hierarchical) ----------
  $("runBtn").addEventListener("click", async ()=>{
    if(!uploaded || !fileBytes){ alert("Load an input file first."); return; }
    if(!libsReady){ alert("Please wait until the setup finishes."); return; }

    const runT0 = performance.now();
    $("statusBox").dataset.state = "running";
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

    hideResultCard();
    clearL2List();
    if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }
    setStageState("upload", "done");
    setStageState("parse", "pending");
    setStageState("level1", "pending");
    setStageState("level2", "pending");
    setStageState("output", "pending");

    setStage(2, "Starting hierarchical pipeline…", "Level1 → Level2");
    log("▶️ Running hierarchical annotation …");

    let unhookOut = null, unhookErr = null;
    let parsedNCells = 0;
    let l1Matched = 0, l1Feat = 0;
    let l2RunCount = 0;

    // Capture Python stdout and route __STAGE__ lines back to the progress bar.
    function attachStdHooks(progressBase, progressSpan){
      // Maps a 0..100 pct from runPredictionOnActiveModel into [base, base+span]
      unhookOut = pyodide.setStdout({
        batched: (s) => {
          (s || "").split(/\r?\n/).forEach(line=>{
            if(!line) return;
            if(line.startsWith("__STAGE__:")){
              const parts = line.trim().split(":");
              const pctRaw = Math.max(0, Math.min(100, parseInt(parts[1]||"0",10)));
              const msg = parts.slice(2).join(":") || "Working…";
              const pct = progressBase + Math.round(pctRaw * progressSpan / 100);
              setStage(pct, msg);
            } else if (line.startsWith("__PRED_DONE__:")) {
              log("· " + line.replace("__PRED_DONE__:",""));
            } else {
              log(line);
            }
          });
        }
      });
      unhookErr = pyodide.setStderr({ batched: (s) => { s && s.trim() && log("ERR: " + s); } });
    }
    function detachStdHooks(){
      try{ unhookOut && unhookOut(); }catch(_){}
      try{ unhookErr && unhookErr(); }catch(_){}
      unhookOut = null; unhookErr = null;
    }

    try {
      // === Stage: Parse + Level1 ===
      setStageState("parse", "active");
      setStage(5, "Loading Level1 model…", "level1_Whole");
      const l1Entry = await ensureModelLoaded(LEVEL1_FILE, LEVEL1_NAME);

      const isH5ad = isHDF5(fileBytes);
      setStage(12, isH5ad ? "Parsing .h5ad…" : "Parsing input…",
               isH5ad ? "reading HDF5 datasets" : "decompressing & reading rows");
      const parsed1 = await parseInputBytes(fileBytes, l1Entry.featureMap, l1Entry.features.length, (n) => {
        setSub(`${isH5ad ? "decoding" : "parsing"} · ${n.toLocaleString()} ${isH5ad ? "cells" : "rows"} so far`);
      });
      parsedNCells = parsed1.nCells;
      l1Matched = parsed1.nMatched;
      l1Feat = parsed1.nFeat;
      log(`📊 Parsed ${parsed1.nCells.toLocaleString()} cells × ${parsed1.nMatched.toLocaleString()}/${parsed1.nFeat.toLocaleString()} Level1 features matched`);

      if (parsed1.nMatched === 0) {
        throw new Error("No overlapping features between input and Level1 model. Check that gene names/IDs match the model's feature set.");
      }
      setStageState("parse", "done");

      setStageState("level1", "active");
      setStage(20, "Transferring Level1 matrix to Python…",
        `${parsed1.nCells.toLocaleString()} cells · ${parsed1.nMatched.toLocaleString()}/${parsed1.nFeat.toLocaleString()} features`);
      const xBytes1 = new Uint8Array(parsed1.xFlat.buffer, parsed1.xFlat.byteOffset, parsed1.xFlat.byteLength);
      FS.writeFile('/tmp_X.bin', xBytes1);
      pyodide.globals.set('cell_ids_js',  parsed1.cellIds);
      pyodide.globals.set('keep_mask_js', parsed1.keepMask);
      pyodide.globals.set('n_cells_js',   parsed1.nCells);
      pyodide.globals.set('n_feat_js',    parsed1.nFeat);
      parsed1.xFlat = null;
      parsed1.keepMask = null;

      attachStdHooks(20, 25);  // Level1 prediction occupies [20%, 45%]
      setStage(22, "Predicting Level1…", `model: ${LEVEL1_NAME}`);
      await runPredictionOnActiveModel();
      detachStdHooks();

      // Save Level1 results in Python; pull labels to JS for grouping.
      // toJs() can't convert numpy object-dtype arrays directly (format char 'O'),
      // so we expose a plain Python list of strings for the JS side.
      await pyodide.runPythonAsync(`
level1_labels = np.array(_last_labels, copy=True)
level1_scores = np.array(_last_scores, copy=True)
level1_labels_py = [str(x) for x in level1_labels]
cell_ids = [str(c) for c in cell_ids_js]
level2_labels = np.array([None] * len(level1_labels), dtype=object)
level2_scores = np.full(len(level1_labels), np.nan, dtype=np.float32)
`);
      const level1LabelsJs = pyodide.globals.get('level1_labels_py').toJs();
      setStageState("level1", "done");
      setStage(48, "Level1 complete", `${parsedNCells.toLocaleString()} cells labeled`);
      log(`✅ Level1 done (${parsedNCells.toLocaleString()} cells)`);

      // === Stage: Level2 ===
      setStageState("level2", "active");
      // Group cells per Level1 label
      const counts = new Map();
      for (const lab of level1LabelsJs) {
        const k = String(lab);
        counts.set(k, (counts.get(k) || 0) + 1);
      }
      // Build the visible breakdown (only show labels that match a Level2 model)
      const groups = LEVEL2_MODELS.map(({label, file}) => {
        const count = counts.get(label) || 0;
        return { label, file, count, willRun: count >= N_CUTOFF };
      }).filter(g => g.count > 0)
        .sort((a, b) => b.count - a.count);
      renderL2List(groups);

      const toRun = groups.filter(g => g.willRun);
      if (toRun.length === 0) {
        log(`ℹ️ No Level1 group reached the n_cutoff=${N_CUTOFF} threshold for Level2.`);
        setStage(95, "No Level2 groups eligible", `all matching groups < ${N_CUTOFF} cells`);
      } else {
        log(`▶️ Level2: ${toRun.length} group(s) eligible: ${toRun.map(g => `${g.label}(${g.count})`).join(", ")}`);
        const baseBefore = 50;
        const totalAfter = 92; // reserve [92,100] for output
        const span = (totalAfter - baseBefore) / toRun.length;
        for (let gi = 0; gi < toRun.length; gi++) {
          const g = toRun[gi];
          const base = Math.round(baseBefore + gi * span);
          setL2RowState(g.label, "active");
          setStage(base, `Level2: ${g.label}`, `loading model · ${g.count.toLocaleString()} cells`);

          try {
            const l2Entry = await ensureModelLoaded(g.file, `Level2 (${g.label})`);
            setStage(base + 1, `Level2: ${g.label}`, `parsing input for ${l2Entry.features.length} features`);
            const parsed2 = await parseInputBytes(fileBytes, l2Entry.featureMap, l2Entry.features.length, (n) => {
              setSub(`${g.label} · re-parse · ${n.toLocaleString()} ${isH5ad ? "cells" : "rows"}`);
            });
            if (parsed2.nMatched === 0) {
              log(`⚠️ Level2 ${g.label}: no overlapping features — skipping.`);
              setL2RowState(g.label, "err");
              continue;
            }

            // Subset to cells whose Level1 label equals g.label
            const indices = [];
            for (let i = 0; i < level1LabelsJs.length; i++) {
              if (String(level1LabelsJs[i]) === g.label) indices.push(i);
            }
            const nSub = indices.length;
            const nFeat2 = parsed2.nFeat;
            const xSub = new Float32Array(nSub * nFeat2);
            for (let i = 0; i < nSub; i++) {
              const srcOff = indices[i] * nFeat2;
              const dstOff = i * nFeat2;
              for (let j = 0; j < nFeat2; j++) xSub[dstOff + j] = parsed2.xFlat[srcOff + j];
            }
            // Free the full Level2 matrix for these features (we only need the subset).
            parsed2.xFlat = null;

            const xSubBytes = new Uint8Array(xSub.buffer, xSub.byteOffset, xSub.byteLength);
            FS.writeFile('/tmp_X.bin', xSubBytes);
            pyodide.globals.set('sub_indices_js', indices);
            pyodide.globals.set('keep_mask_js',   parsed2.keepMask);
            pyodide.globals.set('n_cells_js',     nSub);
            pyodide.globals.set('n_feat_js',      nFeat2);
            parsed2.keepMask = null;

            attachStdHooks(base + 2, Math.max(1, Math.round(span) - 2));
            setStage(base + 2, `Predicting Level2: ${g.label}`,
              `${nSub.toLocaleString()} cells · ${parsed2.nMatched.toLocaleString()}/${nFeat2.toLocaleString()} features`);
            await runPredictionOnActiveModel();
            detachStdHooks();

            await pyodide.runPythonAsync(`
indices_arr = np.array(sub_indices_js, dtype=np.int64)
level2_labels[indices_arr] = np.asarray(_last_labels, dtype=object)
level2_scores[indices_arr] = np.asarray(_last_scores, dtype=np.float32)
`);
            setL2RowState(g.label, "done");
            l2RunCount++;
            log(`✅ Level2 ${g.label}: ${nSub.toLocaleString()} cells annotated`);
          } catch (err) {
            detachStdHooks();
            setL2RowState(g.label, "err");
            log(`❌ Level2 ${g.label} failed: ${err?.message || err}`);
          }
        }
      }
      setStageState("level2", "done");

      // Compute PG_annotations / PG_combined_score in Python (shared by Meta filter,
      // Output CSV, and the Top-abundant panel).
      setStage(82, "Aggregating Level1+Level2 labels…");
      await pyodide.runPythonAsync(`
import pandas as pd
n = len(cell_ids)
pg_annotations = []
pg_combined = []
for i in range(n):
    l1 = '' if level1_labels[i] is None else str(level1_labels[i])
    l2_raw = level2_labels[i]
    l2 = '' if l2_raw is None else str(l2_raw)
    s1 = float(level1_scores[i]) if not np.isnan(level1_scores[i]) else float('nan')
    s2 = float(level2_scores[i]) if not np.isnan(level2_scores[i]) else float('nan')
    if l2:
        pg_annotations.append(f"{l1}|{l2}")
        if not np.isnan(s1) and not np.isnan(s2):
            pg_combined.append(float(np.sqrt(max(s1, 0.0) * max(s2, 0.0))))
        else:
            pg_combined.append(float('nan'))
    else:
        pg_annotations.append(l1)
        pg_combined.append(s1 if not np.isnan(s1) else float('nan'))
`);

      // === Stage: Meta ===
      setStageState("meta", "active");
      setStage(84, "Computing cell composition…", "filtering by conf-score");

      let metaPayload = { skipped: true, reason: 'unknown' };
      try {
        await pyodide.runPythonAsync(`
# Mirror pangeapy/meta.py: keep cells where both L1 & L2 conf > cutoff
# (NaN > cutoff is False, so cells without a Level2 prediction drop out.)
l1_arr = np.asarray([('' if v is None else str(v)) for v in level1_labels], dtype=object)
l2_arr = np.asarray([('' if v is None else str(v)) for v in level2_labels], dtype=object)
s1_arr = np.asarray(level1_scores, dtype=np.float32)
s2_arr = np.asarray(level2_scores, dtype=np.float32)
mask = (s1_arr > ${META_L1_CUTOFF}) & (s2_arr > ${META_L2_CUTOFF}) & (l2_arr != '')
meta_n_kept = int(mask.sum())
meta_n_total = int(len(level1_labels))
meta_status = ''
_meta_composition = None
if meta_n_kept < ${META_TOTAL_CUTOFF}:
    meta_status = 'insufficient_cells'
else:
    l1_kept = l1_arr[mask]
    l2_kept = l2_arr[mask]
    s_l1 = pd.Series(l1_kept).value_counts(normalize=True)
    parts = [s_l1]
    for cell_type in pd.unique(l1_kept):
        sub_mask = (l1_kept == cell_type)
        if int(sub_mask.sum()) < ${META_GROUP_CUTOFF}:
            continue
        l2_sub = l2_kept[sub_mask]
        s_l2 = pd.Series(l2_sub).value_counts(normalize=True)
        s_l2.index = [f"{cell_type}|{ix}" for ix in s_l2.index]
        parts.append(s_l2)
    _meta_composition = pd.concat(parts)
    meta_status = 'ok'
`);
        const metaStatus = String(pyodide.globals.get('meta_status') || '');
        const metaNKept  = Number(pyodide.globals.get('meta_n_kept') || 0);
        const metaNTotal = Number(pyodide.globals.get('meta_n_total') || 0);

        if (metaStatus !== 'ok') {
          log(`⚠️ Meta skipped: ${metaNKept.toLocaleString()}/${metaNTotal.toLocaleString()} cells after `+
              `(L1>${META_L1_CUTOFF}, L2>${META_L2_CUTOFF}) filter — need ≥ ${META_TOTAL_CUTOFF}`);
          setStage(92, "Meta prediction skipped",
            `${metaNKept.toLocaleString()}/${metaNTotal.toLocaleString()} cells after filter`);
          metaPayload = { skipped: true, reason: 'insufficient_cells', nKept: metaNKept, nTotal: metaNTotal };
          setStageState("meta", "done");
        } else {
          // ---- Organ prediction ----
          setStage(86, "Predicting Organ…", "loading organ predictor");
          let organResult = null;
          try {
            await ensureModelLoaded(META_ORGAN_FILE, "Meta Organ predictor");
            await pyodide.runPythonAsync(`
X = np.array([
    float(_meta_composition.loc[f]) if f in _meta_composition.index else 0.0
    for f in _feat_arr
], dtype=np.float32).reshape(1, -1)
if _with_mean:
    X = X - _scaler_mean
X = X * (np.float32(1.0) / (_scaler_scale + np.float32(1e-8)))
np.clip(X, None, np.float32(10.0), out=X)
logits = X @ _coef.T + _intercept
if logits.ndim == 1:
    logits = np.column_stack([-logits, logits])
if logits.shape[1] == 1:
    logits = np.column_stack([-logits, logits])
z = logits - logits.max(axis=1, keepdims=True)
np.exp(z, out=z)
P = (z / z.sum(axis=1, keepdims=True)).flatten()
organ_classes = [str(c) for c in _classes]
organ_probs   = [float(p) for p in P]
organ_feat_present = int(sum(1 for f in _feat_arr if f in _meta_composition.index))
organ_feat_total   = int(len(_feat_arr))
`);
            const organClasses = pyodide.globals.get('organ_classes').toJs();
            const organProbs   = pyodide.globals.get('organ_probs').toJs();
            let topIdx = 0;
            for (let i = 1; i < organProbs.length; i++) if (organProbs[i] > organProbs[topIdx]) topIdx = i;
            organResult = {
              classes: organClasses, probs: organProbs,
              top: organClasses[topIdx], topProb: organProbs[topIdx],
              nFeatPresent: Number(pyodide.globals.get('organ_feat_present')),
              nFeatTotal:   Number(pyodide.globals.get('organ_feat_total')),
            };
            log(`🧪 Organ: ${organResult.top} (${(organResult.topProb*100).toFixed(1)}%) · ` +
                `${organResult.nFeatPresent}/${organResult.nFeatTotal} composition features used`);
          } catch(err) {
            log(`⚠️ Organ predictor unavailable: ${err?.message || err}`);
            organResult = { error: err?.message || String(err) };
          }

          // ---- Phenotype prediction (Blood vs Tissue based on organ top) ----
          let phenoResult = null;
          let phenoUsed = null;
          if (organResult && !organResult.error) {
            phenoUsed = (organResult.top === "Blood" && organResult.topProb >= META_BLOOD_PROB_CUTOFF)
              ? "Blood" : "Tissue";
            const phenoFile = (phenoUsed === "Blood") ? META_BLOOD_FILE : META_TISSUE_FILE;
            setStage(89, `Predicting Phenotype (${phenoUsed})…`,
              `organ=${organResult.top} (${(organResult.topProb*100).toFixed(1)}%)`);
            try {
              await ensureModelLoaded(phenoFile, `Meta ${phenoUsed} phenotype`);
              await pyodide.runPythonAsync(`
X = np.array([
    float(_meta_composition.loc[f]) if f in _meta_composition.index else 0.0
    for f in _feat_arr
], dtype=np.float32).reshape(1, -1)
if _with_mean:
    X = X - _scaler_mean
X = X * (np.float32(1.0) / (_scaler_scale + np.float32(1e-8)))
np.clip(X, None, np.float32(10.0), out=X)
logits = X @ _coef.T + _intercept
if logits.ndim == 1:
    logits = np.column_stack([-logits, logits])
if logits.shape[1] == 1:
    logits = np.column_stack([-logits, logits])
z = logits - logits.max(axis=1, keepdims=True)
np.exp(z, out=z)
P = (z / z.sum(axis=1, keepdims=True)).flatten()
pheno_classes = [str(c) for c in _classes]
pheno_probs   = [float(p) for p in P]
pheno_feat_present = int(sum(1 for f in _feat_arr if f in _meta_composition.index))
pheno_feat_total   = int(len(_feat_arr))
`);
              const phenoClasses = pyodide.globals.get('pheno_classes').toJs();
              const phenoProbs   = pyodide.globals.get('pheno_probs').toJs();
              let topIdx = 0;
              for (let i = 1; i < phenoProbs.length; i++) if (phenoProbs[i] > phenoProbs[topIdx]) topIdx = i;
              phenoResult = {
                classes: phenoClasses, probs: phenoProbs,
                top: phenoClasses[topIdx], topProb: phenoProbs[topIdx],
                nFeatPresent: Number(pyodide.globals.get('pheno_feat_present')),
                nFeatTotal:   Number(pyodide.globals.get('pheno_feat_total')),
              };
              log(`🧪 Phenotype (${phenoUsed}): ${phenoResult.top} (${(phenoResult.topProb*100).toFixed(1)}%)`);
            } catch(err) {
              log(`⚠️ ${phenoUsed} phenotype predictor unavailable: ${err?.message || err}`);
              phenoResult = { error: err?.message || String(err) };
            }
          }

          metaPayload = {
            skipped: false, nKept: metaNKept, nTotal: metaNTotal,
            organ: organResult, pheno: phenoResult, phenoUsed,
          };
          setStageState("meta", "done");
        }
      } catch(metaErr) {
        log(`⚠️ Meta stage error: ${metaErr?.message || metaErr}`);
        setStageState("meta", "err");
        metaPayload = { skipped: true, reason: 'error', error: metaErr?.message || String(metaErr) };
      }

      // === Top abundant from PG_annotations (full sorted list; top N shown by default,
      //     full list exposed via a collapsible <details>) ===
      await pyodide.runPythonAsync(`
_pg_series = pd.Series(pg_annotations)
_pg_counts = _pg_series.value_counts()
pg_all_list = [(str(k), int(v)) for k, v in _pg_counts.items()]
pg_total = int(len(pg_annotations))
`);
      const pgAllRaw = pyodide.globals.get('pg_all_list').toJs();
      const pgTotal = Number(pyodide.globals.get('pg_total') || 0);
      const pgAll = [];
      for (const item of pgAllRaw) {
        const arr = Array.isArray(item)
          ? item
          : (item && typeof item.toJs === 'function' ? item.toJs() : [item[0], item[1]]);
        pgAll.push([String(arr[0]), Number(arr[1])]);
      }
      const topAbundant = pgAll.slice(0, TOP_ABUNDANT_N);

      // === Stage: Output ===
      setStageState("output", "active");
      setStage(95, "Building output CSV…");
      await pyodide.runPythonAsync(`
out = pd.DataFrame({
    'cell_id': cell_ids,
    'Level1|predicted_label': [('' if v is None else str(v)) for v in level1_labels],
    'Level1|conf_score':      level1_scores,
    'Level2|predicted_label': [('' if v is None else str(v)) for v in level2_labels],
    'Level2|conf_score':      level2_scores,
    'PG_annotations':         pg_annotations,
    'PG_combined_score':      pg_combined,
})
out.to_csv('/pred.csv', index=False)
print('DONE rows=', len(out))
`);

      const elapsed = fmtElapsed(performance.now() - runT0);
      $("progBar").value = 100;
      $("progMsg").textContent = "Complete";
      $("progSub").textContent = `${parsedNCells.toLocaleString()} cells · Level1 + ${l2RunCount} Level2` +
        (metaPayload.skipped ? "" : " · meta ✓");
      $("progTime").textContent = elapsed;
      $("statusBox").dataset.state = "done";
      setStageState("output", "done");

      const stem = (fileName || "input")
        .replace(/\.(csv\.gz|gz|csv|h5ad|h5)$/i, "")
        .replace(/[\s/\\]+/g, "_") || "input";
      const outName = `pred_${stem}_hier.csv`;

      const bytes = FS.readFile("/pred.csv");
      const blob  = new Blob([bytes], { type: "text/csv" });
      if(resultUrl){ URL.revokeObjectURL(resultUrl); }
      resultUrl = URL.createObjectURL(blob);

      const summary = `${parsedNCells.toLocaleString()} cells annotated
        <span class="stat">Level1 + ${l2RunCount} Level2 model${l2RunCount===1?"":"s"} · ${elapsed}</span>`;
      showResult("ok", summary, resultUrl, outName);
      renderMetaResult(metaPayload, topAbundant, pgAll, pgTotal);
      log(`✅ ${outName} ready in ${elapsed}.`);
    } catch(err) {
      detachStdHooks();
      const elapsed = fmtElapsed(performance.now() - runT0);
      $("progMsg").textContent = "Error";
      $("progSub").textContent = (err?.message || String(err)).slice(0, 200);
      $("progTime").textContent = elapsed;
      $("statusBox").dataset.state = "err";
      const active = document.querySelector(".annot-wrap .stage.active");
      if (active) { active.classList.remove("active"); active.classList.add("err"); }
      showResult("err", `${err?.message || err} <span class="stat">after ${elapsed}</span>`);
      log(`❌ Run error after ${elapsed}: ` + (err?.message || err));
    } finally {
      clearInterval(tickTimer);
      detachStdHooks();
    }
  });

  resetStages();
  boot();
})();
</script>

{% endraw %}
