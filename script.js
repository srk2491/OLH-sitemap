var map = L.map('map').setView([12.9716, 77.5946], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let allSites = [];
let flatReport = [];
let userLat = null;
let userLng = null;

// Get User Location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;

        L.circleMarker([userLat, userLng], {
            radius: 6,
            color: "red",
            fillColor: "red",
            fillOpacity: 1
        }).addTo(map).bindPopup("You are here");
    });
}

// Distance Calculation
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

    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
            map.removeLayer(layer);
        }
    });

    if (userLat && userLng) {
        L.circleMarker([userLat, userLng], {
            radius: 6,
            color: "red",
            fillColor: "red",
            fillOpacity: 1
        }).addTo(map).bindPopup("You are here");
    }

    let talukValue = document.getElementById("talukFilter").value;
    let searchValue = document.getElementById("searchBox").value.toLowerCase();

    allSites.forEach(site => {

        if (talukValue !== "All" && site.taluk !== talukValue) return;
        if (!site.grama_name_en.toLowerCase().includes(searchValue)) return;

        let marker = L.marker(
            [site.latitude, site.longitude],
            {
                icon: L.divIcon({
                    html: `
                        <div style="
                            background:#1976d2;
                            color:white;
                            border-radius:50%;
                            width:24px;
                            height:24px;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            font-size:12px;
                            font-weight:bold;
                            border:2px solid white;
                            box-shadow:0 1px 4px rgba(0,0,0,0.4);
                        ">
                            ${site.id}
                        </div>
                    `,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }
        );

        marker.bindTooltip(site.grama_name_en, { direction: "top" });

        marker.on('click', function() {

            map.setView([site.latitude, site.longitude], 14);

            const match = flatReport.find(report => report.location_en === site.grama_name_en);

            let flatInfoHtml = `
                <div style="margin-top:10px; padding:10px; background:#fff3e0; border-left:4px solid #ff9800; border-radius:4px;">
                    <p style="margin:0; font-size:12px; color:#e65100;">Data not found in Ashraya Report</p>
                </div>`;

            if (match) {

                flatInfoHtml = `
                    <div style="margin-top:10px; padding:10px; background:#e3f2fd; border-left:4px solid #1976d2; border-radius:4px;">
                        <strong style="font-size:13px; color:#0d47a1;">Available Flats:</strong><br>

                        <table style="width:100%; font-size:12px; margin-top:5px; border-collapse:collapse;">

                        <tr>
                        <td>SC (ಪ.ಜಾ):</td>
                        <td style="text-align:right;"><b>${match["SC flats"]}</b></td>
                        </tr>

                        <tr>
                        <td>General (ಸಾಮಾನ್ಯ):</td>
                        <td style="text-align:right;"><b>${match["GEN flats"]}</b></td>
                        </tr>

                        <tr>
                        <td>Minority (ಅಲ್ಪಸಂಖ್ಯಾತರು):</td>
                        <td style="text-align:right;"><b>${match["Min Flats"]}</b></td>
                        </tr>

                        <tr style="border-top:1px solid #ccc;">
                        <td><b>Total (ಒಟ್ಟು):</b></td>
                        <td style="text-align:right;"><b>${match["Total"]}</b></td>
                        </tr>

                        </table>
                    </div>
                `;
            }

            let distanceText = "Distance calculation unavailable";

            if (userLat && userLng) {

                let dist = calculateDistance(userLat, userLng, site.latitude, site.longitude);

                distanceText = dist.toFixed(2) + " km";
            }

            document.getElementById('details').innerHTML = `

                <h3 style="margin:0 0 5px 0;">${site.grama_name_en}</h3>

                <small>${site.grama_name_kn}</small><br><br>

                <b>Taluk:</b> ${site.taluk}<br>

                <b>Survey No:</b> ${site.survey_number}<br>

                <b>Phase:</b> ${site.phase}<br>

                <b>Distance:</b> ${distanceText}<br>

                ${flatInfoHtml}

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
}


// CACHE FIX APPLIED HERE
Promise.all([
    fetch('data/sites.json?v=' + new Date().getTime()).then(res => res.json()),
    fetch('ashraya_master_report.json?v=' + new Date().getTime()).then(res => res.json())
])

.then(([sitesData, reportData]) => {

    allSites = sitesData;

    flatReport = reportData.flatMap(category => category.data);

    let taluks = [...new Set(sitesData.map(s => s.taluk))];

    let talukDropdown = document.getElementById("talukFilter");

    taluks.forEach(taluk => {

        let option = document.createElement("option");

        option.value = taluk;

        option.text = taluk;

        talukDropdown.appendChild(option);
    });

    renderMarkers();
})

.catch(err => {

    console.error("Error loading data files:", err);

    document.getElementById('details').innerHTML = "Error loading data. Please check if data/sites.json and ashraya_master_report.json exist.";
});


document.getElementById("talukFilter").addEventListener("change", renderMarkers);

document.getElementById("searchBox").addEventListener("input", renderMarkers);