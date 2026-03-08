import os
from google import genai

key = None
with open(".env", "r") as f:
    for line in f:
        if line.strip() and not line.startswith("#") and "=" in line:
            k, v = line.strip().split("=", 1)
            if k.strip() == "GEMINI_API_KEY":
                key = v.strip("\"'")

print("Key exists:", bool(key))
client = genai.Client(api_key=key)
models = list(client.models.list())
print("Total models:", len(models))
print("Imagen models:", [m.name for m in models if 'imagen' in m.name])
