import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HashTagCloud = ({ hashTags }) => {
  // 해시태그 빈도 정보 없이 기본 스타일 적용
  const defaultStyle = { fontSize: 12, color: 'rgba(0, 0, 0, 0.5)' };

  return (
    <View style={styles.container}>
      {hashTags.map(tag => (
        <Text key={tag} style={{...styles.tag, ...defaultStyle}}>{`#${tag}`}</Text>
      ))}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 7,
  },
  tag: {
    backgroundColor: 'pink',
    color: 'black',
    fontSize: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    margin: 3,
    borderRadius:20
  },
});

export default HashTagCloud;