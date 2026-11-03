from pathlib import Path
import re
s=Path('index.html').read_text()
lines=s.splitlines()
out=[]
for n,line in enumerate(lines,1):
 if 210<=n<=355 or 650<=n<=715 or 1000<=n<=1055 or 1805<=n<=1837:
  out.append(f'{n}: {line[:600]}')
Path('tools/lite_boot_markup_scan.txt').write_text('\n'.join(out),encoding='utf-8')
