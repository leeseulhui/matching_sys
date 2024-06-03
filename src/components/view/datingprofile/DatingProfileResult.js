import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { flaskUrl } from '../../../deviceSet'; //플라스크 요청 url
import { useSelector } from 'react-redux'; // 사용자 정보를 받아오기 위한 훅

const DatingProfileResult = ({ route, navigation }) => {
  // const { userId } = route.params;  사용자의 id를 동적으로 넘겨주려는 의도?
  const userId = useSelector((state) => state.instaUserData.User_id);
  const [introduction, setIntroduction] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  //const baseURL = 'http://localhost:6000';  나중에 구용이도 써야함. 
 
  useEffect(() => {
    const fetchIntroduction = async () => {
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify( {userId: userId })  
      };
      console.log("Sending request to server with data:", requestOptions);

      try {
        const response = await fetch(`${flaskUrl}/generate_introduction`, requestOptions);
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
      {isLoading ? (
        <ActivityIndicator size="large" color="#FFC3A0" style={styles.loadingIndicator} />
      ) : (
        <>
          <Text style={styles.title}>원트님의 원트소개서에요!</Text>
          <ScrollView style={styles.introductionContainer}>
            {introduction.split('\n\n').map((paragraph, index) => (
              <Text key={index} style={styles.content}>{paragraph}</Text>
            ))}
          </ScrollView>
          <Text style={styles.summaryText}> 📝 요약본 📝</Text>
          <Text style={styles.summary}>{summary}</Text>
        </>
      )}
      {!isLoading && ( 
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>작성된 원트소개서가 마음에 드시나요?</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('자기소개서성공')}>
            <Text style={styles.buttonText}>Next</Text>
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
    padding: 20,
    backgroundColor: '#FFEBD8', 
  },
  title: {
    fontSize: 22,
    fontWeight: '100',
    color: '#FCE4EC',
    marginTop: 50,
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
    fontWeight: '300',
    color: '#FCE4EC',
    marginBottom: 10,
    textAlign: 'center',
  },
  summary: {
    fontSize: 13,
    color: '#FCE4EC',
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
    fontWeight: '200',
    color: '#FCE4EC',
    marginBottom: 7,
  },
  button: {
    backgroundColor: '#F06292',
    alignItems:"center",
    padding: 10,
    borderRadius: 5,
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    alignC : 'center',
    fontWeight: 'bold'
  },
  loadingIndicator: {
    marginTop: 20,
  },
});

export default DatingProfileResult;
