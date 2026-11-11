// Velocities are measured in simulation cells per second. Keep the reference pass
// order and brush units; only the texture sent to WebGL1 needs a different encoding.
export class EditionFluid {
  constructor(width = 128, height = 80) { this.resize(width, height); }
  resize(width, height) {
    if (width === this.width && height === this.height) return;
    this.width = width; this.height = height;
    const size = width * height;
    for (const key of ['vx','vy','nextX','nextY','curl','div','pressure','nextPressure','x','y']) this[key] = new Float32Array(size);
    this.velocityPixels = new Uint8Array(size*4);
    this.pack();
  }
  configure(profile, width, height) {
    this.config = profile;
    const scale = profile.simSize / Math.max(1,width,height);
    this.resize(Math.max(2,Math.round(width*scale)), Math.max(2,Math.round(height*scale)));
  }
  reset() {
    this.vx.fill(0); this.vy.fill(0); this.pressure.fill(0); this.pack();
  }

  // A single capsule deposit covers the entire swept segment, including fast
  // crossings between frames. Radius is expressed in viewport-height units.
  deposit(ax,ay,bx,by,dx,dy,radius) {
    this.active=true;
    const w=this.width,h=this.height,aspect=w/h,reach=radius*2.8;
    const sx=(bx-ax)*aspect, sy=by-ay, length=sx*sx+sy*sy;
    const left=Math.max(0,Math.floor((Math.min(ax,bx)-reach/aspect)*w));
    const right=Math.min(w,Math.ceil((Math.max(ax,bx)+reach/aspect)*w));
    const top=Math.max(0,Math.floor((Math.min(ay,by)-reach)*h));
    const bottom=Math.min(h,Math.ceil((Math.max(ay,by)+reach)*h));
    for(let j=top;j<bottom;j++) for(let i=left;i<right;i++){
      const x=((i+.5)/w-ax)*aspect, y=(j+.5)/h-ay;
      const t=Math.max(0,Math.min(1,(x*sx+y*sy)/Math.max(1e-10,length)));
      const rx=x-t*sx, ry=y-t*sy, weight=Math.exp(-(rx*rx+ry*ry)/(radius*radius));
      const k=j*w+i;
      this.vx[k]+=dx*weight; this.vy[k]+=dy*weight;
    }
  }
  stroke(previous, point, width, height, dt) {
    const dx=(point.x-previous.x)*width, dy=(point.y-previous.y)*height;
    if (!dx && !dy) return;
    const speed=Math.hypot(dx,dy)/Math.max(.001,dt);
    const t=Math.max(0,Math.min(1,(speed-500)/9500));
    const force=this.config.splatForce*(1+t*t*(3-2*t));
    const radius=this.config.splatRadius*.25;
    this.deposit(previous.x,previous.y,point.x,point.y,dx*force,dy*force,Math.max(.002,radius));
  }
  impulse(u,v,dx,dy,radius=.105) {
    // Scroll impulses arrive normalized; pointer strokes use CSS pixels above.
    this.deposit(u,v,u,v,dx*12,dy*12,radius);
  }

  step(dt,scrollSpeed=0) {
    if(!this.active) return;
    // The Retail and Marketing reference scenes evolve a deposited stroke twice
    // per frame. Running the full passes also reproduces its quicker spreading.
    const passes=this.config?.stepsPerFrame ?? 1;
    for(let i=0;i<passes;i++) this.evolve(dt,scrollSpeed);
    this.pack();
  }
  evolve(dt,scrollSpeed) {
    const w=this.width,h=this.height,vx=this.vx,vy=this.vy,c=this.curl;
    const cfg=this.config || {curl:1.5,pressure:.6,velocityDissipation:.965};
    for(let j=0;j<h;j++) for(let i=0;i<w;i++){
      const k=j*w+i,l=i?k-1:k,r=i+1<w?k+1:k,t=j?k-w:k,b=j+1<h?k+w:k;
      c[k]=.5*(vy[r]-vy[l]-vx[b]+vx[t]);
    }
    for(let j=0;j<h;j++) for(let i=0;i<w;i++){
      const k=j*w+i,l=i?k-1:k,r=i+1<w?k+1:k,t=j?k-w:k,b=j+1<h?k+w:k;
      const gx=.5*(Math.abs(c[b])-Math.abs(c[t])), gy=.5*(Math.abs(c[r])-Math.abs(c[l]));
      const force=cfg.curl*c[k]*dt/(Math.sqrt(gx*gx+gy*gy)+.0001);
      vx[k]+=gx*force; vy[k]-=gy*force;
    }
    const pressureDecay=Math.pow(cfg.pressure,dt*60);
    for(let j=0;j<h;j++) for(let i=0;i<w;i++){
      const k=j*w+i;
      this.div[k]=.5*((i+1<w?vx[k+1]:-vx[k])-(i?vx[k-1]:-vx[k])+
        (j+1<h?vy[k+w]:-vy[k])-(j?vy[k-w]:-vy[k]));
      this.pressure[k]*=pressureDecay;
    }
    for(let pass=0;pass<10;pass++){
      const p=this.pressure,n=this.nextPressure;
      for(let j=0;j<h;j++) for(let i=0;i<w;i++){
        const k=j*w+i;
        n[k]=.25*(p[i?k-1:k]+p[i+1<w?k+1:k]+p[j?k-w:k]+p[j+1<h?k+w:k]-this.div[k]);
      }
      this.pressure=n; this.nextPressure=p;
    }
    const p=this.pressure;
    for(let j=0;j<h;j++) for(let i=0;i<w;i++){
      const k=j*w+i;
      vx[k]-=p[i+1<w?k+1:k]-p[i?k-1:k];
      vy[k]-=p[j+1<h?k+w:k]-p[j?k-w:k];
    }
    const clear=Math.min(1,Math.abs(scrollSpeed)/.3);
    const decay=Math.pow(cfg.velocityDissipation+(.9-cfg.velocityDissipation)*clear,dt*60);
    for(let j=0;j<h;j++) for(let i=0;i<w;i++){
      const k=j*w+i, x=Math.max(0,Math.min(w-1.001,i-vx[k]*dt)),y=Math.max(0,Math.min(h-1.001,j-vy[k]*dt));
      const xx=Math.floor(x), yy=Math.floor(y), s=yy*w+xx,a=x-xx,b=y-yy;
      const tl=(1-a)*(1-b),tr=a*(1-b),bl=(1-a)*b,br=a*b;
      this.nextX[k]=decay*(vx[s]*tl+vx[s+1]*tr+vx[s+w]*bl+vx[s+w+1]*br);
      this.nextY[k]=decay*(vy[s]*tl+vy[s+1]*tr+vy[s+w]*bl+vy[s+w+1]*br);
    }
    this.vx=this.nextX;this.nextX=vx;this.vy=this.nextY;this.nextY=vy;
  }
  pack() {
    let peak=0;
    for(let i=0;i<this.x.length;i++){
      const x=this.vx[i],y=this.vy[i],k=i*4;
      // Simple Canvas patches use a bounded vector; the chapter
      // materials consume signed velocities with 1/256-cell precision.
      this.x[i]=Math.max(-1,Math.min(1,x/12)); this.y[i]=Math.max(-1,Math.min(1,y/12));
      peak=Math.max(peak,Math.abs(x),Math.abs(y));
      const px=Math.max(0,Math.min(65535,32768+Math.round(256*x)));
      const py=Math.max(0,Math.min(65535,32768+Math.round(256*y)));
      this.velocityPixels[k]=px>>>8;this.velocityPixels[k+1]=px&255;
      this.velocityPixels[k+2]=py>>>8;this.velocityPixels[k+3]=py&255;
    }
    this.active=peak>=1/512;
  }
}
