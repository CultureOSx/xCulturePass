const fs = require('fs');
const content = fs.readFileSync('src/data/AllCouncilsList.csv', 'utf-8');
const lines = content.split('\n').filter(l => l.length > 5 && !l.includes(',GM_SAL') && !l.startsWith('Table'));
console.log('Councils found:', lines.length);
