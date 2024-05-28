import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';

const ChatScreen = ({ route }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const baseURL = 'http://localhost:5000';
  const chatbotURL = 'http://localhost:5001';
  const matchingID = route.params.matchingID;
  const senderID = '7506894859370827'; // 로그인 한 유저 ID
  const receiverID = '7389320737824274'; // 상대방 유저 ID

  useEffect(() => {
    fetchMessages();
    fetchSuggestions();
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

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`${chatbotURL}/chatbot/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: senderID }),
      });
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
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
          senderID,
          receiverID,
          messageContent: inputMessage,
        }),
      });
      if (!response.ok) throw new Error(`Failed to send message: ${response.statusText}`);
      const newMessage = await response.json();
      setMessages(prevMessages => [...prevMessages, newMessage]);
      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity style={styles.suggestionButton} onPress={() => setInputMessage(item)}>
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

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
        ListHeaderComponent={
          suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Chatbot Suggestions</Text>
              <FlatList
                data={suggestions}
                renderItem={renderSuggestion}
                keyExtractor={(item, index) => `suggestion-${index}`}
                horizontal
              />
            </View>
          )
        }
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
  suggestionsContainer: {
    padding: 10,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  suggestionButton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  suggestionText: {
    fontSize: 16,
  },
});

export default ChatScreen;
