import { useState, useEffect } from 'react';
import { Image, Platform } from 'react-native';
import {image} from '../../assets/image'
import {NavigationContainer} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerItem, createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

//스크린 js 파일 
import LoginScreen from './view/LoginScreen';
import InstagramSignUp from './view/signUp/InstagramSignUp';
import CommonData from './view/signUp/CommonData';
import MainScreen from './view/MainScreen';
import IdealType from './view/ideal/IdealTypeScreen';
import IdealResult from './view/ideal/IdealResult';
//프로필쪽에 아래 4개 파일 
import SettingScreen from './view/SettingScreen';
import UserProfileScreen from './view/UserProfileScreen';
import DatingProfileScreen from './view/datingprofile/DatingProfileScreen';
import ImageScreen from './view/ImageScreen';

//나머지 탭들
import SearchScreen from './view/SearchScreen';
//채팅은 나중에 drawer에 추가
import ChatScreen from './view/ChatScreen';
import HashTest from './view/test/HashTest';
import ProfileDesign from './view/datingprofile/ProfileDesign';
import InstagramScreen from './view/InstagramFeed';
import RadarChart from './view/test/chart';
import IdealTypeAnalysis from './view/test/IdealTypeAnalysis';
//
import ResultLoading from './view/datingprofile/ResultLoading';
import ChatStart from './view/chat/ChatStart';
import DatingProfileResult from './view/datingprofile/DatingProfileResult';
import Similarity from './view/Similarity';
import AzureResult from './view/AzureResult';
import StartAnalysis from './view/StartAnalysis';
import FeedResult from './view/FeedResult';
import ProfileSuccess from './view/datingprofile/ProfileSuccess';
import MatchingResults from './view/datingprofile/MatchingResult';


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
          } else if (route.name === 'Heart') {
            iconName = focused ? image.heart : image.heart;
          } else if (route.name === 'Search') {
            iconName = focused ? image.search : image.search;
          } else if (route.name === 'Profile') {
            iconName = focused ? image.profile : image.profile;
          } else if (route.name === 'Azure') {
            iconName = focused ? image.azure : image.azure;
          }
          return <Image source={iconName} style={{ width: size, height: size }} />;
        },
        tabBarStyle: {
          //하단바 색상
          backgroundColor: '#FEE3E5',
        },
        headerShown:false, // 헤더 숨김
      })}
      // tabBarOptions={{
      //   showLabel: false,
      // }}
    >
      <Tab.Screen name="Home" component={MainScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={UserProfileScreen} />
      <Tab.Screen name="차트" component={RadarChart} />
    </Tab.Navigator>
  );
}
// 상대방 이름을 가져오는 함수
const getPartnerName= async(partnerId)=>{// 상대방 ID를 파라미터로 받아서 처리
  const url = Platform.OS === 'ios' ? 'http://localhost:8080' : 'http://10.0.2.2:8080';// 채팅 리스트를 받기위한 url
  try{
    const response = await fetch(`${url}/chatname/${partnerId}`);//데이터베이스에접근 
    const data = response.json();// 받은 데이터를 json으로 파싱
    console.log("함수 내",data[0].Username);// 배열 형태의 데이터에서 값 추출
   return data[0].Username;// 이름 반환
  }catch(e){
    console.error("status error:",e);
  }
}
//Drawer 스크린으로 채팅목록 구현
function DrawerMenu(){//드로어 스크린 컴포넌트
  const url = Platform.OS === 'ios' ? 'http://localhost:8080' : 'http://10.0.2.2:8080';// 채팅 리스트를 받기위한 url
  const id = '7389320737824274';// 테스트 데이터, 나중에 redux를 사용하여 자신의데이터를 가져옴
  const [chatList, setChatList] = useState(null);//채팅 리스트를 object로 받기위한 스태이트
  useEffect(()=>{
      const getChatList= async()=>{
      try{
      const response = await fetch(`${url}/chatItem/${id}`);// 채팅목록 데이터를 가져오는 url
      if (!response.ok) {
        throw new Error(`HTTP 상태 ${response.status}`);
      }
      const list = await response.json()
      console.log(list);//데이터 확인용 나중에 지우기.
      setChatList(list)//받아온 데이터를 chatList 오브젝트에 저장
    }catch(e){
      console.error(`fetching Error to chat:${e}`)
    }
  }
  getChatList();// 채팅목록을 가져오는 함수 실행
  },[])
  
  return (
  <Drawer.Navigator  screenOptions={{
    headerShown: true // 여기에서 헤더를 숨깁니다.
  }}>
  <Drawer.Screen name="MainTab" component={MainTab} />  
  {/* <Drawer.Screen name="채팅" component={ChatScreen} /> */}
  <Drawer.Screen name="Similarity" component={Similarity} />
  {// 채팅 리스트가 null 이 아닐경우 map 함수 사용
  chatList!==null && chatList.map((chat, index) => {
    const partnerId = chat.User1ID==id?chat.User2ID:chat.User1ID;
    // 데이터를 불러오긴했지만 비동기 처리 문제로 아직 사용하지 않음.
    //const partnerName =  getPartnerName(partnerId);
    //상대방의 이름을 잘 방아왔나 확인하는 로그호출
    //console.log('전달 후', partnerName);
      return (
          <Drawer.Screen
              key={index}
              name={partnerId}
              component={ChatScreen}
              initialParams={{ matchingID: chat.MatchingID }}
          />
      );
  
})}
</Drawer.Navigator>
  );
}
export default function StackContainer(){
    return (
    <NavigationContainer>
     <Stack.Navigator initialRouteName='로그인' screenOptions={{
        headerShown: false,
        headerTintColor: 'white',
        headerStyle: { backgroundColor: 'tomato' },
      }}>
        <Stack.Screen name="로그인" component={LoginScreen}/> 
        <Stack.Screen name="메인화면" component={DrawerMenu}/>
        <Stack.Screen name="프로필디자인" component={ProfileDesign}/>
        <Stack.Screen name="해시테스트" component={HashTest}/>
        <Stack.Screen name="이상형타입" component={IdealType}/>
        <Stack.Screen name="이상형결과" component={IdealResult}/>
        <Stack.Screen name ="데이팅프로필" component={DatingProfileScreen}/>
        <Stack.Screen name="인스타로그인" component={InstagramSignUp}/>
        <Stack.Screen name="데이팅테스트" component={DatingProfileScreen}/>
        <Stack.Screen name="데이팅테스트결과" component={DatingProfileResult}/>
        <Stack.Screen name="세팅" component={SettingScreen}/>
        <Stack.Screen name="회원정보입력" component={CommonData}/>
        <Stack.Screen name="인스타그램피드" component={InstagramScreen}/>
        <Stack.Screen name="인스타그램피드결과" component={FeedResult} />
        <Stack.Screen name="이미지" component={ImageScreen}/>
        <Stack.Screen name="로딩화면" component={ResultLoading} />
        <Stack.Screen name="채팅시작" component={ChatStart} />
        <Stack.Screen name="채팅" component={ChatScreen} />
        <Stack.Screen name="차트" component={RadarChart} />
        <Stack.Screen name="디자인선택" component={ProfileDesign} />
        <Stack.Screen name="캡션결과" component={AzureResult} />
        <Stack.Screen name="인스타그램분석" component={StartAnalysis} />
        <Stack.Screen name="자기소개서성공" component={ProfileSuccess} />
        <Stack.Screen name="자기소개서매칭" component={MatchingResults} />
        <Stack.Screen name="이상형분석" component={IdealTypeAnalysis} />
        <Stack.Screen name="얼굴분석" component={Similarity} />
     </Stack.Navigator>
    </NavigationContainer>
    );
}
// 로그인 - 인스타그램 분석 - 인스타그램 피드 -인스타그램 피드결과 - 데이팅테스트 - 데이팅 테스트 결과- 이상형 결과 - 메인화면