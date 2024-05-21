import {Dimensions} from 'react-native'
import { getStatusBarHeight } from 'react-native-status-bar-height';

export const fullWidth=Dimensions.get('window').width;
export const fullHeight=Dimensions.get('window').height;
export const status_top=getStatusBarHeight(true);

export const baseURL = Platform.OS === 'ios' ? 'http://localhost' : 'http://10.0.2.2'; 