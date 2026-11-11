var e=null,t=new Set;function n(n){e=n;for(let n of t)n(e)}function r(){return e}function i(e){return t.add(e),()=>{t.delete(e)}}export{n,i as r,r as t};
