from flask import Flask, request, jsonify
from datetime import datetime
import os
from dotenv import load_dotenv
import mysql.connector
import logging
import openai
from flask_cors import CORS
from io import BytesIO
import re 

#이미지 캡션 라이브러리
from azure_service import generate_caption, extract_nouns
import json
#자기소개서 유사도분석 라이브러리
from sentence_transformers import SentenceTransformer, util

#색감분석 라이브러리
import colorsys 
from colorthief import ColorThief
import matplotlib.pyplot as plt
from collections import defaultdict
from PIL import Image
import numpy as np
import requests
from werkzeug.utils import secure_filename

#얼굴 유사도분석 라이브러리
from similarity import face_similarity
import tempfile
import traceback    #오류 추적을 위함

# 얼굴 인식
from face_detection_check import detect_faces

# 해시태그 분석
import networkx as nx
import matplotlib.pyplot as plt
from matplotlib import colors
from nltk.corpus import wordnet as wn
from googletrans import Translator
import nltk
nltk.download('wordnet')

# 얼굴 인식
from face_detection_check import detect_faces
# 해시태그 분석
from hash_similarity import similarity_blueprint
#연결 확인 부분(터미널에 뜨는 곳)
app = Flask(__name__)

CORS(app)  # 모든 도메인에 요청 허용
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

db_host = os.getenv('DB_HOST')
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')
db_name = os.getenv('DB_NAME')

model = SentenceTransformer('sentence-transformers/paraphrase-mpnet-base-v2')

try:
    db_connection = mysql.connector.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        database=db_name
    )
    logger.info("DB 연결 성공")
    db_cursor = db_connection.cursor()
except mysql.connector.Error as error:
    logger.error(f"DB 연결 실패: {error}")
    db_connection = None

#API 키 설정 및 확인
openai_api_key = os.getenv("OPENAI_API_KEY")
dalle_api_key = os.getenv("OPENAI_API_KEY")
print("Loaded OPENAI_API_KEY:", openai_api_key)

#자기소개서 디자인
def generate_design(prompt, dalle_api_key):
    dalle_api_key = os.getenv("DALLE_API_KEY")
    openai.api_key = dalle_api_key
    
    try:
        # 이미지 생성 요청을 보냅니다.
        response = openai.Image.create(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        
        # 성공적으로 이미지를 생성했을 경우
        if response.status == 200:
            # 생성된 이미지의 URL을 추출합니다.
            image_url = response['data'][0]['url']
            print("Generated image URL:", image_url)
            return image_url
        else:
            print("Failed to generate image:", response.status)
            return None
    except Exception as e:
        # API 호출 중에 오류가 발생했을 경우
        print("An error occurred while calling the DALL-E API:", str(e))
        return None


#엔드포인트 모음
@app.route('/save_response', methods=['POST'])
def save_response():
    if not db_connection:
        logger.error('DB 연결 실패')
        return jsonify({'error': 'DB 연결 실패'}), 500

    data = request.get_json()
    logger.info(f'Received data: {data}')
    user_id = data.get('userId')
    responses = data.get('responses')

    if not user_id or not responses:
        logger.error('user_id 또는 responses가 없습니다.')
        return jsonify({'message': '잘못된 요청: user_id 또는 responses 누락'}), 400

    try:
        for response in responses:
            category = response.get('category')
            question_index = response.get('question_index')
            answer = response.get('answer', '')

            if category is None or question_index is None:
                logger.error(f'category 또는 question_index가 없습니다. category: {category}, question_index: {question_index}')
                return jsonify({'message': '잘못된 요청: category 또는 question_index 누락'}), 400

            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            insert_query = """
            INSERT INTO UserResponses (User_id, QuestionIndex, Answer, Category, CreationDate, LastModifiedDate)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            insert_data = (user_id, question_index, answer, category, current_time, current_time)
            db_cursor.execute(insert_query, insert_data)

        db_connection.commit()
        return jsonify({'message': '데이터 저장 성공'}), 200
    except mysql.connector.Error as error:
        db_connection.rollback()
        logger.error(f"데이터베이스에 응답 저장 실패: {error}")
        return jsonify({'message': '데이터 저장 실패'}), 500



# 자기소개서 생성
@app.route('/generate_introduction', methods=['POST'])
def generate_introduction():
    data = request.get_json()
    app.logger.debug(f"Received JSON data: {data}")

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    user_id = data.get('userId')
    responses = data.get('responses')
    answerList = []

    if not user_id:
        app.logger.error("Missing userId in the data")
        return jsonify({'error': 'Missing userId'}), 400

    if responses is None or not isinstance(responses, list):
        app.logger.error("Invalid or missing responses data")
        return jsonify({'error': 'Invalid responses data'}), 400

    try:
        user_query = "SELECT Username FROM Users WHERE User_id = %s"
        db_cursor.execute(user_query, (user_id,))
        user_result = db_cursor.fetchone()
        if not user_result:
            return jsonify({'error': 'User not found'}), 404
        username = user_result[0]

        # responses 리스트에서 answer 데이터를 하나씩 가져와서 처리
        for response in responses:
            if 'answer' in response:
                answer = response.get('answer')
                answerList.append(answer)
                # 로그 추가: answerList에 데이터가 추가될 때마다 로그 출력
                app.logger.debug(f"Updated answerList: {answerList}")
            else:
                app.logger.error("Missing 'answer' in one of the responses")

        user_prompt = f"""Q: 아래의 회원님의 성향을 바탕으로 회원님의 소개서를 작성해줘.
                            회원님 이름 :{username}
                            1. 이상적인 연인의 가장 중요한 특성은 무엇인가요? : {answerList[0]}
                            2. 어떤 상황에서 연인에게 가장 큰 매력을 느끼나요? : {answerList[1]}
                            3. 직업에 있어 가장 중요하다고 생각하는 것은 무엇인가요? : {answerList[2]}
                            4. 어떤 유형의 음식을 선호하나요? : {answerList[3]}
                            5. 여가 시간에 주로 무엇을 하나요? : {answerList[4]}
                            6. 일상에서 마주하는 문제를 해결할 때 어떤 방식을 선호하나요? : {answerList[5]}
                            7. 인생에서 가장 중요한 가치는 무엇인가요? : {answerList[6]}"""

        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
               {"role": "system", "content": """역할은 연애 상담사이고 해야하는 일은 회원님의 이상형 정보를 바탕으로 회원님의 소개서를 작성하는 것이야.
                                                회원님 이름: 강구용
                                                Q: 아래의 회원님의 성향을 바탕으로 회원님의 소개서를 작성해줘.
                                                1. 이상적인 연인의 가장 중요한 특성은 무엇인가요? : 성격
                                                2. 어떤 상황에서 연인에게 가장 큰 매력을 느끼나요? : 대화가 잘 통할 때
                                                3. 직업에 있어 가장 중요하다고 생각하는 것은 무엇인가요? : 급여
                                                4. 어떤 유형의 음식을 선호하나요? : 한식
                                                5. 여가 시간에 주로 무엇을 하나요? : 영화보기
                                                6. 일상에서 마주하는 문제를 해결할 때 어떤 방식을 선호하나요? : 계획적으로
                                                7. 인생에서 가장 중요한 가치는 무엇인가요? : 가족"""},
                {"role": "user", "content": """A:
안녕하세요! 저는 따뜻하고 이해심 많은 사람을 찾고 있는 강구용입니다. 서로의 이야기를 경청하고, 공감할 수 있는 성격을 가진 분에게 가장 큰 매력을 느껴요. 대화가 잘 통할 때 진정한 소통이 가능하다고 믿습니다. 직업에서는 급여가 중요한 만큼, 안정적이고 책임감 있는 삶을 추구합니다.

저는 한식을 특히 좋아해서 주말에는 맛집 탐방을 즐겨요. 다양한 한식 요리를 경험하며 행복을 느낍니다. 여가 시간에는 주로 영화를 보며 휴식을 취하고, 새로운 영화와 클래식을 가리지 않고 다양한 장르를 즐깁니다. 문제를 해결할 때는 항상 계획적으로 접근하여, 꼼꼼하고 체계적으로 해결하는 편입니다.

무엇보다도 가족을 소중히 여기는 가치관을 가지고 있어요. 가족과 함께하는 시간이 가장 행복한 순간이며, 그런 가치관을 공유할 수 있는 사람과 인연을 맺고 싶습니다. 이런 저와 잘 맞는 분과 함께 소중한 추억을 만들어 나가기를 기대합니다!"""},
 {"role": "system", "content": """
Q: 아래의 회원님의 성향을 바탕으로 회원님의 소개서를 작성해줘.
  회원님이름: 이슬희
1. 이상적인 연인의 가장 중요한 특성은 무엇인가요? : 가치관
2. 어떤 상황에서 연인에게 가장 큰 매력을 느끼나요? : 외면이 이상형과 맞을 때 
3. 직업에 있어 가장 중요하다고 생각하는 것은 무엇인가요? : 워라벨
4. 어떤 유형의 음식을 선호하나요? : 일식
5. 여가 시간에 주로 무엇을 하나요? : 여행
6. 일상에서 마주하는 문제를 해결할 때 어떤 방식을 선호하나요? : 계획적으로
7. 인생에서 가장 중요한 가치는 무엇인가요? : 사회적 인정"""},
 {"role": "user", "content": """A:
안녕하세요! 저는 마음이 따뜻한 사람을 찾고 있는 이슬희이에요. 서로의 외모가 이상형과 맞아떨어지는 순간, 두근두근하는 설렘을 느끼곤 하죠. 직업에서는 워라벨을 소중히 여겨서, 일과 삶의 조화를 중요하게 생각해요.

일식을 너무 좋아해서 주말마다 새로운 일식 맛집을 찾아다니며 작은 행복을 즐겨요. 여가 시간에는 여행을 다니며 새로운 곳을 탐험하고, 다양한 문화를 경험하는 걸 좋아해요. 문제를 해결할 때는 항상 계획적으로 접근해서, 차근차근 풀어나가는 스타일이에요.

인생에서 가장 중요한 가치는 사회적 인정이에요. 주변 사람들로부터 존중받고 인정받는 것이 큰 의미가 있죠. 이런 가치관을 공유할 수 있는 분과 함께, 따뜻한 추억을 쌓아가고 싶어요. 저와 함께할 인연을 기다리고 있어요!"""},
{"role":"system","content":"""Q: 아래의 회원님의 성향을 바탕으로 회원님의 소개서를 작성해줘.
 회원님 이름: 박기표
1. 이상적인 연인의 가장 중요한 특성은 무엇인가요? : 생활방식
2. 어떤 상황에서 연인에게 가장 큰 매력을 느끼나요? : 특정 행동
3. 직업에 있어 가장 중요하다고 생각하는 것은 무엇인가요? : 자기계발
4. 어떤 유형의 음식을 선호하나요? : 양식
5. 여가 시간에 주로 무엇을 하나요? : 책 읽기
6. 일상에서 마주하는 문제를 해결할 때 어떤 방식을 선호하나요? : 주변의 조언을 구해서
7. 인생에서 가장 중요한 가치는 무엇인가요? : 명예"""},{"role":"user","content":"""A:
안녕하세요! 저는 비슷한 생활방식을 공유할 수 있는 사람을 찾고 있는 박기표에요. 작은 행동 하나에도 배려와 따뜻함이 느껴질 때, 그 사람에게 깊은 매력을 느끼곤 합니다. 직업에서는 자기계발을 중요하게 생각해서, 항상 스스로를 발전시키고자 노력해요.

양식을 좋아해서 다양한 양식 요리를 시도하는 걸 즐깁니다. 여가 시간에는 주로 책을 읽으며 새로운 지식과 영감을 얻고 있어요. 문제를 해결할 때는 주변의 조언을 구하며, 여러 사람의 의견을 듣고 최선의 방법을 찾는 편이에요.

인생에서 가장 중요한 가치는 명예입니다. 스스로에게 자부심을 가질 수 있는 삶을 살고, 주변 사람들로부터 존경받는 것이 중요하다고 생각해요. 이런 가치관을 공유할 수 있는 분과 함께, 서로에게 긍정적인 영향을 주며 살아가고 싶어요. 저와 함께할 인연을 기다리고 있어요!"""},
{"role":"system","content":user_prompt}
            ]
        )
        print(response)
        introduction = response.choices[0].message['content'].strip()
        print(introduction)
        return jsonify({'introduction': introduction})

    except Exception as e:
        app.logger.error(f"Error processing data: {e}")
        return jsonify({'error': 'Internal server error'}), 500



@app.route('/get_introduction_summary', methods=['POST'])
def get_introduction_summary():
    data = request.get_json()
    user_id = data.get('userId')

    if not user_id:
        return jsonify({'error': 'Missing userId'}), 400

    try:
        query = "SELECT Summary FROM SelfIntroductions WHERE User_id = %s"
        db_cursor.execute(query, (user_id,))
        result = db_cursor.fetchone()

        if not result:
            return jsonify({'error': 'Summary not found'}), 404

        summary = result[0]

        return jsonify({'summary': summary}), 200
    except Exception as e:
        app.logger.error(f"요약 생성 중 오류 발생: {e}")
        return jsonify({'error': f'요약 생성 중 오류 발생: {e}'}), 500


#자기소개서 매칭
@app.route('/get_matching_results', methods=['POST'])
def get_matching_results():
    data = request.get_json()
    user_id = data.get('userId')

    if not user_id:
        return jsonify({'error': 'Missing userId'}), 400

    try:
        # Fetch the user's summary
        user_summary_query = "SELECT Summary FROM SelfIntroductions WHERE User_id = %s"
        db_cursor.execute(user_summary_query, (user_id,))
        user_summary_result = db_cursor.fetchone()

        if not user_summary_result:
            return jsonify({'error': 'User summary not found'}), 404

        user_summary = user_summary_result[0]

        # Fetch all other summaries
        other_summaries_query = "SELECT User_id, Summary FROM SelfIntroductions WHERE User_id != %s"
        db_cursor.execute(other_summaries_query, (user_id,))
        other_summaries = db_cursor.fetchall()

        results = []

        # Prepare embeddings for all summaries
        summaries = [user_summary] + [summary[1] for summary in other_summaries]
        embeddings = model.encode(summaries)

        user_embedding = embeddings[0]
        other_embeddings = embeddings[1:]

        cosine_similarities = util.pytorch_cos_sim(user_embedding, other_embeddings).numpy().flatten()

        for idx, similarity in enumerate(cosine_similarities):
            other_user_id = other_summaries[idx][0]
            similarity_percentage = round(similarity * 100, 2)

            # Fetch the other user's username
            other_user_query = "SELECT Username FROM Users WHERE User_id = %s"
            db_cursor.execute(other_user_query, (other_user_id,))
            other_user_result = db_cursor.fetchone()

            if other_user_result:
                other_username = other_user_result[0]
                results.append({'username': other_username, 'similarity': similarity_percentage})

                # Save similarity to the database
                similarity_normalized = float(similarity_percentage) / 100.0  # float64를 float로 변환
                insert_similarity_query = """
                INSERT INTO DatingProfileSimilarity (user_id_1, user_id_2, similarity)
                VALUES (%s, %s, %s)
                """
                db_cursor.execute(insert_similarity_query, (user_id, other_user_id, similarity_normalized))
                db_connection.commit()

        results.sort(key=lambda x: x['similarity'], reverse=True)
        return jsonify({'results': results}), 200
    except Exception as e:
        db_connection.rollback()
        app.logger.error(f"Error fetching matching results: {e}")
        app.logger.error(f"Exception details: {e}", exc_info=True)  # 예외 정보를 자세히 출력
        return jsonify({'error': f'Error fetching matching results: {e}'}), 500
    

# 자기소개서 디자인 생성 
@app.route('/generate_design', methods=['POST'])
def generate_design_endpoint():
    data = request.get_json()
    
    # JSON 데이터에서 필요한 값 추출
    color = data.get('color')
    feature = data.get('feature')
    #high quality of photographic output.
    image_type = data.get('type')
    #1024x1024
    size = data.get('size')

    if color and feature and image_type and size:
        try:
            image_urls = []  # 이미지 URL을 저장할 리스트
            openai.api_key = os.getenv("DALLE_API_KEY")
            prompt = (f"Create a concisely and visually appealing background image, primarily using the color {color} as the dominant hue. "
          f"The design should subtly reflect the mood '{feature}', ensuring that it enhances the atmosphere without being uncomfortable to the viewer. "
          f"Ensure the image upholds a '{image_type}' quality, perfectly fitting a size of {size}. "
          f"This background should be free from any discernible figures or objects and human(person), focusing solely on offering a serene and tranquil backdrop. "
          f"Please consider elements like peaceful landscapes or subtle natural textures that can be evaluated from people's subjective perspectives, such as religion, gender, language, etc. "
          f"Let the design be expressed with a serene and natural feeling rather than a picture feeling. "
          f"Adjust the transparency to allow background content for the dating introduction based on user data to be readable on the design. "
          f"Adjust the transparency to ensure that the background content for the dating introduction based on user data is clearly readable on the design. "
          f"Please create the design of the dating statement reflecting the conditions mentioned above, emphasizing the significant presence of the selected color.")
            # 두 개의 이미지 생성을 위한 반복문
            for _ in range(2):  # 두 번의 독립적인 요청 수행
                response = openai.Image.create(
                    model="dall-e-3",
                    prompt = prompt,
                    size=size,
                    quality="standard",
                    n=1  # 각 요청에 대해 하나의 이미지만 생성
                )
                # 각 요청의 결과 이미지 URL을 리스트에 추가
                image_urls.append(response['data'][0]['url'])

            return jsonify({'image_urls': image_urls}), 200
        except Exception as e:
            return jsonify({'error': '디자인 생성 실패', 'message': str(e)}), 500
    else:
        return jsonify({'error': '유효하지 않은 요청, 필수 요소가 누락되었습니다.'}), 400    
# 인스타그램 피드 색감 추출
color_descriptions = {
    "빨강": {"이미지": "Passion, Energy, Love, Danger, Urgency", "감정-상징": "Activity, Strength, Courage, Warning and Urgency"},
    "주황": {"이미지": "Vitality, Creativity, Happiness, Friendliness", "감정-상징": "Sociability and Passion, Fun and Active Atmosphere"},
    "노랑": {"이미지": "Joy, Positivity, Hope, Caution", "감정-상징": "Cheerfulness and Energy, Attention-Required Signal"},
    "초록": {"이미지": "Nature, Growth, Peace, Safety", "감정-상징": "Stability and Harmony, Vitality and Abundance"},
    "파랑": {"이미지": "Trust, Intelligence, Freshness", "감정-상징": "Stability and Peace, Trust and Responsibility"},
    "보라": {"이미지": "Nobility, Mystery, Creativity", "감정-상징": "Elegance and Grace, Spirituality and Creativity"},
    "분홍": {"이미지": "Romantic, Softness, Sweetness", "감정-상징": "Love and Affection, Purity and Gentle Emotion"},
    "갈색": {"이미지": "Stability, Nature, Comfort", "감정-상징": "Trust and Stability, Connection to Nature"},
    "검정": {"이미지": "Authority, Sophistication, Mystery, Sorrow", "감정-상징": "Power and Authority, Sorrow and Mourning"},
    "회색": {"이미지": "Neutrality, Balance, Calmness", "감정-상징": "Practical and Realistic Attitude, Lethargy or Indifference"},
    "흰색": {"이미지": "Purity, Cleanliness, Innocence", "감정-상징": "New Beginnings and Purity, Peace and Cleanliness"}
}

def get_mood_from_color(color):
    color_hsl = colorsys.rgb_to_hls(color[0]/255, color[1]/255, color[2]/255)
    hue, lightness, saturation = color_hsl
    hue *= 360  # Hue 값을 도(degree) 단위로 변환

    descriptions = []

    # 확장된 색상 조건
    if (0 <= hue < 15 or 345 < hue <= 360) or (saturation < 0.2 and 0.1 < lightness < 0.9):
        descriptions.append("빨강")
    elif 15 <= hue < 45:
        descriptions.append("주황")
    elif 45 <= hue < 75:
        descriptions.append("노랑")
    elif 75 <= hue < 165:
        descriptions.append("초록")
    elif 165 <= hue < 255:
        descriptions.append("파랑")
    elif 255 <= hue < 345:
        descriptions.append("보라")

    # 밝기와 채도에 기반한 추가 조건 (분홍, 갈색, 검정, 회색, 흰색)
    if lightness > 0.85 and saturation < 0.1:
        descriptions = ["흰색"]
    elif lightness < 0.1:
        descriptions = ["검정"]
    elif saturation < 0.1 and 0.1 < lightness < 0.85:
        descriptions = ["회색"]

    # 갈색과 분홍은 더 세밀한 조건을 통해 판단
    if "빨강" in descriptions or "주황" in descriptions:
        if saturation > 0.4 and lightness < 0.4:
            descriptions = ["갈색"]
        elif lightness > 0.7 and saturation > 0.7:
            descriptions = ["분홍"]

    mood_descriptions = {"이미지": [], "감정-상징": [], "밝기": lightness, "채도": saturation}
    for desc in descriptions:
        if desc in color_descriptions:
            mood_descriptions["이미지"].append(color_descriptions[desc]["이미지"])
            mood_descriptions["감정-상징"].append(color_descriptions[desc]["감정-상징"])

    return mood_descriptions

@app.route('/analyze_colors', methods=['POST'])
def analyze_colors():
    data = request.get_json()
    image_urls = data.get('imageUrls', [])

    # 분석 결과를 저장할 리스트
    results = []
    total_color = [0, 0, 0]
    total_lightness = 0
    total_saturation = 0
    total_images = len(image_urls)

    for image_url in image_urls:
        try:
            response = requests.get(image_url)
            if response.status_code == 200:
                image = Image.open(BytesIO(response.content))
                color_thief = ColorThief(BytesIO(response.content))
                dominant_color = color_thief.get_color(quality=1)
                mood_info = get_mood_from_color(dominant_color)  # `get_mood_from_color` 함수를 이용

                # 색상 정보 누적
                total_color[0] += dominant_color[0]
                total_color[1] += dominant_color[1]
                total_color[2] += dominant_color[2]
                total_lightness += mood_info["밝기"]
                total_saturation += mood_info["채도"]

                results.append(mood_info)
        except Exception as e:
            logger.error(f"Failed to process image {image_url}: {e}")

    if total_images > 0:
        avg_color = [c // total_images for c in total_color]
        avg_lightness = total_lightness / total_images
        avg_saturation = total_saturation / total_images
        avg_mood = {
            "이미지": [desc for mood in results for desc in mood["이미지"]],
            "감정-상징": [desc for mood in results for desc in mood["감정-상징"]],
            "밝기": avg_lightness,
            "채도": avg_saturation,
        }
    else:
        avg_color = [0, 0, 0]
        avg_mood = {
            "이미지": ["N/A"],
            "감정-상징": ["N/A"],
            "밝기": "N/A",
            "채도": "N/A",
        }
    print (avg_color)
    print(avg_mood)
    return jsonify({
        "color": avg_color,
        "mood": avg_mood
    }), 200


@app.route('/face-similarity', methods=['POST'])
def calculate_face_similarity():
    try:
        data = request.get_json()
        reference_image_url = data['referenceImage']
        test_image_url = data['testImage']

        # Load images from URLs
        response = requests.get(reference_image_url)
        reference_image = Image.open(BytesIO(response.content))
        response = requests.get(test_image_url)
        test_image = Image.open(BytesIO(response.content))

        # Create a temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            reference_path = os.path.join(temp_dir, "reference_image.jpg")
            test_path = os.path.join(temp_dir, "test_image.jpg")

            # Save images to the temporary directory
            reference_image.save(reference_path)
            test_image.save(test_path)
            
            # Calculate face similarity
            results = face_similarity(reference_path, test_path)
        
        return jsonify({"results": results})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An internal error occurred", "details": str(e), "results": []}), 500

# 이미지 캡션 분석
@app.route('/api/analyze-batch', methods=['POST'])
def analyze_images_batch():
    if not db_connection:
        logger.error('DB 연결 실패')
        return jsonify({"error": "DB 연결 실패"}), 500

    data = request.json
    if 'imageUrls' not in data or 'userId' not in data:
        return jsonify({"error": "No image URLs or user ID provided"}), 400

    user_id = data['userId']
    image_urls = data['imageUrls']
    arr = []  # 캡션과 명사를 저장하는 리스트
    all_nouns = []  # 모든 명사를 저장하는 리스트

    try:
        for url_info in image_urls:
            url = url_info['media_url']
            media_type = url_info.get('media_type', '')

            # 비디오 파일은 무시
            if media_type == 'VIDEO':
                logger.info(f"Skipping video URL: {url}")
                continue

            try:
                response = requests.get(url, timeout=10)
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to fetch image from URL: {url} - {e}")
                continue

            image_stream = BytesIO(response.content)

            try:
                img = Image.open(image_stream)
                img.verify()
                image_stream.seek(0)
            except Exception as e:
                raise Exception(f"Invalid image at URL: {url} - {e}")

            # 이미지 캡션 생성 함수
            caption = generate_caption(image_stream)
            # 명사 추출 함수
            nouns = extract_nouns(caption)

            # 캡션과 명사를 리스트에 저장
            arr.append({
                'caption': caption,
                'nouns': nouns
            })
            nouns_list = nouns.split()
            all_nouns.extend(nouns_list)

        # 리스트를 JSON 문자열로 변환
        json_data = json.dumps(arr)
        nounlist = ' '.join(all_nouns)

        # 데이터베이스에 저장
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        insert_query = """
        INSERT INTO image_captions (user_id, image_url, caption, nouns)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            image_url = VALUES(image_url),
            caption = VALUES(caption),
            nouns = VALUES(nouns)
        """
        db_cursor.execute(insert_query, (user_id, url, json_data, nounlist))
        db_connection.commit()

        # calculate_similarity_scores 함수 호출
        logger.info(f"Calling calculate_similarity_scores for user_id: {user_id}")
        calculate_similarity_scores(user_id)

        return jsonify({"captions": arr})  # arr을 반환하여 캡션과 명사 정보를 포함

    except Exception as error:
        db_connection.rollback()
        logger.error(f"Error analyzing images: {error}")
        traceback.print_exc()
        return jsonify({"error": "Failed to analyze images", "details": str(error)}), 500

# 캡션의 명사를 가지고 유사도 분석하기
def calculate_similarity_scores(user_id):
    if not db_connection:
        logger.error('DB 연결 실패')
        return

    try:
        # 사용자 명사 가져오기
        db_cursor.execute("SELECT nouns FROM image_captions WHERE user_id = %s", (user_id,))
        new_user_nouns_list = [row['nouns'] for row in db_cursor.fetchall() if 'nouns' in row]
        
        # 로그 추가
        logger.info(f"New user nouns list: {new_user_nouns_list}")

        if not new_user_nouns_list:
            logger.error('No nouns found for the user')
            return

        new_user_nouns = ' '.join(new_user_nouns_list)
        
        new_user_embedding = model.encode(new_user_nouns, convert_to_tensor=True)

        # 다른 사용자들의 ID 가져오기
        db_cursor.execute("SELECT DISTINCT user_id FROM image_captions WHERE user_id != %s ORDER BY RAND() LIMIT 20", (user_id,))
        other_user_ids = [row['user_id'] for row in db_cursor.fetchall()]
        
        # 로그 추가
        # logger.info(f"Other user IDs: {other_user_ids}")

        for other_user_id in other_user_ids:
            # 다른 사용자 명사 가져오기
            db_cursor.execute("SELECT nouns FROM image_captions WHERE user_id = %s", (other_user_id,))
            other_user_nouns_list = [row['nouns'] for row in db_cursor.fetchall() if 'nouns' in row]

            # 로그 추가
            logger.info(f"Other user {other_user_id} nouns list: {other_user_nouns_list}")

            if not other_user_nouns_list:
                continue

            other_user_nouns = ' '.join(other_user_nouns_list)
            other_user_embedding = model.encode(other_user_nouns, convert_to_tensor=True)

            similarity = util.pytorch_cos_sim(new_user_embedding, other_user_embedding).item()  # 코사인 유사도 사용

            # 유사도 점수를 데이터베이스에 저장
            insert_similarity_query = """
            INSERT INTO UserCaptionSimilarity (user_id1, user_id2, similarity_score)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE similarity_score = VALUES(similarity_score)
            """
            db_cursor.execute(insert_similarity_query, (user_id, other_user_id, similarity))
            logger.info(f"Inserted similarity score between {user_id} and {other_user_id}: {similarity}")

        db_connection.commit()
    except Exception as error:
        db_connection.rollback()
        logger.error(f"Error calculating similarity: {error}")
        traceback.print_exc()


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

#얼굴 탐지 true/false 반환 엔드포인트
@app.route('/detect-faces', methods=['POST'])
def face_detection():
    if 'profileImage' not in request.files:
        logging.error("No file part in the request")
        return jsonify({"result": False, "message": "No file provided."}), 400

    image_file = request.files['profileImage']

    if not image_file.content_type.startswith('image/'):
        logging.error("File uploaded is not an image")
        return jsonify({"result": False, "message": "File is not an image."}), 400

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
        image_file.save(temp_file.name)
    
    try:
        result = detect_faces(temp_file.name)
        return jsonify({"result": result}), 200
    finally:
        try:
            os.unlink(temp_file.name)
        except PermissionError as e:
            logging.error(f"Error deleting temporary file: {e}")

app.register_blueprint(similarity_blueprint)
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=6000, debug=True)