import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DatingProfileSimilarity = ({ navigation }) => {
  const [similarityResults, setSimilarityResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const baseURL = Platform.select({
    ios: 'http://localhost:6000',
    android: 'http://10.0.2.2:6000'
  });

  useEffect(() => {
    const fetchSimilarityResults = async () => {
      try {
        const userId = await AsyncStorage.getItem('user_id');
        if (!userId) {
          console.error('User ID is missing');
          return;
        }

        const response = await axios.post(`${baseURL}/get_matching_results`, { userId });

        if (response.status === 200) {
          setSimilarityResults(response.data.results.slice(0, 10));  // 상위 3명만 저장
        } else {
          throw new Error('Failed to fetch similarity results');
        }
      } catch (error) {
        console.error('Fetch similarity results error:', error);
      } finally {
        setIsLoading(false);
        navigation.navigate("메인화면")
      }
    };

    fetchSimilarityResults();
  }, []);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#FFC3A0" />
      ) : (
        <FlatList
          data={similarityResults}
          keyExtractor={(item) => item.username}
          renderItem={({ item }) => (
            <View style={styles.resultItem}>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.similarity}>유사도: {item.similarity}%</Text>
            </View>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    backgroundColor: '#FFAFBD80',
  },
  listContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  resultItem: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    width: '100%',
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  similarity: {
    fontSize: 16,
    color: '#333',
  },
});

export default DatingProfileSimilarity;