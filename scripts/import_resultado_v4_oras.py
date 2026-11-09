#!/usr/bin/env python3
"""Import approved Result V4 ORA PNGs from the user's original test package.

No image is recolored/resized/generated. Explicit hashes prevent substitutions.
Only modifies assets/ui/resultado/oras within the checked-out experiment branch.
Usage: python scripts/import_resultado_v4_oras.py /path/to/Genesis_Juego_V014029_Resultado_Dinamico_ORA_8_Prueba.zip
"""
from pathlib import Path
import hashlib, sys, zipfile
EXPECTED={
"01_Base.png":"c3d5194118a7ed971f1426214ada2a26c84e5a20c8dcc048cf378920fec50b8f",
"02_Luz.png":"7b845119482d33b725b8905f30fa0467b9fd69e3eaf8bdbd2d5cbf08fcecf715",
"03_Sombra.png":"fc02b2719f20ab253d20762c0fb9f05bc08adeb9d774491bd3a32b04da6260da",
"04_Fuego.png":"1ab3b281965981d6fdd82b374ddb159f7c6d9b1c0fc0bb1364bb8a8810dff35e",
"05_Hielo.png":"b02f36ab9f7e13bad61688dce332e279dfab90c1b3d34dd9e59beedcf3475829",
"06_Naturaleza.png":"e9985f170b36bcd658cc5bcbba7b3f57c43aabf51a3d3993d49194ade1b61e33",
"07_Tierra.png":"79bb921ecab2a03149fdd26062372a9fe0567d56aafdad7aea4eae948da09513",
"08_Rayo.png":"a397ed2ab6b355ea2aca8478a92677253879d9871dc733ac1874e472f4cbf978",
}
def main(argv):
    if len(argv)!=2: raise SystemExit("Uso: python scripts/import_resultado_v4_oras.py ARCHIVO.zip")
    archive=Path(argv[1])
    target=Path(__file__).resolve().parent.parent/"assets/ui/resultado/oras"
    with zipfile.ZipFile(archive) as z:
        files={}
        for filename,sha in EXPECTED.items():
            name="assets/ui/resultado/oras/"+filename
            raw=z.read(name)
            actual=hashlib.sha256(raw).hexdigest()
            if actual!=sha:raise SystemExit(f"ORA no aprobada o corrupta: {filename} ({actual})")
            files[filename]=raw
    target.mkdir(parents=True,exist_ok=True)
    for name,raw in files.items():
        path=target/name
        if path.exists() and path.read_bytes()!=raw:raise SystemExit(f"No sobrescribir master diferente: {path}")
        path.write_bytes(raw)
        print(f"OK {name}: {len(raw)} bytes, SHA-256 {EXPECTED[name]}")
    print("Ocho ORA verificadas. Integrar sólo tras QA visual y autorización; no modificar main automáticamente.")
if __name__=="__main__":main(sys.argv)
