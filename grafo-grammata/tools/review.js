import {LOWER as r8Lower} from './baseline-r8/letters/lower.js';
import {UPPER as r8Upper} from './baseline-r8/letters/upper.js';
import {LOWER as originalLower} from './baseline/letters/lower.js';
import {UPPER as originalUpper} from './baseline/letters/upper.js';
import {LETTERS_LOWER,LETTERS_UPPER,ZONES} from '../js/letters/index.js';
import {renderGuide,fieldMap,letterContentBottom} from '../js/engine/guide.js';
import {Animator} from '../js/engine/animator.js';
const $=id=>document.getElementById(id);
const notes={
 'π':'Πρώτα η οριζόντια από αριστερά προς τα δεξιά. Μετά κατεβαίνεις στην αριστερή κάθετη και τέλος στη δεξιά, με τη μικρή καμπύλη απόληξη.',
 'δ':'Κάνεις τον κύκλο αριστερόστροφα και συνεχίζεις επάνω αριστερά, μετά δεξιά. Μπορείς να το γράψεις συνεχόμενα ή να σηκώσεις το Pencil μετά τον κύκλο και να συνεχίσεις από το ίδιο σημείο.',
 'λ':'Νέα πιο φυσική επάνω καμπύλη και μαλακότερα κάτω σκέλη. Τα δύο σκέλη ενώνονται στο ίδιο σημείο, με μικρή καμπύλη απόληξη αριστερά. Πρόταση προς έγκρισή σου.' ,
 'Σ':'Επανελέγχθηκε στη σελίδα 24 του σχολικού τετραδίου: 1 →, 2 ↘, 3 ↙, 4 →. Η υπάρχουσα δοκιμαστική φορά συμφωνεί με αυτό το υπόδειγμα και διατηρείται.',
 'γ':'Νέα μορφή με μακρόστενη οβάλ θηλιά, σχεδιασμένη πάνω στις αναλογίες των κουκκίδων του σχολικού υποδείγματος. Δες πρώτα το καθαρό σχήμα και μετά πάτησε επίδειξη για τη δοκιμαστική φορά.',
 'μ':'Πρώτα η αριστερή κάθετη προς τα κάτω. Μετά η σκάφη από αριστερά προς τα δεξιά και τέλος η δεξιά μαγκουρίτσα με την άκρη προς τα πάνω.',
 'κ':'Επανελέγχθηκε στο σχολικό υπόδειγμα, σ.26: κάθετη ↓, πάνω σκέλος προς την κάθετη ↙, κάτω σκέλος από την κάθετη προς τα έξω ↘. Δεν έχουν ίδια φορά ως προς τον κορμό.',
 'Κ':'Τα σκέλη ενώνονται με τον κορμό. Το πάνω σκέλος κατεβαίνει από πάνω δεξιά προς την ένωση.',
 'β':'Πρόταση πιο στρογγυλού χειρόγραφου πεζού, με σαφή διαφορά από το κεφαλαίο Β. Έλεγξε ειδικά τη μορφή και τη συνεχή φορά.',
 'ς':'Λίγο πιο ισορροπημένες πάνω και κάτω καμπύλες, με ομαλή ένωση στο κέντρο. Η κάτω απόληξη παραμένει ολόκληρη πάνω στη γραμμή.',
 'ξ':'Πιο ομαλές καμπύλες και τρεις χωριστές κινήσεις με σαφή αρίθμηση.',
 'ω':'Ξεκινάς από πάνω αριστερά. Το δεύτερο κομμάτι συνεχίζει από το κέντρο, ακριβώς εκεί όπου τελειώνει το πρώτο, και καταλήγει επάνω δεξιά.',
 'ρ':'Η κοιλιά έγινε περίπου 15% μικρότερη σε πλάτος και ύψος. Συνεχίζει να πατά στη βάση και να ενώνεται με τον κορμό.',
 'ψ':'Η σκάφη πατά στη βάση. Πρώτα η σκάφη και μετά η κάθετη προς τα κάτω.',
 'Φ':'Πρώτα το οβάλ και μετά η κεντρική κάθετη.',
 'Ψ':'Πρώτα η σκάφη και μετά η κεντρική κάθετη.',
 'Μ':'Η σειρά που ζήτησες: αριστερή κάθετη ↓, αριστερή εσωτερική ↘, δεξιά εσωτερική ↗, δεξιά κάθετη ↓. Προχωρά από αριστερά προς τα δεξιά.',
 'Ν':'Τρεις χωριστές κινήσεις. Οι δύο κορμοί κατεβαίνουν.',
 'ε':'Οι δύο καμπύλες ενώνονται χωρίς κενό.',
 'φ':'Η κεντρική γραμμή αρχίζει στο ύψος των πεζών και συνεχίζει κάτω από τη βάση.',
 'χ':'Πιο μαλακά σκέλη και καθαρότερη προέκταση κάτω από τη βάση.',
};
let letterCase='lower',current='ω',changedOnly=true,showGuides=true,useR8=true,showSource=true;
const today=new Set(['γ','δ','κ','λ','μ','π','ρ','ς','ω','Μ','Σ']);
const sourceImage=new Image(); sourceImage.src='./reference/gamma-school.png'; sourceImage.onload=()=>render();
const panels={};
for(const id of ['old','new']){
 const container=$(id),guide=document.createElement('canvas'),ink=document.createElement('canvas');
 container.append(guide,ink);
 panels[id]={container,guide,ink,animator:null};
}
function entries(){return letterCase==='lower'?LETTERS_LOWER:LETTERS_UPPER;}
function original(c){const source=useR8?(letterCase==='lower'?r8Lower:r8Upper):(letterCase==='lower'?originalLower:originalUpper);return source.find(l=>l.char===c);}
function changed(l){const old=original(l.char);return !old||JSON.stringify(old.strokes.map(s=>s.points))!==JSON.stringify(l.strokes.map(s=>s.points));}
function paint(id,letter,contentBottom){
 const p=panels[id];p.animator?.stop();p.animator=null;p.letter=letter;
 p.container.querySelector('.empty')?.remove();
 const w=p.container.clientWidth,h=p.container.clientHeight,dpr=window.devicePixelRatio||1;
 for(const cv of [p.guide,p.ink]){cv.width=w*dpr;cv.height=h*dpr;cv.getContext('2d').setTransform(dpr,0,0,dpr,0,0);}
 p.map=fieldMap(w,h,.08,contentBottom);p.w=w;p.h=h;
 if(id==='old' && current==='γ' && showSource){
  p.letter=null;
  const ctx=p.guide.getContext('2d');
  renderGuide(ctx,w,h,{zones:ZONES,strokes:[]},{map:p.map,lines:'double',force:{guide:false,numbers:false,arrows:false}});
  if(sourceImage.complete && sourceImage.naturalWidth)ctx.drawImage(sourceImage,p.map.tx(.297),p.map.ty(.46),p.map.s(.44),p.map.s(.79));
  return;
 }
 if(!letter){const empty=document.createElement('div');empty.className='empty';empty.textContent='Δεν υπήρχε στην έκδοση 19';p.container.append(empty);return;}
 renderGuide(p.guide.getContext('2d'),w,h,{...letter,zones:ZONES},{map:p.map,lines:'double',guideAlpha:.22,force:{guide:showGuides,numbers:showGuides,arrows:showGuides}});
 if(!showGuides){const c=p.ink.getContext('2d');c.strokeStyle='#263c4a';c.lineWidth=p.map.s(.015);c.lineCap='round';c.lineJoin='round';for(const st of letter.strokes){c.beginPath();st.points.forEach((pt,i)=>c[i?'lineTo':'moveTo'](p.map.tx(pt.x),p.map.ty(pt.y)));c.stroke();}}
}
function play(id){
 const p=panels[id];if(!p.letter)return;
 p.animator?.stop();
 const surface={map:p.map,ctx:()=>p.ink.getContext('2d'),clear:()=>p.ink.getContext('2d').clearRect(0,0,p.w,p.h)};
 p.animator=new Animator(surface,p.letter,{speed:.12,baseWidth:.018});p.animator.play(()=>{});
}
function render(){
 let list=entries().filter(l=>!changedOnly||today.has(l.char));
 if(!list.some(l=>l.char===current))current=list[0].char;
 $('letters').replaceChildren(...list.map(l=>{const b=document.createElement('button');b.textContent=l.char;b.setAttribute('aria-pressed',l.char===current);b.onclick=()=>{current=l.char;render();};return b;}));
 const next=entries().find(l=>l.char===current),old=original(current);
 const sourceActive=current==='γ' && showSource;
 $('oldtitle').textContent=sourceActive?'Σχολικό υπόδειγμα · γ':useR8?'Προηγούμενη δοκιμή r8':'Αρχικές διαδρομές v19';
 $('kappa-credit').hidden=current!=='κ';
 $('delta-credit').hidden=current!=='δ';
 $('source-credit').hidden=!sourceActive; $('playold').hidden=sourceActive;
 $('both').textContent=sourceActive?'▶ Φορά της πρότασης':'▶ Σύγκριση φοράς';
 $('reference').textContent=sourceActive?'Σχολικό υπόδειγμα':useR8?'Σύγκριση με r8':'Σύγκριση με v19';$('reference').setAttribute('aria-pressed',useR8);
 $('oldcount').textContent=old&&!sourceActive?`· ${old.strokes.length} ${old.strokes.length===1?'κίνηση':'κινήσεις'}`:'';$('newcount').textContent=`· ${next.strokes.length} ${next.strokes.length===1?'κίνηση':'κινήσεις'}`;
 $('note').textContent=notes[current]||(changed(next)?'Δοκιμαστική αλλαγή στη σειρά ή στη διαίρεση των κινήσεων. Έλεγξε τη φορά με την αργή επίδειξη.':'Η διαδρομή παραμένει όπως στην έκδοση 19. Οι αριθμοί συνδέονται πλέον με την πραγματική αφετηρία.');
 $('try').href=`../?char=${encodeURIComponent(current)}&case=${letterCase}`;
 $('lower').setAttribute('aria-pressed',letterCase==='lower');$('upper').setAttribute('aria-pressed',letterCase==='upper');
 $('filter').setAttribute('aria-pressed',changedOnly);$('guides').setAttribute('aria-pressed',showGuides);
 const bottom=Math.max(letterContentBottom(next),old?letterContentBottom(old):1,sourceActive?1.26:1);
 paint('old',old,bottom);paint('new',next,bottom);
}
$('lower').onclick=()=>{letterCase='lower';current='γ';render();};$('upper').onclick=()=>{letterCase='upper';current='Μ';render();};
$('reference').onclick=()=>{if(current==='γ'){if(showSource){showSource=false;useR8=true;}else if(useR8){useR8=false;}else{showSource=true;useR8=true;}}else{useR8=!useR8;}render();};
$('filter').onclick=()=>{changedOnly=!changedOnly;render();};$('guides').onclick=()=>{showGuides=!showGuides;render();};
$('playold').onclick=()=>play('old');$('playnew').onclick=()=>play('new');$('both').onclick=()=>{play('old');play('new');};
new ResizeObserver(()=>render()).observe(document.querySelector('.columns'));
render();
