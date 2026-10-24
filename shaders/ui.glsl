// UI coordinates are native 128x128 pixels, scaled exactly like the game.
// Letterbox stats are opt-in; menus always remain crisp and unfiltered.
void centered(inout vec3 color,vec2 p,float y,ivec4 rect,int ink) {
    label(color,p,vec2(floor(64.0-float(rect.z)*.5),y),rect,palette(ink));
}
int digitCount(uint value) {
    int n=1;
    for (int i=0;i<5;i++) {if(value<10u)break;value/=10u;n++;}
    return n;
}
void number(inout vec3 color,vec2 p,vec2 origin,uint value,int ink) {
    int count=digitCount(value);
    color=mix(color,palette(ink),digits(p-origin,value,count));
}
void clockText(inout vec3 color,vec2 p,vec2 origin,uint ticks,int ink) {
    uint minutes=min(999u,ticks/1800u);
    int count=max(2,digitCount(minutes));
    float hit=digits(p-origin,minutes,count);
    hit=max(hit,float(glyph(p-origin-vec2(count*4,0),58u)));
    hit=max(hit,digits(p-origin-vec2((count+1)*4,0),(ticks/30u)%60u,2));
    color=mix(color,palette(ink),hit);
}
void panel(inout vec3 color,vec2 p) {
    if(inside(p,vec4(8,8,116,116)))color=palette(0);
    if(inside(p,vec4(5,5,118,118)))color=palette(13);
    if(inside(p,vec4(6,6,116,116)))color=palette(1);
    if(inside(p,vec4(10,9,108,1)) || inside(p,vec4(10,119,108,1)))color=palette(13);
}
void selection(inout vec3 color,vec2 p,float y) {
    if(inside(p,vec4(13,y-2.0,102,9)))color=palette(2);
    vec2 q=p-vec2(17,y);
    if(q.x>=0.0 && q.x<3.0 && abs(q.y-2.0)<=2.0-q.x)color=palette(14);
}
ivec4 menuLabel(uint choice) {
    if(choice==0u)return c.rows[13]==1u?TEXT_RESUME:TEXT_BACK;
    if(choice==1u)return TEXT_RETRY;
    if(choice==2u)return TEXT_CONTROLS;
    if(choice==3u)return TEXT_SETTINGS;
    if(choice==4u)return TEXT_CREDITS;
    if(choice==5u)return TEXT_RESTART;
    return TEXT_EXIT;
}
void compactStats(inout vec3 color,vec2 p) {
    uint altitude=min(30u,c.game.x+1u)*100u;
    number(color,p,vec2(15,24),altitude,7);
    if(glyph(p-vec2(15+digitCount(altitude)*4,24),109u))color=palette(13);
    int icon=0;sprite(icon,ivec2(p),vec2(77,22),26,false);
    if(icon!=0)color=palette(icon);
    number(color,p,vec2(89,24),berryCount(),7);
    label(color,p,vec2(15,34),TEXT_DEATHS,palette(13));
    number(color,p,vec2(43,34),min(999999u,c.game.z),7);
    label(color,p,vec2(74,34),TEXT_TIME,palette(13));
    clockText(color,p,vec2(92,34),c.rows[13]==3u?c.library.y:c.stats.y,7);
}
void mainMenu(inout vec3 color,vec2 p) {
    centered(color,p,13,c.rows[13]==1u?TEXT_PAUSE:TEXT_MENU,7);
    if(c.rows[13]!=0u)compactStats(color,p);
    else {centered(color,p,25,TEXT_TITLE,12);centered(color,p,33,TEXT_NS2,13);}
    if(inside(p,vec4(12,41,104,1)))color=palette(13);
    for(uint i=0u;i<uint(MENU_COUNT);i++) {
        float y=45.0+float(i)*8.0;
        if(i==c.rows[12]) {
            if(i==6u && inside(p,vec4(13,y-1.0,102,15)))color=palette(2);
            selection(color,p,y);
        }
        label(color,p,vec2(26,y),menuLabel(i),palette(menuEnabled(i)?7:13));
        if(i==6u)label(color,p,vec2(26,y+8.0),TEXT_EXIT_DETAIL,palette(7));
    }
    centered(color,p,113,TEXT_SELECT_HINT,13);
}
void controlsPage(inout vec3 color,vec2 p) {
    centered(color,p,15,TEXT_CONTROLS,7);
    centered(color,p,29,TEXT_MOVE,12);centered(color,p,37,TEXT_AIM,7);
    centered(color,p,51,TEXT_JUMP,7);centered(color,p,62,TEXT_DASH,7);
    centered(color,p,73,TEXT_QUICK_RETRY,7);centered(color,p,84,TEXT_MENU_CONTROL,7);
    centered(color,p,98,TEXT_TIP,12);centered(color,p,112,TEXT_BACK_HINT,13);
}
void creditsPage(inout vec3 color,vec2 p) {
    centered(color,p,13,TEXT_TITLE,7);centered(color,p,21,TEXT_NS2,12);
    centered(color,p,35,TEXT_ORIGINAL,13);
    centered(color,p,44,TEXT_AUTHOR1,7);centered(color,p,52,TEXT_AUTHOR2,7);
    centered(color,p,68,TEXT_PORT,7);centered(color,p,78,TEXT_UNOFFICIAL,13);
    centered(color,p,88,TEXT_EXPERIMENTAL,13);centered(color,p,98,TEXT_VERSION,12);
    centered(color,p,112,TEXT_BACK_HINT,13);
}
ivec4 filterLabel() {
    if(c.rows[18]==1u)return TEXT_SCANLINES;
    if(c.rows[18]==2u)return TEXT_LCD;
    if(c.rows[18]==3u)return TEXT_MONO;
    return TEXT_OFF;
}
void settingsPage(inout vec3 color,vec2 p) {
    centered(color,p,13,TEXT_SETTINGS,7);centered(color,p,24,TEXT_SESSION_ONLY,13);
    const float positions[4]=float[4](40.0,58.0,84.0,97.0);
    selection(color,p,positions[min(c.library.w,3u)]);
    label(color,p,vec2(20,40),TEXT_OUTSIDE_STATS,palette(7));
    label(color,p,vec2(94,40),c.rows[17]!=0u?TEXT_ON:TEXT_OFF,palette(12));
    label(color,p,vec2(20,58),TEXT_FILTER,palette(7));
    label(color,p,vec2(77,58),filterLabel(),palette(12));
    centered(color,p,69,TEXT_FILTER_NOTE,13);
    label(color,p,vec2(26,84),TEXT_RESET_DEFAULTS,palette(7));
    label(color,p,vec2(26,97),TEXT_BACK,palette(7));
    centered(color,p,112,TEXT_SETTINGS_HINT,13);
}
void confirmPage(inout vec3 color,vec2 p) {
    centered(color,p,26,TEXT_CONFIRM_RESTART,7);
    centered(color,p,47,TEXT_LOSS,13);
    selection(color,p,c.rows[14]==0u?75.0:90.0);
    label(color,p,vec2(30,75),TEXT_CANCEL,palette(7));
    label(color,p,vec2(30,90),TEXT_YES_RESTART,palette(7));
    centered(color,p,111,TEXT_BACK_HINT,13);
}
void leaveInstructions(inout vec3 color,vec2 p) {
    centered(color,p,19,TEXT_LEAVE_TITLE,7);centered(color,p,28,TEXT_LEAVE_SUBTITLE,7);
    centered(color,p,46,TEXT_LEAVE_HOME,12);centered(color,p,59,TEXT_LEAVE_SELECT,7);
    centered(color,p,72,TEXT_LEAVE_CLOSE,7);centered(color,p,91,TEXT_LOSS,13);
    centered(color,p,112,TEXT_BACK_HINT,13);
}
void results(inout vec3 color,vec2 p) {
    centered(color,p,20,TEXT_WIN,7);
    label(color,p,vec2(17,42),TEXT_ALTITUDE,palette(13));number(color,p,vec2(87,42),3000u,7);
    label(color,p,vec2(17,56),TEXT_BERRIES,palette(13));number(color,p,vec2(87,56),berryCount(),14);
    label(color,p,vec2(17,70),TEXT_DEATHS,palette(13));number(color,p,vec2(87,70),min(999999u,c.game.z),7);
    label(color,p,vec2(17,84),TEXT_TIME,palette(13));clockText(color,p,vec2(87,84),c.library.y,7);
    centered(color,p,109,TEXT_RESULT_HINT,12);
}
void altitudeBadge(inout vec3 color,vec2 p) {
    if(c.game.x==11u || c.game.x==30u) {
        ivec4 rect=c.game.x==11u?TEXT_OLD_SITE:TEXT_SUMMIT;
        float x=floor(64.0-float(rect.z)*.5);
        if(inside(p,vec4(x-3.0,3,float(rect.z)+6.0,10)))color=palette(0);
        label(color,p,vec2(x,5),rect,palette(7));
    } else {
        uint altitude=(c.game.x+1u)*100u;int count=digitCount(altitude);
        float width=float((count+1)*4),x=floor(64.0-width*.5);
        if(inside(p,vec4(x-3.0,3,width+6.0,10)))color=palette(0);
        number(color,p,vec2(x,5),altitude,7);
        if(glyph(p-vec2(x+float(count)*4.0,5),109u))color=palette(7);
    }
}
void interfacePixel(inout vec3 color,vec2 p) {
    if(c.game.y==2u) {
        panel(color,p);uint page=c.rows[11];
        if(page==2u)controlsPage(color,p);
        else if(page==3u)creditsPage(color,p);
        else if(page==4u)confirmPage(color,p);
        else if(page==5u)leaveInstructions(color,p);
        else if(page==7u)settingsPage(color,p);
        else mainMenu(color,p);
    } else if(c.game.y==3u) {panel(color,p);results(color,p);}
    else if(c.game.y==0u) {
        centered(color,p,89,TEXT_NS2,13);
        centered(color,p,105,TEXT_START,7);centered(color,p,116,TEXT_MENU_HINT,13);
    } else if(c.library.x<45u) altitudeBadge(color,p);
}
void outsideStats(inout vec3 color,vec2 screen) {
    if(c.rows[17]==0u || c.game.y==0u || (c.game.y==2u&&c.rows[13]==0u))return;
    vec2 p=floor((screen-vec2(1488,250))/4.0);
    if(!inside(p,vec4(-5,-5,95,172)))return;
    if(inside(p,vec4(-5,-5,95,172)))color=palette(1)*.38;
    label(color,p,vec2(0,0),TEXT_ALTITUDE,palette(13));
    number(color,p,vec2(0,12),min(30u,c.game.x+1u)*100u,7);
    label(color,p,vec2(0,40),TEXT_BERRIES,palette(13));number(color,p,vec2(0,52),berryCount(),14);
    label(color,p,vec2(0,80),TEXT_DEATHS,palette(13));number(color,p,vec2(0,92),min(999999u,c.game.z),7);
    label(color,p,vec2(0,120),TEXT_TIME,palette(13));
    clockText(color,p,vec2(0,132),c.game.y==3u || (c.game.y==2u&&c.rows[13]==3u)?c.library.y:c.stats.y,7);
}
vec3 filteredGame(vec3 color,vec2 screen,vec2 pixel) {
    if(c.rows[18]==1u) {
        float row=mod(screen.y-92.0,7.0);
        color*=row>=5.0?.72:1.0;
        vec2 uv=(pixel-63.5)/64.0;color*=1.0-.10*dot(uv,uv);
    } else if(c.rows[18]==2u) {
        vec2 grid=mod(screen-vec2(512,92),7.0);
        if(grid.x<1.0 || grid.y<1.0)color*=.65;
        uint channel=uint(screen.x)%3u;
        vec3 mask=vec3(.86);mask[channel]=1.0;color*=mask;
    } else if(c.rows[18]==3u) {
        color=vec3(dot(color,vec3(.299,.587,.114)));
    }
    return color;
}
