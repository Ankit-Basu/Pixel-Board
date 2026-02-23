from dotenv import load_dotenv
import os
load_dotenv()

SERVER_URL = 'localhost'
PORT = '8900'
ENV = 'dev'

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
