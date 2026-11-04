(function(){
  var $ = function(id){ return document.getElementById(id); };
  var gbp = function(n){ return (n<0?'−£':'£') + Math.round(Math.abs(n)).toLocaleString('en-GB'); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.dataLayer = window.dataLayer || [];
  function store(k,v){ try{ if(v===undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k,v); }catch(e){ return null; } }

  /* ---------- menu ---------- */
  var mb=$('menu-btn'), nav=$('nav');
  function setMenu(o){ nav.classList.toggle('open',o); mb.setAttribute('aria-expanded',o); mb.textContent=o?'Close':'Menu'; }
  if(mb&&nav){
    mb.addEventListener('click', function(){ setMenu(!nav.classList.contains('open')); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape'&&nav.classList.contains('open')){ setMenu(false); mb.focus(); } });
    nav.addEventListener('click', function(e){ if(e.target.closest('a')) setMenu(false); });
  }

  /* ---------- mobile sticky CTA: show after scrolling past the first screen ---------- */
  var mc=document.querySelector('.mcta');
  if(mc){ var onS=function(){ mc.classList.toggle('show', window.scrollY>420); }; window.addEventListener('scroll', onS, {passive:true}); onS(); }

  /* ---------- slider fill ---------- */
  function fill(el){ var p=(el.value-el.min)/(el.max-el.min)*100; el.style.setProperty('--p',p+'%'); }
  document.querySelectorAll('.calc input[type=range]').forEach(function(r){ fill(r); r.addEventListener('input',function(){fill(r);}); });

  function remember(txt){ store('ss_calc', txt); }
  function track(id, calc){ var el=$(id); if(el) el.addEventListener('change', function(){ dataLayer.push({event:'calc_used',calc:calc}); }); }

  /* ---------- live search terms simulation ---------- */
  (function(){
    var box=$('lt'); if(!box) return;
    var IND=[
      {n:'Cycling', a:[60,450], k:['gravel bike 2x groupset','carbon road wheels 50mm','shimano 105 di2','bike turbo trainer smart','tubeless road tyres 28c','cycling bib shorts mens'], c:['how to fix bike chain','cycling jobs bristol','free bike service','bike drawing easy','used bikes facebook']},
      {n:'Fishing', a:[30,160], k:['carp rod 12ft 3.5lb','shimano baitrunner 6000','2 man bivvy sale','korda kurv hooks size 8','gps bait boat','sonik bite alarms'], c:['fishing rod drawing','tackle shop jobs','free fishing licence','fishing game online','carp fishing memes']},
      {n:'Outdoor', a:[40,220], k:['4 season sleeping bag','waterproof hiking boots womens','ultralight tent 2 person','camping stove gas','merino base layer'], c:['camping near me free','tent drawing','hiking boots repair diy','wild camping laws','outdoor jobs uk']},
      {n:'DTC brand', a:[20,70], k:['vegan protein powder 1kg','natural deodorant men','refillable cleaning spray','organic dog treats','reusable coffee cup 12oz'], c:['protein powder recipe','deodorant free sample','cleaning spray how to make','dog treats homemade','coffee cup png']},
      {n:'Service', a:[80,600], k:['emergency plumber bristol','boiler service near me','physio appointment today','kitchen fitter quote','accountant for small business'], c:['plumber apprenticeship','how to fix boiler myself','physio salary uk','kitchen fitter course','accountant jobs']}
    ];
    var ii=0, kc={}, cc={};
    function pick(conv){ var ind=IND[ii++%IND.length], list=conv?ind.k:ind.c, store=conv?kc:cc; store[ind.n]=(store[ind.n]||0)+1; return {t:list[store[ind.n]%list.length], n:ind.n, a:ind.a}; }
    var blocked=0, count=0, MAX=5;
    function rand(a,b){ return Math.round(a+Math.random()*(b-a)); }
    function chip(cls,txt){ return '<span class="chip '+cls+'">'+txt+'</span>'; }
    function money(n){ return '\u00a3'+Math.round(n).toLocaleString('en-GB'); }
    var MIN_ROAS=4;
    /* outcome: 'waste' (no sales), 'low' (sells but under 4x), 'good' (4x or more) */
    function gen(outcome, aov){
      var cost=outcome==='waste'?rand(14,190):rand(40,320);
      var roas=outcome==='waste'?0:outcome==='low'?(0.8+Math.random()*3):(4.2+Math.random()*10);
      var val=cost*roas, mid=(aov[0]+aov[1])/2, conv=roas>0?Math.max(1,Math.round(val/mid)):0;
      var ctr=outcome==='waste'?(0.6+Math.random()*3):outcome==='low'?(1.5+Math.random()*4):(3+Math.random()*9);
      return {cost:cost,val:val,conv:conv,ctr:ctr,roas:roas};
    }
    function make(term,d,ind){ var it=document.createElement('div'); it.className='lt-item';
      var ok=d.roas>=MIN_ROAS;
      it.innerHTML='<div class="lt-row"><span class="tc"><span class="t">'+term+'</span><span class="ind">'+ind+'</span></span>'
        +'<span class="c">'+money(d.cost)+'</span><span class="r">'+d.ctr.toFixed(1)+'%</span><span class="v">'+d.conv+'</span>'
        +'<span class="val'+(d.val>0?' pos':'')+'">'+money(d.val)+'</span><span class="ro '+(ok?'ok':'lo')+'">'+d.roas.toFixed(1)+'x</span>'
        +'<span class="a">'+chip('chip--wait','Reviewing')+'</span></div>'; return it; }
    function remove(it){ if(!it||it.dataset.gone) return; it.dataset.gone='1'; it.classList.add('leave'); setTimeout(function(){ it.remove(); }, reduce?0:600); }
    function bump(el){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    function trim(){ var live=[].filter.call(box.children,function(c){return !c.dataset.gone;}); for(var i=live.length-1;i>=MAX;i--) remove(live[i]); }
    function step(){
      var r=Math.random(), outcome=r<0.42?'waste':r<0.62?'low':'good';
      var pk=pick(outcome!=='waste'), d=gen(outcome,pk.a), keep=d.roas>=MIN_ROAS;
      var it=make(pk.t,d,pk.n); if(!reduce) it.classList.add('enter');
      box.insertBefore(it, box.firstChild);
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ it.classList.remove('enter'); }); });
      trim(); count++; $('lt-count').textContent=count; bump($('lt-count'));
      var a=it.querySelector('.a');
      setTimeout(function(){
        if(keep){ it.classList.add('is-new'); a.innerHTML=chip('chip--new','New<span class="xk"> · keep</span>'); setTimeout(function(){ it.classList.remove('is-new'); a.innerHTML=chip('chip--keep','Kept'); },1600); }
        else { it.classList.add('is-cut'); a.innerHTML=chip('chip--neg','Negated'); blocked+=d.cost; $('lt-blocked').textContent=gbp(blocked); bump($('lt-blocked')); setTimeout(function(){ remove(it); },1500); }
      }, reduce?0:1100);
    }
    for(var i=0;i<3;i++){ var pk0=pick(true), s=make(pk0.t,gen('good',pk0.a),pk0.n); s.querySelector('.a').innerHTML=chip('chip--keep','Kept'); box.appendChild(s); count++; }
    $('lt-count').textContent=count; step();
    if(!reduce){ (function loop(){ setTimeout(function(){ if(!document.hidden) step(); loop(); }, 2300+Math.random()*900); })(); }
  })();

  /* ---------- 1. search term savings ---------- */
  if($('ss-budget')){
    var saved=function(b,s,w,c){ return b*(s/100)*(w/100)*(c/100); };
    var ss=function(){
      var budget=+$('ss-budget').value, share=+$('ss-share').value, waste=+$('ss-waste').value, c=+$('ss-catch').value, roas=+$('ss-roas').value;
      $('ss-budget-out').textContent=gbp(budget); $('ss-share-out').textContent=share+'%'; $('ss-waste-out').textContent=waste+'%'; $('ss-catch-out').textContent=c+'%'; $('ss-roas-out').textContent=roas+'x';
      var wasted=budget*(share/100)*(waste/100), save=wasted*(c/100);
      $('ss-wasted').textContent=gbp(wasted); $('ss-saved').textContent=gbp(save);
      $('ss-month').textContent='About '+gbp(save/12)+' a month'; $('ss-rev').textContent=gbp(save*roas);
      $('ss-s10').textContent=gbp(saved(budget,share,10,c)); $('ss-s15').textContent=gbp(saved(budget,share,15,c)); $('ss-s20').textContent=gbp(saved(budget,share,20,c));
      remember('Search term savings: '+gbp(save)+'/yr (budget '+gbp(budget)+', waste '+waste+'%)');
      return save;
    };
    ['ss-budget','ss-share','ss-waste','ss-catch','ss-roas'].forEach(function(id){
      $(id).addEventListener('input', ss);
      $(id).addEventListener('change', function(){ dataLayer.push({event:'calc_used',calc:'search_term_savings',saved:Math.round(ss())}); });
    });
    ss();
  }

  /* ---------- 2. POAS ---------- */
  if($('p-rev')){
    var po=function(){
      var rev=+$('p-rev').value||0, m=+$('p-margin').value, v=+$('p-var').value||0, sp=+$('p-spend').value||0;
      $('p-margin-out').textContent=m+'%';
      var gp=rev*(m/100)-v, poas=sp>0?gp/sp:0, roas=sp>0?rev/sp:0, be=gp>0?rev/gp:Infinity, net=gp-sp;
      $('p-poas').textContent= sp>0? poas.toFixed(2) : '–';
      $('p-poas-note').textContent= sp>0? '£'+poas.toFixed(2)+' gross profit per £1 of ad spend' : 'Enter your ad spend';
      $('p-net').textContent=gbp(net); $('p-roas').textContent= sp>0? roas.toFixed(2)+'x':'–'; $('p-be').textContent= isFinite(be)? be.toFixed(2)+'x':'Never';
      var vd=$('p-verdict');
      if(!isFinite(be)){ vd.className='verdict v-bad'; vd.textContent='No margin left to cover ads'; }
      else if(poas>=1.5){ vd.className='verdict v-good'; vd.textContent='Profitable, room to scale'; }
      else if(poas>=1){ vd.className='verdict v-mid'; vd.textContent='Profitable but tight'; }
      else { vd.className='verdict v-bad'; vd.textContent='Losing money on ads'; }
      remember('POAS: '+(sp>0?poas.toFixed(2):'n/a')+' at '+m+'% margin, profit after ads '+gbp(net));
    };
    ['p-rev','p-margin','p-var','p-spend'].forEach(function(id){ $(id).addEventListener('input', po); track(id,'poas'); });
    po();
  }

  /* ---------- 3. break-even ROAS ---------- */
  if($('b-margin')){
    var be=function(){
      var m=+$('b-margin').value, t=+$('b-target').value, r=+$('b-roas').value;
      $('b-margin-out').textContent=m+'%'; $('b-target-out').textContent=t+'%'; $('b-roas-out').textContent=r.toFixed(1)+'x';
      var b=100/m, tgt=m>t?100/(m-t):Infinity;
      $('b-be').textContent=b.toFixed(2)+'x'; $('b-tgt').textContent= isFinite(tgt)? tgt.toFixed(2)+'x' : 'Not reachable at this margin';
      var vd=$('b-verdict');
      if(r<b){ vd.className='verdict v-bad'; vd.textContent='Current ROAS is below break-even'; }
      else if(r<tgt){ vd.className='verdict v-mid'; vd.textContent='Profitable, below your goal'; }
      else { vd.className='verdict v-good'; vd.textContent='Hitting your profit goal'; }
      var rows=''; [20,30,40,50,60].forEach(function(mm){ var tt=mm>t?100/(mm-t):Infinity; rows+='<tr'+(mm===Math.round(m/10)*10?' class="on"':'')+'><td>'+mm+'%</td><td>'+(100/mm).toFixed(2)+'x</td><td>'+(isFinite(tt)?tt.toFixed(2)+'x':'–')+'</td></tr>'; });
      $('b-table').innerHTML=rows;
      remember('Break-even ROAS '+b.toFixed(2)+'x at '+m+'% margin; current ROAS '+r.toFixed(1)+'x');
    };
    ['b-margin','b-target','b-roas'].forEach(function(id){ $(id).addEventListener('input', be); track(id,'break_even_roas'); });
    be();
  }

  /* ---------- 4. health check ---------- */
  if($('hc-form')){
    var Q=[
      {q:'How is conversion tracking set up?', o:[['Revenue values + enhanced conversions',15],['Conversions only, no values',8],['Not sure',0]], d:1, fix:'Fix conversion tracking', why:'Pass real revenue values and turn on enhanced conversions so Smart Bidding optimises on actual sales.'},
      {q:'How often are search terms reviewed?', o:[['Weekly',15],['Monthly',9],['Rarely',3],['Never',0]], d:2, fix:'Review search terms every week', why:'Irrelevant terms keep spending until someone negates them.'},
      {q:'How are negative keywords managed?', o:[['Automated script',10],['Manual lists',6],['Not at all',0]], d:1, fix:'Automate negative keywords', why:'A script catches zero-conversion terms the day they cross your threshold.'},
      {q:'Is your product feed optimised?', o:[['Titles and attributes optimised',10],['Default from the store',4],['Not sure',0]], d:1, fix:'Optimise the product feed', why:'Better titles and attributes match products to more of the right searches in Shopping and PMax.'},
      {q:'How is bidding set?', o:[['tROAS / tCPA based on margin',15],['Max conversion value, no target',8],['Manual or max clicks',3]], d:1, fix:'Set margin-based bid targets', why:'Targets built from your margin stop Google chasing revenue that loses money.'},
      {q:'Are zero-conversion products excluded?', o:[['Yes',10],['No',0]], d:1, fix:'Exclude or isolate non-selling products', why:'Products that never sell soak up Shopping and PMax budget. One client excluded 304 and lifted ROAS 34%.'},
      {q:'When was the last meaningful optimisation?', o:[['Within 2 weeks',10],['Within 2 months',5],['Longer ago',0]], d:1, fix:'Get a regular optimisation rhythm', why:'Accounts drift quickly. Weekly changes keep spend pointed at what’s working.'},
      {q:'How do you get reports?', o:[['Weekly, with full account access',15],['Monthly',8],['Not at all',0]], d:1, fix:'Move to weekly reporting', why:'Weekly reports catch problems in days, not at the end of the month.'}
    ];
    var f=$('hc-form'), html='';
    Q.forEach(function(x,i){
      html+='<div class="hc-q"><fieldset><legend><i>'+String(i+1).padStart(2,'0')+'</i>'+x.q+'</legend><div class="hc-opts">';
      x.o.forEach(function(o,j){ html+='<label><input type="radio" id="hc-'+i+'-'+j+'" name="hc'+i+'" value="'+o[1]+'"'+(j===x.d?' checked':'')+'><span>'+o[0]+'</span></label>'; });
      html+='</div></fieldset></div>';
    });
    f.innerHTML=html;
    var hc=function(){
      var total=0, gaps=[];
      Q.forEach(function(x,i){ var el=f.querySelector('input[name="hc'+i+'"]:checked'); var v=el?+el.value:0; total+=v; var g=x.o[0][1]-v; if(g>0) gaps.push({gap:g,x:x}); });
      gaps.sort(function(a,b){return b.gap-a.gap;});
      $('hc-score').textContent=total; $('hc-bar').style.width=total+'%';
      $('hc-band').textContent= total>=80?'Out of 100. Healthy; fine-tuning will still find gains.': total>=55?'Out of 100. Room to improve; some spend is likely leaking.':'Out of 100. Needs attention; you are probably paying for a lot of waste.';
      $('hc-fixes').innerHTML= gaps.length? gaps.slice(0,3).map(function(g){ return '<li>'+g.x.fix+'<span>'+g.x.why+'</span></li>'; }).join('') : '<li>No major gaps<span>Book an audit to find the fine-tuning wins.</span></li>';
      remember('Health check score: '+total+'/100');
    };
    f.addEventListener('change', function(){ hc(); dataLayer.push({event:'calc_used',calc:'health_check'}); });
    hc();
  }

  /* ---------- 5. budget pacing ---------- */
  if($('bp-budget')){
    var dim=$('bp-days'), now=new Date();
    var days=new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    dim.value=String(days); $('bp-day').max=days; $('bp-day').value=Math.min(now.getDate(), days);
    fill($('bp-day'));
    var bp=function(){
      var budget=+$('bp-budget').value||0, spent=+$('bp-spent').value||0, D=+dim.value, d=Math.min(+$('bp-day').value, D);
      $('bp-day').max=D; $('bp-day-out').textContent='Day '+d+' of '+D;
      var expected=budget*d/D, pace=expected>0?spent/expected*100:0, left=Math.max(budget-spent,0), daysLeft=Math.max(D-d,0);
      var daily= daysLeft>0? left/daysLeft : 0, projected= d>0? spent/d*D : 0;
      $('bp-pace').textContent=Math.round(pace)+'%';
      $('bp-expected').textContent=gbp(expected);
      $('bp-daily').textContent= daysLeft>0? gbp(daily) : '–';
      $('bp-proj').textContent=gbp(projected);
      $('bp-fill').style.width=Math.min(spent/budget*100||0,100)+'%';
      $('bp-mark').style.left=Math.min(expected/budget*100||0,100)+'%';
      var vd=$('bp-verdict');
      if(pace>110){ vd.className='verdict v-bad'; vd.textContent='Overspending: on track for '+gbp(projected); }
      else if(pace<90){ vd.className='verdict v-mid'; vd.textContent='Underspending: '+gbp(budget-projected)+' may go unused'; }
      else { vd.className='verdict v-good'; vd.textContent='On pace'; }
      remember('Budget pacing: '+Math.round(pace)+'% of expected, need '+gbp(daily)+'/day');
    };
    ['bp-budget','bp-spent','bp-day','bp-days'].forEach(function(id){ $(id).addEventListener('input', bp); track(id,'budget_pacing'); });
    bp();
  }

  /* ---------- 6. Black Friday planner ---------- */
  if($('bf-last')){
    var PH=[['Weeks 1–2','Warm-up and list building',14,.25],['Week 3','Early deals and teasers',7,.20],['Black Friday week','Peak',6,.35],['Cyber weekend','Last chance',3,.20]];
    var bf=function(){
      var last=+$('bf-last').value||0, g=+$('bf-growth').value, roas=+$('bf-roas').value;
      $('bf-growth-out').textContent=(g>=0?'+':'')+g+'%'; $('bf-roas-out').textContent=roas.toFixed(1)+'x';
      var target=last*(1+g/100), budget=roas>0?target/roas:0;
      $('bf-target').textContent=gbp(target); $('bf-budget').textContent=gbp(budget); $('bf-daily').textContent=gbp(budget/30);
      $('bf-table').innerHTML=PH.map(function(p){ return '<tr><td>'+p[0]+'<br><small style="color:var(--c-muted)">'+p[1]+'</small></td><td>'+gbp(budget*p[3])+'</td><td>'+gbp(budget*p[3]/p[2])+'</td><td>'+gbp(target*p[3])+'</td></tr>'; }).join('');
      remember('Black Friday plan: '+gbp(budget)+' budget for '+gbp(target)+' revenue');
    };
    ['bf-last','bf-growth','bf-roas'].forEach(function(id){ $(id).addEventListener('input', bf); track(id,'black_friday_planner'); });
    bf();
  }

  /* ---------- CTA tracking ---------- */
  document.querySelectorAll('[data-calc]').forEach(function(a){ a.addEventListener('click', function(){ dataLayer.push({event:'calc_cta_click',calc:a.getAttribute('data-calc')}); }); });

  /* ---------- pricing: cursor-aware CTAs ---------- */
  document.querySelectorAll('.plan').forEach(function(card){
    var cta=card.querySelector('.plan-cta'); if(!cta) return;
    card.addEventListener('pointerenter', function(e){ if(e.pointerType==='mouse') card.classList.add('on'); });
    card.addEventListener('pointermove', function(e){
      if(e.pointerType!=='mouse') return;
      var r=card.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
      card.style.setProperty('--mx',x+'px'); card.style.setProperty('--my',y+'px');
      var c=cta.getBoundingClientRect(), cx=c.left+c.width/2-r.left, cy=c.top+c.height/2-r.top;
      var dx=Math.max(-1,Math.min(1,(x-cx)/(r.width/2))), dy=Math.max(-1,Math.min(1,(y-cy)/(r.height/2)));
      cta.style.setProperty('--tx',(dx*10).toFixed(1)+'px'); cta.style.setProperty('--ty',(dy*6).toFixed(1)+'px');
    });
    card.addEventListener('pointerleave', function(){ card.classList.remove('on'); cta.style.setProperty('--tx','0px'); cta.style.setProperty('--ty','0px'); });
    cta.addEventListener('click', function(){ store('ss_plan', JSON.stringify({name:cta.dataset.plan,p:cta.dataset.p})); dataLayer.push({event:'pricing_cta_click',plan:cta.dataset.plan}); });
  });

  /* ---------- audit / contact form ---------- */
  var form=$('audit-form');
  if(form){
    var calc=store('ss_calc'); if(calc) $('a-calc').value=calc;
    var plan=store('ss_plan');
    if(plan){ try{ plan=JSON.parse(plan); var p=plan.p;
      $('a-g').checked=p==='g'||p==='gm'; $('a-m').checked=p==='m'||p==='gm'; $('a-ai').checked=p==='ai';
      if(!$('a-msg').value.trim()) $('a-msg').value='I’m interested in: '+plan.name;
      store('ss_plan',''); }catch(e){} }
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var err=$('a-err'), name=$('a-name').value.trim(), email=$('a-email').value.trim();
      var okN=!!name, okE=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      $('a-name').setAttribute('aria-invalid',!okN); $('a-email').setAttribute('aria-invalid',!okE);
      if(!okN||!okE){ err.textContent= !okN&&!okE ? 'Add your name and a valid email so we can reply.' : !okN ? 'Add your name so we know who to reply to.' : 'Check your email address; it doesn\u2019t look complete.'; err.hidden=false; (okN?$('a-email'):$('a-name')).focus(); return; }
      err.hidden=true;
      var done=function(){ dataLayer.push({event:'audit_request'}); form.hidden=true; $('audit-done').hidden=false; $('audit-done').focus(); };
      var endpoint=form.getAttribute('data-endpoint');
      if(endpoint){
        var btn=form.querySelector('button[type=submit]'); btn.disabled=true; btn.firstChild.textContent='Sending… ';
        fetch(endpoint,{method:'POST',headers:{'Accept':'application/json'},body:new FormData(form)})
          .then(function(r){ if(!r.ok) throw 0; done(); })
          .catch(function(){ btn.disabled=false; btn.firstChild.textContent='Request my free audit '; err.textContent='That didn’t send. Please try again, or email jack@social-surge.co.uk.'; err.hidden=false; });
      } else done();
    });
  }

  /* ---------- blog topic filter ---------- */
  var chips=document.querySelectorAll('.tchip');
  if(chips.length){
    var rows=document.querySelectorAll('.post-row'), empty=$('post-empty');
    chips.forEach(function(c){ c.addEventListener('click', function(){
      var t=c.getAttribute('data-topic'), n=0;
      chips.forEach(function(x){ x.setAttribute('aria-pressed', x===c?'true':'false'); });
      rows.forEach(function(r){ var show=!t||r.getAttribute('data-topic')===t; r.hidden=!show; if(show) n++; });
      if(empty) empty.hidden=n>0;
    }); });
  }

  /* ---------- copy buttons ---------- */
  document.querySelectorAll('[data-copy]').forEach(function(b){
    b.addEventListener('click', function(){
      var el=$(b.getAttribute('data-copy')), txt=el.textContent;
      var ok=function(){ b.textContent='Copied'; setTimeout(function(){ b.textContent='Copy'; },1500); };
      var fb=function(){ var r=document.createRange(); r.selectNodeContents(el); var s=getSelection(); s.removeAllRanges(); s.addRange(r); };
      try{ navigator.clipboard.writeText(txt).then(ok,fb); }catch(e){ fb(); }
    });
  });
})();
