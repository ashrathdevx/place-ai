import { bank } from './problems.mjs';
import { getProblemDecoding } from './problem-decoding.mjs';

export const catalogBySlug = new Map(bank.map(problem => [problem.slug,problem]));

export function publicSummary(problem) {
  const { slug,title,difficulty,topics,kind = 'practice' } = problem;
  return { slug,title,difficulty,topics,kind,time_limit_ms:2000,memory_limit_mb:256 };
}

export function publicProblem(problem, { contest = false, editorial = false } = {}) {
  const summary = publicSummary(problem);
  const sample = problem.cases.filter(([, , explanation], index) => ordinalIsSample(index,explanation));
  return {
    ...summary,
    statement_md:problem.statement,
    samples:sample.map(([input,output,explanation]) => ({input,output,explanation})),
    ...(problem.starter && { starter:problem.starter, editorial_locked:!editorial }),
    ...(!contest && (!problem.starter || editorial) && { editorial_md:problem.editorial }),
    ...(!contest && !problem.starter && { decoding:getProblemDecoding(problem.slug,problem.difficulty) }),
  };
}

export function ordinalIsSample(index, explanation) {
  return index === 0 || Boolean(explanation);
}

export function fallbackCatalog(path, query) {
  if (path === '/api/problems') return bank.map(problem => ({...publicSummary(problem),solved:null}));
  const slug = path.match(/^\/api\/problems\/([a-z0-9-]+)$/)?.[1];
  if (!slug) return undefined;
  const problem = catalogBySlug.get(slug);
  return problem ? {...publicProblem(problem,{contest:query.has('contest')}),offline:true} : null;
}
