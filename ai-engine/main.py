# MeetUp AI Engine
# This module handles all AI-related features:
# - Resume summarization
# - CV scoring & red flag detection
# - Hiring probability calculation
# - Career feedback
# - Interview question generation
# - Skill gap analysis
# - Grade detection (Junior/Mid/Senior/Expert)

from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

@app.route('/')
def index():
    return jsonify({"message": "MeetUp AI Engine is running!"})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
