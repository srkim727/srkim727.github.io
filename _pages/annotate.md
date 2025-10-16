---
title: Annotate (client-side)
layout: page
permalink: /annotate/
excerpt: ""
---

<div id="ann-app" style="max-width:900px">
  <h2>Annotate .h5ad (client-side)</h2>
  <p>Input <code>.h5ad</code> must have <code>X</code> = 1e4-normalized + log1p.</p>

  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">
    <button id="boot" title="Initialize the app and logger">Boot</button>
    <button id="ping" disabled>Ping</button>
    <button id="validate" disabled>Validate assets</button>
    <button id="load" disabled>Load file</button>
    <button id="run" disabled>Run</button>
    <label style="display:inline-flex;align-items:center;gap:6px;margin-left:10px;">
      Batch <input id="batch" type="number" min="2000" step="1000" value="8000" style="width:80px">
    </label>
    <label style="display:inline-flex;align-items:center;gap:6px;">
      Safe mode <input id="safe" type="checkbox" checked>
    </label>
  </div>

  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">
    <input type="file" id="file" accept=".h5ad">
    <span id="meta" style="opacity:.9;"></span>
  </div>

  <div style="margin:8px 0;">
    <label style="display:inline-block;min-width:120px;">Upload</label>
    <progress id="upBar" value="0" max="100" style="width:360px;height:12px"></progress>
    <span id="upPct" style="font-variant-numeric:tabular-nums">0%</span>
    <span id="upSpd" style="margin-left:10px;opacity:.8">0.00 MB/s</span>
  </div>

  <div style="margin:8px 0;">
    <label style="display:inline-block;min-width:120px;">Annotate</label>
    <progress id="anBar" value="0" max="100" style="width:360px;height:12px"></progress>
    <span id="anPct" style="font-variant-numeric:tabular-nums">0%</span>
  </div>

  <pre id="log" style="background:#0b1020;color:#e8eaf6;padding:10px;border-radius:6px;max-height:280px;overflow:auto;"></pre>
  <div id="download" style="margin-top:6px"></div>

  <!-- Hide GitBook copy button -->
  <style>#ann-app .clipboard{display:none!important}</style>
</div>

<!-- External JS -->
<script src="/assets/js/annotate.js" defer></script>
