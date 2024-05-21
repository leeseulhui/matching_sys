//원트소개서 디자인 검색하는 부분(검색창에 분석한 피드 분위기 결과값 들어가주어야 함)
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const ProfileDesign = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchTerm) {
      setIsLoading(true);
      fetch(`http://localhost:6000/generate_design`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: searchTerm, 
        })
      })
      .then((response) => response.json())
      .then((data) => {
        setSearchResults(data.design_result || []);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Search failed:', error);
        setIsLoading(false);
      });
    }
  }, [searchTerm]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Search Design 🩷</Text>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          onChangeText={setSearchTerm}
          value={searchTerm}
          placeholder="검색할 단어 또는 문장을 입력하세요"
          placeholderTextColor="#999"
        />
      </View>
      {isLoading ? (
        <Text>Loading...</Text>
      ) : (
        <View style={styles.resultsContainer}>
          {searchResults.map((result, index) => (
            <TouchableOpacity key={index} style={styles.resultItem}>
              <Text style={styles.resultText}>{result.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF1E6',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF715B', 
    marginTop : 50,
    marginBottom: 20,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    height: 40,
    borderColor: '#FFC0CB', 
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    color: '#333', 
    backgroundColor: '#FFF', 
  },
  resultsContainer: {
    marginTop: 10,
  },
  resultItem: {
    padding: 10,
    backgroundColor: '#FFDEEC', 
    borderRadius: 8,
    marginBottom: 10,
  },
  resultText: {
    color: '#FF715B', 
    fontSize: 16,
  },
});

export default ProfileDesign;