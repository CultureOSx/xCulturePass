const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'culturepass-b5f96' });
const db = admin.firestore();
async function run() {
  const eventsSnap = await db.collection('events').get();
  let batch = db.batch();
  let count = 0;
  eventsSnap.forEach(doc => {
    if (!doc.data().status) {
      batch.update(doc.ref, { status: 'published' });
      count++;
    }
  });
  if (count > 0) await batch.commit();
  console.log('Fixed status for', count, 'events');
}
run().catch(console.error);
