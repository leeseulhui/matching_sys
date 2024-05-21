import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// route 파라미터를 함수 컴포넌트의 인자로 추가
const EnterInformationScreen = ({ route }) => {
  const [username, setUsername] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const baseURL = Platform.OS === 'ios' ? 'http://localhost:8080' : 'http://10.0.2.2:8080';

  const navigation = useNavigation();
  // route.params로부터 user_id 받아오기
  const { user_id } = route.params;

  const handleSave = () => {
    const payload = {
      username,
      birthdate, 
      gender,
      email,
    };
    console.log('Updating user info for user_id:', user_id);
    console.log('Sending payload:', payload);
  
    // 업데이트를 위해 PUT 또는 PATCH 메서드 사용
    fetch(`${baseURL}/users/${user_id}`, {
      method: 'PATCH', // 또는 'PUT'
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    .then(response => {
      console.log('Server Response:', response);
  
      if (!response.ok) {
        throw new Error('Server response not OK');
      }
      return response.json();
    })
    .then(data => {
      console.log('Data received:', data);
      Alert.alert('알림', '사용자 정보가 업데이트 되었습니다.');
      navigation.navigate('DatingProfile', { user_id: user_id });
    })
    .catch(error => {
      console.error('Fetch error:', error);
      Alert.alert('오류', '정보 업데이트 중 오류가 발생했습니다.');
    });
  };

  
  return (
    <View style={styles.container}>
      <Text style={styles.header}>기본정보 입력</Text>
      <TextInput
        style={styles.input}
        placeholder="닉네임"
        value={username}
        onChangeText={text => setUsername(text)}
      />
      <TextInput
        style={styles.input}
        placeholder="생년월일"
        value={birthdate}
        onChangeText={text => setBirthdate(text)}
      />
      <TextInput
        style={styles.input}
        placeholder="성별"
        value={gender}
        onChangeText={text => setGender(text)}
      />
      <TextInput
        style={styles.input}
        placeholder="이메일 추후에 인스타 이메일 자동 입력"
        value={email}
        onChangeText={text => setEmail(text)}
      />
      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>저장</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 40,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EnterInformationScreen;