import { requireRole } from '../../functions/src/middleware/auth';
import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../../shared/schema';
import assert from 'node:assert/strict';
import { InMemoryTtlCache } from '../../functions/src/services/cache';
import { buildSearchCacheKey, runSearch, runSuggest, type SearchableItem } from '../../functions/src/services/search';
import { textHasProfanity, moderationCheck } from '../../functions/src/middleware/moderation';
import { getRolloutConfig, isFeatureEnabledForUser } from '../../functions/src/services/rollout';

const items: SearchableItem[] = [
  { id: 'e1', type: 'event', title: 'Startup Night Sydney', subtitle: 'Tech · CBD', description: 'Founder demos', city: 'Sydney', country: 'Australia', tags: ['startup'] },
  { id: 'c1', type: 'community', title: 'Sydney Startup Circle', subtitle: 'Tech community', description: 'Builders', city: 'Sydney', country: 'Australia', tags: ['community'] },
  { id: 'b1', type: 'business', title: 'RamanArc Studios', subtitle: 'Studio', description: 'Digital products', city: 'Sydney', country: 'Australia', tags: ['studio'] },
];

const searchResult = runSearch(items, { q: 'startup', type: 'all', page: 1, pageSize: 10, city: 'Sydney' });
assert.ok(searchResult.results.length >= 2);
assert.equal(searchResult.page, 1);

// --- runSuggest tests ---
const suggestItems: SearchableItem[] = [
  { id: '1', type: 'event', title: 'Apple', subtitle: '', description: '' },
  { id: '2', type: 'event', title: 'Banana', subtitle: '', description: '' },
  { id: '3', type: 'event', title: 'Apple Pie', subtitle: '', description: '' },
  { id: '4', type: 'event', title: 'Pineapple', subtitle: '', description: '' },
  { id: '5', type: 'event', title: 'Apple', subtitle: '', description: '' }, // Duplicate title
  { id: '6', type: 'event', title: 'Strawberry', subtitle: '', description: '' },
  { id: '7', type: 'event', title: 'Raspberry', subtitle: '', description: '' },
  { id: '8', type: 'event', title: 'Blueberry', subtitle: '', description: '' },
  { id: '9', type: 'event', title: 'Blackberry', subtitle: '', description: '' },
  { id: '10', type: 'event', title: 'Cranberry', subtitle: '', description: '' },
];

// 1. Empty prefix returns empty array
assert.deepEqual(runSuggest(suggestItems, ''), []);
assert.deepEqual(runSuggest(suggestItems, '   '), []);

// 2. Duplicate titles are removed (only one 'Apple')
const suggestApple = runSuggest(suggestItems, 'app');
assert.equal(suggestApple.filter(t => t === 'Apple').length, 1);

// 3. Prefix matching and sorting (startsWith gets 100, others get fuzzy score)
// 'Apple' and 'Apple Pie' start with 'app'
// 'Pineapple' contains 'app' but does not start with it
assert.deepEqual(runSuggest(suggestItems, 'app').slice(0, 2), ['Apple', 'Apple Pie']);
assert.ok(runSuggest(suggestItems, 'app').includes('Pineapple'));

// 4. Limit enforcement
const suggestBerry = runSuggest(suggestItems, 'berry', 3);
assert.equal(suggestBerry.length, 3);
// All of them should end with berry
assert.ok(suggestBerry.every(t => t.toLowerCase().includes('berry')));

// Original basic test for regression
const suggest = runSuggest(items, 'sta');
assert.ok(suggest.length >= 1);
// --- end runSuggest tests ---

const keyA = buildSearchCacheKey({ q: 'x', type: 'all', page: 1, pageSize: 10, tags: ['b', 'a'] });
const keyB = buildSearchCacheKey({ q: 'x', type: 'all', page: 1, pageSize: 10, tags: ['a', 'b'] });
assert.equal(keyA, keyB);

assert.equal(textHasProfanity('you are an idiot'), true);
assert.equal(textHasProfanity('welcome friend'), false);




{
  let nextCalled = false;
  let statusCalledWith = 0;
  let jsonCalledWith = null;

  const mockNext = () => { nextCalled = true; };
  const mockRes = {
    status: (code: number) => { statusCalledWith = code; return mockRes; },
    json: (data: any) => { jsonCalledWith = data; return mockRes; }
  };

  const resetMocks = () => { nextCalled = false; statusCalledWith = 0; jsonCalledWith = null; };

  // moderationCheck: Happy path
  resetMocks();
  moderationCheck({ body: { content: 'hello world' } } as unknown as Request, mockRes as unknown as Response, mockNext as unknown as NextFunction);
  assert.equal(nextCalled, true);
  assert.equal(statusCalledWith, 0);

  // moderationCheck: Profanity
  resetMocks();
  moderationCheck({ body: { content: 'this is stupid' } } as unknown as Request, mockRes as unknown as Response, mockNext as unknown as NextFunction);
  assert.equal(nextCalled, false);
  assert.equal(statusCalledWith, 400);
  assert.deepEqual(jsonCalledWith, { error: 'Content rejected by moderation checks (profanity).' });

  // moderationCheck: Suspicious links
  resetMocks();
  moderationCheck({ body: { link: 'http://bit.ly/123' } } as unknown as Request, mockRes as unknown as Response, mockNext as unknown as NextFunction);
  assert.equal(nextCalled, false);
  assert.equal(statusCalledWith, 400);
  assert.deepEqual(jsonCalledWith, { error: 'Content rejected by moderation checks (suspicious links).' });

  // moderationCheck: Empty body
  resetMocks();
  moderationCheck({} as unknown as Request, mockRes as unknown as Response, mockNext as unknown as NextFunction);
  assert.equal(nextCalled, true);
  assert.equal(statusCalledWith, 0);

  // moderationCheck: Non-string values in body
  resetMocks();
  moderationCheck({ body: { num: 123, obj: { a: 1 } } } as unknown as Request, mockRes as unknown as Response, mockNext as unknown as NextFunction);
  assert.equal(nextCalled, true);
  assert.equal(statusCalledWith, 0);
}

const cache = new InMemoryTtlCache(1000);
cache.set('k1', { ok: true });
assert.deepEqual(cache.get('k1'), { ok: true });
cache.del('k1');
assert.equal(cache.get('k1'), null);

const rollout = getRolloutConfig();
assert.ok(['internal', 'pilot', 'half', 'full'].includes(rollout.phase));
assert.equal(typeof isFeatureEnabledForUser('ticketingPhase6', 'u1'), 'boolean');



// Test requireRole
console.log('Testing requireRole...');

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    }
  };
  return res as Response;
}

function createMockReq(role?: UserRole) {
  const req: any = {};
  if (role) {
    req.user = { id: 'u1', username: 'test', role };
  }
  return req as Request;
}

let nextCalled = false;
const mockNext: NextFunction = () => { nextCalled = true; };

// 1. No user -> 401
{
  const req = createMockReq();
  const res = createMockRes();
  nextCalled = false;
  requireRole('admin')(req, res, mockNext);
  assert.equal((res as any).statusCode, 401);
  assert.equal(nextCalled, false);
}

// 2. User without required role -> 403
{
  const req = createMockReq('user');
  const res = createMockRes();
  nextCalled = false;
  requireRole('organizer')(req, res, mockNext);
  assert.equal((res as any).statusCode, 403);
  assert.equal(nextCalled, false);
}

// 3. User with exact role -> next
{
  const req = createMockReq('organizer');
  const res = createMockRes();
  nextCalled = false;
  requireRole('organizer')(req, res, mockNext);
  assert.equal((res as any).statusCode, 200);
  assert.equal(nextCalled, true);
}

// 4. Admin user overrides lower roles -> next
{
  const req = createMockReq('admin');
  const res = createMockRes();
  nextCalled = false;
  requireRole('organizer')(req, res, mockNext);
  assert.equal((res as any).statusCode, 200);
  assert.equal(nextCalled, true);
}

// 5. One of multiple allowed roles -> next
{
  const req = createMockReq('business');
  const res = createMockRes();
  nextCalled = false;
  requireRole('organizer', 'business', 'sponsor')(req, res, mockNext);
  assert.equal((res as any).statusCode, 200);
  assert.equal(nextCalled, true);
}

// 6. User without any of multiple allowed roles -> 403
{
  const req = createMockReq('user');
  const res = createMockRes();
  nextCalled = false;
  requireRole('organizer', 'business', 'sponsor')(req, res, mockNext);
  assert.equal((res as any).statusCode, 403);
  assert.equal(nextCalled, false);
}

console.log('unit services/middleware checks passed');
