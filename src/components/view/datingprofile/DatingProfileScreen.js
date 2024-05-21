import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { useSelector } from 'react-redux';

//분류 카테고리
const categories = ['사랑', '일', '식사', '놀이', '사고'];

// 이전 버튼, 다음버튼 완료 버튼 , 이것도 마지막에는 끝나고 로딩화면 나와야 될듯, 버튼 사용못하도록 막기
const HeaderButtons = ({ onPrevious, onNext, isLastQuestion }) => {
  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity style={styles.button} onPress={onPrevious}>
        <Text style={styles.buttonText}>이전</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onNext}>
        <Text style={styles.buttonText}>{isLastQuestion ? '완료' : '다음'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const DatingProfileScreen = ({ navigation }) => {
  const [answer, setAnswer] = useState('');
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const userId = useSelector((state)=>state.instaUserData.User_id); // 내 현재 데이터
  // 프롬프트 작성을 위한 질문지
  const questions = {
    사랑: [
      { question: "이상적인 연인의 가장 중요한 특성은 무엇인가요?", options: ["성격", "가치관", "생활 방식", "기타"] },
      { question: "어떤 상황에서 연인에게 가장 큰 매력을 느끼나요?", options: ["대화가 잘 통할 때", "특정 행동", "외면이 이상형과 맞을 때", "기타"] },
    ],
    일: [
      { question: "직업에 있어 가장 중요하다고 생각하는 것은 무엇인가요?", options: ["급여", "워라벨", "사회적 인정", "자기계발", "기타"] },
    ],
    식사: [
      { question: "어떤 유형의 음식을 선호하나요?", options: ["한식", "중식", "일식", "양식", "기타"] },
    ],
    놀이: [
      { question: "여가 시간에 주로 무엇을 하나요?", options: ["영화 보기", "책 읽기", "운동", "여행", "기타"] },
    ],
    사고: [
      { question: "일상에서 마주하는 문제를 해결할 때 어떤 방식을 선호하나요?", options: ["계획적으로", "즉흥적으로", "주변의 조언을 구해서", "기타"] },
      { question: "인생에서 가장 중요한 가치는 무엇인가요?", options: ["가족", "친구", "성공", "명예", "건강"] },
    ]
  };

  const baseURL = Platform.select({
    ios: 'http://localhost:6000',
    android: 'http://10.0.2.2:6000'
  });
//플라스크에서 디비 요청을 하는 코드
// 연결실패시 500 반환, 
  const handleSaveResponse = async (dataToSend) => {
    const saveResponseUrl = `${baseURL}/save_response`;
    try {
      const saveResponse = await axios.post(saveResponseUrl, dataToSend, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Save response:', saveResponse);
      if (saveResponse.status !== 200) {
        throw new Error('Failed to save responses');
      }
      return true;
    } catch (error) {
      console.error('Error saving responses:', error);
      Alert.alert('Error', 'Failed to save responses, please try again.');
      return false;
    }
  };
  // 원트소개서 생성 함수 
  const handleGenerateIntroduction = async (dataToSend) => {
    //원트소개서 엔드포인트 변수화
    const generateIntroUrl = `${baseURL}/generate_introduction`;
    try {
      // 원트소개서 응답
      const generateIntroResponse = await axios.post(generateIntroUrl, dataToSend, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      //생성 결과 출력 
      console.log('Generate introduction response:', generateIntroResponse);
      if (generateIntroResponse.status === 200) {
        // 성공했을 시 스타일과 함께 유저id 전달
        navigation.navigate('데이팅테스트결과', {
          datingStyle: selectedStyles,
          userId: userId
        });
      } else {
        //생성 실패
        throw new Error('Failed to generate introduction');
      }
    } catch (error) {
      console.error('Error generating introduction:', error);
      Alert.alert('Error', 'Failed to generate introduction, please try again.');// 실패 알림
    }
  };
  // 마지막 문항인데 모든 질문에 답하지 않았을 경우 실행되는 함수
  const handleSubmit = async () => {
    if (selectedStyles.length === 0) {
      Alert.alert('Error', 'Please answer all the questions.');
      return;
    }
  //???? 왜
    const dataToSend = {
      userId: userId ,
      responses: selectedStyles
    };

    console.log('Sending data:', dataToSend);
    //데이터 저장 함수 실행
    const saveSuccessful = await handleSaveResponse(dataToSend);
    if (saveSuccessful) {
      await handleGenerateIntroduction(dataToSend);
    }
  };

  const handleSelectOption = (option) => {
    setAnswer(option);
  };

  const handleNext = () => {
    if (!answer) {
      Alert.alert('Error', 'Please select an option before proceeding.');
      return;
    }
    //카테고리 번호따라서 번호, 선택항목 저장
    const newSelection = { 
      category: categories[currentCategoryIndex], 
      question_index: currentQuestionIndex, 
      answer 
    };
    // 이것으로 갱신,  다음 버튼 누를때 마다 
    setSelectedStyles(prev => [...prev, newSelection]);

    if (currentQuestionIndex < questions[categories[currentCategoryIndex]].length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentCategoryIndex < categories.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
      setCurrentQuestionIndex(0);
    } else {
      handleSubmit();
    }
    setAnswer('');
  };
//이전으로 갈때 누르는 함수
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1);
      setCurrentQuestionIndex(questions[categories[currentCategoryIndex - 1]].length - 1);
    }
    setAnswer('');
  };

  return (
    <LinearGradient
      colors={['#FFAFBD80', '#FFC3A080']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.questionContainer}>
          <Text style={styles.questionIcon}>Q.</Text>
          <Text style={styles.questionText}>{questions[categories[currentCategoryIndex]][currentQuestionIndex].question}</Text>
        </View>
        {questions[categories[currentCategoryIndex]][currentQuestionIndex].options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.optionButton, answer === option ? styles.optionSelected : styles.optionButton]}
            onPress={() => handleSelectOption(option)}
          >
            <Text style={[styles.optionText, answer === option ? styles.optionTextSelected : styles.optionTextUnselected]}>{option}</Text>
          </TouchableOpacity>
        ))}
        <HeaderButtons
          onPrevious={handlePrevious}
          onNext={handleNext}
          isLastQuestion={currentCategoryIndex === categories.length - 1 && currentQuestionIndex === questions[categories[currentCategoryIndex]].length - 1}
        />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 70,
    flexWrap: 'wrap', 
  },
  questionIcon: {
    fontSize: 25,
    fontWeight: 'bold',
    color: 'black',
    marginRight: 10,
    marginBottom: 10,
  },
  questionText: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  optionButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 10,
  },
  optionTextUnselected: {
    color: 'gray',
    fontSize: 16,
  },
  optionTextSelected: {
    color: '#FF4C65',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 50,
  },
  button: {
    backgroundColor: 'transparent',
    padding: 20,
    borderRadius: 5,
    width: '50%',
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default DatingProfileScreen;