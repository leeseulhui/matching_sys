import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Skia, Canvas, Paint, Path, PaintStyle } from "@shopify/react-native-skia";
import { useRoute } from '@react-navigation/native';
import { nodeUrl } from '../../../deviceSet';

const RadarChart = () => {
  const route = useRoute();
  const { userId, randomUserIds } = route.params || {}; // 기본값 추가
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  if (!userId || !randomUserIds) {
    return (
      <View style={styles.loadingContainer}>
        <Text>필요한 매개변수가 제공되지 않았습니다.</Text>
      </View>
    );
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log(`Fetching data for userId: ${userId} with randomUserIds: ${randomUserIds}`);
        const response = await fetch(`${nodeUrl}/similarity/${userId}/${randomUserIds.join(',')}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result = await response.json();
        console.log('Fetched data:', result);

        const adjustedResult = {
          ...result,
          userFaceSimilarity: result.userFaceSimilarity.map(value => value / 100)
        };

        setData(adjustedResult);
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, randomUserIds]);

  const labels = ["프로필", "캡션", "얼굴", "이상형", "해시"];
  const radius = 150;
  const gridSteps = 5;
  const { width } = Dimensions.get('window');
  const center = { x: width / 2, y: 200 };

  const angle = (2 * Math.PI) / labels.length;

  if (!Skia) {
    return <Text>Skia 모듈을 불러올 수 없습니다.</Text>;
  }

  const paint = Skia.Paint();
  paint.setColor(Skia.Color("#FF6C3D"));
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(2);

  const gridPaint = Skia.Paint();
  gridPaint.setColor(Skia.Color("#CCCCCC"));
  gridPaint.setAntiAlias(true);
  gridPaint.setStyle(PaintStyle.Stroke);
  gridPaint.setStrokeWidth(1);

  const drawRadarChart = (userData) => {
    const path = Skia.Path.Make();
    const gridPath = Skia.Path.Make();

    userData.forEach((value, index) => {
      const x = center.x + radius * value * Math.cos(angle * index - Math.PI / 2);
      const y = center.y + radius * value * Math.sin(angle * index - Math.PI / 2);
      if (index === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    });
    path.close();

    for (let step = 1; step <= gridSteps; step++) {
      const gridRadius = (radius / gridSteps) * step;
      for (let i = 0; i < labels.length; i++) {
        const x = center.x + gridRadius * Math.cos(angle * i - Math.PI / 2);
        const y = center.y + gridRadius * Math.sin(angle * i - Math.PI / 2);
        if (i === 0) {
          gridPath.moveTo(x, y);
        } else {
          gridPath.lineTo(x, y);
        }
        if (i === labels.length - 1) {
          gridPath.lineTo(center.x + gridRadius * Math.cos(-Math.PI / 2), center.y + gridRadius * Math.sin(-Math.PI / 2));
        }
      }
    }

    return (
      <Canvas style={styles.canvas}>
        <Path path={gridPath} paint={gridPaint} />
        <Path path={path} paint={paint} />
      </Canvas>
    );
  };

  const handleMatch = async (randomUserId) => {
    try {
      const response = await fetch(`http://10.0.2.2:8080/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user1ID: userId,
          user2ID: randomUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      console.log('Match result:', result);

      Alert.alert('매칭 성공', `User ${userId}와 User ${randomUserId}가 매칭되었습니다.`);
    } catch (error) {
      console.error('Match error:', error);
      Alert.alert('매칭 실패', '매칭 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6C3D" />
        <Text>데이터를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
      {randomUserIds.map((randomUserId, index) => (
        <TouchableOpacity key={index} style={styles.chartContainer} onPress={() => handleMatch(randomUserId)}>
          <Text style={styles.title}>{`User: ${userId} vs Random User: ${randomUserId}`}</Text>
          <View style={styles.canvasContainer}>
            {drawRadarChart([
              data.datingProfileSimilarity ? data.datingProfileSimilarity[index] : 0,
              data.userCaptionSimilarity ? data.userCaptionSimilarity[index] : 0,
              data.userFaceSimilarity ? data.userFaceSimilarity[index] : 0,
              data.userIdealSimilarity ? data.userIdealSimilarity[index] : 0,
              data.userSimilarity ? data.userSimilarity[index] : 0,
            ])}
            {labels.map((label, labelIndex) => (
              <View key={labelIndex} style={[styles.label, {
                left: center.x + (radius + 20) * Math.cos(angle * labelIndex - Math.PI / 2) - 20,
                top: center.y + (radius + 20) * Math.sin(angle * labelIndex - Math.PI / 2) - 10,
              }]}>
                <Text>{label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.dataContainer}>
            <Text style={styles.dataText}>
              {`User: ${userId} vs Random User: ${randomUserId}`}
            </Text>
            <Text style={styles.dataText}>
              Dating Profile Similarity: {data.datingProfileSimilarity ? data.datingProfileSimilarity[index] : 'N/A'}
            </Text>
            <Text style={styles.dataText}>
              User Caption Similarity: {data.userCaptionSimilarity ? data.userCaptionSimilarity[index] : 'N/A'}
            </Text>
            <Text style={styles.dataText}>
              User Face Similarity: {data.userFaceSimilarity ? data.userFaceSimilarity[index] : 'N/A'}
            </Text>
            <Text style={styles.dataText}>
              User Ideal Similarity: {data.userIdealSimilarity ? data.userIdealSimilarity[index] : 'N/A'}
            </Text>
            <Text style={styles.dataText}>
              User Similarity: {data.userSimilarity ? data.userSimilarity[index] : 'N/A'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollViewContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  chartContainer: {
    position: 'relative',
    marginBottom: 40,
    alignItems: 'center',
  },
  canvasContainer: {
    position: 'relative',
    width: Dimensions.get('window').width,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    width: Dimensions.get('window').width,
    height: 400,
  },
  label: {
    position: 'absolute',
    width: 40,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  dataContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    alignItems: 'center',
  },
  dataText: {
    fontSize: 12,
    marginBottom: 5,
  },
});

export default RadarChart;
