import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ImageBackground, FlatList, Dimensions, TextInput } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from "react-redux";
import { insert_common_data } from '../../../reduxContainer/action/signUpAction';
import { image } from "../../../../assets/image";
import { baseURL } from "../../../deviceSet";
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CommonData = () => {
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');
    const [birth, setBirth] = useState('');
    const [religion, setReligion] = useState('');
    const [mbti, setMbti] = useState('');
    const [interests, setInterests] = useState('');
    const [attractions, setAttractions] = useState('');

    const navigation = useNavigation();
    const dispatch = useDispatch();
    const data = useSelector((state) => state.instaUserData);

    const handleInsertCommonData = () => {
        dispatch(insert_common_data(name, gender, birth, religion, mbti, interests, attractions));
    };

    useEffect(() => {
        const saveUserDataToDBserver = async () => {
            if (data.Birthdate !== '' && data.Gender !== '' && data.Religion !== '' && data.Mbti !== '' && data.Interests !== '' && data.Attractions !== '') {
                try {
                    console.log('Sending data to server:', data); // Debug log
                    const response = await fetch(`${baseURL}:8080/users`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data)
                    });
                    if (!response.ok) {
                        throw new Error('Failed to save auth data');
                    }
                    const responseData = await response.json();
                    console.log('Data 저장 성공적:', responseData);
                    navigation.navigate('메인화면');
                } catch (e) {
                    console.error('Error 데이터 저장 중 발생 :', e);
                }
                const stringifyData = JSON.stringify(data);
                AsyncStorage.setItem('userDatas', stringifyData)
                    .then(() => {
                        console.log("Data successfully saved", stringifyData);
                    })
                    .catch(error => {
                        console.error("Failed to save the data", error);
                    });
            } else {
                console.log('모든 필드가 입력되지 않았습니다.');
            }
        };

        saveUserDataToDBserver();
    }, [data]);

    const religionData = ['기독교', '불교', '유교', '원불교', '천도교', '무교', '대종교', '이슬람교', '유대교', '기타', '없음'];
    const mbtiData = ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'];
    const interestsData = ['여행', '독서', '요리', '영화', '사진', '운동', '자기계발', '기타'];
    const attractionsData = ['나와 유머 감각이 통할 때', '지적인 대화를 할 때', '외국어를 유창하게 할 때', '새로운 것에 도전할 때', '감정을 잘 절제할 때', '자기 일을 열심히 할 때', '잘 웃을 때', '옷을 잘 입을 때', '예의 바를 때'];

    const handleSelectItem = (item, setSelected) => {
        return () => {
            setSelected(item);
        };
    };

    const renderItem = (item, selected, setSelected, key) => (
        <TouchableOpacity onPress={handleSelectItem(item.item, setSelected)}>
            <View style={[styles.itemContainer, item.item === selected && styles.selectedItemContainer]}>
                <Text style={[styles.itemText, item.item === selected && styles.selectedItemText]}>{item.item}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ImageBackground 
            source={image.login}
            style={{ flex: 1 }}
        >
            <SafeAreaView style={{ flex: 1, alignItems: "center" }}>
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={styles.header}>이름을 알려주세요</Text>
                    <View style={styles.birthInputContainer}>
                        <TextInput
                            style={styles.birthInput}
                            placeholder="이름을 입력해주세요"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>
                    <Text style={styles.subHeader}>성별을 선택해주세요.</Text>
                    <View style={styles.genderContainer}>
                        <TouchableOpacity onPress={() => setGender('female')} style={[styles.genderButton, gender === 'female' && styles.genderButtonSelected]}>
                            <Text style={styles.genderText}>여자</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setGender('male')} style={[styles.genderButton, gender === 'male' && styles.genderButtonSelected]}>
                            <Text style={styles.genderText}>남자</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.subHeader}>당신의 생일을 입력해주세요.</Text>
                    <View style={styles.birthInputContainer}>
                        <TextInput
                            style={styles.birthInput}
                            placeholder="0000-00-00"
                            value={birth}
                            onChangeText={setBirth}
                            keyboardType="numeric"
                        />
                    </View>
                    <Text style={styles.subHeader}>종교를 선택해주세요.</Text>
                    <View style={styles.pickerContainer}>
                        <FlatList
                            horizontal
                            data={religionData}
                            keyExtractor={(item) => item}
                            renderItem={(item) => renderItem(item, religion, setReligion, 'religion')}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ alignItems: 'center' }}
                        />
                    </View>
                    <Text style={styles.subHeader}>MBTI를 선택해주세요.</Text>
                    <View style={styles.pickerContainer}>
                        <FlatList
                            horizontal
                            data={mbtiData}
                            keyExtractor={(item) => item}
                            renderItem={(item) => renderItem(item, mbti, setMbti, 'mbti')}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ alignItems: 'center' }}
                        />
                    </View>
                    <Text style={styles.subHeader}>관심사를 선택해주세요.</Text>
                    <View style={styles.pickerContainer}>
                        <FlatList
                            horizontal
                            data={interestsData}
                            keyExtractor={(item) => item}
                            renderItem={(item) => renderItem(item, interests, setInterests, 'interests')}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ alignItems: 'center' }}
                        />
                    </View>
                    <Text style={styles.subHeader}>나의 매력을 선택해주세요.</Text>
                    <View style={styles.pickerContainer}>
                        <FlatList
                            horizontal
                            data={attractionsData}
                            keyExtractor={(item) => item}
                            renderItem={(item) => renderItem(item, attractions, setAttractions, 'attractions')}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ alignItems: 'center' }}
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.applyButton}
                        onPress={() => {
                            handleInsertCommonData();
                        }}
                    >
                        <LinearGradient
                            colors={['#f9a3b2', '#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888']}
                            style={styles.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.buttonText}>적용하기</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </ImageBackground>
    )
}
export default CommonData;

const styles = StyleSheet.create({
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 10,
    },
    subHeader: {
        fontSize: 16,
        marginVertical: 10,
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '60%',
        marginVertical: 10,
    },
    genderButton: {
        padding: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
        width: 100,
    },
    genderButtonSelected: {
        backgroundColor: '#a450f0',
    },
    genderText: {
        color: '#fff',
    },
    birthInputContainer: {
        marginVertical: 10,
    },
    birthInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 10,
        width: 200,
        textAlign: 'center',
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    itemContainer: {
        padding: 10,
        marginHorizontal: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        width: 100,
    },
    selectedItemContainer: {
        backgroundColor: '#a450f0',
    },
    itemText: {
        color: '#000',
    },
    selectedItemText: {
        color: '#fff',
    },
    pickerUnit: {
        fontSize: 16,
        marginLeft: 10,
    },
    applyButton: {
        marginTop: 25,
        borderRadius: 20,
        opacity: 0.7,
    },
    gradient: {
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 20,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});