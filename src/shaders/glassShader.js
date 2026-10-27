// Refracting glass shader with 6-band chromatic dispersion (two passes: back faces, then front faces)
export const glassVS = 'varying vec3 vNormal;varying vec3 vEye;void main(){vec4 wp=modelMatrix*vec4(position,1.0);vec4 mv=viewMatrix*wp;gl_Position=projectionMatrix*mv;vNormal=normalize(normalMatrix*normal);vEye=normalize(mv.xyz);}';

export const glassFS = `uniform sampler2D uTexture;uniform vec2 uResolution;uniform float uIorR,uIorY,uIorG,uIorC,uIorB,uIorP,uRefractPower,uChromatic,uSaturation,uShininess,uDiffuseness,uFresnelPower,uBackside;uniform vec3 uLight;
varying vec3 vNormal;varying vec3 vEye;
float sp(vec3 n,vec3 v,vec3 l,float sh,float df){vec3 lv=normalize(-l);vec3 h=normalize(lv+v);return pow(max(dot(n,h),0.0),sh)+max(0.0,dot(n,lv))*df;}
vec3 tx(vec2 uv,vec3 e,vec3 n,float ior,float k,float sl){vec3 rf=refract(e,n,1.0/ior);return texture2D(uTexture,uv+rf.xy*(uRefractPower+sl*k)*uChromatic).rgb;}
void main(){
 vec2 uv=gl_FragCoord.xy/uResolution;vec3 n=normalize(vNormal);if(uBackside>0.5)n=-n;vec3 eye=normalize(vEye);vec3 col=vec3(0.0);
 for(int i=0;i<16;i++){float sl=float(i)/16.0*0.045;
  vec3 tR=tx(uv,eye,n,uIorR,1.0,sl),tY=tx(uv,eye,n,uIorY,1.0,sl),tG=tx(uv,eye,n,uIorG,2.0,sl),tC=tx(uv,eye,n,uIorC,2.5,sl),tB=tx(uv,eye,n,uIorB,3.0,sl),tP=tx(uv,eye,n,uIorP,1.0,sl);
  float r_=tR.x*0.5,y_=(tY.x*2.0+tY.y*2.0-tY.z)/6.0,g_=tG.y*0.5,c_=(tC.y*2.0+tC.z*2.0-tC.x)/6.0,b_=tB.z*0.5,p_=(tP.z*2.0+tP.x*2.0-tP.y)/6.0;
  col+=vec3(r_+(2.0*p_+2.0*y_-c_)/3.0,g_+(2.0*y_+2.0*c_-p_)/3.0,b_+(2.0*c_+2.0*p_-y_)/3.0);}
 col/=16.0;float lum=dot(col,vec3(0.2125,0.7154,0.0721));col=mix(vec3(lum),col,uSaturation);
 vec3 v=-eye;float s=sp(n,v,uLight,uShininess,uDiffuseness)+0.6*sp(n,v,vec3(1.0,1.0,-1.0),uShininess*0.6,uDiffuseness*0.5);
 col+=s*(uBackside>0.5?0.35:1.0);
 float f=pow(1.0+dot(eye,n),uFresnelPower);col=mix(col,vec3(1.0),f*(uBackside>0.5?0.25:0.55));
 col+=vec3(0.004,0.005,0.007);gl_FragColor=vec4(col,1.0);
#include <colorspace_fragment>
}`;
