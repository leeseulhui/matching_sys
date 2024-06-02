import { useState, useEffect } from 'react';
import { Image, Platform } from 'react-native';
import { image } from '../../assets/image';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// 스크린 js 파일
import LoginScreen from './view/LoginScreen';
import InstagramSignUp from './view/signUp/InstagramSignUp';
import CommonData from './view/signUp/CommonData';
import MainScreen from './view/MainScreen';
import IdealType from './view/ideal/IdealTypeScreen';
import IdealResult from './view/ideal/IdealResult';
// 프로필쪽에 아래 4개 파일
import SettingScreen from './view/SettingScreen';
import UserProfileScreen from './view/UserProfileScreen';
import DatingProfileScreen from './view/datingprofile/DatingProfileScreen';
import ImageScreen from './view/ImageScreen';

// 나머지 탭들
import SearchScreen from './view/SearchScreen';
// 채팅은 나중에 drawer에 추가
import ChatScreen from './view/ChatScreen';
import HashTest from './view/test/HashTest';
import ProfileDesign from './view/datingprofile/ProfileDesign';
import InstagramScreen from './view/InstagramFeed';
import RadarChart from './view/test/chart';
import IdealTypeAnalysis from './view/IdealTypeAnalysis';
//
import ResultLoading from './view/datingprofile/ResultLoading';
import ChatStart from './view/chat/ChatStart';
import DatingProfileResult from './view/datingprofile/DatingProfileResult';
import Similarity from './view/Similarity';
import StartAnalysis from './view/StartAnalysis';
import FeedResult from './view/FeedResult';
import ProfileSuccess from './view/datingprofile/ProfileSuccess';
import DatingProfileSimilarity from './view/datingprofile/DatingProfileSimilarity';
import PerfectProfile from './view/datingprofile/PerfectProfile';
import FaceDetect from './view/FaceDetect';
import ChatListScreen from './view/ChatListScreen';

import { useSelector } from 'react-redux';
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

function MainTab() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconName;
          let size = focused ? 30 : 25;
          if (route.name === 'Home') {
            iconName = focused ? image.home : image.home;
          } else if (route.name === 'Search') {
            iconName = focused ? image.search : image.search;
          } else if (route.name === 'Profile') {
            iconName = focused ? image.profile : image.profile;
          } else if (route.name === 'ChatList') {
            iconName = focused ? image.chat : image.chat;
          }
          return <Image source={iconName} style={{ width: size, height: size }} />;
        },
        tabBarStyle: {
          backgroundColor: '#FEE3E5',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={MainScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={UserProfileScreen} />
      <Tab.Screen name="ChatList" component={ChatListScreen} />
    </Tab.Navigator>
  );
}

// 상대방 이름을 가져오는 함수
const getPartnerName = async (partnerId) => {
  const url = Platform.OS === 'ios' ? 'http://localhost:8080' : 'http://10.0.2.2:8080';
  try {
    const response = await fetch(`${url}/chatname/${partnerId}`);
    const data = await response.json();
    console.log("함수 내", data[0].Username);
    return data[0].Username;
  } catch (e) {
    console.error("status error:", e);
    return `User_${partnerId}`; // 만약 이름을 가져오지 못했을 경우 ID를 사용
  }
}

// Drawer 스크린으로 채팅목록 구현
function DrawerMenu() {
  const url = Platform.OS === 'ios' ? 'http://localhost:8080' : 'http://10.0.2.2:8080';
  const [chatList, setChatList] = useState(null);
  const userId = useSelector((state) => state.instaUserData.User_id);

  useEffect(() => {
    const getChatList = async () => {
      try {
        const response = await fetch(`${url}/chatItem/${userId}`);
        if (!response.ok) {
          throw new Error(`HTTP 상태 ${response.status}`);
        }
        const list = await response.json();
        console.log(list);
        setChatList(list);
      } catch (e) {
        console.error(`fetching Error to chat: ${e}`);
      }
    }
    getChatList();
  }, []);

  return (
    <Drawer.Navigator screenOptions={{ headerShown: true }}>
      <Drawer.Screen name="MainTab" component={MainTab} />
      <Drawer.Screen name="Similarity" component={Similarity} />
      {chatList !== null && chatList.map((chat, index) => {
        const partnerId = chat.User1ID == userId ? chat.User2ID : chat.User1ID;
        return (
          <Drawer.Screen
            key={index}
            name={`ChatWith_${partnerId}_${index}`} // 각 채팅 스크린에 고유한 이름을 생성
            component={ChatScreen}
            initialParams={{ matchingID: chat.MatchingID, userId: userId, matchedUserId: partnerId }}
          />
        );
      })}
    </Drawer.Navigator>
  );
}

export default function StackContainer() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='로그인' screenOptions={{
        headerShown: false,
        headerTintColor: 'white',
        headerStyle: { backgroundColor: 'tomato' },
      }}>
        <Stack.Screen name="로그인" component={LoginScreen} />
        <Stack.Screen name="메인화면" component={DrawerMenu} />
        <Stack.Screen name="프로필디자인" component={ProfileDesign} />
        <Stack.Screen name="해시테스트" component={HashTest} />
        <Stack.Screen name="이상형타입" component={IdealType} />
        <Stack.Screen name="이상형결과" component={IdealResult} />
        <Stack.Screen name="데이팅프로필" component={DatingProfileScreen} />
        <Stack.Screen name="인스타로그인" component={InstagramSignUp} />
        <Stack.Screen name="데이팅테스트" component={DatingProfileScreen} />
        <Stack.Screen name="데이팅테스트결과" component={DatingProfileResult} />
        <Stack.Screen name="세팅" component={SettingScreen} />
        <Stack.Screen name="회원정보입력" component={CommonData} />
        <Stack.Screen name="인스타그램피드" component={InstagramScreen} />
        <Stack.Screen name="인스타그램피드결과" component={FeedResult} />
        <Stack.Screen name="이미지" component={ImageScreen} />
        <Stack.Screen name="로딩화면" component={ResultLoading} />
        <Stack.Screen name="채팅시작" component={ChatStart} />
        <Stack.Screen name="채팅" component={ChatScreen} />
        <Stack.Screen name="차트" component={RadarChart} />
        <Stack.Screen name="디자인선택" component={ProfileDesign} />
        <Stack.Screen name="인스타그램분석" component={StartAnalysis} />
        <Stack.Screen name="자기소개서성공" component={ProfileSuccess} />
        <Stack.Screen name="자기소개서매칭" component={DatingProfileSimilarity} />
        <Stack.Screen name="이상형분석" component={IdealTypeAnalysis} />
        <Stack.Screen name="얼굴분석" component={Similarity} />
        <Stack.Screen name="소개서완성본" component={PerfectProfile} />
        <Stack.Screen name="얼굴인식" component={FaceDetect} />
        <Stack.Screen name="채팅목록" component={ChatListScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
