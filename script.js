(function(){
  var SPEED = 1;

  // generate stars (with gentle drifting motion)
  try{
    var layer = document.getElementById('stars');
    var html = '';
    for(var i=0;i<70;i++){
      var x = Math.random()*100, y = Math.random()*100, s = Math.random()*1.6+1;
      var dur = (Math.random()*25+15).toFixed(1), delay = (Math.random()*-30).toFixed(1);
      html += '<span style="left:'+x+'vw;top:'+y+'vh;width:'+s+'px;height:'+s+'px;--dur:'+dur+'s;animation-delay:'+delay+'s;"></span>';
    }
    layer.innerHTML = html;
  }catch(e){}

  // ---------- custom rocket engine: edge-to-edge flight + collisions ----------
  (function(){
    var field = document.getElementById('rocketField');
    if(!field) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce) return;

    var PALETTE = ['#ffd400','#ff3ea8','#39ff88'];
    var FIN = '#0a0a0a';
    var N = 5;
    var rockets = [];

    function rocketSVG(color){
      return '<svg viewBox="0 0 60 110" width="34" height="62">' +
        '<polygon points="30,0 48,34 12,34" fill="'+color+'" stroke="#0a0a0a" stroke-width="4"/>' +
        '<rect x="12" y="34" width="36" height="40" fill="#f4f4ef" stroke="#0a0a0a" stroke-width="4"/>' +
        '<circle cx="30" cy="52" r="8" fill="#4fd6ff" stroke="#0a0a0a" stroke-width="3"/>' +
        '<polygon points="12,56 -2,78 12,78" fill="'+FIN+'"/>' +
        '<polygon points="48,56 62,78 48,78" fill="'+FIN+'"/>' +
        '<rect x="19" y="74" width="22" height="9" fill="#0a0a0a"/>' +
        '</svg>';
    }

    function rand(a,b){ return Math.random()*(b-a)+a; }

    var PATHS = ['LR','RL','TB','BT','NE','SW','NW','SE'];
    function makePath(type){
      var vw = window.innerWidth, vh = window.innerHeight, p = 90;
      var s={},e={},angle=0;
      if(type==='LR'){ s={x:-p,y:rand(0,vh)}; e={x:vw+p,y:s.y+rand(-120,120)}; angle=90; }
      else if(type==='RL'){ s={x:vw+p,y:rand(0,vh)}; e={x:-p,y:s.y+rand(-120,120)}; angle=270; }
      else if(type==='TB'){ s={x:rand(0,vw),y:-p}; e={x:s.x+rand(-120,120),y:vh+p}; angle=180; }
      else if(type==='BT'){ s={x:rand(0,vw),y:vh+p}; e={x:s.x+rand(-120,120),y:-p}; angle=0; }
      else if(type==='NE'){ s={x:-p,y:vh+p}; e={x:vw+p,y:-p}; angle=45; }
      else if(type==='SW'){ s={x:vw+p,y:-p}; e={x:-p,y:vh+p}; angle=225; }
      else if(type==='NW'){ s={x:vw+p,y:vh+p}; e={x:-p,y:-p}; angle=315; }
      else { s={x:-p,y:-p}; e={x:vw+p,y:vh+p}; angle=135; }
      return {s:s,e:e,angle:angle};
    }

    function spawn(slot){
      var type = PATHS[Math.floor(rand(0,PATHS.length))];
      var path = makePath(type);
      var dist = Math.hypot(path.e.x-path.s.x, path.e.y-path.s.y);
      var speed = rand(55,95);
      var color = PALETTE[Math.floor(rand(0,PALETTE.length))];
      var scale = rand(.75,1.3);
      var el = document.createElement('div');
      el.className = 'rocket-custom';
      el.innerHTML = '<div class="rocket-shape" style="transform:scale('+scale.toFixed(2)+')">' +
        rocketSVG(color) + '<div class="flame-wrap"><div class="flame"></div></div></div>';
      field.appendChild(el);
      rockets[slot] = {
        el: el, start: path.s, end: path.e, angle: path.angle,
        duration: (dist/speed)*1000, progress: 0, age: 0,
        scale: scale, exploded: false
      };
    }

    for(var i=0;i<N;i++) spawn(i);

    function burstAt(x,y){
      var b = document.createElement('div');
      b.className = 'burst';
      var html = '';
      var fireColors = ['#ffd400','#ff8a00','#ff3ea8','#39ff88'];
      for(var k=0;k<10;k++){
        var ang = rand(0,Math.PI*2), dist = rand(26,60);
        var dx = Math.cos(ang)*dist, dy = Math.sin(ang)*dist;
        var c = fireColors[Math.floor(rand(0,fireColors.length))];
        html += '<span class="particle" style="left:'+x+'px;top:'+y+'px;--dx:'+dx+'px;--dy:'+dy+'px;background:'+c+';"></span>';
      }
      b.innerHTML = html;
      field.appendChild(b);
      setTimeout(function(){ b.remove(); }, 600);
    }

    function lerp(a,b,t){ return a+(b-a)*t; }

    var lastTick = null;
    function tick(now){
      if(lastTick === null) lastTick = now;
      var dt = Math.min(now - lastTick, 100);
      lastTick = now;
      var sdt = dt * SPEED;
      var positions = [];
      for(var i=0;i<rockets.length;i++){
        var r = rockets[i];
        if(!r || r.exploded) { positions.push(null); continue; }
        r.progress += sdt / r.duration;
        r.age += sdt;
        if(r.progress >= 1){ spawn(i); r = rockets[i]; }
        var x = lerp(r.start.x, r.end.x, r.progress), y = lerp(r.start.y, r.end.y, r.progress);
        r.el.style.transform = 'translate('+x+'px,'+y+'px) rotate('+r.angle+'deg)';
        positions.push({x:x,y:y,age:r.age});
      }
      for(var a=0;a<positions.length;a++){
        if(!positions[a] || positions[a].age < 400) continue;
        for(var bI=a+1;bI<positions.length;bI++){
          if(!positions[a]) break;
          if(!positions[bI] || positions[bI].age < 400) continue;
          var dx = positions[a].x - positions[bI].x, dy = positions[a].y - positions[bI].y;
          if(Math.hypot(dx,dy) < 34){
            var mx = (positions[a].x+positions[bI].x)/2, my = (positions[a].y+positions[bI].y)/2;
            burstAt(mx,my);
            rockets[a].exploded = true; rockets[bI].exploded = true;
            rockets[a].el.remove(); rockets[bI].el.remove();
            (function(slotA,slotB){
              setTimeout(function(){ spawn(slotA); }, rand(600,2000)/SPEED);
              setTimeout(function(){ spawn(slotB); }, rand(600,2000)/SPEED);
            })(a,bI);
            positions[a] = null; positions[bI] = null;
            break;
          }
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // wire up the volume-style speed slider (controls rockets, moon & stars)
    var speedRange = document.getElementById('speedRange');
    var speedVal = document.getElementById('speedVal');
    function applySpeed(v){
      SPEED = parseFloat(v) || 1;
      document.documentElement.style.setProperty('--speed-mult', SPEED);
      if(speedVal) speedVal.textContent = SPEED+'x';
    }
    if(speedRange){
      applySpeed(speedRange.value);
      speedRange.addEventListener('input', function(){ applySpeed(this.value); });
    }
  })();

  // theme toggle with persistence
  var root = document.documentElement;
  var sw = document.getElementById('themeSwitch');
  var thumb = document.getElementById('thumb');
  try{
    var saved = localStorage.getItem('firza-theme');
    if(saved){ root.setAttribute('data-theme', saved); }
  }catch(e){}

  function setTheme(t){
    root.setAttribute('data-theme', t);
    try{ localStorage.setItem('firza-theme', t); }catch(e){}
  }
  sw.addEventListener('click', function(){
    var cur = root.getAttribute('data-theme');
    var next = cur === 'dark' ? 'light' : 'dark';
    setTheme(next);
    thumb.classList.remove('boost');
    void thumb.offsetWidth;
    thumb.classList.add('boost');
  });
  sw.addEventListener('keydown', function(e){
    if(e.key==='Enter' || e.key===' '){ e.preventDefault(); sw.click(); }
  });
  sw.setAttribute('tabindex','0');

  // mobile nav
  var burger = document.getElementById('burgerBtn');
  var links = document.getElementById('navLinks');
  burger.addEventListener('click', function(){ links.classList.toggle('open'); });
  links.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){ links.classList.remove('open'); });
  });
})();
