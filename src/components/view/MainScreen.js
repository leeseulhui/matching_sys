import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { image, icons } from '../../../assets/image';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { nodeUrl } from '../../deviceSet';

const { width, height } = Dimensions.get('window');

const home_tabs = [
  { name: "Hashtag", screenKey: "매칭", icon: icons.hashtag },
];

const MainScreen = () => {
  const navigation = useNavigation();
  const [activeScreen, setActiveScreen] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [error, setError] = useState(null);
  const userId = useSelector((state) => state.instaUserData.User_id);
  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const getChatList = async () => {
      try {
        const response = await axios.get(`${nodeUrl}/chatItemProfile/${userId}`);
        if (response.data) {
          console.log(response.data);
          setChatList(response.data);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          setError('매칭을 먼저 진행해 주세요.');
        } else {
          setError('Failed to fetch chat list');
        }
      }
    };
    getChatList();
  }, [userId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollViewRef.current) {
        setCurrentIndex(prevIndex => {
          const nextIndex = prevIndex + 1 >= chatList.length ? 0 : prevIndex + 1;
          scrollViewRef.current.scrollTo({ x: nextIndex * width, animated: true });
          return nextIndex;
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [chatList]);

  const navigateToDatingProfile = (screenKey) => {
    if (screenKey === 'Hashtag') {
      navigation.navigate('해시테스트');
    } else {
      console.log('No screen associated');
    }
  };

  const startChat = (matchingID, partnerId) => {
    navigation.navigate('채팅', {
      matchingID: matchingID,
      userId: userId,
      matchedUserId: partnerId,
    });
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
      <Text style={styles.title}>만남을 시작해보세요!</Text>
      {error ? (
        <View style={styles.noMatchContainer}>
          <Text style={styles.noMatchText}>{error}</Text>
        </View>
      ) : chatList.length === 0 ? (
        <View style={styles.noMatchContainer}>
          <Text style={styles.noMatchText}>매칭이 먼저 필요해요!</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
        >
          {chatList.map((chatItem, index) => {
            const partnerId = chatItem.User1ID === userId ? chatItem.User2ID : chatItem.User1ID;
            return (
              <View key={chatItem.MatchingID} style={styles.profileCard}>
                <Image source={{ uri: chatItem.User_profile_image }} style={styles.profileImage} resizeMode="cover" />
                <View style={styles.textContainer}>
                  <Text style={styles.profileName}>{chatItem.Username}</Text>
                </View>
                <TouchableOpacity style={styles.chatButton} onPress={() => startChat(chatItem.MatchingID, partnerId)}>
                  <Text style={styles.chatButtonText}>💬</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
      <View style={styles.tabRow}>
        {home_tabs.map(renderTab)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  title: {
    fontSize: 24,
    fontWeight: '200',
    color: '#F48FB1',
    textAlign: 'center',
    marginVertical: 15,
  },
  noMatchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMatchText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#212121',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 30,
    height: 30,
    marginBottom: 5,
  },
  tabLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderColor: '#212121',
  },
  activeTabLabel: {
    color: '#212121',
  },
  scrollView: {
    flex: 1,
  },
  profileCardContainer: {
    width: width,
    alignItems: 'center',
  },
  profileCard: {
    width: width - 80, 
    height: height - 400, 
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
    marginHorizontal: 40, 
    marginVertical: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  profileImage: {
    width: '100%',
    height: '80%',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  textContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: '#FCE4EC',
    opacity : 200,
    alignItems: 'center',
    borderBottomLeftRadius : 20,
    borderBottomRightRadius : 20,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '200',
    marginTop: 5,
    color: '#212121',
  },
  chatButton: {
    position: 'absolute',
    bottom: 20,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  chatButtonText: {
    fontSize: 20,
    color: '#ffffff',
  },
});

export default MainScreen;
