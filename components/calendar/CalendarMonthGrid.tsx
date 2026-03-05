import { View, Text, Pressable, StyleSheet } from "react-native"

export default function CalendarMonthGrid({ events, selectedDate, onSelectDate }) {
  // For demo: just show days 1-30 with event dots
  return (
    <View style={styles.grid}>
      {[...Array(30)].map((_, i) => {
        const day = i + 1
        const dayEvents = events.filter(e => new Date(e.date).getDate() === day)
        return (
          <Pressable key={day} style={styles.cell} onPress={() => onSelectDate(day)}>
            <Text style={[styles.day, selectedDate === day && styles.selectedDay]}>{day}</Text>
            <View style={styles.dotsRow}>
              {dayEvents.map((e, idx) => (
                <Text key={idx} style={styles.dot}>•</Text>
              ))}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
  },
  cell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  day: {
    fontSize: 16,
    color: "#222",
  },
  selectedDay: {
    color: "#007AFF",
    fontWeight: "bold",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  dot: {
    color: "#007AFF",
    fontSize: 12,
  },
})