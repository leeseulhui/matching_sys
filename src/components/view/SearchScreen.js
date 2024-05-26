//나와 비슷한 유형의 사람 찾는 부분
import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text,TextInput ,FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fullWidth , fullHeight} from '../../deviceSet';
import {image} from '../../../assets/image';

const SearchScreen = () => {
  const [data, setData] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [keyword , setKeyword] = useState('');
  const [history, setHistory] = useState([]);
  //큐 구현
  const enqueue =(item) =>{
    setHistory(prev => {
      const updatedHistory = [...prev];
      if(updatedHistory.length >= 10){
        updatedHistory.shift();
      }
      updatedHistory.push(item);
      return updatedHistory;
    });
  };




  // 태그나 관심사를 선택하는 함수
  const handleSelectTag = (tag) => {
    setSelectedTag(tag);
    loadData(tag);
  };

  // 선택된 태그에 맞는 데이터를 로딩하는 함수
  const loadData = (tag) => {
    // 여기서 데이터 로딩 로직을 구현하세요.
    // 예시: 서버에서 데이터를 가져오거나 로컬의 상태를 업데이트합니다.
    // setData(fetchedData);
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 기본 태그로 데이터 로딩
    handleSelectTag('All');
  }, []);

  const renderItem = (item) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemText}>{item}</Text>
      {/* 아이템에 대한 추가 정보 또는 액션 */}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={{width: fullWidth, height:fullHeight *0.15,  }}>
        <View style={{paddingTop:20,paddingLeft:30}}>
          <Text style={{fontSize:38}}>무엇을</Text>
          <Text style={{fontSize:38, fontWeight:"400"}}>찾고 계신가요?</Text>
        </View>
      </View>
      <View style={{flex:1,flexDirection:'row',justifyContent:"center"}}>
        <View style={{
          width: fullWidth*0.7,
          height: fullHeight*0.024,
          borderRadius:10,
          shadowOpacity:0.5,        
          shadowColor:"rgb(50,50,50)",
          shadowOffset:{
            width:-3,height:-3, 
          },
          marginRight:30
        }}>
          <TextInput
          style={{marginLeft:15,borderBottomWidth:0.2 }}
          placeholder='검색'
          value={keyword}
          onChangeText={setKeyword}
          //  onEndEditing={} //엔터를 눌렀을 때 
          />
        </View>
        <TouchableOpacity  onPress={()=>enqueue(keyword)}
        >
          <View>
            <Image source={image.search} style={{width:24, height:24}}/>
          </View>
        </TouchableOpacity>
      </View>
      <View>
        <FlatList 
        data={history}
        keyExtractor={(item, index)=>index.toString()}
         renderItem={({item})=> renderItem(item)}
        ></FlatList>
      </View>
    </SafeAreaView>
  );
};

   
      {/* 태그 선택 UI를 렌더링합니다. */}
      {/* 예시: <TouchableOpacity onPress={() => handleSelectTag('Music')}><Text>Music</Text></TouchableOpacity> */}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  itemContainer: {
    padding: 20,
    marginVertical: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  itemText: {
    fontSize: 18,
  },
});

export default SearchScreen;
