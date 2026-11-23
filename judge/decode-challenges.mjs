import { easy, medium } from './decode-foundations.mjs';
import { nativePrograms } from './decode-native.mjs';
import { hard } from './decode-advanced.mjs';

const program = body => `import sys

def solve(a):
${body.trim().split('\n').map(line => '    '+line).join('\n')}

if __name__ == "__main__":
    values = list(map(int, sys.stdin.buffer.read().split()))
    print(solve(values))
`;

function challenge(difficulty, [slug,title,topic,goal,input,limits,body,correct,buggy,cases,note,verify,cost]) {
  if (!body.includes(correct) || body.indexOf(correct) !== body.lastIndexOf(correct)) throw new Error('Ambiguous bug in '+slug);
  return {
    slug:'decode-'+slug,title,difficulty,topics:[topic],kind:'decode',
    statement:`${goal}\n\n## Input\n\n${input}\n\n## Output\n\nPrint one integer.\n\n## Constraints\n\n${limits}`,
    starter:program(body.replace(correct,buggy)),
    reference:program(body),
    programs:{...nativePrograms(slug),python:{starter:program(body.replace(correct,buggy)),reference:program(body)}},
    editorial:`## Why the code fails\n\n${note}\n\n## How to verify the fix\n\n${verify}\n\n## Complexity\n\n${cost}`,
    cases:cases.map(([values,expected,description]) => [values+'\n',expected+'\n',description]),
  };
}
export const decodeChallenges = Object.entries({Easy:easy,Medium:medium,Hard:hard})
  .flatMap(([difficulty, items]) => items.map(item => challenge(difficulty,item)));
