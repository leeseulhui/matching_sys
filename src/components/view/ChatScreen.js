import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';

const ChatScreen = ({ route }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const baseURL = 'http://10.0.2.2:8080';
  const [ws, setWs] = useState(null);
  const matchingID = 'your_matching_id_here'; // Replace with actual matching ID for testing

  useEffect(() => {
    const websocket = new WebSocket('ws://10.0.2.2:8080/chat');  // WebSocket server URL
    setWs(websocket);

    websocket.onopen = () => {
      console.log('WebSocket Connected');
      websocket.send(JSON.stringify({ type: 'join', matchingID }));  // Join message
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
  }, []);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${baseURL}/chat/messages/${matchingID}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
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
          senderID: '7506894859370827', // Static sender ID for testing
          receiverID: '7389320737824274', // Static receiver ID for testing
          messageContent: inputMessage,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      const newMessage = await response.json();
      setMessages(prevMessages => {
        if (!prevMessages.some(msg => msg.MessageID === newMessage.MessageID)) {
          return [...prevMessages, newMessage];
        }
        return prevMessages;
      });
      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
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
