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
from transformers import pipeline
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

chatbot_bp = Blueprint('chatbot', __name__)

# 챗봇 모델 로드 (사용자가 제공한 설정에 맞춤)
sentiment_analyzer = pipeline('sentiment-analysis', model='bert-base-uncased')
translator = Translator()

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
                "이상적인 연인의 가장 중요한 특성은 무엇인가요?",
                "어떤 상황에서 연인에게 가장 큰 매력을 느끼나요?"
            ],
            "일": [
                "직업에 있어 가장 중요하다고 생각하는 것은 무엇인가요?"
            ],
            "식사": [
                "어떤 유형의 음식을 선호하나요?"
            ],
            "놀이": [
                "여가 시간에 주로 무엇을 하나요?"
            ],
            "사고": [
                "일상에서 마주하는 문제를 해결할 때 어떤 방식을 선호하나요?",
                "인생에서 가장 중요한 가치는 무엇인가요?"
            ]
        }

        messages = [
            {
                "role": "system",
                "content": "당신은 매력적이고 유쾌한 데이트 프로필을 작성하는 데 재능 있는 AI 어시스턴트입니다. "
                        "사용자와 협력하여 그들의 고유한 특성과 관심사를 강조하는 매력적이고 진정성 있는 프로필을 만드세요. "
                        "사용자가 자신의 개인적인 이야기와 선호를 공유하도록 격려하고, 이를 바탕으로 매력적이고 공감할 수 있는 데이트 자기소개서를 작성하세요. "
                        "자기소개서는 유창하고 자연스럽고 반복적인 표현이 없도록 하세요. "
                        "같은 단어를 반복해서 사용하지 마세요. "
                        "자기소개서는 따뜻하고 개성 있으며 데이트 프로필에 적합해야 합니다."
            },
            {
                "role": "user",
                "content": f"{username}이라는 사용자의 다음 정보를 바탕으로 데이트 프로필 자기소개서를 작성하세요:"
            }
        ]

        for category, question_index, answer in responses:
            question = question_map[category][question_index]
            messages.append({"role": "user", "content": f"{question}: {answer}"})

        messages.append({
            "role": "system",
            "content": """
            제공된 정보를 바탕으로 상세하고 매력적이며 유쾌한 데이트 프로필 자기소개서를 작성하세요. 
            자기소개서는 유창하고 자연스러우며, 단어의 반복을 피하세요. 
            자기소개서는 초대할 수 있고 공감할 수 있는 형태로, 명확한 흐름과 자연스러운 언어로 작성되어야 합니다. 
            더 나은 가독성을 위해 명확한 단락으로 나누세요.
            """
        })

        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=150,
            temperature=1,
            n=1
        )

        generated_introduction = response.choices[0].message['content'].strip()

        # Remove repetitive expressions and extra spaces
        formatted_introduction = re.sub(r'\b(\w+)\b(?=\s+\1\b)', r'\1', generated_introduction)
        formatted_introduction = re.sub(r'(\s*\b\w+\b\s*)\1+', r'\1', formatted_introduction)  # Remove adjacent duplicates
        formatted_introduction = re.sub(r'\s+', ' ', formatted_introduction).strip()

        # Split into paragraphs for better readability
        formatted_introduction = '\n\n'.join(re.split(r'(?<=\.) ', formatted_introduction))

        summary_messages = [
            {"role": "system", "content": "당신은 정교한 데이트 매칭 어시스턴트입니다. 사용자가 제공한 소개서에서 주요 정보를 추출하여 명확하고 간결한 언어로 강조하세요."},
            {"role": "system", "content": "사용자의 주요 특성, 취미, 선호도를 식별하세요."},
            {"role": "system", "content": "소개서를 세 가지 명확하고 간결한 단락으로 요약하여 주요 내용을 강조하세요."},
            {"role": "user", "content": f"다음 텍스트를 세 가지 간결한 단락으로 요약하여 주요 측면을 강조하세요:\n\n{formatted_introduction}"}
        ]

        summary_response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=summary_messages,
            max_tokens=75,
            temperature=1,
            n=1
        )
        summary = summary_response.choices[0].message['content'].strip()

        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        insert_intro_query = """
        INSERT INTO SelfIntroductions (User_id, Title, Content, CreationDate, LastModifiedDate, Summary)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE Content = VALUES(Content), LastModifiedDate = VALUES(LastModifiedDate), Summary = VALUES(Summary)
        """
        insert_intro_data = (user_id, '데이트 자기소개서', formatted_introduction, current_time, current_time, summary)
        db_cursor.execute(insert_intro_query, insert_intro_data)

        db_connection.commit()

        return jsonify({'introduction': formatted_introduction, 'summary': summary}), 200
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



#챗봇 부분  
#중복되는 단어 제거            
def clean_response(text):
    """중복 단어 제거 및 불필요한 문자 제거"""
    # 단어 중복 제거
    words = text.split()
    cleaned_words = []
    for i in range(len(words)):
        if i == 0 or words[i] != words[i-1]:
            cleaned_words.append(words[i])
    cleaned_text = ' '.join(cleaned_words)
    
    # 문장 끝의 중복 제거
    cleaned_text = cleaned_text.replace(' 요 요 요 요', ' 요')
    cleaned_text = cleaned_text.replace(' 요 요', ' 요')
    cleaned_text = cleaned_text.replace('어요 요', '어요')
    cleaned_text = cleaned_text.replace('요! 요!', '요!')

    # 불필요한 문장 부호 제거
    cleaned_text = cleaned_text.lstrip('- "').rstrip('"')
    
    return cleaned_text

def generate_conversation_starters(user_profile):
    interests = user_profile.get('Interests', '관심사')
    attractions = user_profile.get('Attractions', '매력')

    prompt = f"""
    You are Want, a helpful and friendly chatbot. You assist users in starting and maintaining conversations with their matches.
    The user you're assisting likes {interests} and finds {attractions} attractive.
    Provide conversation starters in Korean that are casual and engaging, using polite but friendly language.
    Ensure each sentence follows the subject-verb-object structure and avoid repeating the same words.
    Do not include greetings like "Hello" or "Hi".
    Avoid situations where investigations come first and nouns come out.
    Make sure to create sentences without repeating words like "sometimes, sometimes".
    Please don't repeat the same investigation at the end of the sentence.
    Remember, these users have never met before.

    Examples of desired sentences:
    - "어떤 운동을 즐기세요? 저는 요가해본 적 있어요!"
    - "어디서 주로 옷 사세요? 스타일이 제 마음에 쏙 들어요!"
    - "저는 운동하면서 땀 날때 기분 좋더라고요!"
    - "패션에 관심 많으세요? 저는 다양한 스타일 도전해보는거 좋아해요."
    - "저는 음악을 들으면 더 힘이 나더라구요."
    - "옷 잘 입는 비결있으세요?"
    - "운동할 때 어떤 음악 주로 들으세요? 전 팝송 들으면서 해요."
    - "운동을 어디서 주로 하시나요?"

    Generate responses in a similar manner.
    """

    try:
        gpt_response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are Want, a helpful and friendly dating chatbot."},
                {"role": "user", "content": "What do you enjoy doing in your free time?"},
                {"role": "assistant", "content": "I love hiking and exploring nature trails. How about you?"},
                {"role": "user", "content": "What's your favorite type of music?"},
                {"role": "assistant", "content": "I really enjoy listening to popsong. It helps me relax."},
                {"role": "user", "content": "Do you like to cook?"},
                {"role": "assistant", "content": "Yes, I love cooking Italian dishes. Do you have a favorite cuisine?"},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            n=1,
            stop=None,
            temperature=0.8
        )

        # GPT-4 응답을 파싱하고 정리
        responses = gpt_response.choices[0].message['content'].strip().split('\n')
        cleaned_responses = [clean_response(response.strip()) for response in responses if response.strip()]
        # 번역을 통한 자연스러운 표현 생성

        logger.info(f"Original GPT-4 responses: {cleaned_responses}")#번역전데이터


        # translated_responses = []
        # for response in cleaned_responses:
        #     if response:
        #         translated_text = translator.translate(response, src='en', dest='ko').text
        #         translated_responses.append(clean_response(translated_text))

        return cleaned_responses  # 질문 개수 제한 없음

    except Exception as e:
        logger.error(f"Error generating conversation starters: {e}")
        return []


@app.route('/chatbot/suggestions', methods=['POST'])
def get_suggestions():
    user_data = request.json
    user_id = user_data['userId']
    logger.info(f"Received request for user ID: {user_id}")

    cursor = db_connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Users WHERE User_id = %s", (user_id,))
    user_profile = cursor.fetchone()

    if not user_profile:
        logger.warning(f"User with ID {user_id} not found")
        return jsonify({"error": "User not found"}), 404

    try:
        cursor = db_connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Users WHERE User_id = %s", (user_id,))
        user_profile = cursor.fetchone()

        if not user_profile:
            logger.warning(f"User with ID {user_id} not found")
            return jsonify({"error": "User not found"}), 404

        gpt_suggestions_texts = generate_conversation_starters(user_profile)
        logger.info(f"Generated suggestions: {gpt_suggestions_texts}")

    except openai.error.OpenAIError as e:
        logger.error(f"Error from OpenAI: {str(e)}")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        logger.error(f"Database or other error: {e}")
        return jsonify({"error": str(e)}), 500

    return jsonify(gpt_suggestions_texts)



@app.route('/chat/messages/<matchingID>', methods=['GET'])
def get_messages(matchingID):
    try:
        query = 'SELECT * FROM Messages WHERE MatchingID = %s ORDER BY SentDate ASC'
        db_cursor.execute(query, (matchingID,))
        messages = db_cursor.fetchall()
        if messages:
            return jsonify({"messages": messages})
        else:
            return jsonify({"message": "No messages found for this matching ID."}), 404
    except Exception as error:
        print('Failed to retrieve messages:', error)
        return jsonify({"message": "Failed to retrieve messages due to server error.", "error": str(error)}), 500

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
        db_cursor.execute(insert_query, (matchingID, senderID, receiverID, messageContent))
        db_connection.commit()
        new_message_id = db_cursor.lastrowid
        new_message = {
            "MessageID": new_message_id,
            "MatchingID": matchingID,
            "SenderID": senderID,
            "ReceiverID": receiverID,
            "MessageContent": messageContent,
            "SentDate": datetime.now().isoformat()
        }
        return jsonify(new_message)
    except Exception as error:
        print('Error inserting message into database:', error)
        db_connection.rollback()
        return jsonify({"error": "Error inserting message into database", "details": str(error)}), 500





app.register_blueprint(similarity_blueprint)
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=6000, debug=True)