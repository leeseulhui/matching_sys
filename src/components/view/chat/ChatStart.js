import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { image } from '../../../../assets/image';

const ChatStart = ({ navigation }) => {
  const startChat = () => {
    navigation.navigate('채팅');
  };

  return (
    <LinearGradient colors={['#FFC3A0', '#FFAFBD']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🎉 Congratulation 🎉</Text>
        <Text style={styles.subtitle}>서로의 마음이 통하셨군요!</Text>
        <Image source={image.couple} style={styles.image} />
        <Text style={styles.description}>
          대화를 통해 서로를 더 알아가보세요!
        </Text>
        <TouchableOpacity style={styles.button} onPress={startChat}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.7)']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>채팅 시작하기</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 35,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 70,
    marginTop: 10,
  },
  button: {
    width: 280,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#444444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChatStart;
