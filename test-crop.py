import sys
from PIL import Image

def get_ascii(img):
    chars = " .:-=+*#%@"
    img = img.resize((60, 40)).convert("L")
    ascii_str = ""
    for y in range(40):
        for x in range(60):
            val = img.getpixel((x, y))
            idx = int((val / 255.0) * 9)
            ascii_str += chars[idx]
        ascii_str += "\n"
    return ascii_str

img = Image.open('src/assets/images/qareeb_hero_adnan_1786958738930.jpg')
w, h = img.size
target_ratio = 400 / 500  # 4/5 aspect ratio
img_ratio = w / h

if img_ratio > target_ratio:
    # Image is wider, scale to match height
    new_w = int(h * target_ratio)
    new_h = h
    
    # 70% x-position
    left = int((w - new_w) * 0.70)
    top = 0
else:
    new_w = w
    new_h = int(w / target_ratio)
    left = 0
    top = int((h - new_h) * 0.15)

img_cropped = img.crop((left, top, left + new_w, top + new_h))
print(get_ascii(img_cropped))
