import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const ProfileSuccess = () => {
  const navigation = useNavigation();

  const handleMatching = () => {
    navigation.navigate('이상형타입');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>원트소개서가 마음에 드신다니 다행이에요 😃</Text>
      <Text style={styles.subtitle}>
        이번엔 원트님의 성향에 맞게 꾸며볼까요?{"\n"}상대 원트가 원트님을 파악하는 데 도움이 될 수도 있어요!
      </Text>
      <ScrollView style={styles.resultContainer}>
        <Text style={styles.resultText}>
        🔽 원트님은 이런 디자인이 어울려요 🔽
        </Text>
        <View style={styles.placeholderBox} />
      </ScrollView>
      <TouchableOpacity style={styles.button} onPress={handleMatching}>
        <Text style={styles.buttonText}>이상형 등록</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFAFBD80',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginVertical: 20,
    marginTop: 50,
  },
  subtitle: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    marginVertical: 10,
  },
  resultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginVertical: 20,
  },
  resultText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center'
  },
  placeholderBox: {
    height: 200,  
    backgroundColor: '#FFF',
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#FFA07A',
    padding: 10,
    borderRadius: 5,
    marginTop: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default ProfileSuccess;