import React from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';

const users = [
  { id: '1', name: 'Alice', image: 'https://img.freepik.com/free-photo/japanese-business-concept-with-business-person_23-2149268024.jpg?size=626&ext=jpg' },
  { id: '2', name: 'Bob', image: 'https://img.freepik.com/free-photo/professional-asian-businesswoman-in-glasses-looking-confident-at-camera-standing-in-power-pose-again_1258-95057.jpg?size=626&ext=jpg&ga=GA1.2.1151089646.1714540290&semt=ais' }
];

const SimilarUsersScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>나와 비슷한 유형을 가진 사람은?</Text>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFE4E1'
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  description: {
    fontSize: 14,
    color: '#666'
  }
});

export default SimilarUsersScreen;
