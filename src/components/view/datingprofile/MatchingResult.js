//자기소개서 내용 기반으로 유사한 사람들 띄워주는 페이지
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Button  } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const MatchingResults = ({ route }) => {
  const { userId } = route.params; // route.params에서 userId를 가져옴
  const [matchingResults, setMatchingResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const baseURL = 'http://localhost:6000';  
  const navigation = useNavigation();

  useEffect(() => {
    const fetchMatchingResults = async () => {
      try {
        const response = await axios.post(`${baseURL}/get_matching_results`, { userId });
        if (response.status === 200) {
          setMatchingResults(response.data.results);
        } else {
          throw new Error('Failed to fetch matching results');
        }
      } catch (error) {
        console.error('Error fetching matching results:', error);
        setError('Failed to fetch matching results. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatchingResults();
  }, [userId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>원트님과 가장 잘 맞는 분들이에요💪🏼</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#FFC3A0" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <ScrollView style={styles.resultContainer}>
          {matchingResults.length > 0 ? (
            matchingResults.map((result, index) => (
              <Text key={index} style={styles.resultText}>
                {result.username}님과 {result.similarity}% 유사해요 
              </Text>
            ))
          ) : (
            <Text style={styles.noResultsText}>유사한 자기소개서가 없습니다.</Text>
          )}
        </ScrollView>
      )}
       <View style={styles.buttonContainer}>
        <Button
          title="해시테스트로 이동"
          onPress={() => navigation.navigate('해시테스트')}
          color="#FFC3A0"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFAFBD80',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginVertical: 8,
    marginTop: 50,
  },
  resultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginVertical: 20,
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});

export default MatchingResults;
