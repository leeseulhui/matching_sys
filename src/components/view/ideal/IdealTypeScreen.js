import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { image } from '../../../../assets/image';
import { baseURL } from "../../../deviceSet";
import AsyncStorage from '@react-native-async-storage/async-storage';

const categories = [
  { key: 'age', name: '나이', options: ['연하', '연상', '동갑'] },
  { key: 'religion', name: '종교', options: ['기독교', '불교', '유교', '원불교', '천도교', '무교', '대종교', '이슬람교', '유대교', '기타', '없음'] },
  { key: 'personality', name: 'MBTI', options: ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'] },
  { key: 'interests', name: '관심사', options: ['여행', '독서', '요리', '영화', '사진', '운동', '자기계발', '기타'] },
  { key: 'attract', name: '매력을 느끼는 행동', options: ['나와 유머 감각이 통할 때', '지적인 대화를 할 때', '외국어를 유창하게 할 때', '새로운 것에 도전할 때', '감정을 잘 절제할 때', '자기 일을 열심히 할 때', '잘 웃을 때', '옷을 잘 입을 때', '예의 바를 때'] }
];

const CategoryPage = ({ category, onOptionSelect, onPrevNext, selectedOption, username }) => {
  return (
    <LinearGradient
      colors={['#373737', '#F2ACAC']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.container}>
       <View style={{flexDirection:"row", alignItems:"flex-end"}}>
        <Text style={{...styles.headerText, fontSize:25}}>{username} </Text>
        <Text style={styles.headerText}>님이 선호하시는{category.name}</Text>
        </View> 
        <Text style={styles.subText}>스타일에 맞는 이상형을 찾아드릴게요.</Text>
        <ScrollView contentContainerStyle={styles.optionsContainer}>
          {category.options.map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.optionButton, selectedOption[category.key] === option ? styles.selectedOption : null]}
              onPress={() => onOptionSelect(category.key, option)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={() => onPrevNext('prev')}>
            <Image source={image.arrowLeft} style={styles.navIcon} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onPrevNext('next')}>
            <Image source={image.arrowRight} style={styles.navIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const IdealType = () => {
  const navigation = useNavigation();
  const [selectedOptions, setSelectedOptions] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [username, setUsername] = useState("Loading");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const id = await AsyncStorage.getItem('user_id');
        setUserId(id);
        fetchUsername(id);
      } catch (error) {
        console.error('Failed to fetch user ID:', error);
      }
    };

    fetchUserData();
  }, []);

  const fetchUsername = async (id) => {
    const url = `${baseURL}:8080/chatname/${id}`;
    console.log('Request URL:', url); // 요청 URL 확인
    try {
      const response = await axios.get(url);
      if (response.data && response.data.Username) {
        setUsername(response.data.Username);  
      } else {
        setUsername('Username not found');
      }
    } catch (error) {
      console.error('Failed to fetch username:', error);
      setUsername('Failed to load username');
    }
  };

  const handleOptionSelect = (categoryKey, option) => {
    const updatedOptions = { ...selectedOptions, [categoryKey]: option };
    setSelectedOptions(updatedOptions); // 상태 업데이트
    proceedToNextPageOrSave(updatedOptions); // 직접 업데이트된 상태를 인자로 전달
  };

  const proceedToNextPageOrSave = (options) => {
    if (currentPage < categories.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      saveIdealType(options); // 최종 상태를 직접 인자로 넘겨 처리
    }
  };

  const handlePrevNext = (direction) => {
    if (direction === 'prev' && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next' && currentPage < categories.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  // 서버 연결 부분
  const saveIdealType = async (options) => {
    if (!userId) {
      console.error('User ID is not available');
      return;
    }

    console.log('Saving options:', options);
    const url = `${baseURL}:8080/IdealTypes`; 
    try {
      const response = await axios.post(url, {
        UserID: userId,
        ...options
      });
      console.log('Response from server:', response.data);
      navigation.navigate('소개서완성본');
    } catch (error) {
      console.error('Error saving ideal type:', error.response ? error.response.data : error);
    }
  };

  return (
    <CategoryPage
      category={categories[currentPage]}
      onOptionSelect={handleOptionSelect}
      onPrevNext={handlePrevNext}
      selectedOption={selectedOptions}
      username={username}
    />
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'left',
    color: '#FFFFFF',
    marginBottom: 10,  
  },
  subText: {
    fontSize: 14,
    color: '#F5F5F5',
    textAlign: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 50,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    width: '100%',
    paddingBottom: 50, 
  },
  optionButton: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 40,
    paddingVertical: 8,
    paddingHorizontal: 20,
    margin: 7,
    width: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',  
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#FFC0CB', 
    color: '#fff' 
  },
  optionText: {
    fontSize: 15, 
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,  // 버튼 컨테이너 상단 마진
    paddingHorizontal: 20,
  },
  navIcon: {
    width: 30,
    height: 30
  }
});

export default IdealType;