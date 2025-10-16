---
title: Annotate (diagnostic)
layout: page
permalink: /annotate/
excerpt: ""
---

<div id="ann-app" style="max-width:900px">
  <h2>Annotate .h5ad (client-side)</h2>
  <p>Input <code>.h5ad</code> must have <code>X</code> = 1e4-normalized + log1p.</p>

  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
    <input type="file" id="file" accept=".h5ad">
    <button id="validate">Validate assets</button>
    <button id="load">Load file</button>
    <button id="run" disabled>Run</button>
    <label style="display:inline-flex;align-items:center;gap:6px;">
      Batch <input id="batch" type="number" min="2000" step="1000" value="8000" style="width:80px">
    </label>
    <label style="display:inline-flex;align-items:center;gap:6px;">
      Safe mode <input id="safe" type="checkbox" checked>
    </label>
  </div>

  <div id="meta" style="margin:6px 0; opacity:.9;"></div>

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

  <style>#ann-app .clipboard{display:none!important}</style>
</div>

<script type="module">
  // ---------- Plain root-relative URLs (no Liquid) ----------
  const MODEL_URL   = "/assets/models/Level1/model.onnx";
  const GENES_URL   = "/assets/models/Level1/genes.json";
  const CLASSES_URL = "/assets/models/Level1/classes.json";

  // ---------- UI ----------
  const $f = document.getElementById('file');
  const $validate = document.getElementById('validate');
  const $load = document.getElementById('load');
  const $run  = document.getElementById('run');
  const $meta = document.getElementById('meta');
  const $dl   = document.getElementById('download');
  const $log  = document.getElementById('log');

  const $upBar=document.getElementById('upBar'), $upPct=document.getElementById('upPct'), $upSpd=document.getElementById('upSpd');
  const $anBar=document.getElementById('anBar'), $anPct=document.getElementById('anPct');
  const $batch=document.getElementById('batch'), $safe=document.getElementById('safe');

  const log = m => { $log.textContent += m + "\n"; $log.scrollTop = $log.scrollHeight; };
  const setUp=v=>{ $upBar.value=v; $upPct.textContent=Math.round(v)+'%'; };
  const setSpd=v=>{ $upSpd.textContent=(v||0).toFixed(2)+' MB/s'; };
  const setAn=v=>{ $anBar.value=v; $anPct.textContent=Math.round(v)+'%'; };

  window.addEventListener('error', e => log('Error: ' + e.message));
  window.addEventListener('unhandledrejection', e => log('Promise Rejection: ' + (e.reason?.message || e.reason)));

  // ---------- State ----------
  let genes=null, classes=null, fileBuf=null, h5=null, shape=null, varNames=null, obsNames=null;

  // ---------- Load onnxruntime-web as classic script (CDN + fallback) ----------
  async function ensureORT() {
    if (window.ort) return window.ort;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js";
      s.onload = resolve;
      s.onerror = () => {
        const s2 = document.createElement('script');
        s2.src = "https://unpkg.com/onnxruntime-web/dist/ort.min.js";
        s2.onload = resolve;
        s2.onerror = reject;
        document.head.appendChild(s2);
      };
      document.head.appendChild(s);
    });
    return window.ort;
  }

  // ---------- Fetch helpers ----------
  async function fetchJson(url, label){
    const r = await fetch(url, {cache:'no-cache'});
    if (!r.ok) throw new Error(label + ' fetch failed: ' + r.status + ' ' + r.statusText + ' ('+url+')');
    return r.json();
  }
  async function fetchHeadSize(url, label){
    try{
      const h = await fetch(url, {method:'HEAD', cache:'no-cache'});
      if (h.ok){
        const len = h.headers.get('content-length');
        return len ? Number(len) : null;
      }
    }catch(_e){}
    const r = await fetch(url, {method:'GET', cache:'no-cache'});
    if (!r.ok) throw new Error(label + ' fetch failed: ' + r.status + ' ' + r.statusText + ' ('+url+')');
    const len = r.headers.get('content-length');
    r.body?.cancel?.();
    return len ? Number(len) : null;
  }

  // ---------- File read with progress + Safari fallback ----------
  async function readFileWithProgress(file, onTick){
    const t0=performance.now();
    if (!$safe.checked && file.stream && typeof file.stream==='function'){
      const reader=file.stream().getReader();
      const chunks=[]; let rec=0, lastT=t0, lastB=0;
      for(;;){
        const {done, value}=await reader.read();
        const now=performance.now();
        if (done) break;
        chunks.push(value); rec+=value.byteLength;
        const dt=(now-lastT)/1000, dB=rec-lastB;
        const mbps = dt>0 ? (dB/1048576)/dt : 0;
        onTick && onTick(rec/file.size*100, mbps);
        lastT=now; lastB=rec;
      }
      const buf = await new Blob(chunks).arrayBuffer();
      const avg = (rec/1048576) / ((performance.now()-t0)/1000 || 1);
      onTick && onTick(100, avg);
      return new Uint8Array(buf);
    }
    const t1=performance.now();
    const buf = await file.arrayBuffer();
    const avg = (buf.byteLength/1048576)/((performance.now()-t1)/1000 || 1);
    for (let i=1;i<=10;i++){ onTick && onTick(i*10, avg); await new Promise(r=>setTimeout(r,5)); }
    return new Uint8Array(buf);
  }

  // ---------- h5wasm (lazy import inside handlers) ----------
  let h5wasm = null;

  function readVarNames(h){
    for (const p of ["var/_index","var/index","var/feature_names"]){
      const ds=h.get(p); if (ds?.isDataset){
        const arr=ds.toArray?.() ?? ds.value;
        return Array.from(arr, x=> typeof x==="string" ? x : (x?.toString?.() ?? String(x)));
      }
    }
    throw new Error("Cannot find var index");
  }
  function readObsNames(h){
    for (const p of ["obs/_index","obs/index","obs/names"]){
      const ds=h.get(p); if (ds?.isDataset){
        const arr=ds.toArray?.() ?? ds.value;
        return Array.from(arr, x=> typeof x==="string" ? x : (x?.toString?.() ?? String(x)));
      }
    }
    const n = readXShape(h)[0];
    return Array.from({length:n},(_,i)=>"cell_"+i);
  }
  function readXShape(h){
    const X=h.get("X");
    if (X?.isDataset) return X.shape;
    const s=h.get("X/shape")?.value;
    return [Number(s[0]), Number(s[1])];
  }
  function pickDense(denseFlat, shape, varNames, genes){
    const [n,d]=shape, D=genes.length;
    const out=new Float32Array(n*D);
    const idx=new Map(varNames.map((g,i)=>[g,i]));
    const map = genes.map(g=>idx.get(g));
    for (let j=0;j<D;j++){
      const cj=map[j]; if (cj==null) continue;
      for (let i=0,base=0;i<n;i++,base+=d) out[i*D+j]=denseFlat[base+cj];
    }
    return out;
  }
  function pickCSR(data, indices, indptr, shape, varNames, genes){
    const [n,d]=shape, D=genes.length;
    const out=new Float32Array(n*D);
    const colPos=new Map(varNames.map((g,i)=>[g,i]));
    const wanted=new Map(); genes.forEach((g,j)=>{ const cj=colPos.get(g); if (cj!=null) wanted.set(cj,j); });
    for (let i=0;i<n;i++){
      const a=indptr[i], b=indptr[i+1];
      for (let k=a;k<b;k++){ const cj=indices[k], j=wanted.get(cj); if (j!=null) out[i*D+j]=data[k]; }
    }
    return out;
  }

  // ---- Validate assets ----
  $validate.onclick = async ()=>{
    try{
      log('Checking genes.json …');
      const g = await fetchJson(GENES_URL, 'genes.json');
      log('OK genes: ' + g.length);

      log('Checking classes.json …');
      const c = await fetchJson(CLASSES_URL, 'classes.json');
      log('OK classes: ' + c.length);

      log('Checking model.onnx …');
      const bytes = await fetchHeadSize(MODEL_URL, 'model.onnx');
      log('model.onnx size: ' + (bytes ? (bytes/1048576).toFixed(2)+' MB' : 'unknown'));

      // ✅ load ORT via classic script
      const ort = await ensureORT();
      if (ort.env?.wasm) {
        ort.env.wasm.simd = !$safe.checked;
        ort.env.wasm.numThreads = $safe.checked ? 1 : Math.min((navigator.hardwareConcurrency||4), 8);
        ort.env.wasm.proxy = !$safe.checked;
      }

      log('Creating ONNX session (sanity)…');
      const eps = (navigator.gpu && !$safe.checked) ? ["webgpu","wasm"] : ["wasm"];
      const test = await ort.InferenceSession.create(MODEL_URL, { executionProviders: eps });

      const D = g.length;
      const zeros = new ort.Tensor('float32', new Float32Array(D), [1, D]);
      const out = await test.run({ [test.inputNames[0]]: zeros });
      const any = out[test.outputNames[0]] || Object.values(out)[0];
      log('Dummy inference ok. Output len: ' + (any?.data?.length ?? 'unknown'));
      log('✅ Assets validate successfully.');
    }catch(e){
      log('🛑 Validate failed: ' + (e.message || e));
      log('Hint: open these URLs in a new tab to verify:');
      log(' - ' + GENES_URL);
      log(' - ' + CLASSES_URL);
      log(' - ' + MODEL_URL);
    }
  };

  // ---- Load file ----
  $load.onclick = async ()=>{
    $dl.innerHTML=''; $log.textContent=''; setUp(0); setSpd(0); setAn(0); $run.disabled=true;

    try{
      genes   = await fetchJson(GENES_URL, 'genes.json');
      classes = await fetchJson(CLASSES_URL, 'classes.json');
      log('genes: ' + genes.length + ' | classes: ' + classes.length);

      if (!h5wasm){
        h5wasm = await import("https://cdn.jsdelivr.net/npm/h5wasm@0.5.0/dist/esm/h5wasm.js");
      }

      const file = $f.files?.[0];
      if (!file) { log('Pick a .h5ad first.'); return; }
      const mb = (file.size/1048576).toFixed(2);
      $meta.textContent = `Selected: ${file.name} (${mb} MB) | Model genes: ${genes.length} | Classes: ${classes.length}`;

      fileBuf = await readFileWithProgress(file, (pct, mbps)=>{ setUp(pct); setSpd(mbps); });
      setUp(100);

      await h5wasm.ready;
      const hf = new h5wasm.File(fileBuf, "r");
      h5 = hf;
      varNames = readVarNames(h5);
      obsNames = readObsNames(h5);
      shape = readXShape(h5);
      log(`Cells: ${shape[0]} | Genes(file): ${shape[1]}`);

      const vset=new Set(varNames);
      const missing = genes.reduce((k,g)=>k+(vset.has(g)?0:1),0);
      log(`Missing vs model: ${missing}`);

      $run.disabled=false;
    }catch(e){
      log('🛑 Load failed: ' + (e.message || e));
    }
  };

  // ---- Run ----
  $run.onclick = async ()=>{
    try{
      setAn(0);
      const ort = await ensureORT();
      if (ort.env?.wasm) {
        ort.env.wasm.simd = !$safe.checked;
        ort.env.wasm.numThreads = $safe.checked ? 1 : Math.min((navigator.hardwareConcurrency||4), 8);
        ort.env.wasm.proxy = !$safe.checked;
      }

      const X = h5.get("X");
      const n = shape[0], D = genes.length, C = classes.length;
      let feats;
      if (X.isDataset){
        const arr = X.value;
        const denseF32 = (arr instanceof Float32Array) ? arr : new Float32Array(arr);
        feats = pickDense(denseF32, shape, varNames, genes);
      } else {
        const data = X.get('data').value;
        const indices = X.get('indices').value;
        const indptr = X.get('indptr').value;
        const dataF32 = (data instanceof Float32Array) ? data : new Float32Array(data);
        const idxI32  = (indices instanceof Int32Array) ? indices : new Int32Array(indices);
        const ptrI32  = (indptr  instanceof Int32Array) ? indptr  : new Int32Array(indptr);
        feats = pickCSR(dataF32, idxI32, ptrI32, shape, varNames, genes);
      }
      setAn(30);

      const eps = (navigator.gpu && !$safe.checked) ? ["webgpu","wasm"] : ["wasm"];
      const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: eps });
      setAn(40);

      const Nbatch = Math.max(2000, Number($batch.value)||8000);
      const probs = new Float32Array(n*C);
      for (let start=0; start<n; start+=Nbatch){
        const end = Math.min(n, start+Nbatch);
        const view = feats.subarray(start*D, end*D);
        const t = new ort.Tensor('float32', view, [end-start, D]);
        const out = await session.run({ [session.inputNames[0]]: t });
        let part;
        if (out.probabilities) part = out.probabilities.data;
        else if (out.logits){
          part = new Float32Array((end-start)*C);
          for (let i=0;i<end-start;i++){
            let mx=-1e30; for(let j=0;j<C;j++) mx=Math.max(mx, out.logits.data[i*C+j]);
            let s=0; for(let j=0;j<C;j++){ const e=Math.exp(out.logits.data[i*C+j]-mx); part[i*C+j]=e; s+=e; }
            for (let j=0;j<C;j++) part[i*C+j]/=s;
          }
        } else { throw new Error("ONNX outputs missing probabilities/logits"); }
        probs.set(part, start*C);
        setAn(40 + 50*(end/n));
        await new Promise(r=>setTimeout(r,0));
      }

      const header = ["cell_id","Level1|predicted_labels","Level1|conf_score","Level1|cert_score"];
      const rows = new Array(n);
      for (let i=0;i<n;i++){
        let best=-1, bj=-1, sum=0, base=i*C;
        for (let j=0;j<C;j++){ const v=probs[base+j]; sum+=v; if (v>best){best=v; bj=j;} }
        rows[i] = [obsNames[i], classes[bj], String(best), String(best/(sum||1))];
      }
      const csv=[header.join(","), ...rows.map(r=>r.join(","))].join("\n");
      const blob=new Blob([csv],{type:"text/csv"});
      const url=URL.createObjectURL(blob);
      const a=Object.assign(document.createElement('a'),{href:url,download:'pred.csv'});
      $dl.innerHTML=''; $dl.appendChild(a); a.click(); URL.revokeObjectURL(url);
      setAn(100);
      log('✅ Done.');
    }catch(e){
      log('🛑 Run failed: ' + (e.message || e));
    }
  };
</script>
