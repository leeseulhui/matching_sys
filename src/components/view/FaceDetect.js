import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Button,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { flaskUrl, nodeUrl } from '../../deviceSet'; // 플라스크, 노드 요청 url 추가
import { useDispatch, useSelector } from 'react-redux';
import { update_user_profile_image } from '../../reduxContainer/action/signUpAction';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const FaceDetect = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.instaUserData); // 유저데이터 확인
  const navigation = useNavigation(); // 네비게이션 훅 추가
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [profileUpdated, setProfileUpdated] = useState(false);

  const selectImages = () => {
    const options = { mediaType: 'photo', quality: 1, selectionLimit: 5 };
    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        const selectedImages = response.assets;
        const validImages = [];

        for (const img of selectedImages) {
          const source = img.uri;
          const data = new FormData();
          data.append('profileImage', {
            name: img.fileName,
            type: img.type,
            uri: source,
          });

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
            if (result.result) {
              validImages.push(source);
            }
          } catch (error) {
            console.error('Error uploading image:', error);
          }
        }

        if (validImages.length > 0) {
          setImages(validImages);
        } else {
          Alert.alert('No valid images found', 'No faces were detected in the selected images.');
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
      const response = await fetch(`${nodeUrl}/upload-profile-image`, {
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
      setSelectedImage(imageUri);
      dispatch(update_user_profile_image(result.imageUrl));
      AsyncStorage.setItem('userDatas', JSON.stringify(user));
      setProfileUpdated(true);
      Alert.alert('Success', 'Profile image updated successfully');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      Alert.alert('Error', 'Failed to update profile image');
    }
  };

  const handleNavigation = () => {
    navigation.navigate('인스타그램분석');
  };

  const renderImageBoxes = () => {
    let imageBoxes = [];

    if (selectedImage) {
      imageBoxes.push(
        <View style={styles.profileImageContainer} key="selected">
          <Image source={{ uri: selectedImage }} style={styles.profileImage} />
        </View>
      );
    } else {
      imageBoxes.push(
        <View style={styles.profileImageContainer} key="placeholder">
          <Text style={styles.placeholderText}>+</Text>
        </View>
      );
    }

    images
      .filter((imageUri) => imageUri !== selectedImage)
      .forEach((imageUri, index) => {
        if (index < 4) {
          imageBoxes.push(
            <TouchableOpacity key={index} onPress={() => handleSetProfileImage(imageUri)}>
              
              <Image source={{ uri: imageUri }} style={styles.otherImage} />
              
            </TouchableOpacity>
          );
        }
      });

    // 빈 칸 추가
    while (imageBoxes.length < 5) {
      imageBoxes.push(
        <View style={styles.otherImage} key={`empty-${imageBoxes.length}`}>
           <Text style={{...styles.placeholderText, fontSize:28}}>+</Text>
        </View>
      );
    }

    return imageBoxes;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.imagesWrapper}>
          <View style={styles.profileImageWrapper}>
            {renderImageBoxes().slice(0, 1)}
          </View>
          <View style={styles.otherImagesWrapper}>
            {renderImageBoxes().slice(1, 3)}
          </View>
          <View style={styles.otherImagesWrapper}>
            {renderImageBoxes().slice(3)}
          </View>
        </View>
        {profileUpdated && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.analysisButton} onPress={handleNavigation}>
              <Text style={styles.analysisButtonText}>인스타그램분석</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      {!profileUpdated && (
        <TouchableOpacity style={styles.selectButton} onPress={selectImages}>
          <Text style={styles.selectButtonText}>프로필 사진 선택</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white', 
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectButton: {
    backgroundColor: '#ff6f61',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  imagesWrapper: {
    alignItems: 'center',
    marginTop: 20,
  },
  profileImageWrapper: {
    marginBottom: 20,
  },
  otherImagesWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileImageContainer: {
    width: 150,
    height: 150,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  placeholderText: {
    textAlign: 'center',
    color: '#ccc',
    fontSize:32,
  },
  otherImage: {
    alignItems:"center",
    justifyContent:"center",
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    margin: 10,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    marginTop: 150,
  },
  analysisButton: {
    backgroundColor: '#ff6f61',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignSelf: 'center',
  },
  analysisButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default FaceDetect;
