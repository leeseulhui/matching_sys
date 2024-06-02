from flask import Flask, Blueprint, request, jsonify
from datetime import datetime
import os
from dotenv import load_dotenv
import mysql.connector
import logging
import openai
from flask_cors import CORS
from io import BytesIO
import re 
import json
from transformers import pipeline

#이미지 캡션 라이브러리
from azure_service import generate_caption, extract_nouns
#자기소개서
openai.api_key = "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"

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

#챗봇
openai.api_key = os.getenv("OPENAI_API_KEY")
from datetime import datetime, date, timedelta
import time 
from langchain.llms import OpenAI as LangchainOpenAI
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory
import threading

app = Flask(__name__)


chatbot_bp = Blueprint('chatbot', __name__)
CORS(app)  # 모든 도메인에 요청 허용
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

db_host = os.getenv('DB_HOST')
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')
db_name = os.getenv('DB_NAME')

model = SentenceTransformer('sentence-transformers/paraphrase-mpnet-base-v2')

# 챗봇 모델 로드 (사용자가 제공한 설정에 맞춤)
sentiment_analyzer = pipeline('sentiment-analysis', model='bert-base-uncased')
translator = Translator()

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=db_host,
            user=db_user,
            password=db_password,
            database=db_name
        )
        return connection
    except mysql.connector.Error as err:
        logger.error(f"DB 연결 실패: {err}")
        return None

try:
    db_connection = get_db_connection()
    if db_connection:
        logger.info("DB 연결 성공")
        db_cursor = db_connection.cursor(dictionary=True)
    else:
        logger.error("DB 연결 실패")
except mysql.connector.Error as error:
    logger.error(f"DB 연결 실패: {error}")
    db_connection = None

#API 키 설정 및 확인
openai_api_key = os.getenv("OPENAI_API_KEY")
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
    


#자기소개서 생성
@app.route('/generate_introduction', methods=['POST'])
def generate_introduction():
    data = request.get_json()
    app.logger.debug(f"Received JSON data: {data}")

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    user_id = data.get('userId')

    if not user_id:
        app.logger.error("Missing userId in the data")
        return jsonify({'error': 'Missing userId'}), 400

    db_connection = get_db_connection()
    if not db_connection:
        app.logger.error('DB 연결 실패')
        return jsonify({'error': 'DB 연결 실패'}), 500

    try:
        db_cursor = db_connection.cursor(dictionary=True)

        user_query = "SELECT Username FROM Users WHERE User_id = %s"
        db_cursor.execute(user_query, (user_id,))
        user_result = db_cursor.fetchone()
        if not user_result:
            return jsonify({'error': 'User not found'}), 404
        username = user_result['Username']

        response_query = "SELECT Category, QuestionIndex, Answer FROM UserResponses WHERE User_id = %s"
        db_cursor.execute(response_query, (user_id,))
        responses = db_cursor.fetchall()

        if not responses:
            return jsonify({'error': 'No responses found for this user'}), 404

        question_map = {
            "사랑": [
                "{answer} is the most important characteristic of an ideal partner.",
                "{answer}, I feel the most attraction to my partner.",
            ],
            "일": ["{answer} is the most important aspect of a job."],
            "식사": ["{answer} is my preferred type of cuisine."],
            "놀이": ["{answer} is what I usually do in my free time."],
            "사고": ["{answer}, I prefer to solve everyday problems.", "{answer} is the most important value in my life."],
        }

        messages = []
        _user_info = [f"{username} is my name."]
        for response in responses:
            category = response["Category"]
            question_index = response["QuestionIndex"]
            answer = response["Answer"]
            question = question_map[category][question_index]
            _user_info.append(question.format(answer=answer))

        about_user = "\n".join(_user_info)

        words_length = 200  # 단어 수
        max_emojis = 3

        messages.append(
            {
                "role": "user",
                "content": f"""##### USER INFO
                {about_user}

                ##### INSTRUCTION
                Based on the USER INFO, Write a self-introduction for a profile in a dating app. In 1st party perspective. soft and lively style. conversational tone and manner.
                In {words_length} words. Use emojis(max {max_emojis}). Include newline between every sentences. Use Korean. End self-introduction with a soft sales statement.

                ##### OUTPUT
                """
            }
        )

        try:
            response = openai.ChatCompletion.create(
                model="gpt-4o",
                messages=messages
            )
            user_intro = response['choices'][0]['message']['content'].strip()
            print(user_intro)
        except openai.error.OpenAIError as e:
            app.logger.error(f"OpenAI API error: {e}")
            return jsonify({'error': f'OpenAI API error: {e}'}), 500

        key_points = ["characteristics", "hobbies", "personal preferences"]
        key_points = "\n".join(f"- {pt}" for pt in key_points)
        summary_messages = [
            {
                "role": "user",
                "content": f"""
                ##### KEY POINTS
                {key_points}

                ##### INSTRUCTION
                Highlight the key points of the INPUT (self-introduction) into 3 normalized sentences. \
                    Include newline between every sentences. \
                        Write in a 3rd party perspective. informative style, tone and manner. \
                            Use gentle and formal tone of speech. Use Korean.

                ##### SENTENCE NORMALIZATION EXAMPLE
                - "노력합니다." to "노력함."
                - "추구합니다." to "추구함."
                - "있습니다." to "있음."

                ##### INPUT
                {user_intro}

                ##### OUTPUT
                {username}님은
                """,
            }
        ]

        try:
            summary_response = openai.ChatCompletion.create(
                model="gpt-4o",
                messages=summary_messages
            )
            summary = summary_response['choices'][0]['message']['content'].strip()
            print(summary)
        except openai.error.OpenAIError as e:
            app.logger.error(f"OpenAI API error: {e}")
            return jsonify({'error': f'OpenAI API error: {e}'}), 500

        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        insert_intro_query = """
        INSERT INTO SelfIntroductions (User_id, Title, Content, CreationDate, LastModifiedDate, Summary)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE Content = VALUES(Content), LastModifiedDate = VALUES(LastModifiedDate), Summary = VALUES(Summary)
        """
        db_cursor.execute(insert_intro_query, (user_id, "Introduction", user_intro, current_time, current_time, summary))
        db_connection.commit()

        return jsonify({'message': 'Introduction generated successfully', 'introduction': user_intro, 'summary': summary}), 200

    except Exception as e:
        app.logger.error(f"Error generating introduction: {e}")
        return jsonify({'error': f'Error generating introduction: {e}'}), 500
    finally:
        db_cursor.close()
        db_connection.close()

@app.route('/get_introduction_summary', methods=['POST'])
def get_introduction_summary():
    data = request.get_json()
    user_id = data.get('userId')

    if not user_id:
        return jsonify({'error': 'Missing userId'}), 400

    try:
        db_connection = get_db_connection()
        if not db_connection:
            return jsonify({'error': 'DB 연결 실패'}), 500

        db_cursor = db_connection.cursor()
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
    finally:
        db_cursor.close()
        db_connection.close()

# 자기소개서 디자인 생성 
openai.api_key = "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"
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

##################챗봇 부분#################  
# LangChain 설정
openai.api_key = "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"

# 전역 변수로 유지
llm = LangchainOpenAI(model="gpt-4", temperature=1.0, max_tokens=500)
memory = ConversationBufferMemory()
conversation = ConversationChain(llm=llm, memory=memory)

# 마지막 메시지 시간을 추적하는 딕셔너리
last_message_time = {}

# 주기적으로 메시지를 확인하고 5분 이상 지나면 추천 요청을 보내는 함수
def check_inactivity():
    while True:
        current_time = datetime.now()
        for matching_id, last_time in list(last_message_time.items()):
            if (current_time - last_time).total_seconds() > 300:
                data = {'matchingID': matching_id}
                with app.app_context():
                    response = app.test_client().post('/chat/suggestions/realtime', json=data)
                    app.logger.info(f'Posted suggestion request for matchingID {matching_id}, response status: {response.status_code}')
                    if response.status_code == 200:
                        suggestions = response.json['suggestions']
                        # 추천 내용을 처리하는 로직 추가
                        print(f"Recommendations for matching ID {matching_id}: {suggestions}")
                    else:
                        app.logger.error(f'Failed to fetch suggestions for matchingID {matching_id}, response: {response.json}')
                last_message_time.pop(matching_id, None)
        time.sleep(60)  # 1분마다 확인

# 스레드 시작(가비지 컬렉션 삭제 방지)
def start_thread():
    thread = threading.Thread(target=check_inactivity, daemon=True)
    thread.start()


# Flask 애플리케이션 컨텍스트 내에서 스레드 시작
with app.app_context():
    start_thread()


#매칭된 사용자 정보 가져오는 로직
def get_matching_user_data(matching_id, user_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT * FROM Matching WHERE MatchingID = %s", (matching_id,))
        matching_info = cursor.fetchone()
        
        if not matching_info:
            return None
        
        user_id_str = str(user_id)
        matched_user_id = None
        if matching_info['User1ID'] == user_id_str:
            matched_user_id = matching_info['User2ID']
        elif matching_info['User2ID'] == user_id_str:
            matched_user_id = matching_info['User1ID']
        
        if not matched_user_id:
            return None
        
        cursor.execute("SELECT * FROM Users WHERE User_id = %s", (matched_user_id,))
        matched_user_profile = cursor.fetchone()
        
        return matched_user_profile
    
    except Exception as err:
        return None
    finally:
        cursor.close()
        connection.close()


def gpt_prompt(matched_user_profile):
    interests = matched_user_profile.get('Interests', '관심사')
    attractions = matched_user_profile.get('Attractions', '매력')

    messages = [
        {
            "role": "system",
            "content": "당신은 친절하고 예의바른 인공지능 챗봇입니다. 상대방과 즐겁고 의미 있는 대화를 나눌 수 있도록 도와주세요."
        },
        {
            "role": "user",
            "content": f"""##### USER INFO
            {matched_user_profile.get('Username', 'User')}님의 프로필 정보입니다.
            관심사: {interests}
            매력 포인트: {attractions}

            ##### INSTRUCTION
            위 USER INFO를 기반으로 상대방과의 자연스럽고 흥미로운 대화를 위한 질문을 만들어주세요.
            - 질문은 50자를 넘지 않도록 해주세요.
            - 질문은 한 문장으로만 나타내주세요.
            - 각 질문은 숫자 없이 만들어 주세요.
            - 데이터베이스 기반으로 다양한 분야의 질문을 만들어주세요.
            - 일상적인 질문, 예를 들어 '밥은 뭐 드셨나요?', '뭐하고 계신가요?' 같은 질문도 포함해주세요.
            - 데이터베이스 기반으로 만드는 질문이 아니라면 일상적인 생활 속에서 일어나는 당연한 질문을 만들어주세요.
            - 상대방이 예/아니오로 답할 수 있는 질문은 피해주시고 서술형 질문을 만들어주세요.
            - 상대방의 관심사와 취미를 반영한 질문을 포함해주세요.
            - 가끔씩 질문에 어울리는 이모티콘이 있다면 이모티콘도 함께 사용해주세요.
            - 질문의 개수는 5개로 제한해주세요.

            ##### OUTPUT
            """
        }
    ]

    # OpenAI API 호출
    gpt_response = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=500,
        n=1,
        stop=None,
        temperature=1.0
    )

    responses = gpt_response['choices'][0]['message']['content'].strip().split('\n')
    cleaned_responses = [response.strip().lstrip('-').strip() for response in responses if response.strip()]
    return cleaned_responses

#대화 분석 모듈
def analyze_recent_messages(matching_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        query = 'SELECT * FROM Messages WHERE MatchingID = %s ORDER BY SentDate DESC LIMIT 20'
        cursor.execute(query, (matching_id,))
        messages = cursor.fetchall()
        
        if not messages:
            return False, []

        last_message_time = messages[0]['SentDate']
        current_time = datetime.now()
        time_diff = (current_time - last_message_time).total_seconds()

        return time_diff > 120, messages  #2분 동안 답변이 없으면 대화가 막혔다고 간주하고 챗봇이 채팅 목록 추천해줌.
    finally:
        cursor.close()
        connection.close()

# #분석한 후 대화 추천 모듈
# def generate_recommendations(messages):
#     context = " ".join([msg['MessageContent'] for msg in messages])
#     conversation.add_user_input(context)
#     suggestions = conversation.run()
#     return suggestions

def serialize_user_profile(user_profile):
    serialized_profile = {}
    for key, value in user_profile.items():
        if isinstance(value, (datetime, date)):
            serialized_profile[key] = value.isoformat()
        else:
            serialized_profile[key] = value
    return serialized_profile

#대화 내용 추천 엔드포인트
@app.route('/chat/suggestions/realtime', methods=['POST'])
def get_realtime_suggestions():
    data = request.json
    matching_id = data.get('matchingID')
    
    if not matching_id:
        return jsonify({"error": "matchingID is required"}), 400
    
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        query = 'SELECT * FROM Messages WHERE MatchingID = %s ORDER BY SentDate ASC'
        cursor.execute(query, (matching_id,))
        messages = cursor.fetchall()
        
        if not messages:
            return jsonify({"error": "No messages found for this matching ID"}), 404
        
        last_message_time = messages[-1]['SentDate']
        current_time = datetime.now()
        time_diff = (current_time - last_message_time).total_seconds()
        
        if time_diff > 120:  # 5분
            context = " ".join([msg['MessageContent'] for msg in messages])
            response = conversation.predict(context)
            suggestions = response.strip().split('\n')
            return jsonify({"suggestions": suggestions})
        else:
            return jsonify({"message": "Conversation flow is smooth"})
    
    except Exception as error:
        app.logger.error(f'Error processing suggestions: {error}', exc_info=True)
        return jsonify({"error": "Failed to process suggestions due to server error", "details": str(error)}), 500
    finally:
        cursor.close()
        connection.close()
    
#챗봇 추천 엔드포인트
@app.route('/chatbot/suggestions', methods=['POST'])
def get_suggestions():
    user_data = request.json
    user_id = user_data.get('userId')
    matching_id = user_data.get('matchingId')
    if not user_id or not matching_id:
        return jsonify({"error": "userId and matchingId are required"}), 400
    logger.info(f"Received request for user ID: {user_id} and matching ID: {matching_id}")

    matched_user_profile = get_matching_user_data(matching_id, user_id)

    if not matched_user_profile:
        logger.warning(f"No matching user found for matching ID {matching_id} and user ID {user_id}")
        return jsonify({"error": "No matching user found"}), 404

    matched_user_profile = serialize_user_profile(matched_user_profile)

    try:
        logger.info(f"Generating suggestions for matched user profile: {matched_user_profile}")
        suggestions = gpt_prompt(matched_user_profile)
        logger.info(f"Generated suggestions: {suggestions}")
    except openai.error.OpenAIError as e:
        logger.error(f"Error from OpenAI: {str(e)}")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        logger.error(f"Database or other error: {e}")
        return jsonify({"error": str(e)}), 500

    return jsonify(suggestions)


@app.route('/chat/messages/<matchingID>', methods=['GET'])
def get_messages(matchingID):
    try:
        query = 'SELECT * FROM Messages WHERE MatchingID = %s ORDER BY SentDate ASC'
        cursor = db_connection.cursor(dictionary=True)
        cursor.execute(query, (matchingID,))
        messages = cursor.fetchall()
        if messages:
            return jsonify({"messages": messages})
        else:
            return jsonify({"message": "No messages found for this matching ID."}), 404
    except Exception as error:
        logger.error(f'Failed to retrieve messages: {error}')
        return jsonify({"message": "Failed to retrieve messages due to server error.", "error": str(error)}), 500

# 새로운 메시지가 도착할 때마다 마지막 메시지 시간을 업데이트하는 엔드포인트
@app.route('/chat/messages', methods=['POST'])
def post_message():
    data = request.json
    matchingID = data.get('matchingID')
    senderID = data.get('senderID')
    receiverID = data.get('receiverID')
    messageContent = data.get('messageContent')
    
    if not matchingID or not senderID or not receiverID or not messageContent:
        return jsonify({"error": "Missing required fields"}), 400

    insert_query = '''
        INSERT INTO Messages (MatchingID, SenderID, ReceiverID, MessageContent, SentDate, DeletedContent)
        VALUES (%s, %s, %s, %s, NOW(), NULL)
    '''
    try:
        cursor = db_connection.cursor()
        cursor.execute(insert_query, (matchingID, senderID, receiverID, messageContent))
        db_connection.commit()
        new_message_id = cursor.lastrowid
        new_message = {
            "MessageID": new_message_id,
            "MatchingID": matchingID,
            "SenderID": senderID,
            "ReceiverID": receiverID,
            "MessageContent": messageContent,
            "SentDate": datetime.now().isoformat()
        }
        last_message_time[matchingID] = datetime.now()  # 마지막 메시지 시간 업데이트
        return jsonify(new_message)
    except Exception as error:
        logger.error(f'Error inserting message into database: {error}')
        db_connection.rollback()
        return jsonify({"error": "Error inserting message into database", "details": str(error)}), 500

app.register_blueprint(similarity_blueprint)


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=6000, debug=True)