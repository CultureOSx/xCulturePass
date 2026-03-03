import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

interface ProfileTagsProps {
  tags: string[];
  entityColor: string;
}

export function ProfileTags({ tags, entityColor }: ProfileTagsProps) {
  if (tags.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tags</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tagsRow}>
          {tags.map((tag, i) => (
            <View key={i} style={[styles.tagPill, { backgroundColor: entityColor + '12', borderColor: entityColor + '25' }]}>
              <Text style={[styles.tagText, { color: entityColor }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
});
