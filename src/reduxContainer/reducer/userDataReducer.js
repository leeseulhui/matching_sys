const userData = {
  username: "",
  password: "",
};

export const stateUserData = (state = userData, action) => {
  if (action.type == "change_user_data") {
    return {
      ...state,
      username: action.username,
      password: action.password,
    };
  } else {
    return state;
  }
};


