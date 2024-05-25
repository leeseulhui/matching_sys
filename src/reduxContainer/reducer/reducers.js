import { combineReducers } from "redux";
import {stateUserData} from './userDataReducer'
import {instaUserData} from './signUpReducer'
import {colorAnalysisData} from './colorAnalysisReducer'
const rootReducer = combineReducers({
    stateUserData,instaUserData,colorAnalysisData
});

export default rootReducer;