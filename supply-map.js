/* ══════════════════════════════════════════════════════════════════════════
   Global Nutrition-Supply Risk — "How the world feeds Camden"
   Rendered ON the real Leaflet map (real coastlines, switchable basemap).

   HONESTY NOTE: a systems SCHEMATIC, not a live feed. Node positions are the
   real geographic centres of each system; sizes are order-of-magnitude.
   Structural dependencies sourced to DEFRA / FAO / USDA / USGS / World Bank /
   WMO. Items marked conf:"scenario" are illustrative forward scenarios, NOT
   predictions — verify current ENSO status & commodity prices before citing.
   ════════════════════════════════════════════════════════════════════════ */
(function(){
  const CORE=[52,-1]; // UK / Camden (lat,lng)
  const PATH_COLOR={calorie:"#E0A030",protein:"#C0504D",produce:"#5C9E4A",input:"#B5651D",logistics:"#5B8FB0",climate:"#8E6FB0",feedback:"#C43B6E"};
  const HEAT={passing:"#E5484D",risk:"#E8A020",watch:"#5B8FB0"};
  const HEAT_LABEL={passing:["Acute / disrupted now",HEAT.passing],risk:["High near-term risk",HEAT.risk],watch:["On watch",HEAT.watch]};

  const NODES=[
   {id:"S1",name:"EU / near-Europe produce",grp:"supply",kind:"pop",wt:22,lon:3,lat:45,heat:"watch",paths:["produce"],
    region:"Spain · Netherlands · Morocco (winter)",popLabel:"most of the UK's imported fruit & veg",
    trigger:"Heat & drought in Spain; Channel & post-Brexit border friction",
    tip:"The UK produces roughly 16% of the fruit and ~55% of the vegetables it consumes; the rest is imported, heavily from Spain and the Netherlands.",
    src:"DEFRA Agriculture in the UK 2023; Food Foundation, Broken Plate 2024.", conf:"established",
    euimpact:"The micronutrient lifeline. When Spanish harvests fail in a heat year and Channel friction slows the rest, UK fresh-produce shelves empty first and fruit-&-veg prices spike.",
    mech:"Short, just-in-time supply chains for perishable produce with almost no buffer — the first thing to visibly fail in a shock.",
    chain:["Heat/drought or border friction hits near-Europe supply","Fresh fruit & veg supply tightens","Produce prices rise, quality falls","Camden's micronutrient intake drops — diet quality falls"],
    edges:["produce"]},
   {id:"S2",name:"Black Sea grains",grp:"supply",kind:"pop",wt:24,lon:36,lat:49,heat:"watch",paths:["calorie"],
    region:"Ukraine · Russia · Kazakhstan",popLabel:"a top global wheat & sunflower-oil region",
    trigger:"War, Black Sea / Bosphorus disruption, and grain export bans",
    tip:"The 2022 invasion of Ukraine and Black Sea disruption drove the FAO Food Price Index to a record high; the corridor remains a live geopolitical chokepoint.",
    src:"FAO Food Price Index 2022; UN Black Sea Grain Initiative reporting.", conf:"established",
    euimpact:"The single most volatile calorie source. A blockade or export ban here moves world wheat and sunflower-oil prices, and the UK imports the price even where it doesn't import the grain.",
    mech:"A concentrated, contested export corridor — a large share of traded calories leaving through one sea and one strait.",
    chain:["Blockade / war / export ban in the Black Sea","World wheat & oil markets spike","UK food-price inflation rises","Cheapest-calorie floor cost rises for Camden households"],
    edges:["calorie"]},
   {id:"S3",name:"North American grains & oilseeds",grp:"supply",kind:"pop",wt:20,lon:-98,lat:43,heat:"watch",paths:["calorie","protein"],
    region:"US Midwest · Canadian Prairies",popLabel:"wheat, maize & soy (calories + feed)",
    trigger:"Drought and La Niña / El Niño swings; input costs",
    tip:"A swing supplier for both human calories and animal feed; Midwest yields are sensitive to Pacific (ENSO) climate cycles.",
    src:"USDA Foreign Agricultural Service (FAS) production reports.", conf:"established",
    euimpact:"A dual pathway: bread-wheat calories and the soy/maize that feeds livestock. A drought year here tightens both the calorie floor and the feed→protein chain at once.",
    mech:"A vast but climate-exposed breadbasket whose feed grains sit upstream of meat, eggs and dairy prices worldwide.",
    chain:["Drought / climate swing cuts yields","Grain and feed prices rise together","Calorie floor + livestock-feed cost rise","Camden: cheaper calories up, protein up"],
    edges:["calorie","protein"]},
   {id:"S4",name:"South American soy & maize",grp:"supply",kind:"pop",wt:18,lon:-58,lat:-18,heat:"risk",paths:["protein"],
    region:"Brazil · Argentina",popLabel:"the world's feed-protein engine",
    trigger:"Drought (Argentina 2022/23) and river-logistics failure",
    tip:"The 2022/23 Argentine drought sharply cut soy/maize output; the global feed-protein market is thin and price-sensitive.",
    src:"USDA FAS; FAO Food Outlook.", conf:"established",
    euimpact:"The protein pathway's origin. Soy and maize here become the feed behind the eggs, poultry, pork and farmed fish the UK relies on.",
    mech:"Concentrated feed exports feeding global livestock; disruption transmits up the whole animal-protein chain.",
    chain:["Drought / logistics failure","Feed soy & maize prices rise","Livestock & aquaculture costs rise","Camden: protein is dropped first under budget stress"],
    edges:["protein"]},
   {id:"S5",name:"South Asian rice",grp:"supply",kind:"pop",wt:16,lon:80,lat:21,heat:"risk",paths:["calorie"],
    region:"India (+ Pakistan · Thailand · Vietnam)",popLabel:"~40% of world rice trade, one sovereign decision",
    trigger:"Monsoon failure and unilateral export controls",
    tip:"India accounts for roughly 40% of global rice exports; its 2023 non-basmati export ban repriced the global staple almost overnight.",
    src:"USDA FAS Grain: World Markets; FAO 2023 rice-market reports.", conf:"established",
    euimpact:"A concentration risk: a huge share of a global staple sits behind one government's export policy. A ban ripples into all substitutable grains — and UK prices with them.",
    mech:"Extreme supply concentration plus monsoon dependence — a staple with a single point of political failure.",
    chain:["Monsoon failure or export ban","Global rice market tightens, buyers switch grains","Cross-staple price contagion","UK calorie-floor cost rises"],
    edges:["calorie"]},
   {id:"S6",name:"Australian wheat",grp:"supply",kind:"pop",wt:12,lon:134,lat:-28,heat:"watch",paths:["calorie"],
    region:"Australia",popLabel:"a high-variance swing wheat exporter",
    trigger:"El Niño drought",
    tip:"Australian wheat output swings by several million tonnes between El Niño (dry) and La Niña (wet) years — enough to move the global balance. Any single future-year figure is a SCENARIO, not a forecast.",
    src:"ABARES Australian Crop Report; USDA FAS. Forward magnitude illustrative.", conf:"scenario",
    euimpact:"The clearest ENSO-to-price line: Australia swings the world wheat balance, so a strong El Niño year can remove a buffer just as other breadbaskets are stressed together.",
    mech:"A high-variance swing supplier whose good and bad years amplify or dampen global tightness.",
    chain:["El Niño drought cuts the Australian crop","A global buffer is removed","World wheat tightens further","UK calorie-floor cost rises"],
    edges:["calorie"]},
   {id:"S7",name:"UK domestic production",grp:"supply",kind:"pop",wt:20,lon:-3,lat:54,heat:"watch",paths:["produce"],
    region:"United Kingdom",popLabel:"~60% self-sufficient by value, long-run decline",
    trigger:"Input costs, labour shortages, weather",
    tip:"UK food self-sufficiency has sat around 60% by value for years (down from ~78% in the 1980s); the home buffer that should absorb global shocks is thin.",
    src:"DEFRA Agriculture in the UK; DEFRA UK Food Security Report 2024.", conf:"established",
    euimpact:"The buffer that should absorb global shocks is thin. As domestic output stays flat, a larger share of every shock passes straight through to shelves.",
    mech:"The only node the UK sits on directly; its weakness is what makes the borough a near-pure consumption geography.",
    chain:["Input costs & weather limit domestic output","Self-sufficiency stays ~60% by value","Import dependence remains high","Global shocks hit Camden's shelves faster and harder"],
    edges:["produce"]},
   {id:"S8",name:"Marine & aquaculture protein",grp:"supply",kind:"pop",wt:12,lon:-77,lat:-12,heat:"risk",paths:["protein"],
    region:"Peru upwelling + N. Atlantic fisheries",popLabel:"fishmeal for feed + wild-fish protein",
    trigger:"El Niño, overfishing, warming & acidification",
    tip:"The Peruvian anchoveta — historically the world's largest single-species fishery and the basis of global fishmeal — collapses in strong El Niño years; North Atlantic stocks are shifting under warming.",
    src:"FAO State of World Fisheries & Aquaculture (SOFIA); IMARPE.", conf:"established",
    euimpact:"A double protein hit: fishmeal feeds farmed fish and livestock, and wild fish are a direct protein source.",
    mech:"A climate-triggered protein pathway that couples ocean and land protein prices through feed.",
    chain:["El Niño / overfishing cuts the fishery","Fishmeal & wild-fish supply falls","Aquaculture & livestock feed costs rise","Camden: protein supply tightens and reprices"],
    edges:["protein"]},
   {id:"C1",name:"Strait of Hormuz",grp:"sys",kind:"sys",lon:56,lat:26,heat:"watch",paths:["input"],
    region:"Persian Gulf",popLabel:"energy & LNG chokepoint + Gulf fertiliser",
    trigger:"Conflict / blockade risk in the Gulf",
    tip:"Hormuz is the world's most important oil & LNG chokepoint (~20% of global petroleum liquids). It also carries Gulf ammonia/urea fertiliser. Any specific future disruption is a SCENARIO.",
    src:"US EIA (Hormuz oil/LNG throughput); World Bank Commodity Markets. Forward disruption illustrative.", conf:"scenario",
    euimpact:"The master input chokepoint. Constraining it raises the cost of the fertiliser and energy that grow every breadbasket's crop — a delayed but broad price rise arriving a season later.",
    mech:"A single strait gating much of the world's traded gas and Gulf fertiliser — the feedstock behind next year's harvest.",
    chain:["Hormuz disrupted (scenario)","Energy & Gulf-fertiliser exports repriced","Next-season yields cut as farmers cut application","Delayed, broad food-price rise reaches the UK"],
    edges:["input"],modulates:["C2","C3","C4"]},
   {id:"C2",name:"Gas → nitrogen fertiliser",grp:"sys",kind:"sys",lon:51,lat:30,heat:"risk",paths:["input"],
    region:"Gulf & global gas producers",popLabel:"nitrogen fertiliser + gas feedstock",
    trigger:"Natural-gas prices; production halts",
    tip:"Nitrogen (urea/ammonia) is made from natural gas; the 2021–22 gas-price surge more than doubled urea prices and forced European plant shutdowns.",
    src:"World Bank Commodity Markets ('Pink Sheet'); IFA fertiliser data.", conf:"established",
    euimpact:"Nitrogen is the fertiliser that most directly sets cereal yields. A gas-driven nitrogen spike is a straight line to thinner margins and higher grain prices worldwide.",
    mech:"Gas-to-ammonia-to-urea: energy prices converted directly into the cost of growing calories.",
    chain:["Gas price surge / production halt","Nitrogen fertiliser price spikes","Cereal yields & margins squeezed","Grain prices rise into the UK"],
    edges:["input"]},
   {id:"C3",name:"Potash (Russia · Belarus · Canada)",grp:"sys",kind:"sys",lon:44,lat:55,heat:"risk",paths:["input"],
    region:"Russia · Belarus · Canada",popLabel:"a nutrient held by very few exporters",
    trigger:"Sanctions and export limits",
    tip:"Potash exports are dominated by Canada, Russia and Belarus; sanctions on the latter two (post-2022) concentrated a critical nutrient in few, contested hands.",
    src:"USGS Mineral Commodity Summaries — Potash.", conf:"established",
    euimpact:"Potash has no quick substitute and few suppliers. Restrictions here raise input costs across every crop.",
    mech:"An extreme producer-concentration risk for one of the three essential crop nutrients.",
    chain:["Sanctions / export limits on potash","A concentrated nutrient tightens globally","Fertiliser costs rise across all crops","Slow, broad food-price pressure into the UK"],
    edges:["input"]},
   {id:"C4",name:"Morocco phosphate",grp:"sys",kind:"sys",lon:-8,lat:31,heat:"watch",paths:["input"],
    region:"Morocco (+ China)",popLabel:"~70% of world phosphate-rock reserves",
    trigger:"Export policy and extreme reserve concentration",
    tip:"Morocco holds the large majority of the world's phosphate-rock reserves; China has periodically restricted phosphate exports.",
    src:"USGS Mineral Commodity Summaries — Phosphate Rock.", conf:"established",
    euimpact:"The third essential nutrient, held even more narrowly than potash. Any restriction is a slow squeeze on global yields and therefore on price.",
    mech:"A near-monopoly on a finite, non-substitutable crop nutrient.",
    chain:["Export restriction / concentration","Phosphate availability tightens","Yields and fertiliser costs affected globally","Adds to the input-driven price floor in the UK"],
    edges:["input"]},
   {id:"C5",name:"Suez / Red Sea",grp:"sys",kind:"sys",lon:34,lat:22,heat:"risk",paths:["logistics"],
    region:"Red Sea · Suez Canal",popLabel:"shipping lane for Asian & Gulf cargo",
    trigger:"Attacks and diversions round the Cape",
    tip:"From late 2023 Red Sea attacks forced many carriers to re-route round the Cape of Good Hope, adding ~10–14 days and cost to Asia–Europe cargoes, including food and fertiliser.",
    src:"IMF PortWatch; Suez Canal Authority; industry shipping reports 2023–24.", conf:"established",
    euimpact:"A logistics multiplier: it doesn't destroy supply, it delays and reprices it — raising the landed cost of rice, produce and fertiliser reaching UK ports.",
    mech:"A maritime chokepoint whose disruption lengthens and reprices whole cargo classes at once.",
    chain:["Red Sea / Suez disrupted","Cargoes re-route round the Cape","Freight cost & delay rise for food & fertiliser","Landed UK prices rise across categories"],
    edges:["logistics"],modulates:["S1","S5"]},
   {id:"C6",name:"H5N1 / livestock disease",grp:"sys",kind:"sys",lon:108,lat:40,heat:"risk",paths:["protein"],
    region:"Global (avian influenza)",popLabel:"eggs & poultry protein",
    trigger:"HPAI H5N1; spillover into other species",
    tip:"The H5N1 (clade 2.3.4.4b) panzootic has led to the culling of well over 100 million US poultry since 2022 and recurrent UK housing orders.",
    src:"USDA APHIS (US bird losses); UK APHA / DEFRA avian-influenza updates.", conf:"established",
    euimpact:"A disease pathway that bypasses climate and trade entirely: it removes protein supply directly, spiking egg and poultry prices.",
    mech:"A recurring biological shock to the protein system, independent of and additive to the climate and fertiliser pathways.",
    chain:["Avian-influenza outbreak / cull","Egg & poultry supply falls sharply","The cheapest animal protein reprices","Camden: protein deficit deepens for low-income households"],
    edges:["protein"]},
   {id:"C7",name:"El Niño / ENSO",grp:"sys",kind:"sys",lon:-140,lat:0,heat:"watch",paths:["climate"],
    region:"Tropical Pacific",popLabel:"the multi-breadbasket climate driver",
    trigger:"ENSO phase (check current WMO / NOAA status)",
    tip:"ENSO is the single climate oscillation that can correlate drought across several breadbaskets and the Pacific fishery at once. Whether a given year is El Niño, neutral or La Niña changes seasonally — check the live WMO/NOAA status; this map does not assert a specific current phase.",
    src:"WMO ENSO Updates; NOAA Climate Prediction Center. Current phase must be checked live.", conf:"scenario",
    euimpact:"The master node. El Niño is why several sources on this map can fail in the same season — it correlates drought across South America, Australia, South Asia and the Pacific fishery.",
    mech:"A single climate oscillation that synchronises otherwise-independent breadbasket and fishery risks.",
    chain:["Strong El Niño develops","Correlated drought across breadbaskets & the Pacific fishery","Multiple sources fail in one season — no diversification","A synchronised, multiplicative price shock reaches the UK"],
    edges:["climate"],modulates:["S3","S4","S5","S6","S8"]}
  ];
  const LOOP=["S2"]; // protectionism feedback: core price spike → export bans thin the Black Sea market

  let layer=null, coreLayer=null, built=false, current=null, prevView=null;
  const active=new Set(Object.keys(PATH_COLOR));
  const R={}; // id -> {dot, ring, edges:[{type,line}], mods:[lines]}
  const rOf=n=> n.kind==="sys" ? 8 : Math.max(6,Math.sqrt(n.wt)*1.5);
  const primaryType=n=>(n.edges&&n.edges[0])?n.edges[0]:"feedback";

  // slight curve so overlapping lines separate — quadratic midpoint offset
  function curve(a,b){
    const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
    const dx=b[1]-a[1], dy=b[0]-a[0];
    const off=0.12;
    const c=[mid[0]+dx*off, mid[1]-dy*off];
    const pts=[]; for(let t=0;t<=1;t+=0.1){const u=1-t;
      pts.push([u*u*a[0]+2*u*t*c[0]+t*t*b[0], u*u*a[1]+2*u*t*c[1]+t*t*b[1]]);}
    return pts;
  }

  function build(){
    if(built) return; built=true;
    layer=L.layerGroup();
    // edges + modulation
    NODES.forEach(n=>{
      const P=[n.lat,n.lon]; R[n.id]={edges:[],mods:[],dot:null,ring:null};
      (n.edges||[primaryType(n)]).forEach(type=>{
        const line=L.polyline(curve(P,CORE),{color:PATH_COLOR[type],weight:2,opacity:.5,className:"gsm-eline"});
        line.addTo(layer); R[n.id].edges.push({type,line});
      });
      (n.modulates||[]).forEach(mid=>{
        const t=NODES.find(x=>x.id===mid); if(!t)return;
        const line=L.polyline(curve(P,[t.lat,t.lon]),{color:PATH_COLOR[n.paths[0]]||"#888",weight:1.4,opacity:.35,dashArray:"3 6"});
        line.addTo(layer); R[n.id].mods.push(line);
      });
    });
    // feedback loop
    LOOP.forEach(tid=>{const t=NODES.find(x=>x.id===tid);if(!t)return;
      const line=L.polyline(curve(CORE,[t.lat,t.lon]),{color:PATH_COLOR.feedback,weight:1.4,opacity:.4,dashArray:"3 6"});
      line.addTo(layer); (R.__loop=R.__loop||{mods:[]}).mods.push(line);});
    // nodes
    NODES.forEach(n=>{
      const P=[n.lat,n.lon], r=rOf(n), [hl,hc]=HEAT_LABEL[n.heat];
      const ring=L.circleMarker(P,{radius:r+3.5,color:hc,weight:2,fill:false,opacity:.9});
      const dot=L.circleMarker(P,{radius:r,color:"#0b1420",weight:1.2,fillColor:n.grp==="sys"?"#C0504D":"#E0A030",fillOpacity:1});
      dot.bindTooltip(n.name,{permanent:false,direction:"top",className:"gsm-tt"});
      dot.on("click",e=>{L.DomEvent.stop(e);select(n.id);});
      ring.addTo(layer); dot.addTo(layer);
      R[n.id].ring=ring; R[n.id].dot=dot;
    });
    // core
    coreLayer=L.layerGroup();
    L.circleMarker(CORE,{radius:9,color:"#fff",weight:2,fillColor:"#111",fillOpacity:1}).bindTooltip("UK / Camden — the buyer",{direction:"top",className:"gsm-tt"}).addTo(coreLayer);
    coreLayer.addTo(layer);
    buildChips(); buildIndex(); setPanel(null); applyFilter();
  }

  function buildChips(){
    const tools=document.getElementById("gsm-tools"); if(!tools||tools._built)return; tools._built=true;
    [["calorie","Calories"],["protein","Protein"],["produce","Produce"],["input","Inputs"],["logistics","Logistics"],["climate","Climate"],["feedback","Feedback"]].forEach(([k,label])=>{
      const b=document.createElement("button");b.className="gsm-chip";b.setAttribute("aria-pressed","true");
      b.innerHTML=`<span class="sw" style="background:${PATH_COLOR[k]}"></span>${label}`;
      b.onclick=()=>{active.has(k)?(active.delete(k),b.setAttribute("aria-pressed","false")):(active.add(k),b.setAttribute("aria-pressed","true"));applyFilter();};
      tools.appendChild(b);
    });
  }
  function applyFilter(){
    NODES.forEach(n=>R[n.id].edges.forEach(e=>e.line.setStyle({opacity:active.has(e.type)?(current===n.id?1:.5):0})));
    const showFb=active.has("feedback");
    if(R.__loop) R.__loop.mods.forEach(l=>l.setStyle({opacity:showFb?.4:0}));
  }

  function applyHighlight(id){
    NODES.forEach(n=>{
      const rec=R[n.id], on=!id||n.id===id||(NODES.find(x=>x.id===id)?.modulates||[]).includes(n.id);
      rec.dot.setStyle({fillOpacity:on?1:.25,opacity:on?1:.25});
      rec.ring.setStyle({opacity:on?.9:.2});
      rec.edges.forEach(e=>{ if(!active.has(e.type)){e.line.setStyle({opacity:0});return;} const lit=id&&n.id===id; e.line.setStyle({opacity:id?(lit?1:.08):.5, weight:lit?3.2:2}); });
      rec.mods.forEach(l=>l.setStyle({opacity:id&&n.id===id?.9:(id?.06:.35)}));
    });
    document.querySelectorAll(".gsm-idx-row").forEach(r=>r.classList.toggle("active",r.dataset.id===id));
  }

  function setPanel(id){
    const ov=document.getElementById("sm-overview"),dt=document.getElementById("sm-detail");
    if(!id){ov.style.display="block";dt.style.display="none";document.getElementById("sm-name").textContent="Global Nutrition Supply Risk";document.getElementById("sm-region").textContent="How the world feeds Camden — and where it breaks";return;}
    const n=NODES.find(x=>x.id===id);
    ov.style.display="none";dt.style.display="block";
    document.getElementById("sm-region").textContent=n.region;
    document.getElementById("sm-name").textContent=n.name;
    const[hl,hc]=HEAT_LABEL[n.heat];
    const grpLabel=n.grp==="sys"?"Input / chokepoint — lands on supply":"Supply source — the UK imports it";
    const confBadge=n.conf==="scenario"?'<span class="gsm-conf scen">SCENARIO</span>':'<span class="gsm-conf est">ESTABLISHED</span>';
    document.getElementById("sm-meta").innerHTML=`
      <div class="gsm-mk">Class</div><div class="gsm-mv">${grpLabel}</div>
      <div class="gsm-mk">Supplies</div><div class="gsm-mv"><b>${n.popLabel}</b></div>
      <div class="gsm-mk">Trigger</div><div class="gsm-mv">${n.trigger}</div>
      <div class="gsm-mk">Status</div><div class="gsm-mv"><span class="gsm-badge" style="background:${hc}">${hl}</span> ${confBadge}</div>`;
    document.getElementById("sm-mech").innerHTML=`
      <p class="gsm-mech">${n.mech}</p>
      ${n.euimpact?`<p class="gsm-sech">Why it reaches Camden</p><p class="gsm-mech">${n.euimpact}</p>`:""}
      ${n.tip?`<p class="gsm-sech">Exposure evidence</p><p class="gsm-mech gsm-tip">${n.tip}</p>`:""}
      <p class="gsm-sech">Cascade to the UK shelf</p>
      <ul class="gsm-chain">${n.chain.map((c,i)=>`<li class="${i===n.chain.length-1?'landfall':''}">${c}</li>`).join("")}</ul>
      <p class="gsm-source"><b>Source:</b> ${n.src}</p>`;
  }
  function select(id){ current=(id===current?null:id); setPanel(current); applyHighlight(current); applyFilter(); if(current){const n=NODES.find(x=>x.id===current); if(n) map.panTo([n.lat,n.lon],{animate:true});} }

  function buildIndex(){
    const host=document.getElementById("sm-index"); if(!host||host._built)return; host._built=true;
    [["supply","Supply sources — the UK imports from them"],["sys","Input & chokepoint systems — disruption lands on supply"]].forEach(([g,label])=>{
      const h=document.createElement("div");h.className="gsm-idx-group"+(g==="sys"?" ext":"");h.textContent=label;host.appendChild(h);
      NODES.filter(n=>n.grp===g).forEach(n=>{
        const row=document.createElement("button");row.className="gsm-idx-row";row.dataset.id=n.id;
        row.innerHTML=`<span class="gsm-idx-code ${g==="sys"?"ext":""}">${n.id}</span><span class="gsm-idx-txt"><span class="gsm-idx-name">${n.name}</span><span class="gsm-idx-dep">${n.popLabel}</span></span><span class="gsm-idx-dot" style="background:${PATH_COLOR[primaryType(n)]}"></span>`;
        row.onclick=()=>select(n.id);
        host.appendChild(row);
      });
    });
  }

  window.openSupplyMap=function(){
    build();
    if(!prevView) prevView={center:map.getCenter(),zoom:map.getZoom()};
    layer.addTo(map);
    document.body.classList.add("gsm-active");
    setTimeout(()=>{ map.invalidateSize(); map.setView([28,4],2,{animate:false}); },140);
  };
  window.closeSupplyMap=function(){
    if(layer&&map.hasLayer(layer)) map.removeLayer(layer);
    document.body.classList.remove("gsm-active");
    current=null;
    if(prevView){ map.setView(prevView.center,prevView.zoom,{animate:false}); prevView=null; }
    setTimeout(()=>map.invalidateSize(),140);
  };
  document.addEventListener("keydown",e=>{
    if(!document.body.classList.contains("gsm-active"))return;
    if(e.key==="Escape"){ current?select(current):closeSupplyMap(); return; }
    if(e.key!=="ArrowRight"&&e.key!=="ArrowLeft")return;
    const i=current?NODES.findIndex(n=>n.id===current):-1;const step=e.key==="ArrowRight"?1:-1;
    const nx=NODES[(i+step+NODES.length)%NODES.length]; current=null; select(nx.id);
  });
})();
