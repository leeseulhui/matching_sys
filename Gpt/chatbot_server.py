from flask import Flask, request, jsonify
import pymysql
import os
from dotenv import load_dotenv
import openai

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# DB setup (load from .env)
db_connection = pymysql.connect(
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    cursorclass=pymysql.cursors.DictCursor,
    connect_timeout=10
)

# Load OpenAI API key for GPT-3.5-turbo or GPT-4
openai.api_key = os.getenv("OPENAI_API_KEY")

@app.route('/chatbot/suggestions', methods=['POST'])
def get_suggestions():
    user_data = request.json
    user_id = user_data['userId']
    
    cursor = db_connection.cursor()
    cursor.execute("SELECT * FROM Users WHERE User_id = %s", (user_id,))
    user_profile = cursor.fetchone()
    
    if not user_profile:
        return jsonify({"error": "User not found"}), 404
    
    # Generate suggestions using GPT-4
    prompt = f"Generate conversation starters for someone who likes {user_profile['Interests']}."
    try:
        gpt_response = openai.ChatCompletion.create(
            model="gpt-4o",  # Use "gpt-4" for GPT-4 model
            messages=[
                {"role": "system", "content": "You are a helpful dating chatbot."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=50,
            n=3,
            stop=None,
            temperature=0.7
        )
        gpt_suggestions_texts = [choice['message']['content'].strip() for choice in gpt_response['choices']]
    except openai.error.OpenAIError as e:
        return jsonify({"error": str(e)}), 500
    
    return jsonify(gpt_suggestions_texts)

if __name__ == '__main__':
    app.run(port=5001, debug=True)
