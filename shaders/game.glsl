// State layout and data access shared by compute and fragment shaders.
// game: room index, mode (title/play/pause/win), deaths, entity high-water count.
// flow: player x,y,vx,vy. refresh: movement remainder x,y,animation,dash effect.
// piece: coyote timer,jump buffer,dashes,dash timer.
// bagMeta: RNG,max dashes,player alive,previous render-frame logical buttons.
// stats: berry bitset,30Hz ticks,freeze timer,respawn delay.
// motion.y=facing (-1/+1); library.x=room age; library.y=completion ticks.
// bag[0..3]=dash target/accel float bits, [4]=shake,[5]=key,[6]=new sky,[7]=chest pause.
// rows[0..9]=hair xy floats; [10]=player sprite; [19]=buffered action edges.
// rows[11]=menu page (0 closed,1 main,2 controls,3 credits,4 restart confirm,
// 5 manual leave instructions,7 settings); [12]=selection; [13]=mode to return to;
// [14]=confirmation choice (0 cancel,1 yes); [15]=previous nav direction;
// [16]=nav repeat countdown; [17]=outside stats enabled; [18]=display filter (0..3).
// library.w=settings cursor; motion.w=previous horizontal menu direction.
const uint ENTITY_BASE=4352u;
const int ENTITY_LIMIT=96;
const int MENU_COUNT=7;
bool menuEnabled(uint choice) {
    if (choice==1u) return c.rows[13]==1u;
    if (choice==5u) return c.rows[13]!=0u;
    return true;
}
struct Entity { ivec4 meta; vec4 pos; vec4 work; ivec4 flags; };
uint dataByte(uint offset) {
    return (c.atlas[offset/4u] >> ((offset&3u)*8u))&255u;
}
int roomTile(int room, ivec2 xy) {
    if (any(lessThan(xy,ivec2(0))) || any(greaterThanEqual(xy,ivec2(16)))) return 0;
    return int(dataByte(8256u+uint((room%8)*16+xy.x+((room/8)*16+xy.y)*128)));
}
int tileAt(ivec2 xy) { return roomTile(int(c.game.x),xy); }
bool tileFlag(int tile,int bit) { return (dataByte(16448u+uint(clamp(tile,0,255)))&(1u<<uint(bit)))!=0u; }
Entity entity(int index) {
    uint a=ENTITY_BASE+uint(index)*16u;
    Entity e;
    e.meta=ivec4(c.atlas[a],c.atlas[a+1u],c.atlas[a+2u],c.atlas[a+3u]);
    e.pos=uintBitsToFloat(uvec4(c.atlas[a+4u],c.atlas[a+5u],c.atlas[a+6u],c.atlas[a+7u]));
    e.work=uintBitsToFloat(uvec4(c.atlas[a+8u],c.atlas[a+9u],c.atlas[a+10u],c.atlas[a+11u]));
    e.flags=ivec4(c.atlas[a+12u],c.atlas[a+13u],c.atlas[a+14u],c.atlas[a+15u]);
    return e;
}
vec4 entityRect(Entity e) {
    if (e.meta.x==64) return vec4(e.pos.xy,16,16);
    if (e.meta.x==11 || e.meta.x==12 || e.meta.x==96) return vec4(e.pos.xy,16,8);
    if (e.meta.x==22) return vec4(e.pos.xy-1.0,10,10);
    return vec4(e.pos.xy,8,8);
}
vec4 playerRect(vec2 offset) { return vec4(c.flow.xy+vec2(1,3)+offset,6,5); }
bool overlap(vec4 a,vec4 b) {
    return a.x+a.z>b.x && a.x<b.x+b.z && a.y+a.w>b.y && a.y<b.y+b.w;
}
bool tileSolid(vec4 rect,int bit) {
    ivec2 lo=max(ivec2(0),ivec2(floor(rect.xy/8.0)));
    ivec2 hi=min(ivec2(15),ivec2(floor((rect.xy+rect.zw-1.0)/8.0)));
    for (int y=lo.y;y<=hi.y;y++) for (int x=lo.x;x<=hi.x;x++)
        if (tileFlag(tileAt(ivec2(x,y)),bit)) return true;
    return false;
}
bool solid(vec2 offset) {
    vec4 rect=playerRect(offset);
    if (tileSolid(rect,0)) return true;
    for (int i=0;i<int(c.game.w);i++) {
        Entity e=entity(i); int type=e.meta.x;
        bool block=type==64 || (type==23 && e.meta.z!=2);
        bool platform=(type==11 || type==12) && offset.y>0.0 && !overlap(playerRect(vec2(offset.x,0)),entityRect(e));
        if ((block||platform) && overlap(rect,entityRect(e))) return true;
    }
    return false;
}
bool spikes() {
    vec4 r=playerRect(vec2(0));
    ivec2 lo=max(ivec2(0),ivec2(floor(r.xy/8.0)));
    ivec2 hi=min(ivec2(15),ivec2(floor((r.xy+r.zw-1.0)/8.0)));
    for (int y=lo.y;y<=hi.y;y++) for (int x=lo.x;x<=hi.x;x++) {
        int tile=tileAt(ivec2(x,y));
        if (tile==17 && (mod(r.y+r.w-1.0,8.0)>=6.0 || r.y+r.w==float(y*8+8)) && c.flow.w>=0.0) return true;
        if (tile==27 && mod(r.y,8.0)<=2.0 && c.flow.w<=0.0) return true;
        if (tile==43 && mod(r.x,8.0)<=2.0 && c.flow.z<=0.0) return true;
        if (tile==59 && (mod(r.x+r.z-1.0,8.0)>=6.0 || r.x+r.z==float(x*8+8)) && c.flow.z>=0.0) return true;
    }
    return false;
}
float approach(float value,float target,float amount) {
    return value>target ? max(value-amount,target) : min(value+amount,target);
}
float psin(float turns) { return -sin(turns*6.28318530718); }
uint berryCount() { return uint(bitCount(c.stats.x)); }
