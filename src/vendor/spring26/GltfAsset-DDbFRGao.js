import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./react-Dvkprh6u.js";import{t as n}from"./jsx-runtime-DKdBMi_L.js";import{t as r}from"./useAssetLoadingStore-BjdwlLYn.js";import{n as i}from"./SceneDataContext-BXyXjH22.js";import{$a as a,E as o,Jt as s,O as c,Oa as l,Qa as u,Qi as d,U as f,Vi as p,Vt as m,Yn as h,fr as g,ka as _,kr as v,mr as y,rr as b,s as ee}from"./three.core-DVcoLpfz.js";import{b as x,g as te}from"./events-760a1017.esm-DCPtHAo6.js";import{t as S}from"./dist-4Ign8GoJ.js";import{n as ne,t as C}from"./ktx2-loader-7Y-IX7SR.js";import{t as re}from"./subscribeWithInitial-Ckw6yogw.js";import{t as w}from"./Gltf-yU3CSC93.js";import{i as T,n as E,r as ie,t as ae}from"./useTheatreObject-H4ZAcMv1.js";var D=e(t(),1),O=S();function oe(e){let t=new Map,n=new Map,r=e.clone();return k(e,r,function(e,r){t.set(r,e),n.set(e,r)}),r.traverse(function(e){if(!e.isSkinnedMesh)return;let r=e,i=t.get(e),a=i.skeleton.bones;r.skeleton=i.skeleton.clone(),r.bindMatrix.copy(i.bindMatrix),r.skeleton.bones=a.map(function(e){return n.get(e)}),r.bind(r.skeleton,r.bindMatrix)}),r}function k(e,t,n){n(e,t);for(let r=0;r<e.children.length;r++)k(e.children[r],t.children[r],n)}var se=new a,ce=new a;function le(e,t){se.copy(t).normalize();let n=1/0,r=-1/0;for(let t=0;t<8;t++){ce.set(t&1?e.max.x:e.min.x,t&2?e.max.y:e.min.y,t&4?e.max.z:e.min.z);let i=ce.dot(se);i<n&&(n=i),i>r&&(r=i)}return{range:(r-n)/2,center:(n+r)/2}}var A=new WeakMap;function j(e){if(A.has(e))return;let t={theatreOpacity:{value:1},fadeTransition:{value:0},fadeDirection:{value:new a(1,0,0)},fadeFeather:{value:1},fadeRange:{value:1},fadeCenter:{value:0}};A.set(e,t);let n=e.onBeforeCompile;e.onBeforeCompile=(r,i)=>{n?.call(e,r,i),r.uniforms.theatreOpacity=t.theatreOpacity,r.uniforms.fadeTransition=t.fadeTransition,r.uniforms.fadeDirection=t.fadeDirection,r.uniforms.fadeFeather=t.fadeFeather,r.uniforms.fadeRange=t.fadeRange,r.uniforms.fadeCenter=t.fadeCenter,r.vertexShader=r.vertexShader.replace(`void main() {`,`varying vec3 vFadeWorldPos;
void main() {`),r.vertexShader=r.vertexShader.replace(`#include <worldpos_vertex>`,`#include <worldpos_vertex>
vFadeWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`),r.fragmentShader=r.fragmentShader.replace(`void main() {`,[`uniform float theatreOpacity;`,`uniform float fadeTransition;`,`uniform vec3 fadeDirection;`,`uniform float fadeFeather;`,`uniform float fadeRange;`,`uniform float fadeCenter;`,`varying vec3 vFadeWorldPos;`,`void main() {`].join(`
`)),r.fragmentShader=r.fragmentShader.replace(`#include <dithering_fragment>`,[`#include <dithering_fragment>`,`{`,`  float fadeFactor = 1.0;`,`  float t = abs(fadeTransition);`,`  if (fadeRange > 0.0001 && t > 0.0001) {`,`    vec3 dir = normalize(fadeDirection);`,`    float d = dot(vFadeWorldPos, dir);`,`    float halfFeather = fadeFeather * 0.5;`,`    float s = sign(fadeTransition);`,`    float planePos = fadeCenter + s * (fadeRange + fadeFeather) * (1.0 - 2.0 * t);`,`    float rawSmooth = smoothstep(planePos - halfFeather, planePos + halfFeather, d);`,`    float invertFlag = step(0.0, fadeTransition);`,`    fadeFactor = abs(invertFlag - rawSmooth);`,`  }`,`  gl_FragColor.a *= theatreOpacity * fadeFactor;`,`  if (gl_FragColor.a < 0.001) discard;`,`}`].join(`
`))}}function M(e,t,n,r,i){let a=A.get(e);a&&(a.theatreOpacity.value=t,a.fadeTransition.value=n.transition,a.fadeDirection.value.copy(n.direction),a.fadeFeather.value=n.feather,a.fadeRange.value=r,a.fadeCenter.value=i)}var ue=`varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vUv = uv * 2.0 - 1.0;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,de=`varying vec2 vUv;
varying vec3 vWorldPos;

uniform vec2 uBoxSize;
uniform float uCornerRadius;
uniform float uBaseOpacity;
uniform float uFadeDistance;
uniform vec3 uShadowColor;
uniform bool uDebug;

uniform float uTheatreOpacity;
uniform float fadeTransition;
uniform vec3 fadeDirection;
uniform float fadeFeather;
uniform float fadeRange;
uniform float fadeCenter;

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float d = sdRoundedBox(vUv, uBoxSize, uCornerRadius);
  float sdfAlpha = 1.0 - smoothstep(0.0, uFadeDistance, d);

  float fadeFactor = 1.0;
  float t = abs(fadeTransition);
  if (fadeRange > 0.0001 && t > 0.0001) {
    vec3 dir = normalize(fadeDirection);
    float dp = dot(vWorldPos, dir);
    float halfFeather = fadeFeather * 0.5;
    float s = sign(fadeTransition);
    float planePos = fadeCenter + s * (fadeRange + fadeFeather) * (1.0 - 2.0 * t);
    float rawSmooth = smoothstep(planePos - halfFeather, planePos + halfFeather, dp);
    float invertFlag = step(0.0, fadeTransition);
    fadeFactor = abs(invertFlag - rawSmooth);
  }

  float alpha = sdfAlpha * uBaseOpacity * uTheatreOpacity * fadeFactor;

  if (!uDebug && alpha < 0.001) discard;

  if (uDebug) {
    gl_FragColor = vec4(0.0, 1.0, 0.0, max(alpha, 0.3));
  } else {
    gl_FragColor = vec4(uShadowColor, alpha);
  }
}
`,fe={enabled:O.types.boolean(!1),opacity:O.types.number(.5,{nudgeMultiplier:.01,range:[0,1]}),fadeDistance:O.types.number(.3,{nudgeMultiplier:.01,range:[.001,2]}),color:O.types.rgba({r:0,g:0,b:0,a:1}),padding:O.types.number(.1,{nudgeMultiplier:.01,range:[0,1]}),offsetY:O.types.number(.001,{nudgeMultiplier:.001,range:[0,.5]}),cornerRadius:O.types.number(.15,{nudgeMultiplier:.01,range:[0,1]}),debug:O.types.boolean(!1)};function N(){let e=new v(1,1),t=new d({vertexShader:ue,fragmentShader:de,uniforms:{uBoxSize:{value:new u(.7,.7)},uCornerRadius:{value:.15},uBaseOpacity:{value:.5},uFadeDistance:{value:.3},uShadowColor:{value:new f(0)},uDebug:{value:!1},uTheatreOpacity:{value:1},fadeTransition:{value:0},fadeDirection:{value:new a(1,0,0)},fadeFeather:{value:1},fadeRange:{value:1},fadeCenter:{value:0}},transparent:!0,depthWrite:!1}),n=new b(e,t);return n.rotation.x=-Math.PI/2,{mesh:n,material:t,geometry:e,lastPlaneW:1,lastPlaneH:1}}function P(e,t,n,r){let i=t+2*r.padding,a=n+2*r.padding;if(i!==e.lastPlaneW||a!==e.lastPlaneH){e.geometry.dispose();let t=new v(i,a);e.geometry=t,e.mesh.geometry=t,e.lastPlaneW=i,e.lastPlaneH=a}let o=t/i,s=n/a,c=e.material.uniforms;c.uBoxSize.value.set(o,s),c.uCornerRadius.value=r.cornerRadius,c.uBaseOpacity.value=r.opacity,c.uFadeDistance.value=r.fadeDistance,c.uShadowColor.value.setRGB(r.color.r,r.color.g,r.color.b),c.uDebug.value=r.debug}function F(e,t,n,r,i){let a=e.material.uniforms;a.uTheatreOpacity.value=t,a.fadeTransition.value=n.transition,a.fadeDirection.value.copy(n.direction),a.fadeFeather.value=n.feather,a.fadeRange.value=r,a.fadeCenter.value=i}function I(e){e.geometry.dispose(),e.material.dispose()}var pe=`/media/glass_normal_map.jpg`,me=new _,L=null;function he(){return L||(L=me.load(pe),L.wrapS=p,L.wrapT=p,L)}function ge(e={}){return{extrude:{enabled:O.types.boolean(e.enabled??!1),depth:O.types.number(e.depth??.02,{nudgeMultiplier:.01,range:[.001,.5]}),borderRadius:O.types.number(e.borderRadius??.01,{nudgeMultiplier:.01,range:[0,.5]}),segments:O.types.number(e.segments??4,{nudgeMultiplier:1,range:[1,16]}),padding:O.types.number(e.padding??.01,{nudgeMultiplier:.01,range:[0,.2]}),scale:{x:O.types.number(e.scale?.x??1,{nudgeMultiplier:.01,range:[.1,10]}),y:O.types.number(e.scale?.y??1,{nudgeMultiplier:.01,range:[.1,10]}),z:O.types.number(e.scale?.z??1,{nudgeMultiplier:.01,range:[.1,10]})},centerWithinGlass:O.types.boolean(e.centerWithinGlass??!1),ior:O.types.number(e.ior??1.5,{nudgeMultiplier:.1,range:[1,20]}),roughness:O.types.number(e.roughness??.5,{nudgeMultiplier:.01,range:[0,1]}),normalScale:O.types.number(e.normalScale??5,{nudgeMultiplier:.5,range:[0,20]}),normalRepeat:O.types.number(e.normalRepeat??5,{nudgeMultiplier:.5,range:[.1,20]}),fresnel:O.types.number(e.fresnel??.5,{nudgeMultiplier:.01,range:[0,1]}),color:O.types.rgba({r:1,g:1,b:1,a:0}),shadow:fe}}}var R=ge(),z=new WeakMap,B=null,V=0,H=0,U=new u;function _e(e){let t=e.getSize(U).multiplyScalar(e.getPixelRatio()),n=Math.round(t.x),r=Math.round(t.y);return B&&V===n&&H===r?B:(B?.dispose(),B=new m(n,r),B.type=s,B.wrapS=y,B.wrapT=y,V=n,H=r,e.initTexture(B),B)}function ve(){B?.dispose(),B=null,V=0,H=0}function ye(e){if(z.has(e))return;let t={tBackground:{value:null},uResolution:{value:new u(1,1)},uIOR:{value:1.5},uThickness:{value:.5},uFresnel:{value:.5},uBoxBlur:{value:25},uNormalRepeat:{value:5},uTintColor:{value:new f(1,1,1)},uTintAlpha:{value:0},uTheatreOpacity:{value:1},fadeTransition:{value:0},fadeDirection:{value:new a(1,0,0)},fadeFeather:{value:1},fadeRange:{value:1},fadeCenter:{value:0}};z.set(e,t);let n=e.onBeforeCompile;e.onBeforeCompile=(r,i)=>{n?.call(e,r,i),r.uniforms.tBackground=t.tBackground,r.uniforms.uResolution=t.uResolution,r.uniforms.uIOR=t.uIOR,r.uniforms.uThickness=t.uThickness,r.uniforms.uFresnel=t.uFresnel,r.uniforms.uBoxBlur=t.uBoxBlur,r.uniforms.uNormalRepeat=t.uNormalRepeat,r.uniforms.uTintColor=t.uTintColor,r.uniforms.uTintAlpha=t.uTintAlpha,r.uniforms.uTheatreOpacity=t.uTheatreOpacity,r.uniforms.fadeTransition=t.fadeTransition,r.uniforms.fadeDirection=t.fadeDirection,r.uniforms.fadeFeather=t.fadeFeather,r.uniforms.fadeRange=t.fadeRange,r.uniforms.fadeCenter=t.fadeCenter,r.vertexShader=r.vertexShader.replace(`void main() {`,`uniform float uNormalRepeat;
varying vec3 vGlassViewNormal;
varying vec3 vGlassWorldPos;
varying vec3 vGlassModelScale;
void main() {`),r.vertexShader=r.vertexShader.replace(`#include <uv_vertex>`,`#include <uv_vertex>
#ifdef USE_NORMALMAP
  vNormalMapUv *= uNormalRepeat;
#endif`),r.vertexShader=r.vertexShader.replace(`#include <fog_vertex>`,`#include <fog_vertex>
vGlassViewNormal = normalize(normalMatrix * normal);
vGlassWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
vGlassModelScale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));`),r.fragmentShader=r.fragmentShader.replace(`void main() {`,`uniform sampler2D tBackground;
uniform vec2 uResolution;
uniform float uIOR;
uniform float uThickness;
uniform float uFresnel;
uniform float uBoxBlur;
uniform vec3 uTintColor;
uniform float uTintAlpha;
uniform mat4 projectionMatrix;
uniform float uTheatreOpacity;
uniform float fadeTransition;
uniform vec3 fadeDirection;
uniform float fadeFeather;
uniform float fadeRange;
uniform float fadeCenter;
varying vec3 vGlassViewNormal;
varying vec3 vGlassWorldPos;
varying vec3 vGlassModelScale;
void main() {`),r.fragmentShader=r.fragmentShader.replace(`#include <dithering_fragment>`,`#include <dithering_fragment>
{
  vec3 viewNormal = normalize(vGlassViewNormal);
  vec3 viewDir = normalize(-vViewPosition);
  vec3 worldNormal = normalize(inverseTransformDirection(vGlassViewNormal, viewMatrix));
  vec3 worldPos = vGlassWorldPos;
  vec3 worldViewDir = normalize(cameraPosition - worldPos);

  vec3 refractionRay = refract(-worldViewDir, worldNormal, 1.0 / uIOR);
  vec3 transmissionRay = normalize(refractionRay) * uThickness * vGlassModelScale;
  vec3 refractedExit = worldPos + transmissionRay;

  vec4 ndcPos = projectionMatrix * viewMatrix * vec4(refractedExit, 1.0);
  vec2 refractionCoords = ndcPos.xy / ndcPos.w * 0.5 + 0.5;

  #ifdef USE_NORMALMAP
    vec3 normalTex = texture2D(normalMap, vNormalMapUv).rgb * 2.0 - 1.0;
    refractionCoords += normalTex.xy * normalScale * 0.01;
  #endif

  float blur = uBoxBlur / uResolution.x;
  vec3 bgAccum = texture2D(tBackground, refractionCoords).rgb * 0.4;
  bgAccum += texture2D(tBackground, refractionCoords + vec2(blur, 0.0)).rgb * 0.15;
  bgAccum += texture2D(tBackground, refractionCoords - vec2(blur, 0.0)).rgb * 0.15;
  bgAccum += texture2D(tBackground, refractionCoords + vec2(0.0, blur)).rgb * 0.15;
  bgAccum += texture2D(tBackground, refractionCoords - vec2(0.0, blur)).rgb * 0.15;

  bgAccum *= uTintColor;
  float fresnel = pow(1.0 - abs(dot(viewNormal, viewDir)), 3.0);
  vec4 glassColor = mix(vec4(bgAccum, 1.0), gl_FragColor, opacity);
  vec4 glassEffect = mix(glassColor, vec4(1.0), fresnel * uFresnel);
  gl_FragColor = mix(glassEffect, vec4(uTintColor, 1.0), uTintAlpha);

  float fadeFactor = 1.0;
  float t = abs(fadeTransition);
  if (fadeRange > 0.0001 && t > 0.0001) {
    vec3 dir = normalize(fadeDirection);
    float d = dot(vGlassWorldPos, dir);
    float halfFeather = fadeFeather * 0.5;
    float s = sign(fadeTransition);
    float planePos = fadeCenter + s * (fadeRange + fadeFeather) * (1.0 - 2.0 * t);
    float rawSmooth = smoothstep(planePos - halfFeather, planePos + halfFeather, d);
    float invertFlag = step(0.0, fadeTransition);
    fadeFactor = abs(invertFlag - rawSmooth);
  }
  gl_FragColor.a = uTheatreOpacity * fadeFactor;
  if (gl_FragColor.a < 0.001) discard;
}`)}}function W(e){return t=>{let n=z.get(e);if(!n)return;let r=_e(t);n.tBackground.value=r;let i=t.getSize(U).multiplyScalar(t.getPixelRatio()),a=Math.round(i.x),o=Math.round(i.y);n.uResolution.value.set(a,o);let s=t.getContext(),c=t.properties.get(r).__webglTexture;if(c){let e=t.state;e.bindTexture(s.TEXTURE_2D,c),s.copyTexSubImage2D(s.TEXTURE_2D,0,0,0,0,0,a,o),e.unbindTexture()}}}function G(){let e=new g({color:16777215,transparent:!0,opacity:.1,roughness:.05,metalness:0});return ye(e),e.customProgramCacheKey=()=>`frosted-glass`,e.normalMap=he(),e}function K(e,t){let n=z.get(e);n&&(n.uThickness.value=t.depth,n.uIOR.value=t.ior,n.uBoxBlur.value=t.roughness*50,n.uFresnel.value=t.fresnel,n.uNormalRepeat.value=t.normalRepeat,t.color&&(n.uTintColor.value.setRGB(t.color.r,t.color.g,t.color.b),n.uTintAlpha.value=t.color.a??0)),e.normalScale.set(t.normalScale,t.normalScale),e.roughness=t.roughness}function q(e,t,n,r,i){let a=z.get(e);a&&(a.uTheatreOpacity.value=t,a.fadeTransition.value=n.transition,a.fadeDirection.value.copy(n.direction),a.fadeFeather.value=n.feather,a.fadeRange.value=r,a.fadeCenter.value=i)}var J=new a;function Y(e,t,n,r,i,a){let o=2*Math.PI*i/4,s=Math.max(a-2*i,0),c=Math.PI/4;J.copy(t),J[r]=0,J.normalize();let l=.5*o/(o+s),u=1-J.angleTo(e)/c;return Math.sign(J[n])===1?u*l:s/(o+s)+l+l*(1-u)}var X=class e extends c{constructor(e=1,t=1,n=1,r=2,i=.1){let o=r*2+1;if(i=Math.min(e/2,t/2,n/2,i),super(1,1,1,o,o,o),this.type=`RoundedBoxGeometry`,this.parameters={width:e,height:t,depth:n,segments:r,radius:i},o===1)return;let s=this.toNonIndexed();this.index=null,this.attributes.position=s.attributes.position,this.attributes.normal=s.attributes.normal,this.attributes.uv=s.attributes.uv;let c=new a,l=new a,u=new a(e,t,n).divideScalar(2).subScalar(i),d=this.attributes.position.array,f=this.attributes.normal.array,p=this.attributes.uv.array,m=d.length/6,h=new a,g=.5/o;for(let r=0,a=0;r<d.length;r+=3,a+=2)switch(c.fromArray(d,r),l.copy(c),l.x-=Math.sign(l.x)*g,l.y-=Math.sign(l.y)*g,l.z-=Math.sign(l.z)*g,l.normalize(),d[r+0]=u.x*Math.sign(c.x)+l.x*i,d[r+1]=u.y*Math.sign(c.y)+l.y*i,d[r+2]=u.z*Math.sign(c.z)+l.z*i,f[r+0]=l.x,f[r+1]=l.y,f[r+2]=l.z,Math.floor(r/m)){case 0:h.set(1,0,0),p[a+0]=Y(h,l,`z`,`y`,i,n),p[a+1]=1-Y(h,l,`y`,`z`,i,t);break;case 1:h.set(-1,0,0),p[a+0]=1-Y(h,l,`z`,`y`,i,n),p[a+1]=1-Y(h,l,`y`,`z`,i,t);break;case 2:h.set(0,1,0),p[a+0]=1-Y(h,l,`x`,`z`,i,e),p[a+1]=Y(h,l,`z`,`x`,i,n);break;case 3:h.set(0,-1,0),p[a+0]=1-Y(h,l,`x`,`z`,i,e),p[a+1]=1-Y(h,l,`z`,`x`,i,n);break;case 4:h.set(0,0,1),p[a+0]=1-Y(h,l,`x`,`y`,i,e),p[a+1]=1-Y(h,l,`y`,`x`,i,t);break;case 5:h.set(0,0,-1),p[a+0]=Y(h,l,`x`,`y`,i,e),p[a+1]=1-Y(h,l,`y`,`x`,i,t);break}}static fromJSON(t){return new e(t.width,t.height,t.depth,t.segments,t.radius)}},be=1e-4,xe=.001;function Se(e){let t=e.geometry;t.boundingBox||t.computeBoundingBox();let n=t.boundingBox,r=n.max.z-n.min.z;return Math.max(n.max.x-n.min.x,n.max.y-n.min.y)>be&&r<=be}function Ce(e){let t=e.geometry;t.boundingBox||t.computeBoundingBox();let n=t.boundingBox;return{originalGeometry:t,restoreMaterial:e.material,originalRenderOrder:e.renderOrder,originalOnBeforeRender:e.onBeforeRender,currentGeometry:null,currentMaterial:null,frontPlane:null,shadow:null,lastDepth:-1,lastBorderRadius:-1,lastSegments:-1,lastPadding:-1,lastScaleX:-1,lastScaleY:-1,lastScaleZ:-1,lastCenterWithinGlass:null,originalDepthTest:!0,width:n.max.x-n.min.x,height:n.max.y-n.min.y,centerX:(n.min.x+n.max.x)/2,centerY:(n.min.y+n.max.y)/2,centerZ:(n.min.z+n.max.z)/2}}function we(e,t,n,r,i,a){e.currentMaterial&&(e.currentMaterial.depthWrite=!a,q(e.currentMaterial,t,n,r,i),e.shadow&&F(e.shadow,t,n,r,i))}function Te(e,t){if(!t.frontPlane)return;e.remove(t.frontPlane);let n=Array.isArray(t.restoreMaterial)?t.restoreMaterial[0]:t.restoreMaterial;n.depthTest=t.originalDepthTest,t.frontPlane=null}function Ee(e,t){t.shadow&&=(e.remove(t.shadow.mesh),I(t.shadow),null)}function De(e,t){t.currentGeometry?.dispose(),t.currentGeometry=null,t.currentMaterial?.dispose(),t.currentMaterial=null,Ee(e,t),e.renderOrder=t.originalRenderOrder,e.onBeforeRender=t.originalOnBeforeRender,t.lastDepth=-1,t.lastBorderRadius=-1,t.lastSegments=-1,t.lastPadding=-1,t.lastScaleX=-1,t.lastScaleY=-1,t.lastScaleZ=-1,t.lastCenterWithinGlass=null}function Oe(e,t,n){if(!t.enabled){e.geometry!==n.originalGeometry&&(e.geometry=n.originalGeometry,e.material=n.restoreMaterial,Te(e,n),De(e,n));return}let r=Math.max(1,Math.round(t.segments)),i=t.scale?.x??1,a=t.scale?.y??1,o=t.scale?.z??1,s=t.centerWithinGlass??!1,c=(n.width+2*t.padding)*i,l=(n.height+2*t.padding)*a,u=t.depth*o,d=s?n.centerZ:n.centerZ-u/2,f=t.depth!==n.lastDepth,p=t.borderRadius!==n.lastBorderRadius,m=r!==n.lastSegments,h=t.padding!==n.lastPadding,g=i!==n.lastScaleX||a!==n.lastScaleY||o!==n.lastScaleZ,_=s!==n.lastCenterWithinGlass;if(f||p||m||h||g||_){n.currentGeometry?.dispose();let s=new X(c,l,u,r,t.borderRadius);s.translate(n.centerX,n.centerY,d),n.currentGeometry=s,e.geometry=s,n.lastDepth=t.depth,n.lastBorderRadius=t.borderRadius,n.lastSegments=r,n.lastPadding=t.padding,n.lastScaleX=i,n.lastScaleY=a,n.lastScaleZ=o}if(!n.frontPlane){let t=Array.isArray(n.restoreMaterial)?n.restoreMaterial[0]:n.restoreMaterial;n.originalDepthTest=t.depthTest,n.frontPlane=new b(n.originalGeometry,t),e.add(n.frontPlane)}if(_){let e=Array.isArray(n.restoreMaterial)?n.restoreMaterial[0]:n.restoreMaterial;e.depthTest=!s&&n.originalDepthTest,n.frontPlane.position.set(0,0,s?0:xe),n.lastCenterWithinGlass=s}n.currentMaterial||(n.currentMaterial=G(),e.onBeforeRender=W(n.currentMaterial),e.material=n.currentMaterial),K(n.currentMaterial,t),t.shadow.enabled?(n.shadow||(n.shadow=N(),e.add(n.shadow.mesh)),P(n.shadow,c,u,t.shadow),n.shadow.mesh.position.set(n.centerX,n.centerY-l/2-t.shadow.offsetY,d)):Ee(e,n),e.updateWorldMatrix(!0,!1);let v=e.userData.theatreRenderOrder??0,y=v===0?e.matrixWorld.elements[14]:v;e.renderOrder=y,n.frontPlane&&(n.frontPlane.renderOrder=y+.1),n.shadow&&(n.shadow.mesh.renderOrder=y-.1)}function ke(e,t){e.geometry=t.originalGeometry,e.material=t.restoreMaterial,Te(e,t),De(e,t)}var Ae=new o,je=new a;function Me(e){let t=e.material;return Array.isArray(t)?t:[t]}function Z(e,t,n){let r=[],i=e;for(;i&&i!==n;)i.name&&r.unshift(i.name.replace(/^\$/,``)),i=i.parent;return`${t} / ${r.join(` / `)}`}function Q(e){return e.name.startsWith(`$`)}function Ne(e,t){let n=e.parent;for(;n;){if(n===t)return!0;n=n.parent}return!1}function Pe(e,t,n,r,i){(0,D.useEffect)(()=>{if(!e||!t)return;let a=[],o=new Map,s=new Map,c=new Map,l=new Map,u=new Map,d=new Map;for(let e of i){if(!Q(e))continue;let t=[];for(let n of r)Ne(n,e)&&(t.push(n),h(n));d.set(e,t)}for(let e of r)s.set(e,1);function f(e,t){if(!t)return e;if(!e)return t;let n=Math.abs(t.transition);if(n<1e-4)return e;if(n>.9999)return t;let r=1-n;return{transition:e.transition*r+t.transition*n,direction:je.lerpVectors(e.direction,t.direction,n),feather:e.feather*r+t.feather*n,mode:t.mode}}function p(e){let t=s.get(e)??1,n=c.get(e),r=e.parent;for(;r;){let e=o.get(r);e===void 0?typeof r.userData.theatreOpacity==`number`&&(t*=r.userData.theatreOpacity,typeof r.userData.theatreTransition==`number`&&(n=f(n,{transition:r.userData.theatreTransition,direction:r.userData.theatreFadeDirection??E.direction,feather:r.userData.theatreFadeFeather??E.feather,mode:r.userData.theatreFadeMode??E.mode}))):(t*=e,n=f(n,c.get(r))),r=r.parent}return{opacity:t,fade:n??E}}function m(){for(let e of r)g(e)}function h(e){if(u.has(e))return;u.set(e,e.material);let t=e.material;if(Array.isArray(t))e.material=t.map(e=>{let t=e.clone();return j(t),t});else{let n=t.clone();j(n),e.material=n}}function g(e){let{opacity:t,fade:n}=p(e),r=Math.abs(n.transition)>.001;if(t>=1&&!r&&!u.has(e)||((t<1||r)&&h(e),!u.has(e)))return;let i=e.geometry;i.boundingBox||i.computeBoundingBox(),e.updateWorldMatrix(!0,!1),Ae.copy(i.boundingBox).applyMatrix4(e.matrixWorld);let{range:a,center:o}=le(Ae,n.direction),s=t<.999||r,c=u.get(e),d=l.get(e),f=d&&e.geometry!==d.originalGeometry;if(!f){let r=Me(e);for(let e=0;e<r.length;e++){let i=r[e],l=Array.isArray(c)?c[e]:c,u=(l?.transparent??!1)||s,d=l?.depthWrite??!0;i.depthWrite=!s&&d,i.transparent!==u&&(i.transparent=u,i.needsUpdate=!0),M(i,t,n,a,o)}}let m=e.userData.theatreRenderOrder??0;if(m===0){let t=e.parent;for(;t;){let e=t.userData.theatreRenderOrder;if(typeof e==`number`&&e!==0){m=e;break}t=t.parent}}if(m===0?r||f?e.renderOrder=e.matrixWorld.elements[14]:e.renderOrder=0:e.renderOrder=m,e.frustumCulled=!r,d?.frontPlane&&(d.frontPlane.renderOrder=e.renderOrder+.1),d?.shadow&&(d.shadow.mesh.renderOrder=e.renderOrder-.1),d&&(we(d,t,n,a,o,s),d.frontPlane)){let e=Me(d.frontPlane),r=(Array.isArray(c)?c[0]:c)?.depthWrite??!0;for(let i of e)i.depthWrite=!s&&r,i.transparent||(i.transparent=!0,i.needsUpdate=!0),M(i,t,n,a,o)}}function _(e){let t=d.get(e);if(t)for(let e of t)g(e)}for(let r of i)Q(r)&&(o.set(r,1),a.push(T(e,Z(r,t,n),r,(e,t)=>{o.set(r,e),c.set(r,t),_(r)})));for(let i of r){if(!Q(i))continue;h(i);let r=Se(i),o=null;r&&(o=Ce(i),l.set(i,o));let u=(e,t)=>{s.set(i,e),c.set(i,t),g(i)},d=o?e=>{Oe(i,e.extrude,o),g(i)}:void 0,f=T(e,Z(i,t,n),i,u,r?R:void 0,d);if(o){let e=o;a.push(()=>{f(),ke(i,e)})}else a.push(f)}let v=[],y=new Set;for(let e of r){let t=e.parent;for(;t&&!y.has(t);)y.add(t),o.has(t)||v.push(ie(t,m)),t=t.parent}let b=requestAnimationFrame(m);return()=>{cancelAnimationFrame(b);for(let e of v)e();for(let e of a)e();for(let[e,t]of u){let n=e.material;e.material=t,e.renderOrder=0,e.frustumCulled=!0;let r=Array.isArray(n)?n:[n];for(let e of r)e.dispose()}ve()}},[e,t,n,r,i])}var Fe=n(),Ie=`skipDispose`,$=new Map;function Le(e){e.traverse(e=>{if(!(e instanceof b))return;e.geometry?.dispose();let t=Array.isArray(e.material)?e.material:e.material?[e.material]:[];for(let e of t){for(let t of Object.values(e))t instanceof l&&t.dispose();e.dispose()}})}function Re(e){$.set(e,($.get(e)??0)+1)}function ze(e,t){let n=$.get(e)??0;if(n>1){$.set(e,n-1);return}$.set(e,0),queueMicrotask(()=>{($.get(e)??0)>0||($.delete(e),Le(t),w.clear(e))})}function Be(){C(x(e=>e.gl))}function Ve(e){return e.replace(/[^a-zA-Z0-9_]/g,`_`).replace(/^[^a-zA-Z]/,`anim_$&`)}function He(e){let t=new Map;return e.map(e=>{let n=Ve(e.name),r=t.get(n)??0;return t.set(n,r+1),r>0&&(n=`${n}_${r}`),{key:n,clip:e}})}function Ue(e){if(e.length)return{animations:Object.fromEntries(e.map(({key:e})=>[e,{progress:O.types.number(0,{range:[0,1],nudgeMultiplier:.01}),ambientWeight:O.types.number(0,{range:[0,1],nudgeMultiplier:.01})}]))}}function We(e,t,n){let r=!1;for(let{key:i,clip:a}of t){let t=n[i];if(!t)continue;let o=e.clipAction(a);if(t.progress>0){o.timeScale=0,o.time=t.progress*a.duration,o.setEffectiveWeight(1),r=!0;continue}t.ambientWeight>0?(o.setLoop(h,1/0),o.setEffectiveWeight(t.ambientWeight),o.timeScale===0&&(o.timeScale=1)):(o.timeScale=0,o.setEffectiveWeight(0))}r&&e.update(0)}function Ge({url:e,position:t,rotation:n,scale:a,sheet:o,theatreId:s,theatreExtraConfig:c,onTheatreObject:l,children:u}){Be();let d=w(e,void 0,void 0,e=>{e.setKTX2Loader(ne)}),{handle:f}=i(),p=s??e,m=(0,D.useRef)(d.scene);m.current=d.scene,(0,D.useEffect)(()=>{r.getState().markAssetLoaded(f,p)},[f,p]),(0,D.useEffect)(()=>{Re(e);let t=m.current;return()=>{ze(e,t)}},[e]);let h=(0,D.useRef)(null),g=(0,D.useRef)(null),_=(0,D.useMemo)(()=>He(d.animations),[d.animations]),v=(0,D.useMemo)(()=>Ue(_),[_]),y=(0,D.useMemo)(()=>v||c?{...v,...c}:void 0,[v,c]),x=ae(o??null,h,s,y);(0,D.useEffect)(()=>{if(l)return l(x),()=>l(null)},[l,x]),(0,D.useEffect)(()=>{if(!(!x||!_.length))return re(x,e=>{let t=e;t.animations&&g.current&&We(g.current,_,t.animations)})},[x,_]);let{cloned:S,meshNodes:C,groupNodes:T}=(0,D.useMemo)(()=>{let e=d.animations.length>0?oe(d.scene):d.scene.clone(),t=[],n=[];return e.traverse(r=>{r.userData[Ie]=!0,r instanceof b?t.push(r):r.name&&r!==e&&n.push(r)}),{cloned:e,meshNodes:t,groupNodes:n}},[d.scene,d.animations]);return Pe(o??null,s,S,C,T),(0,D.useEffect)(()=>{if(!d.animations.length)return;let e=new ee(S);g.current=e;for(let t of d.animations){let n=e.clipAction(t);n.timeScale=0,n.play()}return()=>{e.stopAllAction(),e.uncacheRoot(S),g.current=null}},[d.animations,S]),te((e,t)=>{g.current&&t>0&&g.current.update(t)}),(0,Fe.jsxs)(`group`,{ref:h,children:[(0,Fe.jsx)(`primitive`,{object:S,position:t,rotation:n,scale:a}),u?.({meshes:C,groupRef:h})]})}export{G as a,K as c,N as d,F as f,le as h,R as i,P as l,M as m,Ie as n,W as o,j as p,X as r,q as s,Ge as t,I as u};
