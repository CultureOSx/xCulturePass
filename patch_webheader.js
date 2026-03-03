const fs = require('fs');
const file = 'app/(tabs)/index.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldHeader = `{/* Header */}
            <View style={styles.webTopRow}>
              <View>
                <View style={styles.webLocationRow}>
                  <Ionicons name="location-outline" size={18} color="#F2A93B" />
                  <Text style={styles.webLocationText}>{state.city || 'Sydney'}, {state.country || 'Australia'}</Text>
                </View>
                <Text style={styles.webGreeting}>{timeGreeting}, {firstName}</Text>
                <Text style={styles.webHeading}>Discover experiences around you</Text>
              </View>
              <View style={styles.webTopActions}>
                <Pressable style={styles.webIconBtn} onPress={() => router.push('/map' as any)}>
                  <Ionicons name="map-outline" size={19} color="#EAF0FF" />
                </Pressable>
                <Pressable style={styles.webIconBtn} onPress={() => router.push('/notifications')}>
                  <Ionicons name="notifications-outline" size={19} color="#EAF0FF" />
                </Pressable>
                <View style={styles.webAvatarBtn}>
                  <Text style={styles.webAvatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
                </View>
              </View>
            </View>

            {/* Search */}
            <View style={styles.webSearchWrap}>
              <Ionicons name="search-outline" size={18} color="#94A2C4" />
              <TextInput
                value={webSearch}
                onChangeText={setWebSearch}
                placeholder="Search events, artists, experiences"
                placeholderTextColor="#8F9CBC"
                style={styles.webSearchInput}
              />
            </View>`;

const newHeader = `{/* Header */}
            <View style={styles.webTopRow}>
              <View style={styles.webTopRowLeft}>
                <Ionicons name="globe-outline" size={24} color={Colors.primary} />
                <Text style={styles.webBrandName}>CulturePass</Text>
              </View>

              {/* Central Search */}
              <View style={styles.webSearchWrap}>
                <Ionicons name="search-outline" size={18} color="#94A2C4" />
                <TextInput
                  value={webSearch}
                  onChangeText={setWebSearch}
                  placeholder="Search events, movies and restaurants"
                  placeholderTextColor="#8F9CBC"
                  style={styles.webSearchInput}
                />
              </View>

              <View style={styles.webTopActions}>
                <Pressable style={styles.webLocationBtn}>
                  <Ionicons name="location-outline" size={16} color="#F2A93B" />
                  <Text style={styles.webLocationTextBtn}>{state.city || 'Sydney'}, {state.country || 'Australia'}</Text>
                  <Ionicons name="chevron-down-outline" size={14} color="#C7D2EE" />
                </Pressable>
                <Pressable style={styles.webIconBtn} onPress={() => router.push('/map' as any)}>
                  <Ionicons name="map-outline" size={19} color="#EAF0FF" />
                </Pressable>
                <View style={styles.webAvatarBtn}>
                  <Text style={styles.webAvatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
                </View>
              </View>
            </View>`;

if (content.includes(oldHeader)) {
  content = content.replace(oldHeader, newHeader);
  fs.writeFileSync(file, content);
  console.log("Web header successfully updated.");
} else {
  console.log("Could not find original Web header.");
}
