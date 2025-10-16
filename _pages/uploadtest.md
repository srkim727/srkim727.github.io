---
title: Upload Test
layout: page
permalink: /upload-test/
---

{% raw %}
<h3>Upload test (no dependencies)</h3>

<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
  <input type="file" id="f" />
  <button id="go">Read file</button>
</div>

<div style="margin:10px 0;">
  <label style="display:inline-block;min-width:120px;">Progress</label>
  <progress id="bar" value="0" max="100" style="width:360px;height:12px;"></progress>
  <span id="pct">0%</span>
  <span id="spd" style="margin-left:12px;opacity:.8;">0.00 MB/s</span>
</div>

<pre id="out" style="background:#0b1020;color:#e8eaf6;padding:10px;border-radius:6px;max-height:260px;overflow:auto;"></pre>

<script type="module">
  const $f = document.getElementById('f');
  const $go = document.getElementById('go');
  const $b = document.getElementById('bar'), $p = document.getElementById('pct'), $s = document.getElementById('spd'), $o = document.getElementById('out');

  const setP = v => { $b.value = v; $p.textContent = Math.round(v) + '%'; };
  const setS = v => { $s.textContent = (v||0).toFixed(2) + ' MB/s'; };
  const log  = m => { $o.textContent += m + "\n"; $o.scrollTop = $o.scrollHeight; };

  // Show any page errors
  window.addEventListener('error', e => log('Error: ' + e.message));
  window.addEventListener('unhandledrejection', e => log('Promise Rejection: ' + (e.reason?.message || e.reason)));

  async function readFileWithProgress(file, onTick){
    const t0 = performance.now();
    // Try stream first
    if (file.stream && typeof file.stream === 'function') {
      const reader = file.stream().getReader();
      const chunks = [];
      let rec = 0, lastT = t0, lastB = 0;
      for (;;) {
        const {done, value} = await reader.read();
        const now = performance.now();
        if (done) break;
        chunks.push(value); rec += value.byteLength;
        const dt = (now - lastT)/1000, dB = rec - lastB;
        const mbps = dt>0 ? (dB/1048576)/dt : 0;
        onTick && onTick(rec/file.size*100, mbps);
        lastT = now; lastB = rec;
      }
      const buf = await new Blob(chunks).arrayBuffer();
      const avg = (rec/1048576) / ((performance.now()-t0)/1000 || 1);
      onTick && onTick(100, avg);
      return new Uint8Array(buf);
    }
    // Fallback
    const t1 = performance.now();
    const buf = await file.arrayBuffer();
    const avg = (buf.byteLength/1048576) / ((performance.now()-t1)/1000 || 1);
    for (let i=1;i<=10;i++){ onTick && onTick(i*10, avg); await new Promise(r=>setTimeout(r,10)); }
    return new Uint8Array(buf);
  }

  $go.onclick = async () => {
    $o.textContent = ''; setP(0); setS(0);
    const file = $f.files?.[0];
    if (!file) { log('Pick a file.'); return; }
    try {
      log(`Reading ${file.name} (${(file.size/1048576).toFixed(2)} MB) …`);
      const buf = await readFileWithProgress(file, (pct, mbps)=>{ setP(pct); setS(mbps); });
      setP(100);
      log(`Done. Bytes: ${buf.byteLength.toLocaleString()}`);
    } catch (e) {
      log('Read failed: ' + (e.message || e));
    }
  };
</script>
{% endraw %}
