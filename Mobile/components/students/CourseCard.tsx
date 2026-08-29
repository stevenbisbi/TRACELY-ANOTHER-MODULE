import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Badge } from '../ui/Badge';
import { Colors, Font, Radius, Space } from '../../constants/theme';
import { gradeColor, attColor, courseOverall } from '../../utils/helpers';
import type { StudentCourse } from '../../context/DataContext';

export default function CourseCard({ course, onPress }: { course: StudentCourse; onPress?: () => void }) {
  const ov = courseOverall(course.cortes);

  return (
    <TouchableOpacity
      style={[styles.courseCard, { borderLeftColor: course.color }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.courseTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.courseCode}>{course.code}</Text>
          <Text style={styles.courseName}>{course.name}</Text>
          <Text style={styles.courseTeacher}>{course.teacher}</Text>
        </View>
        <Badge variant={course.status as any} label={course.status === 'active' ? 'Al día' : '⚠ Alerta'} />
      </View>
      <View style={styles.courseStats}>
        <View>
          <Text style={[styles.courseBigNum, { color: gradeColor(ov) }]}>{ov != null ? ov.toFixed(1) : '—'}</Text>
          <Text style={styles.courseStatLabel}>Nota</Text>
        </View>
        <View>
          <Text style={[styles.courseBigNum, { color: attColor(course.attendance) }]}>{course.attendance}%</Text>
          <Text style={styles.courseStatLabel}>Asistencia</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${course.attendance}%`, backgroundColor: attColor(course.attendance) }]} />
          </View>
          <Text style={styles.courseStatLabel}>{course.credits} créditos</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  courseCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    shadowColor: Colors.accent,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  courseTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Space.md, gap: Space.sm },
  courseCode: { fontSize: Font.xs, fontWeight: '700', color: Colors.text3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  courseName: { fontSize: Font.md, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  courseTeacher: { fontSize: Font.sm, color: Colors.text2 },
  courseStats: { flexDirection: 'row', alignItems: 'center', gap: Space.lg },
  courseBigNum: { fontSize: Font.xl, fontWeight: '700' },
  courseStatLabel: { fontSize: Font.xs, color: Colors.text3, marginTop: 2 },
  progressTrack: { height: 5, backgroundColor: Colors.bg3, borderRadius: 4, overflow: 'hidden', marginBottom: 2 },
  progressFill: { height: '100%', borderRadius: 4 },
});
