import fitz  # PyMuPDF
import sys
import os
import argparse
import json

def extract_pdf_content(pdf_path, output_dir):
    """
    Extracts text and images from a PDF file using PyMuPDF.
    """
    if not os.path.exists(pdf_path):
        print(f"Error: File '{pdf_path}' not found.")
        sys.exit(1)

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    doc = fitz.open(pdf_path)
    content = []

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text()
        
        page_content = {
            "page_num": page_num + 1,
            "text": text,
            "images": []
        }

        # Extract images
        image_list = page.get_images(full=True)
        for img_index, img in enumerate(image_list):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            ext = base_image["ext"]
            image_filename = f"page_{page_num + 1}_img_{img_index + 1}.{ext}"
            image_path = os.path.join(output_dir, image_filename)
            
            with open(image_path, "wb") as f:
                f.write(image_bytes)
            
            page_content["images"].append(image_path)
        
        content.append(page_content)

    return content

def main():
    parser = argparse.ArgumentParser(description="Extract text and images from a PDF file.")
    parser.add_argument("pdf_path", help="Path to the PDF file.")
    parser.add_argument("--output_dir", default="extracted_content", help="Directory to save extracted content.")
    args = parser.parse_args()

    content = extract_pdf_content(args.pdf_path, args.output_dir)
    
    # Save text content to a JSON file for the LLM to process
    output_json = os.path.join(args.output_dir, "content.json")
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

    print(json.dumps({
        "status": "success",
        "message": f"Content extracted successfully to '{args.output_dir}'",
        "json_path": output_json
    }))

if __name__ == "__main__":
    main()
