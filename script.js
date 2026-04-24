var map = L.map('map').setView([12.9716, 77.5946], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let allSites = [];
let flatReport = [];
let userLat = null;
let userLng = null;
let selectedMarker = null;
let markerMap = {};

function getMarkerColor(total) {
    if (!total || total <= 0) return "#d32f2f";
    if (total <= 10) return "#f57c00";
    return "#388e3c";
}

function createMarkerIcon(id, total = 0, selected = false) {
    let color = selected ? "#000" : getMarkerColor(total);

    return L.divIcon({
        html: `<div style="
            background:${color};
            color:white;
            border-radius:50%;
            width:26px;
            height:26px;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:12px;
            font-weight:bold;
            border:2px solid white;
        ">${id}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });
}

/* LOCATION */
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;

        L.circleMarker([userLat, userLng], {
            radius: 6,
            color: "red",
            fillColor: "red",
            fillOpacity: 1
        }).addTo(map);

        renderMarkers();
    });
}

/* DISTANCE */
function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI/180;
    var dLon = (lon2 - lon1) * Math.PI/180;

    var a = Math.sin(dLat/2)*Math.sin(dLat/2) +
        Math.cos(lat1*Math.PI/180) *
        Math.cos(lat2*Math.PI/180) *
        Math.sin(dLon/2)*Math.sin(dLon/2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/* LIST */
function renderSiteList(sites) {
    let html = "";

    sites.forEach(site => {
        let match = flatReport.find(r => r.location_en === site.grama_name_en);
        let total = match ? parseInt(match["Total"]) || 0 : 0;

        let color = getMarkerColor(total);

        html += `
            <div onclick="selectSite(${site.id})">
                ${site.id}. ${site.grama_name_en}
                <span style="float:right;
                width:10px;height:10px;
                background:${color};
                border-radius:50%;"></span>
            </div>
        `;
    });

    document.getElementById("siteList").innerHTML = html;
}

/* SELECT */
function selectSite(id) {
    let marker = markerMap[id];
    if (marker) marker.fire('click');
}

/* RENDER */
function renderMarkers() {

    map.eachLayer(layer => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    markerMap = {};

    let filtered = allSites;

    filtered.forEach(site => {

        let match = flatReport.find(r => r.location_en === site.grama_name_en);
        let total = match ? parseInt(match["Total"]) || 0 : 0;

        let marker = L.marker(
            [site.latitude, site.longitude],
            { icon: createMarkerIcon(site.id, total) }
        );

        markerMap[site.id] = marker;

        marker.on('click', function() {

            if (selectedMarker) {
                selectedMarker.setIcon(createMarkerIcon(selectedMarker.siteId, selectedMarker.total));
            }

            marker.setIcon(createMarkerIcon(site.id, total, true));

            selectedMarker = marker;
            selectedMarker.siteId = site.id;
            selectedMarker.total = total;

            map.setView([site.latitude, site.longitude], 14);

            let dist = userLat
                ? calculateDistance(userLat, userLng, site.latitude, site.longitude).toFixed(2) + " km"
                : "N/A";

            document.getElementById("details").innerHTML = `
                <h3>${site.id}. ${site.grama_name_en}</h3>
                <b>Taluk:</b> ${site.taluk}<br>
                <b>Distance:</b> ${dist}<br>
                <b>Total:</b> ${total}
            `;

            // auto open panel on mobile
            if (window.innerWidth < 768) {
                document.getElementById("sidebar").classList.add("open");
            }
        });

        marker.addTo(map);
    });

    renderSiteList(filtered);
}

/* LOAD */
Promise.all([
    fetch('data/sites.json?v=' + new Date().getTime()).then(r => r.json()),
    fetch('ashraya_master_report.json?v=' + new Date().getTime()).then(r => r.json())
])
.then(([sites, report]) => {
    allSites = sites;
    flatReport = report.flatMap(c => c.data);
    renderMarkers();
});

/* TOGGLE */
const btn = document.getElementById("toggleBtn");
const sidebar = document.getElementById("sidebar");

btn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
});

/* ensure closed on mobile */
window.addEventListener("load", () => {
    if (window.innerWidth < 768) {
        sidebar.classList.remove("open");
    }
});
