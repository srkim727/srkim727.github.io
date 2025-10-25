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
    <select id="levelSelect" style="width:140px;"></select>
  </label>

  <label>Cell:
    <select id="cellSelect" style="width:320px;"></select>
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
  const ASSET_BASE1 = "/assets/data/cell_profile/";            // overall_*.csv, profile_*.csv, matching_res.csv
  const ASSET_BASE2 = "/assets/data/cell_profile/cancer_dist/"; // prop_*.csv, pval_*.csv, cmapdic_cat.pkl
  document.getElementById("base1Show").textContent = ASSET_BASE1;
  document.getElementById("base2Show").textContent = ASSET_BASE2;

  // -------- dropdown data (unsorted source lists) --------
  const LEVELS = ["level1","level2"]; // will be sorted before rendering

  const CELLS_LEVEL1_RAW = [
    'Astrocyte','B_GC','B_mature','B_progenitor','Ciliated','Dendritic_classical','Dendritic_plasmacytoid',
    'Ductal','Endothelial','Erythroid','Fibroblast','Hematopoietic','Hepatocyte','Macrophage','Mast&Basophil',
    'Melanocyte','Monocyte','Muller','Mural','Neuron_bipolar','Neuron_excitatory','Neuron_inhibitory',
    'Neutrophil','Oligodendrocyte_mature','Oligodendrocyte_progenitor','Plasma','Platelet','Rod','Schwann',
    'Spermatocyte','Squamous','T&NK'
  ];

  const CELLS_LEVEL2_RAW = [
    'Mural|CD36','Mural|FGF7','Mural|ISG','Mural|LAMC3','Mural|RERGL','Mural|ROBO2','Mural|SPINT2','Mural|TNFAIP6',
    'T&NK|ILC','T&NK|NK_CD16','T&NK|NK_CD56','T&NK|NK_CXCR6','T&NK|T&NK_HSP','T&NK|T&NK_ISG','T&NK|T_CD4_CXCL13',
    'T&NK|T_CD4_EM_Tfh','T&NK|T_CD4_EM_Th1','T&NK|T_CD4_EM_Th17','T&NK|T_CD4_EM_Th2','T&NK|T_CD4_EM_Th22',
    'T&NK|T_CD4_EM_Treg','T&NK|T_CD4_Eff_IFNG','T&NK|T_CD4_Eff_IL13','T&NK|T_CD4_Eff_IL17','T&NK|T_CD4_N&CM',
    'T&NK|T_CD4_RM_Th1','T&NK|T_CD4_RM_Th17','T&NK|T_CD4_RM_Treg','T&NK|T_CD4_activated','T&NK|T_CD8_EM',
    'T&NK|T_CD8_EMRA','T&NK|T_CD8_KLRC2','T&NK|T_CD8_MHCII','T&NK|T_CD8_N&CM','T&NK|T_CD8_RM','T&NK|T_CD8_activated',
    'T&NK|T_CD8_exhausted','T&NK|T_MAIT','T&NK|T_gdT_TRDV1','T&NK|T_gdT_TRDV2','Macrophage|Alveolar',
    'Macrophage|CX3CR1','Macrophage|EREG','Macrophage|HSP','Macrophage|ISG','Macrophage|LYVE1','Macrophage|MATK',
    'Monocyte|Classical_CCL4','Monocyte|Classical_FABP5','Monocyte|Classical_IL1R2','Monocyte|Classical_general',
    'Monocyte|HSP','Monocyte|ISG','Monocyte|Intermediate','Monocyte|Non-classical','Ductal|AT0','Ductal|AT1',
    'Ductal|AT2','Ductal|BEST4','Ductal|Club','Ductal|Collecting-duct','Ductal|Colonocyte','Ductal|Conjunctival',
    'Ductal|DEFB4A','Ductal|Enterocyte','Ductal|Ependymal','Ductal|Gastric','Ductal|Gastrointestinal_common',
    'Ductal|Gingival','Ductal|Gland_CA6','Ductal|Gland_LTF','Ductal|Gland_MUCL1','Ductal|Gland_SOX17',
    'Ductal|Goblet','Ductal|Ionocyte','Ductal|KLK7','Ductal|Pancreatobiliary_acinar','Ductal|Pancreatobiliary_ductal',
    'Ductal|Proximal-tubule','Ductal|Submucosal_mucous','Ductal|Submucosal_serous','Ductal|Thick-ascending',
    'Ductal|Trophoblast_extravillous','Ductal|Trophoblast_villous','Ductal|Tuft','Ductal|Urothelial','Ductal|thin-limb',
    'Squamous|Basal','Squamous|Ciliary','Squamous|Corneal','Squamous|Eccrine','Squamous|HFSC',
    'Squamous|Keratinocyte_activated','Squamous|Keratinocyte_basal','Squamous|Keratinocyte_granular',
    'Squamous|Keratinocyte_spinous','Squamous|MHCII','Squamous|McSC','Squamous|Myoepithelial','Squamous|Sebaceous',
    'Squamous|Trophoblast','Squamous|Umbrella','Squamous|cTEC','Fibroblast|ADAMDEC1','Fibroblast|Alveolar',
    'Fibroblast|CCL19','Fibroblast|CD36','Fibroblast|CLDN1','Fibroblast|CLEC14A','Fibroblast|COCH','Fibroblast|COX15',
    'Fibroblast|CST2','Fibroblast|Chondrocyte','Fibroblast|Corneal','Fibroblast|Dermal-sheath','Fibroblast|GREM2',
    'Fibroblast|HSP','Fibroblast|IL24','Fibroblast|IL6','Fibroblast|ISG','Fibroblast|ITGB8','Fibroblast|KLK1',
    'Fibroblast|LRRC15','Fibroblast|NRG1','Fibroblast|SYT1','Fibroblast|Satellite','Fibroblast|Universal',
    'B_mature|CCL4','B_mature|EGR','B_mature|GBP','B_mature|HSP','B_mature|ISG','B_mature|Memory_atypical',
    'B_mature|Memory_switched','B_mature|Memory_unswitched','B_mature|Naive',
    'Dendritic_classical|ACY3','Dendritic_classical|AS-DC','Dendritic_classical|CXCL9','Dendritic_classical|DC1',
    'Dendritic_classical|DC2','Dendritic_classical|DC3','Dendritic_classical|EGR','Dendritic_classical|EREG',
    'Dendritic_classical|FCGR3A','Dendritic_classical|HSP','Dendritic_classical|ISG','Dendritic_classical|LAMP3',
    'Dendritic_classical|Langerhans',
    'Endothelial|Arterial','Endothelial|BMP4','Endothelial|CXCR4','Endothelial|Capillary_BBB',
    'Endothelial|Capillary_activated','Endothelial|Capillary_aerocyte','Endothelial|Capillary_general',
    'Endothelial|Lymphatic_HGF','Endothelial|Lymphatic_LYVE1','Endothelial|Sinusoidal','Endothelial|Venous_C7',
    'Endothelial|Venous_CXCL10','Endothelial|Venous_DPEP1','Endothelial|Venous_ISG','Endothelial|Venous_activated',
    'Endothelial|Venous_general'
  ];

  // Sorted copies
  const CELLS_LEVEL1 = CELLS_LEVEL1_RAW.slice().sort((a,b)=>a.localeCompare(b));
  const CELLS_LEVEL2 = CELLS_LEVEL2_RAW.slice().sort((a,b)=>a.localeCompare(b));
  const LEVELS_SORTED = LEVELS.slice().sort((a,b)=>a.localeCompare(b));

  // -------- helpers --------
  const $ = (id)=>document.getElementById(id);
  function setDisabled(id, v){ const el=$(id); if(el) el.disabled = !!v; }
  function log(msg){
    const el=$("log"); el.textContent += msg + "\n";
    const lines = el.textContent.split("\n");
    if(lines.length>500){ el.textContent = lines.slice(-500).join("\n"); }
    el.scrollTop = el.scrollHeight;
  }
  function stage(pct, msg){ $("procProg").value = pct; $("procStatus").textContent = msg; }
  async function fetchToFS(path, fsPath){
    const u = (path.includes("?") ? path : path + "?t=" + Date.now());
    const r = await fetch(u, { cache:"no-store" });
    if(!r.ok) throw new Error("HTTP " + r.status + " for " + path);
    const buf = new Uint8Array(await r.arrayBuffer());
    pyodide.FS.writeFile(fsPath, buf);
    return buf.length;
  }
  function clearImage(){ $("imgWrap").style.display = "none"; $("plotImg").removeAttribute("src"); }

  function populateSelect(selectEl, items, selectedValue){
    selectEl.innerHTML = "";
    items.forEach(v=>{
      const opt=document.createElement("option");
      opt.textContent=v; opt.value=v;
      selectEl.appendChild(opt);
    });
    if(selectedValue && items.includes(selectedValue)) selectEl.value=selectedValue;
  }

  // Populate level & cell (alphabetically)
  populateSelect($("levelSelect"), LEVELS_SORTED);
  populateSelect($("cellSelect"), CELLS_LEVEL1); // default for level1

  // --- state ---
  let pyodide=null, FS=null, booted=false, pngURL=null;

  // --- boot ---
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

      log("⏳ Boot: loading core packages (numpy, pandas, matplotlib, micropip) …");
      await pyodide.loadPackage(["numpy","pandas","matplotlib","micropip"]);
      log("✅ Core packages loaded.");

      log("⏳ Installing seaborn via micropip …");
      await pyodide.runPythonAsync(`
import micropip
await micropip.install("seaborn==0.13.2")
      `);
      log("✅ seaborn installed.");

      await pyodide.runPythonAsync(`
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
      log("✅ Python libs imported & backend set.");

      booted = true;
      setDisabled("runBtn", false);
    }catch(e){
      log("❌ Boot failed: " + (e?.message||e));
      setDisabled("bootBtn", false);
      return;
    }
    setDisabled("bootBtn", false);
  });

  // --- level -> repopulate cell (alphabetical) ---
  $("levelSelect").addEventListener("change", ()=>{
    const lvl = $("levelSelect").value.trim();
    const prev = $("cellSelect").value;
    if(lvl==="level2"){
      populateSelect($("cellSelect"), CELLS_LEVEL2, prev);
    }else{
      populateSelect($("cellSelect"), CELLS_LEVEL1, prev);
    }
  });

  // --- run ---
  $("runBtn").addEventListener("click", async ()=>{
    if(!booted){ alert("Boot first."); return; }
    const level = $("levelSelect").value.trim();
    const cell  = $("cellSelect").value.trim();
    if(!level || !cell){ alert("Choose level and cell."); return; }

    stage(20, "Fetching CSVs …");
    clearImage();

    // Files we need
    const f_overall = `${ASSET_BASE1}overall_${level}.csv`;
    const f_profile = `${ASSET_BASE1}profile_${level}.csv`;
    const f_match   = `${ASSET_BASE1}matching_res.csv`;

    // Write into FS
    try{
      await fetchToFS(f_overall, "/overall.csv");
      await fetchToFS(f_profile, "/profile.csv");
      await fetchToFS(f_match,   "/matching_res.csv");
    }catch(e){
      log("❌ Fetch error (overall/profile/matching): " + (e?.message||e));
      stage(0, "Idle");
      return;
    }

    // For TME association block
    const cell1 = cell.includes("|") ? cell.split("|")[0] : cell;
    const f_prop = `${ASSET_BASE2}prop_${cell1}.csv`;
    const f_pval = `${ASSET_BASE2}pval_${cell1}.csv`;
    const f_cmap = `${ASSET_BASE2}cmapdic_cat.pkl`;
    try{
      await fetchToFS(f_prop, "/prop.csv");
      await fetchToFS(f_pval, "/pval.csv");
      await fetchToFS(f_cmap, "/cmap.pkl");
    }catch(e){
      // This block is optional; we’ll just log if not present
      log("⚠️ Optional TME files missing for this cell: " + (e?.message||e));
    }

    stage(50, "Plotting …");
    log(`▶️ Explore: level=${level}, cell=${cell}`);

    const unhookOut = pyodide.setStdout({ batched: (s)=>{ s && s.split(/\r?\n/).forEach(line=>line&&log(line)); }});
    const unhookErr = pyodide.setStderr({ batched: (s)=>{ s && s.trim() && log("ERR: " + s); } });

    try{
      const code = `
import io, pickle as pkl
import numpy as np, pandas as pd, seaborn as sns
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt

plt.rcParams['figure.dpi'] = 150

level = ${JSON.stringify(level)}
cell  = ${JSON.stringify(cell)}

print('I: Organ distribution')

sns.set_style("whitegrid")
overall = pd.read_csv('/overall.csv', index_col=0)
prop    = pd.read_csv('/profile.csv', index_col=0).fillna(0)

fig, axes = plt.subplots(1,2, figsize=(12.5,2.5), sharey=None, width_ratios=[1,4])

# left scatter
sns.scatterplot(data=overall, y='avg', x='spec', s=10, linewidth=0, color='lightgrey', ax=axes[0])
if cell in overall.index:
    sns.scatterplot(data=overall.loc[[cell]], y='avg', x='spec', s=50, linewidth=1,
                    edgecolor='black', color='orange', ax=axes[0])
    x, y = overall.loc[cell, 'spec'], overall.loc[cell, 'avg']
    axes[0].text(x, y, cell, fontsize=8)
    axes[0].text(overall['spec'].max(), overall['avg'].max(),
                 'Organ spec.: %.2f\\nAverage prop.: %.2f' % (overall.loc[cell, 'spec'], overall.loc[cell, 'avg']),
                 va='top', ha='right')
axes[0].set_xlabel('Organ specificity'); axes[0].set_ylabel('Average proportion')

# right bar
if cell in prop.columns:
    order = prop.groupby('Organ').mean()[cell].sort_values(ascending=False).index
    sns.barplot(data=prop, y=cell, x='Organ', order=order, ax=axes[1],
                capsize=.2, errorbar='se', errwidth=1, errcolor='black',
                linewidth=1, edgecolor='black', color='steelblue')
    axes[1].tick_params(axis='x', rotation=90)
    axes[1].set_xlabel(""); axes[1].set_ylabel('Proportion'); axes[1].set_title(cell)
sns.despine()
buf1 = io.BytesIO(); plt.tight_layout(); plt.savefig(buf1, format='png', bbox_inches='tight', dpi=150); plt.close()

print('II: matching annotations')
mdf = pd.read_csv('/matching_res.csv', index_col=0)

def block2_png():
    if cell not in mdf['PANGEA_annotation'].unique():
        return None
    mdf1 = mdf[mdf['PANGEA_annotation'] == cell].copy().drop('PANGEA_annotation', axis=1).head(10)
    metrics = ['SEN','PPV','CFS','score']
    metrics_scatter, metric_bar = metrics[:-1], metrics[-1]

    n_rows = len(mdf1.index)
    if n_rows == 0:
        return None
    n_cols = len(metrics); n_cols_scatter = len(metrics_scatter)

    x = np.repeat(np.arange(n_cols_scatter), n_rows)
    y_rows = np.arange(n_rows)[::-1]
    y = np.tile(y_rows, n_cols_scatter)
    vals = np.concatenate([mdf1[m].values for m in metrics_scatter])

    sizes = 250 * vals
    cmap = mpl.cm.RdYlBu_r
    norm01 = mpl.colors.Normalize(vmin=0.0, vmax=1.0)

    fig, ax = plt.subplots(figsize=(n_cols*1.6, n_rows*0.8), dpi=150)
    sc = ax.scatter(x, y, s=sizes, c=vals, cmap=cmap, norm=norm01,
                    edgecolor="black", linewidth=0.5)

    ax.set_xticks([0,1,2,3.5])
    ax.set_xticklabels(['SEN','PPV','CFS','Total\\nscore'])
    ax.set_yticks(y_rows)
    ax.set_yticklabels(list(mdf1.index))

    ax.set_xlim(-0.5, n_cols - 0.5)
    ax.set_ylim(-0.5, n_rows - 0.5)

    sns.set_style('white'); sns.despine(bottom=True, left=True)
    ax.set_axisbelow(True)
    ax.grid(True, which='major', axis='both', color='#B0B0B0', linestyle='-', linewidth=0.8, alpha=0.6)

    # inset horizontal bars for 'score'
    last_center = n_cols - 1
    cell_left, cell_right = last_center - 0.5, last_center + 0.5
    axin = ax.inset_axes([cell_left + 0.5, -0.5, 1.0 - 2*0.05, n_rows], transform=ax.transData)
    bar_vals = np.clip(mdf1[metric_bar].values, 0, 1)
    axin.barh(y_rows, bar_vals, height=0.7, color="slategrey", edgecolor='black', linewidth=0.5)
    axin.set_ylim(ax.get_ylim()); axin.set_xlim(0, 1.1); axin.set_xticks([]); axin.set_yticks([])
    for s in axin.spines.values(): s.set_visible(False)

    x_size = n_cols * .75; y_size = max(1, n_rows / 3 + .75)
    plt.gcf().set_size_inches(x_size*.8, y_size*.8)
    shrink = 1 if n_rows==1 else .2 + (.2 / y_size)

    cbar = plt.colorbar(sc, ax=ax, pad=0.2, shrink=shrink, aspect=10)
    cbar.set_label("values"); cbar.set_ticks([0,0.5,1.0])

    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150)
    plt.close()
    return buf

buf2 = block2_png()

print('III: TME association')
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
                        star_rotation=90, star_fontsize=9, star_color="k", star_weight="bold",
                        star_y_shift_frac=0.12, show_ns=True):
    import matplotlib as mpl
    if order is None: order = list(data[group_col].dropna().unique())
    means = data.groupby(group_col)[value_col].mean()
    xmin, xmax = ax.get_xlim(); xr = (xmax - xmin) if xmax > xmin else float(max(means.max(), 1.0))
    pad = pad_frac * xr; sep = sep_frac * xr; dxcap = bracket_dx_frac * xr; doff = star_offset_frac * xr
    tick_pos = ax.get_yticks(); tick_lab = [t.get_text() for t in ax.get_yticklabels()]
    y_center = {}
    if len(tick_pos)==len(tick_lab) and len(tick_pos)>0:
        y_center = dict(zip(tick_lab, map(float, tick_pos)))
    rects = [p for p in ax.patches if isinstance(p, mpl.patches.Rectangle) and p.get_width()>=0 and p.get_height()>0]
    bar_h = rects[0].get_height() if rects else 1.0
    comps=[]
    for a,b in comparisons:
        if a not in order or b not in order: continue
        row=None
        for key in (f"{a}|{b}", f"{b}|{a}", f"{a} vs {b}", f"{b} vs {a}"):
            if key in pval_df.index: row=key; break
        if row is None: continue
        try: p=float(pval_df.loc[row, value_col])
        except: continue
        s=p_to_stars(p); if (s=="ns") and (not show_ns): continue
        ylow, yhigh = sorted((y_center.get(a, order.index(a)), y_center.get(b, order.index(b))))
        x_base = max(float(means.get(a,0.0)), float(means.get(b,0.0))) + pad
        comps.append(dict(ylow=ylow, yhigh=yhigh, x_base=x_base, stars=s))
    placed=[]; occ = dxcap + doff + sep
    for d in comps:
        x_br=d["x_base"]
        while any((d["ylow"]<=yyh) and (d["yhigh"]>=yyl) and (x_br < x0 + occ) for (x0,yyl,yyh) in placed):
            blockers=[x0 for (x0,yyl,yyh) in placed if (d["ylow"]<=yyh and d["yhigh"]>=yyl)]
            x_br = max(x_br, max(blockers)+occ)
        d["x_bracket"]=x_br; placed.push if False else None
        placed.append((x_br, d["ylow"], d["yhigh"]))
    right_need = [d["x_bracket"] + dxcap + doff for d in comps] or [xmax]
    ax.set_xlim(xmin, max(xmax, max(right_need) + 0.02*xr))
    y_shift = -float(star_y_shift_frac) * float(bar_h)
    for d in comps:
        x_br, ylow, yhigh = d["x_bracket"], d["ylow"], d["yhigh"]; ymid=0.5*(ylow+yhigh)
        ax.plot([x_br,x_br],[ylow,yhigh], color=bracket_color, lw=bracket_lw, alpha=bracket_alpha, clip_on=False, zorder=9)
        ax.plot([x_br-dxcap,x_br],[yhigh,yhigh], color=bracket_color, lw=bracket_lw, alpha=bracket_alpha, clip_on=False, zorder=9)
        ax.plot([x_br-dxcap,x_br],[ylow, ylow ], color=bracket_color, lw=bracket_lw, alpha=bracket_alpha, clip_on=False, zorder=9)
        ax.text(x_br+doff, ymid+y_shift, d["stars"], rotation=270, rotation_mode="anchor",
                ha="left", va="center", fontsize=7, color="black", fontweight="bold", zorder=10, clip_on=False)

# Try TME association (optional)
try:
    pdf  = pd.read_csv('/prop.csv', index_col=0)
    df1  = pd.read_csv('/pval.csv', index_col=0)
    with open('/cmap.pkl','rb') as fh: cmapdic = pkl.load(fh)

    order = ['Control','Non-malignant disease','Cancer_AdjNorm','Cancer_Blood','Cancer_Tumor','Cancer_Metastasis']
    order = [g for g in order if g in set(pdf['Cancer_Tissue'])]

    controls = [x for x in ['Control','Non-malignant disease','Cancer_AdjNorm'] if x in set(pdf['Cancer_Tissue'])]
    comparisons = [('Cancer_Tumor', c) for c in controls]

    sns.set_style("white")
    fig, ax = plt.subplots(figsize=(4,2.2), dpi=150)
    if cell in pdf.columns:
        sns.barplot(data=pdf, x=cell, y='Cancer_Tissue', ax=ax,
                    palette=cmapdic, order=order, estimator=np.mean,
                    linewidth=1, edgecolor='black',
                    errorbar='se', capsize=.2, errwidth=1, errcolor='black')
        sns.despine()
        annotate_barh_stars(ax, pdf, cell, 'Cancer_Tissue', df1, comparisons, order=order,
                            pad_frac=0.5, sep_frac=0.1, bracket_dx_frac=0.025, star_offset_frac=0.03)
        ax.set_xlabel(cell); ax.set_ylabel('')
        plt.tight_layout()
        buf3 = io.BytesIO(); plt.savefig(buf3, format='png', bbox_inches='tight', dpi=150); plt.close()
    else:
        buf3=None
except Exception as e:
    print("TME skip:", e)
    buf3=None

# Combine blocks vertically (if block2 exists)
from PIL import Image
im1 = Image.open(io.BytesIO(buf1.getvalue()))
parts=[im1]
if buf2 is not None: parts.append(Image.open(io.BytesIO(buf2.getvalue())))
if buf3 is not None: parts.append(Image.open(io.BytesIO(buf3.getvalue())))
total_h = sum(im.height for im in parts); max_w = max(im.width for im in parts)
canvas = Image.new('RGBA', (max_w, total_h), (255,255,255,0))
y0=0
for im in parts:
    canvas.paste(im, (0,y0)); y0 += im.height
out = io.BytesIO(); canvas.save(out, format='PNG'); open('/cell_explore.png','wb').write(out.getvalue())
"OK"
      `;
      await pyodide.runPythonAsync(code);

      const bytes = FS.readFile("/cell_explore.png");
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
    }
  });

  log("Flow → 1) boot → 2) run");
})();
</script>

{% endraw %}
