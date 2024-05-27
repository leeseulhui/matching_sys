//데이팅소개서 + 선택한 디자인 합해서 보여주는 부분

import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { nodeUrl } from '../../../deviceSet'; // 노드서버 요청 URL

const PerfectProfile = ({ selectedImageUrl, userId }) => {
  const [content, setContent] = useState('');

  // 사용자의 데이팅 소개서 내용을 가져오는 함수
  const fetchUserContent = async () => {
    try {
      const response = await fetch(`${nodeUrl}/getUserContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
  
      // 응답 상태 확인
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();  // 서버 응답에서 JSON 데이터 파싱
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: selectedImageUrl }} style={styles.image} />
      <View style={styles.overlay}>
        <Text style={styles.contentText}>{content}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // 배경색을 반투명으로 설정
  },
  contentText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    padding: 10,
  },
});

export default PerfectProfile;
