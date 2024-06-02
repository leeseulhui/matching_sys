import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { baseURL } from '../../deviceSet';
import { useRoute, useNavigation } from '@react-navigation/native';

const IdealTypeAnalysis = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId, randomUsersData } = route.params;
  const [currentUserIdealType, setCurrentUserIdealType] = useState(null);
  const [similarityScores, setSimilarityScores] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${baseURL}:8080/api/ideal-typeR?userId=${userId}`);
        if (!response.ok) {
          throw new Error('사용자 이상형 데이터를 가져오는데 실패했습니다.');
        }
        const data = await response.json();
        setCurrentUserIdealType(data);
      } catch (error) {
        console.error('사용자 이상형 데이터를 가져오는 중 에러 발생:', error);
        setError('사용자 이상형 데이터를 가져오는데 실패했습니다.');
      }
    };

    fetchUserData();
  }, [userId]);

  useEffect(() => {
    if (currentUserIdealType && Array.isArray(randomUsersData) && randomUsersData.length > 0) {
      const fetchRandomUsersIdealTypes = async () => {
        try {
          const usersData = await Promise.all(randomUsersData.map(async user => {
            const response = await fetch(`${baseURL}:8080/api/ideal-type?userId=${user.id}`);
            if (!response.ok) {
              throw new Error(`사용자 ${user.id}의 이상형 데이터를 가져오는데 실패했습니다.`);
            }
            const data = await response.json();
            return { ...data, user_id: user.id, Username: user.name };
          }));
          calculateSimilarity(usersData);
        } catch (error) {
          console.error('랜덤 사용자들의 이상형 데이터를 가져오는 중 에러 발생:', error);
          setError('랜덤 사용자들의 이상형 데이터를 가져오는데 실패했습니다.');
        }
      };

      const calculateSimilarity = (usersData) => {
        const scores = usersData.map(user => {
          let score = 0;
          console.log(`Comparing with user: ${user.Username}`);
          if (user.Religion === currentUserIdealType.Religion) {
            score += 1;
            console.log(`Religion matches: ${user.Religion}`);
          }
          if (user.Personality === currentUserIdealType.Personality) {
            score += 1;
            console.log(`Personality matches: ${user.Personality}`);
          }
          if (user.Interests && currentUserIdealType.Interests && user.Interests.split(',').some(interest => currentUserIdealType.Interests.includes(interest))) {
            score += 1;
            console.log(`Interests match: ${user.Interests}`);
          }
          if (user.AttractionActions && currentUserIdealType.AttractionActions && user.AttractionActions.split(',').some(attr => currentUserIdealType.AttractionActions.includes(attr))) {
            score += 1;
            console.log(`AttractionActions match: ${user.AttractionActions}`);
          }
          if (user.Birthdate && currentUserIdealType.Birthdate) {
            const userBirthYear = new Date(user.Birthdate).getFullYear();
            const currentUserBirthYear = new Date(currentUserIdealType.Birthdate).getFullYear();
            if (currentUserIdealType.Age === '연하' && userBirthYear > currentUserBirthYear) {
              score += 1;
              console.log(`Age preference matches (연하): ${userBirthYear} > ${currentUserBirthYear}`);
            }
            if (currentUserIdealType.Age === '연상' && userBirthYear < currentUserBirthYear) {
              score += 1;
              console.log(`Age preference matches (연상): ${userBirthYear} < ${currentUserBirthYear}`);
            }
            if (currentUserIdealType.Age === '동갑' && userBirthYear === currentUserBirthYear) {
              score += 1;
              console.log(`Age preference matches (동갑): ${userBirthYear} === ${currentUserBirthYear}`);
            }
          }
          console.log(`Total similarity score for ${user.Username}: ${score}`);
          return { userId: user.user_id, Username: user.Username, score: score / 5 }; // score를 5로 나누어 0에서 1 사이의 값으로 변환
        });
        setSimilarityScores(scores);
        setIsLoading(false); // 로딩 완료
        saveSimilaritiesToDatabase(scores);
      };

      fetchRandomUsersIdealTypes();
    }
  }, [currentUserIdealType, randomUsersData]);

  const saveSimilaritiesToDatabase = async (scores) => {
    try {
      await Promise.all(scores.map(async ({ userId: userId2, score }) => {
        const response = await fetch(`${baseURL}:8080/api/save-idealsimilarity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId1: userId,
            userId2,
            similarity: score
          })
        });
        if (!response.ok) {
          throw new Error(`Failed to save similarity for user ${userId2}`);
        }
      }));
      console.log('All similarities saved successfully');
    } catch (error) {
      console.error('Error saving similarities:', error);
    }
  };

  const handleNavigateToFaceAnalysis = () => {
    const randomUserIds = randomUsersData.map(user => user.id); // id만 추출
    navigation.navigate('얼굴분석', { userId, randomUserIds }); // id 배열 전달
  };

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9CB4" />
          <Text style={styles.loadingText}>이상형을 분석 중입니다...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollViewStyle}>
          <Text style={styles.title}>이상형 분석</Text>
          {similarityScores.length > 0 ? (
            similarityScores.map((result, index) => (
              <View key={index} style={styles.userCard}>
                <Text style={styles.userName}>{result.Username}</Text>
                <Text style={styles.similarityScore}>이상형 점수: {result.score !== undefined ? `${(result.score * 100).toFixed(2)}%` : '계산 중...'}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.error}>일치하는 사용자를 찾을 수 없습니다</Text>
          )}
          <TouchableOpacity onPress={handleNavigateToFaceAnalysis} style={styles.button}>
            <Text style={styles.buttonText}>얼굴 분석으로 이동</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffe4e1',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FF9CB4',
  },
  scrollViewStyle: {
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
    textAlign: 'center',
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  similarityScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'blue',
  },
  error: {
    fontSize: 16,
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FF9CB4',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default IdealTypeAnalysis;
