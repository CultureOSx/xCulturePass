import assert from 'node:assert/strict';
import { db } from '../../functions/src/admin';
import { locationsService } from '../../functions/src/services/locations';

// ---------------------------------------------------------------------------
// Mock Firestore Setup
// ---------------------------------------------------------------------------

let transactionCallback: any;
let getRefMock: any;
let setRefMock: any;
let docExists: boolean = true;
let docData: any = {};

db.runTransaction = async (callback: any) => {
  transactionCallback = callback;
  const tx = {
    get: async (ref: any) => {
      getRefMock = ref;
      return {
        exists: docExists,
        data: () => docData,
      };
    },
    set: (ref: any, data: any) => {
      setRefMock = { ref, data };
    },
  };
  return await callback(tx);
};

// Also mock collection just in case locationsCol() needs it to get a ref
// The implementation does: locationsCol().doc(countryCode)
const mockDocRef = { id: 'mock-doc' };
(db as any).collection = (colName: string) => {
  return {
    doc: (docId: string) => {
      return mockDocRef;
    }
  };
};

// ---------------------------------------------------------------------------
// Tests for addCity
// ---------------------------------------------------------------------------

async function runTests() {
  console.log('Running unit tests for locationsService.addCity...');

  // Test 1: Country not found
  docExists = false;
  try {
    await locationsService.addCity('US', 'CA', 'Los Angeles');
    assert.fail('Should have thrown Country not found error');
  } catch (err: any) {
    assert.equal(err.message, 'Country US not found');
  }

  // Test 2: State not found
  docExists = true;
  docData = {
    states: [{ code: 'VIC', cities: ['Melbourne'] }]
  };
  try {
    await locationsService.addCity('AU', 'NSW', 'Sydney');
    assert.fail('Should have thrown State not found error');
  } catch (err: any) {
    assert.equal(err.message, 'State NSW not found in AU');
  }

  // Test 3: City already exists (should return without calling tx.set)
  docExists = true;
  docData = {
    states: [{ code: 'NSW', cities: ['Sydney', 'Newcastle'] }]
  };
  setRefMock = null;
  await locationsService.addCity('AU', 'NSW', 'Sydney');
  assert.equal(setRefMock, null, 'tx.set should not be called if city exists');

  // Test 4: City is added and sorted
  docExists = true;
  docData = {
    states: [{ code: 'NSW', cities: ['Sydney', 'Newcastle'] }]
  };
  setRefMock = null;
  await locationsService.addCity('AU', 'NSW', 'Wollongong');

  assert.ok(setRefMock, 'tx.set should be called');
  assert.equal(setRefMock.ref, mockDocRef, 'tx.set should be called with the doc ref');

  const updatedDoc = setRefMock.data;
  const nswState = updatedDoc.states.find((s: any) => s.code === 'NSW');
  assert.ok(nswState.cities.includes('Wollongong'), 'Wollongong should be in the cities array');
  assert.deepEqual(nswState.cities, ['Newcastle', 'Sydney', 'Wollongong'], 'Cities should be sorted alphabetically');
  assert.ok(updatedDoc.updatedAt, 'updatedAt should be set');

  console.log('unit locationsService checks passed');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
