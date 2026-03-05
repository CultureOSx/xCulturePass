import { View, Text, Pressable, StyleSheet } from "react-native"
import { useState } from "react"

const filters = [
  "All",
  "Festival",
  "Movie",
  "Workshop",
  "Council",
]

export default function CalendarFilters({ onFilter }) {
  const [selected, setSelected] = useState("All")
  function select(filter: string) {
    setSelected(filter)
    onFilter(filter)
  }
  return (
    <View style={styles.container}>
      {filters.map((filter) => (
        <Pressable
          key={filter}
          onPress={() => select(filter)}
          style={[styles.filter, selected === filter && styles.active]}
        >
          <Text style={styles.text}>{filter}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  filter: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f2f2f2",
  },
  active: {
    backgroundColor: "#000",
  },
  text: {
    color: "#fff",
  }
})