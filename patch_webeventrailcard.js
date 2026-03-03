const fs = require('fs');
const file = 'app/(tabs)/index.tsx';
let content = fs.readFileSync(file, 'utf8');

const originalWebEventRailCard = `function WebEventRailCard({ event }: { event: EventData }) {
  const rawDate = event.date ?? '';
  const dateChip = rawDate.length >= 7 ? rawDate.slice(5).replace('-', ' ') : rawDate;
  const category = event.category || event.communityTag || 'Event';
  return (
    <Pressable
      style={({ pressed }) => [
        styles.webRailCard,
        pressed && { opacity: 0.9 },
        Platform.OS === 'web' && { cursor: 'pointer' as any },
      ]}
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
    >
      <Image source={{ uri: event.imageUrl }} style={styles.webRailImage} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.88)']}
        locations={[0.3, 0.6, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      {dateChip ? (
        <View style={styles.webRailDateChip}>
          <Text style={styles.webRailDateChipText}>{dateChip}</Text>
        </View>
      ) : null}
      <View style={styles.webRailCatTag}>
        <Text style={styles.webRailCatText} numberOfLines={1}>{category}</Text>
      </View>
      <View style={styles.webRailMeta}>
        <Text style={styles.webRailTitle} numberOfLines={2}>{event.title}</Text>
        <View style={styles.webRailVenueRow}>
          <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.6)" />
          <Text style={styles.webRailVenue} numberOfLines={1}>{event.venue || event.city}</Text>
        </View>
        <View style={styles.webRailBottom}>
          <LinearGradient
            colors={['#0081C8', '#EE334E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.webRailPricePill}
          >
            <Text style={styles.webRailPriceText}>{event.priceLabel || 'Free'}</Text>
          </LinearGradient>
          <Ionicons name="bookmark-outline" size={18} color="rgba(255,255,255,0.7)" />
        </View>
      </View>
    </Pressable>
  );
}`;

const newWebEventRailCard = `function WebEventRailCard({ event }: { event: EventData }) {
  const rawDate = event.date ?? '';
  const dateChip = rawDate.length >= 7 ? rawDate.slice(5).replace('-', ' ') : rawDate;
  const category = event.category || event.communityTag || 'Event';
  return (
    <Pressable
      style={({ pressed }) => [
        styles.webRailCard,
        pressed && { opacity: 0.9 },
        Platform.OS === 'web' && { cursor: 'pointer' as any },
      ]}
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
    >
      <View style={styles.webRailImageContainer}>
        <Image source={{ uri: event.imageUrl }} style={styles.webRailImage} resizeMode="cover" />
        <View style={styles.webRailCatTag}>
          <Text style={styles.webRailCatText} numberOfLines={1}>{category}</Text>
        </View>
      </View>
      <View style={styles.webRailMeta}>
        {dateChip ? (
          <Text style={styles.webRailDateText}>{dateChip}</Text>
        ) : null}
        <Text style={styles.webRailTitle} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.webRailVenue} numberOfLines={1}>{event.venue || event.city}</Text>
        <View style={styles.webRailBottom}>
          <Text style={styles.webRailPriceTextDark}>{event.priceLabel || 'Free'}</Text>
        </View>
      </View>
    </Pressable>
  );
}`;

if (content.includes(originalWebEventRailCard)) {
  content = content.replace(originalWebEventRailCard, newWebEventRailCard);
  fs.writeFileSync(file, content);
  console.log("WebEventRailCard successfully updated.");
} else {
  console.log("Could not find original WebEventRailCard code.");
}
