import { View, Text, Pressable, StyleSheet } from "react-native"
import { useState } from "react"

const TABS = [
  "All",
  "My Events",
  "Tickets",
  "Council",
  "Interests",
]

export default function CalendarTabs({ onChange }: { onChange: (tab: string) => void }) {
  const [active, setActive] = useState("All")
  function select(tab: string) {
    setActive(tab)
    onChange(tab)
  }
  return (
    <View style={styles.container}>
      {TABS.map((tab) => (
        <Pressable
          key={tab}
          onPress={() => select(tab)}
          style={[styles.tab, active === tab && styles.activeTab]}
        >
          <Text style={[styles.text, active === tab && styles.activeText]}>
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#eee",
    borderRadius: 20,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: "#111",
  },
  text: {
    fontSize: 14,
    color: "#333",
  },
  activeText: {
    color: "#fff",
  }
})