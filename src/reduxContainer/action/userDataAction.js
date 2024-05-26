export const change_user_data = (username, password) => {
  return {
    type: "change_user_data",
    username: username,
    password: password,
  };
};
