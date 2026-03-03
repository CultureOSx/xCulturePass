const fs = require('fs');
const file = 'app/(tabs)/index.tsx';
let content = fs.readFileSync(file, 'utf8');

const originalWebSectionHeader = `<View style={styles.webSectionHeader}>
        <View style={styles.webSectionTitleRow}>
          <LinearGradient
            colors={['#0081C8', '#EE334E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.webSectionAccentBar}
          />
          <View>
            <Text style={styles.webSectionTitle}>{title}</Text>
            {subtitle ? <Text style={styles.webSectionSub}>{subtitle}</Text> : null}
          </View>
        </View>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} style={styles.webSeeAllBtn}>
            <Text style={styles.webSeeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
          </Pressable>
        ) : null}
      </View>`;

const newWebSectionHeader = `<View style={styles.webSectionHeader}>
        <View style={styles.webSectionTitleRow}>
          <View>
            <Text style={styles.webSectionTitle}>{title}</Text>
            {subtitle ? <Text style={styles.webSectionSub}>{subtitle}</Text> : null}
          </View>
        </View>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} style={styles.webSeeAllBtn}>
            <Text style={styles.webSeeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
          </Pressable>
        ) : null}
      </View>`;

if (content.includes(originalWebSectionHeader)) {
  content = content.replace(originalWebSectionHeader, newWebSectionHeader);
  fs.writeFileSync(file, content);
  console.log("WebSectionHeader successfully updated.");
} else {
  console.log("Could not find original WebSectionHeader code.");
}
