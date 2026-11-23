import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
for (const file of readdirSync('.',{recursive:true})) {
  if (/^(node_modules|generated|\.git)(\/|$)/.test(file)) continue;
  if (/\.(mjs|js)$/.test(file)) execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
}
