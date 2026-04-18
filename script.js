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


// -------------------- COLOR --------------------

function getMarkerColor(total) {
    if (!total || total <= 0) return "#d32f2f";
    if (total <= 10) return "#f57c00";
    return "#388e3c";
}


// -------------------- ICON --------------------

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


// -------------------- LOCATION --------------------

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

        renderMarkers(); // important fix
    });
}


// -------------------- DISTANCE --------------------

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


// -------------------- LIST --------------------

function renderSiteList(sites) {

    let html = "";

    sites.forEach(site => {

        let match = flatReport.find(r => r.location_en === site.grama_name_en);
        let total = match ? parseInt(match["Total"]) || 0 : 0;

        let color = getMarkerColor(total);

        html += `
            <div onclick="selectSite(${site.id})"
            style="padding:6px; display:flex; justify-content:space-between; cursor:pointer; border-bottom:1px solid #eee;">

                <span>${site.id}. ${site.grama_name_en}</span>

                <span style="
                    width:10px;
                    height:10px;
                    background:${color};
                    border-radius:50%;
                "></span>

            </div>
        `;
    });

    document.getElementById("siteList").innerHTML = html;
}


// -------------------- SELECT --------------------

function selectSite(id) {

    let marker = markerMap[id];

    if (marker) {
        marker.fire('click');
    }
}


// -------------------- RENDER --------------------

function renderMarkers() {

    map.eachLayer(layer => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    markerMap = {};

    let taluk = document.getElementById("talukFilter").value;
    let search = document.getElementById("searchBox").value.toLowerCase();

    let filtered = allSites.filter(s => {
        if (taluk !== "All" && s.taluk !== taluk) return false;
        if (!s.grama_name_en.toLowerCase().includes(search)) return false;
        return true;
    });

    filtered.forEach(site => {

        let match = flatReport.find(r => r.location_en === site.grama_name_en);
        let total = match ? parseInt(match["Total"]) || 0 : 0;

        let marker = L.marker(
            [site.latitude, site.longitude],
            { icon: createMarkerIcon(site.id, total) }
        );

        markerMap[site.id] = marker;

        marker.on('click', function() {

            // Reset previous
            if (selectedMarker) {
                let prev = selectedMarker;
                prev.setIcon(createMarkerIcon(prev.siteId, prev.total));
            }

            // Highlight current
            marker.setIcon(createMarkerIcon(site.id, total, true));

            selectedMarker = marker;
            selectedMarker.siteId = site.id;
            selectedMarker.total = total;

            map.setView([site.latitude, site.longitude], 14);

            let dist = "N/A";
            if (userLat !== null && userLng !== null) {
                dist = calculateDistance(userLat, userLng, site.latitude, site.longitude).toFixed(2) + " km";
            }

            // 🔥 FULL DETAILS RESTORED
            document.getElementById("details").innerHTML = `

                <h3>${site.id}. ${site.grama_name_en}</h3>

                <small>${site.grama_name_kn}</small><br><br>

                <b>Taluk:</b> ${site.taluk}<br>
                <b>Survey No:</b> ${site.survey_number}<br>
                <b>Phase:</b> ${site.phase}<br>
                <b>Distance:</b> ${dist}<br><br>

                <div style="
                    background:#f1f8e9;
                    padding:8px;
                    border-radius:5px;
                    border-left:4px solid #689f38;
                ">

                    <b>Available Flats</b><br><br>

                    <table style="width:100%; font-size:13px;">

                        <tr>
                            <td>SC (ಪ.ಜಾ):</td>
                            <td style="text-align:right;"><b>${match ? match["SC flats"] : 0}</b></td>
                        </tr>

                        <tr>
                            <td>General (ಸಾಮಾನ್ಯ):</td>
                            <td style="text-align:right;"><b>${match ? match["GEN flats"] : 0}</b></td>
                        </tr>

                        <tr>
                            <td>Minority (ಅಲ್ಪಸಂಖ್ಯಾತರು):</td>
                            <td style="text-align:right;"><b>${match ? match["Min Flats"] : 0}</b></td>
                        </tr>

                        <tr style="border-top:1px solid #ccc;">
                            <td><b>Total (ಒಟ್ಟು):</b></td>
                            <td style="text-align:right;"><b>${match ? match["Total"] : 0}</b></td>
                        </tr>

                    </table>
                </div>

                <br>

                <a target="_blank"
                style="display:block; text-align:center; padding:8px; background:#1976d2; color:white; text-decoration:none; border-radius:4px;"
                href="https://www.google.com/maps/dir/?api=1&destination=${site.latitude},${site.longitude}">
                Navigate to Site
                </a>
            `;
        });

        marker.addTo(map);
    });

    renderSiteList(filtered);
}


// -------------------- LOAD --------------------

Promise.all([
    fetch('data/sites.json?v=' + new Date().getTime()).then(r => r.json()),
    fetch('ashraya_master_report.json?v=' + new Date().getTime()).then(r => r.json())
])
.then(([sites, report]) => {

    allSites = sites;
    flatReport = report.flatMap(c => c.data);

    let taluks = [...new Set(sites.map(s => s.taluk))];

    let dropdown = document.getElementById("talukFilter");

    taluks.forEach(t => {
        let opt = document.createElement("option");
        opt.value = t;
        opt.text = t;
        dropdown.appendChild(opt);
    });

    renderMarkers();
});


// -------------------- EVENTS --------------------

document.getElementById("talukFilter").addEventListener("change", renderMarkers);
document.getElementById("searchBox").addEventListener("input", renderMarkers);


// -------------------- LEGEND --------------------

var legend = L.control({ position: 'topright' });

legend.onAdd = function () {
    var div = L.DomUtil.create('div');
    div.style.background = "white";
    div.style.padding = "10px";
    div.style.fontSize = "12px";

    div.innerHTML = `
        <b>Legend</b><br><br>
        🔴 0 Flats<br>
        🟠 1–10 Flats<br>
        🟢 >10 Flats<br>
        ⚫ Selected
    `;
    return div;
};

legend.addTo(map);