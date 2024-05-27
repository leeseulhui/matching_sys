from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from msrest.authentication import CognitiveServicesCredentials
import io
import nltk
from nltk.tokenize import word_tokenize
from nltk.tag import pos_tag

nltk.download('punkt')
nltk.download('averaged_perceptron_tagger')

# Azure Computer Vision API 키와 엔드포인트
subscription_key = "cbb9ab87fdb0448cb288737da13a1d32"
endpoint = "https://ppark.cognitiveservices.azure.com/"

# Computer Vision 클라이언트 생성
computervision_client = ComputerVisionClient(endpoint, CognitiveServicesCredentials(subscription_key))

def generate_caption(image_stream):
    try:
        # 이미지 스트림의 시작 부분을 확인 (읽기 위치를 처음으로 설정)
        image_stream.seek(0)
        # 이미지 분석
        analysis = computervision_client.describe_image_in_stream(image_stream)
        caption = analysis.captions[0].text if analysis.captions else "No caption found"
        return caption
    except Exception as e:
        print(f"Failed to generate caption: {e}")
        raise

def extract_nouns(text):
    # 문장을 단어로 토큰화
    words = word_tokenize(text)
    # 품사 태깅
    tagged_words = pos_tag(words)
    # 명사만 추출
    nouns = [word for word, pos in tagged_words if pos.startswith('NN')]
    return ' '.join(nouns)