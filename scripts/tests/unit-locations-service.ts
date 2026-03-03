import assert from 'node:assert/strict';
import { db } from '../../functions/src/admin';
import { locationsService } from '../../functions/src/services/locations';

async function runTests() {
  console.log('Testing locationsService cache invalidation...');

  let dbGetCount = 0;
  let dbSetCount = 0;
  let txGetCount = 0;

  const originalCollection = db.collection.bind(db);
  const originalRunTransaction = db.runTransaction.bind(db);

  const fakeDocData = {
    name: 'Australia',
    countryCode: 'AU',
    acknowledgement: 'Ack',
    states: [
      {
        name: 'New South Wales',
        code: 'NSW',
        emoji: 'E',
        cities: ['Sydney', 'Newcastle']
      }
    ],
    updatedAt: new Date().toISOString()
  };

  const fakeDocRef = {
    get: async () => {
      dbGetCount++;
      return {
        exists: true,
        data: () => ({ ...fakeDocData })
      };
    },
    set: async (data: any) => {
        // mock doc.set if needed
    }
  };

  const fakeCol = {
    doc: (id: string) => fakeDocRef
  };

  // Mock db.collection
  db.collection = (name: string) => {
    if (name === 'locations') return fakeCol as any;
    return originalCollection(name);
  };

  // Mock db.runTransaction
  db.runTransaction = async (callback: any) => {
    const fakeTx = {
      get: async (ref: any) => {
          txGetCount++;
          return ref.get();
      },
      set: (ref: any, data: any) => {
          dbSetCount++;
      }
    };
    await callback(fakeTx);
  };

  try {
    // 1. Initial get (Populates cache)
    dbGetCount = 0;
    await locationsService.get('AU');
    assert.equal(dbGetCount, 1, 'First get should hit DB');

    // 2. Second get (Cache hit)
    const prevDbGetCount = dbGetCount;
    await locationsService.get('AU');
    assert.equal(dbGetCount, prevDbGetCount, 'Second get should hit cache, DB get count remains same');

    // 3. removeCity
    await locationsService.removeCity('AU', 'NSW', 'Sydney');
    assert.equal(dbSetCount, 1, 'removeCity should write to DB');

    // Note: removeCity's transaction calls tx.get(), which internally calls our fake ref.get(),
    // so dbGetCount goes up by 1.
    const getCountAfterRemoveCity = dbGetCount; // this will be 2

    // 4. Third get (Cache should be invalidated, hits DB again)
    await locationsService.get('AU');
    assert.equal(dbGetCount, getCountAfterRemoveCity + 1, 'Third get should hit DB because cache was invalidated by removeCity');

    // 5. Fourth get (Cache hit)
    const countAfterThirdGet = dbGetCount;
    await locationsService.get('AU');
    assert.equal(dbGetCount, countAfterThirdGet, 'Fourth get should hit cache');

    // 6. addCity
    await locationsService.addCity('AU', 'NSW', 'Wollongong');
    assert.equal(dbSetCount, 2, 'addCity should write to DB');

    const getCountAfterAddCity = dbGetCount;

    // 7. Fifth get (Cache should be invalidated, hits DB)
    await locationsService.get('AU');
    assert.equal(dbGetCount, getCountAfterAddCity + 1, 'Fifth get should hit DB because cache was invalidated by addCity');

    console.log('✅ locationsService cache invalidation checks passed!');
  } finally {
    // Restore db methods
    db.collection = originalCollection;
    db.runTransaction = originalRunTransaction;
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
