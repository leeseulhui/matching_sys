//원트소개서 디자인 검색하는 부분(검색창에 분석한 피드 분위기 결과값 들어가주어야 함)
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image} from 'react-native';
import { baseURL } from '../../../deviceSet';
import { useSelector } from 'react-redux';

const ProfileDesign = () => {
  //const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState([]); // 이미지 URL을 저장할 상태
  const [responseData, setResponseData] = useState(null);
  //  사용자  id를 가져오는 훅
  //const userId = useSelector((state) => state.instaUserData.User_id);
  const userId = 7389320737824274;// 나중에 위의 코드랑 교체.
  console.log("사용자 id",userId);
  // db에서 사용자의 주 색상 과 사용자의 분위기를 가져오는 함수 
  const fetchUserMood = async ()=>{
    try{
      const response =await fetch(`${baseURL}:8080/insta/feed/color`,{
        method: 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({userId})
      })
      const data= await response.json();
      console.log("사용자 분위기",data);
      const color = rgbToHex(data[0].average_color);
      const mood = data[0].mood_symbol
      console.log('색상코드',color);
      setResponseData({
        color: color, // 예시 색상 코드
        feature: mood, // 예시 기분
        type: "high quality", // 예시 품질 유형
        size: "1024x1024" // 예시 크기
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }
  function rgbToHex(rgbString) {
    const [r, g, b] = rgbString.match(/\d+/g).map(Number);
    const toHex = c => {
      const hex = c.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  

  // 이미지를 서버에서 가져오는 함수
  const fetchImages = async (color, mood) => {
    setIsLoading(true); // 로딩 시작
    try {
      const response = await fetch('http://localhost:6000/generate_design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          color: color, // 예시 색상 코드
          feature: mood, // 예시 기분
          type: "high quality", // 예시 품질 유형
          size: "1024x1024" // 예시 크기
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json(); // 서버 응답에서 JSON 데이터 파싱
      console.log('uri 확인',data);
      setImageUrls(data.image_urls); // 상태 업데이트
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };

  // 컴포넌트 마운트 시 이미지를 자동으로 가져오도록 설정
  useEffect(() => {
    responseData ==null? fetchUserMood():fetchImages(responseData.color, responseData.mood);
  }, [responseData]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Search Design 🩷</Text>
      {isLoading ? (
        <Text>Loading...</Text>
      ) : (
        <View style={styles.resultsContainer}>
          <View style={{flexDirection:"row", justifyContent:"space-around"}}>
          {imageUrls.map((url, index)=>{
            console.log(url);
            return (
            <Image key={index} source ={{uri: url}} style={{width:150, height:200}}/>)})
          }
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF1E6',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF715B', 
    marginTop : 50,
    marginBottom: 20,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    height: 40,
    borderColor: '#FFC0CB', 
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    color: '#333', 
    backgroundColor: '#FFF', 
  },
  resultsContainer: {
    marginTop: 10,
  },
  resultItem: {
    padding: 10,
    backgroundColor: '#FFDEEC', 
    borderRadius: 8,
    marginBottom: 10,
  },
  resultText: {
    color: '#FF715B', 
    fontSize: 16,
  },
});

export default ProfileDesign;