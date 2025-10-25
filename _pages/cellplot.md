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

<div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0;">
  <button id="bootBtn" type="button">1: boot</button>

  <label>Level:
    <select id="levelSelect" style="width:140px;">
      <option selected>level1</option>
      <option>level2</option>
      <option>level3</option>
    </select>
  </label>

  <label>Cell:
    <input id="cellInput" type="text" value="Macrophage|Alveolar" style="width:220px;">
  </label>

  <button id="runBtn" type="button" disabled>2: run</button>
</div>

<div id="assetHint" style="font-size:12px;color:#666;margin:-6px 0 10px 0;">
  Data are loaded from:
  <code id="base1Show">/assets/data/cell_profile/</code> (overall/profile/matching_res)
  &amp; <code id="base2Show">/assets/data/cell_profile/cancer_dist/</code> (TME association).
</div>

<!-- Processing progress -->
<div style="margin:8px 0 4px 0; font-size:13px; color:#555;">Processing</div>
<progress id="procProg" max="100" value="0" style="width:100%;"></progress>
<div id="procStatus" style="font-size:12px;color:#777;margin:4px 0 8px 0;">Idle</div>

<!-- Output image -->
<div id="imgWrap" style="display:none;margin:10px 0;">
  <img id="plotImg" alt="plot" style="max-width:100%;border:1px solid #e5e7eb;border-radius:6px;">
  <div style="margin-top:6px;">
    <a id="downloadPNG" download="cell_explore.png">Download PNG</a>
  </div>
</div>

<details open style="margin-top:10px;">
  <summary><strong>Log</strong></summary>
  <pre id="log" style="
    background:#0a0f17;color:#e8eef7;padding:6px;border-radius:6px;overflow:auto;height:300px;
    white-space:pre-wrap;font-size:11px;line-height:1.25;font-family:ui-monospace,Menlo,Consolas,monospace;">
  </pre>
</details>

<script>
(function(){
  // -------- paths: adjust to your hosting --------
  const ASSET_BASE1 = "/assets/data/cell_profile/";           // overall_*.csv, profile_*.csv, matching_res.csv
  const ASSET_BASE2 = "/assets/data/cell_profile/cancer_dist/"; // prop_*.csv, pval_*.csv, cmapdic_cat.pkl
  document.getElementById("base1Show").textContent = ASSET_BASE1;
  document.getElementById("base2Show").textContent = ASSET_BASE2;

  // -------- helpers --------
  const $ = (id)=>document.getElementById(id);
  function setDisabled(id, v){ const el=$(id); if(el) el.disabled = !!v; }
  function log(msg){
    const el=$("log"); el.textContent += msg + "\n";
    const lines = el.textContent.split("\n");
    if(lines.length>600){ el.textContent = lines.slice(-600).join("\n"); }
    el.scrollTop = el.scrollHeight;
  }
  function stage(pct, msg){ $("procProg").value = pct; $("procStatus").textContent = msg; }
  function clearImage(){ $("imgWrap").style.display = "none"; $("plotImg").removeAttribute("src"); }

  async function fetchToFS(srcURL, dstPath){
    const u = srcURL + (srcURL.includes("?") ? "" : "?t=" + Date.now());
    const r = await fetch(u, { cache: "no-store" });
    if(!r.ok) throw new Error("HTTP " + r.status + " for " + srcURL);
    const buf = new Uint8Array(await r.arrayBuffer());
    pyodide.FS.writeFile(dstPath, buf);
    return buf.length;
  }

  // -------- state --------
  let pyodide=null, FS=null;
  let booted=false, pngURL=null;

  // -------- boot (with seaborn via micropip if needed) --------
  $("bootBtn").addEventListener("click", async ()=>{
    try{
      setDisabled("bootBtn", true);
      log("⏳ Boot: waiting for pyodide.js …");
      await new Promise((res, rej)=>{
        const t0=performance.now();
        (function check(){
          if(typeof globalThis.loadPyodide==="function") return res();
          if(performance.now()-t0>20000) return rej(new Error("Timeout waiting for loadPyodide()"));
          setTimeout(check,100);
        })();
      });

      log("⏳ Boot: initializing Pyodide…");
      pyodide = await globalThis.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/" });
      FS = pyodide.FS;
      log("✅ Pyodide " + pyodide.version + " loaded.");

      log("⏳ Boot: loading core packages (numpy, pandas, matplotlib) …");
      await pyodide.loadPackage(["numpy","pandas","matplotlib"]);
      log("✅ Core packages loaded.");

      await pyodide.runPythonAsync(`
import sys, io, os, warnings
warnings.filterwarnings('ignore')
import numpy as np, pandas as pd
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt
print("numpy", np.__version__)
print("pandas", pd.__version__)
print("matplotlib", mpl.__version__)
try:
    import seaborn as sns
    print("seaborn", sns.__version__)
    HAS_SNS=True
except Exception:
    print("seaborn not installed; will install via micropip")
    HAS_SNS=False
      `);

      const hasSns = await pyodide.runPythonAsync("HAS_SNS");
      if(!hasSns){
        log("⏳ Installing seaborn via micropip …");
        await pyodide.runPythonAsync(`
import micropip
await micropip.install("seaborn==0.13.2")
import seaborn as sns
print("✅ seaborn", sns.__version__, "installed")
        `);
      }else{
        log("✅ seaborn already available.");
      }

      booted = true;
      setDisabled("runBtn", false);
      log("✅ Boot complete. You can run now.");
    }catch(e){
      log("❌ Boot failed: " + (e?.message||e));
    }finally{
      setDisabled("bootBtn", false);
    }
  });

  // -------- run (fetch CSV/PKL into FS, then plot) --------
  $("runBtn").addEventListener("click", async ()=>{
    if(!booted){ alert("Boot first."); return; }
    const level = $("levelSelect").value.trim();
    const cell  = $("cellInput").value.trim();
    if(!level){ alert("Pick a level."); return; }
    if(!cell){ alert("Enter a cell (e.g., Macrophage|Alveolar)."); return; }

    stage(5, "Preparing …");
    clearImage();

    const unhookOut = pyodide.setStdout({ batched: (s)=>{ (s||"").split(/\r?\n/).forEach(line=> line && log(line)); }});
    const unhookErr = pyodide.setStderr({ batched: (s)=>{ s && s.trim() && log("ERR: " + s); } });

    try{
      // --- fetch all required files into /work ---
      stage(10, "Fetching data files …");
      try{ pyodide.FS.mkdir("/work"); }catch(_){}

      // Organ distribution & per-organ profile
      await fetchToFS(`${ASSET_BASE1}overall_${level}.csv`, "/work/overall.csv");
      await fetchToFS(`${ASSET_BASE1}profile_${level}.csv`, "/work/profile.csv");

      // Matching results table
      await fetchToFS(`${ASSET_BASE1}matching_res.csv`, "/work/matching_res.csv");

      // TME association (per cell1 = cell.split('|')[0])
      const cell1 = cell.split("|")[0];
      await fetchToFS(`${ASSET_BASE2}prop_${cell1}.csv`, "/work/prop.csv");
      await fetchToFS(`${ASSET_BASE2}pval_${cell1}.csv`, "/work/pval.csv");
      await fetchToFS(`${ASSET_BASE2}cmapdic_cat.pkl`, "/work/cmapdic_cat.pkl");

      stage(40, "Running Python …");

      // --- Python plotting script ---
      const code = `
import io, os, pickle as pkl
import numpy as np, pandas as pd
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.lines import Line2D

plt.rcParams['figure.dpi'] = 150
level = ${JSON.stringify(level)}
cell  = ${JSON.stringify(cell)}
print(f"I: Organ distribution  (level={level}, cell={cell})")

# ---------- I. Organ distribution ----------
sns.set_style("whitegrid")
overall = pd.read_csv("/work/overall.csv", index_col=0)
prop    = pd.read_csv("/work/profile.csv", index_col=0).fillna(0)

fig, axes = plt.subplots(1,2, figsize=(12.5,2.5), sharey=None, width_ratios=[1,4])

sns.scatterplot(data=overall, y="avg", x="spec", s=10, linewidth=0, color="lightgrey", ax=axes[0])
if cell in overall.index:
    sns.scatterplot(data=overall.loc[[cell]], y="avg", x="spec", s=50,
                    linewidth=1, edgecolor="black", color="orange", ax=axes[0])
    x, y = overall.loc[cell, "spec"], overall.loc[cell, "avg"]
    axes[0].text(x, y, cell, fontsize=8)
    axes[0].text(overall["spec"].max(), overall["avg"].max(),
                 f"Organ spec.: {overall.loc[cell,'spec']:.2f}\\nAverage prop.: {overall.loc[cell,'avg']:.2f}",
                 va="top", ha="right")
axes[0].set_xlabel("Organ specificity")
axes[0].set_ylabel("Average proportion")

# Bar by organ
if cell in prop.columns:
    order = prop.groupby("Organ").mean()[cell].sort_values(ascending=False).index
    sns.barplot(data=prop, y=cell, x="Organ", order=order, ax=axes[1],
                capsize=.2, errorbar="se", errwidth=1, errcolor="black",
                linewidth=1, edgecolor="black", color="steelblue")
    axes[1].tick_params(axis="x", rotation=90)
    axes[1].set_xlabel("")
    axes[1].set_ylabel("Proportion")
    axes[1].set_title(cell)
else:
    axes[1].text(0.5, 0.5, f"{cell} not found in profile", ha="center", va="center", transform=axes[1].transAxes)
    axes[1].axis("off")

sns.despine()
plt.tight_layout()

# ---------- II. matching annotations ----------
print("II: matching annotations")
mdf = pd.read_csv("/work/matching_res.csv", index_col=0)

def draw_matching(ax_target=None):
    if cell not in mdf["PANGEA_annotation"].unique():
        print("N/A (no matching rows for this cell)")
        return None

    mdf1 = (mdf[mdf["PANGEA_annotation"] == cell]
            .drop(columns=["PANGEA_annotation"])
            .head(10)
            .copy())

    metrics = ["SEN","PPV","CFS","score"]
    metrics_scatter = metrics[:-1]
    metric_bar = metrics[-1]

    n_rows = len(mdf1.index)
    n_cols = len(metrics)
    n_cols_scatter = len(metrics_scatter)

    # grid
    x = np.repeat(np.arange(n_cols_scatter), n_rows)
    y_rows = np.arange(n_rows)[::-1]
    y = np.tile(y_rows, n_cols_scatter)
    vals = np.concatenate([mdf1[m].values for m in metrics_scatter])

    # sizes & colors
    cmap = mpl.cm.RdYlBu_r
    norm01 = mpl.colors.Normalize(vmin=0.0, vmax=1.0)
    sizes = 250 * vals

    fig2, ax = plt.subplots(figsize=(n_cols*1.6, n_rows*0.8), dpi=150)
    sc = ax.scatter(x, y, s=sizes, c=vals, cmap=cmap, norm=norm01,
                    edgecolor="black", linewidth=0.5)

    # ticks / labels
    ax.set_xticks([0,1,2,3.5])
    ax.set_xticklabels([("Total\\nscore" if m=="score" else m) for m in metrics], rotation=0)
    ax.set_yticks(y_rows)
    ax.set_yticklabels(list(mdf1.index))
    ax.set_xlim(-0.5, n_cols - 0.5)
    ax.set_ylim(-0.5, n_rows - 0.5)

    # clean theme + grey grid
    sns.set_style("white")
    sns.despine(bottom=True, left=True)
    ax.set_axisbelow(True)
    ax.grid(True, which="major", axis="both",
            color="#B0B0B0", linestyle="-", linewidth=0.8, alpha=0.6)

    # inset bar column (score) sharing Y
    last_center = n_cols - 1
    cell_left, cell_right = last_center - 0.5, last_center + 0.5
    cell_width = cell_right - cell_left
    pad_x = 0.05 * cell_width

    axin = ax.inset_axes(
        [cell_left + pad_x, -0.5, cell_width - 2*pad_x, n_rows],
        transform=ax.transData
    )
    bar_vals = np.clip(mdf1[metric_bar].values, 0, 1)
    axin.barh(y_rows, bar_vals, height=0.7, color="slategrey",
              edgecolor="black", linewidth=0.5)
    axin.set_ylim(ax.get_ylim()); axin.set_xlim(0, 1.1)
    axin.set_xticks([]); axin.set_yticks([])
    for sp in axin.spines.values(): sp.set_visible(False)

    # colorbar
    shrink = (1.0 if n_rows==1 else max(0.2, 0.2 / (n_rows/3 + 0.75)))
    cbar = plt.colorbar(sc, ax=ax, pad=0.2, shrink=shrink, aspect=10)
    cbar.set_label("values"); cbar.set_ticks([0,0.5,1.0])

    plt.tight_layout()
    return fig2

fig_match = draw_matching()

# ---------- III. TME association ----------
print("III: TME association")
try:
    pdf  = pd.read_csv("/work/prop.csv", index_col=0)
    df1  = pd.read_csv("/work/pval.csv", index_col=0)
    with open("/work/cmapdic_cat.pkl","rb") as f:
        cmapdic = pkl.load(f)
except Exception as e:
    print("TME association assets unavailable:", e)
    pdf = None

def p_to_stars(p):
    if np.isnan(p): return "NA"
    return ("ns" if p >= 0.05 else
            "*"  if p >= 0.01 else
            "**" if p >= 0.001 else
            "***" if p >= 1e-4 else
            "****")

def annotate_barh_stars(ax, data, value_col, group_col, pval_df, comparisons, order=None,
                        pad_frac=0.5, sep_frac=0.1, bracket_dx_frac=0.025, star_offset_frac=0.03,
                        bracket_lw=1.0, bracket_color="k", bracket_alpha=1.0,
                        star_rotation=270, star_fontsize=7, star_color="k", star_weight="bold",
                        star_y_shift_frac=0.3, show_ns=True):
    # order / means / extents
    if order is None:
        order = list(data[group_col].dropna().unique())
    means = data.groupby(group_col)[value_col].mean()
    xmin, xmax = ax.get_xlim()
    xr = (xmax - xmin) if xmax > xmin else float(max(means.max(), 1.0))
    pad   = pad_frac * xr
    sep   = sep_frac * xr
    dxcap = bracket_dx_frac * xr
    doff  = star_offset_frac * xr

    # y centers via ticks (robust)
    tick_pos = list(ax.get_yticks())
    tick_lab = [t.get_text() for t in ax.get_yticklabels()]
    y_center = {}
    if len(tick_pos) && (len(tick_pos) === tick_lab.length):
        pass  # placeholder for JS; ignored in Python

    # Python recompute: (ticks via matplotlib objects)
    y_center = {}
    for lab, pos in zip([t.get_text() for t in ax.get_yticklabels()], ax.get_yticks()):
        y_center[lab] = float(pos)

    # build comps
    comps=[]
    for a,b in comparisons:
        if a not in order or b not in order: continue
        row=None
        for key in (f"{a}|{b}", f"{b}|{a}", f"{a} vs {b}", f"{b} vs {a}"):
            if key in pval_df.index: row=key; break
        if row is None: continue
        try:
            p = float(pval_df.loc[row, value_col])
        except: continue
        stars = p_to_stars(p)
        if stars=="ns" and not show_ns: continue
        ylow, yhigh = sorted((y_center[a], y_center[b]))
        x_base = max(float(means.get(a,0.0)), float(means.get(b,0.0))) + pad
        comps.append(dict(ylow=ylow, yhigh=yhigh, x_base=x_base, stars=stars))
    if not comps: return

    # collision avoid
    placed=[]; occ = dxcap + doff + sep
    for d in comps:
        x_br=d["x_base"]
        while any((d["ylow"]<=yyh) and (d["yhigh"]>=yyl) and (x_br < x0 + occ) for (x0,yyl,yyh) in placed):
            blockers = [x0 for (x0,yyl,yyh) in placed if (d["ylow"]<=yyh and d["yhigh"]>=yyl)]
            x_br = max(x_br, max(blockers) + occ)
        d["x_bracket"]=x_br
        placed.append((x_br, d["ylow"], d["yhigh"]))

    right_need = [d["x_bracket"] + dxcap + doff for d in comps]
    ax.set_xlim(xmin, max(xmax, max(right_need) + 0.02 * xr))

    # estimate bar height
    rects=[p for p in ax.patches if isinstance(p, mpl.patches.Rectangle) and p.get_height()>0]
    bar_h = rects[0].get_height() if rects else 1.0
    y_shift = -float(star_y_shift_frac) * float(bar_h)

    for d in comps:
        x_br, ylow, yhigh = d["x_bracket"], d["ylow"], d["yhigh"]
        ymid = 0.5*(ylow+yhigh)
        ax.plot([x_br, x_br],[ylow,yhigh], color=bracket_color, lw=bracket_lw, alpha=bracket_alpha,
                clip_on=False, zorder=9)
        ax.plot([x_br - dxcap, x_br],[yhigh,yhigh], color=bracket_color, lw=bracket_lw, alpha=bracket_alpha,
                clip_on=False, zorder=9)
        ax.plot([x_br - dxcap, x_br],[ylow, ylow], color=bracket_color, lw=bracket_lw, alpha=bracket_alpha,
                clip_on=False, zorder=9)
        ax.text(x_br + doff, ymid + y_shift, d["stars"],
                rotation=star_rotation, rotation_mode="anchor",
                ha="left", va="center",
                fontsize=star_fontsize, color=star_color, fontweight=star_weight,
                zorder=10, clip_on=False)

    ax.grid(axis="x", alpha=0.25, linestyle=":")

if pdf is not None:
    order = ['Control','Non-malignant disease','Cancer_AdjNorm',
             'Cancer_Blood','Cancer_Tumor','Cancer_Metastasis']
    order = [g for g in order if g in set(pdf['Cancer_Tissue'])]

    controls = [x for x in ['Control','Non-malignant disease','Cancer_AdjNorm']
                if x in set(pdf['Cancer_Tissue'])]
    comparisons = [('Cancer_Tumor', c) for c in controls]

    fig3, ax3 = plt.subplots(figsize=(4,2.2), dpi=150)
    sns.barplot(data=pdf, x=cell, y='Cancer_Tissue', ax=ax3,
                palette=cmapdic, order=order, estimator=np.mean,
                linewidth=1, edgecolor='black',
                errorbar='se', capsize=.2, errwidth=1, errcolor='black')
    sns.despine()

    annotate_barh_stars(
        ax=ax3, data=pdf, value_col=cell, group_col='Cancer_Tissue',
        pval_df=df1, comparisons=comparisons, order=order,
        pad_frac=0.50, sep_frac=0.10, bracket_dx_frac=0.025, star_offset_frac=0.03,
        bracket_lw=1.0, bracket_color="k", bracket_alpha=1.0,
        star_rotation=270, star_fontsize=7, star_color="k", star_weight="bold",
        star_y_shift_frac=0.30, show_ns=True
    )
    ax3.set_xlabel(cell); ax3.set_ylabel("")
    plt.tight_layout()

# ---- save one tall PNG with all figures stacked ----
buf = io.BytesIO()
plt.savefig(buf, format="png", bbox_inches="tight", dpi=150)
open("/work/out.png","wb").write(buf.getbuffer())
"OK"
      `;

      await pyodide.runPythonAsync(code);

      // display image
      stage(90, "Rendering …");
      const bytes = FS.readFile("/work/out.png");
      const blob  = new Blob([bytes], { type: "image/png" });
      if(pngURL) URL.revokeObjectURL(pngURL);
      pngURL = URL.createObjectURL(blob);
      $("plotImg").src = pngURL;
      $("imgWrap").style.display = "block";
      $("downloadPNG").href = pngURL;

      stage(100, "Done");
      log("✅ Plot ready.");
    }catch(e){
      stage(0, "Error");
      log("❌ Run error: " + (e?.message||e));
      $("imgWrap").style.display = "none";
    }finally{
      try{ unhookOut && unhookOut(); }catch(_){}
      try{ unhookErr && unhookErr(); }catch(_){}
    }
  });

  log("Flow → 1) boot → 2) run");
})();
</script>

{% endraw %}
