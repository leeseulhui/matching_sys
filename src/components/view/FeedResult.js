import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const FeedResult = () => {
  const route = useRoute(); //params 받기
  // 파람즈 받을거면 아마도 앞에서 userId까지 받아와야 하지 않을까?
  const { analysisResults = {}, userId } = route.params || { analysisResults: {}, userId: null };
  const navigation = useNavigation();//네비게이션 훅

  // 사용자의 주요 색상을 나타내는 박스
  const renderColorBlock = (color) => {
    if (!color) return null;
    const backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    return (
      <View style={[styles.colorBlock, { backgroundColor }]} />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.resultContainer}>
        <Text style={styles.boldText}>✔️회원님은 이 색상을 선호하시는군요!</Text>
        <View style={styles.colorBlockContainer}>
          {renderColorBlock(analysisResults.color)}
        </View>

        <Text style={styles.boldText}>{"\n\n"}💭 어울리는 이미지에요!</Text>
        <Text style={styles.resultText}>
          {analysisResults.mood ? analysisResults.mood.이미지.join(', ') : 'N/A'}
        </Text>
        
        <Text style={styles.boldText}>{"\n\n"}💟 주로 이런 감정들을 나타내요!</Text>
        <Text style={styles.resultText}>
          {analysisResults.mood ? analysisResults.mood["감정-상징"].join(', ') : 'N/A'}
        </Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('데이팅테스트')}>
        <Text style={styles.buttonText}>데이팅문서 만들기</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE4E1',
    padding: 20,
  },
  resultContainer: {
    marginTop: 180,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  resultText: {
    fontSize: 18,
    color: '#333333',
    marginBottom: 10,
  },
  boldText: {
    fontSize: 19,
    color: '#333333',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  colorBlockContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  colorBlock: {
    width: 100,
    height: 70,
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#FF4C65',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default FeedResult;