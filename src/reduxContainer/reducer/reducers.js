import { combineReducers } from "redux";
import {stateUserData} from './userDataReducer'
import {instaUserData} from './signUpReducer'
import {colorAnalysisData} from './colorAnalysisReducer'
import {user_answering_data} from './questionAnswerReducer'
const rootReducer = combineReducers({
    stateUserData,instaUserData,colorAnalysisData,user_answering_data
});

export default rootReducer;