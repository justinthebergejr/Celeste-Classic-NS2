"""Extract original cartridge data. No Lua emulator or network access at build time."""
from pathlib import Path
import hashlib
import json
import struct
from PIL import Image

ROOT = Path(__file__).resolve().parent
PALETTE = ['000000','1d2b53','7e2553','008751','ab5236','5f574f','c2c3c7','fff1e8',
           'ff004d','ffa300','ffec27','00e436','29adff','83769c','ff77a8','ffccaa']


def cartridge_data():
    path = ROOT / 'upstream/celeste.p8.png'
    records = json.loads((ROOT / 'upstream/sources.json').read_text())
    if hashlib.sha256(path.read_bytes()).hexdigest() != records['celeste.p8.png']['sha256']:
        raise ValueError('Cartridge checksum differs from the recorded original.')
    with Image.open(path) as image:
        rgba = image.convert('RGBA').tobytes()
    raw = bytes(((rgba[i]&3)<<4) | ((rgba[i+1]&3)<<2) | (rgba[i+2]&3) |
                ((rgba[i+3]&3)<<6) for i in range(0, len(rgba), 4))
    if raw[0x4300:0x4304] != b':c:\0':
        raise ValueError('Expected the original compressed PICO-8 cartridge.')
    # The lower map half shares the sprite sheet's lower half.
    tilemap = raw[0x2000:0x3000] + raw[0x1000:0x2000]
    assert len(tilemap) == 8192
    return raw[:8192], tilemap, raw[0x3000:0x3100]


def main():
    (ROOT / 'assets').mkdir(exist_ok=True)
    gfx, tilemap, flags = cartridge_data()
    # Bytes 17408..23551: 96 mutable 64-byte entities, initially empty.
    # Pixel font at byte 24576; UI text atlas at byte 65536.
    packed = bytearray(65536)
    packed[:16] = struct.pack('<4I', 0x43454c31, 1, 128, 128)
    packed[64:8256] = gfx
    packed[8256:16448] = tilemap
    packed[16448:16704] = flags
    font = Image.open(ROOT / 'upstream/font.png').convert('RGBA')
    assert font.size == (120,12)
    pixels = font.tobytes()
    packed[24576:26016] = bytes(255 if pixels[i+3] and max(pixels[i:i+3]) else 0
                               for i in range(0,len(pixels),4))
    font_map = 'abcdefghijklmnopqrstuvwxyz0123456789~!@#4%^&*()_+-=?:.'
    glyphs = {}
    for i, char in enumerate(font_map):
        bits = 0
        for yy in range(6):
            for xx in range(4):
                pixel = font.getpixel(((i%30)*4+xx,(i//30)*6+yy))
                if pixel[3] and max(pixel[:3]):
                    bits |= 1 << (yy*4+xx)
        # Keep the first occurrence of duplicated characters in the source font map.
        if char not in font_map[:i]:
            struct.pack_into('<I',packed,28000+ord(char)*4,bits)
            glyphs[char] = bits
    # Slash is needed for controller hints but isn't in the original font map.
    glyphs['/'] = sum(1 << (y*4+x) for x,y in [(2,0),(2,1),(1,2),(1,3),(0,4)])
    struct.pack_into('<I',packed,28000+ord('/')*4,glyphs['/'])
    # Every interface label now uses the game's 4x6 bitmap font at native resolution.
    atlas = Image.new('L', (1024,512))
    header, y = [], 2
    labels = [
        ('TITLE','celeste classic'), ('NS2','for ns2'), ('PAUSE','paused'), ('MENU','menu'),
        ('RESUME','resume'), ('BACK','back'), ('RETRY','retry room'), ('CONTROLS','controls'),
        ('CREDITS','credits'), ('RESTART','restart run'), ('EXIT','quit smilebasic to'),
        ('EXIT_DETAIL','leave the game'),
        ('SELECT_HINT','a: select  b: back'), ('BACK_HINT','b / +: back'),
        ('MENU_HINT','+: menu  -: leave help'), ('START','a / b / x: start'),
        ('VERSION','v0.3.3 - silent prototype'), ('EXPERIMENTAL','experimental shader port'),
        ('ORIGINAL','original game'), ('AUTHOR1','maddy thorson'), ('AUTHOR2','noel berry'),
        ('PORT','hblauncher / smilebasic'), ('UNOFFICIAL','unofficial ns2 adaptation'),
        ('MOVE','d-pad / stick'), ('AIM','move + aim dash'), ('JUMP','a / b: jump + wall jump'),
        ('DASH','x / y: dash'), ('QUICK_RETRY','l: retry room'), ('MENU_CONTROL','+: menu  -: leave help'),
        ('TIP','aim up + dash to climb'), ('CONFIRM_RESTART','restart run?'),
        ('LEAVE_TITLE','quit smilebasic'), ('LEAVE_SUBTITLE','to leave the game'),
        ('LEAVE_HOME','press home'), ('LEAVE_SELECT','select smilebasic'), ('LEAVE_CLOSE','press x to close'),
        ('LOSS','progress is not saved'),
        ('CANCEL','cancel'), ('YES_RESTART','restart'), ('YES_EXIT','exit'),
        ('WIN','summit reached!'), ('RESULT_HINT','a / +: menu'),
        ('ALTITUDE','altitude'), ('DEATHS','deaths'), ('BERRIES','berries'), ('TIME','time'),
        ('OLD_SITE','old site'), ('SUMMIT','summit'),
        ('SETTINGS','settings'), ('OUTSIDE_STATS','outside stats'), ('FILTER','screen filter'),
        ('OFF','off'), ('ON','on'), ('SCANLINES','scanlines'), ('LCD','lcd grid'), ('MONO','monochrome'),
        ('SETTINGS_HINT','a / left / right: change'), ('SESSION_ONLY','resets when app is closed'),
        ('RESET_DEFAULTS','reset display'),
        ('FILTER_NOTE','filter affects game only'),
    ]
    for name, text in labels:
        for i, char in enumerate(text):
            if char != ' ' and char not in glyphs:
                raise ValueError('Missing pixel font character: ' + char)
            bits = glyphs.get(char,0)
            for yy in range(6):
                for xx in range(4):
                    if bits & (1 << (yy*4+xx)):
                        atlas.putpixel((2+i*4+xx,y+yy),255)
        header.append(f'const ivec4 TEXT_{name}=ivec4(2,{y},{len(text)*4-1},6);'); y+=8
    assert y < 512
    packed.extend(atlas.tobytes())
    (ROOT / 'assets/data.bin').write_bytes(packed)
    (ROOT / 'shaders/text.glsl').write_text('\n'.join(header)+'\n')
    memorial = [line.ljust(32) for line in ['-- celeste mountain --','this memorial to those',' perished on the climb']]
    values = ','.join(str(ord(c))+'u' for c in ''.join(memorial))
    (ROOT / 'shaders/pixel-text.glsl').write_text('const uint MEMORIAL[96]=uint[96]('+values+');\n')
    sheet = Image.new('RGBA',(128,128))
    palette = [tuple(bytes.fromhex(c))+(255,) for c in PALETTE]
    sheet.putdata([palette[(gfx[i//2] >> ((i%2)*4)) & 15] for i in range(16384)])
    sheet.save(ROOT / 'assets/sprites.png')
    icon = Image.new('RGBA',(256,256),'#1d2b53')
    character=sheet.crop((8,0,16,8)).resize((160,160),Image.Resampling.NEAREST)
    # Cartridge color 0 is transparent for sprites.
    character.putalpha(character.convert('RGB').point(lambda x: x).convert('L').point(lambda x:255 if x else 0))
    icon.alpha_composite(character,(48,48)); icon.save(ROOT / 'assets/icon.png')
    counts=[]
    kinds={8,11,12,18,20,22,23,26,28,64,86,96,118}
    for room in range(32):
        tiles=[tilemap[(room%8)*16+x+((room//8)*16+y)*128] for x in range(16) for y in range(16)]
        if room < 31 and tiles.count(1)!=1:
            raise ValueError(f'Room {room} does not have exactly one spawn')
        counts.append(sum(t in kinds for t in tiles))
    assert max(counts) < 92
    print(f'Packed original sprites, flags and all 32 rooms; max {max(counts)} entities/room.')


if __name__ == '__main__':
    main()
