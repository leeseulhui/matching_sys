import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { baseURL } from '../../deviceSet';
import { useSelector } from 'react-redux';
import { useRoute } from '@react-navigation/native';

const Similarity = () => {
  const route = useRoute();
  const { userId, randomUserIds } = route.params;
  const user = useSelector((state) => state.instaUserData);
  const profileImage1 = user.User_profile_image;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false); // Flag to indicate if analysis is done

  useEffect(() => {
    const fetchUserProfilesAndAnalyze = async () => {
      setLoading(true);
      try {
        const results = [];
        for (const randomUserId of randomUserIds) {
          console.log(`Requesting profile image for userId: ${randomUserId}`);
          const response = await fetch(`${baseURL}:8080/api/user-profile?userId=${randomUserId}`);
          if (!response.ok) {
            throw new Error('사용자 프로필 이미지를 가져오는데 실패했습니다.');
          }
          const data = await response.json();
          console.log('Fetched user profile image:', data.User_profile_image);

          const images = {
            referenceImage: profileImage1,
            testImage: data.User_profile_image,
          };

          const analysisResponse = await fetch('http://localhost:6000/face-similarity', {
            method: 'POST',
            body: JSON.stringify(images),
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const analysisData = await analysisResponse.json();
          if (analysisResponse.ok && analysisData.results && Array.isArray(analysisData.results)) {
            const similarity_score = analysisData.results[0].similarity_score;
            results.push({
              userId: randomUserId,
              profileImage: data.User_profile_image,
              similarity_score: similarity_score,
            });

            // Store the similarity score in the database
            await fetch(`${baseURL}:8080/api/store-similarity`, {
              method: 'POST',
              body: JSON.stringify({
                user_id1: userId,
                user_id2: randomUserId,
                similarity_score: similarity_score,
              }),
              headers: {
                'Content-Type': 'application/json',
              },
            });
          } else {
            throw new Error('Received data is not valid');
          }
        }
        setResults(results);
        setAnalysisDone(true); // Set the flag to true once the analysis is done
      } catch (error) {
        console.error('Error fetching user profiles or analyzing images:', error);
        Alert.alert('Error', '사용자 프로필 이미지를 가져오거나 분석하는 중에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (profileImage1 && !analysisDone) { // Check if analysis is not already done
      fetchUserProfilesAndAnalyze();
    }
  }, [profileImage1, randomUserIds, analysisDone]); // Include analysisDone in dependencies

  return (
    <ScrollView style={styles.container}>
      <View style={styles.photoContainer}>
        <View style={styles.photoButton}>
          <Text style={styles.photoText}>나의 사진</Text>
        </View>
        <View style={styles.photoButton}>
          <Text style={styles.photoText}>상대방의 사진</Text>
        </View>
      </View>
      {loading && <Text>분석중이에요 😵‍💫</Text>}
      {results.map((result, index) => (
        <View key={index} style={styles.resultContainer}>
          <View style={styles.imagePairContainer}>
            <Image source={{ uri: profileImage1 }} style={styles.imagePreview} />
            <Image source={{ uri: result.profileImage }} style={styles.imagePreview} />
          </View>
          <Text style={styles.resultText}>
            User ID: {result.userId} - 우리의 얼굴은 {result.similarity_score.toFixed(2)}% 닮았어요!
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFEDEF',
  },
  photoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  photoButton: {
    backgroundColor: '#FFBFBF',
    padding: 10,
    borderRadius: 20,
  },
  photoText: {
    color: 'white',
    fontSize: 14,
  },
  imagePairContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  imagePreview: {
    width: 180,
    height: 180,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  resultContainer: {
    backgroundColor: '#FFF0F5',
    padding: 20,
    borderRadius: 10,
    marginVertical: 10,
    alignItems: 'center',
  },
  resultText: {
    color: '#333',
    fontSize: 18,
    textAlign: 'center',
  },
});

export default Similarity;