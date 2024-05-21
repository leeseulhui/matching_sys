import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AuthScreen from '../../../instagram';
import { fullWidth, fullHeight } from '../../../deviceSet'; // 디바이스의 넓이, 높이 

const InstagramSignUp = () => {
  return (
    <View style={styles.container}>
      {/*회원가입 컴포넌트, 웹으로 표현  */}
      <AuthScreen style={styles.authWeb}/> 
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authWeb:{
    width:fullWidth,
    height:fullHeight,
  }
});

export default InstagramSignUp;
