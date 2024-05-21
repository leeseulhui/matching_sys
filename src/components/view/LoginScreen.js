import React, { useState, useContext, useEffect } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, ImageBackground, Alert, Dimensions, Image, Platform} from 'react-native';
import { AuthContext } from './AuthProvider';//로그인 상태 관리?
import LinearGradient from 'react-native-linear-gradient';
import { useSelector, useDispatch } from "react-redux"; //redux 함수
import {reboot_user_data} from '../../reduxContainer/action/signUpAction'
import { image } from '../../../assets/image';// 에셋 저장 데이터
import { useNavigation } from '@react-navigation/native'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
// 처음 시작하는 페이지
const LoginScreen = () => {
 //{ navigation, route } 기존 파라미터 
  const navigation = useNavigation();
  const [reboot, setReboot] = useState(null);
  const dispatch = useDispatch();
  // //나중에 사용자이름과 패스워드를 저장하고 싶을 때 , 아마도 로그인 버튼을 누를 경우 실행하는 것?
  // const handleLoginPress = (username, password) => {
  //   dispatch(change_user_data(username, password));
  //   navigation.navigate("인스타그램분석");
  // };
  // const { signIn } = useContext(AuthContext);
  const RebootUsers = useSelector((state)=>state.instaUserData);// reducer에서 데이터 가졍오기
  console.log('redux 확인 데이터',RebootUsers);
function handle_rebooted_user_data(jsonData){
  console.log("함수내 파라미터 전달 확인", jsonData);
  if (jsonData && jsonData.User_id != '') {  // jsonData가 유효하고 User_id가 존재하는지 확인
    dispatch(reboot_user_data(jsonData.User_id,jsonData.auth_token,jsonData.Username,jsonData.Birthdate,jsonData.Gender,jsonData.Religion,jsonData.MBTI,jsonData.Interests,jsonData.Attractions,));
  } else {
    console.log("Invalid or empty jsonData:", jsonData);
  }
}



  useEffect(()=>{
    // asyncstorage 에 저장되어 있는 데이터를 가져와서 리덕스에 저장해줘야함..
    // 불러오는 것 까지만 작성되어 있음.
    async function retrieveUserData() {
      try {
        const retrievedData = await AsyncStorage.getItem('userDatas');
        if (retrievedData !== null) {
          const jsonData = JSON.parse(retrievedData);
          console.log("Retrieved data:", jsonData);//여기까지는 제대로 나옴
          console.log(jsonData.User_id);
          setReboot(jsonData);
          handle_rebooted_user_data(jsonData); // 데이터를 리덕스 스토어에 저장
          return jsonData;
          //여기에 redux에 다시 저장하는 코드 추가
        } else {
          console.log("No data found");
        }
      } catch (error) {
        console.error("Failed to retrieve the data", error);
      }
    }
   
  //  reboot == null ?  retrieveUserData():handle_rebooted_user_data(reboot)
  retrieveUserData()
  },[])



//일단 메인페이지로 넘어가는 코드추가해놓음
const gotoMain=()=>{
  //navigation.navigate("인스타그램분석");
  navigation.navigate("인스타그램분석");
}


  const handleInstagramLogin = () => {
    //인스타 회원가입 창으로 이동 => InstagramSignUp.js
    navigation.navigate("인스타그램분석");
  };
  return (
    <ImageBackground
      source={image.login}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.container}>
        <Image  source={image.logo} style={styles.logo}></Image>
        <View style={styles.form}>
          <TouchableOpacity style={styles.button} 
          onPress={gotoMain}>
            <Text style={styles.buttonText}>로그인</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.instagramButton}
            onPress={handleInstagramLogin}
          >
            <LinearGradient
              colors={['#f9a3b2', '#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888']}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }} 
            >
              <Text style={styles.buttonText}>인스타그램으로 시작하기</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

const { height } = Dimensions.get("window");
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    resizeMode: 'cover',
    opacity: 0.5,
  },
  form: {
    width: '80%',
  },
  input: {
    height: 50,
    borderColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 25,
    width: '100%',
    paddingHorizontal: 15,
    marginVertical: 10,
    color: '#ffffff',
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  instagramButton: {
    marginTop: 10,
    borderRadius: 20,
    opacity: 0.7,
  },
  gradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  button: {
    backgroundColor: '#FF9999',
    padding: 15,
    borderRadius: 20,
    width: '100%',
    marginTop: 40,
    opacity: 0.8,

  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
});

export default LoginScreen;
