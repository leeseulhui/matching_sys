import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, ScrollView, Image, Platform, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const imageContainerWidth = (width - 32) / 3 - 8;

const ImageScreen = () => {
  const [imageUrls, setImageUrls] = useState([]);
  const [colorAnalysis, setColorAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);
  const baseURL = Platform.OS === 'ios' ? 'http://localhost' : 'http://10.0.2.2';

  useEffect(() => {
    fetchUserPhotos();
  }, []);

  const fetchUserPhotos = async () => {
    const userId = await AsyncStorage.getItem('user_id');
    try {
      const response = await fetch(`${baseURL}:8080/user-photos/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch image URLs from the server.');
      }
      const data = await response.json();
      setImageUrls(data);
      fetchColorAnalysis(data);
    } catch (error) {
      console.error('Error fetching image URLs:', error);
      Alert.alert('Error', 'Failed to fetch image URLs.');
      setLoading(false);
    }
  };

  const fetchColorAnalysis = async (urls) => {
    try {
      const response = await fetch(`${baseURL}:6000/analyze_colors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrls: urls }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform color analysis.');
      }

      const data = await response.json();
      console.log('Color Analysis Results:', data);
      setColorAnalysis(data);
    } catch (error) {
      console.error('Error during color analysis:', error);
      Alert.alert('Error', 'Failed to perform color analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#555555" />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollView}>
          <Text style={styles.headerText}>Analysis Complete</Text>
          <View style={styles.imageGrid}>
            {imageUrls.map((url, index) => (
              <View style={styles.imageContainer} key={index}>
                <Image
                  source={{ uri: url }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </View>
          <View style={styles.analysisContainer}>
            {colorAnalysis.length > 0 ? (
              <View style={styles.resultBox}>
              <Text style={styles.resultLabelText}>Mood:</Text>
              <Text style={styles.resultValueText}>{colorAnalysis[0].mood["감정/상징"]}</Text>
              <Text style={styles.resultLabelText}>Image:</Text>
              <Text style={styles.resultValueText}>{colorAnalysis[0].mood["이미지"]}</Text>
            </View>
            
            ) : (
              <Text style={styles.noResultsText}>No results found.</Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDEFED',
  },
  scrollView: {
    padding: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultText: {
    fontSize: 16,
    color: '#555555',
    marginTop: 10,
    marginBottom: 10,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -4,
    marginBottom: 20,
  },
  imageContainer: {
    width: imageContainerWidth,
    aspectRatio: 1,
    margin: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridImage: {
    flex: 1,
  },
  analysisContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    marginTop: 20,
  },
  resultBox: {
    backgroundColor: '#FDEFED',
    borderRadius: 10,
    padding: 10,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#000000',
  },
  resultLabelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555555',
  },
  resultValueText: {
    fontSize: 16,
    color: '#555555',
    marginTop: 5,
  },
  
});

export default ImageScreen;
