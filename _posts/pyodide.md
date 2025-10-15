---
title: Pyodide Demo
layout: page          # or `post` if you want it dated and listed with posts
permalink: /pyodide/  # nice URL like https://srkim727.github.io/pyodide/
---

{% raw %}
<div style="max-width: 900px;">
  <h2>Run Python in your browser 🐍</h2>
  <textarea id="code" style="width:100%;height:150px;font-family:monospace;">print("Hello from Pyodide!")</textarea><br>
  <button id="run">Run</button>
  <pre id="output" style="background:#f6f8fa;padding:1em;border-radius:6px;"></pre>
</div>

<!-- Load Pyodide -->
<script src="https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js"></script>

<!-- Your app logic -->
<script type="module">
  const out = document.getElementById("output");
  const runBtn = document.getElementById("run");
  const codeEl = document.getElementById("code");

  const pyodide = await loadPyodide();

  // (Optional) helper to capture stdout/stderr
  function withCapturedIO(fn) {
    let buf = "";
    pyodide.setStdout({ batched: s => buf += s + "\n" });
    pyodide.setStderr({ batched: s => buf += "Error: " + s + "\n" });
    return fn().then(() => buf);
  }

  runBtn.onclick = async () => {
    out.textContent = "Running...";
    try {
      const result = await withCapturedIO(() => pyodide.runPythonAsync(codeEl.value));
      out.textContent = result || "(no output)";
    } catch (e) {
      out.textContent = "⚠️ " + e;
    }
  };
</script>
{% endraw %}
