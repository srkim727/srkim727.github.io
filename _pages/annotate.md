---
title: Annotate
author: S. Kim
date: 2025-01-01
category: Jekyll
layout: post
---

{% raw %}

<div id="annotate-app">

<h2>Annotate .h5ad with Level1 model (ONNX, WebGPU/WASM)</h2>
<p>
  Input <code>.h5ad</code> must have <code>X</code> = 1e4-normalized + log1p.<br>
  Output <code>pred.csv</code>: <code>cell_id, Level1|predicted_labels, Level1|conf_score, Level1|cert_score</code>.
</p>

<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
  <input type="file" id="h5ad" accept=".h5ad">
  <button id="load">Upload / Load file</button>
  <button id="run" disabled>Run annotation</button>
</div>

<div id="fileinfo" style="margin:6px 0; font-size:0.95em; opacity:0.9;"></div>

<!-- PROGRESS: Upload -->
<div style="margin:10px 0;">
  <label style="display:inline-block;min-width:120px;">Upload progress</label>
  <progress id="up_prog" value="0" max="100" style="width:420px;height:14px;"></progress>
  <span id="up_pct" style="margin-left:8px; font-variant-numeric:tabular-nums;">0%</span>
  <span id="up_speed" style="margin-left:12px; opacity:.8;">0.00 MB/s</span>
</div>

<!-- PROGRESS: Annotation -->
<div style="margin:10px 0;">
  <label style="display:inline-block;min-width:120px;">Annotation progress</label>
  <progress id="an_prog" value="0" max="100" style="width:420px;height:14px;"></progress>
  <span id="an_pct" style="margin-left:8px; font-variant-numeric:tabular-nums;">0%</span>
</div>

<pre id="log" style="background:#0b1020;color:#e8eaf6;padding:10px;border-radius:6px;max-height:320px;overflow:auto;"></pre>
<div id="download"></div>

<!-- Hide the theme's copy button just on this page -->
<style>
  #annotate-app .clipboard { display: none !important; }
</style>

<!-- onnxruntime-web -->
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"></script>

<script type="module">
  import * as h5wasm from "https://cdn.jsdelivr.net/npm/h5wasm@0.5.0/dist/esm/h5wasm.js";

  const MODEL_URL   = "{{ '/assets/models/Level1/model.onnx'   | relative_url }}";
  const GENES_URL   = "{{ '/assets/models/Level1/genes.json'   | relative_url }}";
  const CLASSES_URL = "{{ '/assets/models/Level1/classes.json' | relative_url }}";

  const $file = document.getElementById("h5ad");
  const $load = document.getElementById("load");
  const $run  = document.getElementById("run");
  const $info = document.getElementById("fileinfo");
  const $log  = document.getElementById("log");
  const $dl   = document.getElementById("download");

  const $upProg = document.getElementById("up_prog");
  const $upPct  = document.getElementById("up_pct");
  const $upSpd  = document.getElementById("up_speed");
  const $anProg = document.getElementById("an_prog");
  const $anPct  = document.getElementById("an_pct");

  const setUp = v => { $upProg.value = v; $upPct.textContent = Math.round(v) + "%"; };
  const setUpSpeed = mbps => { $upSpd.textContent = `${mbps.toFixed(2)} MB/s`; };
  const setAn = v => { $anProg.value = v; $anPct.textContent = Math.round(v) + "%"; };
  const resetUI = () => { $dl.innerHTML=""; $log.textContent=""; setUp(0); setUpSpeed(0); setAn(0); };

  const log = m => { $log.textContent += m + "\n"; $log.scrollTop = $log.scrollHeight; };

  $file.addEventListener("change", () => {
    if ($file.files?.[0]) {
      const f = $file.files[0];
      const mb = (f.size/1024/1024).toFixed(2);
      $info.textContent = `Selected: ${f.name} (${mb} MB)`;
    } else {
      $info.textContent = "";
    }
  });

  // Globals after upload
  let fileBuf = null, h5file = null;
  let varNames = null, obsNames = null, shape = null;
  let genes = null, classes = null;

  // ---- HDF5 helpers ----
  function readVarNames(f) {
    for (const p of ["var/_index","var/index","var/feature_names"]) {
      const ds = f.get(p); if (ds?.isDataset) {
        const arr = ds.toArray?.() ?? ds.value;
        return Array.from(arr, x => (typeof x === "string" ? x : (x?.toString?.() ?? String(x))));
      }
    }
    throw new Error("Could not find gene names in var.");
  }
  function readObsNames(f) {
    for (const p of ["obs/_index","obs/index","obs/names"]) {
      const ds = f.get(p); if (ds?.isDataset) {
        const arr = ds.toArray?.() ?? ds.value;
        return Array.from(arr, x => (typeof x === "string" ? x : (x?.toString?.() ?? String(x))));
      }
    }
    const n = readXShape(f)[0];
    return Array.from({length:n}, (_,i)=>"cell_"+i);
  }
  function readXShape(f) {
    const X = f.get("X");
    if (X?.isDataset) return X.shape;
    const s = f.get("X/shape")?.value;
    return [Number(s[0]), Number(s[1])];
  }

  // ---- Feature extraction helpers ----
  function densePick(denseFlat, shape, varNames, genesOrder, onRow) {
    const [n,d] = shape, D = genesOrder.length;
    const out = new Float32Array(n*D);
    const colIdx = new Map(varNames.map((g,i)=>[g,i]));
    const tickEvery = Math.max(1, Math.floor(n/100));
    for (let j=0;j<D;j++){
      const cj = colIdx.get(genesOrder[j]); if (cj===undefined) continue;
      for (let i=0;i<n;i++){
        out[i*D+j] = denseFlat[i*d+cj];
        if (onRow && j===0 && i % tickEvery === 0) onRow(i, n);
      }
    }
    onRow && onRow(n, n);
    return out;
  }
  function csrPick(data, indices, indptr, shape, varNames, genesOrder, onRow) {
    const [n,d] = shape, D = genesOrder.length;
    const out = new Float32Array(n*D);
    const colPos = new Map(varNames.map((g,i)=>[g,i]));
    const wanted = new Map(); genesOrder.forEach((g,j)=>{ const cj=colPos.get(g); if(cj!==undefined) wanted.set(cj,j); });
    const tickEvery = Math.max(1, Math.floor(n/100));
    for (let i=0;i<n;i++){
      const a=indptr[i], b=indptr[i+1];
      for (let k=a;k<b;k++){ const cj=indices[k], j=wanted.get(cj); if (j!==undefined) out[i*D+j]=data[k]; }
      if (onRow && i % tickEvery === 0) onRow(i, n);
    }
    onRow && onRow(n, n);
    return out;
  }
  function softmax2d(logits, n, c){
    const probs=new Float32Array(n*c);
    for (let i=0;i<n;i++){
      let mx=-1e30; for(let j=0;j<c;j++) mx=Math.max(mx, logits[i*c+j]);
      let s=0; for(let j=0;j<c;j++){ const e=Math.exp(logits[i*c+j]-mx); probs[i*c+j]=e; s+=e; }
      for(let j=0;j<c;j++) probs[i*c+j]/=s;
    }
    return probs;
  }

  function downloadCSV(name, header, rows){
    const csv=[header.join(","), ...rows.map(r=>r.join(","))].join("\n");
    const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
    const a=Object.assign(document.createElement("a"),{href:url,download:name});
    $dl.innerHTML=""; $dl.appendChild(a); a.click(); URL.revokeObjectURL(url);
  }

  async function pickProviders(){ const eps=[]; if (navigator.gpu) eps.push("webgpu"); eps.push("wasm"); return eps; }

  // ---- File read with progress + speed (Safari-safe) ----
  async function readFileWithProgress(file, onProgressAndSpeed) {
    const tStart = performance.now();
    if (file.stream && typeof file.stream === "function") {
      const total = file.size || 0;
      const reader = file.stream().getReader();
      let received = 0;
      let lastT = tStart, lastBytes = 0;
      const chunks = [];
      for (;;) {
        const {done, value} = await reader.read();
        const now = performance.now();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;

        // instantaneous speed (MB/s) over last slice
        const dt = (now - lastT) / 1000;
        const dB = received - lastBytes;
        const mbps = dt > 0 ? (dB / 1024 / 1024) / dt : 0;
        onProgressAndSpeed && onProgressAndSpeed(received, total, mbps);

        lastT = now; lastBytes = received;
        await new Promise(r => setTimeout(r, 0)); // allow paint
      }
      const out = new Uint8Array(received);
      let off = 0; for (const ch of chunks) { out.set(ch, off); off += ch.byteLength; }
      // final average speed
      const dtTot = (performance.now() - tStart) / 1000;
      const avg = (received / 1024 / 1024) / (dtTot || 1);
      onProgressAndSpeed && onProgressAndSpeed(received, total, avg);
      return out;
    }
    // Fallback
    const t0 = performance.now();
    const buf = await file.arrayBuffer();
    const out = new Uint8Array(buf);
    const dtTot = (performance.now() - t0) / 1000;
    const avg = (out.byteLength / 1024 / 1024) / (dtTot || 1);
    // simulate ticks
    const total = out.byteLength || 1;
    for (let i=1;i<=10;i++){
      onProgressAndSpeed && onProgressAndSpeed((i/10)*total, total, avg);
      await new Promise(r => setTimeout(r, 10));
    }
    return out;
  }

  // =================== Upload / Load ===================
  $load.onclick = async () => {
    resetUI();
    const f = $file.files?.[0];
    if (!f) { log("Please choose a .h5ad file first."); return; }

    try {
      setUp(0); setUpSpeed(0);
      log("Loading model sidecars ...");
      [genes, classes] = await Promise.all([
        fetch(GENES_URL).then(r=>r.json()),
        fetch(CLASSES_URL).then(r=>r.json()),
      ]);
      log(`Genes: ${genes.length} | Classes: ${classes.length}`);
      setUp(15);

      log(`Reading file (${f.name}) into memory ...`);
      fileBuf = await readFileWithProgress(f, (done, total, mbps) => {
        const pct = 15 + 70 * (done/total);
        setUp(pct);
        if (!Number.isNaN(mbps)) setUpSpeed(mbps);
      });
      log(`File read: ${(fileBuf.byteLength/1024/1024).toFixed(2)} MB`);
      setUp(88);

      log("Opening HDF5 and parsing headers ...");
      await h5wasm.ready;
      h5file = new h5wasm.File(fileBuf, "r");
      varNames = readVarNames(h5file);
      obsNames = readObsNames(h5file);
      shape    = readXShape(h5file);
      log(`Cells: ${shape[0]} | Genes in file: ${shape[1]}`);
      const vset = new Set(varNames);
      const missing = genes.filter(g => !vset.has(g));
      log(`Missing model genes in data: ${missing.length}`);
      setUp(100);

      log("Ready to run annotation.");
      $run.disabled = false;
    } catch (e) {
      log("🛑 Error while loading: " + (e?.message || e));
      console.error(e);
      $run.disabled = true; setUp(0); setUpSpeed(0);
    }
  };

  // =================== Run annotation ===================
  $run.onclick = async () => {
    if (!h5file || !genes || !classes || !shape) {
      log("Please upload/load the file first.");
      return;
    }
    try {
      setAn(0);
      const X = h5file.get("X");

      // 0→45%: feature extraction
      log("Extracting features in model gene order ...");
      const onRow = (i, n) => setAn(45 * (i / n));
      let features;
      if (X.isDataset){
        const dense = X.value;
        const denseF32 = dense instanceof Float32Array ? dense : new Float32Array(dense);
        features = densePick(denseF32, shape, varNames, genes, onRow);
      } else {
        const data    = X.get("data").value;
        const indices = X.get("indices").value;
        const indptr  = X.get("indptr").value;
        const dataF32    = data    instanceof Float32Array ? data : new Float32Array(data);
        const indicesI32 = indices instanceof Int32Array   ? indices : new Int32Array(indices);
        const indptrI32  = indptr  instanceof Int32Array   ? indptr  : new Int32Array(indptr);
        features = csrPick(dataF32, indicesI32, indptrI32, shape, varNames, genes, onRow);
      }
      setAn(45);

      // 45→55%: session creation
      log(`Creating ONNX session (${navigator.gpu ? "WebGPU" : "WASM"}) ...`);
      const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: await pickProviders() });
      setAn(55);

      // 55→90%: inference
      const n = shape[0], D = genes.length, C = classes.length;
      const tensor = new ort.Tensor("float32", features, [n, D]);
      log("Running inference ...");
      const out = await session.run({ [session.inputNames[0]]: tensor });
      let probs;
      if (out.probabilities) {
        probs = out.probabilities.data;
      } else if (out.logits) {
        probs = softmax2d(out.logits.data, n, C);
      } else {
        throw new Error("ONNX graph lacks 'probabilities' or 'logits'.");
      }
      setAn(90);

      // 90→100%: CSV
      log("Building CSV ...");
      const header = ["cell_id", "Level1|predicted_labels", "Level1|conf_score", "Level1|cert_score"];
      const rows = [];
      for (let i=0;i<n;i++){
        let best=-1, bj=-1, sum=0;
        for (let j=0;j<C;j++){ const v=probs[i*C+j]; sum+=v; if (v>best){best=v; bj=j;} }
        rows.push([obsNames[i], classes[bj], String(best), String(best / (sum || 1))]);
      }
      downloadCSV("pred.csv", header, rows);
      setAn(100);
      log("✅ Done. Saved pred.csv");
    } catch (e) {
      log("🛑 Error during annotation: " + (e?.message || e));
      console.error(e);
      setAn(0);
    }
  };
</script>

</div><!-- /annotate-app -->

{% endraw %}
