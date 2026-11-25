export const companies = [
  { id:'google', name:'Google', type:'Product', careers:'https://www.google.com/about/careers/applications/jobs/results/' },
  { id:'microsoft', name:'Microsoft', type:'Product', careers:'https://careers.microsoft.com/' },
  { id:'razorpay', name:'Razorpay', type:'Startup / scale-up', careers:'https://razorpay.com/careers/', board:'razorpaysoftwareprivatelimited' },
  { id:'infosys', name:'Infosys', type:'IT services', careers:'https://www.infosys.com/careers/' },
  { id:'gitlab', name:'GitLab', type:'Product', careers:'https://about.gitlab.com/jobs/', board:'gitlab' },
];

export const disciplines = [
  { id:'software', label:'Software engineering', pattern:/software|developer|full.?stack|front.?end|back.?end|application engineer/i, skills:['arrays','projects','oop','networks','sql'] },
  { id:'data', label:'Data & AI', pattern:/\bdata\b|machine learning|\bAI\b|analytics/i, skills:['sql','arrays','projects','oop'] },
  { id:'cloud', label:'Cloud & infrastructure', pattern:/cloud|platform|devops|infrastructure|site reliability/i, skills:['networks','projects','arrays','sql'] },
  { id:'security', label:'Cybersecurity', pattern:/security|privacy/i, skills:['networks','projects','oop','sql'] },
  { id:'quality', label:'Quality engineering', pattern:/\bQA\b|quality|test engineer|\bSDET\b/i, skills:['tests','projects','arrays','sql'] },
];

export const topics = ['DSA','Projects','Networks','DBMS','OOP'];

export const skills = {
  arrays:{ label:'Arrays & hash maps', topic:'DSA', minutes:45, match:/hash ?map|hash table|unordered_map|frequency count|\barrays?\b/i, task:'Trace an array boundary and count frequencies', lesson:'A hash map keeps one count per distinct key. Walk through [2, 2, 7] and show how the counts change after each item.', finish:'Solve the array repair, then write a frequency counter and explain the expected time and space cost.', href:'/learn?lesson=arrays', resource:'Open the array lesson', practice:'/arena/problems/decode-last-reading?lesson=arrays' },
  projects:{ label:'Project demonstration', topic:'Projects', minutes:60, match:/\bprojects?\b|github\.com|deployed|prototype|demo/i, task:'Make one project easy to review', lesson:'Start with a project you can run locally. In the README, describe the problem, your contribution, and the commands to reproduce a result.', finish:'Record a short walkthrough or add a demo link and one reproducible example.', href:'/profile#skills', resource:'Open Skill Passport' },
  networks:{ label:'Networking fundamentals', topic:'Networks', minutes:35, match:/\b(?:HTTP|TCP|DNS|TLS)\b|networking/i, task:'Trace a request from DNS to HTTP', lesson:'DNS resolves the hostname. A connection carries the request, and HTTPS uses TLS to protect it. Trace what changes when the hostname cannot resolve.', finish:'Explain how a DNS failure differs from a server returning HTTP 404.', href:'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview', resource:'Read the HTTP guide' },
  sql:{ label:'SQL & relational databases', topic:'DBMS', minutes:45, match:/\bSQL\b|postgresql|mysql|\bJOIN\b|relational database/i, task:'Write a JOIN and inspect its query plan', lesson:'Create students and submissions tables. Join them on the student ID, then add an index and compare query plans on a larger dataset.', finish:'Save the query and explain what the plan says about the index.', href:'https://www.postgresql.org/docs/current/tutorial-join.html', resource:'Read the joins guide' },
  oop:{ label:'Object-oriented programming', topic:'OOP', minutes:40, match:/\bOOP\b|encapsulation|polymorphism|object.oriented/i, task:'Protect the state of a C++ class', lesson:'Move score updates behind a method that validates the input. Let callers read the current score through a const method.', finish:'Demonstrate that valid inputs update the class and invalid inputs leave it unchanged.', href:'https://en.cppreference.com/w/cpp/language/classes.html', resource:'Read the C++ class reference' },
  tests:{ label:'Automated testing', topic:'Projects', minutes:45, match:/unit tests?|automated tests?|integration tests?|pytest|junit/i, task:'Write three tests for a project feature', lesson:'Choose one feature and check its usual input, a boundary input, and invalid input. Write the expected result before running each test.', finish:'Share the test cases and the command that runs them.', href:'/learn?lesson=debugging', resource:'Open the debugging lesson' },
};

export const examples = [
  ['google','internship','software','Software Engineering Intern'],
  ['google','job','security','Security Engineer'],
  ['microsoft','job','cloud','Cloud Software Engineer'],
  ['microsoft','internship','data','Data Science Intern'],
  ['razorpay','job','software','Backend Engineer'],
  ['razorpay','internship','quality','Quality Engineering Intern'],
  ['infosys','job','quality','Test Automation Engineer'],
  ['infosys','internship','software','Software Development Intern'],
  ['gitlab','job','cloud','Infrastructure Engineer'],
].map(([company,type,discipline,title]) => ({ id:`example-${company}-${type}`, company,type,discipline,title,source:'example' }));

export function postingSkills(role) {
  return Object.keys(skills).filter(key => skills[key].match.test(role.requirements ?? ''));
}

export function roleSkills(role) {
  const mentioned = postingSkills(role);
  return mentioned.length ? mentioned : disciplines.find(item => item.id === role.discipline)?.skills ?? disciplines[0].skills;
}

export function fitFor(role, evidence = {}, resume = '') {
  const rows = roleSkills(role).map(key => {
    const claim = evidence[key];
    const mention = resume.split(/\r?\n/).find(line => skills[key].match.test(line))?.trim().slice(0,200);
    return { key, label:skills[key].label, status:claim === 'added' ? 'Evidence added'
      : claim === 'practice' ? 'Needs practice' : mention ? 'Résumé mention' : 'Add evidence', mention };
  });
  return {rows, score:Math.round(100 * rows.filter(row => row.status === 'Evidence added').length / rows.length)};
}

export function recommendedPlan(role, evidence, minutes) {
  const preferred = roleSkills(role);
  const scored = preferred.slice().sort((a,b) => (evidence[b] === 'practice') - (evidence[a] === 'practice'));
  let available = minutes;
  const scheduled = [];
  for (const key of scored) {
    if (evidence[key] === 'added' || skills[key].minutes > available) continue;
    scheduled.push(key);
    available -= skills[key].minutes;
  }
  return scheduled;
}
