import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import axios from 'axios';

const SimilarProfile = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        // API 호출 URL은 해당 서버 환경에 맞게 수정해야 합니다.
        const response = await axios.get('http://your-server.com/api/profiles/similar', {
          params: {
            ageRange: '20-30', // 예시 파라미터, 실제 사용자 데이터로 대체 필요
            religion: 'Christian',
            hobby: 'Hiking'
          }
        });
        setProfiles(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  if (loading) {
    return <Text>Loading...</Text>;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      {profiles.length > 0 ? profiles.map(profile => (
        <View key={profile.id} style={styles.profileCard}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileDetails}>{profile.age}, {profile.religion}, {profile.hobbies.join(', ')}</Text>
        </View>
      )) : (
        <Text>No similar profiles found.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileDetails: {
    fontSize: 14,
    color: '#666',
  },
});

export default SimilarProfile;