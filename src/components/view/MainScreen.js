//로그인 성공 시 넘어가는 페이지
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { image,icons } from '../../../assets/image'
import axios from 'axios';

const home_tabs = [
  { name: "Test", screenKey: "나의 연애지식", icon: icons.test },
  { name: "Dating", screenKey: "데이트소개서", icon: icons.dating },
  { name: "Love", screenKey: "이상형 찾기", icon: icons.love },
  { name: "Hashtag", screenKey: "해시태그 분석", icon: icons.hashtag },
  { name: "Feed", screenKey: "인스타 피드 분석", icon: icons.insta },
  { name: "Chat", screenKey: "채팅", icon: icons.chat }
];

const datingTips = [
  { title: "첫 인상이 중요합니다", description: "첫 만남에서 좋은 인상을 남기세요." },
  { title: "공통 관심사를 찾아보세요", description: "공통의 관심사가 대화를 더 쉽게 만듭니다." },
  { title: "진솔하게 대화하세요", description: "솔직한 대화는 관계를 더욱 깊게 만듭니다." },
];

const MainScreen = () => {
  const navigation = useNavigation();
  const [activeScreen, setActiveScreen] = useState(null);
  const [username, setUsername] = useState("Loading...");
  const [similarProfiles, setSimilarProfiles] = useState([]);

  useEffect(() => {
    const userId = '7389320737824275'; 
    fetchUsername(userId);
    // fetchSimilarProfiles();
  }, []);


  const fetchUsername = async (userId) => {
    try {
      const response = await axios.get(`http://10.0.2.2:8080/chatname/${userId}`);
      if (response.data && response.data.length > 0) {
        setUsername(response.data[0].Username);  // 가정: 서버가 Username을 배열의 첫 번째 요소로 반환
      } else {
        setUsername('Username not found');
      }
    } catch (error) {
      console.error('Failed to fetch username:', error);
      setUsername('Failed to load username');
    }
  };

  // const fetchSimilarProfiles = async () => {
  //   try {
  //     const response = await axios.get('http://10.0.2.2:8080/api/profiles/similar');
  //     setSimilarProfiles(response.data);
  //   } catch (error) {
  //     console.error('Failed to fetch profiles:', error);
  //   }
  // };

  const navigateToDatingProfile = (screenKey) => {
    switch (screenKey) {
      case 'Test':
        navigation.navigate('데이팅프로필')
        break;
      case 'Dating':
        navigation.navigate('프로필디자인');
        break;
      case 'Love':
        navigation.navigate('이상형타입');
        break;
      case 'Hashtag':
        navigation.navigate('해시테스트');
        break;
      case 'Feed':
        navigation.navigate('인스타그램피드');
        break;
      case 'Chat':  
      navigation.navigate('채팅', { matchingID: '7506894859370827' });  // Pass the matchingID here
        break;
      default:
        console.log('No screen associated');
        break;
    }
  };

  const renderTab = ({ name, screenKey, icon }, index) => (
    <TouchableOpacity
      key={index}
      style={[styles.tabItem, activeScreen === name && styles.activeTab]}
      onPress={() => {
        setActiveScreen(name);
        navigateToDatingProfile(name); 
      }}
    >
      <Image source={icon} style={styles.icon} />
      <Text style={[styles.tabLabel, activeScreen === screenKey && styles.activeTabLabel]}>{screenKey}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Image source={image.arrowLeft} style={styles.backIcon} />
      </TouchableOpacity>
      <View style={styles.additionalFeatures}>
        <Text style={styles.title}>연애를 시작해볼까요, {username} 님!</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="원하는 키워드를 입력해주세요!"
          placeholderTextColor="#888"
        />
      </View>
      <View style={styles.tabRow}>
        {home_tabs.slice(0, 3).map(renderTab)}
      </View>
      <View style={styles.tabRow}>
        {home_tabs.slice(3, 6).map(renderTab)}
      </View>
      <ScrollView style={styles.similarUsersContainer}>
        <Text style={styles.similarUsersTitle}>💭 나와 비슷한 유형을 가진 사람은?</Text>
        {similarProfiles.map(profile => (
          <View key={profile.id} style={styles.profileCard}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileDetails}>{profile.details}</Text>
          </View>
        ))}
      </ScrollView>
      <ScrollView 
        style={styles.bannerContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.bannerTitle}>❤️ 데이트 팁 알아보기</Text>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bannerContentContainer}
        >
          {datingTips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDescription}>{tip.description}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
  
        }  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEE3E5',
  },
  additionalFeatures: {
    padding: 20,
    backgroundColor: '#FEE3E5',
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 50,
    height: 50,
    marginBottom: 20,
  },
  tabLabel: {
    fontSize: 12,
    color: '#333',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderColor: '#333',
  },
  backIcon: {
    width: 10,
    height: 10,
  },
  activeTabLabel: {
    color: '#333',
  },
  similarUsersContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  similarUsersTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  profileCard: {
    flexDirection: 'row',
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  profileName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  profileDetails: {
    fontSize: 13,
    color: '#666',
  },
  bannerArea: {
    paddingLeft: 20,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingTop: 50,
  },  
  bannerContent: {
    alignItems: 'center',
  },
  tipCard: {
    width: 170,
    height: 100,
    borderRadius: 10,
    padding: 10,
    marginLeft: 10,
    marginRight: 5,
    marginTop: 10,
    backgroundColor: 'rgba(255, 250, 240, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  tipDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    marginBottom: 10,
  },
});

export default MainScreen;