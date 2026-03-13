const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'culturepass-b5f96' });
const db = admin.firestore();

async function run() {
  const eventsSnap = await db.collection('events').limit(5).get();
  console.log("All events count:", eventsSnap.size);
  eventsSnap.forEach(d => console.log('All -', d.id, d.data().status, d.data().title, d.data().city));

  const eventsPublishedSnap = await db.collection('events').where('status', '==', 'published').limit(5).get();
  console.log("Published events count:", eventsPublishedSnap.size);
  eventsPublishedSnap.forEach(d => console.log('Published -', d.id, d.data().status, d.data().title, d.data().city));
}
run().catch(console.error);
