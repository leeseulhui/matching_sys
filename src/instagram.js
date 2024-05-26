import React, { useState } from 'react';
import { View, StyleSheet, Text, Button} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { device_width,device_height } from './deviceSet';
import { useSelector, useDispatch } from "react-redux"; //redux 함수
import {sign_up_action} from './reduxContainer/action/signUpAction'
const AuthScreen = () => {
  const navigation = useNavigation();// 네비게이션 적용
  const dispatch = useDispatch();//action 쓸때

  const id = useSelector((state) => state.instaUserData.User_id);// 데이터 꺼내올때 
  console.log({id});

  const [authData, setAuthData] = useState({});
  const [error, setError] = useState(''); // 오류 상태를 추가합니다.

  // DOM이 완전히 로드된 후 실행되도록 onMessage에서 호출되는 스크립트입니다.
  const injectedJavaScript = `
  setTimeout(function() {
    // DOM을 조회하는 대신 전체 문서 본문의 innerText를 포스트합니다.
    // 서버는 인증 데이터를 JSON 문자열로 본문에 보내야 합니다.
    window.ReactNativeWebView.postMessage(document.body.innerText);
  }, 500);
  true;
`;
const handleSignUpData=(userId,accessToken)=>{
  dispatch(sign_up_action(userId,accessToken));// 액션 실행하기
  /*{
    유저아이디:  userId,
    토큰: accessToken,
    이름: '박기표',
    비밀번호:'',
    성별:'',
  }*/
}
//파라미터로 token과 id 입력받음 후 async storage 에 저장
  const storeToken = async (accessToken,user_id) => {
    try {
      const userIdString = String(user_id);
      await AsyncStorage.setItem('userToken', accessToken);
      await AsyncStorage.setItem('user_id', userIdString);
      console.log('Token stored successfully');
    } catch (error) {
      console.error('Error storing the token:', error);
      setError('토큰 저장 중 오류 발생');
    }
  };
  //데베 서버에 저장
  const saveAuthDataToServer = async (userId, accessToken) => {
    try {
      const response = await fetch('http://10.0.2.2:8080/api/save-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          auth_token: accessToken
        })
      });
      //리스폰스 확인
      if (!response.ok) {
        throw new Error('Failed to save auth data');
      }

      const responseData = await response.json();
      console.log('Data saved successfully:', responseData);
    } catch (error) {
      console.error('Error saving auth data:', error);
      setError('인증 데이터 저장 중 오류가 발생했습니다.'); // 오류 상태 업데이트
    }
  };

  return (
    <View style={styles.container}>
     {!authData.access_token && 
     (<WebView
        style={{ width: device_width, height: device_height }}
        source={{ uri: 'https://owonet.store/auth' }}
        injectedJavaScript={injectedJavaScript}
        onMessage={(event) => {
          console.log('Received event data:', event.nativeEvent.data);

          try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.error) {
              console.error('Server responded with an error:', data.error);
              setError(`서버 오류: ${data.error}`);
            } else if (data.access_token && data.user_id) {
              setAuthData(data);
              //id, 토큰 redux 저장 
              handleSignUpData(data.user_id,data.access_token);
              console.log('Access Token:', data.access_token);
              console.log('User ID:', data.user_id);
              saveAuthDataToServer(data.user_id, data.access_token);
              storeToken(data.access_token,data.user_id);
              navigation.navigate('회원정보입력');
            } else {
              console.error('Invalid auth data structure:', data);
              setError('인증 데이터 구조가 올바르지 않습니다.');
            }
          } catch (error) {
            console.error('Error parsing auth data:', error);
            setError(`인증 데이터 파싱 중 오류 발생: ${error.message}`);
          }
        }}

        onLoadStart={() => console.log('WebView loading started')}
        onLoad={() => console.log('WebView loaded')}
        onLoadEnd={() => console.log('WebView loading finished')}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent.statusCode, nativeEvent.description);
        }}
      />)}
      {authData.access_token && (
        <View>
          <Text>Access Token: {authData.access_token}</Text>
          <Text>User ID: {authData.user_id}</Text>
          <Button title="다음으로 넘어가기" onPress={()=>navigation.navigate('메인화면')}> </Button>
          <Button title='확인' onPress={()=>console.log(id)}/>
        </View>
      )}
      {/* 오류 메시지를 화면에 표시합니다. */}
      {error !== '' && (
        <View>
          <Text>Error: {error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AuthScreen;
