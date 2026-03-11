import { View, Text, StyleSheet, Image } from "react-native"

export default function EventCard({ event }: { event: any }) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: event.imageUrl }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>{event.date} · {event.time} · {event.venue}</Text>
        <View style={styles.iconsRow}>
          {event.liked && <Text>❤️</Text>}
          {event.rsvp && <Text>📌</Text>}
          {event.ticket && <Text>🎟</Text>}
          {event.councilId && <Text>🏛</Text>}
          {event.isFeatured && <Text>⭐</Text>}
          {event.isTrending && <Text>🔥</Text>}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 12,
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  iconsRow: {
    flexDirection: "row",
    gap: 6,
  },
})