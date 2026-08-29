import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Font } from '../../constants/theme';

interface Props {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  sublabel?: string;
}

export default function RingChart({ value, max, size = 96, strokeWidth = 9, color = Colors.accent, label, sublabel }: Props) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, max > 0 ? value / max : 0));
  const offset = circumference * (1 - pct);
  const cx = size / 2, cy = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle cx={cx} cy={cy} r={r} stroke="rgba(99,85,165,0.12)" strokeWidth={strokeWidth} fill="none" />
        {/* Fill */}
        <Circle
          cx={cx} cy={cy} r={r}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90} originX={cx} originY={cy}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: size > 80 ? Font.xl : Font.lg, fontWeight: '700', color, letterSpacing: -0.5 }}>
          {label}
        </Text>
        {sublabel && (
          <Text style={{ fontSize: Font.xs, color: Colors.text3, marginTop: 1 }}>{sublabel}</Text>
        )}
      </View>
    </View>
  );
}
