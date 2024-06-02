import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, TextInput } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { flaskUrl } from '../../../deviceSet';
import { useSelector } from 'react-redux';
const categories = ['사랑', '일', '식사', '놀이', '사고'];

const HeaderButtons = ({ onPrevious, onNext, isLastQuestion, onSkip }) => {
  return (
    <View style={styles.buttonContainer}>
      <View style={styles.navButtonsContainer}>
        <TouchableOpacity style={styles.button} onPress={onPrevious}>
          <Text style={styles.buttonText}>이전</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onNext}>
          <Text style={styles.buttonText}>{isLastQuestion ? '완료' : '다음'}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
        <Text style={styles.skipButtonText}>건너뛰기</Text>
      </TouchableOpacity>
    </View>
  );
};

const DatingProfileScreen = ({ navigation }) => {
  const [answer, setAnswer] = useState('');
  const [otherAnswer, setOtherAnswer] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const userId = useSelector((state) => state.instaUserData.User_id);

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

  const handleSaveResponse = async (dataToSend) => {
    const saveResponseUrl = `${flaskUrl}/save_response`;
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

  const handleGenerateIntroduction = async (dataToSend) => {
    const generateIntroUrl = `${flaskUrl}/generate_introduction`;
    try {
      const generateIntroResponse = await axios.post(generateIntroUrl, dataToSend, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Generate introduction response:', generateIntroResponse);
      if (generateIntroResponse.status === 200) {
        navigation.navigate('데이팅테스트결과', {
          datingStyle: selectedStyles,
          userId: userId
        });
      } else {
        throw new Error('Failed to generate introduction');
      }
    } catch (error) {
      console.error('Error generating introduction:', error);
      Alert.alert('Error', 'Failed to generate introduction, please try again.');
    }
  };

  const handleSubmit = async () => {
    if (selectedStyles.length === 0) {
        Alert.alert('Error', 'Please answer all the questions.');
        return;
    }

    const dataToSend = {
        userId: userId,
        responses: selectedStyles
    };

    console.log('Sending data:', dataToSend);

    const saveSuccessful = await handleSaveResponse(dataToSend);
    if (saveSuccessful) {
        await handleGenerateIntroduction(dataToSend);
    }
};


  const handleSelectOption = (option) => {
    if (option === '기타') {
      setIsOtherSelected(true);
      setAnswer('기타');
    } else {
      setIsOtherSelected(false);
      setAnswer(option);
    }
  };

  const handleNext = () => {
    const finalAnswer = answer === '기타' ? otherAnswer : answer;

    if (answer === '기타' && !finalAnswer.trim()) {
      Alert.alert('Error', 'Please enter your answer.');
      return;
    }

    const newSelection = { 
      category: categories[currentCategoryIndex], 
      question_index: currentQuestionIndex, 
      answer: finalAnswer 
    };

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
    setOtherAnswer('');
  };


  const handleSkip = () => {
    setAnswer('');
    setOtherAnswer('');
    setIsOtherSelected(false);

    if (currentQuestionIndex < questions[categories[currentCategoryIndex]].length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentCategoryIndex < categories.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
      setCurrentQuestionIndex(0);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1);
      setCurrentQuestionIndex(questions[categories[currentCategoryIndex - 1]].length - 1);
    }
    setAnswer('');
    setOtherAnswer('');
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
        {isOtherSelected && (
          <TextInput
            style={styles.otherInput}
            placeholder="기타 내용을 입력하세요"
            value={otherAnswer}
            onChangeText={setOtherAnswer}
          />
        )}
        <HeaderButtons
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSkip={handleSkip}
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
    alignItems: 'center',
    marginTop: 20,
  },
  navButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    backgroundColor: 'transparent',
    padding: 20,
    borderRadius: 5,
    width: '40%',
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  skipButton: {
    backgroundColor: 'transparent',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  skipButtonText: {
    color: '#000000',
    fontSize: 16,
    textAlign: 'center',
  },
  otherInput: {
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
  },
});

export default DatingProfileScreen;