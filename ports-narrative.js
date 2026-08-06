/* ══════════════════════════════════════════════════════════════════════════
   How food reaches Camden — ports, the Short Strait, and just-in-time
   A scripted zoom narrative: global → Europe → Short Strait → Dover → Camden

   PRIMARY SOURCE for all port/mode/trailer figures below:
   DEFRA, United Kingdom Food Security Report 2021, Theme 3: Food Supply Chain
   Resilience (Indicators 3.1.3, 3.1.4, 3.1.5, 3.1.7, 3.1.9). Data year 2018
   for trade-by-port/mode; 2020 for vehicle counts; 2020-21 for HGV drivers.
   https://www.gov.uk/government/statistics/united-kingdom-food-security-report-2021
   Figures are quoted as published. Where a claim is NOT from UKFSR it is
   labelled inline with its own source.
   ════════════════════════════════════════════════════════════════════════ */
(function(){
  const UKFSR='DEFRA, UK Food Security Report 2021, Theme 3 (Food Supply Chain Resilience)';

  // ── Ports of entry. Coordinates are the real port locations. ──
  // share = % of that trade bloc's food imports where UKFSR publishes it.
  const PORTS=[
    {id:"dover", name:"Dover",              lat:51.1258, lng:1.3255, bloc:"EU", share:22,
     note:"The single biggest source of EU food imports at <b>22%</b> of the total. Handled <b>1.07m</b> road goods vehicle imports in 2020.",
     src:UKFSR+", Indicators 3.1.4 & 3.1.7", cls:"short"},
    {id:"tunnel", name:"Channel Tunnel (Folkestone)", lat:51.0944, lng:1.1600, bloc:"EU", share:null,
     note:"With Dover forms the <b>Short Strait</b> — together carrying about a quarter of all UK food imports.",
     src:UKFSR+", Indicator 3.1.5", cls:"short"},
    {id:"liverpool", name:"Liverpool",      lat:53.4490, lng:-3.0170, bloc:"non-EU", share:18,
     note:"The largest single non-EU food gateway at <b>18%</b> of non-EU food imports.",
     src:UKFSR+", Indicator 3.1.4", cls:"noneu"},
    {id:"immingham", name:"Immingham",      lat:53.6320, lng:-0.1900, bloc:"EU", share:null,
     note:"North Sea route. Part of the alternative-port capacity to the Short Strait.",
     src:UKFSR+", Indicator 3.1.7", cls:"alt"},
    {id:"lgateway", name:"London Gateway / Tilbury", lat:51.5120, lng:0.4850, bloc:"both", share:null,
     note:"Thames deep-sea container capacity serving the London market directly.",
     src:"DfT Port Freight Statistics (port location & function)", cls:"alt"},
    {id:"soton", name:"Southampton",        lat:50.8950, lng:-1.4000, bloc:"non-EU", share:null,
     note:"Major deep-sea container port — non-EU containerised food.",
     src:"DfT Port Freight Statistics", cls:"noneu"},
    {id:"felix", name:"Felixstowe",         lat:51.9550, lng:1.3200, bloc:"non-EU", share:null,
     note:"The UK's largest container port — lo-lo containerised imports.",
     src:"DfT Port Freight Statistics", cls:"noneu"},
    {id:"harwich", name:"Harwich",          lat:51.9450, lng:1.2550, bloc:"EU", share:null,
     note:"One of five alternative RoRo ports that together handled <b>220,000</b> vehicle imports in 2020 — against Dover's 1.07m.",
     src:UKFSR+", Indicator 3.1.7", cls:"alt"},
    {id:"portsmouth", name:"Portsmouth",    lat:50.8160, lng:-1.0930, bloc:"EU", share:null,
     note:"Western Channel route — significant for fresh produce from France/Spain.",
     src:UKFSR+", Indicator 3.1.7", cls:"alt"},
    {id:"hull", name:"Hull",                lat:53.7440, lng:-0.2900, bloc:"EU", share:null,
     note:"North Sea RoRo route — alternative capacity to the Short Strait.",
     src:UKFSR+", Indicator 3.1.7", cls:"alt"},
    {id:"killing", name:"Killingholme",     lat:53.6600, lng:-0.2500, bloc:"EU", share:null,
     note:"Humber RoRo terminal — alternative capacity to the Short Strait.",
     src:UKFSR+", Indicator 3.1.7", cls:"alt"},
    {id:"teesport", name:"Teesport",        lat:54.6000, lng:-1.1500, bloc:"both", share:null,
     note:"Northern bulk & container capacity.",
     src:"DfT Port Freight Statistics", cls:"alt"},
  ];

  // ── The inland leg: Short Strait → London. Approximate motorway corridor. ──
  const ROAD=[[51.1258,1.3255],[51.180,1.100],[51.230,0.870],[51.300,0.610],
              [51.370,0.420],[51.430,0.250],[51.480,0.070],[51.510,-0.060],[51.5432,-0.1436]];
  const CAMDEN=[51.5432,-0.1436];
  const NCGM=[51.4784,-0.1330]; // New Covent Garden Market

  // ── Narrative steps ──
  const STEPS=[
    {
      key:"global", title:"Camden is a consumption geography",
      view:{center:[28,4], zoom:2},
      lede:"The borough grows almost none of its own food. Nearly half of everything eaten in the UK is grown somewhere else — so the question is not whether Camden depends on distant systems, but through which few doors that dependency arrives.",
      stats:[
        {v:"46%", l:"of the food the UK consumes is imported", s:"UKFSR 2021, Indicator 3.1.3"},
        {v:"28 Mt", l:"food imported from the EU (2018)", s:"UKFSR 2021, Indicator 3.1.4"},
        {v:"11.3 Mt", l:"food imported from non-EU countries (2018)", s:"UKFSR 2021, Indicator 3.1.4"}
      ],
      body:"Turn on the global supply-risk map to see the origin systems. This narrative follows what happens <i>after</i> the harvest — the physical journey onto Camden's shelves.",
      layers:{ports:false,road:false,supply:true}
    },
    {
      key:"funnel", title:"Two blocs, a handful of doors",
      view:{center:[52.0,2.0], zoom:5},
      lede:"Food arriving from 100+ countries is funnelled through a very small number of British ports. Concentration, not distance, is the vulnerability.",
      stats:[
        {v:"58%", l:"of EU food shipments enter through just 6 ports", s:"UKFSR 2021, Indicator 3.1.4 (2018)"},
        {v:"72%", l:"of non-EU food imports enter through just 6 ports", s:"UKFSR 2021, Indicator 3.1.4"},
        {v:"18%", l:"of non-EU food comes through Liverpool alone", s:"UKFSR 2021, Indicator 3.1.4"}
      ],
      body:"Ports are sized by their published share where DEFRA reports one. <b>Orange</b> = Short Strait, <b>blue</b> = deep-sea/non-EU gateways, <b>grey</b> = the alternative RoRo ports held in reserve.",
      layers:{ports:true,road:false,supply:false}
    },
    {
      key:"strait", title:"The Short Strait — one crossing, a quarter of the food",
      view:{center:[51.05,1.30], zoom:8},
      lede:"Dover and the Channel Tunnel together form the Short Strait. It is the single densest chokepoint in Britain's food supply — and the one most exposed to a border, weather or industrial disruption.",
      stats:[
        {v:"~25%", l:"of ALL UK food imports pass through the Short Strait — about 10 million tonnes", s:"UKFSR 2021, Indicator 3.1.5"},
        {v:"12.5%", l:"of all food consumed in the UK arrives through this one crossing", s:"UKFSR 2021, Indicator 3.1.5"},
        {v:"36,000", l:"trailers a week use the Short Strait — vs 20,000 on all North Sea &amp; Western Channel routes combined", s:"UKFSR 2021, Indicator 3.1.5"}
      ],
      body:"<b>Why it matters for fresh food:</b> the Short Strait carries <b>62%</b> of EU fruit &amp; vegetable imports, <b>43%</b> of meats and <b>41%</b> of dairy — precisely the perishable, nutrient-dense categories with no shelf-life buffer. <span class='pn-src'>UKFSR 2021, Indicator 3.1.5 (2018)</span>",
      layers:{ports:true,road:false,supply:false}
    },
    {
      key:"dover", title:"Dover — 22% of Europe's food, on wheels",
      view:{center:[51.1258,1.3255], zoom:11},
      lede:"Dover is not a warehouse. It is a conveyor: lorries roll on, roll off, and drive straight to distribution centres. Nothing is stored here, which is exactly why a queue at Dover is a gap on a shelf days later.",
      stats:[
        {v:"22%", l:"of all EU food imports enter at Dover — the biggest single source", s:"UKFSR 2021, Indicator 3.1.4"},
        {v:"1.07m", l:"road goods vehicle imports through Dover in 2020", s:"UKFSR 2021, Indicator 3.1.7"},
        {v:"220,000", l:"the combined 2020 total for Harwich, Portsmouth, Immingham, Hull &amp; Killingholme — the 'alternatives' are ~5× smaller", s:"UKFSR 2021, Indicator 3.1.7"}
      ],
      body:"<b>52%</b> of EU food imports arrive roll-on/roll-off — driven, not containerised. Bulk accounts for 23%, containers and unaccompanied trailers the remaining 25%. RoRo is fast and needs no cold store, but it has no slack: the lorry <i>is</i> the warehouse. <span class='pn-src'>UKFSR 2021, Indicator 3.1.6 (2018)</span>",
      layers:{ports:true,road:false,supply:false}
    },
    {
      key:"road", title:"The road leg — and the drivers who aren't there",
      view:{center:[51.34,0.60], zoom:9},
      lede:"From the quayside the food travels by road: A2/M2 to the M25, then into London's distribution ring. This leg runs on a workforce that has been shrinking, on a network that has been slowing.",
      stats:[
        {v:"268,000", l:"HGV drivers employed (Jul 2020–Jun 2021)", s:"UKFSR 2021, Indicator 3.1.9"},
        {v:"−53,000", l:"fewer drivers than the June 2017 peak of 321,000", s:"UKFSR 2021, Indicator 3.1.9"},
        {v:"9.5 s", l:"average delay per vehicle per mile on the Strategic Road Network (2019) — up 5% since 2016", s:"UKFSR 2021, Indicator 3.1.8"}
      ],
      body:"The 2021 driver shortage showed how little redundancy sits in this leg: the same tonnage, fewer people licensed to move it. Agri-food overall employs <b>4.1 million</b> people — 13% of Great Britain's employment. <span class='pn-src'>UKFSR 2021, Indicator 3.1.9</span>",
      layers:{ports:true,road:true,supply:false}
    },
    {
      key:"camden", title:"Camden — the end of the line, with no buffer",
      view:{center:[51.5300,-0.1400], zoom:12},
      lede:"Food arrives into London's wholesale and retail distribution and reaches the borough within hours. Camden holds no reserve of its own: what is on the shelf and in the school kitchen this morning came through the chain in the last few days.",
      stats:[
        {v:"22 km²", l:"of borough with almost no agricultural land — near-total external dependency", s:"ONS boundaries; DEFRA land use"},
        {v:"40+", l:"school kitchens served daily by one contract (~8,000 meals/day)", s:"Contracts Finder camden001-DN728251"},
        {v:"No", l:"UK strategic food reserve — resilience is held as commercial stock, not state stock", s:"See integrity note below"}
      ],
      body:"<b>New Covent Garden Market</b> (marked) is the wholesale node feeding much of London's fresh produce, including institutional caterers. This is where the global map and the Camden map meet: the borough's food security is the sum of every upstream door this narrative has passed through.",
      layers:{ports:true,road:true,supply:false}
    }
  ];

  let portLayer=null, roadLayer=null, built=false, step=-1, prevView=null;

  function build(){
    if(built)return; built=true;
    portLayer=L.layerGroup();
    const COL={short:"#E8804A", noneu:"#3AAAE0", alt:"#8FA6B8"};
    PORTS.forEach(p=>{
      const r=p.share? Math.max(8,Math.sqrt(p.share)*2.6) : 7;
      const c=COL[p.cls]||"#8FA6B8";
      L.circleMarker([p.lat,p.lng],{radius:r+3,color:c,weight:2,fill:false,opacity:.75}).addTo(portLayer);
      L.circleMarker([p.lat,p.lng],{radius:r,color:"#0b1420",weight:1.2,fillColor:c,fillOpacity:.92})
        .bindTooltip(p.name+(p.share?` — ${p.share}%`:''),{direction:"top",className:"gsm-tt"})
        .bindPopup(`<b>${p.name}</b><br>${p.note}<br><span style="opacity:.6;font-size:10px">${p.src}</span>`)
        .addTo(portLayer);
    });
    // Short Strait emphasis
    L.polyline([[51.1258,1.3255],[50.9600,1.8600]],{color:"#E8804A",weight:3,opacity:.6,dashArray:"6 4"}).addTo(portLayer);
    L.polyline([[51.0944,1.1600],[50.9200,1.7100]],{color:"#E8804A",weight:2.5,opacity:.5,dashArray:"3 5"}).addTo(portLayer);
    // road leg
    roadLayer=L.layerGroup();
    L.polyline(ROAD,{color:"#E8C040",weight:3.5,opacity:.75}).addTo(roadLayer);
    ROAD.forEach((pt,i)=>{ if(i%3===0) L.circleMarker(pt,{radius:3,color:"#E8C040",fillColor:"#E8C040",fillOpacity:.9,weight:1}).addTo(roadLayer); });
    L.marker(CAMDEN,{icon:L.divIcon({className:'',html:'<div style="width:13px;height:13px;background:#fff;border:2px solid #111;box-shadow:0 1px 4px rgba(0,0,0,.6)"></div>',iconSize:[13,13],iconAnchor:[6,6]})})
      .bindTooltip("Camden — the buyer",{direction:"top",className:"gsm-tt"}).addTo(roadLayer);
    L.circleMarker(NCGM,{radius:7,color:"#F7B731",weight:2,fillColor:"#F7B731",fillOpacity:.9})
      .bindTooltip("New Covent Garden Market",{direction:"top",className:"gsm-tt"})
      .bindPopup("<b>New Covent Garden Market</b><br>London's principal fresh-produce wholesale market, Nine Elms.<br><span style='opacity:.6;font-size:10px'>Location verified; throughput figures not published in UKFSR</span>")
      .addTo(roadLayer);
  }

  function setLayers(cfg){
    if(cfg.ports){ if(!map.hasLayer(portLayer)) portLayer.addTo(map); } else if(map.hasLayer(portLayer)) map.removeLayer(portLayer);
    if(cfg.road){ if(!map.hasLayer(roadLayer)) roadLayer.addTo(map); } else if(map.hasLayer(roadLayer)) map.removeLayer(roadLayer);
    if(typeof ovState!=='undefined' && typeof togOv==='function'){
      if(cfg.supply && window.__gsmOn!==true){ /* leave global map to its own control */ }
    }
  }

  function render(){
    const s=STEPS[step]; if(!s)return;
    document.getElementById('pn-step').textContent=(step+1)+' / '+STEPS.length;
    document.getElementById('pn-title').textContent=s.title;
    document.getElementById('pn-lede').innerHTML=s.lede;
    document.getElementById('pn-stats').innerHTML=s.stats.map(x=>
      `<div class="pn-stat"><div class="pn-v">${x.v}</div><div class="pn-l">${x.l}</div><div class="pn-s">${x.s}</div></div>`).join('');
    document.getElementById('pn-body').innerHTML=s.body;
    document.querySelectorAll('.pn-dot').forEach((d,i)=>d.classList.toggle('on',i===step));
    document.getElementById('pn-prev').disabled=(step===0);
    document.getElementById('pn-next').disabled=(step===STEPS.length-1);
    setLayers(s.layers);
    flyThen(s.view.center, s.view.zoom);
  }

  // Reliable animated move: cancel any in-flight animation first, then guarantee
  // arrival (Leaflet silently drops flyTo when interrupted or on very large jumps).
  let flyGuard=null;
  function flyThen(center, zoom){
    if(flyGuard) clearTimeout(flyGuard);
    try{ map.stop(); }catch(e){}
    const far=Math.abs(map.getZoom()-zoom)>6;   // e.g. Camden(13) → world(2)
    if(far){ map.setView(center, zoom, {animate:false}); return; }
    map.flyTo(center, zoom, {duration:1.1});
    flyGuard=setTimeout(()=>{
      const c=map.getCenter();
      const off=Math.abs(map.getZoom()-zoom)>0.4 ||
                Math.abs(c.lat-center[0])>0.4 || Math.abs(c.lng-center[1])>0.4;
      if(off) map.setView(center, zoom, {animate:false});
    },1400);
  }

  window.pnGo=function(i){ if(i<0||i>=STEPS.length)return; step=i; render(); };
  window.pnNext=function(){ if(step<STEPS.length-1) pnGo(step+1); };
  window.pnPrev=function(){ if(step>0) pnGo(step-1); };

  window.openPortsNarrative=function(){
    build();
    if(!prevView) prevView={center:map.getCenter(),zoom:map.getZoom()};
    document.body.classList.add('pn-active');
    // build dots once
    const dots=document.getElementById('pn-dots');
    if(dots && !dots._built){ dots._built=true;
      STEPS.forEach((s,i)=>{const b=document.createElement('button');b.className='pn-dot';b.title=s.title;b.onclick=()=>pnGo(i);dots.appendChild(b);});
    }
    setTimeout(()=>{ map.invalidateSize(); pnGo(0); },140);
  };
  window.closePortsNarrative=function(){
    document.body.classList.remove('pn-active');
    if(portLayer&&map.hasLayer(portLayer)) map.removeLayer(portLayer);
    if(roadLayer&&map.hasLayer(roadLayer)) map.removeLayer(roadLayer);
    step=-1;
    if(prevView){ map.setView(prevView.center,prevView.zoom,{animate:false}); prevView=null; }
    setTimeout(()=>map.invalidateSize(),140);
  };
  document.addEventListener('keydown',e=>{
    if(!document.body.classList.contains('pn-active'))return;
    if(e.key==='Escape'){ closePortsNarrative(); return; }
    if(e.key==='ArrowRight'){ e.preventDefault(); pnNext(); }
    if(e.key==='ArrowLeft'){ e.preventDefault(); pnPrev(); }
  });
})();
