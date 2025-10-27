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


Based on this reference cell atlases, cell prediction models were constructed using [CellTypist][7]. 
<br>
The PANGEA cell annotation framework is fully implemented in python package, [**PANGEApy**][1].
<br>
Web-app implementation of PANGEA annotation is available [here][8]. 




### Repositories
1. [PANGEApy: cell annotation package/pipeline][1]
2. [representative cell atlases][2]
3. [cell annotation models][3]



[1]: https://github.com/srkim727/pangeapy
[2]: https://doi.org/10.6084/m9.figshare.28138364.v2
[3]: https://doi.org/10.6084/m9.figshare.30335656.v6
[4]: https://docs.scvi-tools.org/en/1.3.3/user_guide/models/scvi.html
[5]: https://srkim727.github.io/pages/geneplot/
[6]: https://srkim727.github.io/pages/cellplot/
[7]: https://github.com/Teichlab/celltypist
[8]: https://srkim727.github.io/pages/annotate/