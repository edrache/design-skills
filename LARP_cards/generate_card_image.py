import os
import argparse
from google import genai
from google.genai import types

def load_env_file(filepath=".env"):
    try:
        with open(filepath, "r") as f:
            for line in f:
                if line.strip() and not line.startswith("#") and "=" in line:
                    key, value = line.strip().split("=", 1)
                    # remove quotes if present
                    value = value.strip("\"'")
                    os.environ[key.strip()] = value
    except FileNotFoundError:
        pass

def generate_medieval_engraving(subject: str, api_key: str, output_filename: str):
    """
    Generates a black and white medieval engraving style image using Imagen 3.
    """
    print(f"Inicjalizacja klienta Google GenAI...")
    client = genai.Client(api_key=api_key)

    print(f"Generuję obraz dla tematu: '{subject}'...")
    
    # Skomponuj odpowiedni prompt wymuszający styl ryciny
    prompt = f"A medieval black and white woodcut engraving of a {subject}. White background."
    print(f"Użyty prompt: {prompt}")

    # Wywołanie API Imagen 3
    result = client.models.generate_images(
        model='imagen-3.0-generate-001',
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            output_mime_type="image/jpeg",
            aspect_ratio="4:3"
        )
    )

    # Zapisz wygenerowany obraz
    for generated_image in result.generated_images:
        image = generated_image.image
        image.save(output_filename)
        print(f"Obraz na pewno został wygenerowany!")
        print(f"Zapisano w pliku: {output_filename}")


if __name__ == "__main__":
    load_env_file()
    
    parser = argparse.ArgumentParser(description="Generate Medieval Engraving Image")
    parser.add_argument("--subject", type=str, required=True, help="The subject in English (e.g. 'Hidden Dagger')")
    parser.add_argument("--output", type=str, required=True, help="Output image path (e.g. 'images/ukryty_sztylet.jpg')")
    
    args = parser.parse_args()
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("BŁĄD: Nie znaleziono klucza API w zmiennych środowiskowych ani w pliku .env")
        exit(1)

    print("Rozpoczynam proces generowania z Google AI...")
    generate_medieval_engraving(
        subject=args.subject,
        api_key=api_key,
        output_filename=args.output
    )
