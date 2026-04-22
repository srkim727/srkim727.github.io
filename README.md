---
layout: home
title: PANGEA
permalink: /
---


**PANGEA (Public ANotated Gene Expression Atlas)** is a cell annotation framework based on a single-cell transcriptome database.
<br>
PANGEA framework includes

1. Database curation
2. Construction of reference cell atlases and cell annotation models
3. Meta analyses based on integrated cell annotations



### I. Database curation
![Image](/assets/images/DBpipeline.png)
PANGEA database mainly consists of _re-aligned_ datasets from public repositories (NCBI).

* This re-aligned database encompasses 
  - 2,058 human _in vivo_ samples 
    (1,426 from non-malignant, and 632 from maligant donors)
  - 131 disease contexts
  - 45 organ identities  
<br>

* Benefits of this re-aligned database includes
  - minimized computational biases
  - consistent cell QC standards
  - facilitate implementation of count-based models ([SCVI][4], ...)



### II. Reference cell atlases
![Image](/assets/images/Cellatlases_Level1and2.png)  
Integration of expression profiles in PANGEA database identified

1. 32 different major cell types (Level1)
2. 165 different cellular subtypes (Level2)

Gene expression patterns of these annotations can be explored [here][5]. <br>
Organ distribution patterns of these annotations can be explored [here][6].


### III. Cell annotation models 


Based on reference cell atlases, annotation models were built using [CellTypist][7]. 
<br>
Full version of PANGEA cell annotation framework is available via python package, [**PANGEApy**][1].
<br>
Web-app implementation of PANGEA cell annotation model is available [here][8]. 




### Repositories

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:12px 0 16px 0;">

  <a href="https://github.com/srkim727/pangeapy" target="_blank" rel="noopener"
     style="display:block;padding:14px 16px;border:1px solid #e5e7eb;border-radius:10px;background:#fafbfc;text-decoration:none;color:#111827;transition:border-color .15s,box-shadow .15s,transform .15s;">
    <div style="font-size:13px;color:#3b82f6;font-weight:600;letter-spacing:.02em;text-transform:uppercase;margin-bottom:4px;">Package</div>
    <div style="font-size:15px;font-weight:600;margin-bottom:4px;">PANGEApy</div>
    <div style="font-size:13px;color:#6b7280;">Cell annotation package &amp; pipeline</div>
  </a>

  <a href="https://doi.org/10.6084/m9.figshare.28138364.v2" target="_blank" rel="noopener"
     style="display:block;padding:14px 16px;border:1px solid #e5e7eb;border-radius:10px;background:#fafbfc;text-decoration:none;color:#111827;transition:border-color .15s,box-shadow .15s,transform .15s;">
    <div style="font-size:13px;color:#3b82f6;font-weight:600;letter-spacing:.02em;text-transform:uppercase;margin-bottom:4px;">Data</div>
    <div style="font-size:15px;font-weight:600;margin-bottom:4px;">Cell atlases</div>
    <div style="font-size:13px;color:#6b7280;">Representative reference atlases (figshare)</div>
  </a>

  <a href="https://doi.org/10.6084/m9.figshare.30335656.v6" target="_blank" rel="noopener"
     style="display:block;padding:14px 16px;border:1px solid #e5e7eb;border-radius:10px;background:#fafbfc;text-decoration:none;color:#111827;transition:border-color .15s,box-shadow .15s,transform .15s;">
    <div style="font-size:13px;color:#3b82f6;font-weight:600;letter-spacing:.02em;text-transform:uppercase;margin-bottom:4px;">Models</div>
    <div style="font-size:15px;font-weight:600;margin-bottom:4px;">Annotation models</div>
    <div style="font-size:13px;color:#6b7280;">Pre-trained logistic regression models (figshare)</div>
  </a>

  <a href="/pages/annotate/"
     style="display:block;padding:14px 16px;border:1px solid #dbeafe;border-radius:10px;background:#eff6ff;text-decoration:none;color:#111827;transition:border-color .15s,box-shadow .15s,transform .15s;">
    <div style="font-size:13px;color:#2563eb;font-weight:600;letter-spacing:.02em;text-transform:uppercase;margin-bottom:4px;">Web tool</div>
    <div style="font-size:15px;font-weight:600;margin-bottom:4px;">Annotate cells online ↗</div>
    <div style="font-size:13px;color:#6b7280;">In-browser prediction (no install needed)</div>
  </a>

  <a href="/pages/geneplot/"
     style="display:block;padding:14px 16px;border:1px solid #dbeafe;border-radius:10px;background:#eff6ff;text-decoration:none;color:#111827;transition:border-color .15s,box-shadow .15s,transform .15s;">
    <div style="font-size:13px;color:#2563eb;font-weight:600;letter-spacing:.02em;text-transform:uppercase;margin-bottom:4px;">Web tool</div>
    <div style="font-size:15px;font-weight:600;margin-bottom:4px;">Explore gene expression ↗</div>
    <div style="font-size:13px;color:#6b7280;">Expression profiles across cell atlases</div>
  </a>

  <a href="/pages/cellplot/"
     style="display:block;padding:14px 16px;border:1px solid #dbeafe;border-radius:10px;background:#eff6ff;text-decoration:none;color:#111827;transition:border-color .15s,box-shadow .15s,transform .15s;">
    <div style="font-size:13px;color:#2563eb;font-weight:600;letter-spacing:.02em;text-transform:uppercase;margin-bottom:4px;">Web tool</div>
    <div style="font-size:15px;font-weight:600;margin-bottom:4px;">Explore cell distribution ↗</div>
    <div style="font-size:13px;color:#6b7280;">Organ distribution &amp; literature matches</div>
  </a>

</div>

<style>
  a[href][style*="border:1px solid"]:hover{
    border-color:#9ca3af !important;
    box-shadow:0 2px 6px rgba(0,0,0,.06);
    transform:translateY(-1px);
  }
</style>



[1]: https://github.com/srkim727/pangeapy
[2]: https://doi.org/10.6084/m9.figshare.28138364.v2
[3]: https://doi.org/10.6084/m9.figshare.30335656.v6
[4]: https://docs.scvi-tools.org/en/1.3.3/user_guide/models/scvi.html
[5]: https://srkim727.github.io/pages/geneplot/
[6]: https://srkim727.github.io/pages/cellplot/
[7]: https://github.com/Teichlab/celltypist
[8]: https://srkim727.github.io/pages/annotate/