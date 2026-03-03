const fs = require('fs');
const file = 'app/(tabs)/index.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update standard maxWidth from 900 to 1200
if (content.includes('maxWidth: 900')) {
  content = content.replace('maxWidth: 900', 'maxWidth: 1200');
  console.log("Updated standard maxWidth to 1200.");
}

// Update the webScrollContent maxWidth from 1180 to 1200
if (content.includes('maxWidth: 1180')) {
  content = content.replace('maxWidth: 1180', 'maxWidth: 1200');
  console.log("Updated webScrollContent maxWidth to 1200.");
}

fs.writeFileSync(file, content);
