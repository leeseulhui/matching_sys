import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchInstagramMedia } from '../fetchInstagramPosts';
import { baseURL, flaskUrl } from '../../deviceSet';
import { useSelector } from 'react-redux'; //리덕스의 저장된 상태를 꺼내는 훅

const InstagramScreen = () => {
  const navigation = useNavigation(); //네비게이션 훅
  const [imageUrls, setImageUrls] = useState([]); //이미지 피드 url 저장 배열
  const [selectedImages, setSelectedImages] = useState([]); // 선택된 이미지의 배열
  const [loading, setLoading] = useState(false); // 로딩 스테이트
  const [loadingText, setLoadingText] = useState(''); //이거는 쓰는데가 없어 보이는데
  //유저정보
  const userId = useSelector((state) => state.instaUserData.User_id);
  const accessToken = useSelector((state) => state.instaUserData.auth_token);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!accessToken) {
          console.log('Access token not found');
          return;
        }

        const data = await fetchInstagramMedia(accessToken); //인스타 그램 게시물 가져오는 url
        if (data && data.data) {
          const urls = data.data
            .filter(item => {
              if (!item.media_url) {
                console.log('Missing media_url:', item);
                return false;
              }
              return true;
            }) // media_url이 없는 항목을 필터링
            .map(item => {
              try {
                return item.media_url.replace(/"/g, "");
              } catch (error) {
                console.error('Error replacing media_url:', item.media_url, error);
                return null;
              }
            })
            .filter(url => url !== null); // null 값을 필터링

          setImageUrls(urls);
        }
      } catch (error) {
        console.error('Error fetching Instagram data:', error);
      }
    };

    fetchData();
  }, [accessToken]);

  // 이미지 선택했을 때 동작하는 함수
  const handleImageSelect = (imageUrl) => {
    if (selectedImages.includes(imageUrl)) {
      setSelectedImages(prevImages => prevImages.filter(item => item !== imageUrl));
    } else {
      if (selectedImages.length >= 5) {
        //최대 5개까지 넘으면 알림을 준다
        Alert.alert('Error', 'You can only select up to 5 images.');
      } else {
        //5개가 넘지 않으면 이걸 수행
        setSelectedImages(prevImages => [...prevImages, imageUrl]);
      }
    }
  };

  // 인스타 그램 피드 나열하는 렌더링 함수
  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleImageSelect(item)} style={[styles.imageContainer, selectedImages.includes(item) ? styles.selectedImage : styles.unselectedImage]}>
      <Image source={{ uri: item }} style={styles.image} />
    </TouchableOpacity>
  );

  //색감 분석하는 코드
  const saveImagesToDatabase = async () => {
    setLoading(true); // 로딩 시작

    try {
      const response = await fetch(`${flaskUrl}/analyze_colors`, {
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
      navigation.navigate('인스타그램피드결과', { analysisResults: jsonResponse }); //결과물이 영어로 나옴
    } catch (error) {
      console.error('Error analyzing images:', error);
      Alert.alert('Error', 'Failed to analyze images.');
    } finally {
      setLoading(false); //색감 분석이 종료되면 로딩 종료
    }
  };

  // 로딩 중일 떄 나타나는 창
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9CB4" />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  /// 여기 부터가 본 함수 리턴 값
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
