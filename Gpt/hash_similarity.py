
import networkx as nx
import logging
from flask import Blueprint, request, jsonify
from googletrans import Translator
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Initialize Blueprint
similarity_blueprint = Blueprint('hash_similarity', __name__)

GLOVE_VECTOR_FILE = './glove/glove.6B.100d.txt'

# GloVe 벡터를 로드하는 함수
def load_glove_vectors(glove_file):
    glove_model = {}
    with open(glove_file, 'r', encoding='utf-8') as f:
        for line in f:
            parts = line.split()
            word = parts[0]
            vector = np.array(parts[1:], dtype=np.float32)
            glove_model[word] = vector
    return glove_model

# GloVe 모델 로드
model = load_glove_vectors(GLOVE_VECTOR_FILE)

def translate_words(words, src_lang='ko', dest_lang='en'):
    # 해시태그를 번역하는 함수
    translator = Translator()
    translated_words = [translator.translate(word, src=src_lang, dest=dest_lang).text for word in words]
    return translated_words

def get_vector(word):
    """Return the vector for a word or phrase by averaging the vectors of known words."""
    # 단어의 벡터를 반환하는 함수
    words = word.split()
    word_vectors = []
    for w in words:
        if w in model:
            word_vectors.append(model[w])
    if word_vectors:
        return np.mean(word_vectors, axis=0)
    else:
        return None

def calculate_similarity(word1, word2):
    # 두 단어의 유사도를 계산하는 함수
    vector1 = get_vector(word1)
    vector2 = get_vector(word2)
    if vector1 is not None and vector2 is not None:
        return cosine_similarity([vector1], [vector2])[0][0]
    else:
        return 0

def add_edges_with_similarity(graph, tag1, tag2, similarities, threshold=0.3):
    # 유사도를 계산하여 그래프에 엣지를 추가하는 함수
    if tag1 == tag2:
        return
    similarity = calculate_similarity(tag1, tag2)
    if similarity > 0.38:
        similarity = 1  # 유사도가 0.5 이상이면 1로 설정
    if similarity > threshold:
        graph.add_edge(tag1, tag2, weight=similarity)
        similarities.append({'tag1': tag1, 'tag2': tag2, 'similarity': float(similarity)})  # 유사도 정보를 리스트에 추가
        logging.info("Tag similarity: %s - %s: %s", tag1, tag2, similarity)

def remove_low_connected_nodes(graph, threshold=0.1):
    # 연결이 적은 노드를 그래프에서 제거하는 함수
    removal = [node for node in graph.nodes if graph.degree(node) == 0 or 
               sum(graph[node][nbr]['weight'] for nbr in graph.neighbors(node)) / graph.degree(node) < threshold]
    graph.remove_nodes_from(removal)

@similarity_blueprint.route('/similarity', methods=['POST'])
def calculate_tag_similarity():
    # 해시태그 유사도를 계산하는 엔드포인트
    data = request.get_json()

    user1_tags = data.get('hashtags_user1', [])
    user2_tags = data.get('hashtags_user2', [])
    user_id = data.get('userId', '')

    logging.info("Original User 1 Tags: %s", user1_tags)
    logging.info("Original User 2 Tags: %s", user2_tags)

    # 원래 해시태그 저장
    original_user1_tags = list(user1_tags)
    original_user2_tags = list(user2_tags)

    # 해시태그 번역
    translated_user1_tags = translate_words(user1_tags)
    translated_user2_tags = translate_words(user2_tags)

    # 중복 제거
    user1_tags = set(translated_user1_tags)
    user2_tags = set(translated_user2_tags)
    
    # 그래프 생성
    G = nx.Graph()
    similarities = []
    logging.info("Translated User 1 Tags: %s", translated_user1_tags)
    logging.info("Translated User 2 Tags: %s", translated_user2_tags)

    # 태그 간 유사도 계산 및 엣지 추가
    for tag1 in user1_tags:
        for tag2 in user2_tags:
            add_edges_with_similarity(G, tag1.strip(), tag2.strip(), similarities)

    # 연결이 적은 노드 제거
    remove_low_connected_nodes(G)

    # 필터링된 유사도를 포함한 엣지들 가져오기
    filtered_edges = [(u, v, d['weight']) for u, v, d in G.edges(data=True) if d['weight'] >= 0.3]
    total_similarity = sum(d for u, v, d in filtered_edges)
    edge_count = len(filtered_edges)

    # 유사도를 0에서 1 사이로 정규화
    max_possible_similarity = edge_count  # 각 엣지의 최대 가중치는 1
    normalized_total_similarity = total_similarity / max_possible_similarity if max_possible_similarity > 0 else 0
    average_similarity = total_similarity / edge_count if edge_count > 0 else 0

    logging.info("total_similarity: %s", total_similarity)
    logging.info("normalized_total_similarity: %s", normalized_total_similarity)
    logging.info("average_similarity: %s", average_similarity)
    logging.info("edge_count: %s", edge_count)
    logging.info("userId: %s", user_id)

    # 사용자가 유사한지 판단하기 위한 임계값 설정
    similarity_threshold = 0.5  # 예시 임계값, 경험적 테스트를 통해 조정 가능

    are_similar = average_similarity >= similarity_threshold

    # 유사도가 0.5 이상인 태그 필터링
    high_similarity_tags = {v for u, v, w in filtered_edges if w > 0.5}

    # 번역 전 해시태그에서 유사도가 높은 2번 유저의 태그 찾기
    original_high_similarity_tags_user2 = []
    for original_tag, translated_tag in zip(original_user2_tags, translated_user2_tags):
        if translated_tag in high_similarity_tags:
            original_high_similarity_tags_user2.append(original_tag)

    return jsonify({
        'userId': user_id,
        'total_similarity': float(normalized_total_similarity),
        'average_similarity': float(average_similarity),
        'number_of_connections': int(edge_count),
        'are_similar': bool(are_similar),
        'similarities': similarities,  # 유사도 리스트 반환
        'high_similarity_tags': list(high_similarity_tags),  # 높은 유사도 태그 반환
        'original_high_similarity_tags_user2': original_high_similarity_tags_user2  # 원래 한국어 해시태그 중 유사도가 높은 태그
    })
