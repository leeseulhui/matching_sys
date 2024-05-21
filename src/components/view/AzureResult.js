//이미지 캡션 분석 결과 화면(유사도 띄워주는 곳) -> 필요한지 아닌지 생각해야하는 페이지
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import axios from 'axios';

const AzureResult = ({ route }) => {
  const { userId1, userId2 } = route.params;
  const [averageSimilarity, setAverageSimilarity] = useState(null);

  useEffect(() => {
    const fetchSimilarity = async () => {
      try {
        const response = await axios.post('http://localhost:6000/api/compare-captions', {
          userId1: userId1,
          userId2: userId2,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('Similarity result:', response.data);
        setAverageSimilarity(response.data.average_similarity);
      } catch (error) {
        console.error('Error fetching similarity:', error);
      }
    };

    fetchSimilarity();
  }, [userId1, userId2]);

  return (
    <View style={styles.container}>
      {averageSimilarity !== null ? (
        <Text style={styles.resultText}>
          두 사용자의 피드 이미지 캡션의 평균 유사도는 {averageSimilarity.toFixed(2)}%입니다.
        </Text>
      ) : (
        <Text style={styles.resultText}>유사도 계산 중...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f1f1',
  },
  resultText: {
    fontSize: 18,
    color: '#333',
  },
});

export default AzureResult;