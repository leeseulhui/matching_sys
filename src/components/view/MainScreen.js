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
      {error ? (
        <View style={styles.noMatchContainer}>
          <Text style={styles.noMatchText}>{error}</Text>
        </View>
      ) : chatList.length === 0 ? (
        <View style={styles.noMatchContainer}>
          <Text style={styles.noMatchText}>매칭을 먼저 하세요</Text>
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
    backgroundColor: '#FEE3E5',
  },
  noMatchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMatchText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#FEE3E5',
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
    color: '#333',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderColor: '#333',
  },
  activeTabLabel: {
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    width: width - 40,
    height: height - 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    borderRadius: 5,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  chatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  chatButtonText: {
    fontSize: 24,
    color: '#333',
  },
});

export default MainScreen;
