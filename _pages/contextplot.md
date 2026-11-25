---
title: Gene expression by organ × disease
author: S. Kim
date: 2025-10-20
layout: post
excerpt: ""
---

{% raw %}

<style>
  .pg-wrap{
    --accent:#3b82f6; --accent-dark:#2563eb; --accent-light:#dbeafe;
    --ok:#10b981; --ok-dark:#059669; --ok-light:#ecfdf5; --ok-border:#a7f3d0;
    --err:#ef4444; --err-light:#fef2f2; --err-border:#fecaca;
    --muted:#6b7280; --text:#111827;
    --border:#e5e7eb; --border-strong:#d1d5db;
    --bg-panel:#fafbfc;
    max-width:780px;margin:14px auto;
  }
  .pg-wrap .panel{
    background:var(--bg-panel);border:1px solid var(--border);
    border-radius:10px;padding:16px 18px;
  }
  .pg-wrap .ctrl-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px;}
  .pg-wrap .btn{
    font:inherit;font-size:13px;height:32px;padding:0 14px;box-sizing:border-box;
    border:1px solid var(--border);background:#fff;color:var(--text);
    border-radius:6px;cursor:pointer;line-height:1;
    transition:background .15s,border-color .15s,box-shadow .15s,color .15s;
  }
  .pg-wrap .btn:hover:not(:disabled){border-color:var(--border-strong);box-shadow:0 1px 2px rgba(0,0,0,.05);}
  .pg-wrap .btn:disabled{color:#9ca3af;background:#f3f4f6;border-color:var(--border);cursor:not-allowed;}
  .pg-wrap .btn-primary{background:var(--accent);border-color:var(--accent);color:#fff;}
  .pg-wrap .btn-primary:hover:not(:disabled){background:var(--accent-dark);border-color:var(--accent-dark);}
  .pg-wrap .btn-primary:disabled{background:#bfdbfe;border-color:#bfdbfe;color:#fff;}
  .pg-wrap .inline-ctl{display:flex;gap:6px;align-items:center;font-size:13px;color:var(--muted);}
  .pg-wrap .inline-ctl select,
  .pg-wrap .inline-ctl input[type="text"]{
    font:inherit;font-size:13px;height:32px;padding:0 10px;box-sizing:border-box;
    border:1px solid var(--border);background:#fff;color:var(--text);
    border-radius:6px;
  }
  .pg-wrap .inline-ctl select{padding:0 28px 0 10px;cursor:pointer;}
  .pg-wrap .inline-ctl select:hover,
  .pg-wrap .inline-ctl input[type="text"]:focus{border-color:var(--border-strong);outline:none;}

  .pg-wrap .stages{display:flex;align-items:center;gap:8px;margin:6px 0 10px 0;font-size:12px;color:var(--muted);}
  .pg-wrap .stage{display:flex;align-items:center;gap:6px;}
  .pg-wrap .stage-dot{
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:2px solid #e5e7eb;display:flex;align-items:center;justify-content:center;
    font-size:9px;color:#fff;line-height:1;transition:all .2s;
  }
  .pg-wrap .stage.active .stage-dot{border-color:var(--accent);box-shadow:0 0 0 4px var(--accent-light);}
  .pg-wrap .stage.done .stage-dot{background:var(--ok);border-color:var(--ok);}
  .pg-wrap .stage.done .stage-dot::after{content:"✓";color:#fff;font-weight:700;}
  .pg-wrap .stage.err .stage-dot{background:var(--err);border-color:var(--err);}
  .pg-wrap .stage.err .stage-dot::after{content:"×";color:#fff;font-weight:700;font-size:11px;}
  .pg-wrap .stage.active .stage-label,
  .pg-wrap .stage.done .stage-label,
  .pg-wrap .stage.err .stage-label{color:var(--text);font-weight:500;}
  .pg-wrap .stage-sep{flex:1;height:1px;background:var(--border);}

  .pg-wrap progress#progBar{
    width:100%;height:6px;border:none;background:#f3f4f6;border-radius:3px;overflow:hidden;display:block;
  }
  .pg-wrap progress#progBar::-webkit-progress-bar{background:#f3f4f6;border-radius:3px;}
  .pg-wrap progress#progBar::-webkit-progress-value{background:var(--accent);border-radius:3px;transition:width .2s;}
  .pg-wrap progress#progBar::-moz-progress-bar{background:var(--accent);border-radius:3px;}
  .pg-wrap .status-line{font-size:12px;color:var(--muted);margin:6px 0 0 0;min-height:1em;}

  .pg-wrap .result-card{ margin-top:14px; }
  .pg-wrap .result-card.err{
    padding:12px 14px;border-radius:8px;
    background:var(--err-light);border:1px solid var(--err-border);
  }
  .pg-wrap .result-card .result-head{margin-bottom:10px;}
  .pg-wrap .dl-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
  .pg-wrap .result-summary{font-size:14px;color:var(--text);font-weight:500;flex:1;min-width:180px;}
  .pg-wrap .result-summary .stat{color:var(--muted);font-weight:400;font-size:12px;margin-left:6px;}
  .pg-wrap .btn-download{
    background:var(--ok);border-color:var(--ok);color:#fff !important;padding:0 10px;height:26px;
    font-size:11px;letter-spacing:.01em;
    display:inline-flex;align-items:center;gap:4px;text-decoration:none;font-weight:500;
    border:1px solid var(--ok);border-radius:5px;transition:background .15s,border-color .15s;
  }
  .pg-wrap .btn-download:hover{background:var(--ok-dark);border-color:var(--ok-dark);color:#fff !important;text-decoration:none;}
  .pg-wrap .plot-img{max-width:100%;border:1px solid var(--border);border-radius:6px;background:#fff;display:block;}

  .pg-wrap .meta-panel{
    background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;
    padding:14px 16px;margin:14px 0 0 0;color:var(--text);font-size:13px;
  }
  .pg-wrap .meta-panel code{background:#eef2f7;padding:1px 4px;border-radius:4px;}
  .pg-wrap .meta-panel small{color:var(--muted);}

  .pg-wrap details.log-wrap{margin-top:12px;}
  .pg-wrap details.log-wrap summary{cursor:pointer;font-size:12px;color:var(--muted);padding:4px 0;}
  .pg-wrap details.log-wrap summary:hover{color:var(--text);}

  @media (max-width:620px){
    .pg-wrap{margin:8px;}
    .pg-wrap .panel{padding:12px;}
    .pg-wrap .stages{font-size:11px;}
    .pg-wrap .btn-download{height:auto;min-height:26px;padding:4px 10px;word-break:break-all;}
  }

  /* polish v2 */
  .pg-wrap .panel{box-shadow:0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.02);}
  .pg-wrap .meta-panel{box-shadow:0 1px 3px rgba(0,0,0,.03);}
  .pg-wrap .btn:focus-visible,
  .pg-wrap .inline-ctl select:focus-visible,
  .pg-wrap .inline-ctl input:focus-visible,
  .pg-wrap .btn-download:focus-visible{
    outline:2px solid var(--accent);outline-offset:2px;
  }
  .pg-wrap .btn:active:not(:disabled),
  .pg-wrap .btn-primary:active:not(:disabled),
  .pg-wrap .btn-download:active{transform:translateY(1px);}
  .pg-wrap .meta-panel a{color:var(--accent);text-decoration:none;transition:color .15s;}
  .pg-wrap .meta-panel a:hover{text-decoration:underline;color:var(--accent-dark);}
  .pg-wrap .page-caption{
    font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;
    margin:0 0 8px 4px;display:flex;align-items:center;gap:6px;
  }
  .pg-wrap .page-caption .dot{width:5px;height:5px;border-radius:50%;background:var(--accent);display:inline-block;}
  .pg-wrap .result-card.err{position:relative;padding-left:54px;}
  .pg-wrap .result-card.err::before{
    content:"×";position:absolute;left:14px;top:12px;
    width:28px;height:28px;border-radius:50%;background:var(--err);color:#fff;
    display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;
  }
</style>

<div class="pg-wrap">

<div class="page-caption"><span class="dot"></span>Interactive · PANGEA</div>

<!-- Interactive panel -->
<div class="panel">
  <div class="ctrl-row">
    <label class="inline-ctl">
      <span>Cell</span>
      <select id="cellSelect" style="min-width:160px;">
        <option>Astrocyte</option>
        <option>B_GC</option>
        <option>B_mature</option>
        <option>B_progenitor</option>
        <option>Ciliated</option>
        <option>Dendritic_classical</option>
        <option>Dendritic_plasmacytoid</option>
        <option>Ductal</option>
        <option>Endothelial</option>
        <option>Erythroid</option>
        <option>Fibroblast</option>
        <option>Hematopoietic</option>
        <option>Hepatocyte</option>
        <option>Macrophage</option>
        <option>Mast&Basophil</option>
        <option>Melanocyte</option>
        <option>Monocyte</option>
        <option>Muller</option>
        <option selected>Mural</option>
        <option>Neuron_bipolar</option>
        <option>Neuron_excitatory</option>
        <option>Neuron_inhibitory</option>
        <option>Neutrophil</option>
        <option>Oligodendrocyte_mature</option>
        <option>Oligodendrocyte_progenitor</option>
        <option>Plasma</option>
        <option>Platelet</option>
        <option>Rod</option>
        <option>Schwann</option>
        <option>Spermatocyte</option>
        <option>Squamous</option>
        <option>T&NK</option>
      </select>
    </label>

    <label class="inline-ctl" style="flex:1;min-width:200px;">
      <span>Gene</span>
      <input id="geneInput" type="text" value="TNFAIP6" style="flex:1;min-width:160px;">
    </label>

    <label class="inline-ctl">
      <span>Sort</span>
      <select id="sortSelect" style="min-width:130px;">
        <option value="expression" selected>by expression</option>
        <option value="alpha">alphabetical</option>
      </select>
    </label>

    <button class="btn btn-primary" id="runBtn" type="button" disabled>Explore</button>
  </div>

  <!-- Stepper: Boot → Data → Plot -->
  <div class="stages" id="stages">
    <span class="stage" id="stage-boot"><span class="stage-dot"></span><span class="stage-label">Boot</span></span>
    <span class="stage-sep"></span>
    <span class="stage" id="stage-data"><span class="stage-dot"></span><span class="stage-label">Data</span></span>
    <span class="stage-sep"></span>
    <span class="stage" id="stage-plot"><span class="stage-dot"></span><span class="stage-label">Plot</span></span>
  </div>

  <progress id="progBar" max="100" value="0"></progress>
  <div class="status-line" id="progStatus">Loading assets…</div>

  <!-- Result card (plot output + downloads) -->
  <div class="result-card" id="resultCard" style="display:none;">
    <div class="result-head">
      <div class="result-summary" id="resultSummary"></div>
      <div class="dl-row">
        <a class="btn-download" id="downloadPNG" download="plot.png" style="display:none;">⬇ Download PNG</a>
        <a class="btn-download" id="downloadCSV" download="plot.csv" style="display:none;">⬇ Download CSV</a>
        <a class="btn-download" id="downloadEnrichmentPNG" download="enrichment.png" style="display:none;">⬇ Download enrichment</a>
      </div>
    </div>
    <img class="plot-img" id="plotImg" alt="plot" style="display:none;">
    <img class="plot-img" id="plotImgEnrichment" alt="enrichment plot" style="display:none;margin-top:12px;">
  </div>
</div>

<!-- Info panel -->
<div class="meta-panel">
  <strong>Gene expression in organ × disease context</strong>
  <p style="margin:6px 0 8px 0;">
    For a chosen cell type and gene, the dotplot shows mean expression and coverage
    across organ × disease combinations from the PANGEA database.
  </p>
  <ol style="margin:0 0 0 18px;">
    <li style="margin:2px 0;">rows = organ &nbsp;·&nbsp; columns = disease</li>
    <li style="margin:2px 0;">dot <strong>color</strong> = mean <strong>expression</strong> &nbsp;&amp;&nbsp; dot <strong>size</strong> = <strong>coverage</strong> (fraction expressing)</li>
    <li style="margin:2px 0;">organ × disease combinations not covered by the database → light grey cell</li>
  </ol>

  <p style="margin:12px 0 6px 0;"><strong>Enrichment plot</strong></p>
  <p style="margin:0 0 6px 0;">GSEA-style test of preferential expression in Disease (vs Control) and Tumor (vs non-tumor) samples, ranked by gene expression (pseudobulk).</p>
  <ol style="margin:0 0 0 18px;">
    <li style="margin:2px 0;"><code>NES</code> = normalized ES from 200-permutation null</li>
    <li style="margin:2px 0;"><code>FDR</code> = false discovery rate from the NES permutation null</li>
  </ol>
</div>

<!-- Log (collapsed by default) -->
<details class="log-wrap">
  <summary>Log</summary>
  <pre id="log" style="
    background:#0a0f17;color:#e8eef7;padding:8px 10px;border-radius:6px;overflow:auto;height:200px;
    white-space:pre-wrap;font-size:11px;line-height:1.3;font-family:ui-monospace,Menlo,Consolas,monospace;margin-top:6px;">
  </pre>
</details>

</div><!-- /.pg-wrap -->


<script>
(function(){
  const BASE = "/assets/data/expression_context_profile/";
  const FONT = "'DejaVu Sans', Verdana, sans-serif";
  const GREY = "#374151";
  const COL = {Control: "#9ca3af", Cancer: "#dc2626", Other: "#f59e0b"};
  const ORRD = ["fff7ec","fee8c8","fdd49e","fdbb84","fc8d59","ef6548","d7301f","b30000","7f0000"];
  const RDBU = ["053061","2166ac","4393c3","92c5de","d1e5f0","f7f7f7","fddbc7","f4a582","d6604d","b2182b","67001f"];
  const $ = (id)=>document.getElementById(id);
  const log = (m)=>{ const el=$("log"); el.textContent += m + "\n"; el.scrollTop = el.scrollHeight; };
  const stage = (p,m)=>{ $("progBar").value = p; $("progStatus").textContent = m; };
  const setStage = (s,st)=>{ const el=$("stage-"+s); el.classList.remove("active","done","err"); if(st) el.classList.add(st); };
  const IDS = ["resultCard","plotImg","plotImgEnrichment","downloadPNG","downloadCSV","downloadEnrichmentPNG"];
  const hideResult = ()=>{ IDS.forEach(id=>$(id).style.display = "none"); $("resultCard").classList.remove("err"); };
  const cmp = (a,b)=> a < b ? -1 : a > b ? 1 : 0;
  const p10 = (k)=> Number("1e" + k);
  const f2 = (v)=> +v.toFixed(2);
  const esc = (s)=> String(s).replace(/[&<>"]/g, c=>"&#" + c.charCodeAt(0) + ";");
  const ctx = document.createElement("canvas").getContext("2d");
  const tw = (s, size, bold)=>{ ctx.font = (bold ? "bold " : "") + size + "px " + FONT; return ctx.measureText(s).width; };

  const H2F = new Float32Array(65536);
  for(let h=0; h<65536; h++){
    const s = h & 0x8000 ? -1 : 1, e = h >> 10 & 31, f = h & 1023;
    H2F[h] = e === 0 ? s*f*Math.pow(2,-24) : e === 31 ? (f ? NaN : s*Infinity) : s*(1 + f/1024)*Math.pow(2, e - 15);
  }

  function lut(hex){
    const c = hex.map(h=>[0,2,4].map(i=>parseInt(h.slice(i, i+2), 16)/255)), n = c.length - 1;
    return Array.from({length:256}, (_, i)=>{
      const x = i/255*n, k = Math.min(n - 1, Math.floor(x)), f = x - k;
      return "#" + c[k].map((v,ch)=>Math.round((v + (c[k+1][ch] - v)*f)*255).toString(16).padStart(2,"0")).join("");
    });
  }
  const OR = lut(ORRD), RB = lut(RDBU);
  const cidx = (t)=> Math.max(0, Math.min(255, Math.trunc((t || 0)*256)));

  async function getBuf(name){ const r = await fetch(BASE + name); if(!r.ok) throw new Error("HTTP " + r.status + " for " + name); return r.arrayBuffer(); }
  async function getJSON(name){ const r = await fetch(BASE + name); if(!r.ok) throw new Error("HTTP " + r.status + " for " + name); return r.json(); }

  function parseNpy(b){
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const v1 = b[6] === 1, h0 = v1 ? 10 : 12, hl = v1 ? dv.getUint16(8, true) : dv.getUint32(8, true);
    const hdr = new TextDecoder().decode(b.subarray(h0, h0 + hl));
    const T = {"<f2":Uint16Array, "|u1":Uint8Array, "<f4":Float32Array, "<f8":Float64Array}[(hdr.match(/'descr':\s*'([^']+)'/) || [])[1]];
    const shape = ((hdr.match(/'shape':\s*\(([^)]*)\)/) || [])[1] || "").split(",").filter(s=>s.trim()).map(Number);
    if(!T || !/'fortran_order':\s*True/.test(hdr) && shape.length > 1 && shape[0] > 1) throw new Error("Unsupported array");
    const off = b.byteOffset + h0 + hl, len = shape.reduce((a,c)=>a*c, 1);
    return {data: off % T.BYTES_PER_ELEMENT ? new T(b.slice(h0 + hl).buffer, 0, len) : new T(b.buffer, off, len), shape};
  }

  async function readNpz(buf, want){
    const b = new Uint8Array(buf), dv = new DataView(buf), out = {};
    let e = b.length - 22;
    while(e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if(e < 0) throw new Error("Bad npz");
    let n = dv.getUint16(e + 10, true), p = dv.getUint32(e + 16, true);
    if(p === 0xffffffff || n === 0xffff){ const z = Number(dv.getBigUint64(e - 12, true)); n = Number(dv.getBigUint64(z + 32, true)); p = Number(dv.getBigUint64(z + 48, true)); }
    for(let i=0; i<n; i++){
      let cs = dv.getUint32(p + 20, true), us = dv.getUint32(p + 24, true), off = dv.getUint32(p + 42, true);
      const method = dv.getUint16(p + 10, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
      const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nl)).replace(/\.npy$/, "");
      for(let x = p + 46 + nl; x < p + 46 + nl + xl; x += 4 + dv.getUint16(x + 2, true)){
        if(dv.getUint16(x, true) !== 1) continue;
        let q = x + 4;
        if(us === 0xffffffff){ us = Number(dv.getBigUint64(q, true)); q += 8; }
        if(cs === 0xffffffff){ cs = Number(dv.getBigUint64(q, true)); q += 8; }
        if(off === 0xffffffff) off = Number(dv.getBigUint64(q, true));
      }
      p += 46 + nl + xl + cl;
      if(!want.includes(name)) continue;
      const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true), raw = b.subarray(start, start + cs);
      const data = method === 8 ? new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer()) : raw.slice();
      out[name] = parseNpy(data);
    }
    return out;
  }

  function pwSum(a, i0, n){
    if(n < 8){ let r = -0; for(let i=0; i<n; i++) r += a[i0 + i]; return r; }
    if(n <= 128){
      const r = [a[i0], a[i0+1], a[i0+2], a[i0+3], a[i0+4], a[i0+5], a[i0+6], a[i0+7]];
      let i = 8;
      for(; i < n - n % 8; i += 8) for(let k=0; k<8; k++) r[k] += a[i0 + i + k];
      let res = ((r[0] + r[1]) + (r[2] + r[3])) + ((r[4] + r[5]) + (r[6] + r[7]));
      for(; i < n; i++) res += a[i0 + i];
      return res;
    }
    let n2 = Math.floor(n / 2); n2 -= n2 % 8;
    return pwSum(a, i0, n2) + pwSum(a, i0 + n2, n - n2);
  }

  function argsortQ(v){
    const n = v.length, a = Int32Array.from({length:n}, (_, i)=>i), st = [], dp = [];
    const less = (x, y)=> x < y || (y !== y && x === x);
    const sw = (i, j)=>{ const t = a[i]; a[i] = a[j]; a[j] = t; };
    const heap = (lo, cnt)=>{
      const g = (k)=>a[lo + k - 1], s = (k, x)=>{ a[lo + k - 1] = x; };
      const sift = (l, m, tmp)=>{ let i = l, j = l << 1; while(j <= m){ if(j < m && less(v[g(j)], v[g(j + 1)])) j++; if(less(v[tmp], v[g(j)])){ s(i, g(j)); i = j; j += j; } else break; } s(i, tmp); };
      for(let l = cnt >> 1; l > 0; --l) sift(l, cnt, g(l));
      for(let m = cnt; m > 1;){ const tmp = g(m); s(m, g(1)); m--; sift(1, m, tmp); }
    };
    let pl = 0, pr = n - 1, cd = 0;
    for(let x = n; x > 1; x >>= 1) cd++;
    cd *= 2;
    for(;;){
      if(cd < 0) heap(pl, pr - pl + 1);
      else {
        while(pr - pl > 15){
          const pm = pl + ((pr - pl) >> 1);
          if(less(v[a[pm]], v[a[pl]])) sw(pm, pl);
          if(less(v[a[pr]], v[a[pm]])) sw(pr, pm);
          if(less(v[a[pm]], v[a[pl]])) sw(pm, pl);
          const vp = v[a[pm]];
          let pi = pl, pj = pr - 1;
          sw(pm, pj);
          for(;;){
            do ++pi; while(less(v[a[pi]], vp));
            do --pj; while(less(vp, v[a[pj]]));
            if(pi >= pj) break;
            sw(pi, pj);
          }
          sw(pi, pr - 1);
          if(pi - pl < pr - pi){ st.push(pi + 1, pr); pr = pi - 1; } else { st.push(pl, pi - 1); pl = pi + 1; }
          dp.push(--cd);
        }
        for(let pi = pl + 1; pi <= pr; ++pi){
          const vi = a[pi], vp = v[vi];
          let pj = pi, pk = pi - 1;
          while(pj > pl && less(vp, v[a[pk]])) a[pj--] = a[pk--];
          a[pj] = vi;
        }
      }
      if(!st.length) break;
      pr = st.pop(); pl = st.pop(); cd = dp.pop();
    }
    return a;
  }

  function nargsortDesc(vals){
    const idx = [], nan = [];
    vals.forEach((v, i)=>(v !== v ? nan : idx).push(i));
    idx.reverse();
    return Array.from(argsortQ(idx.map(i=>vals[i])), k=>idx[k]).reverse().concat(nan);
  }

  function f32Mean(xs){
    let s = 0, c = 0;
    for(const v of xs){ const y = Math.fround(v - c), t = Math.fround(s + y); c = Math.fround(Math.fround(t - s) - y); if(c !== c) c = 0; s = t; }
    return Math.fround(s / xs.length);
  }
  function sem(xs){
    let n = 0, m = 0, m2 = 0;
    for(const v of xs){ n++; const o = m; m += (v - o)/n; m2 += (v - m)*(v - o); }
    return n <= 1 ? 0 : Math.sqrt(m2/(n - 1))/Math.sqrt(n);
  }

  function PCG64(seed){
    const M = (a, b)=>Math.imul(a, b) >>> 0;
    let hc = 0x43b0d7e5, hb = 0x8b51f9dd;
    const hm = (v)=>{ v = (v ^ hc) >>> 0; hc = M(hc, 0x931e8875); v = M(v, hc); return (v ^ v >>> 16) >>> 0; };
    const mix = (x, y)=>{ const r = (M(0xca01f9dd, x) - M(0x4973f715, y)) >>> 0; return (r ^ r >>> 16) >>> 0; };
    const pool = [hm(seed >>> 0), hm(0), hm(0), hm(0)];
    for(let s=0; s<4; s++) for(let d=0; d<4; d++) if(s !== d) pool[d] = mix(pool[d], hm(pool[s]));
    const w = [];
    for(let i=0; i<8; i++){ let v = (pool[i % 4] ^ hb) >>> 0; hb = M(hb, 0x58f38ded); v = M(v, hb); w.push((v ^ v >>> 16) >>> 0); }
    const limbs = (h0, h1, l0, l1)=>[l0 & 65535, l0 >>> 16, l1 & 65535, l1 >>> 16, h0 & 65535, h0 >>> 16, h1 & 65535, h1 >>> 16];
    const init = limbs(w[0], w[1], w[2], w[3]), seq = limbs(w[4], w[5], w[6], w[7]);
    const MUL = [0xf645, 0x9fcc, 0xdf64, 0x4385, 0x5da4, 0x1fc6, 0xed05, 0x2360], inc = [];
    for(let k=0, c=1; k<8; k++){ inc.push((seq[k] << 1 | c) & 65535); c = seq[k] >>> 15; }
    const st = [0,0,0,0,0,0,0,0], r = [0,0,0,0,0,0,0,0];
    const step = ()=>{
      r.fill(0);
      for(let i=0; i<8; i++){ const si = st[i]; if(si) for(let j=0; i + j < 8; j++) r[i + j] += si*MUL[j]; }
      for(let k=0, c=0; k<8; k++){ const t = r[k] + inc[k] + c; st[k] = t % 65536; c = Math.floor(t / 65536); }
    };
    step();
    for(let k=0, c=0; k<8; k++){ const t = st[k] + init[k] + c; st[k] = t & 65535; c = t >>> 16; }
    step();
    const next = ()=>{
      step();
      let a = ((st[3] << 16 | st[2]) ^ (st[7] << 16 | st[6])) >>> 0, b = ((st[1] << 16 | st[0]) ^ (st[5] << 16 | st[4])) >>> 0, k = st[7] >>> 10;
      if(k >= 32){ [a, b] = [b, a]; k -= 32; }
      return k ? [((a >>> k) | (b << (32 - k))) >>> 0, ((b >>> k) | (a << (32 - k))) >>> 0] : [a, b];
    };
    let has = false, buf = 0;
    const u32 = ()=>{ if(has){ has = false; return buf; } const [h, l] = next(); has = true; buf = h; return l; };
    return {
      next, u32,
      dbl(){ const [h, l] = next(); return (h*2097152 + (l >>> 11))*1.1102230246251565e-16; },
      interval(max){
        if(max === 0) return 0;
        let m = max; m |= m >>> 1; m |= m >>> 2; m |= m >>> 4; m |= m >>> 8; m |= m >>> 16;
        let v; while((v = (u32() & m) >>> 0) > max); return v;
      },
    };
  }

  function pyFixed(x, d){
    let s = x.toFixed(d);
    const L = Math.abs(x).toFixed(Math.min(100, d + 60)), dot = L.indexOf(".");
    if(/^50*$/.test(L.slice(dot + 1 + d)) && +L[dot + d - (d ? 0 : 1)] % 2 === 0) s = (x < 0 ? "-" : "") + L.slice(0, d ? dot + 1 + d : dot);
    return s;
  }
  function npF32(x){
    if(x !== x) return "";
    if(!isFinite(x)) return x > 0 ? "inf" : "-inf";
    if(x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
    const a = Math.abs(x), [mt, ex] = a.toExponential(99).split("e"), D = mt.replace(".", "");
    let v = a;
    for(let p=1; p<=9; p++){
      const d = D.slice(0, p), r = D.slice(p), up = r[0] > "5" || r[0] === "5" && (/[1-9]/.test(r.slice(1)) || d[p - 1] % 2 === 1);
      v = Number(`${up ? +d + 1 : d}e${ex - p + 1}`);
      if(Math.fround(v) === a) break;
    }
    if(x < 0) v = -v;
    if(a >= 1e-4 && a < 1e16){ const s = String(v); return /[.e]/.test(s) ? s : s + ".0"; }
    return v.toExponential().replace(/e([+-])(\d)$/, "e$10$2");
  }

  function divmod(a, b){
    let m = a % b, d = (a - m)/b;
    if(m){ if((b < 0) !== (m < 0)){ m += b; d -= 1; } } else m = b < 0 ? -0 : 0;
    let q;
    if(d){ q = Math.floor(d); if(d - q > 0.5) q += 1; } else q = a/b < 0 ? -0 : 0;
    return [q, m];
  }
  function nonsing(a, b, ex, tiny = 1e-15){
    if(!isFinite(a) || !isFinite(b)) return [-ex, ex];
    if(b < a) [a, b] = [b, a];
    const m = Math.max(Math.abs(a), Math.abs(b));
    if(m < 1e6/tiny*2.2250738585072014e-308) return [-ex, ex];
    if(b - a <= m*tiny) return a === 0 && b === 0 ? [-ex, ex] : [a - ex*Math.abs(a), b + ex*Math.abs(b)];
    return [a, b];
  }
  function autoLim(a, b, sticky){
    [a, b] = nonsing(a, b, 0.05);
    const tol = 1e-5*Math.max(Math.abs(a), Math.abs(b), Math.abs(b - a)), d = (b - a)*0.05;
    const lo = sticky.filter(s=>s < a + tol), hi = sticky.filter(s=>s >= b - tol);
    let x0 = a - d, x1 = b + d;
    if(lo.length) x0 = Math.max(x0, Math.max(...lo));
    if(hi.length) x1 = Math.min(x1, Math.min(...hi));
    return nonsing(x0, x1, 0.001);
  }
  const nbins = (len, size)=> Math.min(9, Math.max(1, Math.floor(len/size)));
  function maxN(vmin, vmax, nb){
    [vmin, vmax] = nonsing(vmin, vmax, 1e-13, 1e-14);
    const dv = Math.abs(vmax - vmin), mv = (vmax + vmin)/2;
    const off = Math.abs(mv)/dv < 100 ? 0 : Math.sign(mv)*p10(Math.floor(Math.log10(Math.abs(mv))));
    const scale = p10(Math.floor(Math.log10(dv/nb))), lo = vmin - off, hi = vmax - off, raw = (hi - lo)/nb;
    const steps = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20].map(s=>s*scale);
    let k = steps.findIndex(s=>s >= raw), ticks = [];
    if(k < 0) k = steps.length - 1;
    for(; k >= 0; k--){
      const s = steps[k], best = divmod(lo, s)[0]*s;
      const tol = off > 0 ? Math.min(0.4999, Math.max(1e-10, Math.pow(10, Math.log10(Math.abs(off)/s) - 12))) : 1e-10;
      const [d1, m1] = divmod(lo - best, s), [d2, m2] = divmod(hi - best, s);
      const a = Math.abs(m1/s - 1) < tol ? d1 + 1 : d1, z = Math.abs(m2/s) < tol ? d2 : d2 + 1;
      ticks = [];
      for(let t = a; t <= z; t++) ticks.push(t*s + best);
      if(ticks.filter(t=>t <= hi && t >= lo).length >= 2) break;
    }
    return ticks.map(t=>t + off);
  }
  function rint(x){ const r = Math.round(x); return r - x === 0.5 && r % 2 !== 0 ? r - 1 : r; }
  function fmtTicks(locs, vmin, vmax){
    const vis = locs.filter(v=>v >= vmin && v <= vmax);
    let oom = 0;
    if(vis.length){ const m = Math.max(...vis.map(Math.abs)); const o = m ? Math.floor(Math.log10(m)) : 0; if(o <= -5 || o >= 6) oom = o; }
    const L = locs.map(v=>v/p10(oom)), B = L.length < 2 ? L.concat([vmin/p10(oom), vmax/p10(oom)]) : L;
    let rg = Math.max(...B) - Math.min(...B);
    if(rg === 0) rg = Math.max(...B.map(Math.abs));
    if(rg === 0) rg = 1;
    const ro = Math.floor(Math.log10(rg)), th = 1e-3*p10(ro);
    let sig = Math.max(0, 3 - ro);
    while(sig >= 0 && Math.max(...L.map(v=>Math.abs(v - rint(v*p10(sig))/p10(sig)))) < th) sig--;
    sig++;
    return {labels: L.map(v=>pyFixed(Math.abs(v) < 1e-8 ? 0 : v, sig).replace("-", "−")), offset: oom ? ("1e" + oom).replace("-", "−") : ""};
  }
  function axisTicks(lo, hi, len, size){
    const t = maxN(lo, hi, nbins(len, 2*size)), f = fmtTicks(t, lo, hi), e = 1e-10*(hi - lo);
    return t.map((v, i)=>[v, f.labels[i]]).filter(([v])=>v >= lo - e && v <= hi + e).concat(f.offset ? [[null, f.offset]] : []);
  }

  function mk(){
    const p = [], box = [Infinity, Infinity, -Infinity, -Infinity];
    const fit = (a, b, c, d)=>{ box[0] = Math.min(box[0], a); box[1] = Math.min(box[1], b); box[2] = Math.max(box[2], c); box[3] = Math.max(box[3], d); };
    return {
      p, fit,
      add(s){ p.push(s); },
      line(x1, y1, x2, y2, c, w, o){ p.push(`<path d="M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}" stroke="${c}" stroke-width="${w}"${o ? ` stroke-opacity="${o}"` : ""}/>`); fit(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)); },
      t(x, y, s, size, o = {}){
        const w = tw(s, size, o.bold), dy = {c:0.38, m:0.26, t:0.76, b:-0.24, base:0}[o.v || "c"], a = o.a || "start", k = {start:0, middle:0.5, end:1}[a];
        const at = `font-size="${size}"${o.bold ? ' font-weight="bold"' : ""}${o.fill ? ` fill="${o.fill}"` : ""}${k ? ` text-anchor="${a}"` : ""}${dy ? ` dy="${dy}em"` : ""}`;
        if(o.r){ p.push(`<text transform="translate(${f2(x)} ${f2(y)}) rotate(-90)" ${at}>${esc(s)}</text>`); fit(x + (dy - 0.76)*size, y - (1 - k)*w, x + (dy + 0.24)*size, y + k*w); }
        else { p.push(`<text x="${f2(x)}" y="${f2(y)}" ${at}>${esc(s)}</text>`); fit(x - k*w, y + (dy - 0.76)*size, x + (1 - k)*w, y + (dy + 0.24)*size); }
        return w;
      },
      done(){
        const pad = 7.2, W = box[2] - box[0] + 2*pad, H = box[3] - box[1] + 2*pad;
        return {W, H, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f2(box[0] - pad)} ${f2(box[1] - pad)} ${f2(W)} ${f2(H)}" font-family="${FONT}">${p.join("")}</svg>`};
      },
    };
  }
  function yAxis(S, x0, y0, h, ticks, size, label, lsize){
    let mw = 0;
    for(const [v, s] of ticks){
      if(v === null){ S.t(x0, y0 - 1, s, size, {v:"b", fill:GREY}); continue; }
      const y = y0 + h - v*h;
      S.line(x0 - 2, y, x0, y, GREY, 0.8);
      mw = Math.max(mw, S.t(x0 - 3, y, s, size, {a:"end", fill:GREY}));
    }
    const lines = label.split("\n"), ax = x0 - 3 - mw - 4;
    lines.forEach((s, i)=>S.t(ax - (lines.length - 1 - i)*0.76*lsize*1.2, y0 + h/2, s, lsize, {a:"middle", r:1, v:"b", fill:GREY}));
  }

  function dotFigure(gene, cell, P, bar){
    const {organs, diseases, A, C} = P, nO = organs.length, nD = diseases.length, S = mk();
    const w = 0.775*Math.max(3, 0.15*nD + 1.5)*72, cw = w/nD, h = Math.max(14*nO, 115), rh = h/nO, fd = Math.min(9.5, 0.85*cw);
    const LT = ["0","0.25","0.5","0.75","1"], xr = w + 10, cx = xr + 11, ch = 45, ly = h - 55;
    let vmax = -Infinity, cells = "", dots = "", ld = 0;
    for(const v of A) if(v > vmax) vmax = v;
    vmax = Math.max(isFinite(vmax) ? vmax : 1, 1e-6);
    for(let i=0; i < nO; i++) for(let j=0; j < nD; j++){
      const k = i*nD + j;
      if(A[k] !== A[k]) continue;
      cells += `<rect x="${f2(j*cw)}" y="${f2(i*rh)}" width="${f2(cw)}" height="${f2(rh)}"/>`;
      const r = Math.sqrt(Math.min(1, Math.max(0, C[k]))*75)/2;
      if(r > 0) dots += `<circle cx="${f2((j + 0.5)*cw)}" cy="${f2((i + 0.5)*rh)}" r="${f2(r)}" fill="${OR[cidx(A[k]/vmax)]}"/>`;
    }
    S.add(`<g shape-rendering="crispEdges"><rect width="${f2(w)}" height="${f2(h)}" fill="#e5e7eb"/><g fill="#fafbfc">${cells}</g></g><g stroke="#000" stroke-width="0.4">${dots}</g>`);
    S.fit(0, 0, w, h);
    organs.forEach((s, i)=>S.t(-2, (i + 0.5)*rh, s, 9.5, {a:"end", fill:GREY}));
    diseases.forEach((s, j)=>{ ld = Math.max(ld, S.t((j + 0.5)*cw, h + 2, s, fd, {a:"end", r:1, v:"m", fill:GREY})); });
    S.t(0, -16, `${gene} expression in ${cell}`, 14, {bold:1, fill:"#111827", v:"base"});

    S.add(`<defs><linearGradient id="ctxcb" x1="0" y1="1" x2="0" y2="0">${ORRD.map((c, k)=>`<stop offset="${k/8}" stop-color="#${c}"/>`).join("")}</linearGradient></defs><rect x="${f2(cx)}" width="6" height="${ch}" fill="url(#ctxcb)"/>`);
    S.fit(cx, 0, cx + 6, ch);
    for(const [v, s] of axisTicks(0, vmax, ch, 8.5)){
      if(v === null){ S.t(cx + 6, -2, s, 8.5, {v:"b", fill:GREY}); continue; }
      const y = ch - v/vmax*ch;
      S.line(cx + 6, y, cx + 8, y, GREY, 0.8);
      S.t(cx + 9.5, y, s, 8.5, {fill:GREY});
    }
    S.t(xr + 8, ch/2, "mean exp.", 8, {a:"middle", r:1, v:"b", fill:GREY});
    [0, 0.25, 0.5, 0.75, 1].forEach((s, k)=>{
      const y = ly + 5.5 + 11*k;
      S.add(`<circle cx="${f2(cx + 4.4)}" cy="${f2(y)}" r="${f2(Math.max(Math.sqrt(s*75)/2, 0.35))}" fill="#9ca3af" stroke="#000" stroke-width="0.4"/>`);
      S.t(cx + 13, y, LT[k], 8);
    });
    S.t(xr + 8, ly + 27.5, "coverage", 8, {a:"middle", r:1, v:"b", fill:GREY});

    if(bar){
      const by = h + 2 + ld + 18, bh = 110, n = bar.labels.length, bw = w/n, fb = Math.min(8.5, 0.85*bw);
      let dmin = 0, dmax = 0;
      bar.means.forEach((m, i)=>{ dmin = Math.min(dmin, m - bar.sems[i]); dmax = Math.max(dmax, m + bar.sems[i]); });
      bar.pts.forEach(([, y])=>{ dmin = Math.min(dmin, y); dmax = Math.max(dmax, y); });
      const [lo, hi] = autoLim(dmin, dmax, [0]), Y = (v)=>by + bh - (v - lo)/(hi - lo)*bh, X = (v)=>(v + 0.5)*bw;
      let bars = "", eb = "", pts = "";
      bar.means.forEach((m, i)=>{
        bars += `<rect x="${f2(X(i - 0.39))}" y="${f2(Y(Math.max(m, 0)))}" width="${f2(0.78*bw)}" height="${f2(Math.abs(Y(m) - Y(0)))}" fill="${bar.colors[i]}"/>`;
        const xc = f2(X(i)), y1 = f2(Y(m - bar.sems[i])), y2 = f2(Y(m + bar.sems[i]));
        eb += `M${xc} ${y1}V${y2}M${f2(xc - 1.2)} ${y1}h2.4M${f2(xc - 1.2)} ${y2}h2.4`;
      });
      bar.pts.forEach(([x, y, c])=>{ pts += `<circle cx="${f2(X(x))}" cy="${f2(Y(y))}" r="1.32" fill="${c}"/>`; });
      S.add(`<g fill-opacity="0.55" stroke="#000" stroke-opacity="0.55" stroke-width="0.4">${bars}</g><path d="${eb}" fill="none" stroke="#000" stroke-width="0.5"/><path d="M0 ${f2(by)}V${f2(by + bh)}H${f2(w)}" fill="none" stroke="#9ca3af" stroke-width="0.5"/><g fill-opacity="0.95" stroke="#000" stroke-opacity="0.95" stroke-width="0.3">${pts}</g>`);
      S.fit(0, by, w, by + bh);
      yAxis(S, 0, by, bh, axisTicks(lo, hi, bh, 8.5).map(([v, s])=>[v === null ? null : (v - lo)/(hi - lo), s]), 8.5, "mean expression", 10);
      bar.labels.forEach((s, i)=>S.t(X(i), by + bh + 2, s, fb, {a:"end", r:1, v:"m", fill:GREY}));
      ["Control","Cancer","Other"].forEach((s, k)=>{
        const y = by + 5.3 + k*10.6;
        S.add(`<rect x="${f2(xr)}" y="${f2(y - 3)}" width="7.5" height="6" fill="${COL[s]}"/>`);
        S.t(xr + 12.5, y, s, 8.5);
      });
    }
    return S.done();
  }

  function enrFigure(gene, cell, res){
    const S = mk(), w = 140, G = 58, rows = [];
    let top = 46;
    [95, 9, 6, 42].forEach((h)=>{ rows.push([top, h]); top += h + 2.5; });
    res.forEach(([r, col, label], c)=>{
      const x0 = c*(w + G), n = r.n, X = (v)=>x0 + v/n*w;
      const panel = (y0, h, data, color, op, ylab, ls, ts)=>{
        let mn = 0, mx = 0;
        for(const v of data){ if(v < mn) mn = v; if(v > mx) mx = v; }
        const [lo, hi] = autoLim(mn, mx, []), Y = (v)=>y0 + h - (v - lo)/(hi - lo)*h;
        let pf = `M${f2(X(0))} ${f2(Y(0))}`, pl = "";
        data.forEach((v, i)=>{ pf += `L${f2(X(i))} ${f2(Y(v))}`; pl += `${i ? "L" : "M"}${f2(X(i))} ${f2(Y(v))}`; });
        S.line(x0, Y(0), x0 + w, Y(0), "#9ca3af", 0.4);
        S.add(`<path d="${pf}L${f2(X(n - 1))} ${f2(Y(0))}Z" fill="${color}" fill-opacity="${op}"/>` + (ylab === "ES" ? `<path d="${pl}" fill="none" stroke="${color}" stroke-width="1.1" stroke-linejoin="round"/>` : ""));
        S.add(`<path d="M${f2(x0)} ${f2(y0)}V${f2(y0 + h)}H${f2(x0 + w)}" fill="none" stroke="#9ca3af" stroke-width="0.5"/>`);
        S.fit(x0, y0, x0 + w, y0 + h);
        yAxis(S, x0, y0, h, axisTicks(lo, hi, h, ts).map(([v, s])=>[v === null ? null : (v - lo)/(hi - lo), s]), ts, ylab, ls);
      };
      let [y0, h] = rows[0];
      panel(y0, h, r.running, col, 0.18, "ES", 11, 10);
      S.t(x0, y0 - 5, label, 11.5, {bold:1, fill:"#111827", v:"b"});
      [`NES=${r.nes >= 0 ? "+" : "-"}${pyFixed(Math.abs(r.nes), 2)}`, `FDR=${!isFinite(r.fdr) ? "n/a" : r.fdr < 0.001 ? "<0.001" : pyFixed(r.fdr, 3)}`]
        .forEach((s, i)=>S.t(x0 + 0.985*w, y0 + 0.05*h + i*0.76*10*1.3, s, 10, {a:"end", v:"t", fill:GREY}));
      [y0, h] = rows[1];
      let miss = "", hit = "";
      r.sh.forEach((v, i)=>{ const d = `<path d="M${f2(X(i))} ${f2(y0)}v${f2(h)}"/>`; if(v) hit += d; else miss += d; });
      S.add(`<g stroke="#9ca3af" stroke-width="0.5" stroke-opacity="0.7">${miss}</g><g stroke="#000" stroke-width="0.5" stroke-opacity="0.95">${hit}</g>`);
      S.line(x0, y0, x0 + w, y0, "#9ca3af", 0.4); S.line(x0, y0 + h, x0 + w, y0 + h, "#9ca3af", 0.4);
      [y0, h] = rows[2];
      let vm = 0, g = "";
      for(const v of r.sm) vm = Math.max(vm, Math.abs(v));
      vm = vm || 1;
      for(let i=0; i < n;){
        const c0 = RB[cidx((r.sm[i] + vm)/(2*vm))];
        let j = i + 1;
        while(j < n && RB[cidx((r.sm[j] + vm)/(2*vm))] === c0) j++;
        g += `<rect x="${f2(X(i))}" y="${f2(y0)}" width="${f2(X(j) - X(i))}" height="${f2(h)}" fill="${c0}"/>`;
        i = j;
      }
      S.add(`<g shape-rendering="crispEdges">${g}</g>`);
      [y0, h] = rows[3];
      panel(y0, h, r.sm, "#9ca3af", 0.6, "Rank\n(z-score)", 10, 9);
      S.t(x0 + w/2, y0 + h + 4, `samples (n=${n})`, 10.5, {a:"middle", v:"t", fill:GREY});
    });
    S.t(w + G/2, 4, `${gene} expression in ${cell}`, 14, {a:"middle", bold:1, fill:"#111827", v:"t"});
    return S.done();
  }

  function enrich(values, hits, nperm, seed){
    const n = values.length, m = Float64Array.from(values);
    const mu = pwSum(m, 0, n)/n, sd = Math.sqrt(pwSum(m.map(v=>(v - mu)*(v - mu)), 0, n)/n);
    for(let i=0; i<n; i++) m[i] = sd > 0 ? (m[i] - mu)/sd : m[i] - mu;
    const order = Array.from({length:n}, (_, i)=>i).sort((a, b)=>(-m[a]) - (-m[b]));
    const sm = Float32Array.from(order, i=>m[i]), sh = Uint8Array.from(order, i=>hits[i] ? 1 : 0), w = Float64Array.from(sm, Math.abs);
    let nh = 0;
    for(const h of sh) nh += h;
    const running = new Float64Array(n);
    let es = 0;
    if(nh > 0 && nh < n){
      const hw = [];
      for(let i=0; i<n; i++) if(sh[i]) hw.push(w[i]);
      const s = pwSum(hw, 0, hw.length);
      if(s !== 0){
        let acc = 0, best = -1, miss = -1/(n - nh);
        for(let i=0; i<n; i++){ acc += sh[i] ? w[i]/s : miss; running[i] = acc; if(Math.abs(acc) > best){ best = Math.abs(acc); es = acc; } }
      }
    }
    const nul = new Float64Array(nperm);
    if(nh > 0 && nh < n){
      const rng = PCG64(seed), row = new Uint8Array(n), prod = new Float64Array(n), miss = -1/(n - nh);
      for(let p=0; p<nperm; p++){
        row.set(sh);
        for(let i=n - 1; i>=0; i--){ const j = rng.interval(i), t = row[i]; row[i] = row[j]; row[j] = t; }
        for(let i=0; i<n; i++) prod[i] = row[i] ? w[i] : 0;
        let s = pwSum(prod, 0, n);
        if(s === 0) s = 1;
        let acc = 0, best = -1, val = 0;
        for(let i=0; i<n; i++){ acc += row[i] ? w[i]/s : miss; if(Math.abs(acc) > best){ best = Math.abs(acc); val = acc; } }
        nul[p] = val;
      }
    }
    const pos = [], neg = [];
    for(const v of nul) (v >= 0 ? pos : neg).push(v >= 0 ? v : -v);
    const dp = Math.max(pos.length ? pwSum(pos, 0, pos.length)/pos.length : 1, 1e-12), dn = Math.max(neg.length ? pwSum(neg, 0, neg.length)/neg.length : 1, 1e-12);
    return {n, running, sm, sh, nes: es >= 0 ? es/dp : es/dn, nul: Array.from(nul, v=>v >= 0 ? v/dp : v/dn), fdr: NaN};
  }
  function fdr(x, nul, obs){
    if(!isFinite(x)) return NaN;
    const up = x >= 0, side = (v)=>up ? v >= 0 : v < 0, tail = (v)=>up ? v >= x : v <= x;
    const ssn = nul.filter(side), sso = obs.filter(side);
    if(!ssn.length || !sso.length) return 1;
    const num = ssn.filter(tail).length/ssn.length, den = sso.filter(tail).length/sso.length;
    return Math.min(den === 0 ? num : num/den, 1);
  }

  function layout(g, sortMode){
    const {avg, cov, org, dis} = cur, nOd = org.length;
    const a = new Float32Array(nOd), c = new Float32Array(nOd), sig = new Float32Array(nOd), F255 = Math.fround(1/255);
    const nz = (v)=> v !== v ? 0 : v === Infinity ? 3.4028234663852886e38 : v === -Infinity ? -3.4028234663852886e38 : v;
    for(let i=0; i<nOd; i++){ a[i] = H2F[avg.data[g*nOd + i]]; c[i] = Math.fround(cov.data[g*nOd + i]*F255); sig[i] = Math.fround(nz(a[i])*nz(c[i])); }
    const agg = (keys, vals)=>{
      const uniq = [...new Set(keys)].sort(cmp), pos = new Map(uniq.map((k, i)=>[k, i])), out = new Float32Array(uniq.length);
      keys.forEach((k, i)=>{ const j = pos.get(k); out[j] = out[j] + vals[i]; });
      return {uniq, out};
    };
    let organs, rest;
    if(sortMode === "expression"){
      const o1 = agg(org, sig.map((s, i)=>dis[i] === "Control" ? s : 0)), o2 = agg(org, sig);
      const pr = Array.from(o1.out, v=>v > 0 ? -v : Infinity), se = Array.from(o2.out, v=>-v);
      organs = o1.uniq.map((_, i)=>i).sort((x, y)=>(pr[x] - pr[y]) || (se[x] - se[y]) || 0).map(i=>o1.uniq[i]);
      const d = agg(dis, sig);
      rest = Array.from(argsortQ(Array.from(d.out, v=>-v)), i=>d.uniq[i]).filter(x=>x !== "Control");
    } else {
      organs = [...new Set(org)].sort(cmp);
      rest = [...new Set(dis)].filter(x=>x !== "Control").sort(cmp);
    }
    const diseases = (dis.includes("Control") ? ["Control"] : []).concat(rest), nD = diseases.length;
    const oi = new Map(organs.map((o, i)=>[o, i])), di = new Map(diseases.map((d, j)=>[d, j]));
    const A = new Float32Array(organs.length*nD).fill(NaN), C = new Float32Array(organs.length*nD).fill(NaN);
    for(let k=0; k<nOd; k++){ const i = oi.get(org[k]), j = di.get(dis[k]); if(i !== undefined && j !== undefined){ A[i*nD + j] = a[k]; C[i*nD + j] = c[k]; } }
    return {organs, diseases, A, C};
  }

  function barData(g){
    const nS = cur.so.length, col = new Float32Array(nS), groups = new Map();
    for(let s=0; s<nS; s++) col[s] = H2F[smp.data[g*nS + s]];
    cur.so.forEach((k, s)=>{ if(!groups.has(k)) groups.set(k, []); groups.get(k).push(col[s]); });
    const keys = [...groups.keys()].sort(cmp), means = keys.map(k=>f32Mean(groups.get(k)));
    const rng = PCG64(42), lo = -0.18, rg = 0.18 - lo, out = {labels:[], means:[], sems:[], colors:[], pts:[], col};
    nargsortDesc(means).forEach((gi, i)=>{
      const k = keys[gi], d = k.includes("@") ? k.slice(k.indexOf("@") + 1) : "";
      const c = d === "Control" ? COL.Control : /^(Tumor|Metastasis)/.test(d) ? COL.Cancer : COL.Other;
      out.labels.push(k); out.means.push(means[gi]); out.sems.push(sem(groups.get(k))); out.colors.push(c);
      for(const v of groups.get(k)) out.pts.push([i + (lo + rg*rng.dbl()), v, c]);
    });
    return out;
  }

  async function svgToPng(svg, W, H){
    const s = Math.min(300/72, Math.sqrt(12e6/(W*H)), 8000/Math.max(W, H)), pw = Math.round(W*s), ph = Math.round(H*s);
    const url = URL.createObjectURL(new Blob([svg.replace("<svg ", `<svg width="${pw}" height="${ph}" `)], {type:"image/svg+xml"}));
    try{
      const img = new Image();
      await new Promise((ok, no)=>{ img.onload = ok; img.onerror = ()=>no(new Error("SVG render failed")); img.src = url; });
      const cv = document.createElement("canvas");
      cv.width = pw; cv.height = ph;
      const c2 = cv.getContext("2d");
      c2.fillStyle = "#fff"; c2.fillRect(0, 0, pw, ph);
      c2.drawImage(img, 0, 0, pw, ph);
      return await new Promise((ok, no)=>cv.toBlob(b=>b ? ok(b) : no(new Error("PNG encode failed")), "image/png"));
    } finally { URL.revokeObjectURL(url); }
  }
  const urls = {};
  function setDownload(id, imgId, blob, name, W){
    if(urls[id]) URL.revokeObjectURL(urls[id]);
    urls[id] = URL.createObjectURL(blob);
    $(id).href = urls[id]; $(id).download = name; $(id).textContent = `⬇ Download ${name}`; $(id).style.display = "inline-flex";
    if(imgId){ $(imgId).src = urls[id]; $(imgId).style.width = Math.round(W*150/72) + "px"; $(imgId).style.display = "block"; }
  }

  let genes = null, geneIdx = null, cur = null, smp = null, smpP = null, seq = 0, timer = null;

  async function loadCell(cell){
    const my = ++seq;
    cur = null; smp = null; smpP = null;
    $("runBtn").disabled = true; hideResult();
    setStage("data","active"); setStage("plot",null);
    stage(20, `Fetching ${cell} context …`);
    try{
      const [buf, meta] = await Promise.all([getBuf(`${cell}_context.npz`), getJSON(`${cell}_meta.json`)]);
      const z = await readNpz(buf, ["avg_od","cov_od_u8"]);
      if(my !== seq) return;
      const od = meta.od_index, at = (s)=>s.indexOf("@");
      cur = {cell, avg: z.avg_od, cov: z.cov_od_u8, org: od.map(s=>at(s) < 0 ? s : s.slice(0, at(s))), dis: od.map(s=>at(s) < 0 ? "" : s.slice(at(s) + 1)), so: meta.sample_o_d};
      log(`✅ ${cell}_context.npz (${(buf.byteLength/1e6).toFixed(2)} MB) — dotplot ready`);
      smpP = getBuf(`${cell}_samples.npz`)
        .then(async b=>{ const s = await readNpz(b, ["sample_avg"]); if(my === seq){ smp = s.sample_avg; log(`✅ ${cell}_samples.npz (${(b.byteLength/1e6).toFixed(2)} MB) — bar plot enabled`); } })
        .catch(()=>{ if(my === seq) log(`ℹ️ no ${cell}_samples.npz on the server — bar plot will be skipped`); });
      $("runBtn").disabled = false;
      setStage("data","done");
      stage(45, `Assets for '${cell}' ready (sample data still loading in background).`);
    }catch(e){
      if(my !== seq) return;
      log("❌ Asset load failed: " + (e?.message||e));
      setStage("data","err"); stage(0, "Asset load failed");
    }
  }

  async function boot(){
    try{
      setStage("boot","active"); stage(5, "Loading gene list …");
      genes = await getJSON("genes.json");
      geneIdx = new Map();
      genes.forEach((g, i)=>{ if(!geneIdx.has(g)) geneIdx.set(g, i); });
      setStage("boot","done");
      await loadCell($("cellSelect").value.trim());
    }catch(e){
      log("❌ Boot failed: " + (e?.message||e));
      setStage("boot","err"); stage(0, "Boot failed");
    }
  }

  $("cellSelect").addEventListener("change", ()=>{
    if(!genes) return;
    cur = null; $("runBtn").disabled = true;
    setStage("data","active"); setStage("plot",null);
    log(`🔁 Cell changed → reloading assets for '${$("cellSelect").value.trim()}' …`);
    clearTimeout(timer);
    timer = setTimeout(()=>loadCell($("cellSelect").value.trim()), 150);
  });

  $("runBtn").addEventListener("click", async ()=>{
    const cell = $("cellSelect").value.trim(), gene = $("geneInput").value.trim(), sortMode = $("sortSelect").value.trim();
    if(!cur || cur.cell !== cell){ alert("Please wait until the assets finish loading."); return; }
    if(!gene){ alert("Enter a gene symbol."); return; }
    if(smpP && !smp){ stage(48, "Waiting for sample-level data …"); log("⏳ samples.npz still loading — waiting before plot …"); await smpP; }
    if(!cur || cur.cell !== cell) return;
    stage(50, "Plotting …");
    log(`▶️ Plot: cell=${cell}, gene=${gene}, sort=${sortMode}, samples=${!!smp}`);
    hideResult(); setStage("plot","active");
    try{
      const g = geneIdx.get(gene);
      if(g === undefined) throw new Error(`gene '${gene}' not found in ${cell} (n_genes=${genes.length.toLocaleString("en-US")})`);
      const P = layout(g, sortMode), bar = smp ? barData(g) : null;
      const fig = dotFigure(gene, cell, P, bar), png = await svgToPng(fig.svg, fig.W, fig.H);
      const lines = ["organ,disease,mean_expression,coverage"], q = (s)=>/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      P.organs.forEach((o, i)=>P.diseases.forEach((d, j)=>lines.push([q(o), q(d), npF32(P.A[i*P.diseases.length + j]), npF32(P.C[i*P.diseases.length + j])].join(","))));
      const safe = (s)=>s.replace(/[\s/\\&]+/g, "_"), stem = `${safe(cell)}_${safe(gene)}`;
      setDownload("downloadPNG", "plotImg", png, `${stem}_context.png`, fig.W);
      setDownload("downloadCSV", null, new Blob([lines.join("\n") + "\n"], {type:"text/csv"}), `${stem}_context.csv`);
      $("resultSummary").innerHTML = `${esc(cell)} · ${esc(gene)} <span class="stat">organ × disease context</span>`;
      $("resultCard").style.display = "block";
      setStage("plot","done");
      stage(85, "Dotplot ready · computing enrichment …");
      log("✅ Dotplot rendered — computing enrichment …");
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r, 0))));
      try{
        if(bar && bar.col.length >= 8){
          const ds = cur.so.map(s=>s.slice(s.indexOf("@") + 1)), isD = ds.map(d=>d !== "Control"), isT = ds.map(d=>/^(Tumor|Metastasis)/.test(d));
          if(isD.every(Boolean) || !isD.some(Boolean) || isT.every(Boolean) || !isT.some(Boolean)) log("ℹ️ enrichment skipped (no contrast — all samples on one side)");
          else {
            const rd = enrich(bar.col, isD, 200, 42), rt = enrich(bar.col, isT, 200, 43), nul = rd.nul.concat(rt.nul), obs = [rd.nes, rt.nes];
            rd.fdr = fdr(rd.nes, nul, obs); rt.fdr = fdr(rt.nes, nul, obs);
            const ef = enrFigure(gene, cell, [[rd, COL.Other, "Disease enrichment"], [rt, COL.Cancer, "Tumor enrichment"]]);
            setDownload("downloadEnrichmentPNG", "plotImgEnrichment", await svgToPng(ef.svg, ef.W, ef.H), `${stem}_enrichment.png`, ef.W);
            log("✅ Enrichment ready.");
          }
        }
      }catch(eb){ log("⚠️ Enrichment failed: " + (eb?.message||eb)); }
      stage(100, "Done");
    }catch(e){
      stage(0, "Error"); setStage("plot","err");
      $("resultSummary").textContent = e?.message || String(e);
      $("resultCard").classList.add("err");
      $("resultCard").style.display = "block";
      log("❌ Run error: " + (e?.message||e));
    }
  });

  boot();
})();
</script>

{% endraw %}
