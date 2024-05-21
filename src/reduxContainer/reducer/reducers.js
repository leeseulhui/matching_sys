import { combineReducers } from "redux";
import {stateUserData} from './userDataReducer'
import {instaUserData} from './signUpReducer'
const rootReducer = combineReducers({
    stateUserData,instaUserData
});

export default rootReducer;
