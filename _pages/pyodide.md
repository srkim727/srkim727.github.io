/* assets/js/annotate.js */
(function () {
  "use strict";

  var $log  = document.getElementById('log');
  var $boot = document.getElementById('boot');
  var $validate = document.getElementById('validate');
  var $load = document.getElementById('load');
  var $run  = document.getElementById('run');
  var $ping = document.getElementById('ping');

  if (!$log || !$boot) { console.error('annotate.js: missing #log or #boot'); return; }
  function log(m){ $log.textContent += m + "\n"; $log.scrollTop = $log.scrollHeight; }
  function errMsg(e){ if (e && e.message) return e.message; if (e && e.type) return e.type; try{return JSON.stringify(e);}catch(_){return String(e);} }

  log("🔸 Ready — click **Boot** to initialize.");

  var ORT = null, H5 = null, booted = false;

  var MODEL_URL   = "/assets/models/Level1/model.onnx";
  var GENES_URL   = "/assets/models/Level1/genes.json";
  var CLASSES_URL = "/assets/models/Level1/classes.json";

  var H5WASM_BASES = [
    "/assets/libs/h5wasm",
    "/assets/libs/h5wasm/dist"
  ];
  var H5WASM_CDN_BASE = "https://cdn.jsdelivr.net/npm/h5wasm@0.5.0/dist";

  var $f,$meta,$dl,$upBar,$upPct,$upSpd,$anBar,$anPct,$batch,$safe;

  function rebind(id, handler){
    var el = document.getElementById(id);
    if (!el) { log("⚠️ Missing element #"+id); return null; }
    var clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('click', function(ev){ try{handler(ev);}catch(e){log('🛑 '+id+' error: '+errMsg(e));console.error(e);} });
    return clone;
  }

  function ensureORT(){
    if (window.ort) return Promise.resolve(window.ort);
    return new Promise(function(resolve,reject){
      var s=document.createElement('script');
      s.src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js";
      s.onload=function(){ resolve(window.ort); };
      s.onerror=function(){
        var s2=document.createElement('script');
        s2.src="https://unpkg.com/onnxruntime-web/dist/ort.min.js";
        s2.onload=function(){ resolve(window.ort); };
        s2.onerror=function(ev){ reject(new Error("onnxruntime-web failed ("+(ev&&ev.type||"error")+")")); };
        document.head.appendChild(s2);
      };
      document.head.appendChild(s);
    });
  }

  function probeJs(url){
    return fetch(url, {cache:"no-cache"}).then(function(r){
      if (!r.ok) throw new Error("HTTP "+r.status+" "+r.statusText);
      return r.text().then(function(txt){
        var head = txt.slice(0,512).toLowerCase();
        if (head.indexOf("<!doctype")>=0 || head.indexOf("<html")>=0) {
          throw new Error("Looks like HTML, not JS");
        }
        if (txt.length < 50) throw new Error("Suspiciously short JS");
        return true;
      });
    });
  }

  var _h5 = null;

  function tryLocalBase(base){
    base = base.replace(/\/+$/,'');
    var esm = base + "/esm/h5wasm.js";
    var umd = base + "/h5wasm.js";

    return probeJs(esm).then(function(){
      log("h5wasm: ESM probe OK at "+esm);
      var abs = location.origin + esm;
      return import(abs).then(function(ns){
        log("h5wasm: loaded ESM from "+base);
        _h5 = ns;
        return {ns:ns, mode:"esm", base:base};
      });
    }).catch(function(){
      return probeJs(umd).then(function(){
        log("h5wasm: UMD probe OK at "+umd);
        return new Promise(function(resolve,reject){
          var s=document.createElement("script");
          s.src = umd;
          s.async = true;
          s.onload = function(){
            if (!window.h5wasm) { reject(new Error("window.h5wasm undefined after UMD load")); return; }
            if (window.h5wasm.setWasmPath) {
              window.h5wasm.setWasmPath(base + "/");
              log("h5wasm.setWasmPath("+base+"/)");
            }
            log("h5wasm: loaded UMD from "+base);
            _h5 = window.h5wasm;
            resolve({ns:window.h5wasm, mode:"umd", base:base});
          };
          s.onerror = function(ev){ reject(new Error("UMD script load failed ("+(ev&&ev.type||"error")+")")); };
          document.head.appendChild(s);
        });
      });
    });
  }

  function tryCdnUmd(){
    var umd = H5WASM_CDN_BASE + "/h5wasm.js";
    log("h5wasm: falling back to CDN UMD: "+umd);
    return probeJs(umd).then(function(){
      return new Promise(function(resolve,reject){
        var s=document.createElement("script");
        s.src=umd; s.async=true;
        s.onload=function(){
          if (!window.h5wasm) { reject(new Error("window.h5wasm undefined after CDN UMD")); return; }
          if (window.h5wasm.setWasmPath) {
            window.h5wasm.setWasmPath(H5WASM_CDN_BASE + "/");
            log("h5wasm.setWasmPath("+H5WASM_CDN_BASE+"/)");
          }
          _h5 = window.h5wasm;
          log("h5wasm: loaded UMD from CDN");
          resolve({ns:window.h5wasm, mode:"umd", base:H5WASM_CDN_BASE});
        };
        s.onerror=function(ev){ reject(new Error("CDN UMD load failed ("+(ev&&ev.type||"error")+")")); };
        document.head.appendChild(s);
      });
    });
  }

  function ensureH5Wasm(){
    if (_h5) return Promise.resolve(_h5);
    var chain = Promise.reject(new Error("start"));
    for (var i=0;i<H5WASM_BASES.length;i++){
      (function(b){ chain = chain.catch(function(){ return tryLocalBase(b); }); })(H5WASM_BASES[i]);
    }
    return chain.catch(function(){ return tryCdnUmd(); })
                .then(function(hit){ return hit.ns; })
                .catch(function(e){
                  throw new Error("h5wasm not found locally or via CDN — "+errMsg(e));
                });
  }

  function fetchJson(url, label){
    return fetch(url, {cache:'no-cache'}).then(function(r){
      if (!r.ok) throw new Error(label+" fetch failed: "+r.status+" "+r.statusText+" ("+url+")");
      return r.json();
    });
  }
  function fetchHeadSize(url, label){
    return fetch(url, {method:'HEAD', cache:'no-cache'}).then(function(h){
      if (h.ok) {
        var len = h.headers.get('content-length');
        if (len) return Number(len);
      }
      return fetch(url, {method:'GET', cache:'no-cache'}).then(function(r){
        if (!r.ok) throw new Error(label+" fetch failed: "+r.status+" "+r.statusText+" ("+url+")");
        var len2 = r.headers.get('content-length');
        if (r.body && typeof r.body.cancel==="function") { try{ r.body.cancel(); }catch(_e){} }
        return len2 ? Number(len2) : null;
      });
    });
  }

  function readFileWithProgress(file, onTick){
    var t0 = performance.now();
    var safe = $safe && $safe.checked;
    if (!safe && file.stream && typeof file.stream === "function"){
      var reader = file.stream().getReader();
      var chunks=[], rec=0, lastT=t0, lastB=0;
      function pump(){
        return reader.read().then(function(res){
          if (res.done){
            return new Blob(chunks).arrayBuffer().then(function(buf){
              var avg = (rec/1048576)/((performance.now()-t0)/1000||1);
              if (onTick) onTick(100, avg);
              return new Uint8Array(buf);
            });
          }
          chunks.push(res.value); rec+=res.value.byteLength;
          var now=performance.now(), dt=(now-lastT)/1000, dB=rec-lastB;
          var mbps = dt>0 ? (dB/1048576)/dt : 0;
          if (onTick) onTick(rec/file.size*100, mbps);
          lastT=now; lastB=rec; return pump();
        });
      }
      return pump();
    } else {
      var t1 = performance.now();
      return file.arrayBuffer().then(function(buf){
        var avg = (buf.byteLength/1048576)/((performance.now()-t1)/1000||1);
        var i=1;
        function step(){ if (i>10) return Promise.resolve(); if (onTick) onTick(i*10, avg); i++; return new Promise(function(r){setTimeout(r,5);}).then(step); }
        return step().then(function(){ return new Uint8Array(buf); });
      });
    }
  }

  function readVarNames(h){
    var paths=["var/_index","var/index","var/feature_names"];
    for (var i=0;i<paths.length;i++){
      var ds=h.get(paths[i]);
      if (ds && ds.isDataset){
        var arr = (typeof ds.toArray==="function") ? ds.toArray() : ds.value;
        var out=[], k, x;
        for (k=0;k<arr.length;k++){ x=arr[k]; out.push(typeof x==="string"?x:(x&&x.toString?x.toString():String(x))); }
        return out;
      }
    }
    throw new Error("Cannot find var index");
  }
  function readObsNames(h){
    var paths=["obs/_index","obs/index","obs/names"];
    for (var i=0;i<paths.length;i++){
      var ds=h.get(paths[i]);
      if (ds && ds.isDataset){
        var arr = (typeof ds.toArray==="function") ? ds.toArray() : ds.value;
        var out=[], k, x;
        for (k=0;k<arr.length;k++){ x=arr[k]; out.push(typeof x==="string"?x:(x&&x.toString?x.toString():String(x))); }
        return out;
      }
    }
    var n = readXShape(h)[0]; var names=new Array(n); for (var j=0;j<n;j++) names[j]="cell_"+j; return names;
  }
  function readXShape(h){
    var X=h.get("X");
    if (X && X.isDataset) return X.shape;
    var s=h.get("X/shape") ? h.get("X/shape").value : [0,0];
    return [Number(s[0]), Number(s[1])];
  }
  function pickDense(denseFlat, shape, varNames, genes){
    var n=shape[0], d=shape[1], D=genes.length, out=new Float32Array(n*D);
    var idx={}, i,j;
    for (i=0;i<varNames.length;i++) idx[varNames[i]]=i;
    var map=new Array(D); for (j=0;j<D;j++) map[j]= idx.hasOwnProperty(genes[j]) ? idx[genes[j]] : null;
    for (j=0;j<D;j++){ var cj=map[j]; if (cj===null) continue; var base=0; for (i=0;i<n;i++,base+=d) out[i*D+j]=denseFlat[base+cj]; }
    return out;
  }
  function pickCSR(data, indices, indptr, shape, varNames, genes){
    var n=shape[0], D=genes.length, out=new Float32Array(n*D), i;
    var colPos={}, wanted={};
    for (i=0;i<varNames.length;i++) colPos[varNames[i]]=i;
    for (i=0;i<D;i++){ var cj = colPos.hasOwnProperty(genes[i]) ? colPos[genes[i]] : null; if (cj!==null) wanted[cj]=i; }
    for (var r=0;r<n;r++){ var a=indptr[r], b=indptr[r+1]; for (var k=a;k<b;k++){ var cj2=indices[k]; var j=wanted.hasOwnProperty(cj2)?wanted[cj2]:null; if (j!==null) out[r*D+j]=data[k]; } }
    return out;
  }

  function boot(){
    if (booted) { $log.textContent=""; log("🔁 Rebooting …"); }
    if ($ping) $ping.disabled=false; if ($validate) $validate.disabled=false; if ($load) $load.disabled=false; if ($run) $run.disabled=false;

    $f=document.getElementById('file'); $meta=document.getElementById('meta'); $dl=document.getElementById('download');
    $upBar=document.getElementById('upBar'); $upPct=document.getElementById('upPct'); $upSpd=document.getElementById('upSpd');
    $anBar=document.getElementById('anBar'); $anPct=document.getElementById('anPct'); $batch=document.getElementById('batch'); $safe=document.getElementById('safe');

    function setUp(v){ $upBar.value=v; $upPct.textContent=Math.round(v)+"%"; }
    function setSpd(v){ $upSpd.textContent=(v||0).toFixed(2)+" MB/s"; }
    function setAn(v){ $anBar.value=v; $anPct.textContent=Math.round(v)+"%"; }

    window.addEventListener('error', function(e){ log('Error: '+errMsg(e)); });
    window.addEventListener('unhandledrejection', function(e){ log('Promise Rejection: '+errMsg(e.reason)); });

    rebind('ping', function(){ log('🏓 Ping OK — handlers are attached.'); });

    // ---------- FIXED: use real D (= genes.length) for dummy validation run ----------
    rebind('validate', function(){
      log('▶ Validate clicked');
      var genesLen = 0;
      fetchJson(GENES_URL,'genes.json').then(function(g){
        genesLen = g.length;
        log('OK genes: '+genesLen);
        return fetchJson(CLASSES_URL,'classes.json');
      }).then(function(c){
        log('OK classes: '+c.length);
        return fetchHeadSize(MODEL_URL,'model.onnx');
      }).then(function(bytes){
        log('model.onnx size: '+(bytes?(bytes/1048576).toFixed(2)+' MB':'unknown'));
        return ensureORT();
      }).then(function(ortNs){
        ORT=ortNs;
        if (ORT && ORT.env && ORT.env.wasm){
          ORT.env.wasm.simd = !($safe && $safe.checked);
          ORT.env.wasm.numThreads = ($safe && $safe.checked) ? 1 : Math.min((navigator.hardwareConcurrency||4),8);
          ORT.env.wasm.proxy = !($safe && $safe.checked);
        }
        var eps=(navigator.gpu && !($safe && $safe.checked))?["webgpu","wasm"]:["wasm"];
        log('Creating ONNX session (sanity)…');
        return ORT.InferenceSession.create(MODEL_URL,{executionProviders:eps}).then(function(test){
          // >>> USE CORRECT SHAPE: [1, D]
          var D = genesLen;
          var zeros = new ORT.Tensor('float32', new Float32Array(D), [1, D]);
          var inputs={}; inputs[test.inputNames[0]]=zeros;
          return test.run(inputs).then(function(out){
            var any = out[test.outputNames[0]]; 
            if (!any){ for (var k in out){ if (Object.prototype.hasOwnProperty.call(out,k)){ any=out[k]; break; } }
            }
            log('Dummy inference ok. Output len: '+(any&&any.data?any.data.length:'unknown'));
            log('✅ Assets validate successfully.');
          });
        });
      }).catch(function(e){
        log('🛑 Validate failed: '+errMsg(e));
        log('Hint: open these URLs in a new tab to verify:');
        log(' - '+GENES_URL);
        log(' - '+CLASSES_URL);
        log(' - '+MODEL_URL);
      });
    });

    rebind('load', function(){
      if ($dl) $dl.innerHTML=''; $log.textContent=''; setUp(0); setSpd(0); setAn(0); if ($run) $run.disabled=true;

      ensureH5Wasm().then(function(ns){
        H5=ns;
        return fetchJson(GENES_URL,'genes.json');
      }).then(function(genes){
        window._genes=genes; log('genes: '+genes.length);
        return fetchJson(CLASSES_URL,'classes.json');
      }).then(function(classes){
        window._classes=classes; log('classes: '+classes.length);
        var file = $f && $f.files && $f.files[0];
        if (!file){ log('Pick a .h5ad first.'); throw new Error("no file"); }
        var mb=(file.size/1048576).toFixed(2);
        if ($meta) $meta.textContent="Selected: "+file.name+" ("+mb+" MB) | Model genes: "+window._genes.length+" | Classes: "+window._classes.length;

        return readFileWithProgress(file, function(pct,mbps){ setUp(pct); setSpd(mbps); }).then(function(fileBuf){
          setUp(100);
          return H5.ready.then(function(){
            var hf;
            try { hf=new H5.File(fileBuf,"r"); }
            catch (openErr){ log("If this fails on first visit, the .wasm may be cached/blocked. Try hard refresh (Ctrl/Cmd+Shift+R)."); throw openErr; }
            window._h5=hf;
            var varNames=readVarNames(hf), obsNames=readObsNames(hf), shape=readXShape(hf);
            window._shape=shape; window._varNames=varNames; window._obsNames=obsNames;
            log("Cells: "+shape[0]+" | Genes(file): "+shape[1]);
            var vset={}, i, missing=0;
            for (i=0;i<varNames.length;i++) vset[varNames[i]]=true;
            for (i=0;i<window._genes.length;i++) if (!vset[window._genes[i]]) missing++;
            log("Missing vs model: "+missing);
            if ($run) $run.disabled=false;
          });
        });
      }).catch(function(e){
        if (String(e)==="Error: no file") return;
        log('🛑 Load failed: '+errMsg(e)); console.error(e);
      });
    });

    rebind('run', function(){
      function setAn(v){ $anBar.value=v; $anPct.textContent=Math.round(v)+"%"; }
      setAn(0);
      ensureORT().then(function(ortNs){
        ORT=ortNs;
        if (ORT && ORT.env && ORT.env.wasm){
          ORT.env.wasm.simd = !($safe && $safe.checked);
          ORT.env.wasm.numThreads = ($safe && $safe.checked) ? 1 : Math.min((navigator.hardwareConcurrency||4),8);
          ORT.env.wasm.proxy = !($safe && $safe.checked);
        }

        var h5=window._h5, genes=window._genes, classes=window._classes, shape=window._shape, varNames=window._varNames, obsNames=window._obsNames;
        if (!h5 || !genes || !classes || !shape) throw new Error("Load a file first.");

        var X=h5.get("X");
        var n=shape[0], D=genes.length, C=classes.length, feats;
        if (X && X.isDataset){
          var arr=X.value; var denseF32=(arr instanceof Float32Array)?arr:new Float32Array(arr);
          feats=pickDense(denseF32, shape, varNames, genes);
        } else {
          var data=X.get('data').value, indices=X.get('indices').value, indptr=X.get('indptr').value;
          var dataF32=(data instanceof Float32Array)?data:new Float32Array(data);
          var idxI32=(indices instanceof Int32Array)?indices:new Int32Array(indices);
          var ptrI32=(indptr instanceof Int32Array)?indptr:new Int32Array(indptr);
          feats=pickCSR(dataF32, idxI32, ptrI32, shape, varNames, genes);
        }
        setAn(30);

        var eps=(navigator.gpu && !($safe && $safe.checked))?["webgpu","wasm"]:["wasm"];
        return ORT.InferenceSession.create(MODEL_URL,{executionProviders:eps}).then(function(session){
          setAn(40);
          var batchVal=Number($batch && $batch.value); var Nbatch=(batchVal && batchVal>=2000)?batchVal:8000;
          var probs=new Float32Array(n*C), start=0;

          function step(){
            if (start>=n) return Promise.resolve();
            var end=Math.min(n, start+Nbatch);
            var view=feats.subarray(start*D, end*D);
            var t=new ORT.Tensor('float32', view, [end-start, D]);
            var inputs={}; inputs[session.inputNames[0]]=t;

            return session.run(inputs).then(function(out){
              var part=null, i,j;
              if (out.probabilities) {
                part = out.probabilities.data;
              } else if (out.logits) {
                part = new Float32Array((end-start)*C);
                for (i=0;i<end-start;i++){
                  var mx=-1e30;
                  for (j=0;j<C;j++){ var v=out.logits.data[i*C+j]; if (v>mx) mx=v; }
                  var s=0;
                  for (j=0;j<C;j++){ var e=Math.exp(out.logits.data[i*C+j]-mx); part[i*C+j]=e; s+=e; }
                  for (j=0;j<C;j++){ part[i*C+j]/=s; }
                }
              } else { throw new Error("ONNX outputs missing probabilities/logits"); }
              probs.set(part, start*C);
              setAn(40+50*(end/n));
              start=end;
              return new Promise(function(r){ setTimeout(r,0); }).then(step);
            });
          }

          return step().then(function(){
            var header=["cell_id","Level1|predicted_labels","Level1|conf_score","Level1|cert_score"];
            var lines=new Array(n+1); lines[0]=header.join(",");
            for (var i=0;i<n;i++){
              var best=-1,bj=-1,sum=0,base=i*C,j;
              for (j=0;j<C;j++){ var pv=probs[base+j]; sum+=pv; if (pv>best){best=pv; bj=j;} }
              lines[i+1]=[obsNames[i], classes[bj], String(best), String(best/(sum||1))].join(",");
            }
            var csv=lines.join("\n");
            var blob=new Blob([csv],{type:"text/csv"});
            var url=URL.createObjectURL(blob);
            var a=document.createElement('a'); a.href=url; a.download='pred.csv';
            $dl.innerHTML=''; $dl.appendChild(a); a.click(); URL.revokeObjectURL(url);
            setAn(100); log('✅ Done.');
          });
        });
      }).catch(function(e){
        log('🛑 Run failed: '+errMsg(e)); console.error(e);
      });
    });

    log("✅ Boot complete.");
    log("UA: "+navigator.userAgent);
    log("WebGPU: "+ (!!navigator.gpu));
    log("Cores: "+ (navigator.hardwareConcurrency || 'n/a'));
    booted = true;
  }

  $boot.addEventListener('click', function(){ try{ boot(); }catch(e){ log('🛑 Boot failed: '+errMsg(e)); console.error(e); } });
})();
