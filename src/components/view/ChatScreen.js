import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, TouchableWithoutFeedback, Image } from 'react-native';
import { nodeUrl, flaskUrl } from '../../deviceSet';
import { image } from '../../../assets/image';

const ChatScreen = ({ route, navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const { matchingID, userId, matchedUserId } = route.params;
  const ws = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsCached, setSuggestionsCached] = useState(false);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      connectWebSocket();
    });

    //스크린 나갈 시 소켓 연결 끊는 부분 정의 
    const unsubscribeBlur = navigation.addListener('blur', () => {
      if (ws.current) {
        ws.current.close();
      }
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  useEffect(() => {
    fetchMessages();
  }, [matchingID]);

  const connectWebSocket = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      return;
    }
  
    ws.current = new WebSocket('wss://owonet.store/chat/messages/ws');
  
    ws.current.onopen = () => {
      console.log('WebSocket Connected');
      ws.current.send(JSON.stringify({ type: 'join', matchingID }));
    };
  
    ws.current.onmessage = (e) => {
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
  
    ws.current.onerror = (e) => {
      console.error('WebSocket Error: ', e.message);
      console.error('WebSocket Error Event: ', e);
    };
  
    ws.current.onclose = (e) => {
      console.log(`WebSocket Disconnected: Reason: ${e.reason}, Code: ${e.code}, Clean: ${e.wasClean}`);
      console.log('WebSocket Close Event: ', e);
    };
  
    const pingInterval = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  
    return () => clearInterval(pingInterval);
  };

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
      const response = await fetch(`${nodeUrl}/chat/messages`, {
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

  const fetchSuggestions = async () => {
    if (suggestionsCached) {
      setShowSuggestions(true);
      return;
    }

    try {
      console.log('Fetching suggestions for userId:', userId, 'and matchingId:', matchingID);
      const response = await fetch(`${flaskUrl}/chatbot/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, matchingId: matchingID }),
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
      Alert.alert('Error', 'Failed to fetch suggestions. Please try again.');
    }
  };

  const fetchRealtimeSuggestions = async () => {
    try {
      const response = await fetch(`${flaskUrl}/chat/suggestions/realtime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchingID }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch real-time suggestions');
      }
  
      const data = await response.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching real-time suggestions:', error);
      Alert.alert('Error', 'Failed to fetch suggestions. Please try again.');
    }
  };

  // Periodically check for inactivity
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealtimeSuggestions();
    }, 120000); // 5 minutes
  
    return () => clearInterval(interval);
  }, []);

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