import { InMemoryTtlCache } from './cache';

describe('InMemoryTtlCache', () => {
  let cache: InMemoryTtlCache;

  beforeEach(() => {
    jest.useFakeTimers();
    // Use a default TTL of 60 seconds for most tests
    cache = new InMemoryTtlCache(60_000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return null for an empty cache key', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should get an item that was set', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should delete an item', () => {
    cache.set('key1', 'value1');
    cache.del('key1');
    expect(cache.get('key1')).toBeNull();
  });

  it('should flush all items', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.flush();
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('should expire items after the default TTL', () => {
    cache.set('key1', 'value1');

    // Fast forward just before the expiration
    jest.advanceTimersByTime(59_999);
    expect(cache.get('key1')).toBe('value1');

    // Fast forward past the expiration
    jest.advanceTimersByTime(2); // Now at 60_001
    expect(cache.get('key1')).toBeNull();
  });

  it('should expire items after a custom TTL', () => {
    cache.set('key1', 'value1', 10_000);

    // Fast forward just before the expiration
    jest.advanceTimersByTime(9_999);
    expect(cache.get('key1')).toBe('value1');

    // Fast forward past the expiration
    jest.advanceTimersByTime(2); // Now at 10_001
    expect(cache.get('key1')).toBeNull();
  });

  it('should support multiple items with different TTLs', () => {
    cache.set('key1', 'value1', 10_000);
    cache.set('key2', 'value2', 20_000);

    // Fast forward past the first item's expiration
    jest.advanceTimersByTime(15_000);
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');

    // Fast forward past the second item's expiration
    jest.advanceTimersByTime(6_000); // Total time passed is 21_000
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('should use default TTL if not provided in constructor', () => {
    const defaultCache = new InMemoryTtlCache();
    defaultCache.set('key1', 'value1');
    jest.advanceTimersByTime(59_999);
    expect(defaultCache.get('key1')).toBe('value1');
    jest.advanceTimersByTime(2); // Now at 60_001
    expect(defaultCache.get('key1')).toBeNull();
  });
});
