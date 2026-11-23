import { build } from 'esbuild';
import { cp,mkdir } from 'node:fs/promises';

await mkdir('generated/monaco',{recursive:true});
await cp('node_modules/monaco-editor/min/vs','generated/monaco/vs',{recursive:true});
await build({
  entryPoints:{arena:'arena/src.jsx',pipeline:'arena/pipeline.js'},bundle:true,format:'esm',target:['es2022'],splitting:true,
  entryNames:'[name]',chunkNames:'chunks/[name]-[hash]',assetNames:'fonts/[name]-[hash]',
  outdir:'generated',minify:true,jsx:'automatic',loader:{'.woff2':'file','.woff':'file'},
  define:{'process.env.NODE_ENV':'"production"'},
});
