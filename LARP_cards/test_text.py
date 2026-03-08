import os
from dotenv import load_dotenv
from google import genai
load_dotenv()
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
print(client.models.generate_content(model="gemini-2.5-flash", contents="Test").text)
