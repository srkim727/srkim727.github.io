// annotate.js (external, loaded with defer)
(function () {
  // Elements we need immediately
  const $log = document.getElementById('log');
  const $boot = document.getElementById('boot');
  const $validate = document.getElementById('validate');
  const $load = document.getElementById('load');
  const $run = document.getElementById('run');
  const $ping = document.getElementById('ping');

  if (!$log || !$boot) {
    console.error('annotate.js: missing #log or #boot element');
    return;
  }

  // Basic logger (available before boot)
  const log = m => { $log.textContent += m + "\n"; $log.scrollTop = $log.scrollHeight; };
  const errMsg = e => e?.message || e?.type || (typeof e === 'string' ? e : JSON.stringify(e));
  log("🔸 Ready — click **Boot** to initialize.");

  // --- Globals after boot ---
  let ORT = null;          // onnxruntime-web namespace
  let H5 = null;           // h5wasm namespace or window.h5wasm
  let booted = false;      // prevent double-boot

  // URLs (root-relative)
  const MODEL_URL   = "/assets/models/Level1/model.onnx";
  const GENES_URL   = "/assets/models/Level1/genes.json";
  const CLASSES_URL = "/assets/models/Level1/classes.json";
  const H5WASM_BASE = "/assets/libs/h5wasm"; // you vendored dist/ here

  // Lazily grabbed after boot
  let $f, $meta, $dl, $upBar, $upPct, $upSpd, $anBar, $anPct, $batch, $safe;

  // --- Utility: rebind (remove old listeners) ---
  function rebind(id, handler) {
    const el = document.getElementById(id);
    if (!el) { log("⚠️ Missing element #" + id); return null; }
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('click', ev => {
      try { handler(ev); } catch (e) { log('🛑 ' + id + ' error: ' + errMsg(e)); console.error(e); }
    });
    return clone;
  }

  // --- Helpers available after boot ---
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

  let _h5 = null;
  async function ensureH5Wasm() {
    if (_h5) return _h5;
    const localEsm = `${H5WASM_BASE}/esm/h5wasm.js`;
    try {
      log("h5wasm: trying local ESM …");
      _h5 = await import(localEsm);
      log("h5wasm: loaded ESM");
      return _h5;
    } catch (e) {
      log("h5wasm ESM failed: " + errMsg(e));
    }
    const localUmd = `${H5WASM_BASE}/h5wasm.js`;
    try {
      log("h5wasm: trying local UMD …");
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = localUmd;
        s.async = true;
        s.onload = resolve;
        s.onerror = ev => reject(new Error(`Local UMD failed: ${localUmd} (${ev?.type || "error"})`));
        document.head.appendChild(s);
      });
      if (!window.h5wasm) throw new Error("window.h5wasm undefined after local UMD.");
      if (window.h5wasm.setWasmPath) {
        window.h5wasm.setWasmPath(`${H5WASM_BASE}/`);
        log("h5wasm.setWasmPath(" + `${H5WASM_BASE}/` + ")");
      }
      _h5 = window.h5wasm;
      log("h5wasm: loaded UMD");
      return _h5;
    } catch (e) {
      log(errMsg(e));
      throw new Error("h5wasm not found under " + H5WASM_BASE + " — copy dist/ here.");
    }
  }

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

  // ---------- Boot routine ----------
  function boot() {
    if (booted) {
      // Reboot: clear log and rebind
      $log.textContent = "";
      log("🔁 Rebooting …");
    }
    // Enable buttons after boot
    [$ping, $validate, $load, $run].forEach(b => b && (b.disabled = false));

    // Cache the remaining elements
    $f     = document.getElementById('file');
    $meta  = document.getElementById('meta');
    $dl    = document.getElementById('download');
    $upBar = document.getElementById('upBar');
    $upPct = document.getElementById('upPct');
    $upSpd = document.getElementById('upSpd');
    $anBar = document.getElementById('anBar');
    $anPct = document.getElementById('anPct');
    $batch = document.getElementById('batch');
    $safe  = document.getElementById('safe');

    // Progress helpers
    const setUp=v=>{ $upBar.value=v; $upPct.textContent=Math.round(v)+'%'; };
    const setSpd=v=>{ $upSpd.textContent=(v||0).toFixed(2)+' MB/s'; };
    const setAn=v=>{ $anBar.value=v; $anPct.textContent=Math.round(v)+'%'; };

    // Global error listeners (attach once per boot)
    window.addEventListener('error', e => log('Error: ' + errMsg(e)));
    window.addEventListener('unhandledrejection', e => log('Promise Rejection: ' + errMsg(e.reason)));

    // Rebind all interactive buttons afresh
    rebind('ping', () => log('🏓 Ping OK — handlers are attached.'));
    rebind('validate', async () => {
      log('▶ Validate clicked');
      try {
        log('Checking genes.json …');
        const g = await fetchJson(GENES_URL, 'genes.json');
        log('OK genes: ' + g.length);

        log('Checking classes.json …');
        const c = await fetchJson(CLASSES_URL, 'classes.json');
        log('OK classes: ' + c.length);

        log('Checking model.onnx …');
        const bytes = await fetchHeadSize(MODEL_URL, 'model.onnx');
        log('model.onnx size: ' + (bytes ? (bytes/1048576).toFixed(2)+' MB' : 'unknown'));

        ORT = await ensureORT();
        if (ORT.env?.wasm) {
          ORT.env.wasm.simd = !$safe.checked;
          ORT.env.wasm.numThreads = $safe.checked ? 1 : Math.min((navigator.hardwareConcurrency||4), 8);
          ORT.env.wasm.proxy = !$safe.checked;
        }

        log('Creating ONNX session (sanity)…');
        const eps = (navigator.gpu && !$safe.checked) ? ["webgpu","wasm"] : ["wasm"];
        const test = await ORT.InferenceSession.create(MODEL_URL, { executionProviders: eps });

        const D = g.length;
        const zeros = new ORT.Tensor('float32', new Float32Array(D), [1, D]);
        const out = await test.run({ [test.inputNames[0]]: zeros });
        const any = out[test.outputNames[0]] || Object.values(out)[0];
        log('Dummy inference ok. Output len: ' + (any?.data?.length ?? 'unknown'));
        log('✅ Assets validate successfully.');
      } catch (e) {
        log('🛑 Validate failed: ' + errMsg(e));
        log('Hint: open these URLs in a new tab to verify:');
        log(' - ' + GENES_URL);
        log(' - ' + CLASSES_URL);
        log(' - ' + MODEL_URL);
      }
    });

    rebind('load', async () => {
      $dl.innerHTML=''; $log.textContent=''; setUp(0); setSpd(0); setAn(0);
      if ($run) $run.disabled = true;
      try{
        H5 = await ensureH5Wasm();
        const genes = await fetchJson(GENES_URL, 'genes.json');
        const classes = await fetchJson(CLASSES_URL, 'classes.json');
        window._genes = genes; window._classes = classes;

        log('genes: ' + genes.length + ' | classes: ' + classes.length);

        const file = $f?.files?.[0];
        if (!file) { log('Pick a .h5ad first.'); return; }
        const mb = (file.size/1048576).toFixed(2);
        $meta.textContent = `Selected: ${file.name} (${mb} MB) | Model genes: ${genes.length} | Classes: ${classes.length}`;

        const fileBuf = await readFileWithProgress(file, (pct, mbps)=>{ setUp(pct); setSpd(mbps); });
        setUp(100);

        await H5.ready;

        let hf;
        try { hf = new H5.File(fileBuf, "r"); }
        catch (openErr) {
          log("If this is first visit and it fails here, the h5wasm .wasm may be cached/blocked.");
          log("We set the WASM path to " + H5WASM_BASE + "/ ; try hard refresh (Ctrl/Cmd+Shift+R).");
          throw openErr;
        }
        window._h5 = hf;

        const varNames = readVarNames(hf);
        const obsNames = readObsNames(hf);
        const shape = readXShape(hf);
        window._shape = shape; window._varNames = varNames; window._obsNames = obsNames;

        log(`Cells: ${shape[0]} | Genes(file): ${shape[1]}`);
        const vset=new Set(varNames);
        const missing = genes.reduce((k,g)=>k+(vset.has(g)?0:1),0);
        log(`Missing vs model: ${missing}`);

        if ($run) $run.disabled = false;
      }catch(e){
        log('🛑 Load failed: ' + errMsg(e));
        console.error(e);
      }
    });

    rebind('run', async () => {
      try{
        setAn(0);
        ORT = await ensureORT();
        if (ORT.env?.wasm) {
          ORT.env.wasm.simd = !$safe.checked;
          ORT.env.wasm.numThreads = $safe.checked ? 1 : Math.min((navigator.hardwareConcurrency||4), 8);
          ORT.env.wasm.proxy = !$safe.checked;
        }

        const h5 = window._h5;
        const genes = window._genes;
        const classes = window._classes;
        const shape = window._shape;
        const varNames = window._varNames;
        const obsNames = window._obsNames;

        if (!h5 || !genes || !classes || !shape) {
          log('Load a file first.'); return;
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
        const session = await ORT.InferenceSession.create(MODEL_URL, { executionProviders: eps });
        setAn(40);

        const Nbatch = Math.max(2000, Number($batch.value)||8000);
        const probs = new Float32Array(n*C);
        for (let start=0; start<n; start+=Nbatch){
          const end = Math.min(n, start+Nbatch);
          const view = feats.subarray(start*D, end*D);
          const t = new ORT.Tensor('float32', view, [end-start, D]);
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
        log('🛑 Run failed: ' + errMsg(e));
        console.error(e);
      }
    });

    // Environment summary
    log("✅ Boot complete.");
    log("UA: " + navigator.userAgent);
    log("WebGPU: " + (!!navigator.gpu));
    log("Cores: " + (navigator.hardwareConcurrency || 'n/a'));
    booted = true;
  }

  // Bind Boot button (first and only)
  $boot.addEventListener('click', () => {
    try { boot(); } catch (e) { log('🛑 Boot failed: ' + errMsg(e)); console.error(e); }
  });
})();
