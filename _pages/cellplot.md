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

<style>
  /* Compact controls */
  .ctl-row{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0;}
  label.inline{display:inline-flex;align-items:center;gap:4px;font-size:12px;}
  button, select, input{
    font-size:12px;               /* smaller text */
    padding:2px 6px;              /* tighter padding */
    height:26px;                  /* compact height */
    line-height:22px;
    border-radius:4px;
  }
  /* Optional: make the buttons visually lighter */
  button{
    background:#f3f4f6;border:1px solid #e5e7eb;cursor:pointer;
  }
  button:disabled{opacity:.6;cursor:not-allowed}
  button:not(:disabled):hover{background:#eef0f4}

  .meta-panel{
    background:#f8f9fb;border:1px solid #e5e7eb;border-radius:8px;
    padding:10px 12px;margin:8px 0 12px 0; color:#111; font-size:14px;
  }
  .meta-panel code{background:#eef2f7;padding:1px 4px;border-radius:4px}
  .meta-panel small{color:#666}
</style>

<div class="ctl-row">
  <button id="bootBtn" type="button">1: boot</button>
  <button id="runBtn" type="button" disabled>2: run</button>

  <label class="inline">Level:
    <select id="levelSelect" style="width:140px;">
      <option>level1</option>
      <option>level2</option>
    </select>
  </label>

  <label class="inline">Cell:
    <select id="cellSelect" style="width:260px;"></select>
  </label>
</div>

<div class="meta-panel" id="metaPanel">
  <strong>Meta information of the cell types.</strong>
  <p style="margin:6px 0 8px 0;">This page shows various information including</p>
  <ol style="margin:0 0 0 18px;">
    <li style="margin:2px 0;">Organ distribution patterns</li>
    <li style="margin:2px 0;">Matching annotation from previous literatures
      <ul style="margin:6px 0 0 18px;">
        <li>row indicates <code>{cell_annotation_from_the_literature}@{source_literature}</code></li>
        <li><code>SEN</code>: ratio of author_annotated_cells assigned to this PANGEA annotation</li>
        <li><code>PPV</code>: ratio of PANGEA annotation assigned to this author_annotated_cells</li>
        <li><code>CFS</code>: average prediction score (<code>PG_combined_score</code>)</li>
        <li><code>score</code>: overall score = cubic root of these parameters</li>
      </ul>
    </li>
    <li style="margin:2px 0;">Distribution patterns in tumor contexts
      <ul style="margin:6px 0 0 18px;">
        <li>shows results from PANGEA database (both Curated &amp; Re-aligned database)</li>
        <li>stats: one-sided Mann–Whitney U test</li>
        <li>
          <code>ns</code>: p &ge; 0.05,
          <code>*</code>: p &ge; 0.01,
          <code>**</code>: p &ge; 0.001,
          <code>***</code>: p &ge; 0.0001,
          <code>****</code>: p &lt; 0.0001
        </li>
      </ul>
    </li>
  </ol>
  <div style="margin-top:6px;">
    <small>Data base: <code id="dataBaseShow">/assets/data/</code></small>
  </div>
</div>

<!-- Processing progress -->
<div style="margin:8px 0 4px 0; font-size:13px; color:#555;">Processing</div>
<progress id="procProg" max="100" value="0" style="width:100%;"></progress>
<div id="procStatus" style="font-size:12px;color:#777;margin:4px 0 8px 0;">Idle</div>

<!-- Output image -->
<div id="imgWrap" style="display:none;margin:10px 0;">
  <img id="plotImg" alt="plot" style="max-width:100%;border:1px solid #e5e7eb;border-radius:6px;">
  <div style="margin-top:6px;">
    <a id="downloadPNG" download="explore.png">Download PNG</a>
  </div>
</div>

<details open style="margin-top:10px;">
  <summary><strong>Log</strong></summary>
  <pre id="log" style="
    background:#0a0f17;color:#e8eef7;padding:6px;border-radius:6px;overflow:auto;height:260px;
    white-space:pre-wrap;font-size:11px;line-height:1.25;font-family:ui-monospace,Menlo,Consolas,monospace;">
  </pre>
</details>

<script>
/* JS unchanged */
(function(){
  const DATA_BASE = "/assets/data/"; // trailing slash
  document.getElementById("dataBaseShow").textContent = DATA_BASE;

  const $ = (id)=>document.getElementById(id);
  function setDisabled(id, v){ const el=$(id); if(el) el.disabled = !!v; }
  function log(msg){
    const el=$("log"); el.textContent += msg + "\n";
    const lines = el.textContent.split("\n");
    if(lines.length>500){ el.textContent = lines.slice(-500).join("\n"); }
    el.scrollTop = el.scrollHeight;
  }
  function stage(pct, msg){
    $("procProg").value = pct;
    $("procStatus").textContent = msg;
  }
  async function fetchToFS(url, fsPath, {optional=false,label=null}={}){
    try{
      const u = (url.includes("?") ? url : url + "?t=" + Date.now());
      const r = await fetch(u, { cache: "no-store" });
      if(!r.ok){
        if(optional){
          log(`⚠️ Optional ${label||url} missing: HTTP ${r.status} for ${url}`);
          return false;
        }
        throw new Error(`HTTP ${r.status} for ${url}`);
      }
      const buf = new Uint8Array(await r.arrayBuffer());
      pyodide.FS.writeFile(fsPath, buf);
      log(`✅ ${label||url} → ${fsPath} (${(buf.length/1e6).toFixed(2)} MB)`);
      return true;
    }catch(e){
      if(optional){ log(`⚠️ Optional ${label||url} skipped: ` + (e?.message||e)); return false; }
      throw e;
    }
  }
  function clearImage(){
    const img=$("plotImg");
    $("imgWrap").style.display = "none";
    img.removeAttribute("src");
  }

  const LEVELS = ["level1","level2"];

  const CELLS_L1 = [
 'Astrocyte','B_GC','B_mature','B_progenitor','Ciliated','Dendritic_classical',
 'Dendritic_plasmacytoid','Ductal','Endothelial','Erythroid','Fibroblast','Hematopoietic',
 'Hepatocyte','Macrophage','Mast&Basophil','Melanocyte','Monocyte','Muller','Mural',
 'Neuron_bipolar','Neuron_excitatory','Neuron_inhibitory','Neutrophil',
 'Oligodendrocyte_mature','Oligodendrocyte_progenitor','Plasma','Platelet','Rod',
 'Schwann','Spermatocyte','Squamous','T&NK'
  ].sort((a,b)=>a.localeCompare(b));

  const CELLS_L2 = [
 'B_mature|CCL4','B_mature|EGR','B_mature|GBP','B_mature|HSP','B_mature|ISG','B_mature|Memory_atypical',
 'B_mature|Memory_switched','B_mature|Memory_unswitched','B_mature|Naive',
 'Dendritic_classical|ACY3','Dendritic_classical|AS-DC','Dendritic_classical|CXCL9','Dendritic_classical|DC1',
 'Dendritic_classical|DC2','Dendritic_classical|DC3','Dendritic_classical|EGR','Dendritic_classical|EREG',
 'Dendritic_classical|FCGR3A','Dendritic_classical|HSP','Dendritic_classical|ISG','Dendritic_classical|LAMP3',
 'Dendritic_classical|Langerhans',
 'Ductal|AT0','Ductal|AT1','Ductal|AT2','Ductal|BEST4','Ductal|Club','Ductal|Collecting-duct',
 'Ductal|Colonocyte','Ductal|Conjunctival','Ductal|DEFB4A','Ductal|Enterocyte','Ductal|Ependymal',
 'Ductal|Gastric','Ductal|Gastrointestinal_common','Ductal|Gingival','Ductal|Gland_CA6',
 'Ductal|Gland_LTF','Ductal|Gland_MUCL1','Ductal|Gland_SOX17','Ductal|Goblet','Ductal|Ionocyte','Ductal|KLK7',
 'Ductal|Pancreatobiliary_acinar','Ductal|Pancreatobiliary_ductal','Ductal|Proximal-tubule','Ductal|Submucosal_mucous',
 'Ductal|Submucosal_serous','Ductal|Thick-ascending','Ductal|Trophoblast_extravillous','Ductal|Trophoblast_villous',
 'Ductal|Tuft','Ductal|Urothelial','Ductal|thin-limb',
 'Endothelial|Arterial','Endothelial|BMP4','Endothelial|CXCR4','Endothelial|Capillary_BBB',
 'Endothelial|Capillary_activated','Endothelial|Capillary_aerocyte','Endothelial|Capillary_general',
 'Endothelial|Lymphatic_HGF','Endothelial|Lymphatic_LYVE1','Endothelial|Sinusoidal','Endothelial|Venous_C7',
 'Endothelial|Venous_CXCL10','Endothelial|Venous_DPEP1','Endothelial|Venous_ISG','Endothelial|Venous_activated',
 'Endothelial|Venous_general',
 'Fibroblast|ADAMDEC1','Fibroblast|Alveolar','Fibroblast|CCL19','Fibroblast|CD36','Fibroblast|CLDN1',
 'Fibroblast|CLEC14A','Fibroblast|COCH','Fibroblast|COX15','Fibroblast|CST2','Fibroblast|Chondrocyte',
 'Fibroblast|Corneal','Fibroblast|Dermal-sheath','Fibroblast|GREM2','Fibroblast|HSP','Fibroblast|IL24',
 'Fibroblast|IL6','Fibroblast|ISG','Fibroblast|ITGB8','Fibroblast|KLK1','Fibroblast|LRRC15','Fibroblast|NRG1',
 'Fibroblast|SYT1','Fibroblast|Satellite','Fibroblast|Universal',
 'Macrophage|Alveolar','Macrophage|CX3CR1','Macrophage|EREG','Macrophage|HSP','Macrophage|ISG','Macrophage|LYVE1',
 'Macrophage|MATK',
 'Monocyte|Classical_CCL4','Monocyte|Classical_FABP5','Monocyte|Classical_IL1R2','Monocyte|Classical_general',
 'Monocyte|HSP','Monocyte|ISG','Monocyte|Intermediate','Monocyte|Non-classical',
 'Mural|CD36','Mural|FGF7','Mural|ISG','Mural|LAMC3','Mural|RERGL','Mural|ROBO2','Mural|SPINT2','Mural|TNFAIP6',
 'Squamous|Basal','Squamous|Ciliary','Squamous|Corneal','Squamous|Eccrine','Squamous|HFSC',
 'Squamous|Keratinocyte_activated','Squamous|Keratinocyte_basal','Squamous|Keratinocyte_granular',
 'Squamous|Keratinocyte_spinous','Squamous|MHCII','Squamous|McSC','Squamous|Myoepithelial','Squamous|Sebaceous',
 'Squamous|Trophoblast','Squamous|Umbrella','Squamous|cTEC',
 'T&NK|ILC','T&NK|NK_CD16','T&NK|NK_CD56','T&NK|NK_CXCR6','T&NK|T&NK_HSP','T&NK|T&NK_ISG',
 'T&NK|T_CD4_CXCL13','T&NK|T_CD4_EM_Tfh','T&NK|T_CD4_EM_Th1','T&NK|T_CD4_EM_Th17','T&NK|T_CD4_EM_Th2',
 'T&NK|T_CD4_EM_Th22','T&NK|T_CD4_EM_Treg','T&NK|T_CD4_Eff_IFNG','T&NK|T_CD4_Eff_IL13','T&NK|T_CD4_Eff_IL17',
 'T&NK|T_CD4_N&CM','T&NK|T_CD4_RM_Th1','T&NK|T_CD4_RM_Th17','T&NK|T_CD4_RM_Treg','T&NK|T_CD4_activated',
 'T&NK|T_CD8_EM','T&NK|T_CD8_EMRA','T&NK|T_CD8_KLRC2','T&NK|T_CD8_MHCII','T&NK|T_CD8_N&CM','T&NK|T_CD8_RM',
 'T&NK|T_CD8_activated','T&NK|T_CD8_exhausted','T&NK|T_MAIT','T&NK|T_gdT_TRDV1','T&NK|T_gdT_TRDV2'
  ].sort((a,b)=>a.localeCompare(b));

  function populateCells(){
    const lvl = $("levelSelect").value.trim();
    const sel = $("cellSelect");
    sel.innerHTML = "";
    const arr = (lvl==="level1") ? CELLS_L1 : CELLS_L2;
    for(const c of arr){
      const opt=document.createElement("option");
      opt.textContent = c; opt.value = c;
      sel.appendChild(opt);
    }
  }
  populateCells();

  $("levelSelect").addEventListener("change", ()=>{
    populateCells();
  });

  let pyodide=null, FS=null;
  let booted=false, pngURL=null;

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
await micropip.install("seaborn")
      `);
      log("✅ seaborn installed.");

      await pyodide.runPythonAsync(`
import sys, io, os, gzip, pickle as pkl, textwrap
import numpy as np, pandas as pd, seaborn as sns
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.offsetbox import AnchoredText

plt.rcParams['figure.dpi'] = 150

def add_axes_note(ax, text, loc='upper right', fontsize=8, mono=True, frame=True, max_width=60):
    wrapped = textwrap.fill(text, width=max_width)
    kw = dict(size=fontsize)
    if mono: kw['family'] = 'monospace'
    at = AnchoredText(wrapped, loc=loc, prop=kw, frameon=frame, borderpad=0.4)
    if frame:
        at.patch.set_boxstyle("round,pad=0.3,rounding_size=0.8")
        at.patch.set_alpha(0.85)
        at.patch.set_edgecolor('#999')
        at.patch.set_facecolor('#f8f9fb')
    ax.add_artist(at)
    return at

def add_fig_note(fig, text, x=0.01, y=0.99, fontsize=9, mono=True, ha='left', va='top', max_width=120):
    wrapped = textwrap.fill(text, width=max_width)
    kw = dict(fontsize=fontsize, ha=ha, va=va)
    if mono: kw['family'] = 'monospace'
    fig.text(x, y, wrapped, bbox=dict(boxstyle='round,pad=0.3',
                                      facecolor='#f8f9fb', edgecolor='#999', alpha=0.85),
             **kw)
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

  $("runBtn").addEventListener("click", async ()=>{
    if(!booted){ alert("Boot first."); return; }
    clearImage();

    const level = $("levelSelect").value.trim();
    const cell  = $("cellSelect").value.trim();

    stage(10, "Preparing files …");
    log(`▶️ Explore: level=${level}, cell=${cell}`);

    const baseProfile = DATA_BASE + "cell_profile/";
    const f_overall = `${baseProfile}overall_${level}.csv`;
    const f_profile = `${baseProfile}profile_${level}.csv`;
    const f_match   = `${baseProfile}matching_res.csv`;

    const f_m_l1 = `${baseProfile}marker/Level1_mdic.pkl`;
    const cell1 = (cell.includes("|") ? cell.split("|")[0] : cell);
    const f_m_l2 = `${baseProfile}marker/${cell1}_mdic.pkl`;

    const tme_dir = `${baseProfile}cancer_dist/`;
    const f_prop  = `${tme_dir}prop_${cell1}.csv`;
    const f_pval  = `${tme_dir}pval_${cell1}.csv`;
    const f_cmap  = `${tme_dir}cmapdic_cat.pkl`;

    try{
      try{ FS.mkdir("/work"); }catch(_){}
      await fetchToFS(f_overall, "/work/overall.csv", {label:"overall"});
      await fetchToFS(f_profile, "/work/profile.csv", {label:"profile"});
      await fetchToFS(f_match,   "/work/matching.csv", {label:"matching_res"});
      if(level==="level1"){
        await fetchToFS(f_m_l1, "/work/marker.pkl", {label:"Level1 marker dict"});
      }else{
        await fetchToFS(f_m_l2, "/work/marker.pkl", {label:`${cell1} marker dict`});
      }
      await fetchToFS(f_prop, "/work/prop.csv", {optional:true,label:`TME prop_${cell1}.csv`});
      await fetchToFS(f_pval, "/work/pval.csv", {optional:true,label:`TME pval_${cell1}.csv`});
      await fetchToFS(f_cmap, "/work/cmap.pkl", {optional:true,label:`TME cmapdic_cat.pkl`});
    }catch(e){
      stage(0,"Error"); log("❌ Fetch failed: " + (e?.message||e)); return;
    }

    stage(40, "Running Python …");

    const unhookOut = pyodide.setStdout({ batched: (s)=>{ (s||"").split(/\r?\n/).forEach(line=> line && log(line)); } });
    const unhookErr = pyodide.setStderr({ batched: (s)=>{ s && s.trim() && log("ERR: " + s); } });

    try{
      const code = `
import io, os, pickle as pkl
import numpy as np, pandas as pd, seaborn as sns, matplotlib as mpl
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from math import isfinite

level = ${JSON.stringify(level)}
cell  = ${JSON.stringify(cell)}
cell1 = (cell.split("|")[0] if "|" in cell else cell)

sns.set_theme(style="whitegrid")
mpl.rcParams['figure.dpi'] = 150

mls = []
try:
    with open("/work/marker.pkl","rb") as fh:
        mdic = pkl.load(fh)
    if cell in mdic:
        mls = list(mdic[cell])[:10]
except: pass

overall = pd.read_csv("/work/overall.csv", index_col=0)
prop    = pd.read_csv("/work/profile.csv", index_col=0).fillna(0)

fig, axes = plt.subplots(2, 1, figsize=(7, 10), gridspec_kw = {'height_ratios':[7,3]})

sns.scatterplot(data=overall, y='avg', x='spec', s=30, linewidth=0, color='lightgrey', ax=axes[0])
if cell in overall.index:
    sns.scatterplot(data=overall.loc[[cell]], y='avg', x='spec', s=100,
                    linewidth=1, edgecolor='black', color='orange', ax=axes[0])
    x, y = float(overall.loc[cell, 'spec']), float(overall.loc[cell, 'avg'])
    axes[0].text(x, y, cell, fontsize=8, ha='left', va='center')

if cell in overall.index:
    axes[0].text(overall['spec'].max(), overall['avg'].max(),
                 f"Organ spec.: {overall.loc[cell,'spec']:.2f}\\nAverage prop.: {overall.loc[cell,'avg']:.2f}",
                 va='top', ha='right', fontsize=8)

axes[0].set_xlabel('Organ specificity')
axes[0].set_ylabel('Average proportion')

if cell in prop.columns:
    order = prop.groupby('Organ')[cell].mean().sort_values(ascending=False).index
else:
    order = prop['Organ'].unique()

sns.barplot(data=prop, y=cell if cell in prop.columns else 'Organ', x='Organ',
            order=order, ax=axes[1],
            capsize=.2, errorbar='se', errwidth=1, errcolor='black',
            linewidth=1, edgecolor='black', color='steelblue')
axes[1].tick_params(axis='x', rotation=90)
axes[1].set_xlabel("")
axes[1].set_ylabel('Proportion')
axes[1].set_title(cell)

if mls: mtext = 'curated marker: '+','.join(mls)
else:   mtext = ''

from matplotlib import pyplot as _plt
def add_fig_note(fig, text, x=0.01, y=0.99, fontsize=9, mono=True, ha='left', va='top', max_width=120):
    import textwrap
    wrapped = textwrap.fill(text, width=max_width)
    kw = dict(fontsize=fontsize, ha=ha, va=va)
    if mono: kw['family'] = 'monospace'
    fig.text(x, y, wrapped, bbox=dict(boxstyle='round,pad=0.3',
                                      facecolor='#f8f9fb', edgecolor='#999', alpha=0.85),
             **kw)

add_fig_note(fig, f"Cell type: {cell}", x=0.01, y=1.11, ha='left', va='bottom', fontsize=11)
add_fig_note(fig, f"{mtext}", x=0.01, y=1.08, ha='left', va='bottom', fontsize=8)
add_fig_note(fig, f"Organ distribution", x=0.01, y=1.05, ha='left', va='bottom', fontsize=9)

sns.despine()
plt.tight_layout()

buf1 = io.BytesIO()
plt.savefig(buf1, format="png", bbox_inches="tight", dpi=150)
plt.close(fig)

mdf = pd.read_csv("/work/matching.csv", index_col=0)
fig2buf = None
if 'PANGEA_annotation' in mdf.columns and (cell in set(mdf['PANGEA_annotation'])):
    mdf1 = (mdf[mdf['PANGEA_annotation']==cell]
            .drop(columns=['PANGEA_annotation'], errors='ignore')
            .head(10))
    metrics = ['SEN','PPV','CFS','score']
    metrics_scatter = metrics[:-1]
    metric_bar = metrics[-1]
    n_rows = len(mdf1.index)
    if n_rows>0:
        n_cols = len(metrics)
        n_cols_scatter = len(metrics_scatter)
        x = np.repeat(np.arange(n_cols_scatter), n_rows)
        y_rows = np.arange(n_rows)[::-1]
        y = np.tile(y_rows, n_cols_scatter)
        vals = np.concatenate([mdf1[m].values for m in metrics_scatter])
        cmap = mpl.cm.RdYlBu_r
        norm01 = mpl.colors.Normalize(vmin=0.0, vmax=1.0)
        sizes = 250 * np.clip(vals, 0, 1)
        fig2, ax = plt.subplots(figsize=(n_cols*1.7, n_rows*0.6), dpi=150)
        sc = ax.scatter(x, y, s=sizes, c=vals, cmap=cmap, norm=norm01, edgecolor="black", linewidth=0.5)
        ax.set_xticks([0,1,2,3.5])
        ax.set_xticklabels(['SEN','PPV','CFS','score'])
        ax.set_yticks(y_rows)
        ax.set_yticklabels(list(mdf1.index))
        ax.set_xlim(-0.5, n_cols-0.5); ax.set_ylim(-0.5, n_rows-0.5)
        sns.despine(bottom=True, left=True); ax.set_axisbelow(True)
        ax.grid(True, which='major', axis='both', color='#B0B0B0', linestyle='-', linewidth=0.8, alpha=0.6)
        last_col_center = n_cols - 1
        cell_left = last_col_center - 0.5; cell_right = last_col_center + 0.5
        cell_width = cell_right - cell_left; pad_x = 0.05 * cell_width
        axin = ax.inset_axes([cell_left + 0.5, -0.5, cell_width - 2*pad_x, n_rows], transform=ax.transData)
        bar_vals = np.clip(mdf1[metric_bar].values, 0, 1)
        axin.barh(y_rows, bar_vals, height=0.7, color="slategrey", edgecolor='black', linewidth=0.5)
        axin.set_ylim(ax.get_ylim()); axin.set_xlim(0,1.1); axin.set_xticks([]); axin.set_yticks([])
        for sp in axin.spines.values(): sp.set_visible(False)
        def _add(fig, text): fig.text(0.01, 1.05, text, ha='left', va='bottom',
                                      fontsize=9, family='monospace',
                                      bbox=dict(boxstyle='round,pad=0.3', facecolor='#f8f9fb',
                                                edgecolor='#999', alpha=0.85))
        _add(plt.gcf(), "Matching annotation")
        shrink = 1 if n_rows==1 else (0.2 + (0.2 / max(1, n_rows/3 + .75)))
        cbar = plt.colorbar(sc, ax=ax, pad=0.2, shrink=shrink, aspect=10)
        cbar.set_label("values"); cbar.set_ticks([0,0.5,1.0])
        plt.tight_layout()
        fig2buf = io.BytesIO(); plt.savefig(fig2buf, format="png", bbox_inches="tight", dpi=150); plt.close(fig2)

try:
    has_tme = os.path.exists("/work/prop.csv") and os.path.exists("/work/pval.csv") and os.path.exists("/work/cmap.pkl")
    fig3buf = None
    if has_tme:
        import pickle as _p
        pdf = pd.read_csv("/work/prop.csv", index_col=0)
        df1 = pd.read_csv("/work/pval.csv", index_col=0)
        with open("/work/cmap.pkl", "rb") as fh: cmapdic = _p.load(fh)
        order = ['Control','Non-malignant disease','Cancer_AdjNorm','Cancer_Blood','Cancer_Tumor','Cancer_Metastasis']
        order = [g for g in order if g in set(pdf.get('Cancer_Tissue',[]))]
        def p_to_stars(p):
            if pd.isna(p): return "NA"
            return ("ns" if p >= 0.05 else "*" if p >= 0.01 else "**" if p >= 0.001 else "***" if p >= 1e-4 else "****")
        def annotate_barh_stars(ax, value_col, group_col, pval_df, comparisons, order):
            means = pdf.groupby(group_col)[value_col].mean()
            xmin, xmax = ax.get_xlim(); xr = xmax - xmin if xmax>xmin else float(max(means.max(),1.0))
            pad, sep, cap, doff = 0.50*xr, 0.10*xr, 0.025*xr, 0.03*xr
            tick_pos = list(ax.get_yticks()); tick_lab = [t.get_text() for t in ax.get_yticklabels()]
            y_center = {lab: float(pos) for lab,pos in zip(tick_lab,tick_pos)} if len(tick_pos)==len(tick_lab) and len(tick_pos)>0 else {}
            if len(y_center)<len(order):
                rects=[p for p in ax.patches if hasattr(p,"get_y")]
                if len(rects)>=len(order):
                    for lab,r in zip(order, rects[:len(order)]):
                        y_center.setdefault(lab, r.get_y()+0.5*r.get_height())
                else:
                    for i,lab in enumerate(order): y_center.setdefault(lab,float(i))
            placed=[]
            for a,b in comparisons:
                if (a not in order) or (b not in order): continue
                key=None
                for k in (f"{a}|{b}", f"{b}|{a}", f"{a} vs {b}", f"{b} vs {a}"):
                    if k in pval_df.index: key=k; break
                if key is None: continue
                p=float(pval_df.loc[key, value_col]) if value_col in pval_df.columns else np.nan
                stars=p_to_stars(p)
                y1,y2 = y_center[a], y_center[b]; ylow, yhigh = sorted((y1,y2))
                x_br = max(float(means.get(a,0.0)), float(means.get(b,0.0))) + pad
                while any((ylow<=yyh and yhigh>=yyl and x_br < xb + (cap+doff+sep)) for xb,yyl,yyh in placed):
                    blockers=[xb for xb,yyl,yyh in placed if (ylow<=yyh and yhigh>=yyl)]
                    x_br = max(x_br, max(blockers) + (cap+doff+sep))
                placed.append((x_br, ylow, yhigh))
                ax.plot([x_br, x_br], [ylow, yhigh], color="k", lw=1.0, alpha=1.0, zorder=9, clip_on=False)
                ax.plot([x_br-cap, x_br], [yhigh, yhigh], color="k", lw=1.0, alpha=1.0, zorder=9, clip_on=False)
                ax.plot([x_br-cap, x_br], [ylow,  ylow ], color="k", lw=1.0, alpha=1.0, zorder=9, clip_on=False)
                ymid = 0.5*(ylow+yhigh) - 0.30*0.5
                ax.text(x_br+doff, ymid, stars, rotation=270, rotation_mode="anchor",
                        ha="left", va="center", fontsize=7, fontweight="bold", color="k")
            right_need = [xb + cap + doff for xb,_,_ in placed] or [xmax]
            ax.set_xlim(xmin, max(xmax, max(right_need) + 0.02*xr))
        fig3, ax3 = plt.subplots(figsize=(4, 2.2), dpi=150)
        sns.barplot(data=pdf, x=cell, y='Cancer_Tissue', ax=ax3,
                    palette=cmapdic, order=order, estimator=np.mean,
                    linewidth=1, edgecolor='black',
                    errorbar='se', capsize=.2, errwidth=1, errcolor='black')
        sns.despine()
        ctrls = [x for x in ['Control','Non-malignant disease','Cancer_AdjNorm'] if x in set(pdf['Cancer_Tissue'])]
        comps = [('Cancer_Tumor', c) for c in ctrls]
        annotate_barh_stars(ax3, cell, 'Cancer_Tissue', df1, comps, order)
        ax3.set_xlabel(cell); ax3.set_ylabel('')
        def _add(fig, text): fig.text(0.01, 1.05, text, ha='left', va='bottom',
                                      fontsize=9, family='monospace',
                                      bbox=dict(boxstyle='round,pad=0.3', facecolor='#f8f9fb',
                                                edgecolor='#999', alpha=0.85))
        _add(plt.gcf(), "TME distribution")
        plt.tight_layout()
        fig3buf = io.BytesIO(); plt.savefig(fig3buf, format="png", bbox_inches="tight", dpi=150); plt.close(fig3)
except: pass

from PIL import Image
imgs=[]
for b in (buf1, fig2buf, fig3buf):
    if b is not None:
        b.seek(0)
        imgs.append(Image.open(b).convert("RGBA"))
if not imgs: raise RuntimeError("No figures to display.")
width = max(im.width for im in imgs)
padded = []
for im in imgs:
    if im.width<width:
        pad = Image.new("RGBA", (width, im.height), (255,255,255,0))
        pad.paste(im, (0,0))
        padded.append(pad)
    else:
        padded.append(im)
total_h = sum(im.height for im in padded) + (len(padded)-1)*20
out = Image.new("RGBA", (width, total_h), (255,255,255,255))
y=0
for i,im in enumerate(padded):
    out.paste(im, (0,y))
    y += im.height + (20 if i<len(padded)-1 else 0)
with open("/work/explore.png","wb") as fh:
    bio=io.BytesIO(); out.convert("RGB").save(bio, format="PNG"); fh.write(bio.getvalue())
"OK"
      `;
      await pyodide.runPythonAsync(code);
      stage(85, "Rendering …");

      const bytes = FS.readFile("/work/explore.png");
      const blob  = new Blob([bytes], { type: "image/png" });
      if(pngURL) URL.revokeObjectURL(pngURL);
      pngURL = URL.createObjectURL(blob);
      $("plotImg").src = pngURL;
      $("imgWrap").style.display = "block";
      $("downloadPNG").href = pngURL;
      stage(100, "Done");
      log("✅ Plot ready.");
    }catch(e){
      stage(0,"Error");
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
