import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ignored = new Set(['node_modules','generated','.git']);

function check(root) {
  for (const entry of readdirSync(root,{withFileTypes:true})) {
    const path = join(root,entry.name);
    if (entry.isDirectory() && !ignored.has(entry.name)) check(path);
    if (entry.isFile() && /\.(mjs|js)$/.test(entry.name)) {
      execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
    }
  }
}

check('.');
