import test from 'node:test';
import assert from 'node:assert/strict';
import { handleEvidence, summarizeSubmissions } from './connectors.mjs';

test('Codeforces topics count accepted distinct problems once, including repeats across submissions', () => {
  const problem = {contestId:1,index:'A',tags:['dp','dp','graphs']};
  const entries = [
    {verdict:'OK',problem},{verdict:'OK',problem},{verdict:'WRONG_ANSWER',problem:{...problem,index:'B'}},
    {verdict:'OK',problem:{...problem,index:'C',tags:['graphs']}},
  ];
  assert.deepEqual(summarizeSubmissions(entries),{solved:2,topics:[['graphs',2],['dp',1]]});
});

test('evidence snapshot changes require the same-origin request header', async () => {
  const reports = [];
  const request = headers => ({method:'POST',headers,url:'/api/evidence/github/disconnect'});
  const response = {writeHead:status => reports.push(status),end:()=>{},appendHeader:()=>{}};
  await handleEvidence(request({}),response,'/api/evidence/github/disconnect');
  await handleEvidence(request({'x-place-evidence':'1','sec-fetch-site':'cross-site'}),response,'/api/evidence/github/disconnect');
  await handleEvidence(request({'x-place-evidence':'1','sec-fetch-site':'same-origin'}),response,'/api/evidence/github/disconnect');
  assert.deepEqual(reports,[404,404,200]);
});
