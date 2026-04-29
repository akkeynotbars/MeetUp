from flask import Flask, request, jsonify
from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()

app = Flask(__name__)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route('/')
def index():
    return jsonify({"message": "MeetUp AI Engine is running!"})

# Task 29.0 - AI Career Feedback API
@app.route('/ai/career-feedback', methods=['POST'])
def career_feedback():
    data = request.get_json()

    if not data or 'cv_text' not in data:
        return jsonify({"error": "cv_text is required"}), 400

    cv_text = data['cv_text']
    job_title = data.get('job_title', 'general position')

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional career advisor. Analyze the CV and give constructive feedback."
                },
                {
                    "role": "user",
                    "content": f"""Analyze this CV for a {job_title} position and provide:
1. Overall assessment
2. Key strengths
3. Areas for improvement
4. Specific recommendations

CV:
{cv_text}"""
                }
            ],
            max_tokens=1000
        )

        feedback = response.choices[0].message.content

        return jsonify({
            "message": "Career feedback generated successfully",
            "job_title": job_title,
            "feedback": feedback
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)