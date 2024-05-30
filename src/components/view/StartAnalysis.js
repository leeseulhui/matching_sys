import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { fetchInstagramMedia } from '../fetchInstagramPosts';
import { TouchableOpacity } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { flaskUrl } from '../../deviceSet';
const StartAnalysis = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const analyzeImages = async () => {
    const userId = await AsyncStorage.getItem('user_id');
    const accessToken = await AsyncStorage.getItem('userToken');
    if (!userId || !accessToken) {
      Alert.alert('Error', 'User ID or Instagram access token is not set.');
      return;
    }

    setLoading(true);

    try {
      const data = await fetchInstagramMedia(accessToken);
      if (data && data.data) {
        const imageUrls = data.data.map(item => ({
          media_url: item.media_url.replace(/"/g, ""),
          media_type: item.media_type
        }));
        
        const response = await axios.post(`${flaskUrl}/api/analyze-batch`, {
          userId: userId,
          imageUrls: imageUrls
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('Captions received and saved:', response.data.captions);
        setLoadingText('첫 번째 분석이 완료되었어요! 좀 더 자세한 분석으로 넘어가볼까요?');
        
        setTimeout(() => {
          navigation.navigate('인스타그램피드'); // 색감 분석 페이지로 이동
        }, 2000);
      }
    } catch (error) {
      console.error('Error analyzing images:', error);
      Alert.alert('Error', 'Failed to analyze images.');
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#ff9a9e', '#fad0c4']}
      style={styles.background}
    >
      <View style={styles.container}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </>
        ) : (
          <>
            <Text style={styles.message}>원트소개서를 만들러 떠나볼까요?</Text>
            <TouchableOpacity style={styles.button} onPress={analyzeImages}>
              <LinearGradient
                colors={['#ff758c', '#ff7eb3']}
                style={styles.gradient}
              >
                <Text style={styles.buttonText}>Start</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 20,
    marginBottom: 40,
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  button: {
    marginTop: 80,
    borderRadius: 25,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default StartAnalysis;