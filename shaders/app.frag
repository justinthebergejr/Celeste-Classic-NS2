#version 450
#extension GL_GOOGLE_include_directive : require
#define STATE_ACCESS readonly
#include "abi.glsl"
#include "game.glsl"
#include "text.glsl"
#include "pixel-text.glsl"
layout(location=0) out vec4 outColor;

vec3 palette(int id) {
    const uint colors[16]=uint[16](0x000000u,0x1d2b53u,0x7e2553u,0x008751u,
        0xab5236u,0x5f574fu,0xc2c3c7u,0xfff1e8u,0xff004du,0xffa300u,0xffec27u,
        0x00e436u,0x29adffu,0x83769cu,0xff77a8u,0xffccaau);
    uint c=colors[id&15];return vec3((c>>16u)&255u,(c>>8u)&255u,c&255u)/255.0;
}
int spritePixel(int sprite,ivec2 p,bool flip) {
    if (any(lessThan(p,ivec2(0))) || any(greaterThanEqual(p,ivec2(8))) || sprite<0 || sprite>255) return 0;
    if (flip) p.x=7-p.x;
    ivec2 xy=ivec2(sprite%16,sprite/16)*8+p;
    uint index=uint(xy.y*128+xy.x);
    return int((dataByte(64u+index/2u)>>((index&1u)*4u))&15u);
}
void sprite(inout int color,ivec2 pixel,vec2 origin,int id,bool flip) {
    int c=spritePixel(id,pixel-ivec2(floor(origin)),flip);
    if (c!=0) color=c;
}
bool inside(vec2 p,vec4 rect) {
    return all(greaterThanEqual(p,rect.xy)) && all(lessThan(p,rect.xy+rect.zw));
}
void terrain(inout int color,ivec2 p,int flag) {
    int offset=c.game.x==31u && flag==1 ? -4 : 0;
    ivec2 q=p-ivec2(offset,0);
    if (any(lessThan(q,ivec2(0))) || any(greaterThanEqual(q,ivec2(128)))) return;
    int tile=tileAt(q/8);
    if (tileFlag(tile,flag)) {
        int c=spritePixel(tile,q%8,false);if (c!=0) color=c;
    }
}
bool glyph(vec2 q,uint ascii) {
    ivec2 p=ivec2(floor(q));
    if (any(lessThan(p,ivec2(0))) || p.x>=4 || p.y>=6 || ascii>=128u) return false;
    return (c.atlas[7000u+ascii]&(1u<<uint(p.y*4+p.x)))!=0u;
}
float digits(vec2 p,uint value,int count) {
    float hit=0.0;uint divisor=1u;
    for (int i=0;i<count-1;i++) divisor*=10u;
    for (int i=0;i<count;i++) {
        if (glyph(p-vec2(i*4,0),48u+(value/divisor)%10u)) hit=1.0;
        divisor=max(1u,divisor/10u);
    }
    return hit;
}
float text(vec2 p,vec2 origin,ivec4 rect) {
    ivec2 q=ivec2(floor(p-origin));
    if (any(lessThan(p-origin,vec2(0))) || any(greaterThanEqual(q,rect.zw))) return 0.0;
    uint index=uint((q.y+rect.y)*1024+q.x+rect.x);
    uint word=c.atlas[16384u+(index>>2u)];
    return float((word>>((index&3u)*8u))&255u)/255.0;
}
void label(inout vec3 color,vec2 p,vec2 origin,ivec4 rect,vec3 ink) {
    color=mix(color,ink,text(p,origin,rect));
}
int gamePixel(ivec2 p) {
    int color=c.bag[6]!=0u ? 2 : 0;
    if (c.bag[7]!=0u && (c.stats.y%6u)<3u) color=7;
    if (c.game.x!=31u) {
        for (int i=0;i<17;i++) {
            float seed=float(i)*37.17;
            float w=32.0+mod(seed,32.0),speed=1.0+mod(seed*3.7,4.0);
            float x=mod(seed+float(c.stats.y)*speed,128.0+w)-w;
            float y=mod(seed*17.3,120.0);
            if (inside(vec2(p),vec4(x,y,w,4.0+(1.0-w/64.0)*12.0))) color=c.bag[6]!=0u ? 14 : 1;
        }
    }
    terrain(color,p,2);
    for (int i=0;i<int(c.game.w);i++) {
        Entity e=entity(i);int type=e.meta.x;
        if (type==11 || type==12) {
            sprite(color,p,e.pos.xy-vec2(0,1),11,false);
            sprite(color,p,e.pos.xy+vec2(8,-1),12,false);
        } else if (type==96) {
            if (e.meta.z==0) {
                sprite(color,p,e.pos.xy,96,false);sprite(color,p,e.pos.xy+vec2(8,0),97,false);
            }
            sprite(color,p,e.pos.xy+vec2(0,8),112,false);sprite(color,p,e.pos.xy+8.0,113,false);
            if (e.meta.z==1 && abs(float(p.x)-(e.pos.x+8.0))<1.0 && p.y<int(e.pos.y)) color=7;
        }
    }
    terrain(color,p,1);
    for (int i=0;i<int(c.game.w);i++) {
        Entity e=entity(i);int type=e.meta.x;
        if (type==0 || type==11 || type==12 || type==96) continue;
        if (type==23 && e.meta.z==2) continue;
        if (type==18 && e.meta.y==0) continue;
        if (type==22 && e.meta.y==0) continue;
        if (type==64) {
            sprite(color,p,e.pos.xy,64,false);sprite(color,p,e.pos.xy+vec2(8,0),65,false);
            sprite(color,p,e.pos.xy+vec2(0,8),80,false);sprite(color,p,e.pos.xy+8.0,81,false);
        } else if (type==28) {
            int wing=45+int((c.stats.y/4u)%3u);
            sprite(color,p,e.pos.xy+vec2(-6,-2),wing,true);
            sprite(color,p,e.pos.xy+vec2(6,-2),wing,false);
            sprite(color,p,e.pos.xy,e.meta.y,false);
        } else {
            if (type==22) sprite(color,p,e.pos.xy+vec2(0,6),13+int(mod(e.work.z*8.0,3.0)),false);
            sprite(color,p,e.pos.xy,e.meta.y,false);
            if (type==102) {
                for (int j=0;j<8;j++) {
                    float a=float(c.stats.y)/30.0+float(j)/8.0;
                    vec2 point=e.pos.xy+4.0+vec2(cos(a*6.2831853),psin(a))*8.0;
                    if (distance(vec2(p),floor(point))<=1.0) color=7;
                }
            }
        }
    }
    if (c.game.x!=31u && c.bagMeta.z!=0u) {
        int hairColor=c.piece.z==1 ? 8 : (c.piece.z==2 ? ((c.stats.y/3u)%2u==0u?7:11) : 12);
        for (int i=0;i<5;i++) {
            vec2 h=floor(uintBitsToFloat(uvec2(c.rows[i*2],c.rows[i*2+1])));
            float radius=i<2 ? 2.0 : 1.0;
            if (distance(vec2(p),h)<=radius+0.1) color=hairColor;
        }
        int playerColor=spritePixel(int(c.rows[10]),p-ivec2(floor(c.flow.xy)),c.motion.y<0.0);
        if (playerColor!=0) color=playerColor==8 ? hairColor : playerColor;
    } else if (c.stats.w>0u) {
        float elapsed=float(15u-c.stats.w);
        for (int i=0;i<8;i++) {
            float a=float(i)/8.0;
            vec2 point=c.flow.xy+4.0+vec2(psin(a),cos(a*6.2831853))*elapsed*3.0;
            if (elapsed<10.0 && distance(vec2(p),floor(point))<2.0) color=14+int(c.stats.y&1u);
        }
    }
    terrain(color,p,3);
    if (c.game.x!=31u) for (int i=0;i<25;i++) {
        float seed=float(i)*51.37;
        float x=mod(seed+float(c.stats.y)*(.25+mod(seed,5.0)),136.0)-4.0;
        float y=mod(seed*3.43+psin(float(c.stats.y)*.01+seed)*5.0,128.0);
        if (all(equal(p,ivec2(floor(vec2(x,y)))))) color=6+int(mod(seed,2.0));
    }
    for (int i=0;i<int(c.game.w);i++) {
        Entity e=entity(i);
        if (e.meta.x==86 && c.bagMeta.z!=0u && overlap(playerRect(vec2(4,0)),entityRect(e))) {
            vec2 q=vec2(p)-vec2(8,96);
            if (inside(q,vec4(-2,-2,94,24))) color=7;
            int line=int(floor(q.y/7.0)),character=int(floor(q.x/4.0));
            if (line>=0 && line<3 && character>=0 && character<32 &&
                glyph(vec2(mod(q.x,4.0),mod(q.y,7.0)),MEMORIAL[line*32+character])) color=0;
        }
    }
    return color;
}
#include "ui.glsl"
void main() {
    vec2 p=gl_FragCoord.xy;
    vec3 color=palette(0);
    const vec2 origin=vec2(512,92);
    vec2 q=floor((p-origin)/7.0);
    if (inside(p,vec4(origin-7.0,910,910))) color=palette(1);
    if (inside(p,vec4(origin,896,896))) {
        ivec2 pixel=ivec2(q);
        if (c.bag[4]>0u) {
            uint t=c.stats.y;
            pixel+=ivec2(int((t*13u)%5u)-2,int((t*7u)%5u)-2);
        }
        color=any(lessThan(pixel,ivec2(0))) || any(greaterThanEqual(pixel,ivec2(128))) ? vec3(0) : palette(gamePixel(pixel));
        color=filteredGame(color,p,q);
        if (c.game.y==2u || c.game.y==3u) color*=.28;
        interfacePixel(color,q);
    }
    outsideStats(color,p);
    outColor=vec4(color*(1.0-c.transition.x),1);
}
