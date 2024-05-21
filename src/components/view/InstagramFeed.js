// 인스타그램 피드 분석시 필요한 이미지 선택 페이지
import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { fetchInstagramMedia } from '../fetchInstagramPosts';

const InstagramScreen = () => {
  const navigation = useNavigation();
  const [imageUrls, setImageUrls] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const baseURL = Platform.select({
    ios: 'http://localhost:6000',
    android: 'http://10.0.2.2:6000'
  }); 
  useEffect(() => {
    const fetchData = async () => {
      try {
        const accessToken = await AsyncStorage.getItem('userToken');
        if (!accessToken) {
          console.log('Access token not found');
          return;
        }

        const data = await fetchInstagramMedia(accessToken);
        if (data && data.data) {
          const urls = data.data.map(item => item.media_url.replace(/"/g, ""));
          setImageUrls(urls);
        }
      } catch (error) {
        console.error('Error fetching Instagram data:', error);
      }
    };

    fetchData();
  }, []);

  const handleImageSelect = (imageUrl) => {
    if (selectedImages.includes(imageUrl)) {
      setSelectedImages(prevImages => prevImages.filter(item => item !== imageUrl));
    } else {
      if (selectedImages.length >= 5) {
        Alert.alert('Error', 'You can only select up to 5 images.');
      } else {
        setSelectedImages(prevImages => [...prevImages, imageUrl]);
      }
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleImageSelect(item)} style={[styles.imageContainer, selectedImages.includes(item) ? styles.selectedImage : styles.unselectedImage]}>
      <Image source={{ uri: item }} style={styles.image} />
    </TouchableOpacity>
  );

  const saveImagesToDatabase = async () => {
    const userId = await AsyncStorage.getItem('user_id');
    setLoading(true);
  
    try {
      const response = await fetch(`${baseURL}/analyze_colors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          imageUrls: selectedImages,
        }),
      });
  
      if (!response.ok) {
        const errorResponse = await response.text();
        console.error('Server response:', errorResponse);
        throw new Error('Server responded with an error: ' + response.status);
      }
  
      const jsonResponse = await response.json();
      navigation.navigate('인스타그램피드결과', { analysisResults: jsonResponse });
    } catch (error) {
      console.error('Error analyzing images:', error);
      Alert.alert('Error', 'Failed to analyze images.');
    } finally {
      setLoading(false);
    }
  };
  

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9CB4" />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>사진들이 굉장히 멋있군요 😎{"\n"}분석하고 싶은 이미지를 5장까지 선택해주세요!</Text>
      <FlatList
        data={imageUrls}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        numColumns={3}
      />
      <TouchableOpacity onPress={saveImagesToDatabase} style={styles.button}>
        <Text style={styles.buttonText}>선택 완료</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center', // 수직으로 중앙 배치
    alignItems: 'center', // 수평으로 중앙 배치
    backgroundColor: '#F7F7F7', // 배경색 추가
  },
  header: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 20,
    marginTop: 60, 
    color: '#333', 
  },
  imageContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  unselectedImage: {
    opacity: 0.5,
  },
  selectedImage: {
    opacity: 1,
  },
  button: {
    backgroundColor: '#FF9CB4',
    padding: 15,
    borderRadius: 10,
    margin: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18, 
    color: '#333', 
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default InstagramScreen;