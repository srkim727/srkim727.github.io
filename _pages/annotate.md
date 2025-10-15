---
title: Annotate
author: Tao He
date: 2022-02-04
category: Jekyll
layout: post
---

{% raw %}

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

<div style="margin:10px 0;">
  <label style="display:inline-block;min-width:90px;">Progress</label>
  <progress id="prog" value="0" max="100" style="width: 420px; height: 14px;"></progress>
  <span id="pct" style="margin-left:8px; font-variant-numeric: tabular-nums;">0%</span>
</div>

<pre id="log" style="background:#0b1020;color:#e8eaf6;padding:10px;border-radius:6px;max-height:320px;overflow:auto;"></pre>
<div id="download"></div>

<!-- onnxruntime-web -->
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"></script>

<script type="module">
  // h5wasm: HDF5 reader in the browser
  import * as h5wasm from "https://cdn.jsdelivr.net/npm/h5wasm@0.5.0/dist/esm/h5wasm.js";

  // Model assets (Level1)
  const MODEL_URL   = "{{ '/assets/models/Level1/model.onnx'   | relative_url }}";
  const GENES_URL   = "{{ '/assets/models/Level1/genes.json'   | relative_url }}";
  const CLASSES_URL = "{{ '/assets/models/Level1/classes.json' | relative_url }}";

  // UI helpers
  const $file = document.getElementById("h5ad");
  const $load = document.getElementById("load");
  const $run  = document.getElementById("run");
  const $info = document.getElementById("fileinfo");
  const $log  = document.getElementById("log");
  const $prog = document.getElementById("prog");
  const $pct  = document.getElementById("pct");
  const $dl   = document.getElementById("download");

  function log(m){ $log.textContent += m + "\n"; $log.scrollTop = $log.scrollHeight; }
  function setProg(v){ $prog.value = v; $pct.textContent = Math.round(v) + "%"; }
  function resetUI(){ $dl.innerHTML=""; $log.textContent=""; setProg(0); }

  $file.addEventListener("change", () => {
    if ($file.files?.[0]) {
      const f = $file.files[0];
      const mb = (f.size/1024/1024).toFixed(2);
      $info.textContent = `Selected: ${f.name} (${mb} MB)`;
    } else {
      $info.textContent = "";
    }
  });

  // Globals set after "Upload / Load file"
  let fileBuf = null;           // Uint8Array of the .h5ad
  let h5file = null;            // h5wasm.File instance
  let varNames = null;          // gene names from file
  let obsNames = null;          // cell IDs from file
  let shape = null;             // [n_cells, n_genes] in the file
  let genes = null, classes = null; // from sidecars (model)

  // ----- Small HDF5 helpers -----
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
  function densePick(denseFlat, shape, varNames, genesOrder, onRow) {
    const [n,d] = shape, D = genesOrder.length;
    const out = new Float32Array(n*D);
    const colIdx = new Map(varNames.map((g,i)=>[g,i]));
    const tickEvery = Math.max(1, Math.floor(n/100));
    for (let j=0;j<D;j++){
      const cj = colIdx.get(genesOrder[j]); if (cj===undefined) continue;
      for (let i=0;i<n;i++){
        out[i*D+j] = denseFlat[i*d+cj];
        if (onRow && j===0 && i % tickEvery === 0) onRow(i, n); // ~1% updates on first column loop
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

  // ----- STREAMED FILE READ with progress -----
  async function readFileWithProgress(file, onProgress) {
    const total = file.size;
    const reader = file.stream().getReader();
    let received = 0;
    const chunks = [];
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      onProgress && onProgress(received, total);
      // Let UI paint between chunks
      await new Promise(r => setTimeout(r, 0));
    }
    // Concatenate to a single Uint8Array
    const out = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
    return out;
  }

  // ----- Upload / Load button handler -----
  $load.onclick = async () => {
    resetUI();
    const f = $file.files?.[0];
    if (!f) { log("Please choose a .h5ad file first."); return; }

    try {
      log(`Loading model sidecars ...`);
      [genes, classes] = await Promise.all([
        fetch(GENES_URL).then(r=>r.json()),
        fetch(CLASSES_URL).then(r=>r.json()),
      ]);
      log(`Genes: ${genes.length} | Classes: ${classes.length}`);
      setProg(5);

      log(`Reading file (${f.name}) into memory ...`);
      fileBuf = await readFileWithProgress(f, (done, total) => {
        // map 0..60% to file read
        const pct = 5 + 60 * (done/total);
        setProg(pct);
      });
      log(`File read: ${(fileBuf.byteLength/1024/1024).toFixed(2)} MB`);
      setProg(65);

      log(`Opening HDF5 header ...`);
      await h5wasm.ready;
      h5file = new h5wasm.File(fileBuf, "r");
      setProg(70);

      log(`Parsing var/obs names and X shape ...`);
      varNames = readVarNames(h5file);
      obsNames = readObsNames(h5file);
      shape    = readXShape(h5file);
      log(`Cells: ${shape[0]} | Genes in file: ${shape[1]}`);
      const missing = genes.filter(g => !new Set(varNames).has(g));
      log(`Missing model genes in data: ${missing.length}`);
      setProg(80);

      log(`Ready to run annotation.`);
      setProg(85);
      $run.disabled = false;
    } catch (e) {
      log("🛑 Error while loading: " + (e?.message || e));
      console.error(e);
      $run.disabled = true;
    }
  };

  // ----- Run annotation -----
  $run.onclick = async () => {
    if (!h5file || !genes || !classes || !shape) {
      log("Please upload/load the file first.");
      return;
    }
    try {
      const t0 = performance.now();
      const X = h5file.get("X");
      log(`Extracting features in model gene order ...`);
      const onRow = (i, n) => {
        // map 85..92% to extraction step
        const base = 85, span = 7;
        setProg(base + span * (i / n));
      };

      let features;
      if (X.isDataset){
        const dense = X.value; // Float64/Float32
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
      log(`Feature extraction done in ${((performance.now()-t0)/1000).toFixed(2)}s.`);
      setProg(92);

      log(`Creating ONNX session (${navigator.gpu ? "WebGPU" : "WASM"}) ...`);
      const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: await pickProviders() });
      setProg(94);

      const n = shape[0], D = genes.length, C = classes.length;
      const tensor = new ort.Tensor("float32", features, [n, D]);

      log(`Running inference ...`);
      const out = await session.run({ [session.inputNames[0]]: tensor });
      let probs;
      if (out.probabilities) {
        probs = out.probabilities.data;
      } else if (out.logits) {
        probs = softmax2d(out.logits.data, n, C);
      } else {
        throw new Error("ONNX graph lacks 'probabilities' or 'logits'.");
      }
      setProg(97);

      log(`Building CSV ...`);
      const header = ["cell_id", "Level1|predicted_labels", "Level1|conf_score", "Level1|cert_score"];
      const rows = [];
      for (let i=0;i<n;i++){
        let best=-1, bj=-1, sum=0;
        for (let j=0;j<C;j++){ const v=probs[i*C+j]; sum+=v; if (v>best){best=v; bj=j;} }
        rows.push([obsNames[i], classes[bj], String(best), String(best / (sum || 1))]);
      }
      downloadCSV("pred.csv", header, rows);
      setProg(100);
      log("✅ Done. Saved pred.csv");
    } catch (e) {
      log("🛑 Error during annotation: " + (e?.message || e));
      console.error(e);
    }
  };
</script>

{% endraw %}

