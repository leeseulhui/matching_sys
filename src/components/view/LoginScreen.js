import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { useDispatch, useSelector } from "react-redux";
import { reboot_user_data } from '../../reduxContainer/action/signUpAction';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { image } from '../../../assets/image'; // Import the image paths

const LoginScreen = () => {
  const navigation = useNavigation();
  const [reboot, setReboot] = useState(null);
  const dispatch = useDispatch();
  const RebootUsers = useSelector((state) => state.instaUserData);

  useEffect(() => {
    async function retrieveUserData() {
      try {
        const retrievedData = await AsyncStorage.getItem('userDatas');
        if (retrievedData !== null) {
          const jsonData = JSON.parse(retrievedData);
          setReboot(jsonData);
          handle_rebooted_user_data(jsonData); 
          return jsonData;
        } else {
          console.log("No data found");
        }
      } catch (error) {
        console.error("Failed to retrieve the data", error);
      }
    }
    retrieveUserData();
  }, []);

  function handle_rebooted_user_data(jsonData) {
    if (jsonData && jsonData.User_id !== '') {  
      dispatch(reboot_user_data(jsonData.User_id, jsonData.auth_token, jsonData.Username, jsonData.Birthdate, jsonData.User_profile_image, jsonData.Gender, jsonData.Religion, jsonData.MBTI, jsonData.Interests, jsonData.Attractions));
    } else {
      console.log("Invalid or empty jsonData:", jsonData);
    }
  }

  const handleLoginPress = () => {
    // navigation.navigate("얼굴인식");
    navigation.navigate("메인화면");
  }

  const handleInstagramSignup = () => {
    navigation.navigate("인스타로그인");
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={image.logo} style={styles.logo} />
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleLoginPress}>
          <Text style={styles.buttonText}>로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleInstagramSignup}>
          <Text style={styles.buttonText}>인스타그램으로 시작하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
    padding: 8,
    backgroundColor:"red",
    opacity:0.56,
    flexDirection:"columns"
  },
  logoContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 300,
    height: 300,
  },
  buttonContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  button: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginVertical: 10,       //두 버튼 사이의 간격
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
