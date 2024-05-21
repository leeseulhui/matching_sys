import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const StartupScreen = () => {
    const navigation = useNavigation();
  
    useEffect(() => {
      const validateToken = async () => {
        const token = await AsyncStorage.getItem('userToken');
        console.log(token);
        
        if (token) {
          try {
            const response = await fetch(`https://graph.instagram.com/me?fields=id,name&access_token=${token}`);
            const data = await response.json();
            
            // 결과가 유효하다면 AsyncStorage에서 'user_id'를 가져옴
            if (data.id) {
              const userId = await AsyncStorage.getItem('user_id');
              // 'userId'를 파라미터로 넘기면서 'DatingProfileScreen'으로 네비게이션
              navigation.navigate('Feed', { userId });
            } else {
              // 토큰이 유효하지 않으면 'AuthScreen'으로 이동
              navigation.navigate('Home');
            }
          } catch (error) {
            console.error('Error validating Instagram token:', error);
            // Instagram API 호출 실패 시 'AuthScreen'으로 이동
            navigation.navigate('Home');
          }
        } else {
          // 토큰이 없으면 'AuthScreen'으로 이동
          navigation.navigate('AuthScreen');
        }
      };
      validateToken();
    }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text>로딩 중...</Text>
    </View>
  );
};

export default StartupScreen;