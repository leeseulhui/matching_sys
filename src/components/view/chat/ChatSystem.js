import {useState} from 'react';
import {SafeAreaView,View,Text,TouchableOpacity} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

//채팅 시작 전에 얼굴 인식
const ChatSystem=()=>{

    const [userID,setUserId] = useState('');
    const getUserId = async () => {
        try {
          const resp = await AsyncStorage.getItem('user_id');
          if (resp !== null) {
            setUserId(resp);
          } else {
            console.log('No user token found');
          }
        } catch (error) {
          console.error('Error fetching userToken:', error);
        }
      };
    
    return(
        <SafeAreaView style={{alignItem:"center", justifyContent:"center"}}>
            <View>
                <Text>데이터 확인하기</Text>
                <Text>{userID}</Text>
                <TouchableOpacity onPress={()=>getUserId()}>
                <Text style={{width:150, height: 150}}>check!</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    )


}
export default ChatSystem;