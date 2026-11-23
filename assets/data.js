export const branches = {
  CSE: {
    track: 'Software engineering',
    roles: ['Software engineer', 'Backend developer', 'Data analyst'],
    skills: ['Programming fundamentals', 'Git and GitHub', 'Data structures', 'SQL', 'APIs', 'Technical interviews'],
    project: 'Build and deploy a student results API with tests and a clear README.',
  },
  ECE: {
    track: 'Electronics and communication',
    roles: ['Embedded systems intern', 'Electronics design trainee'],
    skills: ['Circuit theory', 'Digital logic', 'C programming', 'Microcontrollers', 'Signals', 'Lab documentation'],
    project: 'Prototype a temperature logger and document measurements and circuit design.',
  },
  EEE: {
    track: 'Electrical engineering',
    roles: ['Electrical design trainee', 'Controls intern'],
    skills: ['Circuit analysis', 'Electrical machines', 'Power systems', 'Control systems', 'Simulation', 'Lab documentation'],
    project: 'Simulate a motor control circuit and compare expected and observed responses.',
  },
  Mechanical: {
    track: 'Mechanical engineering',
    roles: ['Mechanical design intern', 'Manufacturing trainee'],
    skills: ['Engineering drawing', 'CAD', 'Mechanics', 'Manufacturing', 'Simulation', 'Technical documentation'],
    project: 'Model a bracket in CAD and document its load assumptions and design revisions.',
  },
  Civil: {
    track: 'Civil engineering',
    roles: ['Site engineering intern', 'Structural design trainee'],
    skills: ['Engineering drawing', 'Surveying', 'Structural basics', 'CAD', 'Estimation', 'Technical documentation'],
    project: 'Draft a site plan and prepare a quantity estimate with documented assumptions.',
  },
};

export const challenges = [
  { id:'complexity', branch:'CSE', type:'Technical MCQ', title:'Find the time complexity', prompt:'A loop halves n each time until it reaches 1. What is its time complexity?', choices:['O(1)','O(log n)','O(n)','O(n²)'], answer:'O(log n)', reason:'Each iteration cuts the remaining work in half. After k iterations, n has become n / 2ᵏ.' },
  { id:'arrays', branch:'CSE', type:'Coding', title:'Second-largest distinct value', prompt:'Find the second-largest distinct value in [8, 8, 4, 9, 9, 7]. Enter the output. Try writing a one-pass solution in C++ first.', answer:'8', reason:'The largest distinct value is 9 and the next largest is 8. In one pass, track the best two distinct values.' },
  { id:'bounds', branch:'CSE', type:'Debugging', title:'Fix an array boundary', prompt:'A loop reads a[i] using i <= n. Which condition keeps it inside an array of length n?', choices:['i <= n','i < n','i < n - 1','i == n'], answer:'i < n', reason:'Indexing starts at zero, so n − 1 is the final valid index.' },
  { id:'sql', branch:'CSE', type:'Practical', title:'Group SQL results', prompt:'Which SQL clause groups rows by department so you can count students per department?', answer:'GROUP BY', reason:'Use GROUP BY department with COUNT(*) to return one row for each department.' },
  { id:'logic', branch:'ECE', type:'Theory', title:'Read an AND gate', prompt:'What is the output of an AND gate with inputs 1 and 0?', choices:['0','1'], answer:'0', reason:'An AND gate outputs 1 only when both inputs are 1.' },
  { id:'ohm', branch:'EEE', type:'Theory', title:'Apply Ohm’s law', prompt:'A 6 Ω resistor has 12 V across it. What is the current in amps? Enter a number.', answer:'2', reason:'Use I = V/R, so 12/6 = 2 A.' },
  { id:'stress', branch:'Mechanical', type:'Theory', title:'Calculate normal stress', prompt:'What is normal stress equal to?', choices:['Force × area','Force ÷ area','Area ÷ force'], answer:'Force ÷ area', reason:'Normal stress is the force perpendicular to a cross-section divided by its area.' },
  { id:'concrete', branch:'Civil', type:'Theory', title:'Understand reinforced concrete', prompt:'Which component primarily carries tensile force in a typical reinforced concrete beam?', choices:['Reinforcing steel','Cement paste','Coarse aggregate'], answer:'Reinforcing steel', reason:'Steel reinforcement provides tensile resistance, while concrete is strong in compression.' },
];

export const starterListings = [
  { id:'dsa', category:'Notes', branch:'CSE', title:'DSA pattern notebook', description:'Annotated solutions for arrays, strings and binary search.', price:149 },
  { id:'api', category:'Projects', branch:'CSE', title:'FastAPI starter kit', description:'A small API project with tests, a database and a deployment guide.', price:249 },
  { id:'resume', category:'Templates', branch:'All branches', title:'Placement résumé template', description:'An editable one-page layout with room for evidence links.', price:99 },
  { id:'circuits', category:'Resources', branch:'ECE', title:'Digital logic lab pack', description:'Truth tables, gate worksheets and lab revision prompts.', price:129 },
  { id:'review', category:'Services', branch:'All branches', title:'Peer portfolio review', description:'Get structured feedback on a project write-up or portfolio page.', price:199 },
  { id:'cad', category:'Resources', branch:'Mechanical', title:'CAD drawing practice set', description:'Dimensioned parts and practice exercises for your first portfolio.', price:119 },
];

export const demoSkills = [['Python',84],['FastAPI',76],['SQL',72],['Flutter',64]];

export const platforms = {
  GitHub: ['github.com','www.github.com'],
  LinkedIn: ['linkedin.com','www.linkedin.com'],
  LeetCode: ['leetcode.com','www.leetcode.com'],
  HackerRank: ['hackerrank.com','www.hackerrank.com'],
  Codeforces: ['codeforces.com','www.codeforces.com'],
};

export const evidenceTypes = ['Education','Major project','Minor project','Résumé','Certificate','Hackathon','Internship','Research paper','Portfolio','External profile'];

export const demoEvidence = [
  { id:'demo-python', title:'Python practice portfolio', type:'Assessment', source:'Internal', detail:'180 coding problems · 14 mini projects · 4 major projects · 2 assessments · 91% average.', skill:'Python', status:'Sample', date:'2026-11-20' },
  { id:'demo-sql', title:'SQL query assessment', type:'Assessment', source:'Internal', detail:'120 problems · 45 JOIN queries · 30 GROUP BY queries · 15 window function exercises · 88% score.', skill:'SQL', status:'Sample', date:'2026-11-13' },
  { id:'demo-git', title:'GitHub activity snapshot', type:'External profile', source:'External', detail:'160 commits · 28 repositories · 14 pull requests.', skill:'GitHub', status:'Sample', date:'2026-11-18' },
  { id:'demo-leet', title:'LeetCode problem history', type:'External profile', source:'External', detail:'425 problems · 160 easy · 220 medium · 45 hard.', skill:'DSA', status:'Sample', date:'2026-11-16' },
];
