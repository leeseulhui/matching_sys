//signUpReducer.js 파일
const usersData={
  User_id: '',
  Username: '',
  User_status: 'active',
  User_role: 'general',
  Birthdate: '',
  Gender: '',
  Sns_account_url: '',
  LikesRecord: 0,
  User_profile_image: null,
  auth_token: '',
  Religion:'',
  MBTI:'',
  Interests:'',
  Attractions:''
}
export const instaUserData = (state = usersData, action) => {
switch(action.type){
  case "sign_up_user":
    return {
      ...state,
      User_id: action.User_id,
      auth_token: action.auth_token,
    };
  case "insert_common_data":
    return {
      ...state,
      Username:action.Username,
      Birthdate:action.Birthdate,
      Gender:action.Gender,
      Religion:action.Religion,
      MBTI:action.MBTI,
      Interests:action.Interests,
      Attractions:action.Attractions
    }
  case "reboot_user_data":
    return{
      ...state,
      User_id: action.User_id,
      auth_token: action.auth_token,
      Username:action.Username,
      Birthdate:action.Birthdate,
      User_profile_image:action.User_profile_image,
      Gender:action.Gender,
      Religion:action.Religion,
      MBTI:action.MBTI,
      Interests:action.Interests,
      Attractions:action.Attractions
    }
  case "update_user_profile_image":
    return {
      ...state,
      User_profile_image:action.User_profile_image
    }
  default:
    return state
} 




};

