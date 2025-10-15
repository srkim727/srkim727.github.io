---
title: Annotate Level1 (client-side)
layout: page
---

{% raw %}

<h2>Annotate .h5ad with Level1 model (ONNX, WebGPU/WASM)</h2>
<p>
  Input <code>.h5ad</code> must have <code>X</code> = 1e4-normalized + log1p.<br>
  Output <code>pred.csv</code> with columns:
  <code>cell_id, Level1|predicted_labels, Level1|conf_score, Level1|cert_score</code>.
</p>

<label class="file">
  <input type="file" id="h5ad" accept=".h5ad">
</label>
<div id="fileinfo" style="margin:6px 0; font-size:0.95em; opacity:0.85;"></div>

<div style="margin:10px 0;">
  <progress id="prog" value="0" max="100" style="width: 420px; height: 14px;"></progress>
  <span id="pct" style="margin-left:8px; font-variant-numeric: tabular-nums;">0%</span>
</div>

<button id="run">Run annotation</button>
<pre id="log" style="background:#0b1020;color:#e8eaf6;padding:10px;border-radius:6px;max-height:320px;overflow:auto;"></pre>
<div id="download"></div>

<!-- onnxruntime-web -->
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"></script>

<script type="module">
  // h5wasm
  import * as h5wasm from "https://cdn.jsdelivr.net/npm/h5wasm@0.5.0/dist/esm/h5wasm.js";

  const MODEL_URL   = "{{ '/assets/models/Level1/model.onnx'   | relative_url }}";
  const GENES_URL   = "{{ '/assets/models/Level1/genes.json'   | relative_url }}";
  const CLASSES_URL = "{{ '/assets/models/Level1/classes.json' | relative_url }}";

  const $log = document.getElementById("log");
  const $prog = document.getElementById("prog");
  const $pct = document.getElementById("pct");
  const $file = document.getElementById("h5ad");
  const $fileinfo = document.getElementById("fileinfo");
  const $dl = document.getElementById("download");

  function log(msg){ $log.textContent += msg + "\n"; $log.scrollTop = $log.scrollHeight; }
  function setProg(v){ $prog.value = v; $pct.textContent = Math.round(v) + "%"; }
  function stepProg(delta){ setProg(Math.min(100, $prog.value + delta)); }

  $file.addEventListener("change", () => {
    $fileinfo.textContent = "";
    if ($file.files?.[0]) {
      const f = $file.files[0];
      const mb = (f.size/1024/1024).toFixed(2);
      $fileinfo.textContent = `Selected: ${f.name} (${mb} MB)`;
    }
  });

  async function openH5AD(file) {
    await h5wasm.ready;
    const buf = new Uint8Array(await file.arrayBuffer());
    return new h5wasm.File(buf, "r");
  }
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

  function densePickProgress(denseFlat, shape, varNames, genesOrder, onRow) {
    const [n,d] = shape, D = genesOrder.length;
    const out = new Float32Array(n*D);
    const colIdx = new Map(varNames.map((g,i)=>[g,i]));
    const tickEvery = Math.max(1, Math.floor(n/100));
    for (let j=0;j<D;j++){
      const cj = colIdx.get(genesOrder[j]); if (cj===undefined) continue;
      for (let i=0;i<n;i++){
        out[i*D+j] = denseFlat[i*d+cj];
        if (onRow && i % tickEvery === 0 && j === 0) onRow(i, n); // update ~1% on first gene loop
      }
    }
    onRow && onRow(n, n);
    return out;
  }

  function csrPickProgress(data, indices, indptr, shape, varNames, genesOrder, onRow) {
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

  async function runInferenceChunked(session, tensor, n, D, C, chunk=5000, onChunk){
    // run in vertical chunks of rows to update progress
    const probs = new Float32Array(n*C);
    for (let start=0; start<n; start+=chunk){
      const end = Math.min(n, start+chunk);
      const view = tensor.data.subarray(start*D, end*D);
      const t = new ort.Tensor("float32", view, [end-start, D]);
      const out = await session.run({ [session.inputNames[0]]: t });
      let part;
      if (out.probabilities) {
        part = out.probabilities.data;
      } else if (out.logits) {
        part = softmax2d(out.logits.data, end-start, C);
      } else {
        throw new Error("ONNX graph lacks 'probabilities' or 'logits'.");
      }
      probs.set(part, start*C);
      onChunk && onChunk(end, n);
      // allow UI to paint
      await new Promise(r => setTimeout(r, 0));
    }
    return probs;
  }

  document.getElementById("run").onclick = async () => {
    const file = $file.files?.[0];
    $dl.innerHTML = ""; $log.textContent = ""; setProg(0);
    if (!file){ log("Please choose a .h5ad file."); return; }

    try{
      const t0 = performance.now();
      log(`Loading Level1 assets ...`);
      const [genes, classes] = await Promise.all([
        fetch(GENES_URL).then(r=>r.json()),
        fetch(CLASSES_URL).then(r=>r.json()),
      ]);
      log(`Loaded genes (${genes.length}) and classes (${classes.length}).`); stepProg(5);

      log(`Opening .h5ad (${file.name}) ...`);
      const f = await openH5AD(file);
      stepProg(5);

      const varNames = readVarNames(f);
      const obsNames = readObsNames(f);
      const shape = readXShape(f); // [n, d]
      log(`Cells: ${shape[0]} | Genes in file: ${shape[1]}`);

      const vset = new Set(varNames);
      const missing = genes.filter(g => !vset.has(g));
      log(`Model features: ${genes.length} | Missing from data: ${missing.length}`);
      stepProg(5);

      const X = f.get("X");
      log(`Extracting features (this may take a bit)...`);
      const tPick = performance.now();

      const onRow = (i, n) => {
        // map 30% of the bar to extraction
        const base = 15, span = 30;
        setProg(base + span * (i / n));
      };

      let features;
      if (X.isDataset){
        const dense = X.value; // Float64/32
        const denseF32 = dense instanceof Float32Array ? dense : new Float32Array(dense);
        features = densePickProgress(denseF32, shape, varNames, genes, onRow);
      } else {
        const data    = X.get("data").value;
        const indices = X.get("indices").value;
        const indptr  = X.get("indptr").value;
        const dataF32    = data    instanceof Float32Array ? data : new Float32Array(data);
        const indicesI32 = indices instanceof Int32Array   ? indices : new Int32Array(indices);
        const indptrI32  = indptr  instanceof Int32Array   ? indptr  : new Int32Array(indptr);
        features = csrPickProgress(dataF32, indicesI32, indptrI32, shape, varNames, genes, onRow);
      }
      log(`Feature extraction done in ${((performance.now()-tPick)/1000).toFixed(2)}s.`);

      log(`Creating ONNX session (${navigator.gpu ? "WebGPU" : "WASM"}) ...`);
      const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: await pickProviders() });
      stepProg(10);

      const n = shape[0], D = genes.length, C = classes.length;
      const tensor = new ort.Tensor("float32", features, [n, D]);

      log(`Running inference ...`);
      const tRun = performance.now();
      // chunked inference: map 35% of the bar to inference
      const probs = await runInferenceChunked(session, tensor, n, D, C, 4000, (done, total) => {
        const base = 45, span = 35;
        setProg(base + span * (done / total));
      });
      log(`Inference done in ${((performance.now()-tRun)/1000).toFixed(2)}s.`);

      log(`Building CSV ...`);
      const header = ["cell_id", "Level1|predicted_labels", "Level1|conf_score", "Level1|cert_score"];
      const rows = [];
      for (let i=0;i<n;i++){
        let best=-1, bj=-1, sum=0;
        for (let j=0;j<C;j++){ const v=probs[i*C+j]; sum+=v; if (v>best){best=v; bj=j;} }
        const label = classes[bj];
        const conf  = best;
        const cert  = best / (sum || 1);
        rows.push([obsNames[i], label, String(conf), String(cert)]);
      }
      stepProg(10);

      downloadCSV("pred.csv", header, rows);
      setProg(100);
      log(`✅ Done. Total ${( (performance.now()-t0)/1000 ).toFixed(2)}s. File saved: pred.csv`);
    } catch (e) {
      log("🛑 Error: " + (e?.message || e));
      console.error(e);
    }
  };
</script>

{% endraw %}

