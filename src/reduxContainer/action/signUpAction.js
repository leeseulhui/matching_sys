//signUpAction.js
export const sign_up_action = (userId, accessToken) => {
    return {
      type: "sign_up_user",
      User_id: userId,
      auth_token: accessToken,
    };
  };
export const insert_common_data = (name, gender ,birth,religion, mbti, interests, attractions)=>{
  return {
    type: "insert_common_data",
    Username:name,
    Birthdate:birth,
    Gender:gender,
    Religion: religion,
    MBTI: mbti,
    Interests: interests,
    Attractions: attractions
  }
}
export const reboot_user_data = (userId, accessToken, name, birth, gender, religion, mbti, interests, attractions) =>{
  return {
    type: "reboot_user_data",
    User_id: userId,
    auth_token: accessToken,
    Username:name,
    Birthdate:birth,
    Gender:gender,
    Religion: religion,
    MBTI: mbti,
    Interests: interests,
    Attractions: attractions
  }
}
export const update_user_profile_image = (profileImage)=>{
  return{
    type:"update_user_profile_image",
    User_profile_image:profileImage
  }
}