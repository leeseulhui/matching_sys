import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Image } from 'react-native';
import { Skia, Canvas, Paint, Path, PaintStyle } from "@shopify/react-native-skia";
import { useRoute, useNavigation } from '@react-navigation/native';
import Modal from 'react-native-modal';
import { nodeUrl } from '../../../deviceSet'; // Flask 요청 url

const RadarChart = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId, randomUserIds } = route.params;
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState(null);
  const [sortedUsers, setSortedUsers] = useState([]);
  const [similarityPercentage, setSimilarityPercentage] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log(`Fetching data for userId: ${userId} with randomUserIds: ${randomUserIds}`);
        const response = await fetch(`${nodeUrl}/similarity/${userId}/${randomUserIds.join(',')}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result = await response.json();
        console.log('Fetched data:', result);

        const adjustedResult = {
          ...result,
          userFaceSimilarity: result.userFaceSimilarity.map(value => value / 100)
        };

        const sortedUsers = calculateAndSortUsers(adjustedResult);
        setData(adjustedResult);
        setSortedUsers(sortedUsers);
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, randomUserIds]);

  const calculateAndSortUsers = (data) => {
    const keys = ['datingProfileSimilarity', 'userCaptionSimilarity', 'userFaceSimilarity', 'userIdealSimilarity', 'userSimilarity'];
    const userSimilarityData = randomUserIds.map((randomUserId, index) => {
      const totalSum = keys.reduce((acc, key) => {
        const value = data[key] ? data[key][index] : 0;
        return acc + value;
      }, 0);
      const average = totalSum / keys.length;
      return { userId: randomUserId, index, similarityPercentage: average * 100 };
    });
    return userSimilarityData.sort((a, b) => b.similarityPercentage - a.similarityPercentage);
  };

  const labels = ["프로필", "캡션", "얼굴", "이상형", "해시"];
  const radius = 50; // 반지름을 줄임
  const gridSteps = 5;
  const { width } = Dimensions.get('window');
  const center = { x: 100, y: 100 }; // 중앙을 모달의 가운데로 조정

  const angle = (2 * Math.PI) / labels.length;

  if (!Skia) {
    return <Text>Skia 모듈을 불러올 수 없습니다.</Text>;
  }

  const paint = Skia.Paint();
  paint.setColor(Skia.Color("#FF6C3D"));
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(2);

  const gridPaint = Skia.Paint();
  gridPaint.setColor(Skia.Color("#CCCCCC"));
  gridPaint.setAntiAlias(true);
  gridPaint.setStyle(PaintStyle.Stroke);
  gridPaint.setStrokeWidth(1);

  const drawRadarChart = (userData) => {
    const path = Skia.Path.Make();
    const gridPath = Skia.Path.Make();

    userData.forEach((value, index) => {
      const x = center.x + radius * value * Math.cos(angle * index - Math.PI / 2);
      const y = center.y + radius * value * Math.sin(angle * index - Math.PI / 2);
      if (index === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    });
    path.close();

    for (let step = 1; step <= gridSteps; step++) {
      const gridRadius = (radius / gridSteps) * step;
      for (let i = 0; i < labels.length; i++) {
        const x = center.x + gridRadius * Math.cos(angle * i - Math.PI / 2);
        const y = center.y + gridRadius * Math.sin(angle * i - Math.PI / 2);
        if (i === 0) {
          gridPath.moveTo(x, y);
        } else {
          gridPath.lineTo(x, y);
        }
        if (i === labels.length - 1) {
          gridPath.lineTo(center.x + gridRadius * Math.cos(-Math.PI / 2), center.y + gridRadius * Math.sin(-Math.PI / 2));
        }
      }
    }

    return (
      <View style={styles.canvasContainer}>
        <Canvas style={styles.canvas}>
          <Path path={gridPath} paint={gridPaint} />
          <Path path={path} paint={paint} />
        </Canvas>
        {labels.map((label, labelIndex) => {
          const x = center.x + (radius + 20) * Math.cos(angle * labelIndex - Math.PI / 2);
          const y = center.y + (radius + 20) * Math.sin(angle * labelIndex - Math.PI / 2);
          return (
            <Text
              key={labelIndex}
              style={[
                styles.label,
                { left: x - 20, top: y - 10 }
              ]}
            >
              {label}
            </Text>
          );
        })}
      </View>
    );
  };

  const handleMatch = async (randomUserId) => {
    try {
      const response = await fetch(`${nodeUrl}/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user1ID: userId,
          user2ID: randomUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      console.log('Match result:', result);

      Alert.alert(
        '매칭 성공',
        `User ${userId}와 User ${randomUserId}가 매칭되었습니다.`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Navigating to Chat screen with matchingID:', result.matchingID);
              navigation.navigate('채팅', {
                matchingID: result.matchingID,
                userId: userId,
                matchedUserId: randomUserId,
              });
            },
          }
        ]
      );
    } catch (error) {
      console.error('Match error:', error);
      Alert.alert('매칭 실패', '매칭 중 오류가 발생했습니다.');
    }
  };

  const toggleModal = (index) => {
    setSelectedUserIndex(index);
    const percentage = sortedUsers[index].similarityPercentage;
    setSimilarityPercentage(percentage);
    setModalVisible(!isModalVisible);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6C3D" />
        <Text>데이터를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
      {sortedUsers.map((user, index) => (
        <TouchableOpacity key={user.userId} style={styles.card} onPress={() => toggleModal(user.index)}>
          <View style={styles.cardLeft}>
            <Image
              source={{ uri: data.userDetails && data.userDetails[user.index] && data.userDetails[user.index].User_profile_image }}
              style={styles.profileImageCard}
            />
            <Text style={styles.userNameCard}>{data.userDetails && data.userDetails[user.index] && data.userDetails[user.index].Username}</Text>
            <Text style={styles.userAgeCard}>{data.userDetails && data.userDetails[user.index] && data.userDetails[user.index].Age} years old</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.userDetailText}>종교: {data.userDetails && data.userDetails[user.index] && data.userDetails[user.index].Religion}</Text>
            <Text style={styles.userDetailText}>성격: {data.userDetails && data.userDetails[user.index] && data.userDetails[user.index].MBTI}</Text>
            <Text style={styles.userDetailText}>관심사: {data.userDetails && data.userDetails[user.index] && data.userDetails[user.index].Interests}</Text>
            <Text style={styles.userDetailText}>매력을 느끼는 행동: {data.userDetails && data.userDetails[user.index] && data.userDetails[user.index].Attractions}</Text>
            <View style={styles.similarityContainer}>
                  <Text style={styles.similarityTitle}>매칭 추천율</Text>
                  <Text style={styles.similarityText}>{user.similarityPercentage.toFixed(2)}%</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      <Modal 
        isVisible={isModalVisible} 
        onBackdropPress={() => setModalVisible(false)} 
        style={styles.modal} 
        backdropOpacity={1} // 백드롭 불투명도 설정
      >
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalScrollView}>
            {selectedUserIndex !== null && data.userDetails && data.userDetails[selectedUserIndex] && (
              <>
                <View style={styles.userDetails}>
                  <Image
                    source={{ uri: data.userDetails[selectedUserIndex].User_profile_image }}
                    style={styles.profileImage}
                  />
                  <Text style={styles.userName}>{data.userDetails[selectedUserIndex].Username}</Text>
                  <Text style={styles.userAge}>{data.userDetails[selectedUserIndex].Age} years old</Text>
                  <Text style={styles.userIntro}>{data.userDetails[selectedUserIndex].Content}</Text>
                </View>
                <View style={styles.idealDetails}>
                  <Text style={styles.idealTitle}>이상형 정보</Text>
                  <Text style={styles.idealText}>종교: {data.userDetails[selectedUserIndex].IdealReligion}</Text>
                  <Text style={styles.idealText}>성격: {data.userDetails[selectedUserIndex].IdealPersonality}</Text>
                  <Text style={styles.idealText}>관심사: {data.userDetails[selectedUserIndex].IdealInterests}</Text>
                  <Text style={styles.idealText}>매력을 느끼는 행동: {data.userDetails[selectedUserIndex].IdealAttractionActions}</Text>
                  <Text style={styles.idealText}>선호 연령대: {data.userDetails[selectedUserIndex].IdealAge}</Text>
                </View>
                {drawRadarChart([
                  data.datingProfileSimilarity ? data.datingProfileSimilarity[selectedUserIndex] : 0,
                  data.userCaptionSimilarity ? data.userCaptionSimilarity[selectedUserIndex] : 0,
                  data.userFaceSimilarity ? data.userFaceSimilarity[selectedUserIndex] : 0,
                  data.userIdealSimilarity ? data.userIdealSimilarity[selectedUserIndex] : 0,
                  data.userSimilarity ? data.userSimilarity[selectedUserIndex] : 0,
                ])}
                <View style={styles.similarityContainer}>
                  <Text style={styles.similarityTitle}>유사도 백분율</Text>
                  <Text style={styles.similarityText}>{similarityPercentage.toFixed(2)}%</Text>
                </View>
                <TouchableOpacity style={styles.matchButton} onPress={() => handleMatch(randomUserIds[selectedUserIndex])}>
                  <Text style={styles.matchButtonText}>매칭하기</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollViewContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  card: {
    position: 'relative',
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    flexDirection: 'row', // Row direction
    width: '90%',
    alignItems: 'center',
  },
  cardLeft: {
    alignItems: 'center',
    marginRight: 20,
  },
  cardRight: {
    flex: 1,
  },
  profileImageCard: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  userNameCard: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userAgeCard: {
    fontSize: 14,
    color: 'gray',
  },
  userDetailText: {
    fontSize: 12,
    marginBottom: 5,
  },
  similarityContainer: {
    marginTop: 10,
  },
  similarityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  similarityText: {
    fontSize: 14,
    color: '#FF6C3D',
  },
  canvasContainer: {
    position: 'relative',
    width: 200, // 너비를 줄임
    height: 200, // 높이를 줄임
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    width: 200, // 너비를 줄임
    height: 200, // 높이를 줄임
  },
  label: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  dataContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    alignItems: 'center',
  },
  dataText: {
    fontSize: 12,
    marginBottom: 5,
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: Dimensions.get('window').width * 0.9,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  userDetails: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userAge: {
    fontSize: 14,
    color: 'gray',
  },
  userIntro: {
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 20,
    marginTop: 10,
  },
  idealDetails: {
    alignItems: 'center',
    marginVertical: 10,
  },
  idealTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  idealText: {
    fontSize: 14,
    marginBottom: 5,
  },
  averageContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  averageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  averageText: {
    fontSize: 14,
  },
  similarityContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  similarityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  similarityText: {
    fontSize: 14,
    color: '#FF6C3D',
  },
  matchButton: {
    marginTop: 20,
    backgroundColor: '#FF6C3D',
    padding: 10,
    borderRadius: 5,
  },
  matchButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default RadarChart;