#!/usr/bin/env python3
"""Install immutable master assets in local demo. Verify each byte with master lock."""
import argparse, concurrent.futures, hashlib, json, pathlib, time, urllib.request
def download(base,relative,sha256):
    url=base+relative
    err=None
    for attempt in range(4):
        try:
            req=urllib.request.Request(url,headers={"User-Agent":"ProjectGenesis-immutable-mirror/1.0"})
            with urllib.request.urlopen(req,timeout=90) as r:
                if r.status!=200: raise ValueError("HTTP "+str(r.status))
                b=r.read(80*1024*1024)
            if hashlib.sha256(b).hexdigest()!=sha256:
                raise ValueError("SHA256 mismatch for "+relative)
            return relative,b
        except Exception as e:
            err=e;time.sleep(2*(attempt+1))
    raise RuntimeError(f"{relative}: {err}")
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--lock",required=True)
    p.add_argument("--root",required=True)
    p.add_argument("--master-sha",required=True)
    a=p.parse_args()
    if len(a.master_sha)!=40 or not all(c in "0123456789abcdef" for c in a.master_sha):
        raise ValueError("Pin assets to immutable 40-digit master commit")
    lock=json.loads(pathlib.Path(a.lock).read_text(encoding="utf-8"))
    if not lock.get("complete") or lock.get("failures"):raise RuntimeError("Master is not complete")
    base=f"https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/{a.master_sha}/public/playcanvas-runtime/externals/"
    files={rel:info["sha256"] for a in lock["assets"] for rel,info in a["files"].items()}
    root=pathlib.Path(a.root).resolve()
    def task(kv):
        relative,digest=kv;dest=root/relative
        if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest()==digest:return relative,None
        return download(base,relative,digest)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for i,(rel,body) in enumerate(pool.map(task,files.items()),1):
            if body is not None:
                dest=root/rel
                dest.parent.mkdir(parents=True,exist_ok=True)
                dest.write_bytes(body)
            print(f"VERIFY {i}/{len(files)} {rel}",flush=True)
    print(f"All {len(files)} immutable files verified from master {a.master_sha}",flush=True)
if __name__=="__main__":main()
