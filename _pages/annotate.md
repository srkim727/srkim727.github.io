---
title: Annotate Level1 (client-side)
layout: page
---

{% raw %}

<h2>Annotate .h5ad with Level1 model (ONNX, WebGPU/WASM)</h2>
<p>
  Input <code>.h5ad</code> must have <code>X</code> as 1e4-normalized + log1p.<br>
  Output <code>pred.csv</code>: <code>cell_id, Level1|predicted_labels, Level1|conf_score, Level1|cert_score</code>.
</p>

<input type="file" id="h5ad" accept=".h5ad" />
<br><br>
<button id="run">Run annotation</button>

<pre id="log" style="background:#f6f8fa;padding:1em;border-radius:6px;max-height:280px;overflow:auto;"></pre>
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

  const log = (m) => (document.getElementById("log").textContent += m + "\n");

  async function openH5AD(file) {
    await h5wasm.ready;
    const buf = new Uint8Array(await file.arrayBuffer());
    return new h5wasm.File(buf, "r");
  }
  function readVarNames(f) {
    for (const p of ["var/_index","var/index","var/feature_names"]) {
      const ds = f.get(p);
      if (ds?.isDataset) {
        const arr = ds.toArray?.() ?? ds.value;
        return Array.from(arr, x => (typeof x === "string" ? x : (x?.toString?.() ?? String(x))));
      }
    }
    throw new Error("Could not find gene names (var/_index).");
  }
  function readObsNames(f) {
    for (const p of ["obs/_index","obs/index","obs/names"]) {
      const ds = f.get(p);
      if (ds?.isDataset) {
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
  function densePick(denseFlat, shape, varNames, genesOrder) {
    const [n,d] = shape, D = genesOrder.length;
    const out = new Float32Array(n*D);
    const colIdx = new Map(varNames.map((g,i)=>[g,i]));
    for (let j=0;j<D;j++){
      const cj = colIdx.get(genesOrder[j]); if (cj===undefined) continue;
      for (let i=0;i<n;i++){ out[i*D+j] = denseFlat[i*d+cj]; }
    }
    return out;
  }
  function csrPick(data, indices, indptr, shape, varNames, genesOrder) {
    const [n,d] = shape, D = genesOrder.length;
    const out = new Float32Array(n*D);
    const colPos = new Map(varNames.map((g,i)=>[g,i]));
    const wanted = new Map(); genesOrder.forEach((g,j)=>{ const cj=colPos.get(g); if(cj!==undefined) wanted.set(cj,j); });
    for (let i=0;i<n;i++){
      const a=indptr[i], b=indptr[i+1];
      for (let k=a;k<b;k++){ const cj=indices[k], j=wanted.get(cj); if (j!==undefined) out[i*D+j]=data[k]; }
    }
    return out;
  }
  function downloadCSV(name, header, rows){
    const csv=[header.join(","), ...rows.map(r=>r.join(","))].join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=Object.assign(document.createElement("a"),{href:url,download:name});
    document.getElementById("download").innerHTML="";
    document.getElementById("download").appendChild(a);
    a.click(); URL.revokeObjectURL(url);
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
  async function pickProviders(){ const eps=[]; if (navigator.gpu) eps.push("webgpu"); eps.push("wasm"); return eps; }

  document.getElementById("run").onclick = async () => {
    const file = document.getElementById("h5ad").files?.[0];
    document.getElementById("download").innerHTML=""; document.getElementById("log").textContent="";
    if(!file){ log("Please choose a .h5ad file."); return; }

    try{
      log("Loading Level1 genes/classes...");
      const [genes, classes] = await Promise.all([
        fetch(GENES_URL).then(r=>r.json()),
        fetch(CLASSES_URL).then(r=>r.json()),
      ]);

      log("Opening .h5ad ...");
      const f = await openH5AD(file);
      const varNames = readVarNames(f);
      const obsNames = readObsNames(f);
      const shape = readXShape(f);
      const X = f.get("X");

      log("Extracting features in model gene order ...");
      let features;
      if (X.isDataset){
        const dense = X.value; // Float64/32
        const denseF32 = dense instanceof Float32Array ? dense : new Float32Array(dense);
        features = densePick(denseF32, shape, varNames, genes);
      }else{
        const data    = X.get("data").value;
        const indices = X.get("indices").value;
        const indptr  = X.get("indptr").value;
        const dataF32    = data    instanceof Float32Array ? data : new Float32Array(data);
        const indicesI32 = indices instanceof Int32Array   ? indices : new Int32Array(indices);
        const indptrI32  = indptr  instanceof Int32Array   ? indptr  : new Int32Array(indptr);
        features = csrPick(dataF32, indicesI32, indptrI32, shape, varNames, genes);
      }

      // Create session & input tensor
      const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: await pickProviders() });
      const n = shape[0], D = genes.length, C = classes.length;
      const inputName = session.inputNames[0];
      const tensor = new ort.Tensor("float32", features, [n, D]);

      log("Running inference ...");
      const outs = await session.run({ [inputName]: tensor });
      const names = Object.keys(outs);

      // Probabilities (or logits -> softmax)
      let probs;
      if (names.includes("probabilities")){
        probs = outs["probabilities"].data;  // Float32Array N*C
      } else if (names.includes("logits")){
        probs = softmax2d(outs["logits"].data, n, C);
      } else {
        throw new Error("ONNX graph lacks 'probabilities' or 'logits'.");
      }

      // Build Level1 fields: predicted_labels, conf_score, cert_score
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

      downloadCSV("pred.csv", header, rows);
      log("Done. Downloaded pred.csv");
    }catch(e){
      log("Error: " + e.message); console.error(e);
    }
  };


</script>{% endraw %}

