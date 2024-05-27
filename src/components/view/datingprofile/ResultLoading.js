
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

const ResultLoading = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#FF6F91" />
        <Text style={styles.text}>원트소개서를 생성 중입니다! 잠시만 기다려주세요 </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFDEEC', 
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 20,
    color: '#D81B60', 
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});

export default ResultLoading;