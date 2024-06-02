import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { fullWidth, nodeUrl } from '../../../deviceSet'; // 노드서버 요청 URL
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

const PerfectProfile = ({ selectedImageUrl }) => {
  const navigation = useNavigation();
  const [content, setContent] = useState('');
  const [complete, setComplete] = useState(false);
  const userId = useSelector((state) => state.instaUserData.User_id);
  const imageUrl = useSelector((state) => state.colorAnalysisData.imageUrl);
  console.log("이미지 url 확인하기", imageUrl);

  const fetchUserContent = async () => {
    try {
      const response = await fetch(`${nodeUrl}/getUserContent`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.content) {
        setContent(data.content);
      } else {
        console.error('No content returned');
      }
    } catch (error) {
      console.error('Error fetching user content:', error);
    }
  };

  useEffect(() => {
    fetchUserContent();
  }, []);

  useEffect(() => {
    if (complete) {
      setComplete(false);
      navigation.navigate("자기소개서매칭");
    }
  }, [complete]);

  const saveImageUrlintoDB = async () => {
    try {
      const response = await fetch(`${nodeUrl}/profile/saveimage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, imageUrl })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log(data);
      Alert.alert('Success', data.message);
      setComplete(true);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save image URL');
    }
  };

  return (
    <View style={{ flex: 10 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
        <View style={styles.overlay}>
          <Text style={styles.contentText}>{content}</Text>
        </View>
        
        <View style={{ alignSelf: "flex-end", borderRadius: 10, backgroundColor: "#fff", width: 100, height: 30, alignItems: "center", justifyContent: "center" }}>
          <TouchableOpacity>
            <Text>자세히 보러가기</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => { saveImageUrlintoDB(); }} 
          style={styles.button}>
          <View style={styles.buttonBackground}>
            <Text style={styles.buttonText}>마음에 들어요!!</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#424242', // 배경색 변경
  },
  image: {
    position: "absolute",
    width: fullWidth,
    height: fullWidth * 1.5,
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: fullWidth * 0.4,
    backgroundColor: 'rgba(255,255,255,0.6)', // 배경색을 반투명으로 설정
    borderRadius: 10
  },
  contentText: {
    color: '#000',
    fontSize: 16,
    textAlign: 'center',
    padding: 10,
  },
  button: {
    width: 200,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: fullWidth * 0.8
  },
  buttonBackground: {
    backgroundColor: '#F06292',
    width: 150,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700"
  }
});

export default PerfectProfile;
