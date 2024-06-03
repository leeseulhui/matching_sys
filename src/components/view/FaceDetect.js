import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Button,
  StyleSheet,
  Modal
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { flaskUrl, fullHeight, fullWidth, nodeUrl } from '../../deviceSet';
import { useDispatch, useSelector } from 'react-redux';
import { update_user_profile_image } from '../../reduxContainer/action/signUpAction';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
// import {startAnalysis} from './StartAnalysis';

const FaceDetect = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.instaUserData);
  const navigation = useNavigation();
  const [selectedImage, setSelectedImage] = useState(null);
  const [profileUpdated, setProfileUpdated] = useState(false);
  const [analysis, setAnalysis] =useState(false);
  const selectImages = () => {
    const options = { mediaType: 'photo', quality: 1, selectionLimit: 1 };
    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else {
        setAnalysis(true);
        const selectedImage = response.assets[0];
        const data = new FormData();
        data.append('profileImage', {
          name: selectedImage.fileName,
          type: selectedImage.type,
          uri: selectedImage.uri,
        });

        try {
          const res = await fetch(`${flaskUrl}/detect-faces`, {
            method: 'POST',
            body: data,
          });

          if (!res.ok) {
            throw new Error(`Failed to upload image. Status: ${res.status}`);
          }

          const result = await res.json();
          if (result.result) {
            handleSetProfileImage(selectedImage.uri);
          } else {
            Alert.alert('No face detected', 'Please select another image.');
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Error', 'Failed to process image. Please try again.');
        }
      }
    });
  };

  const handleSetProfileImage = async (imageUri) => {
    const data = new FormData();
    data.append('profileImage', {
      name: 'profile.jpg',
      type: 'image/jpeg',
      uri: imageUri,
    });
    data.append('userId', user.User_id);

    try {
      const res = await fetch(`${nodeUrl}/upload-profile-image`, {
        method: 'POST',
        body: data,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to upload image. Status: ${res.status}`);
      }

      const result = await res.json();
      setSelectedImage(imageUri);
      dispatch(update_user_profile_image(result.imageUrl));
      await AsyncStorage.setItem('userDatas', JSON.stringify(user));
      setProfileUpdated(true);
      setAnalysis(false);
      Alert.alert('Success', 'Profile image updated successfully');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      Alert.alert('Error', 'Failed to update profile image');
    }
  };

  const renderImageBox = () => (
    <TouchableOpacity onPress={
      selectImages
      }>
      <View style={styles.profileImageContainer}>
        {selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.profileImage} />
        ) : (
          <Text style={styles.placeholderText}>+</Text>
        )}
      </View>
    </TouchableOpacity>
  );
  
  return (
    <View style={styles.container}>
        {analysis && (
           <Modal
           visible={analysis}
           transparent={true}
           animationType="fade"
         >
          <View style={styles.modalView}>
            <ActivityIndicator size="large" color={"#F2ACAC"} /> 
            </View>
          </Modal>
        )}
      <View style={{alignItems:"center",}}>
        <Text style={{fontSize:18, color:"#F2ACAC",fontWeight:"400", marginBottom: 10 }}>원트에 등록할 프로필 사진을 선택할 차례에요!</Text>
        <Text style={{fontSize:14, color:"#F2ACAC",fontWeight:"bold", marginBottom: fullHeight*0.1 }}>회원님의 얼굴을 잘 보이도록 사진을 올려주세요</Text>
      </View> 
      {renderImageBox()}
      {!selectedImage && 
      <Text
        style={{color:"#F2ACAC", fontSize:18, fontWeight:"300"}}
      >회원님의 프로필을 등록해주세요</Text>}
      {profileUpdated && 
      <TouchableOpacity 
      style={{backgroundColor:"#F2ACAC", width:fullWidth*0.8, height:50, alignItems:"center", justifyContent:"center", borderRadius:20,}} 
      onPress={()=> {
       navigation.navigate('인스타그램분석')
      }}
      >
        <Text style={{color:"#373737"}}>Next</Text>
      </TouchableOpacity>
      }
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#373737',
  },
  profileImageContainer: {
    width: fullWidth*0.4,
    height: fullWidth*0.4,
    borderRadius: 85,
    borderWidth: 4,
    borderColor: '#F2ACAC',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom:fullHeight*0.1
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 85,
  },
  placeholderText: {
    textAlign: 'center',
    color: '#ccc',
    fontSize: 32,
  },
  modalView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)' // 반투명 배경
  },
});

export default FaceDetect;
