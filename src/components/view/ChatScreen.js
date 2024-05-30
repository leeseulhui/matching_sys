import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, TouchableWithoutFeedback, Image  } from 'react-native';
import { nodeUrl } from '../../deviceSet';
import { flaskUrl } from '../../deviceSet';
import { image } from '../../../assets/image';


const ChatScreen = ({ route }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const { matchingID, userId, matchedUserId } = route.params;
  const [ws, setWs] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsCached, setSuggestionsCached] = useState(false);
  const baseURL = 'https://owonet.store';

  useEffect(() => {
    const websocket = new WebSocket('wss://owonet.store/chat/messages/ws');
    
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
    };
  
    websocket.onclose = (e) => {
      console.log(`WebSocket Disconnected: Reason: ${e.reason}, Code: ${e.code}, Clean: ${e.wasClean}`);
    };
  
    return () => {
      websocket.close();
    };
  }, [matchingID]);
  

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
          setMessages([]); 
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
  
  //챗봇 부분
  const fetchSuggestions = async () => {
    if (suggestionsCached) {
      setShowSuggestions(true);
      return;
    }

    try {
      console.log('Fetching suggestions for userId:', userId);
      const response = await fetch(`${flaskUrl}/chatbot/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      console.log('Received suggestions:', data);
      setSuggestions(data); 
      setSuggestionsCached(true);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };
  
  const renderSuggestion = ({ item }) => (
    <TouchableOpacity style={styles.suggestionButton} onPress={() => setInputMessage(item)}>
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

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
      />
      {showSuggestions && (
        <TouchableWithoutFeedback onPress={() => setShowSuggestions(false)}>
          <View style={styles.overlaySuggestions}>
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}> 이런 대화내용은 어때요? </Text>
              <FlatList
                data={suggestions}
                renderItem={renderSuggestion}
                keyExtractor={(item, index) => `suggestion-${index}`}
              />
              <TouchableOpacity style={styles.refreshButton} onPress={() => {
                setSuggestionsCached(false);
                fetchSuggestions();
              }}>
                <Image source={image.reload} style={styles.refreshIcon} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="메시지 입력..."
          value={inputMessage}
          onChangeText={setInputMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>전송</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.helpButton} onPress={fetchSuggestions}>
        <Text style={styles.helpButtonText}> 챗봇 원트 🤖 </Text>
      </TouchableOpacity>
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
    backgroundColor: '#FFFFFF', // 하얀색 배경
    position: 'absolute',
    bottom: 80, 
    left: 0,
    right: 0,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
    backgroundColor: 'transparent', // 투명 배경
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
  },
  myMessage: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: '#ECECEC',
    alignSelf: 'flex-start',
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
  overlaySuggestions: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // 반투명 배경
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  suggestionsContainer: {
    padding: 10,
    backgroundColor: 'rgba(255, 192, 203, 0.7)', // 반투명 핑크 톤
    borderRadius: 10,
    width: '80%', // 너비 조정
    maxHeight: '50%', // 높이 절반으로 제한
    alignItems: 'center', // 중앙 정렬
  },
  suggestionsTitle: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  suggestionButton: {
    backgroundColor: 'white', 
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    width: '100%', // 너비 조정
  },
  suggestionText: {
    fontSize: 14,
  },
  refreshButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  refreshIcon: {
    width: 24,
    height: 24,
  },
  helpButton: {
    backgroundColor: '#F8BBD0', // 핑크 톤
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    alignItems: 'center',
  },
  helpButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

export default ChatScreen;
