// ─────────────────────────────────────────────────────────────────────────────
// Pencil — ομαλή γραμμή «στυλό» με εξομάλυνση quadratic Bézier μέσω midpoints.
// Υποστηρίζει μεταβλητό πάχος με βάση την πίεση (pressure) του Apple Pencil.
//
// Σχεδιάζει ΑΥΞΗΤΙΚΑ (μόνο το νέο τμήμα) ώστε να μη «σπάει» η ροή ή να γίνεται
// lag — δεν επανασχεδιάζει όλη τη διαδρομή σε κάθε κίνηση.
// ─────────────────────────────────────────────────────────────────────────────

export class Pencil {
  /**
   * @param ctx canvas 2D context (ink layer)
   * @param map fieldMap (normalized→pixels)
   * @param opts { color, baseWidth(normalized), pressure(bool) }
   */
  constructor(ctx, map, opts = {}) {
    this.ctx = ctx;
    this.map = map;
    this.color = opts.color || '#3a3f45';
    this.baseWidth = opts.baseWidth ?? 0.018; // normalized
    this.pressure = !!opts.pressure;
    this.pts = [];          // normalized {x,y,p}
    this.lastMid = null;    // pixel midpoint
    this.drawing = false;
  }

  _px(p) { return { x: this.map.tx(p.x), y: this.map.ty(p.y) }; }
  _w(p) {
    const base = this.map.s(this.baseWidth);
    if (!this.pressure) return base;
    const f = 0.35 + 1.25 * Math.max(0, Math.min(1, p.p ?? 0.5));
    return base * f;
  }

  begin(p) {
    this.drawing = true;
    this.pts = [p];
    const a = this._px(p);
    this.lastMid = a;
    // κουκκίδα έναρξης ώστε ένα απλό «ταπ» να αφήνει σημάδι
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(a.x, a.y, this._w(p) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Προσθήκη ΠΟΛΛΩΝ σημείων (π.χ. getCoalescedEvents) με ομαλή καμπύλη. */
  extend(points) {
    if (!this.drawing) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.color;
    for (const p of points) {
      const prev = this.pts[this.pts.length - 1];
      if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) < 0.0008) continue; // αγνόησε στάσιμα
      this.pts.push(p);
      const cur = this._px(p);
      const prevPx = this._px(prev);
      const mid = { x: (prevPx.x + cur.x) / 2, y: (prevPx.y + cur.y) / 2 };
      ctx.beginPath();
      ctx.lineWidth = this._w(p);
      ctx.moveTo(this.lastMid.x, this.lastMid.y);
      ctx.quadraticCurveTo(prevPx.x, prevPx.y, mid.x, mid.y);
      ctx.stroke();
      this.lastMid = mid;
    }
    ctx.restore();
  }

  end() {
    if (!this.drawing) return;
    // κλείσιμο: τράβα ως το τελευταίο σημείο
    const last = this.pts[this.pts.length - 1];
    if (last && this.lastMid) {
      const cur = this._px(last);
      const ctx = this.ctx;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this._w(last);
      ctx.beginPath();
      ctx.moveTo(this.lastMid.x, this.lastMid.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.stroke();
      ctx.restore();
    }
    this.drawing = false;
  }
}
