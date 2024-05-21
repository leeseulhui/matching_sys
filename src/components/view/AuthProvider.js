import React, { createContext, useState } from 'react';
// 회원 상태 체크 
export const AuthContext = createContext({
  user: null,
  signIn: () => {}, // signIn 함수의 기본값 설정
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const signIn = () => {
    const fakeUser = { username: 'demoUser' }; 
    setUser(fakeUser); // 사용자 상태 업데이트
  };

  return (
    <AuthContext.Provider value={{ user, signIn }}>
      {children}
    </AuthContext.Provider>
  );
};
