import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Button,
  Modal,
  Alert,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { fullHeight, fullWidth,baseURL } from '../../deviceSet';
import { image } from '../../../assets/image';
import { useDispatch,useSelector } from 'react-redux';
import {update_user_profile_image} from '../../reduxContainer/action/signUpAction'


export default function UserProfileScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [profilePicUri, setProfilePicUri] = useState('');
  const [newGender, setNewGender] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const user = useSelector((state)=>state.instaUserData);
  console.log(user);
  const baseURL = Platform.OS === 'ios' ? 'http://localhost:8080' : 'http://10.0.2.2:8080';
  function handle_update_profileImage(url){
    dispatch(update_user_profile_image(url));
  } 
  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const response = await fetch(`${baseURL}/users/${user.User_id}`);
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
  }, []);
  useEffect(()=>{
    
  },[user])

  const handleUpdate = async () => {
    try {
      const response = await fetch(`${baseURL}/usersupdate/${user.User_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gender: newGender,
        }),
      });
      if (!response.ok) throw new Error('프로필 업데이트 실패');
      const updatedProfile = await response.json();
      console.log('서버 응답:', updatedProfile); // 서버 응답 로깅
      setProfile(prevState => ({
        ...prevState,
        Gender: updatedProfile.Gender // 마찬가지로 Gender 필드명으로 반환
      }));
      setModalVisible(false);
    } catch (error) {
      console.error('업데이트 오류:', error);
      Alert.alert('업데이트 실패', error.toString());
    }
  };

  const selectImage = () => {
    const options = { mediaType: 'photo', quality: 1 };
    launchImageLibrary(options, async response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        const source = response.assets[0].uri;
        const data = new FormData();
        data.append('profileImage', {
          name: response.assets[0].fileName,
          type: response.assets[0].type,
          uri: source,
        });
        let checkface = false;
        //// 이부분이 얼굴 탐지가 되는지 안되는지 요청하는 코드
        try {
          const response = await fetch('http://localhost:6000/detect-faces', {
            method: 'POST',
            body: data,
            headers: {
              'Content-Type': 'multipart/form-data', // 별도의 Content-Type 헤더 설정을 제거
            },
          });
          if (!response.ok) {
            throw new Error(`Failed to upload image. Status: ${response.status}`);
          }
          //이 결과값 부분을 가지고 아래의 로직 수행 / 수행안함 결정 -- **중요**
          const result = await response.json();
          console.log('Upload successful 확인', result);
          checkface = result.result;
        } catch (error) {
          console.error('Error uploading image 실패 코드:', error);
        }
        console.log("얼굴 찾았음 다음 진행도 확인",checkface);
        //이 부분의 응답이 true일 때 아래의 로직을 수행.
        if(checkface != false){
        data.append('userId', user.User_id);
        try {
          const uploadResponse = await fetch(`${baseURL}/upload-profile-image`, {
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
    <ScrollView contentContainerStyle={styles.container}>
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
            <TextInput
              placeholder="새 성별"
              value={newGender}
              onChangeText={setNewGender}
              style={styles.modalText}
            />
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
        <Button
          title="정보 수정"
          onPress={() => setModalVisible(true)}
        />
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
      <View style={{ flexDirection: 'row', justifyContent: "space-around", width: fullWidth * 0.8 }}>
        <TouchableOpacity onPress={() => navigation.navigate('데이팅테스트')}>
          <View style={styles.etcDot}></View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("해시테스트")}>
          <View style={styles.etcDot}></View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => console.log('난 몰라요')}>
          <View style={styles.etcDot}></View>
        </TouchableOpacity>
      </View>
      <View style={{ width: fullWidth * 0.8, height: fullWidth * 0.2, backgroundColor: "#f0f8ff", borderRadius: 15, marginTop: 15, flexDirection: 'row', alignItems: "center", justifyContent: "space-around" }}>

        <TouchableOpacity style={styles.serviceList} >
          <Image style={{ width: 40, height: 40, }} source={image.support} />
          <Text>고객센터</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.serviceList} >
          < Image style={{ width: 40, height: 40 }} source={image.event} />
          <Text>이벤트</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.serviceList} >
          <Image style={{ width: 40, height: 40 }} source={image.beLike} />
          <Text>팔로우</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.serviceList} onPress={() => navigation.navigate("세팅")}>
          <Image style={{ width: 40, height: 40 }} source={image.setting} />
          <Text>설정</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
function renderProfileDetail(label, value) {
  return (
    <View style={styles.aboutItem}>
      <Text style={styles.aboutLabel}>{label}</Text>
      <Text style={styles.aboutText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDEFED', alignItems: "center" },
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
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    width: 200, // Set a fixed width for text inputs
    borderBottomWidth: 1, // Underline text inputs
    borderBottomColor: '#ccc',
  },
});