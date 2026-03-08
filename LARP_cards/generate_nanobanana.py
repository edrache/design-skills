import os
from google import genai
from google.genai import types

def generate_medieval_engraving(subject: str, api_key: str, output_filename: str = "nanobanana.jpg"):
    """
    Generates a black and white medieval engraving style image using Imagen 3.
    """
    # Inicjalizacja klienta Google GenAI
    client = genai.Client(api_key=api_key)

    print(f"Generuję obraz dla tematu: '{subject}'...")
    
    # Skomponuj odpowiedni prompt wymuszający styl ryciny (angielski działa najlepiej)
    prompt = f"Black and white medieval engraving, woodcut style, highly detailed. A depiction of {subject} in the style of 15th-century block book illustrations with hatching."

    # Wywołanie API Imagen 3
    result = client.models.generate_images(
        model='imagen-3.0-generate-001',
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            output_mime_type="image/jpeg",
            aspect_ratio="4:3"
            # enhance_prompt=True (można dodać w razie potrzeby)
        )
    )

    # Zapisz wygenerowany obraz
    for generated_image in result.generated_images:
        image = generated_image.image
        # Image jest obiektem PIL.Image jeśli zainstalowano pillow
        image.save(output_filename)
        print(f"Obraz zapisany pomyślnie jako: {output_filename}")


if __name__ == "__main__":
    # Pobierz klucz API ze zmiennej środowiskowej
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        print("BŁĄD: Nie znaleziono klucza API.")
        print("Ustaw zmienną środowiskową np.: export GEMINI_API_KEY='twój_klucz_api'")
        exit(1)

    print("Rozpoczynam proces generowania z Google AI...")
    
    # Przykładowe wywołanie - można zmienić 'NanoBanana' na inny temat
    generate_medieval_engraving(
        subject="NanoBanana",
        api_key=api_key,
        output_filename="NanoBanana.jpg"
    )
