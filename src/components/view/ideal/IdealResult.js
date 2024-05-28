import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import LinearGradient from 'react-native-linear-gradient';
import {image} from '../../../../assets/image'

const IdealResult = ({ navigation, route }) => {
  const { selectedOptions, username: initialUsername } = route.params;
  const [results, setResults] = useState([]);
  const [username, setUsername] = useState(initialUsername); 

  useEffect(() => {
    const fetchMatchedUsers = async () => {
      const url = `http://localhost:8080/matchUsers?userID=${encodeURIComponent('7506894859370827')}`;
      try {
        const response = await axios.get(url);
        setResults(response.data);
        if (response.data.length > 0) {
          setUsername(response.data[0].Username);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        Alert.alert('오류', `사용자 정보를 불러오는 중 오류가 발생했습니다: ${error.message}`);
      }
    };
  
    fetchMatchedUsers();
  }, []);

  const startChat = () => {
    navigation.navigate('채팅시작');
  };
  
  return (
    <LinearGradient colors={['#FFC3A080', '#FFAFBD80']} style={styles.container}>
      <Text style={styles.title}>💘 {username} 님과 잘 어울려요 !</Text>
      <Text style={styles.subtitle}>질문에 대한 답변을 기반으로 유사도가 높은 분들을 추천해드려요.</Text>
      <ScrollView style={styles.scrollView}>
        {results.map((result, index) => (
          <View key={index} style={styles.resultCard}>
            <Image style={styles.profilePic} source={{ uri: result.User_profile_image || 'default_profile_picture_url' }} />
            <View style={styles.textContainer}>
              <Text style={styles.name}>{result.Username || '알 수 없음'}</Text>
              <Text style={styles.details}>유사도: {result.satisfaction || 0}%</Text>
              <Text style={styles.details}>취미: {result.tags ? result.tags.join(', ') : 'None'}</Text>
            </View>
            <TouchableOpacity onPress={startChat}>
              <Image source={image.chat} style={styles.chatIcon} />  
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 50,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  scrollView: {
    width: '100%',
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 3,
    justifyContent: 'space-between', 
  },
  chatIconContainer: {
    marginLeft: 'auto', 
  },
  chatIcon: {
    width: 40,
    height: 40,
  },
  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  details: {
    fontSize: 14,
  },
});

export default IdealResult;