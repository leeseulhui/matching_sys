import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { fetchInstagramPosts } from '../../fetchInstagramPosts';
import HashTagCloud from './HashTagCloud';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { status_top, baseURL } from '../../../deviceSet';
import { useNavigation } from '@react-navigation/native';

const HashTest = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [hashTags, setHashTags] = useState([]);
  const [error, setError] = useState(null);
  const [similarUsers, setSimilarUsers] = useState([]);
  const [userSimilarities, setUserSimilarities] = useState({});
  const [highSimilarityTags, setHighSimilarityTags] = useState({});

  useEffect(() => {
    const initFunctions = async () => {
      const accessToken = await AsyncStorage.getItem('userToken');
      const fetchedUserId = await AsyncStorage.getItem('user_id');
      if (!accessToken || !fetchedUserId) {
        setError('사용자를 찾지 못했어요 😶');
        setIsLoading(false);
        return;
      }
      setUserId(fetchedUserId);
    };
    initFunctions();
  }, []);

  useEffect(() => {
    if (userId) {
      const fetchDataAndCalculate = async () => {
        const accessToken = await AsyncStorage.getItem('userToken');
        const instagramData = await fetchInstagramPosts(accessToken);
        if (instagramData && instagramData.data) {
          const extractedTags = extractHashTags(instagramData.data);
          setHashTags(extractedTags);
          await saveHashtagsToServer(userId, extractedTags);  // 해시태그를 서버로 저장
          await fetchRandomUsers(extractedTags);
        } else {
          setError('인스타그램으로부터 정보를 받아오지 못했어요 😶');
        }
        setIsLoading(false);
      };
      fetchDataAndCalculate();
    }
  }, [userId]);

  const saveHashtagsToServer = async (userId, hashtags) => {
    try {
      const response = await fetch(`${baseURL}:8080/api/instagram/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, hashtags: JSON.stringify(hashtags) }),  // 해시태그를 JSON 문자열로 변환
      });

      if (!response.ok) {
        throw new Error('Failed to save hashtags');
      }

      const data = await response.json();
      console.log('Hashtags saved successfully:', data);
    } catch (error) {
      console.error('Error saving hashtags:', error);
      setError('해시태그를 저장하는 중 오류가 발생했습니다.');
    }
  };

  const fetchRandomUsers = async (userHashtags) => {
    try {
      const response = await fetch(`${baseURL}:8080/api/random-users?userId=${userId}`);  // userId를 쿼리 파라미터로 전달
      if (!response.ok) {
        throw new Error('랜덤 사용자를 불러오는 데 실패했습니다');
      }
      const usersData = await response.json();
      const users = usersData.map(user => {
        const regex = /"([^"]*)"/g;
        let hashtags = [];
        let match;
        while (match = regex.exec(user.Hashtags)) {
          hashtags.push(match[1]);
        }
        return {
          id: user.User_id,
          name: user.Username,
          hashtags: hashtags
        };
      });
      setSimilarUsers(users);
      await calculateSimilarities(users, userHashtags, userId);
    } catch (error) {
      console.error('랜덤 사용자 정보를 불러오는 중 에러 발생:', error.message);
      setError('랜덤 사용자 정보를 불러오는 데 에러 발생');
    }
  };

  const saveSimilarityToDatabase = async (userId1, userId2, similarity) => {
    try {
      const response = await fetch(`${baseURL}:8080/api/save-similarity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId1: userId1,
          userId2: userId2,
          similarity: similarity
        })
      });

      // Log the response status and possibly the text
      console.log('Response Status:', response.status);
      const responseText = await response.text(); // Get response as text to check if it's valid JSON
      try {
        const responseData = JSON.parse(responseText); // Try parsing text as JSON
        if (response.ok) {
          console.log('Similarity saved:', responseData);
        } else {
          throw new Error(responseData.message || 'Failed to save similarity');
        }
      } catch (jsonError) {
        console.error('Failed to parse response:', responseText); // Log raw text if parsing fails
        throw new Error('Server returned non-JSON response');
      }
    } catch (error) {
      console.error('Error saving similarity:', error);
    }
  };

  const calculateSimilarities = async (users, userHashtags, userId) => {
    const similarityPromises = users.map(user => {
      return fetch(`${baseURL}:6000/similarity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          hashtags_user1: userHashtags,
          hashtags_user2: user.hashtags
        })
      }).then(res => res.json())
        .then(data => {
          saveSimilarityToDatabase(userId, user.id, data.total_similarity);
          setHighSimilarityTags(prev => ({
            ...prev,
            [user.id]: data.original_high_similarity_tags_user2  // 원래 한국어 해시태그를 사용
          }));
          return { userId: user.id, similarity: data.total_similarity };
        }).catch(error => {
          console.error(`Error fetching similarity for user ${user.id}:`, error);
          return { userId: user.id, similarity: 0 };
        });
    });

    const results = await Promise.all(similarityPromises);
    results.forEach(result => {
      setUserSimilarities(prev => ({
        ...prev,
        [result.userId]: result.similarity
      }));
    });
  };

  const extractHashTags = (data) => {
    let tagsSet = new Set();
    data.forEach(post => {
      const postCaption = post.caption || '';
      const postTags = postCaption.match(/#([^\s#]+)/g) || [];
      postTags.forEach(tag => {
        if (tag.length > 1) {
          tagsSet.add(tag.substring(1));
        }
      });
    });
    return Array.from(tagsSet);
  };

  const handleNavigateToAnalysis = () => {
    navigation.navigate('이상형분석', { userId, randomUsersData: similarUsers });
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF9CB4" />
            <Text style={styles.loadingText}>매칭상대 해시태그 분석중...</Text>
          </View>
        ) : (
          <>
            {error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.section}>
              <View style={styles.card}>
                <Text style={styles.title}>OneT가 분석한 {userId}님의 해시태그입니다!</Text>
                <View style={styles.hashTagContainer}>
                  <HashTagCloud hashTags={hashTags} />
                </View>
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.subTitle}>매칭을 위한 사용자들의 해시태그 분석 결과:</Text>
              {similarUsers.map((user, index) => (
                <View key={index} style={styles.userCard}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <HashTagCloud hashTags={highSimilarityTags[user.id] || []} />
                  <Text style={styles.userSimilarity}>유사도: {userSimilarities[user.id] !== undefined ? `${(userSimilarities[user.id] * 100).toFixed(2)}%` : '계산 중...'}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={handleNavigateToAnalysis} style={styles.button}>
              <Text style={styles.buttonText}>이상형 분석</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    paddingTop: status_top + 20,
    backgroundColor: '#ffe4e1',
  },
  container: {
    flex: 1,
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
  section: {
    flex: 1,
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  hashTagContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
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
  userSimilarity: {
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

export default HashTest;