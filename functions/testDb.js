const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'culturepass-b5f96' });
const db = admin.firestore();
async function run() {
  const events = await db.collection('events').limit(5).get();
  console.log("Found events:", events.size);
  events.forEach(d => console.log(d.id, d.data().title));
}
run().catch(console.error);
