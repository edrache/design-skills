import fitz  # PyMuPDF
import sys
import os
import re

def markdown_to_pdf(md_path, pdf_path):
    if not os.path.exists(md_path):
        print(f"Error: file {md_path} not found")
        return

    doc = fitz.open()
    page = doc.new_page()
    
    # Font paths for Polish support (macOS)
    font_path_reg = "/System/Library/Fonts/Supplemental/Arial.ttf"
    font_path_bold = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    
    # Check if fonts exist, fallback to another path if not
    if not os.path.exists(font_path_reg):
        font_path_reg = "/Library/Fonts/Arial.ttf"
        font_path_bold = "/Library/Fonts/Arial Bold.ttf"

    # Register fonts on the first page (doc level is fine too)
    font_reg_name = "Arial"
    font_bold_name = "Arial-Bold"
    has_fonts = False
    
    try:
        if os.path.exists(font_path_reg):
            page.insert_font(fontname=font_reg_name, fontfile=font_path_reg)
            font_reg_obj = fitz.Font(fontfile=font_path_reg)
            has_fonts = True
        if os.path.exists(font_path_bold):
            page.insert_font(fontname=font_bold_name, fontfile=font_path_bold)
            font_bold_obj = fitz.Font(fontfile=font_path_bold)
    except Exception as e:
        print(f"Warning: Could not register fonts: {e}. Falling back to Helvetica.")
        has_fonts = False

    # Constants for layout
    margin = 50
    y = margin
    page_width = page.rect.width
    page_height = page.rect.height
    max_width = page_width - 2 * margin
    
    with open(md_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    for line in lines:
        line = line.strip()
        if not line:
            y += 15 # Paragraph spacing
            continue
        
        # Check for headers
        header_match = re.match(r"^(#+)\s+(.*)$", line)
        if header_match:
            level = len(header_match.group(1))
            text = header_match.group(2)
            font_size = 24 - (level * 2)
            font_name = font_bold_name if has_fonts else "Helvetica-Bold"
            font_obj = font_bold_obj if has_fonts else None
        elif line.startswith("!["):
            # Image handling: ![caption](path)
            img_match = re.search(r"!\[.*\]\((.*)\)", line)
            if img_match:
                img_path = img_match.group(1)
                if os.path.exists(img_path):
                    try:
                        img = fitz.open(img_path)
                        img_rect = img[0].rect
                        aspect = img_rect.height / img_rect.width
                        display_width = min(max_width, img_rect.width)
                        display_height = display_width * aspect
                        
                        if y + display_height > page_height - margin:
                            page = doc.new_page()
                            # Re-insert fonts for New Page
                            if has_fonts:
                                page.insert_font(fontname=font_reg_name, fontfile=font_path_reg)
                                page.insert_font(fontname=font_bold_name, fontfile=font_path_bold)
                            y = margin
                        
                        page.insert_image(fitz.Rect(margin, y, margin + display_width, y + display_height), filename=img_path)
                        y += display_height + 10
                    except Exception as e:
                        print(f"Warning: Could not insert image {img_path}: {e}")
            continue
        else:
            text = line
            font_size = 12
            font_name = font_reg_name if has_fonts else "Helvetica"
            font_obj = font_reg_obj if has_fonts else None

        # Check for page overflow
        if y + font_size > page_height - margin:
            page = doc.new_page()
            if has_fonts:
                page.insert_font(fontname=font_reg_name, fontfile=font_path_reg)
                page.insert_font(fontname=font_bold_name, fontfile=font_path_bold)
            y = margin

        # Simple line wrapping
        words = text.split()
        current_line = ""
        for word in words:
            test_line = (current_line + " " + word).strip()
            if font_obj:
                width = font_obj.text_length(test_line, fontsize=font_size)
            else:
                width = fitz.get_text_length(test_line, fontname=font_name, fontsize=font_size)
                
            if width < max_width:
                current_line = test_line
            else:
                page.insert_text((margin, y), current_line, fontname=font_name, fontsize=font_size)
                y += font_size + 2
                current_line = word
                if y > page_height - margin:
                    page = doc.new_page()
                    if has_fonts:
                        page.insert_font(fontname=font_reg_name, fontfile=font_path_reg)
                        page.insert_font(fontname=font_bold_name, fontfile=font_path_bold)
                    y = margin
        
        if current_line:
            page.insert_text((margin, y), current_line, fontname=font_name, fontsize=font_size)
            y += font_size + 5

    doc.save(pdf_path)
    doc.close()
    print(f"PDF saved to {pdf_path}")




if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 md_to_pdf.py input.md output.pdf")
    else:
        markdown_to_pdf(sys.argv[1], sys.argv[2])
