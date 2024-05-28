import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Button,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Picker } from '@react-native-picker/picker';
import { fullHeight, fullWidth, flaskUrl, nodeUrl } from '../../deviceSet';
import { image } from '../../../assets/image';
import { useDispatch, useSelector } from 'react-redux';
import { update_user_profile_image } from '../../reduxContainer/action/signUpAction';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [profilePicUri, setProfilePicUri] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editableField, setEditableField] = useState('');
  const [newValue, setNewValue] = useState('');
  const [changed, setChanged] = useState(false);
  const user = useSelector((state) => state.instaUserData);

  const options = {
    gender: ['male', 'female'],
    religion: ['기독교', '불교', '유교', '원불교', '천도교', '무교', '대종교', '이슬람교', '유대교', '기타', '없음'],
    mbti: ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'],
    interests: ['여행', '독서', '요리', '영화', '사진', '운동', '자기계발', '기타'],
    attractions: ['나와 유머 감각이 통할 때', '지적인 대화를 할 때', '외국어를 유창하게 할 때', '새로운 것에 도전할 때', '감정을 잘 절제할 때', '자기 일을 열심히 할 때', '잘 웃을 때', '옷을 잘 입을 때', '예의 바를 때']
  };

  console.log(user);

  function handle_update_profileImage(url) {
    dispatch(update_user_profile_image(url));
    setChanged(true);
  }

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const response = await fetch(`${nodeUrl}/users/${user.User_id}`);
        if (!response.ok) {
          throw new Error(`Server response not OK. Status: ${response.status}`);
        }
        const data = await response.json();
        setProfile(data);
        setProfilePicUri(data.User_profile_image || `data:image/png;base64,${data.User_profile_image_base64}`);
        setError(null);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError(error.toString());
      }
    }
    fetchUserProfile();
  }, [user.User_id]);

  useEffect(() => {
    if (changed) {
      AsyncStorage.setItem('userDatas', JSON.stringify(user));
    }
  }, [user, changed]);

  const handleUpdate = async () => {
    try {
      const response = await fetch(`${nodeUrl}/usersupdate/${user.User_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [editableField]: newValue,
        }),
      });
      if (!response.ok) throw new Error('프로필 업데이트 실패');
      const updatedProfile = await response.json();
      console.log('서버 응답:', updatedProfile);
      setProfile((prevState) => ({
        ...prevState,
        [editableField]: updatedProfile[editableField],
      }));
      setModalVisible(false);
    } catch (error) {
      console.error('업데이트 오류:', error);
      Alert.alert('업데이트 실패', error.toString());
    }
  };

  const selectImage = () => {
    const options = { mediaType: 'photo', quality: 1 };
    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else {
        const source = response.assets[0].uri;
        const data = new FormData();
        data.append('profileImage', {
          name: response.assets[0].fileName,
          type: response.assets[0].type,
          uri: source,
        });
        console.log(data);
        let checkface = false;

        try {
          const response = await fetch(`${flaskUrl}/detect-faces`, {
            method: 'POST',
            body: data,
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          if (!response.ok) {
            throw new Error(`Failed to upload image. Status: ${response.status}`);
          }
          const result = await response.json();
          console.log('Upload successful 확인', result);
          checkface = result.result;
        } catch (error) {
          console.error('Error uploading image 실패 코드:', error);
        }
        console.log("얼굴 찾았음 다음 진행도 확인", checkface);

        if (checkface) {
          data.append('userId', user.User_id);
          try {
            const uploadResponse = await fetch(`${nodeUrl}/upload-profile-image`, {
              method: 'POST',
              body: data,
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
            if (!uploadResponse.ok) {
              throw new Error(`Failed to upload image. Status: ${uploadResponse.status}`);
            }
            const uploadResult = await uploadResponse.json();
            setProfilePicUri(uploadResult.imageUrl);
            handle_update_profileImage(uploadResult.imageUrl);
            console.log('Image upload success:', uploadResult);
          } catch (error) {
            console.error('Image upload error:', error);
          }
          checkface = false;
        }
      }
    });
  };

  if (!profile) {
    return error ? (
      <View style={styles.centered}>
        <Text style={styles.errorText}>An error occurred: {error}</Text>
      </View>
    ) : (
      <ActivityIndicator size="large" style={styles.centered} />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Alert.alert("Modal has been closed.");
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Picker
              selectedValue={newValue}
              onValueChange={(itemValue) => setNewValue(itemValue)}
              style={styles.picker}
            >
              {options[editableField] && options[editableField].map((option, index) => (
                <Picker.Item key={index} label={option} value={option} />
              ))}
            </Picker>
            <View style={styles.buttonContainer}>
              <Button
                title="저장"
                onPress={handleUpdate}
              />
              <Button
                title="취소"
                color="red"
                onPress={() => setModalVisible(!modalVisible)}
              />
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.profileSection}>
        <TouchableOpacity onPress={selectImage}>
          <Image
            source={profilePicUri ? { uri: profilePicUri } : require('../../../assets/logo.png')}
            style={styles.representPhoto}
          />
        </TouchableOpacity>
        <Text style={styles.name}>{profile.Username}</Text>
        <Text>Gender: {profile.Gender}</Text>
      </View>
      <View style={styles.representCard}>
        <View style={{ flexDirection: "row" }}>
          <View style={{ borderRadius: 10, backgroundColor: "#f9a3b2", opacity: 0.8, padding: 4, margin: 3 }}>
            <Text>Instagram | {profile.Sns_account_url}</Text>
          </View>
          <View style={{ borderRadius: 10, backgroundColor: "#f9a3b2", opacity: 0.8, padding: 4, margin: 3, marginLeft: 5, flexDirection: 'row' }}>
            <Image style={{ width: 20, height: 20 }} source={image.like}></Image>
            <Text>38만</Text>
          </View>
        </View>
      </View>

      <View style={styles.aboutSection}>
        {renderProfileDetail('Email', profile.Email)}
        {renderProfileDetail('Phone', profile.Phone)}
        {renderProfileDetail('Address', profile.Address)}
        {renderProfileDetail('Birthdate', profile.Birthdate)}
        {renderProfileDetail('Religion', profile.Religion)}
        {renderProfileDetail('MBTI', profile.MBTI)}
        {renderProfileDetail('Interests', profile.Interests)}
        {renderProfileDetail('Attractions', profile.Attractions)}
      </View>
    </ScrollView>
  );

  function renderProfileDetail(label, value) {
    return (
      <TouchableOpacity onPress={() => {
        setEditableField(label.toLowerCase());
        setNewValue(value);
        setModalVisible(true);
      }}>
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>{label}</Text>
          <Text style={styles.aboutText}>{value}</Text>
        </View>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#FDEFED', padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red' },
  header: { paddingTop: 50, paddingBottom: 20, alignItems: 'center' },
  headerText: { fontSize: 20, fontWeight: 'bold' },
  profileSection: { alignItems: 'center', marginBottom: 20 },
  representPhoto: {
    marginTop: fullHeight * 0.03,
    width: fullWidth * 0.35,
    height: fullWidth * 0.35,
    borderRadius: 80,
  },
  representCard: {
    width: fullWidth * 0.8,
    height: fullWidth * 0.12,
    alignItems: "center",
    borderRadius: 15,
  },
  etcDot: {
    marginTop: 20,
    width: 40,
    height: 40,
    backgroundColor: "#f9a3b2",
    borderRadius: 30
  },
  serviceList: {
    alignItems: "center"
  },
  profilePic: { width: 120, height: 120, borderRadius: 60, borderColor: 'black', borderWidth: 2, marginTop: 20 },
  name: { fontSize: 18, fontWeight: "400", },
  aboutSection: { padding: 20 },
  aboutItem: { marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#D3D3D3' },
  aboutLabel: { fontSize: 14, color: 'grey' },
  aboutText: { fontSize: 16, marginBottom: 16 },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalView: {
    width: fullWidth * 0.8, // Adjust the width to make the modal larger
    height: fullHeight * 0.5, // Increase the height to make the modal larger
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    justifyContent: 'space-between', // Ensure buttons are at the bottom
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    width: 200, // Set a fixed width for text inputs
    borderBottomWidth: 1, // Underline text inputs
    borderBottomColor: '#ccc',
  },
  picker: {
    width: '100%',
    height: 150, // Increase height for better visibility
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
});
