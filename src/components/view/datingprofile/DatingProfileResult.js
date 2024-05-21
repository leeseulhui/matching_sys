import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';

const DatingProfileResult = ({ route, navigation }) => {
  const { userId } = route.params;  
  const [introduction, setIntroduction] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const baseURL = 'http://localhost:6000';  

  useEffect(() => {
    const fetchIntroduction = async () => {
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })  
      };
      console.log("Sending request to server with data:", requestOptions);

      try {
        const response = await fetch(`${baseURL}/generate_introduction`, requestOptions);
        const result = await response.json();

        console.log("Response received:", result);
        if (response.ok) {
          setIntroduction(result.introduction);
          setSummary(result.summary);  
        } else {
          throw new Error(`Failed to fetch introduction, status: ${response.status}`);
        }
      } catch (error) {
        console.error('Fetch introduction error:', error);
        setIntroduction('Failed to fetch introduction. Please try again.');
        setSummary('');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntroduction();
  }, [userId]);  

  return (
    <View style={styles.container}>
      <Text style={styles.title}> 원트님의 데이트소개서에요!</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#FFC3A0" />
      ) : (
        <>
          <ScrollView style={styles.introductionContainer}>
            {introduction.split('\n\n').map((paragraph, index) => (
              <Text key={index} style={styles.content}>{paragraph}</Text>
            ))}
          </ScrollView>
          <Text style={styles.summaryText}>✍️ 요약해드릴게요! ✍️</Text>
          <Text style={styles.summary}>{summary}</Text>
        </>
      )}
      {!isLoading && ( 
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>작성된 원트소개서가 마음에 드시나요?</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('자기소개서성공')}>
            <Text style={styles.buttonText}>마음에 들어요</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    backgroundColor: '#FFAFBD80', 
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 30,
    marginBottom: 20
  },
  introductionContainer: {
    backgroundColor: '#FFFFFF', 
    borderRadius: 15, 
    padding: 15,
    width: '100%', 
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  summary: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  content: {
    fontSize: 18,
    textAlign: 'left', 
    color: '#333', 
    marginBottom: 10, 
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 7,
  },
  button: {
    backgroundColor: '#FFA07A',
    padding: 10,
    borderRadius: 5,
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default DatingProfileResult;