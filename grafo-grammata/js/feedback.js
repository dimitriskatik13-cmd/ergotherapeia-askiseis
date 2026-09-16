// Same two-second visual reward as Χτίζω πρόταση, with the completed ink
// retained on the far right until the next letter or an explicit clear.
export class Feedback {
  constructor(surface, hintEl) {
    this.surface = surface;
    this.hintEl = hintEl;
    this._hintTimer = null;
    this._rewardTimer = null;
    this._layer = null;
    this._preview = null;
  }

  hint(msg) {
    if (!this.hintEl) return;
    this.hintEl.textContent = msg;
    this.hintEl.classList.add('is-visible');
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => this.clearHint(), 2200);
  }
  clearHint() {
    if (this.hintEl) this.hintEl.classList.remove('is-visible');
  }

  showCompleted(letter) {
    this._preview?.remove();
    const source = this.surface.layers.ink;
    const image = source.getContext('2d').getImageData(0, 0, source.width, source.height);
    let left=source.width, top=source.height, right=-1, bottom=-1;
    for (let y=0; y<source.height; y++) for (let x=0; x<source.width; x++) {
      if (!image.data[(y*source.width+x)*4+3]) continue;
      left=Math.min(left,x); right=Math.max(right,x); top=Math.min(top,y); bottom=Math.max(bottom,y);
    }
    const canvas = document.createElement('canvas');
    if (right >= left) {
      const pad=4;
      left=Math.max(0,left-pad); top=Math.max(0,top-pad);
      right=Math.min(source.width-1,right+pad); bottom=Math.min(source.height-1,bottom+pad);
      canvas.width=right-left+1; canvas.height=bottom-top+1;
      canvas.getContext('2d').drawImage(source,left,top,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
    } else {
      // Manual completion in Free mode may have no ink. Display the target.
      canvas.width=280; canvas.height=360;
      const points=letter.strokes.flatMap(st=>st.points);
      const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
      const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      const scale=Math.min(240/Math.max(.01,maxX-minX),320/Math.max(.01,maxY-minY));
      const tx=x=>140+(x-(minX+maxX)/2)*scale,ty=y=>180+(y-(minY+maxY)/2)*scale;
      const ctx=canvas.getContext('2d');ctx.strokeStyle='#3a3f45';ctx.lineWidth=8;ctx.lineCap=ctx.lineJoin='round';
      for(const stroke of letter.strokes){ctx.beginPath();stroke.points.forEach((p,i)=>i?ctx.lineTo(tx(p.x),ty(p.y)):ctx.moveTo(tx(p.x),ty(p.y)));ctx.stroke();}
    }
    const preview = document.createElement('div');
    preview.className='completed-letter';preview.setAttribute('role','img');
    preview.setAttribute('aria-label',`Ολοκληρώθηκε: ${letter.char}`);
    preview.append(canvas);this.surface.el.append(preview);
    this.surface.el.classList.add('has-completion-preview');this._preview=preview;
  }

  celebrate(letter) {
    this.stop();
    this.showCompleted(letter);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layer=document.createElement('div');layer.className='success-celebration'+(reduced?' reduced':'');
    layer.setAttribute('role','status');layer.setAttribute('aria-live','polite');
    layer.innerHTML='<span class="success-burst"></span><div class="success-emblem"><span class="success-ring"></span><span class="success-ring ring-2"></span><span class="success-star star-left"></span><span class="success-star star-right"></span><span class="success-star star-top"></span><span class="success-star star-bottom-left"></span><span class="success-star star-bottom-right"></span><span class="success-check" aria-hidden="true">✓</span><strong>Μπράβο!</strong></div>';
    if(!reduced){const colors=['#8DC63F','#ED1C24','#00AEEF','#F7941D'],count=44;for(let i=0;i<count;i++){
      const wave=i%2,piece=document.createElement('i');piece.className='success-confetti'+(i%3===0?' round':'')+(i%5===0?' big':'');
      const angle=Math.PI*2*i/count+(wave?0.14:0),reach=(wave?150:220)+(i%4)*38;
      piece.style.setProperty('--dx',Math.round(Math.cos(angle)*reach)+'px');piece.style.setProperty('--dy',Math.round(Math.sin(angle)*reach)+'px');piece.style.setProperty('--turn',(i%2?-1:1)*(160+i*23)+'deg');piece.style.setProperty('--delay',(wave*110+(i%3)*30)+'ms');piece.style.background=colors[i%4];layer.append(piece);
    }}
    document.body.append(layer);this._layer=layer;
    this._rewardTimer=setTimeout(()=>{layer.remove();if(this._layer===layer)this._layer=null;this._rewardTimer=null;},2000);
  }

  stop() {
    clearTimeout(this._rewardTimer);this._rewardTimer=null;
    this._layer?.remove();this._layer=null;
    this._preview?.remove();this._preview=null;
    this.surface.el.classList.remove('has-completion-preview');
    this.surface.clear('fx');
  }
}
