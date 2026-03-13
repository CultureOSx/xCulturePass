const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'culturepass-b5f96' });
const db = admin.firestore();

async function run() {
  try {
    let q = db.collection('events').where('status', '==', 'published').orderBy('date', 'asc');
    const snap = await q.get();
    console.log('Query success! Docs found:', snap.size);
  } catch (err) {
    console.error('QUERY FAILED:', err.message);
  }
}
run().catch(console.error);
