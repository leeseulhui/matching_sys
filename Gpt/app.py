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
from azure_service import generate_caption

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

    try:
        user_query = "SELECT Username FROM Users WHERE User_id = %s"
        db_cursor.execute(user_query, (user_id,))
        user_result = db_cursor.fetchone()
        if not user_result:
            return jsonify({'error': 'User not found'}), 404
        username = user_result[0]

        response_query = "SELECT Category, QuestionIndex, Answer FROM UserResponses WHERE User_id = %s"
        db_cursor.execute(response_query, (user_id,))
        responses = db_cursor.fetchall()

        if not responses:
            return jsonify({'error': 'No responses found for this user'}), 404

        # 질문에 맞게 프롬프트 생성
        question_map = {
            "사랑": [
                "What is the most important characteristic of an ideal partner?",
                "In what situation do you feel the most attraction to your partner?"
            ],
            "일": [
                "What do you think is the most important aspect of a job?"
            ],
            "식사": [
                "What type of cuisine do you prefer?"
            ],
            "놀이": [
                "What do you usually do in your free time?"
            ],
            "사고": [
                "How do you prefer to solve everyday problems?",
                "What is the most important value in your life?"
            ]
        }

        messages = [
            {"role": "system", "content": "You are a sophisticated dating profile assistant tasked with creating engaging and attractive dating profiles."},
            {"role": "user", "content": f"Create a dating profile introduction for a user named {username} based on the following information."}
        ]

        for category, question_index, answer in responses:
            question = question_map[category][question_index]
            messages.append({"role": "system", "content": f"What is your favorite aspect of {category}? {question}"})
            messages.append({"role": "user", "content": answer})

        messages.append({"role": "system", "content": "Create a concise and engaging dating profile introduction based on the provided information. Ensure the introduction is fluent and natural, and avoid repeating words."})

        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=370,
            temperature=0.7,
            n=1
        )

        generated_introduction = response.choices[0].message['content'].strip()

        last_full_stop = generated_introduction.rfind('.')
        if last_full_stop != -1:
            generated_introduction = generated_introduction[:last_full_stop + 1]

        paragraphs = re.split(r'(?<=[.?!])\s+', generated_introduction)
        formatted_introduction = '\n\n'.join(paragraphs)

        formatted_introduction = re.sub(r'\b(\w+)( \1\b)+', r'\1', formatted_introduction)
        formatted_introduction = re.sub(r'\s+', ' ', formatted_introduction).strip()

        summary_messages = [
            {"role": "system", "content": "You are a sophisticated dating matching assistant. Your task is to extract key information from a user-provided introduction, emphasizing clear, concise language."},
            {"role": "user", "content": f"Summarize the following text in one or two sentences:\n\n{formatted_introduction}"}
        ]

        summary_response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=summary_messages,
            max_tokens=100,
            temperature=0.7,
            n=1
        )
        summary = summary_response.choices[0].message['content'].strip()

        translator = Translator()
        translated_introduction = translator.translate(formatted_introduction, src='en', dest='ko').text
        translated_summary = translator.translate(summary, src='en', dest='ko').text

        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        insert_intro_query = """
        INSERT INTO SelfIntroductions (User_id, Title, Content, CreationDate, LastModifiedDate, Summary)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE Content = VALUES(Content), LastModifiedDate = VALUES(LastModifiedDate), Summary = VALUES(Summary)
        """
        insert_intro_data = (user_id, '데이트 자기소개서', translated_introduction, current_time, current_time, translated_summary)
        db_cursor.execute(insert_intro_query, insert_intro_data)

        db_connection.commit()

        return jsonify({'introduction': translated_introduction, 'summary': translated_summary}), 200
    except Exception as e:
        db_connection.rollback()
        app.logger.error(f"자기소개서 생성 중 오류 발생: {e}")
        traceback.print_exc()  # 추가된 오류 추적
        return jsonify({'error': f'자기소개서 생성 중 오류 발생: {e}'}), 500

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
            # 체인 방식으로 프롬프트 생성
            prompt = (f"Create a concisely and visually appealing background image, primarily using the color {color} as the dominant hue. "
          f"The design should subtly reflect the mood '{feature}', ensuring that it enhances the atmosphere without being uncomfortable to the viewer. "
          f"Ensure the image upholds a '{image_type}' quality, perfectly fitting a size of {size}. "
          f"This background should be free from any discernible figures or objects and human(person), focusing solely on offering a serene and tranquil backdrop. "
          f"Please consider elements like peaceful landscapes or subtle natural textures that can be evaluated from people's subjective perspectives, such as religion, gender, language, etc. "
          f"Let the design be expressed with a serene and natural feeling rather than a picture feeling. "
          f"Adjust the transparency to allow background content for the dating introduction based on user data to be readable on the design. "
          f"Adjust the transparency to ensure that the background content for the dating introduction based on user data is clearly readable on the design. "
          f"Please create the design of the dating statement reflecting the conditions mentioned above, emphasizing the significant presence of the selected color.")
            
            
            # DALL-E 3 모델을 사용하여 이미지 생성
            openai.api_key = os.getenv("DALLE_API_KEY")
            response = openai.Image.create(
                model="dall-e-3",
                prompt=prompt,
                size=size,
                quality="standard",
                n=1  # 한 개의 이미지만 생성
            )
            
            # 생성된 이미지의 URL 추출
            image_url = response['data'][0]['url']
            return jsonify({'image_url': image_url}), 200
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

    return jsonify({
        "color": avg_color,
        "mood": avg_mood
    }), 200


#얼굴 유사도
@app.route('/face-similarity', methods=['POST'])
def calculate_face_similarity():
    try:
        data = request.get_json()
        reference_image_url = data['referenceImage']
        test_image_url = data['testImage']
    # 이미지 URL에서 이미지 로드
        response = requests.get(reference_image_url)
        reference_image = Image.open(BytesIO(response.content))
        response = requests.get(test_image_url)
        test_image = Image.open(BytesIO(response.content))

        # 임시 파일에 이미지 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as reference_temp, tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as test_temp:
            reference_image.save(reference_temp.name)
            test_image.save(test_temp.name)
            
            # 얼굴 유사도 계산
            results = face_similarity(reference_temp.name, test_temp.name)
        
        return jsonify({"results": results})
    except Exception as e:
        traceback.print_exc()  # 서버 로그에 에러를 출력
        return jsonify({"error": "An internal error occurred", "details": str(e), "results": []}), 500


#이미지 캡션 분석(azure 사용)
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
    captions = {}

    try:
        for url_info in image_urls:
            url = url_info['media_url']
            media_type = url_info.get('media_type', '')

            # 비디오 파일은 무시
            if media_type == 'VIDEO':
                logger.info(f"Skipping video URL: {url}")
                continue

            # 타임아웃 설정 및 예외 처리
            try:
                response = requests.get(url, timeout=10)  # 10초 타임아웃 설정
                response.raise_for_status()  # HTTP 오류 상태 코드를 예외로 처리
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to fetch image from URL: {url} - {e}")
                continue

            image_stream = BytesIO(response.content)

            # Verify the image stream by trying to open it with PIL
            try:
                img = Image.open(image_stream)
                img.verify()  # Will not return anything but will raise an exception if the image is not valid
                image_stream.seek(0)  # Reset the stream position to the beginning
            except Exception as e:
                raise Exception(f"Invalid image at URL: {url} - {e}")

            caption = generate_caption(image_stream)
            captions[url] = caption

            # 캡션을 데이터베이스에 저장
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            insert_query = """
            INSERT INTO image_captions (user_id, image_url, caption, similarity_score)
            VALUES (%s, %s, %s, NULL)
            """
            db_cursor.execute(insert_query, (user_id, url, caption))

        db_connection.commit()
        return jsonify({"captions": captions})
    except Exception as error:
        db_connection.rollback()
        logger.error(f"Error analyzing images: {error}")
        traceback.print_exc()
        return jsonify({"error": "Failed to analyze images", "details": str(error)}), 500


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app.register_blueprint(similarity_blueprint)

#얼굴 탐지 true/false 반환 엔드포인트
@app.route('/detect-faces', methods=['POST'])
def face_detection():
    if 'profileImage' not in request.files:
        return jsonify({"result": False}), 400  # 파일이 없을 때 False 반환

    image_file = request.files['profileImage']
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    image_file.save(temp_file.name)
    
    try:
        result = detect_faces(temp_file.name)
        return jsonify({"result": result}), 200  # 결과를 JSON으로 반환
    finally:
        os.unlink(temp_file.name)  # 임시 파일 삭제



if __name__ == "__main__":
    app.run(host='0.0.0.0', port=6000, debug=True)