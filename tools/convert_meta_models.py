#!/usr/bin/env python3
"""
Convert pangeapy meta models (pickle, sklearn) into the portable .npz format
used by the in-browser /pages/annotate_complex/ page.

What it does
------------
1. Downloads `meta_models.csv` from figshare (same URL pangeapy uses).
2. For each row whose `type` is one of Organ_predictor / Blood_predictor /
   Tissue_predictor, downloads the pickle.
3. Loads the pickle, expects an sklearn-style estimator exposing
   `coef_`, `intercept_`, `classes_`, and `feature_names_in_` (i.e. a
   LogisticRegression or a linear model).
4. Saves a portable .npz that the existing JS loader in `annotate_complex.md`
   can read directly:

       features         : feature_names_in_      (cell-type proportion labels)
       coef_            : (n_classes, n_features) float32
       intercept_       : (n_classes,)            float32
       classes_         : (n_classes,)            <U...
       scaler_mean_     : zeros (no scaling)      float32
       scaler_scale_    : ones  (no scaling)      float32
       with_mean        : array([False])          bool

Outputs land in `assets/models/` by default:
    meta_Organ_predictor_portable.npz
    meta_Blood_predictor_portable.npz
    meta_Tissue_predictor_portable.npz

Usage
-----
    python tools/convert_meta_models.py
    python tools/convert_meta_models.py --out-dir assets/models --keep-cache
    python tools/convert_meta_models.py --pickle-dir ~/.pangea  # use already-downloaded pickles

Requires: numpy, pandas, scikit-learn (only for unpickling), requests (or urllib).
"""
from __future__ import annotations

import argparse
import os
import pickle
import shutil
import sys
import tempfile
import time
import urllib.request
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

# Same default as pangeapy/models.py (kept in sync; override with --meta-models-url).
_META_MODELS_URL = "https://ndownloader.figshare.com/files/61824709"

# Which model types to convert (others in meta_models.csv are ignored).
_TYPE_TO_OUT = {
    "Organ_predictor":  "meta_Organ_predictor_portable.npz",
    "Blood_predictor":  "meta_Blood_predictor_portable.npz",
    "Tissue_predictor": "meta_Tissue_predictor_portable.npz",
}


def _http_get(url: str, dst: Path, label: str = "", retries: int = 5, wait: int = 10) -> None:
    """Download `url` to `dst`, with retry on HTTP 202 (figshare prep)."""
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "convert_meta_models/1.0"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                code = resp.status if hasattr(resp, "status") else resp.getcode()
                if code == 200:
                    dst.write_bytes(resp.read())
                    return
                if code == 202:
                    print(f"  202 (preparing) — retry in {wait}s [{attempt}/{retries}]")
                    time.sleep(wait)
                    continue
                raise RuntimeError(f"HTTP {code} for {url}")
        except Exception as e:
            if attempt == retries:
                raise
            print(f"  attempt {attempt} failed: {e!r}; retry in {wait}s")
            time.sleep(wait)
    raise RuntimeError(f"Exhausted retries for {url}")


def _convert_one(pkl_path: Path, npz_path: Path, label: str) -> None:
    print(f"[{label}] loading {pkl_path}")
    with pkl_path.open("rb") as f:
        model = pickle.load(f)

    missing = [a for a in ("coef_", "intercept_", "classes_", "feature_names_in_") if not hasattr(model, a)]
    if missing:
        raise RuntimeError(
            f"[{label}] model {type(model).__name__} lacks attributes {missing}. "
            f"This converter only supports linear models (e.g. LogisticRegression) "
            f"exposing coef_/intercept_/classes_/feature_names_in_."
        )

    coef = np.asarray(model.coef_, dtype=np.float32)
    intercept = np.asarray(model.intercept_, dtype=np.float32)
    classes = np.asarray(model.classes_).astype(str)
    features = np.asarray(model.feature_names_in_).astype(str)

    # Binary LR stores coef_ as (1, n_features). Keep that shape — the browser
    # loader already handles the 1-class softmax fallback by stacking [-z, z].
    if coef.ndim == 1:
        coef = coef.reshape(1, -1)
    if intercept.ndim == 0:
        intercept = np.array([intercept], dtype=np.float32)

    n_classes, n_feat = coef.shape
    if intercept.shape[0] != n_classes:
        raise RuntimeError(f"[{label}] intercept shape {intercept.shape} vs n_classes {n_classes}")
    if classes.shape[0] != n_classes:
        raise RuntimeError(f"[{label}] classes_ shape {classes.shape} vs n_classes {n_classes}")
    if features.shape[0] != n_feat:
        raise RuntimeError(f"[{label}] feature_names_in_ shape {features.shape} vs n_feat {n_feat}")

    # Dummy scaler so the same loader code path works (with_mean=False ⇒ no centering;
    # scaler_scale_=1 ⇒ multiply is a no-op).
    scaler_mean  = np.zeros(n_feat, dtype=np.float32)
    scaler_scale = np.ones(n_feat,  dtype=np.float32)
    with_mean    = np.array([False])

    np.savez(
        npz_path,
        features=features,
        coef_=coef,
        intercept_=intercept,
        classes_=classes,
        scaler_mean_=scaler_mean,
        scaler_scale_=scaler_scale,
        with_mean=with_mean,
    )
    size_mb = npz_path.stat().st_size / 1e6
    print(f"[{label}] → {npz_path}  (n_classes={n_classes}, n_features={n_feat}, {size_mb:.2f} MB)")


def _find_meta_csv(pickle_dir: Path) -> Optional[Path]:
    """Look for a pangeapy-style meta_models.csv in a local cache dir."""
    for candidate in (pickle_dir / "meta_models.csv",
                      pickle_dir / ".pangea" / "meta_models.csv"):
        if candidate.is_file():
            return candidate
    return None


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--meta-models-url", default=_META_MODELS_URL,
                   help="URL to meta_models.csv (default matches pangeapy/models.py)")
    p.add_argument("--out-dir", default="assets/models",
                   help="Where to write portable .npz files (default: assets/models)")
    p.add_argument("--cache-dir", default=None,
                   help="Where to drop downloaded pickles (default: temp dir, cleaned afterwards)")
    p.add_argument("--pickle-dir", default=None,
                   help="If set, look here for already-downloaded pangeapy meta pickles "
                        "(e.g. ~/.pangea) and skip network downloads when files exist")
    p.add_argument("--keep-cache", action="store_true",
                   help="Don't delete the cache dir at the end")
    args = p.parse_args()

    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_dir = Path(args.cache_dir) if args.cache_dir else Path(tempfile.mkdtemp(prefix="pangeapy_meta_"))
    cache_dir.mkdir(parents=True, exist_ok=True)
    print(f"out-dir : {out_dir}")
    print(f"cache   : {cache_dir}")

    pickle_dir = Path(args.pickle_dir).expanduser() if args.pickle_dir else None
    local_csv = _find_meta_csv(pickle_dir) if pickle_dir else None

    if local_csv is not None:
        print(f"using local meta_models.csv: {local_csv}")
        csv_path = local_csv
    else:
        csv_path = cache_dir / "meta_models.csv"
        print(f"downloading meta_models.csv …")
        _http_get(args.meta_models_url, csv_path, label="meta_models.csv")

    df = pd.read_csv(csv_path, header=None)
    df.columns = ["models", "source"]
    df["type"] = [m.split("/")[-1].split("_v")[0] for m in df["models"]]
    print("\nmeta models discovered:")
    print(df[["type", "models"]].to_string(index=False))
    print()

    converted = 0
    for _, row in df.iterrows():
        mtype = row["type"]
        if mtype not in _TYPE_TO_OUT:
            print(f"skip (unknown type): {mtype}")
            continue

        rel_path = row["models"]
        local_pickle: Optional[Path] = None
        if pickle_dir is not None:
            cand = pickle_dir / rel_path
            if cand.is_file():
                local_pickle = cand
                print(f"[{mtype}] using local pickle: {local_pickle}")

        if local_pickle is None:
            local_pickle = cache_dir / rel_path.replace("/", "_")
            print(f"[{mtype}] downloading pickle …")
            _http_get(row["source"], local_pickle, label=mtype)

        _convert_one(local_pickle, out_dir / _TYPE_TO_OUT[mtype], mtype)
        converted += 1

    if not args.keep_cache and (Path(args.cache_dir) if args.cache_dir else cache_dir) == cache_dir:
        try:
            shutil.rmtree(cache_dir)
            print(f"\nremoved cache: {cache_dir}")
        except OSError as e:
            print(f"\nwarning: could not remove cache {cache_dir}: {e}")

    print(f"\n✅ converted {converted} model(s)")
    if converted == 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
