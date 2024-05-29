import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { nodeUrl } from '../../deviceSet';

const ChatScreen = ({ route }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const { matchingID, userId, matchedUserId } = route.params;
  const [ws, setWs] = useState(null);
  const baseURL = 'https://owonet.store';

  useEffect(() => {
    const websocket = new WebSocket('wss://owonet.store/chat/messages/ws');
    setWs(websocket);

    websocket.onopen = () => {
      console.log('WebSocket Connected');
      websocket.send(JSON.stringify({ type: 'join', matchingID }));
    };

    websocket.onmessage = (e) => {
      const message = JSON.parse(e.data);
      if (message.MatchingID === matchingID) {
        setMessages(prevMessages => {
          if (!prevMessages.some(msg => msg.MessageID === message.MessageID)) {
            return [...prevMessages, message];
          }
          return prevMessages;
        });
      }
    };

    websocket.onerror = (e) => {
      console.error('WebSocket Error: ', e.message);
      console.error('WebSocket Error Event: ', e);
    };

    websocket.onclose = (e) => {
      console.log(`WebSocket Disconnected: Reason: ${e.reason}, Code: ${e.code}, Clean: ${e.wasClean}`);
      console.log('WebSocket Close Event: ', e);
    };

    return () => {
      websocket.close();
    };
  }, []);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      console.log('fetchMessages userId:', userId, 'matchingID:', matchingID);
      const response = await fetch(`${nodeUrl}/chat/messages/${matchingID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          setMessages([]); // 메시지가 없을 경우 빈 배열로 설정
        } else {
          throw new Error('Failed to fetch messages');
        }
      } else {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to fetch messages');
    }
  };

  const sendMessage = async () => {
    if (inputMessage.trim() === '') return;

    try {
      const response = await fetch(`${baseURL}/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchingID,
          senderID: userId,
          receiverID: matchedUserId,
          messageContent: inputMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const newMessage = await response.json();

      setMessages(previousMessages => {
        if (!previousMessages.some(msg => msg.MessageID === newMessage.MessageID)) {
          return [...previousMessages, newMessage];
        }
        return previousMessages;
      });

      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const renderItem = ({ item }) => {
    const isMyMessage = item.SenderID == userId;
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.theirMessage
      ]}>
        <Text style={styles.message}>{item.MessageContent}</Text>
        <Text style={styles.timestamp}>{new Date(item.SentDate).toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.MessageID ? item.MessageID.toString() : `unique-${index}`}
        contentContainerStyle={styles.messageList}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="메시지 입력..."
          value={inputMessage}
          onChangeText={setInputMessage}
          onSubmitEditing={sendMessage} // 엔터 키를 누르면 메시지를 전송
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>전송</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#CCCCCC',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#F8BBD0',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageList: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  messageContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginVertical: 5,
    maxWidth: '70%', // 메시지 박스의 최대 너비 설정
  },
  myMessage: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end', // 오른쪽 정렬
  },
  theirMessage: {
    backgroundColor: '#ECECEC',
    alignSelf: 'flex-start', // 왼쪽 정렬
  },
  message: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
    marginTop: 5,
  },
});

export default ChatScreen;
