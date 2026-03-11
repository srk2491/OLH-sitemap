var map = L.map('map').setView([12.9716, 77.5946], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
attribution:'© OpenStreetMap'
}).addTo(map);

let allSites=[];
let flatReport=[];
let userLat=null;
let userLng=null;

if(navigator.geolocation){

navigator.geolocation.getCurrentPosition(function(position){

userLat=position.coords.latitude;
userLng=position.coords.longitude;

L.circleMarker([userLat,userLng],{
radius:6,
color:"red",
fillColor:"red",
fillOpacity:1
}).addTo(map).bindPopup("You are here");

});

}

function calculateDistance(lat1,lon1,lat2,lon2){

var R=6371;

var dLat=(lat2-lat1)*Math.PI/180;
var dLon=(lon2-lon1)*Math.PI/180;

var a=Math.sin(dLat/2)*Math.sin(dLat/2)+
Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
Math.sin(dLon/2)*Math.sin(dLon/2);

var c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

return R*c;

}

function renderMarkers(){

map.eachLayer(function(layer){

if(layer instanceof L.Marker || layer instanceof L.CircleMarker){

map.removeLayer(layer);

}

});

if(userLat && userLng){

L.circleMarker([userLat,userLng],{
radius:6,
color:"red",
fillColor:"red",
fillOpacity:1
}).addTo(map).bindPopup("You are here");

}

let talukValue=document.getElementById("talukFilter").value;
let searchValue=document.getElementById("searchBox").value.toLowerCase();

allSites.forEach(site=>{

if(talukValue!=="All" && site.taluk!==talukValue) return;

if(!site.grama_name_en.toLowerCase().includes(searchValue)) return;

let marker=L.marker([site.latitude,site.longitude]);

marker.bindTooltip(site.grama_name_en);

marker.on('click',function(){

map.setView([site.latitude,site.longitude],14);

const match=flatReport.find(report=>report.location_en===site.grama_name_en);

let flatInfoHtml="Data not available";

if(match){

flatInfoHtml=`
SC: ${match["SC flats"]}<br>
GEN: ${match["GEN flats"]}<br>
Minority: ${match["Min Flats"]}<br>
Total: ${match["Total"]}
`;

}

let distanceText="Unavailable";

if(userLat && userLng){

let dist=calculateDistance(userLat,userLng,site.latitude,site.longitude);
distanceText=dist.toFixed(2)+" km";

}

document.getElementById('details').innerHTML=`

<h3>${site.grama_name_en}</h3>

<small>${site.grama_name_kn}</small>

<br><br>

<b>Taluk:</b> ${site.taluk}<br>
<b>Survey:</b> ${site.survey_number}<br>
<b>Phase:</b> ${site.phase}<br>
<b>Distance:</b> ${distanceText}<br><br>

<b>Flats Available</b><br>

${flatInfoHtml}

<br><br>

<a target="_blank"
href="https://www.google.com/maps/dir/?api=1&destination=${site.latitude},${site.longitude}">

Navigate to Site

</a>

`;

});

marker.addTo(map);

});

}

Promise.all([

fetch('data/sites.json?v='+new Date().getTime()).then(res=>res.json()),

fetch('ashraya_master_report.json?v='+new Date().getTime()).then(res=>res.json())

])

.then(([sitesData,reportData])=>{

allSites=sitesData;

flatReport=reportData.flatMap(category=>category.data);

let taluks=[...new Set(sitesData.map(s=>s.taluk))];

let dropdown=document.getElementById("talukFilter");

taluks.forEach(taluk=>{

let option=document.createElement("option");
option.value=taluk;
option.text=taluk;

dropdown.appendChild(option);

});

renderMarkers();

});

document.getElementById("talukFilter").addEventListener("change",renderMarkers);

document.getElementById("searchBox").addEventListener("input",renderMarkers);