import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { nodeUrl } from '../../deviceSet';

const ChatListScreen = () => {
  const navigation = useNavigation();
  const [chatList, setChatList] = useState([]);
  const userId = useSelector((state) => state.instaUserData.User_id);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getChatList = async () => {
      try {
        const response = await axios.get(`${nodeUrl}/chatItemProfile/${userId}`);
        if (response.data) {
          console.log(response.data);
          setChatList(response.data);
        }
      } catch (error) {
        console.error(`fetching Error to chat: ${error}`);
        if (error.response && error.response.status === 404) {
          setError('No chat found');
        } else {
          setError('Failed to fetch chat list');
        }
      }
    };
    getChatList();
  }, [userId]);

  const startChat = (matchingID, partnerId) => {
    navigation.navigate('채팅', {
      matchingID: matchingID,
      userId: userId,
      matchedUserId: partnerId,
    });
  };

  const renderItem = ({ item }) => {
    const partnerId = item.User1ID === userId ? item.User2ID : item.User1ID;
    return (
      <TouchableOpacity style={styles.chatItem} onPress={() => startChat(item.MatchingID, partnerId)}>
        <Image source={{ uri: item.User_profile_image }} style={styles.profileImage} />
        <Text style={styles.chatItemText}>{item.Username}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={chatList}
          renderItem={renderItem}
          keyExtractor={(item) => item.MatchingID.toString()}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEE3E5',
  },
  list: {
    padding: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatItemText: {
    fontSize: 18,
    color: '#333',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ChatListScreen;
