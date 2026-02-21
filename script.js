var map = L.map('map').setView([12.9716, 77.5946], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let markers = L.markerClusterGroup();
let allSites = [];
let userLat = null;
let userLng = null;

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;

        L.marker([userLat, userLng])
            .addTo(map)
            .bindPopup("You are here");
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1*Math.PI/180) *
        Math.cos(lat2*Math.PI/180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function renderMarkers() {
    markers.clearLayers();

    let phaseValue = document.getElementById("phaseFilter").value;
    let talukValue = document.getElementById("talukFilter").value;
    let searchValue = document.getElementById("searchBox").value.toLowerCase();

    allSites.forEach(site => {

        if (phaseValue !== "All" && site.phase !== phaseValue) return;
        if (talukValue !== "All" && site.taluk !== talukValue) return;
        if (!site.grama_name_en.toLowerCase().includes(searchValue)) return;

        // ✅ Basic Default Leaflet Marker
        let marker = L.marker([site.latitude, site.longitude]);

        marker.bindTooltip(site.grama_name_en, { direction: "top" });

        marker.on('click', function() {

            map.setView([site.latitude, site.longitude], 14);

            let distanceText = "Location not available";

            if (userLat && userLng) {
                let dist = calculateDistance(
                    userLat,
                    userLng,
                    site.latitude,
                    site.longitude
                );
                distanceText = dist.toFixed(2) + " km";
            }

            document.getElementById('details').innerHTML = `
                <strong>${site.grama_name_en}</strong><br><br>
                Taluk: ${site.taluk}<br>
                Survey No: ${site.survey_number}<br>
                Extent: ${site.extent_acre_gunta}<br>
                Phase: ${site.phase}<br>
                Distance: ${distanceText}<br><br>
                <a target="_blank"
                   href="https://www.google.com/maps/dir/?api=1&destination=${site.latitude},${site.longitude}">
                   Navigate
                </a>
            `;
        });

        markers.addLayer(marker);
    });

    map.addLayer(markers);
}

fetch('data/sites.json')
    .then(res => res.json())
    .then(data => {
        allSites = data;

        let taluks = [...new Set(data.map(s => s.taluk))];
        let talukDropdown = document.getElementById("talukFilter");

        taluks.forEach(taluk => {
            let option = document.createElement("option");
            option.value = taluk;
            option.text = taluk;
            talukDropdown.appendChild(option);
        });

        renderMarkers();
    });

document.getElementById("phaseFilter").addEventListener("change", renderMarkers);
document.getElementById("talukFilter").addEventListener("change", renderMarkers);
document.getElementById("searchBox").addEventListener("input", renderMarkers);

