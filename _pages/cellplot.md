---
title: Explore cell distribution
author: S. Kim
date: 2025-10-16
layout: post
excerpt: ""
---

{% raw %}

<!-- Pyodide -->
<script defer src="https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js"></script>

<!-- =========================
     Controls / Status / Output
========================= -->
<div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0;">
  <button id="bootBtn" type="button">1: boot</button>
  <button id="assetsBtn" type="button" disabled>2: load assets</button>

  <label>Level:
    <input id="levelInput" type="text" value="level1" style="width:120px;">
  </label>

  <label>Cell:
    <input id="cellInput" type="text" value="Fibroblast|LRRC15" style="width:220px;">
  </label>

  <button id="runBtn" type="button" disabled>3: run plot</button>
</div>

<div id="assetHint" style="font-size:12px;color:#666;margin:-6px 0 10px 0;">
  Assets are loaded from <code id="assetBaseShow">/assets/data/cell_profile/</code>.
</div>

<div style="margin:8px 0 4px 0; font-size:13px; color:#555;">Processing</div>
<progress id="procProg" max="100" value="0" style="width:100%;"></progress>
<div id="procStatus" style="font-size:12px;color:#777;margin:4px 0 8px 0;">Idle</div>

<div id="imgWrap" style="display:none;margin:10px 0;">
  <div id="imgGrid" style="display:grid;grid-template-columns:1fr;gap:12px;"></div>
</div>

<details open style="margin-top:10px;">
  <summary><strong>Log</strong></summary>
  <pre id="log" style="
    background:#0a0f17;color:#e8eef7;padding:6px;border-radius:6px;overflow:auto;height:260px;
    white-space:pre-wrap;font-size:11px;line-height:1.25;font-family:ui-monospace,Menlo,Consolas,monospace;">
  </pre>
</details>

<!-- =========================
     Organized Script
========================= -->
<script>
(() => {
  // ---------------------------
  // Constants & DOM helpers
  // ---------------------------
  const CONFIG = {
    ASSET_BASE: "/assets/data/cell_profile/",     // trailing slash required
    PLOTS: ["/plot1.png", "/plot2.png", "/plot3.png"],
  };

  const $ = id => document.getElementById(id);
  const UI = {
    bootBtn: $("bootBtn"),
    assetsBtn: $("assetsBtn"),
    runBtn: $("runBtn"),
    levelInput: $("levelInput"),
    cellInput: $("cellInput"),
    assetBaseShow: $("assetBaseShow"),
    log: $("log"),
    prog: $("procProg"),
    status: $("procStatus"),
    imgWrap: $("imgWrap"),
    imgGrid: $("imgGrid"),
  };
  UI.assetBaseShow.textContent = CONFIG.ASSET_BASE;

  const setDisabled = (el, v) => { el.disabled = !!v; };
  const setProgress = (pct, msg) => {
    UI.prog.value = pct;
    UI.status.textContent = msg;
  };
  const appendLog = (msg) => {
    UI.log.textContent += msg + "\n";
    const lines = UI.log.textContent.split("\n");
    if (lines.length > 500) UI.log.textContent = lines.slice(-500).join("\n");
    UI.log.scrollTop = UI.log.scrollHeight;
  };

  // ---------------------------
  // Pyodide Manager (boot/run/fs)
  // ---------------------------
  const Py = {
    pyodide: null,
    FS: null,
    booted: false,

    async boot() {
      appendLog("⏳ Boot: waiting for pyodide.js …");
      await waitFor(() => typeof globalThis.loadPyodide === "function", 20000, 100);

      appendLog("⏳ Boot: initializing Pyodide…");
      this.pyodide = await globalThis.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/",
      });
      this.FS = this.pyodide.FS;
      appendLog("✅ Pyodide " + this.pyodide.version + " loaded.");

      appendLog("⏳ Boot: loading packages (numpy, pandas, matplotlib, seaborn) …");
      await this.pyodide.loadPackage(["numpy","pandas","matplotlib","seaborn"]);
      appendLog("✅ Packages loaded.");

      await this.run(`
import sys, io, os, gzip, pickle as pkl, warnings
warnings.filterwarnings('ignore')
import numpy as np, pandas as pd, seaborn as sns
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt
print("numpy", np.__version__)
print("pandas", pd.__version__)
print("matplotlib", mpl.__version__)
print("seaborn", sns.__version__)
      `);
      appendLog("✅ Python libs imported & backend set.");
      this.booted = true;
    },

    async run(code) {
      return this.pyodide.runPythonAsync(code);
    },

    writeFile(path, bytes) {
      this.FS.writeFile(path, bytes);
    },

    readFile(path) {
      return this.FS.readFile(path);
    },

    exists(path) {
      try { this.FS.stat(path); return true; } catch (_) { return false; }
    }
  };

  // ---------------------------
  // Asset Loader
  // ---------------------------
  const Asset = {
    async fetchToFS(url, fsPath, label) {
      const full = url.includes("?") ? url : `${url}?t=${Date.now()}`;
      const res = await fetch(full, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      Py.writeFile(fsPath, buf);
      appendLog(`✅ ${label} → ${fsPath} (${(buf.length/1e6).toFixed(2)} MB)`);
      return buf.length;
    },

    async tryFetchToFS(url, fsPath, label) {
      try { await this.fetchToFS(url, fsPath, label); return true; }
      catch (e) { appendLog(`⚠️  Skip ${label}: ${e.message||e}`); return false; }
    },

    async loadLevelAssets(level) {
      setProgress(10, `Fetching level assets for ${level} …`);
      const base = CONFIG.ASSET_BASE;
      await this.tryFetchToFS(`${base}overall_${level}.csv`, "/overall.csv", `overall_${level}.csv`);
      await this.tryFetchToFS(`${base}profile_${level}.csv`, "/profile.csv", `profile_${level}.csv`);
      await this.tryFetchToFS(`${base}matching_res.csv`, "/matching_res.csv", `matching_res.csv`);

      // quick peek
      const info = await Py.run(`
import pandas as pd, json
meta = {}
for path, key in [("/overall.csv","overall_cols"),
                  ("/profile.csv","profile_cols"),
                  ("/matching_res.csv","matching_cols")]:
    try:
        meta[key] = pd.read_csv(path, nrows=2).columns.tolist()
    except Exception:
        meta[key] = []
json.dumps(meta)
      `);
      appendLog("ℹ️ Level asset columns: " + info);
      setProgress(40, "Level assets loaded. Ready.");
    },

    async loadTMEAssets(cell) {
      const cell1 = cell.split("|")[0];
      const base  = CONFIG.ASSET_BASE + "cancer_dist/";
      await this.tryFetchToFS(`${base}prop_${cell1}.csv`, "/prop.csv", `prop_${cell1}.csv`);
      await this.tryFetchToFS(`${base}pval_${cell1}.csv`, "/pval.csv", `pval_${cell1}.csv`);
      await this.tryFetchToFS(`${base}cmapdic_cat.pkl`, "/cmapdic.pkl", `cmapdic_cat.pkl`);
    }
  };

  // ---------------------------
  // Python Job Generators
  // ---------------------------
  function pyJob_RunAll(level, cell) {
    // Runs three blocks: I, II, III (writes /plot1.png, /plot2.png, /plot3.png if successful)
    return `
import io, os, pickle as pkl
import numpy as np, pandas as pd, seaborn as sns
import matplotlib.pyplot as plt
import matplotlib as mpl
from matplotlib.lines import Line2D

plt.rcParams['figure.dpi'] = 150
sns.set_style("whitegrid")

level = ${JSON.stringify(level)}
cell  = ${JSON.stringify(cell)}
cell1 = cell.split("|")[0]

# ------------- I: Organ distribution -------------
try:
    print("I: Organ distribution")
    overall = pd.read_csv("/overall.csv", index_col=0)
    prop    = pd.read_csv("/profile.csv", index_col=0).fillna(0)

    fig, axes = plt.subplots(1,2, figsize=(12.5,2.5), sharey=None, width_ratios=[1,4])

    sns.scatterplot(data=overall, y='avg', x='spec', s=10, linewidth=0, color='lightgrey', ax=axes[0])
    if cell in overall.index:
        sns.scatterplot(data=overall.loc[[cell]], y='avg', x='spec', s=50,
                        linewidth=1, edgecolor='black', color='orange', ax=axes[0])
        x,y = float(overall.loc[cell,'spec']), float(overall.loc[cell,'avg'])
        axes[0].text(x, y, cell, fontsize=8)
        axes[0].text(overall['spec'].max(), overall['avg'].max(),
                     'Organ spec.: %.2f\\nAverage prop.: %.2f' % (overall.loc[cell,'spec'], overall.loc[cell,'avg']),
                     va='top', ha='right')
    axes[0].set_xlabel('Organ specificity')
    axes[0].set_ylabel('Average proportion')

    if cell in prop.columns and 'Organ' in prop.columns:
        order = prop.groupby('Organ').mean()[cell].sort_values(ascending=False).index
        sns.barplot(data=prop, y=cell, x='Organ', order=order, ax=axes[1],
                    capsize=.2, errorbar='se', errwidth=1, errcolor='black',
                    linewidth=1, edgecolor='black', color='steelblue')
        axes[1].tick_params(axis='x', rotation=90)
        axes[1].set_xlabel('')
        axes[1].set_ylabel('Proportion')
        axes[1].set_title(cell)
    else:
        axes[1].axis('off')

    sns.despine()
    buf1 = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf1, format="png", bbox_inches="tight", dpi=150)
    plt.close(fig)
    open("/plot1.png","wb").write(buf1.getbuffer())
except Exception as e:
    print("I skipped:", e)

# ------------- II: Matching annotations -------------
try:
    print("II: matching annotations")
    mdf = pd.read_csv("/matching_res.csv", index_col=0)
    if cell in mdf['PANGEA_annotation'].unique():
        mdf1 = mdf[mdf['PANGEA_annotation'] == cell].copy()
        mdf1 = mdf1.drop('PANGEA_annotation', axis=1).head(10)
        metrics = ['SEN','PPV','CFS','score']
        metrics_scatter = metrics[:-1]
        metric_bar = metrics[-1]

        n_rows = len(mdf1.index)
        n_cols = len(metrics)
        n_cols_scatter = len(metrics_scatter)

        x = np.repeat(np.arange(n_cols_scatter), n_rows)
        y_rows = np.arange(n_rows)[::-1]
        y = np.tile(y_rows, n_cols_scatter)
        vals = np.concatenate([mdf1[m].values for m in metrics_scatter])

        sizes = 250 * vals
        cmap  = mpl.cm.RdYlBu_r
        norm01 = mpl.colors.Normalize(vmin=0.0, vmax=1.0)

        fig, ax = plt.subplots(figsize=(n_cols*1.6, n_rows*0.8), dpi=150)
        sc = ax.scatter(x, y, s=sizes, c=vals, cmap=cmap, norm=norm01,
                        edgecolor="black", linewidth=0.5)

        ax.set_xticks([0,1,2,3.5])
        ax.set_xticklabels(['Total\\nscore' if m=='score' else m for m in metrics])
        ax.set_yticks(y_rows)
        ax.set_yticklabels(list(mdf1.index))
        ax.set_xlim(-0.5, n_cols-0.5)
        ax.set_ylim(-0.5, n_rows-0.5)

        sns.set_style('white')
        sns.despine(bottom=True, left=True)
        ax.set_axisbelow(True)
        ax.grid(True, which='major', axis='both', color='#B0B0B0', linestyle='-', linewidth=0.8, alpha=0.6)

        # inset bars in last column
        last_col_center = n_cols - 1
        cell_left = last_col_center - 0.5
        cell_width = 1.0
        pad_x = 0.05 * cell_width

        axin = ax.inset_axes([cell_left + 0.5, -0.5, cell_width - 2*pad_x, n_rows], transform=ax.transData)
        bar_vals = np.clip(mdf1[metric_bar].values, 0, 1)
        bar_y = y_rows
        axin.barh(bar_y, bar_vals, height=0.7, color="slategrey", edgecolor='black', linewidth=0.5)
        axin.set_ylim(ax.get_ylim())
        axin.set_xlim(0, 1.1)
        axin.set_xticks([]); axin.set_yticks([])
        for sp in axin.spines.values(): sp.set_visible(False)

        # colorbar
        if n_rows == 1: shrink = 1
        else:
            y_size = max(1, n_rows/3 + 0.75)
            shrink = 0.2 + (0.2 / y_size)
        cbar = plt.colorbar(sc, ax=ax, pad=0.2, shrink=shrink, aspect=10)
        cbar.set_label("values")
        cbar.set_ticks([0, 0.5, 1.0])

        buf2 = io.BytesIO()
        plt.tight_layout()
        plt.savefig(buf2, format="png", bbox_inches="tight", dpi=150)
        plt.close(fig)
        open("/plot2.png","wb").write(buf2.getbuffer())
    else:
        print("N/A (no matching annotations for this cell)")
except Exception as e:
    print("II skipped:", e)

# ------------- III: TME association -------------
try:
    print("III: TME association")
    if os.path.exists("/prop.csv") and os.path.exists("/pval.csv") and os.path.exists("/cmapdic.pkl"):
        pdf  = pd.read_csv("/prop.csv", index_col=0)
        df1  = pd.read_csv("/pval.csv", index_col=0)
        with open("/cmapdic.pkl","rb") as fh:
            cmapdic = pkl.load(fh)

        def p_to_stars(p):
            if np.isnan(p): return "NA"
            return ("ns" if p >= 0.05 else
                    "*"  if p >= 0.01 else
                    "**" if p >= 0.001 else
                    "***" if p >= 1e-4 else
                    "****")

        def annotate_barh_stars(ax, data, value_col, group_col, pval_df, comparisons, order=None,
                                pad_frac=0.14, sep_frac=0.10, bracket_dx_frac=0.06, star_offset_frac=0.12,
                                bracket_lw=1.2, bracket_color="k", bracket_alpha=1.0,
                                star_rotation=90, star_fontsize=8, star_color="k", star_weight="bold",
                                star_y_shift_frac=0.18, show_ns=True):
            if order is None:
                order = list(data[group_col].dropna().unique())
            if value_col not in pval_df.columns:
                return
            means = data.groupby(group_col)[value_col].mean()
            xmin, xmax = ax.get_xlim()
            xr  = (xmax - xmin) if xmax > xmin else float(max(means.max(), 1.0))
            pad, sep = pad_frac*xr, sep_frac*xr
            dxcap, doff = bracket_dx_frac*xr, star_offset_frac*xr

            y_center = {}
            tick_pos = list(ax.get_yticks())
            tick_lab = [t.get_text() for t in ax.get_yticklabels()]
            if len(tick_pos)==len(tick_lab) && len(tick_pos)>0:
                y_center = Object.fromEntries(tick_lab.map((lab,i)=>[lab, parseFloat(tick_pos[i])]))
            # NOTE: The above JS-like snippet can't run in Python. Replace with Python below at runtime.

            # Python version (used by Pyodide execution):
            y_center = {}
            tick_pos = ax.get_yticks()
            tick_lab = [t.get_text() for t in ax.get_yticklabels()]
            if len(tick_pos)==len(tick_lab) and len(tick_pos)>0:
                y_center = dict(zip(tick_lab, map(float, tick_pos)))

            if len(y_center) < len(order):
                rects = [r for r in ax.patches if r.get_height()>0]
                if len(rects) >= len(order):
                    for lab, r in zip(order, rects[:len(order)]):
                        y_center.setdefault(lab, r.get_y()+0.5*r.get_height())
                else:
                    for i, lab in enumerate(order):
                        y_center.setdefault(lab, float(i))

            bar_h = ax.patches[0].get_height() if ax.patches else 1.0
            y_nudge = -star_y_shift_frac * bar_h

            def find_row(df,a,b):
                for k in (f"{a}|{b}", f"{b}|{a}", f"{a} vs {b}", f"{b} vs {a}"):
                    if k in df.index: return k
                return None

            comps=[]
            for a,b in comparisons:
                if a not in order or b not in order: continue
                row = find_row(pval_df,a,b)
                if row is None: continue
                p = float(pval_df.loc[row, value_col])
                stars = p_to_stars(p)
                if stars=="ns" and not show_ns: continue
                y1,y2 = sorted((y_center[a], y_center[b]))
                x_base = max(float(means.get(a,0.0)), float(means.get(b,0.0))) + pad
                comps.append(dict(ylow=y1, yhigh=y2, x_base=x_base, stars=stars))
            if not comps: return

            placed, occ = [], (dxcap + doff + sep)
            for d in comps:
                x_br = d["x_base"]
                while any((d["ylow"]<=yh and d["yhigh"]>=yl and x_br<xb+occ) for xb,yl,yh in placed):
                    x_br = max(x_br, max(xb for xb,yl,yh in placed if d["ylow"]<=yh and d["yhigh"]>=yl) + occ)
                d["x_bracket"] = x_br
                placed.append((x_br, d["ylow"], d["yhigh"]))
            need = max(d["x_bracket"]+dxcap+doff for d in comps)
            ax.set_xlim(xmin, max(xmax, need + 0.02*xr))

            for d in comps:
                x, y1, y2 = d["x_bracket"], d["ylow"], d["yhigh"]
                ym = 0.5*(y1+y2)
                ax.plot([x,x],[y1,y2], color=bracket_color, lw=bracket_lw, alpha=bracket_alpha, clip_on=False, zorder=9)
                ax.plot([x-dxcap,x],[y2,y2], color=bracket_color, lw=bracket_lw, alpha=bracket_alpha, clip_on=False, zorder=9)
                ax.plot([x-dxcap,x],[y1,y1], color=bracket_color, lw=bracket_lw, alpha=bracket_alpha, clip_on=False, zorder=9)
                ax.text(x+doff, ym+y_nudge, d["stars"], rotation=270, rotation_mode="anchor",
                        ha="left", va="center", fontsize=7, color="k", fontweight="bold",
                        clip_on=False, zorder=10)
            ax.grid(axis="x", alpha=0.25, linestyle=":")

        order = ['Control','Non-malignant disease','Cancer_AdjNorm','Cancer_Blood','Cancer_Tumor','Cancer_Metastasis']
        order = [g for g in order if g in set(pdf['Cancer_Tissue'])]
        controls = [x for x in ['Control','Non-malignant disease','Cancer_AdjNorm'] if x in set(pdf['Cancer_Tissue'])]
        comparisons = [('Cancer_Tumor', c) for c in controls]

        fig, ax = plt.subplots(figsize=(4, 2.2), dpi=150)
        sns.barplot(data=pdf, x=cell, y='Cancer_Tissue', ax=ax,
                    palette=cmapdic, order=order, estimator=np.mean,
                    linewidth=1, edgecolor='black',
                    errorbar='se', capsize=.2, errwidth=1, errcolor='black')
        sns.despine()

        annotate_barh_stars(ax, pdf, cell, 'Cancer_Tissue', df1, comparisons, order=order,
                            pad_frac=0.5, sep_frac=0.1, bracket_dx_frac=0.025, star_offset_frac=0.03,
                            bracket_lw=1.0, star_y_shift_frac=0.30, show_ns=True)

        ax.set_xlabel(cell)
        ax.set_ylabel('')
        plt.tight_layout()

        buf3 = io.BytesIO()
        plt.savefig(buf3, format="png", bbox_inches="tight", dpi=150)
        plt.close(fig)
        open("/plot3.png","wb").write(buf3.getbuffer())
    else:
        print("N/A (missing TME files)")
except Exception as e:
    print("III skipped:", e)

"OK"
    `;
  }

  // ---------------------------
  // UI Image helpers
  // ---------------------------
  function clearImages() {
    UI.imgWrap.style.display = "none";
    while (UI.imgGrid.firstChild) UI.imgGrid.removeChild(UI.imgGrid.firstChild);
  }

  function showPNG(bytes, filename) {
    const blob = new Blob([bytes], { type: "image/png" });
    const url  = URL.createObjectURL(blob);
    const img  = document.createElement("img");
    img.src = url;
    img.alt = filename;
    img.style.maxWidth = "100%";
    img.style.border = "1px solid #e5e7eb";
    img.style.borderRadius = "6px";
    const wrap = document.createElement("div");
    wrap.appendChild(img);
    UI.imgGrid.appendChild(wrap);
    UI.imgWrap.style.display = "block";
  }

  async function renderAnyPlots() {
    for (const p of CONFIG.PLOTS) {
      if (Py.exists(p)) {
        const bytes = Py.readFile(p);
        showPNG(bytes, p.replace("/", ""));
      }
    }
  }

  // ---------------------------
  // Small utilities
  // ---------------------------
  async function waitFor(predicate, timeoutMs, intervalMs) {
    const t0 = performance.now();
    while (!predicate()) {
      if (performance.now() - t0 > timeoutMs) throw new Error("Timeout");
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  // ---------------------------
  // Wire up buttons
  // ---------------------------
  UI.bootBtn.addEventListener("click", async () => {
    try {
      setDisabled(UI.bootBtn, true);
      await Py.boot();
      setDisabled(UI.assetsBtn, false);
    } catch (e) {
      appendLog("❌ Boot failed: " + (e?.message || e));
    } finally {
      setDisabled(UI.bootBtn, false);
    }
  });

  UI.assetsBtn.addEventListener("click", async () => {
    if (!Py.booted) { alert("Boot first."); return; }
    const level = UI.levelInput.value.trim();
    if (!level) { alert("Enter a level (e.g., level1)."); return; }

    try {
      setDisabled(UI.assetsBtn, true);
      setDisabled(UI.runBtn, true);
      clearImages();
      await Asset.loadLevelAssets(level);
      setDisabled(UI.runBtn, false);
    } catch (e) {
      appendLog("❌ Asset load error: " + (e?.message || e));
    } finally {
      setDisabled(UI.assetsBtn, false);
    }
  });

  UI.runBtn.addEventListener("click", async () => {
    if (!Py.booted) { alert("Boot first."); return; }
    const level = UI.levelInput.value.trim();
    const cell  = UI.cellInput.value.trim();
    if (!level || !cell) { alert("Enter both level and cell."); return; }

    try {
      setDisabled(UI.runBtn, true);
      clearImages();
      setProgress(55, "Preparing …");
      appendLog(`▶️ Run: level=${level} | cell=${cell}`);

      await Asset.loadTMEAssets(cell);

      const unhookOut = Py.pyodide.setStdout({
        batched: (s)=>{ s && s.split(/\r?\n/).forEach(line=>{ if(line) appendLog(line); }); }
      });
      const unhookErr = Py.pyodide.setStderr({
        batched: (s)=>{ s && s.trim() && appendLog("ERR: " + s); }
      });

      setProgress(70, "Running Python …");
      await Py.run(pyJob_RunAll(level, cell));

      try { unhookOut && unhookOut(); } catch(_){}
      try { unhookErr && unhookErr(); } catch(_){}

      setProgress(90, "Rendering images …");
      await renderAnyPlots();
      setProgress(100, "Done");
      appendLog("✅ Plots ready.");
    } catch (e) {
      setProgress(0, "Error");
      appendLog("❌ Run error: " + (e?.message || e));
      clearImages();
    } finally {
      setDisabled(UI.runBtn, false);
    }
  });

  appendLog("Flow → 1) boot → 2) load assets → 3) run plot");
})();
</script>

{% endraw %}
