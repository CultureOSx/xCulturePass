import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { db } from './admin';
import { algoliaEventsIndex } from './services/algolia';

/**
 * Trigger: onEventWritten
 * Maintains the 'feed' collection by automatically creating, updating, or 
 * soft-deleting FeedItem documents whenever an event is modified.
 * Also syncs published events directly to Algolia for fast geo-discovery.
 */
export const onEventWritten = onDocumentWritten('events/{eventId}', async (event) => {
    const change = event.data;
    if (!change) return; // defensive

    const after = change.after.data();
    const eventId = event.params.eventId;
    
    // Deletion or Soft-Delete
    if (!after || after.status === 'deleted') {
      // 1. Remove from global algorithmic feed
      const existingFeed = await db.collection('feed').where('referenceId', '==', eventId).get();
      const batch = db.batch();
      existingFeed.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      
      // 2. Remove from Algolia Search Index
      await algoliaEventsIndex.deleteEvent(eventId);
      
      return;
    }
    
    // Only publish to the feed and search index if the event is officially "published"
    if (after.status !== 'published') {
      // If it transitioned from published -> draft, drop it from Algolia
      if (change.before.exists && change.before.data()?.status === 'published') {
         await algoliaEventsIndex.deleteEvent(eventId);
      }
      return null;
    }
    
    // -----------------------------------------------------------------------
    // 1. Sync to Global Feed (for infinite scroll algorithmic timeline)
    // -----------------------------------------------------------------------
    const feedItemRef = db.collection('feed').doc(`evt_${eventId}`);
    
    const itemData: Record<string, any> = {
      type: 'event_created',
      communityId: after.communityId || 'General',
      city: after.city || 'General',
      referenceId: eventId,
      updatedAt: new Date().toISOString(),
      payload: {
        title: after.title,
        description: after.description,
        imageUrl: after.imageUrl,
        date: after.date,
        venue: after.venue || after.city,
      }
    };
    
    if (!change.before.exists) {
        itemData.createdAt = new Date().toISOString();
    } else {
        const existingDoc = await feedItemRef.get();
        itemData.createdAt = existingDoc.exists ? existingDoc.data()?.createdAt : new Date().toISOString();
    }
    
    await feedItemRef.set(itemData, { merge: true });
    
    // -----------------------------------------------------------------------
    // 2. Sync to Algolia Search Engine (for fast Discovery routing)
    // -----------------------------------------------------------------------
    await algoliaEventsIndex.indexEvent({ id: eventId, ...(after as any) });
    
    return;
  });
