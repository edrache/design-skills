import os
import sys
import argparse
import time
from pathlib import Path
from google import genai
from google.genai import types

SCRIPT_DIR = Path(__file__).parent

def load_env_file(filepath=".env"):
    try:
        with open(filepath, "r") as f:
            for line in f:
                if line.strip() and not line.startswith("#") and "=" in line:
                    key, value = line.strip().split("=", 1)
                    value = value.strip("\"'")
                    os.environ[key.strip()] = value
    except FileNotFoundError:
        pass

# Style prefix applied to every prompt
STYLE_PREFIX = (
    "cartoon tabletop RPG illustration, cozy warm colors (amber, brown, sage green), "
    "bold black ink outlines, detailed whimsical scene, children's book meets D&D art style, "
    "flat colors with subtle shading, wooden frame border, no text, "
)

# English scene descriptions for each card
CARD_PROMPTS = {
    "phone-scroll": (
        "a nervous game master at a candle-lit wooden table while one player scrolls a glowing "
        "smartphone during a dramatic horror scene, a scary monster miniature sits on the map"
    ),
    "fantasy-gun": (
        "a medieval knight dramatically pulling two ornate flintlock pistols from under a fantasy cloak "
        "at a gaming table, other players staring in disbelief, swords and scrolls on the table"
    ),
    "last-minute-cancel": (
        "a game master sitting alone at a beautifully prepared gaming table with elaborate maps, painted "
        "miniatures, and handwritten notes, sadly looking at a phone showing two cancellation messages"
    ),
    "zero-notes": (
        "four confused adventurers gathered around a dungeon map with question marks floating above "
        "their heads, one pointing at a mysterious ruin entrance with no idea why they came"
    ),
    "joke-loop": (
        "a player standing on their chair doing a theatrical impression of a serious noble NPC, "
        "holding a jester hat over the NPC miniature, other players laughing but GM looking tired"
    ),
    "lore-vacuum": (
        "a dramatic game master unrolling a glowing ancient prophecy scroll at the head of the table "
        "while all players point excitedly at a tiny kebab shop sign on the city map"
    ),
    "solo-spotlight": (
        "one enthusiastic player standing up and gesturing dramatically while narrating an elaborate "
        "plan, other players slumped in chairs looking at their character sheets waiting"
    ),
    "rules-unread": (
        "a game master at a cozy wooden table holding up a large open rulebook, pointing to a highlighted "
        "paragraph, a bewildered player staring blankly at their character sheet, dice and candles nearby"
    ),
    "mood-break": (
        "a huge fearsome dragon miniature roaring on the battle map while a player holds up a phone "
        "with a payment app asking the dragon to accept it, other players covering their faces"
    ),
    "missing-backstory": (
        "a completely blank character sheet on the gaming table, pencils scattered around, "
        "a player scratching their head with a big question mark cloud, other players waiting patiently"
    ),
    "schedule-chaos": (
        "a game master buried under floating calendar pages and speech bubbles full of conflicting "
        "dates and excuses, looking overwhelmed, a scheduling disaster in a cozy tavern setting"
    ),
    "genre-drift": (
        "a classical medieval fantasy map on the table with a motorcycle, robotic eye, and smoke "
        "grenade suddenly materializing among the swords, torches, and ancient scrolls"
    ),
    "table-sidequest": (
        "two players at a game table deep in a lively side conversation with TV show posters in "
        "their speech bubbles, while the GM and other players try to continue the adventure"
    ),
    "npc-ignore": (
        "an elaborate mentor NPC puppet delivering a dramatic speech from a tiny stage on the table "
        "while all players crowd around a market stall asking about rope and torch prices"
    ),
    "late-player": (
        "a perfectly set gaming table with candles, maps, and snacks, everyone sitting and checking "
        "watches, one very empty chair with a coat draped over it"
    ),
    "combat-tab-out": (
        "an overhead view of a virtual tabletop battle map on a laptop, one player visible on a video "
        "call clearly playing a completely different video game on a second screen"
    ),
    "prep-wasted": (
        "a game master standing next to enormous stacks of handcrafted maps and notes looking shocked "
        "as tiny player miniatures march confidently in the complete opposite direction"
    ),
    "grim-joke": (
        "a solemn fantasy funeral scene with black-draped NPC miniatures on a table while one player "
        "does dramatic funny voices, the serious atmosphere visually flying out an open window"
    ),
    "loot-obsession": (
        "player miniatures enthusiastically rummaging through a defeated enemy's pockets with coins "
        "flying everywhere, ignoring a crying NPC and dramatic story moment happening right next to them"
    ),
    "homework-energy": (
        "five very sleepy players with heavy eyelids slumped at a game table surrounded by coffee cups, "
        "while the GM has an enormous elaborate dungeon planned out eagerly waiting to start"
    ),
    "missing-recap-reader": (
        "a game master holding up a large colorful summary document with arrows, portraits, and maps, "
        "while all players stare back with completely blank confused expressions"
    ),
    "sudden-pvp": (
        "two player miniatures dramatically facing off on a battle map, swords drawn against each other, "
        "while the GM and other players hold up red stop signs looking alarmed"
    ),
    "session-end-cliffhanger": (
        "enthusiastic players finally leaning in over the map in excitement, while the GM is sweating "
        "and pointing nervously at a large clock on the wall showing a very late hour"
    ),
}

def build_prompt(scene: str) -> str:
    return STYLE_PREFIX + scene

def generate_image(client, prompt: str, output_path: str) -> bool:
    result = client.models.generate_images(
        model="imagen-4.0-generate-001",
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            output_mime_type="image/jpeg",
            aspect_ratio="4:3",
        ),
    )
    if not result.generated_images:
        return False
    for generated_image in result.generated_images:
        generated_image.image.save(output_path)
    return True

def main():
    load_env_file()

    parser = argparse.ArgumentParser(description="Generate Marsz card illustrations")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--id", type=str, help="Card ID to generate (e.g. phone-scroll)")
    group.add_argument("--all", action="store_true", help="Generate all card illustrations")
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(SCRIPT_DIR / "game1" / "assets"),
        help="Output directory (default: Marsz/game1/assets)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=2.0,
        help="Seconds to wait between API calls when using --all (default: 2.0)",
    )
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("BLAD: Brak GEMINI_API_KEY w zmiennych srodowiskowych lub pliku .env")
        exit(1)

    os.makedirs(args.output_dir, exist_ok=True)
    client = genai.Client(api_key=api_key)

    if args.id:
        if args.id not in CARD_PROMPTS:
            print(f"BLAD: Nieznane ID karty '{args.id}'")
            print(f"Dostepne ID: {', '.join(CARD_PROMPTS.keys())}")
            exit(1)
        output_path = os.path.join(args.output_dir, f"{args.id}.jpg")
        prompt = build_prompt(CARD_PROMPTS[args.id])
        print(f"Generuje: {args.id}")
        print(f"Prompt: {prompt}")
        ok = generate_image(client, prompt, output_path)
        if ok:
            print(f"Zapisano: {output_path}")
        else:
            print(f"BLAD: API nie zwrocilo obrazu (zablokowane przez safety filter?)")

    elif args.all:
        total = len(CARD_PROMPTS)
        failed = []
        for i, (card_id, scene) in enumerate(CARD_PROMPTS.items(), start=1):
            output_path = os.path.join(args.output_dir, f"{card_id}.jpg")
            if os.path.exists(output_path):
                print(f"[{i}/{total}] Pomijam (istnieje): {card_id}")
                continue
            prompt = build_prompt(scene)
            print(f"[{i}/{total}] Generuje: {card_id}")
            try:
                ok = generate_image(client, prompt, output_path)
                if ok:
                    print(f"  -> Zapisano: {output_path}")
                else:
                    print(f"  -> BLAD: brak obrazu (safety filter?) — pomijam")
                    failed.append(card_id)
            except Exception as e:
                print(f"  -> BLAD: {e} — pomijam")
                failed.append(card_id)
            if i < total:
                time.sleep(args.delay)
        print(f"\nGotowe! Wygenerowano {total - len(failed)}/{total} obrazow.")
        if failed:
            print(f"Nieudane karty: {', '.join(failed)}")

if __name__ == "__main__":
    main()
