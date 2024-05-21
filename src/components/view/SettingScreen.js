import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { status_top,fullHeight } from '../../deviceSet';
const SettingScreen = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
  };

  const toggleDarkMode = () => {
    setDarkModeEnabled(previousState => !previousState);
    StatusBar.setBarStyle(darkModeEnabled ? 'light-content' : 'dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(darkModeEnabled ? '#000000' : '#ffffff');
    }
  };
  const toggleAutoSync = () => {
    setAutoSyncEnabled(!autoSyncEnabled);
  };

  const toggleLocation = () => {
    setLocationEnabled(!locationEnabled);
  };

  const toggleEmailNotifications = () => {
    setEmailNotificationsEnabled(!emailNotificationsEnabled);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <View style={styles.container}>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>알림</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={notificationsEnabled ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
        {notificationsEnabled && (
          <View style={styles.subSetting}>
            <Text style={styles.subSettingLabel}>이메일 알림</Text>
            <Switch
              value={emailNotificationsEnabled}
              onValueChange={toggleEmailNotifications}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={emailNotificationsEnabled ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
        )}
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>다크 모드</Text>
          <Switch
            value={darkModeEnabled}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={darkModeEnabled ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>자동 동기화</Text>
          <Switch
            value={autoSyncEnabled}
            onValueChange={toggleAutoSync}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={autoSyncEnabled ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>위치 공유</Text>
          <Switch
            value={locationEnabled}
            onValueChange={toggleLocation}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={locationEnabled ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    marginTop:status_top+(fullHeight*0.05),
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  settingLabel: {
    fontSize: 18,
  },
  subSetting: {
    marginLeft: 20,
  },
  subSettingLabel: {
    fontSize: 16,
    color: '#666666',
  },
});

export default SettingScreen;
