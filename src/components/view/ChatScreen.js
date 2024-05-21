import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';

const ChatScreen = ({ route }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const baseURL = 'https://owonet.store';
  const { matchingID } = route.params;
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const websocket = new WebSocket('wss://owonet.store/chat/messages/ws');  // 서버의 WebSocket URL
    setWs(websocket);

    websocket.onopen = () => {
      // 웹소켓 연결이 성공적으로 열리면 실행
      console.log('WebSocket Connected');
      websocket.send(JSON.stringify({ type: 'join', matchingID: matchingID }));  // 서버에 'join' 메시지 전송
    };

    websocket.onmessage = (e) => {
      // 서버로부터 메시지를 수신하면 실행
      const message = JSON.parse(e.data);
      if (message.MatchingID === matchingID) {
        setMessages(prevMessages => {
          // 기존 메시지 목록에 동일한 ID를 가진 메시지가 있는지 확인
          if (!prevMessages.some(msg => msg.MessageID === message.MessageID)) {
            return [...prevMessages, message];
          }
          return prevMessages;
        });
      }
    };

    websocket.onerror = (e) => {
      // 오류 처리
      console.error('WebSocket Error: ', e.message);
      console.error('WebSocket Error Event: ', e);
    };

    websocket.onclose = (e) => {
      // 연결이 종료되면 실행
      console.log(`WebSocket Disconnected: Reason: ${e.reason}, Code: ${e.code}, Clean: ${e.wasClean}`);
      console.log('WebSocket Close Event: ', e);
    };

    return () => {
      websocket.close();  // 컴포넌트가 언마운트될 때 웹소켓 연결 종료
    };
  }, []);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`http://10.0.2.2:8080/chat/messages/${matchingID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (inputMessage.trim() === '') return; // 입력된 메시지가 비어있는지 검사
    try {
      // 서버에 POST 요청을 보냄
      const response = await fetch(`${baseURL}/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchingID,
          senderID: '7506894859370827',
          receiverID: '7389320737824274',
          messageContent: inputMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message'); // 요청 실패 시 예외 발생
      }

      // 서버로부터 받은 응답을 JSON 형태로 변환
      const newMessage = await response.json();

      // 새 메시지를 기존 메시지 목록에 추가하기 전에 중복 확인
      setMessages(previousMessages => {
        if (!previousMessages.some(msg => msg.MessageID === newMessage.MessageID)) {
          return [...previousMessages, newMessage];
        }
        return previousMessages;
      });

      // 입력 필드 초기화
      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error); // 오류 처리
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.messageContainer}>
      <Text style={styles.sender}>Sender: {item.SenderID}</Text>
      <Text style={styles.message}>Message: {item.MessageContent}</Text>
      <Text style={styles.timestamp}>Sent: {new Date(item.SentDate).toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.MessageID ? item.MessageID.toString() : `unique-${index}`}
      />
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
  messageContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sender: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  message: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#999999',
  },
});

export default ChatScreen;
