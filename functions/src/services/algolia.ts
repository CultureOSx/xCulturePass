import { algoliasearch } from 'algoliasearch';
import { FirestoreEvent } from './firestore';

const APP_ID = process.env.ALGOLIA_APP_ID || '';
const ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY || '';

// Singleton search client initialized lazily or returning mock if credentials missing
export const searchClient = (APP_ID && ADMIN_KEY) ? algoliasearch(APP_ID, ADMIN_KEY) : null;

const EVENTS_INDEX = 'culturepass_events';

export const algoliaEventsIndex = {
  /**
   * Transforms a bulky Firestore document into a lean, fast, flat shape optimized for search.
   * Removes heavy/unnecessary arrays or long strings not needed for matching.
   */
  async indexEvent(eventData: FirestoreEvent) {
    if (!searchClient) return null;

    try {
      // Flatten geo-points for Algolia's out-of-the-box location sorting
      const _geoloc = (eventData.latitude != null && eventData.longitude != null)
        ? { lat: eventData.latitude, lng: eventData.longitude }
        : undefined;

      const record: any = {
        objectID: eventData.id,
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        cultureTag: eventData.cultureTag ?? [],
        
        // Flattened location for exact-match faceted search (Parramatta, Harris Park, etc.)
        city: eventData.city,
        council: eventData.council ?? '',
        suburb: eventData.suburb ?? '',
        country: eventData.country,
        _geoloc,

        date: eventData.date,
        time: eventData.time,
        communityId: eventData.communityId,
        organizerId: eventData.organizerId,
        isFree: eventData.isFree,
        attending: eventData.attending ?? 0,
        imageUrl: eventData.imageUrl,
        
        // Helps Algolia rank highly-viewed/shared events first naturally
        score: (eventData.viewCount ?? 0) + ((eventData.attending ?? 0) * 5),
        
        // Metadata
        createdAt: new Date().getTime(),
      };

      // V5 Algoliasearch API signature
      return await (searchClient as any).saveObject({
        indexName: EVENTS_INDEX,
        body: record,
      });
    } catch (err) {
      console.error('[Algolia indexEvent Error]', err);
      return null;
    }
  },

  async deleteEvent(eventId: string) {
    if (!searchClient) return null;
    
    try {
      return await (searchClient as any).deleteObject({
        indexName: EVENTS_INDEX,
        objectID: eventId,
      });
    } catch (err) {
      console.error('[Algolia deleteEvent Error]', err);
      return null;
    }
  }
};
