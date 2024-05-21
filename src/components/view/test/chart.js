import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Skia, Canvas, Paint, Path, PaintStyle, Color } from "@shopify/react-native-skia";

const RadarChart = () => {
  const data = [0.5, 0.5, 0.7, 0.6, 0.8]; // 임의의 평가 값
  const labels = ["피드", "해시태그", "이상형", "얼굴", "소개서"]; // 범주 레이블
  const radius = 150; // 반지름 크기 설정
  const gridSteps = 5; // How many grid lines, not including the outermost line

  const { width } = Dimensions.get('window');
  const center = width / 2;
  const angle = (2 * Math.PI) / data.length;

  const paint = Skia.Paint();
  paint.setColor(Skia.Color("#FF6C3D"));
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Stroke); // 경계선만 그리기
  paint.setStrokeWidth(2); // 선의 두께

  const gridPaint = Skia.Paint();
  gridPaint.setColor(Skia.Color("#CCCCCC")); // Light grey for grid
  gridPaint.setAntiAlias(true);
  gridPaint.setStyle(PaintStyle.Stroke);
  gridPaint.setStrokeWidth(1);

  const path = Skia.Path.Make();
  const gridPath = Skia.Path.Make();

  // Draw the main path for data
  data.forEach((value, index) => {
    const x = center + radius * value * Math.cos(angle * index - Math.PI / 2);
    const y = center + radius * value * Math.sin(angle * index - Math.PI / 2);
    if (index === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  });
  path.close();

  // Draw grid lines
  for (let step = 1; step <= gridSteps; step++) {
    const gridRadius = (radius / gridSteps) * step;
    for (let i = 0; i < data.length; i++) {
      const x = center + gridRadius * Math.cos(angle * i - Math.PI / 2);
      const y = center + gridRadius * Math.sin(angle * i - Math.PI / 2);
      if (i === 0) {
        gridPath.moveTo(x, y);
      } else {
        gridPath.lineTo(x, y);
      }
      if (i === data.length - 1) {
        gridPath.lineTo(center + gridRadius * Math.cos(-Math.PI / 2), center + gridRadius * Math.sin(-Math.PI / 2));
      }
    }
  }

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Path path={gridPath} paint={gridPaint} />
        <Path path={path} paint={paint} />
      </Canvas>
      {labels.map((label, index) => (
        <View key={index} style={[styles.label, {
          left: center + (radius + 20) * Math.cos(angle * index - Math.PI / 2) - 20,
          top: center + (radius + 20) * Math.sin(angle * index - Math.PI / 2) - 10,
        }]}>
          <Text>{label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative'
  },
  canvas: {
    flex: 1
  },
  label: {
    position: 'absolute',
    width: 40,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default RadarChart;