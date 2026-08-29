import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Font, Radius, Space } from '../../constants/theme';

export interface CourseTabItem {
  id: string;
  code: string;
}

export default function CourseTabs({
  courses, activeId, onSelect,
}: {
  courses: CourseTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Space.md }}>
      <View style={styles.tabRow}>
        {courses.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.tab, activeId === c.id && styles.tabActive]}
            onPress={() => onSelect(c.id)}
          >
            <Text style={[styles.tabText, activeId === c.id && styles.tabTextActive]}>
              {c.code}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: Space.sm, backgroundColor: Colors.bg3, padding: 4, borderRadius: Radius.md },
  tab: { paddingHorizontal: Space.md, paddingVertical: Space.sm, borderRadius: Radius.sm },
  tabActive: { backgroundColor: Colors.white, shadowColor: Colors.accent, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: Font.sm, fontWeight: '500', color: Colors.text2 },
  tabTextActive: { color: Colors.text, fontWeight: '600' },
});
