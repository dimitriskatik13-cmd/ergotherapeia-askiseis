// Same two-second visual reward as Χτίζω πρόταση, with the completed ink
// retained on the far right until the next letter or an explicit clear.
import { drawGuideLetter, GUIDE_WIDTH } from './engine/guide.js';

// Το πιο παχύ σημείο της γραμμής με πίεση Pencil, ως προς το βασικό πάχος (βλ. Pencil._w).
const PRESSURE_REACH = 1.6;

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
    clearTimeout(this._hintTimer);
    this._hintTimer = null;
    if (this.hintEl) {
      this.hintEl.classList.remove('is-visible');
      this.hintEl.textContent = '';
    }
  }

  /**
   * Device-pixel box around the model and the ink, taken from their points.
   * Reading every pixel of a Retina canvas to find it stalled the reward.
   */
  _bounds(letter, strokes) {
    const { map, dpr } = this.surface, ink = this.surface.layers.ink;
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    const grow = (points, reach) => {
      for (const p of points) {
        const x = map.tx(p.x), y = map.ty(p.y);
        left = Math.min(left, x - reach); right = Math.max(right, x + reach);
        top = Math.min(top, y - reach); bottom = Math.max(bottom, y + reach);
      }
    };
    for (const stroke of letter.strokes) grow(stroke.points, map.s(GUIDE_WIDTH) / 2);
    for (const stroke of strokes) {
      grow(stroke.points, map.s(stroke.opts?.baseWidth ?? 0.018) * (stroke.opts?.pressure ? PRESSURE_REACH : 1) / 2);
    }
    const pad = 4;
    left = Math.max(0, Math.floor(left * dpr) - pad); top = Math.max(0, Math.floor(top * dpr) - pad);
    right = Math.min(ink.width, Math.ceil(right * dpr) + pad); bottom = Math.min(ink.height, Math.ceil(bottom * dpr) + pad);
    return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null;
  }

  showCompleted(letter, strokes = []) {
    this._preview?.remove();
    const ink = this.surface.layers.ink;
    const box = this.surface.map ? this._bounds(letter, strokes) : null;
    const canvas = document.createElement('canvas');
    if (box) {
      // Draw the original model and the child's ink in the SAME coordinate
      // system, cropped to their union. Never move/scale either independently.
      canvas.width = box.width; canvas.height = box.height;
      const ctx = canvas.getContext('2d');
      ctx.translate(-box.left, -box.top);
      ctx.save();
      ctx.scale(this.surface.dpr, this.surface.dpr);
      drawGuideLetter(ctx, letter, this.surface.map);
      ctx.restore();
      ctx.drawImage(ink, 0, 0);
    } else {
      // A temporarily hidden/resizing surface can be empty. It is redrawn on show.
      canvas.width = canvas.height = 1;
    }
    const preview = document.createElement('div');
    preview.className='completed-letter';preview.setAttribute('role','img');
    preview.setAttribute('aria-label',`Ολοκληρώθηκε: ${letter.char}`);
    preview.setAttribute('aria-description','Αρχικό πρότυπο με τη γραφή του παιδιού από πάνω');
    preview.append(canvas);this.surface.el.append(preview);
    this.surface.el.classList.add('has-completion-preview');this._preview=preview;
  }

  celebrate(letter, strokes) {
    this.stop();
    this.showCompleted(letter, strokes);
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
  }
}
