const admin = require('firebase-admin');
const fs = require('fs');

const projectId = 'culturepass-b5f96'; // Extracted from deployment logs
admin.initializeApp({ projectId });

const db = admin.firestore();

async function run() {
  const content = fs.readFileSync(__dirname + '/../src/data/AllCouncilsList.csv', 'utf8');
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 5 && !l.includes(',GM_SAL') && !l.startsWith('Table'));
  
  let batch = db.batch();
  let count = 0;
  
  for (const line of lines) {
    const parts = line.split(',');
    const profile = {
      entityType: 'council',
      name: parts[1] || 'Unknown Council',
      description: `Australian Municipal Council.`,
      website: parts[24] || '',
      email: parts[23] || '',
      phone: parts[12] || '',
      city: parts[9] || 'Unknown',
      state: parts[10] || 'Unknown',
      country: 'Australia',
      ownerId: 'system',
      verified: true,
      population: parseInt(parts[26]) || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    batch.set(db.collection('profiles').doc(), profile);
    count++;
    
    if (count === 400) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  
  if (count > 0) {
    await batch.commit();
  }
  
  console.log(`Successfully uploaded ${lines.length} councils to LIVE Firestore!`);
}

run().catch(console.error);
