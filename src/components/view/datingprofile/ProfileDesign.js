import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { nodeUrl, flaskUrl } from '../../../deviceSet'; // 플라스크 서버, 노드서버 요청 URL
import Slider from '@react-native-community/slider';
import { useSelector, useDispatch } from 'react-redux';
import {select_image_url} from '../../../reduxContainer/action/colorAnalysisData'

const ProfileDesign = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState([]); // 이미지 URL을 저장할 상태
  const [responseData, setResponseData] = useState(null);
  const [opacity, setOpacity] = useState(1); // 투명도를 조절하기 위한 state
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);// 이미지 선택을 할때 받는 state
  const dispatch = useDispatch();
  const iamgeurl = useSelector((state)=>state.colorAnalysisData.imageUrl);
  console.log("시작한디", iamgeurl);
  const colorAnalysisResult = useSelector((state)=> state.colorAnalysisData); //이미지 분석 결과를 받아오는 함수 
  const userId = colorAnalysisResult.User_id; // 사용자 ID를 가져오는 함수 
//rgb값을 hexcode로 변환하는 함수 
  function rgbToHex(rgbString) {
    const [r, g, b] = rgbString.match(/\d+/g).map(Number);
    const toHex = c => {
      const hex = c.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }
//이미지를 요청하는 함수
  const fetchImages = async (color, mood, type, size) => {
    console.log("이미지 생성 입력데이터 확인 색", color);// 색 데이터 확인
    console.log("이미지 생성 입력데이터 확인 분위기", mood); //분위기 데이터 확인
    setIsLoading(true); // 로딩 시작
    try {
      const response = await fetch(`${flaskUrl}/generate_design`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          color: color,
          feature: mood,
          type: type,
          size: size
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json(); // 서버 응답에서 JSON 데이터 파싱
      console.log('uri 확인', data);
      setImageUrls(data.image_urls); // 상태 업데이트
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };

  useEffect(()=>{
    if(responseData != null){
      fetchImages(responseData.color, responseData.feature, responseData.type, responseData.size);
    } else {
      setResponseData({
        color: rgbToHex(colorAnalysisResult.average_color),
        feature: colorAnalysisResult.mood_symbol,
        type: "high quality",
        size: "1024x1024"
      })
    }
  },[responseData]);

  const renderSelectable = (url, index) => {
    return (
      <TouchableOpacity key={index} onPress={() => { 
        setSelectedImageIndex(index);
        dispatch(select_image_url(url));
      }}>
        <Image source={{ uri: url }} style={[styles.image, { opacity: selectedImageIndex === index ? opacity : 1 }]} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <Text>Loading...</Text>
      ) : (
        <View style={styles.resultsContainer}>
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            {imageUrls.map((url, index) => {
              console.log(url);
              return renderSelectable(url, index);
            })}
          </View>
          {selectedImageIndex !== null && (
            <View style={styles.selectedContainer}>
              <Image
                source={{ uri: imageUrls[selectedImageIndex] }}
                style={[styles.selectedImage, { opacity: opacity }]}
              />
              <View style={styles.sliderContainer}>
                <Text>투명도 조절</Text>
                <Slider
                  style={{ width: 200, height: 40 }}
                  minimumValue={0}
                  maximumValue={1}
                  minimumTrackTintColor="#FFA07A"
                  maximumTrackTintColor="#000000"
                  thumbTintColor="#FFA07A"
                  value={opacity}
                  onValueChange={setOpacity}
                />
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  resultsContainer: {
    marginTop: 10,
  },
  image: {
    width: 150,
    height: 200,
  },
  selectedContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  selectedImage: {
    width: 250,
    height: 350,
    marginBottom: 20,
  },
  sliderContainer: {
    alignItems: 'center',
  },
});

export default ProfileDesign;
