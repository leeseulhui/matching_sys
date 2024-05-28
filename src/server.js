//require('dotenv').config();
require('dotenv').config({ path: '/Users/leeseulhui/Desktop/matching_sys-main/.env'}); //슬희꺼
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const WebSocket = require('ws');
const AWS = require('aws-sdk');
const fileUpload = require('express-fileupload');
const helmet = require('helmet');
const cors = require('cors');  // cors 모듈을 불러옴
const util = require('util');
const { error } = require('console');

const app = express();
app.use(cors()); // CORS 미들웨어 사용
app.use(helmet());
const port = process.env.PORT || 8080;

// db 연결됐는지 확인하려고 짜놓음
console.log(process.env.DB_HOST);
console.log(process.env.DB_USER);

// AWS S3 설정
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});



app.use(bodyParser.json());
app.use(fileUpload({
  limits: { fileSize: 15 * 1024 * 1024 },
}));

// 데이터베이스 연결 설정
const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// WebSocket 서버 설정(채팅)
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// 매칭 ID별로 클라이언트 관리
const clientsByMatchingID = {};

wss.on('connection', (ws) => {
    // 초기 연결 시 매칭 ID 설정을 기다림
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            if (message.type === 'join') {
                // 매칭 ID에 클라이언트 연결
                const matchingID = message.matchingID;
                if (!clientsByMatchingID[matchingID]) {
                    clientsByMatchingID[matchingID] = new Set();
                }
                clientsByMatchingID[matchingID].add(ws);
                ws.matchingID = matchingID; // 연결에 매칭 ID 저장
                console.log(`Client joined matching ID: ${matchingID}`);
            } else if (message.type === 'message') {
                // 메시지 전송 로직
                const matchingClients = clientsByMatchingID[ws.matchingID];
                if (matchingClients) {
                    matchingClients.forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(message));
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to process message:', error);
        }
    });

    ws.on('close', () => {
        // 연결 종료 시 클라이언트 제거
        const matchingClients = clientsByMatchingID[ws.matchingID];
        if (matchingClients) {
            matchingClients.delete(ws);
            console.log(`Client left matching ID: ${ws.matchingID}`);
        }
    });
});

//해시태그 관련
app.post('/api/instagram/posts', async (req, res) => {
  const { userId, hashtags } = req.body;  // 받은 데이터에서 userId와 hashtags 추출

  if (!userId || !hashtags) {
    console.log("Request data:", req.body);  // 요청 데이터 로깅
    return res.status(400).send('Missing userID or hashtags');
  }

  // hashtags가 문자열로 변환되어 있는 상태를 그대로 사용하여 데이터베이스에 삽입하거나 업데이트
  const sql = 'INSERT INTO InstagramPosts (UserID, Hashtags) VALUES (?, ?) ON DUPLICATE KEY UPDATE Hashtags = ?';

  try {
    const [results] = await connection.query(sql, [userId, hashtags, hashtags]);
    console.log('Hashtags saved or updated successfully:', results);
    if (results.affectedRows === 1) {
      res.status(201).json({ message: "Hashtags saved successfully", data: results.insertId });
    } else if (results.affectedRows === 2) {
      res.status(200).json({ message: "Hashtags updated successfully", data: results.insertId });
    } else {
      throw new Error("No rows affected");
    }
  } catch (error) {
    console.error('Error inserting or updating hashtags:', error);
    return res.status(500).send('Failed to save or update hashtags');
  }
});

// 채팅 메시지를 데이터베이스에 저장하고 응답하는 HTTP API
app.post('/chat/messages', async (req, res) => {
  const { matchingID, senderID, receiverID, messageContent } = req.body;
  const insertQuery = `INSERT INTO Messages (MatchingID, SenderID, ReceiverID, MessageContent, SentDate, DeletedContent)
    VALUES (?, ?, ?, ?, NOW(), NULL)
  `;
  console.log("Prepared to send with MatchingID:", matchingID);
  try {
    console.log("Trying to insert into database");
    const [result] = await connection.query(insertQuery, [matchingID, senderID, receiverID, messageContent]);
    const newMessageId = result.insertId;
    console.log("Insertion successful, new Message ID:", newMessageId);
    const newMessage = {
      MessageID: newMessageId,
      MatchingID: matchingID,
      SenderID: senderID,
      ReceiverID: receiverID,
      MessageContent: messageContent,
      SentDate: new Date().toISOString(),
    };
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(newMessage));
      }
    });
    res.status(200).json(newMessage);
  } catch (error) {
    console.error('Error inserting message into database:', error);
    res.status(500).json({ error: 'Error inserting message into database', details: error });
  }
});


// 마이페이지 - 이미지 업로드
app.post('/upload-profile-image', async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('파일이 업로드되지 않았습니다.');
  }
  const { userId } = req.body;
  const profileImage = req.files.profileImage;
  const s3BucketName = process.env.AWS_S3_BUCKET;
  const params = {
      Bucket: s3BucketName,
      Key: `profile-images/${userId}/${profileImage.name}`,
      Body: profileImage.data,
      ContentType: profileImage.mimetype,
  };
  try {
      const uploadResult = await s3.upload(params).promise();
      const imageUrl = uploadResult.Location;

      const updateQuery = 'UPDATE Users SET User_profile_image = ? WHERE User_id = ?';
      const [updateResult] = await connection.query(updateQuery, [imageUrl, userId]);
      res.json({ message: '프로필 이미지 업로드 및 데이터베이스 업데이트 성공', imageUrl: imageUrl });
  } catch (error) {
      console.error('이미지 업로드 또는 데이터베이스 업데이트 중 오류 발생:', error);
      res.status(500).send('이미지 업로드 또는 데이터베이스 업데이트 오류');
  }
});

//인스타 피드 이미지 저장
app.post('/save-selected-images', async (req, res) => {
  const { userId, imageUrls } = req.body; // 클라이언트로부터 userId와 이미지 URL 목록을 받습니다.

  if (!imageUrls || imageUrls.length === 0) {
    return res.status(400).send('No images provided.');
  }
  
  try {
    // 이미지 URL들을 데이터베이스에 저장
    const insertQuery = 'INSERT INTO Images (UserID, ImageURL) VALUES (?, ?)';
    const promises = imageUrls.map(imageUrl => 
      connection.query(insertQuery, [userId, imageUrl])
    );
    await Promise.all(promises); // 모든 프로미스가 완료될 때까지 기다립니다.

    res.status(200).json({ message: 'Images successfully saved to the database.' });
  } catch (error) {
    console.error('Error while saving images to the database:', error);
    res.status(500).json({ error: 'Failed to save images to the database', details: error });
  }
});


// 사용자 테이블
app.post('/users', async (req, res) => {
  const userData = req.body;

  const query = 
      `INSERT INTO Users (User_id, Username, User_status, User_role,
                           Birthdate, Gender, Registration_date, 
                          Modification_date, Sns_account_url, LikesRecord, 
                        User_profile_image, auth_token, Religion, MBTI, Interests, Attractions ) 
      VALUES (?, ?, 'active', 'general', ?, ?, NOW(), NOW(), ?, 0, NULL, ?, ?, ?, ?, ?)`;

  try {
      const [result] = await connection.query(query, [
        userData.User_id,
        userData.Username,
        userData.Birthdate,
        userData.Gender,
        userData.Sns_account_url,
        userData.auth_token,
        userData.Religion,
        userData.MBTI,
        userData.Interests,
        userData.Attractions
      ]);
      console.log('데이터베이스에 데이터가 성공적으로 삽입됨', result);
      res.status(200).json({ message: '데이터베이스에 데이터가 성공적으로 삽입됨', result: result });
  } catch (error) {
      console.error('데이터베이스에 데이터를 삽입하는 중 오류 발생', error);
      res.status(500).json({ error: '데이터베이스에 데이터를 삽입하는 중 오류 발생', details: error });
  }
});

app.patch('/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { username, birthdate, gender, email } = req.body;

  const query = `
    UPDATE Users 
    SET Username = ?, Birthdate = ?, Gender = ?, Email = ? 
    WHERE User_id = ?`;

  // 쿼리 실행
  connection.query(query, [username, birthdate, gender, email, userId], (err, result) => {
      if (err) {
          console.error('데이터베이스 업데이트 중 오류 발생:', err);
          res.status(500).json({ error: '데이터베이스 업데이트 중 오류 발생', details: err });
      } else {
          console.log('데이터베이스 업데이트 성공:', result);
          // 업데이트된 행의 수를 확인하여 결과를 사용자에게 알림
          if (result.affectedRows > 0) {
              res.status(200).json({ message: '사용자 정보가 성공적으로 업데이트 되었습니다.' });
          } else {
              // 업데이트된 행이 없다면, 사용자 ID가 잘못되었을 수 있음
              res.status(404).json({ message: '해당 사용자를 찾을 수 없습니다.' });
          }
      }
  });
});

app.get('/users/:userId', async (req, res) => {
  const userId = req.params.userId; // 클라이언트가 요청한 userId를 가져옴

  const query = `SELECT * FROM Users WHERE User_id = ?`;

  try {
      // connection.query를 await를 사용해 비동기적으로 실행
      const [results] = await connection.query(query, [userId]);
      
      if (results.length > 0) {
          console.log('사용자 프로필을 성공적으로 가져옴');
          console.log(results);
          res.status(200).json(results[0]); // 결과의 첫 번째 항목을 응답으로 반환
      } else {
          res.status(404).json({ message: '사용자를 찾을 수 없음' });
      }
  } catch (err) {
      console.error('데이터베이스에서 사용자 프로필을 가져오는 중 오류 발생', err);
      res.status(500).json({ error: '데이터베이스에서 사용자 프로필을 가져오는 중 오류 발생', details: err });
  }
});

//이상형 (질문)
app.post('/IdealTypes', async (req, res) => {
  const { UserID, age, religion, personality, interests, attract } = req.body;
  console.log('Received data:', req.body);

  if (!UserID) {
    console.error("UserID is missing or null in the received data");
    return res.status(400).json({ error: "UserID cannot be null" });
  }

  const checkQuery = `SELECT * FROM IdealTypes WHERE UserID = ?`;
  try {
    const [users] = await connection.query(checkQuery, [UserID]);
    let sql;
    if (users.length > 0) {
      // Update the existing record
      sql = `UPDATE IdealTypes SET Religion = ?, Personality = ?, Interests = ?, AttractionActions = ?, Age = ? WHERE UserID = ?`;
      await connection.query(sql, [religion, personality, interests, attract, age, UserID]);
      res.status(200).json({ message: 'Ideal type updated successfully' });
    } else {
      // Insert a new record
      sql = `INSERT INTO IdealTypes (UserID, Religion, Personality, Interests, AttractionActions, Age) VALUES (?, ?, ?, ?, ?, ?)`;
      await connection.query(sql, [UserID, religion, personality, interests, attract, age]);
      res.status(200).json({ message: 'Ideal type saved successfully' });
    }
  } catch (error) {
    console.error('Error accessing the database:', error);
    res.status(500).json({ error: 'Database access error', details: error });
  }
});


//이상형 (나와 유사한 사용자 받아오는 부분)
app.get('/matchUsers', async (req, res) => {
  const { userID } = req.query;
  if (!userID) {
    return res.status(400).json({ error: 'UserID parameter is required' });
  }
  try {
    const query = `
      SELECT it.*, us.Username, us.User_profile_image 
      FROM IdealTypes it
      JOIN Users us ON it.UserID = us.User_id
      WHERE it.UserID = ?;
    `;
    const [results] = await connection.query(query, [userID]);

    if (results.length > 0) {
      console.log(results);
      res.json(results);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/get-matching-id', async (req, res) => {
  const { user1ID, user2ID } = req.body;
  try {
    const query = `SELECT MatchingID FROM Matching WHERE (User1ID = ? AND User2ID = ?) OR (User1ID = ? AND User2ID = ?)`;
    const [rows] = await connection.query(query,[user1ID, user2ID, user2ID, user1ID]);

    if (rows.length > 0) {
      res.json({ matchingID: rows[0].MatchingID });
    } else {
      res.status(404).json({ message: 'No matching found' });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Database error', error });
  }
});

app.get('/user-photos/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
      const [results] = await connection.query(`SELECT ImageURL FROM Images WHERE UserID = ?`, [userId]);
      if (results.length > 0) {
          const photoUrls = results.map(result => result.ImageURL);
          res.status(200).json(photoUrls);
      } else {
          res.status(404).json({ message: '해당 사용자의 사진을 찾을 수 없음' });
      }
  } catch (err) {
      console.error('데이터베이스에서 사용자 사진 URL을 가져오는 중 오류 발생', err);
      res.status(500).json({ error: '데이터베이스에서 사용자 사진 URL을 가져오는 중 오류 발생', details: err });
  }
});

app.post('/get-matching-id', async (req, res) => {
  const { user1ID, user2ID } = req.body;
  try {
    const query = `SELECT MatchingID FROM Matching WHERE (User1ID = ? AND User2ID = ?) OR (User1ID = ? AND User2ID = ?)`;
    const [rows] = await connection.query(query,[user1ID, user2ID, user2ID, user1ID]);

    if (rows.length > 0) {
      res.json({ matchingID: rows[0].MatchingID });
    } else {
      res.status(404).json({ message: 'No matching found' });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Database error', error });
  }
});


///////////////////////////////

//테스트용 채팅id 찾기
app.get('/chatItem/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const fir_query = `SELECT MatchingID,User1ID,User2ID FROM Matching WHERE User1ID = ?;`;
    const sec_query = `SELECT MatchingID,User1ID,User2ID FROM Matching WHERE User2ID = ?;`;

    // 두 개의 쿼리를 병렬로 실행
    const [fir_response, sec_response] = await Promise.all([
      connection.query(fir_query, [id]),
      connection.query(sec_query, [id])
    ]);

    // 두 개의 쿼리 결과를 하나의 배열로 합치기
    const combined_response = [...fir_response[0], ...sec_response[0]];

    if (combined_response.length > 0) {
      console.log(combined_response)
      res.json(combined_response);
    } else {
      res.status(404).json({ message: 'No matching found' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//채팅 이름 내역 쿼리
app.get('/chatname/:userId', async (req, res) => {
  const userId = req.params.userId;
  const nameQuery = 'SELECT Username FROM Users WHERE User_id = ?';
  try {
    const [result] = await connection.query(nameQuery, [userId]);
    if (result.length > 0) {
      res.json(result[0]); // 첫 번째 결과만 반환
      console.log(result[0]); // 로그를 통해 결과 확인
    } else {
      res.status(404).json({ error: "User not found" }); // 사용자가 없을 경우
    }
  } catch (e) {
    console.error("Database error", e);
    res.status(500).json({ error: "Database error", details: e.message }); // 서버 에러 처리
  }
});

app.get('/match/:matchingID', async (req, res) => {
  const { matchingID } = req.params;
  const query = 'SELECT * FROM Matching WHERE MatchingID = ?';
  try {
    const [results] = await connection.query(query, [matchingID]);
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: 'Matching not found' });
    }
  } catch (error) {
    console.error('Failed to fetch matching:', error);
    res.status(500).json({ error: 'Failed to fetch matching', details: error });
  }
});


// 자기소개서 생선 전 질문에 대한 답변 부분
app.post('/api/responses', (req, res) => {
  const { userId, responses } = req.body;
  let completedQueries = 0;
  let hasErrors = false;

  responses.forEach(response => {
    const { category, question_index, answer } = response;
    connection.query('INSERT INTO UserResponses (User_id, QuestionIndex, Answer, Category, CreationDate, LastModifiedDate) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [userId, question_index, answer, category], (error, results) => {
        completedQueries++;
        if (error) {
          hasErrors = true;
          console.error('Database error:', error);
        }
        // 모든 쿼리가 완료되었는지 확인
        if (completedQueries === responses.length) {
          if (hasErrors) {
            res.status(500).json({ message: 'An error occurred while saving responses' });
          } else {
            res.status(200).json({ message: 'Responses saved successfully' });
          }
        }
      });
  });

  if (responses.length === 0) {
    res.status(400).json({ message: "No responses provided" });
  }
});


//Mainscreen에서 비슷한 유저 띄우기
app.get('/api/profiles/similar', async (req, res) => {

  //클라이언트로부터 선호도 파라미터 받음
  const { personality, interests, lifestyle } = req.query;

  try {
    const query = `
      SELECT * FROM IdealTypes
      WHERE Personality = ? AND Interests = ? AND Lifestyle = ?
      LIMIT 10;
    `;
    const [similarProfiles] = await connection.query(query, [personality, interests, lifestyle]);
    
    if (similarProfiles.length > 0) {
      res.status(200).json(similarProfiles);
    } else {
      res.status(404).json({ message: 'No similar profiles found' });
    }
  } catch (error) {
    console.error('Error fetching similar profiles:', error);
    res.status(500).json({ error: 'Failed to fetch similar profiles', details: error });
  }
});


// 해시태그 유사도 저장
app.post('/api/save-similarity', async (req, res) => {
  let { userId1, userId2, similarity } = req.body;
  if (userId1 > userId2) {
    [userId1, userId2] = [userId2, userId1]; // ES6 destructuring to swap values
  }

  try {
    // Check if userId2 exists in Users table
    const [rows] = await connection.query("SELECT COUNT(*) as count FROM Users WHERE User_id = ?", [userId2]);
    if (rows[0].count === 0) {
      throw new Error(`user_id2 ${userId2} does not exist in Users table`);
    }

    const query = `INSERT INTO UserSimilarity (user_id1, user_id2, similarity_score) 
                   VALUES (?, ?, ?) 
                   ON DUPLICATE KEY UPDATE similarity_score = VALUES(similarity_score)`;
    const [result] = await connection.query(query, [userId1, userId2, similarity]);
    console.log('Similarity saved, ID:', result.insertId);
    res.json({ message: 'Similarity saved successfully', newId: result.insertId });
  } catch (error) {
    console.error('Failed to save similarity:', error);
    res.status(500).json({ message: 'Failed to save similarity', details: error.toString() });
  }
});

// 생성한 자기소개서 프로필 디자인을 db에 저장하는 엔드포인트
app.post('/api/profile/image-save' , async (req, res)=>{
  const {User_id, DesignName,DesignImage} = req.body;
  const query = `
    INSERT INTO ProfileDesign (User_id, DesignName, DesignImage, CreationDate, LastModifiedDate)
    VALUES (?, ?, ?, NOW(), NULL);
  `;
  try{
    connection.query(query, [User_id, DesignName, DesignImage], (err, results) => {
      if (err) {
        console.error('Failed to insert data into ProfileDesign', err);
        res.status(500).send('Failed to insert data');
      } else {
        console.log('Insert successful', results);
        res.send('Profile design added successfully');
      }
    });
  }catch(err){
    console.error('Failed to insert data into ProfileDesign', err);
    res.status(500).send('Failed query');
  }
});

 // 사용자의 색감분석 데이터를 가져오는 엔드포인트
 app.post('/insta/feed/color',async(req, res) =>{
  const {userId} = req.body;
  try{
    const query= 'SELECT average_color, mood_symbol FROM InstagramFeed WHERE User_id = ?'
    const [results] = await connection.query(query, [userId]);

    if (results.length > 0) {
      console.log(results);
      res.json(results);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//현재 로그인을 하고 있는 사람의 이상형을 받아오는 쿼리
app.get('/api/ideal-type', async (req, res) => {
  const { userId } = req.query;
  const sql = `
    SELECT User_id, Username, Birthdate, Religion, MBTI AS Personality, Interests, Attractions AS AttractionActions
    FROM Users
    WHERE User_id = ?
  `;
  try {
    const [userIdealType] = await connection.query(sql, [userId]);
    if (userIdealType.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userIdealType[0]);
  } catch (error) {
    console.error('Error fetching user ideal type data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// 매칭을 위해서 받아온 랜던 5명의 유저의 프로필 정보를 가져오는 쿼리
app.get('/api/ideal-typeR', async (req, res) => {
  const { userId } = req.query;
  const sql = `
    SELECT u.User_id, u.Username, u.Birthdate, it.Religion, it.Personality, it.Interests, it.AttractionActions, it.Age
    FROM Users u
    JOIN IdealTypes it ON u.User_id = it.UserID
    WHERE u.User_id = ?
  `;
  try {
    const [userIdealType] = await connection.query(sql, [userId]);
    if (userIdealType.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userIdealType[0]);
  } catch (error) {
    console.error('Error fetching user ideal type data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//유저아이디를 가지고 유저테이블에서 유저 이미지 url을 받아오는 쿼리
app.get('/api/user-profile', async (req, res) => {
  const userId = req.query.userId;
  console.log(`Received request for user profile image with userId: ${userId}`);

  if (!userId) {
    return res.status(400).json({ error: 'userId가 필요합니다.' });
  }

  const query = 'SELECT User_profile_image FROM Users WHERE User_id = ?';
  
  try {
    const [results] = await connection.query(query, [userId]);
    
    console.log('쿼리 결과:', results); // 쿼리 결과 로그 출력

    if (results.length === 0) {
      console.log('사용자를 찾을 수 없습니다.');
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    console.log(`Sending profile image URL: ${results[0].User_profile_image}`);
    res.json({ User_profile_image: results[0].User_profile_image });
  } catch (err) {
    console.error('데이터베이스 쿼리 중 에러 발생:', err);
    res.status(500).json({ error: '데이터베이스 쿼리 중 에러 발생' });
  }
});


//이상형 유사도 저장 쿼리
app.post('/api/save-idealsimilarity', async (req, res) => {
  let { userId1, userId2, similarity } = req.body;
  if (userId1 > userId2) {
    [userId1, userId2] = [userId2, userId1]; // ES6 destructuring to swap values
  }

  try {
    // Check if userId2 exists in Users table
    const [rows] = await connection.query("SELECT COUNT(*) as count FROM Users WHERE User_id = ?", [userId2]);
    if (rows[0].count === 0) {
      throw new Error(`user_id2 ${userId2} does not exist in Users table`);
    }

    const query = `INSERT INTO UserIdealSimilarity (user_id1, user_id2, idealsimilarity_score) 
                   VALUES (?, ?, ?) 
                   ON DUPLICATE KEY UPDATE idealsimilarity_score = VALUES(idealsimilarity_score)`;
    const [result] = await connection.query(query, [userId1, userId2, similarity]);
    console.log('Similarity saved, ID:', result.insertId);
    res.json({ message: 'Similarity saved successfully', newId: result.insertId });
  } catch (error) {
    console.error('Failed to save similarity:', error);
    res.status(500).json({ message: 'Failed to save similarity', details: error.toString() });
  }
});


// 해시태그 분석을 위한 랜덤유저 해시태그 정보 받아오는 쿼리
app.get('/api/random-users', async (req, res) => {
  const { userId } = req.query;  // 쿼리 파라미터에서 userId 추출
  if (!userId) {
    return res.status(400).send('Missing userId');
  }

  try {
      const query = `
          SELECT u.User_id, u.Username, p.Hashtags
          FROM Users u
          JOIN InstagramPosts p ON u.User_id = p.UserID
          WHERE u.User_id != ?
          ORDER BY RAND()
          LIMIT 5;
      `;
      const [users] = await connection.query(query, [userId]);  // userId를 쿼리 파라미터로 전달
      res.json(users);
  } catch (error) {
      console.error('랜덤 사용자를 불러오는 중 에러 발생:', error);
      res.status(500).send('데이터를 불러오는 중 에러 발생');
  }
});

//얼굴분석을 마친 데이터를 db에 저자을 해주는 쿼리
app.post('/api/store-similarity', async (req, res) => {
  const { user_id1, user_id2, similarity_score } = req.body;
  const query = `
    INSERT INTO UserFaceSimilarity (user_id1, user_id2, similarity_score)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE similarity_score = VALUES(similarity_score), calculation_date = CURRENT_TIMESTAMP;
  `;

  try {
    await connection.query(query, [user_id1, user_id2, similarity_score]);
    res.status(200).json({ message: 'Similarity score stored successfully' });
  } catch (err) {
    console.error('Error storing similarity score:', err);
    res.status(500).json({ error: 'Error storing similarity score' });
  }
});

//얼굴분석이 끝난 유사도를 정장해 주는 쿼리
app.post('/api/store-similarity', async (req, res) => {
  const { user_id1, user_id2, similarity_score } = req.body;
  const query = `
    INSERT INTO UserFaceSimilarity (user_id1, user_id2, similarity_score)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      similarity_score = IF(similarity_score != VALUES(similarity_score), VALUES(similarity_score), similarity_score),
      calculation_date = IF(similarity_score != VALUES(similarity_score), CURRENT_TIMESTAMP, calculation_date);
  `;

  try {
    await connection.query(query, [user_id1, user_id2, similarity_score]);
    res.status(200).json({ message: 'Similarity score stored successfully' });
  } catch (err) {
    console.error('Error storing similarity score:', err);
    res.status(500).json({ error: 'Error storing similarity score' });
  }
});




const query = util.promisify(connection.query).bind(connection);

// 유사도 데이터를 가져오는 API 엔드포인트
app.get('/similarity/:userId/:randomUserIds', async (req, res) => {
  const { userId, randomUserIds } = req.params;
  const userIds = randomUserIds.split(',');
  const userIdsString = userIds.map(id => `'${id}'`).join(',');

  console.log(`Request received for userId: ${userId} with randomUserIds: ${randomUserIds}`);

  const queries = [
    `SELECT similarity FROM DatingProfileSimilarity WHERE user_id_1 = ? AND user_id_2 IN (${userIdsString})`,
    `SELECT similarity_score FROM UserCaptionSimilarity WHERE user_id1 = ? AND user_id2 IN (${userIdsString})`,
    `SELECT similarity_score FROM UserFaceSimilarity WHERE user_id1 = ? AND user_id2 IN (${userIdsString})`,
    `SELECT idealsimilarity_score FROM UserIdealSimilarity WHERE user_id1 = ? AND user_id2 IN (${userIdsString})`,
    `SELECT similarity_score FROM UserSimilarity WHERE user_id1 = ? AND user_id2 IN (${userIdsString})`
  ];

  try {
    const results = await Promise.all(queries.map(async (q) => {
      console.log(`Executing query: ${q} with userId: ${userId}`);
      const [result] = await connection.query(q, [userId]);
      console.log(`Query result for query "${q}": ${JSON.stringify(result)}`);
      return result;
    }));
    console.log('All queries successful with results:', JSON.stringify(results));
    res.json({
      datingProfileSimilarity: results[0].map(row => row.similarity),
      userCaptionSimilarity: results[1].map(row => row.similarity_score),
      userFaceSimilarity: results[2].map(row => row.similarity_score),
      userIdealSimilarity: results[3].map(row => row.idealsimilarity_score),
      userSimilarity: results[4].map(row => row.similarity_score)
    });
  } catch (err) {
    console.error(`Promise failed with error: ${err}`);
    res.status(500).json({ error: err.message });
  }
});
//매칭테이블 생성
app.post('/match', (req, res) => {
  const { user1ID, user2ID } = req.body;

  if (!user1ID || !user2ID) {
    return res.status(400).send('user1ID와 user2ID가 필요합니다.');
  }

  const query = `INSERT INTO Matching (User1ID, User2ID) VALUES (?, ?)`;
  connection.query(query, [user1ID, user2ID], (err, result) => {
    if (err) {
      console.error('매칭 데이터베이스 삽입 오류:', err);
      return res.status(500).send('매칭 오류가 발생했습니다.');
    }
    res.status(201).send({ message: '매칭 성공', matchingID: result.insertId });
  });
});

//사용자 프로필(마이페이지) 정보 수정 쿼리
app.patch('//usersupdate/:userId', async (req, res) => {
  const { userId, username, gender, birthdate, snsAccountUrl, religion, mbti, interests, attractions } = req.body;

  const query = `
    UPDATE Users 
    SET Username = ?, Gender = ?, Birthdate = ?, Sns_account_url = ?, Religion = ?, MBTI = ?, Interests = ?, Attractions = ?
    WHERE User_id = ?
  `;

  try {
    const [result] = await connection.query(query, [
      username, gender, birthdate, snsAccountUrl, religion, mbti, interests, attractions, userId
    ]);

    if (result.affectedRows > 0) {
      res.status(200).json({ message: '프로필이 성공적으로 업데이트되었습니다.' });
    } else {
      res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error('프로필 업데이트 중 오류 발생:', error);
    res.status(500).json({ error: '프로필 업데이트 중 오류 발생', details: error });
  }
});



//////////////
//채팅 메시지 전송 기능
app.post('/chat/messages', async (req, res) => {
  const { matchingID, senderID, receiverID, messageContent } = req.body;
  if (!matchingID || !senderID || !receiverID || !messageContent) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const insertQuery = `
    INSERT INTO Messages (MatchingID, SenderID, ReceiverID, MessageContent, SentDate, DeletedContent)
    VALUES (?, ?, ?, ?, NOW(), NULL)
  `;
  try {
    const [result] = await connection.query(insertQuery, [matchingID, senderID, receiverID, messageContent]);
    const newMessageId = result.insertId;
    const newMessage = {
      MessageID: newMessageId,
      MatchingID: matchingID,
      SenderID: senderID,
      ReceiverID: receiverID,
      MessageContent: messageContent,
      SentDate: new Date().toISOString(),
    };
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.matchingID === matchingID) {
        client.send(JSON.stringify(newMessage));
      }
    });
    res.status(200).json(newMessage);
  } catch (error) {
    console.error('Error inserting message into database:', error);
    res.status(500).json({ error: 'Error inserting message into database', details: error });
  }
});

//채팅 메시지 조회 http api
app.get('/chat/messages/:matchingID', async (req, res) => {
  const matchingID = req.params.matchingID;
  try {
    const query = 'SELECT * FROM Messages WHERE MatchingID = ? ORDER BY SentDate ASC';
    const [messages] = await connection.query(query, [matchingID]);
    if (messages.length > 0) {
      res.status(200).json({ messages });
    } else {
      res.status(404).json({ message: 'No messages found for this matching ID.' });
    }
  } catch (error) {
    console.error('Failed to retrieve messages:', error);
    res.status(500).json({ message: 'Failed to retrieve messages due to server error.', error });
  }
});

//챗봇 제안 기능 제공 http api
app.post('/chatbot/suggestions', async (req, res) => {
  const { userId } = req.body;

  try {
    const [userResult] = await connection.query("SELECT * FROM Users WHERE User_id = ?", [userId]);
    const userProfile = userResult[0];

    if (!userProfile) {
      return res.status(404).json({ error: "User not found" });
    }

    const gptResponse = await openai.createChatCompletion({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Generate conversation starters for someone who likes ${userProfile.Interests}.`,
        },
        {
          role: "user",
          content: `Generate conversation starters for someone who likes ${userProfile.Interests}.`,
        },
      ],
      max_tokens: 50,
      n: 3,
      stop: null,
      temperature: 0.7,
    });

    const suggestions = gptResponse.data.choices.map(choice => choice.message.content.trim());

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching chatbot suggestions:', error);
    res.status(500).json({ error: 'Error fetching chatbot suggestions', details: error });
  }
});



server.listen(port, () => console.log(`Server is running on port ${port}`));