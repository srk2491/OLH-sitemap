// ---------------- MAP ----------------

var map = L.map('map')
.setView([12.9716, 77.5946], 11);

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{
    attribution: '© OpenStreetMap'
}).addTo(map);


// ---------------- VARIABLES ----------------

let allSites = [];
let flatReport = [];
let twoBhkSites = [];

let currentMode = "1";

let userLat = null;
let userLng = null;

let selectedMarker = null;

let markerMap = {};


// ---------------- USER LOCATION ICON ----------------

function createUserLocationIcon() {

    return L.divIcon({

        className: "",

        html: `
        <div style="
            display:flex;
            align-items:center;
            gap:6px;
        ">

            <div style="
                width:16px;
                height:16px;

                background:red;

                border-radius:50%;

                border:3px solid white;

                box-shadow:0 0 6px rgba(0,0,0,0.5);
            ">
            </div>

            <div style="
                background:white;

                padding:4px 8px;

                border-radius:6px;

                font-size:12px;

                font-weight:bold;

                white-space:nowrap;

                box-shadow:0 1px 5px rgba(0,0,0,0.3);
            ">
                You are here
            </div>

        </div>
        `,

        iconSize: [120, 30],

        iconAnchor: [8, 8]
    });
}


// ---------------- LOCATION ----------------

if (navigator.geolocation) {

    navigator.geolocation.getCurrentPosition(pos => {

        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;

        // USER LOCATION MARKER
        L.marker(
            [userLat, userLng],
            {
                icon: createUserLocationIcon(),

                // prevents deletion during rerender
                isUserLocation: true
            }
        ).addTo(map);

        renderMarkers();
    });
}


// ---------------- DISTANCE ----------------

function calculateDistance(lat1, lon1, lat2, lon2) {

    var R = 6371;

    var dLat = (lat2 - lat1) * Math.PI/180;

    var dLon = (lon2 - lon1) * Math.PI/180;

    var a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +

        Math.cos(lat1*Math.PI/180) *
        Math.cos(lat2*Math.PI/180) *

        Math.sin(dLon/2) *
        Math.sin(dLon/2);

    var c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1-a)
    );

    return R * c;
}


// ---------------- SORT ----------------

function sortSitesClockwise(sites) {

    const centerLat = 12.9716;
    const centerLng = 77.5946;

    sites.forEach(site => {

        const dx =
            site.longitude - centerLng;

        const dy =
            site.latitude - centerLat;

        let angle =
            Math.atan2(dx, dy);

        if (angle < 0) {
            angle += 2 * Math.PI;
        }

        site.angle = angle;
    });

    sites.sort((a, b) =>
        a.angle - b.angle
    );

    sites.forEach((site, index) => {

        site.id = index + 1;
    });

    return sites;
}


// ---------------- COLORS ----------------

function getMarkerColor(total) {

    if (!total || total <= 0)
        return "#d32f2f";

    if (total <= 10)
        return "#f57c00";

    return "#388e3c";
}


// ---------------- ICONS ----------------

// 1BHK
function create1BhkIcon(
    id,
    total,
    selected=false
) {

    let color =
        selected
        ? "#000"
        : getMarkerColor(total);

    return L.divIcon({

        className: "",

        html: `
        <div style="
            background:${color};
            color:white;

            width:28px;
            height:28px;

            border-radius:50%;

            display:flex;

            align-items:center;

            justify-content:center;

            font-size:12px;

            font-weight:bold;

            border:2px solid white;
        ">
            ${id}
        </div>
        `,

        iconSize: [28,28],

        iconAnchor: [14,14]
    });
}


// 2BHK
function create2BhkIcon(
    id,
    name,
    selected=false
) {

    let color =
        selected
        ? "#000"
        : "#1565c0";

    return L.divIcon({

        className: "",

        html: `
        <div style="
            display:flex;
            align-items:center;
            gap:6px;
        ">

            <div style="
                background:${color};
                color:white;

                width:28px;
                height:28px;

                border-radius:50%;

                display:flex;

                align-items:center;

                justify-content:center;

                font-size:12px;

                font-weight:bold;

                border:2px solid white;

                flex-shrink:0;
            ">
                ${id}
            </div>

            <div style="
                background:white;

                padding:3px 6px;

                border-radius:5px;

                font-size:12px;

                font-weight:bold;

                white-space:nowrap;

                box-shadow:0 1px 4px rgba(0,0,0,0.3);
            ">
                ${name}
            </div>

        </div>
        `,

        iconSize: [180, 30],

        iconAnchor: [14, 14]
    });
}


// ---------------- LIST ----------------

function renderSiteList(sites) {

    let html = "";

    sites.forEach(site => {

        html += `
        <div onclick="selectSite(${site.id})">

            ${site.id}.
            ${site.name || site.grama_name_en}

        </div>
        `;
    });

    document.getElementById(
        "siteList"
    ).innerHTML = html;
}


// ---------------- SELECT ----------------

function selectSite(id) {

    let marker = markerMap[id];

    if (marker) {
        marker.fire("click");
    }
}


// ---------------- NAVIGATION ----------------

function getNavigationLink(lat, lng) {

    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}


// ---------------- RESET ----------------

function resetSelectedMarker() {

    if (!selectedMarker) return;

    // 1BHK
    if (selectedMarker.mode === "1") {

        selectedMarker.setIcon(
            create1BhkIcon(
                selectedMarker.siteId,
                selectedMarker.total,
                false
            )
        );
    }

    // 2BHK
    else {

        selectedMarker.setIcon(
            create2BhkIcon(
                selectedMarker.siteId,
                selectedMarker.siteName,
                false
            )
        );
    }

    selectedMarker = null;
}


// ---------------- RENDER ----------------

function renderMarkers() {

    map.eachLayer(layer => {

        if (
            layer instanceof L.Marker &&
            !layer.options.isUserLocation
        ) {
            map.removeLayer(layer);
        }
    });

    markerMap = {};

    let search =
        document
        .getElementById("searchBox")
        .value
        .toLowerCase();

    let taluk =
        document
        .getElementById("talukFilter")
        .value;


    // ---------------- 1BHK ----------------

    if (currentMode === "1") {

        let filtered =
            allSites.filter(site => {

            if (
                taluk !== "All" &&
                site.taluk !== taluk
            ) return false;

            if (
                !site.grama_name_en
                .toLowerCase()
                .includes(search)
            ) return false;

            return true;
        });

        filtered.forEach(site => {

            let match =
                flatReport.find(r =>

                r.location_en &&
                site.grama_name_en &&

                r.location_en
                .trim()
                .toLowerCase()

                ===

                site.grama_name_en
                .trim()
                .toLowerCase()
            );

            let total =
                match
                ? parseInt(match["Total"]) || 0
                : 0;

            let marker = L.marker(
                [site.latitude, site.longitude],
                {
                    icon: create1BhkIcon(
                        site.id,
                        total
                    )
                }
            );

            markerMap[site.id] = marker;

            marker.on("click", () => {

                resetSelectedMarker();

                marker.setIcon(
                    create1BhkIcon(
                        site.id,
                        total,
                        true
                    )
                );

                selectedMarker = marker;

                selectedMarker.mode = "1";
                selectedMarker.siteId = site.id;
                selectedMarker.total = total;

                let dist = "N/A";

                if (userLat !== null) {

                    dist =
                        calculateDistance(
                            userLat,
                            userLng,
                            site.latitude,
                            site.longitude
                        ).toFixed(2)
                        + " km";
                }

                document
                .getElementById("details")
                .innerHTML = `

                <h3>
                    ${site.id}.
                    ${site.grama_name_en}
                </h3>

                <b>Taluk:</b>
                ${site.taluk}<br>

                <b>Distance:</b>
                ${dist}<br><br>

                <b>SC:</b>
                ${match ? match["SC flats"] : 0}<br>

                <b>GEN:</b>
                ${match ? match["GEN flats"] : 0}<br>

                <b>Minority:</b>
                ${match ? match["Min Flats"] : 0}<br>

                <b>Total:</b>
                ${match ? match["Total"] : 0}

                <a
                class="nav-btn"
                target="_blank"
                href="${getNavigationLink(site.latitude, site.longitude)}">
                Navigate to Site
                </a>
                `;
            });

            marker.addTo(map);
        });

        renderSiteList(filtered);
    }


    // ---------------- 2BHK ----------------

    else {

        let filtered =
            twoBhkSites.filter(site => {

            if (
                taluk !== "All" &&
                site.taluk !== taluk
            ) return false;

            if (
                !site.name
                .toLowerCase()
                .includes(search)
            ) return false;

            return true;
        });

        filtered.forEach(site => {

            let marker = L.marker(
                [site.latitude, site.longitude],
                {
                    icon: create2BhkIcon(
                        site.id,
                        site.name
                    )
                }
            );

            markerMap[site.id] = marker;

            marker.on("click", () => {

                resetSelectedMarker();

                marker.setIcon(
                    create2BhkIcon(
                        site.id,
                        site.name,
                        true
                    )
                );

                selectedMarker = marker;

                selectedMarker.mode = "2";
                selectedMarker.siteId = site.id;
                selectedMarker.siteName = site.name;

                let dist = "N/A";

                if (userLat !== null) {

                    dist =
                        calculateDistance(
                            userLat,
                            userLng,
                            site.latitude,
                            site.longitude
                        ).toFixed(2)
                        + " km";
                }

                document
                .getElementById("details")
                .innerHTML = `

                <h3>
                    ${site.id}.
                    ${site.name}
                </h3>

                <b>Taluk:</b>
                ${site.taluk}<br>

                <b>Agency:</b>
                ${site.agency}<br>

                <b>Survey No:</b>
                ${site.survey_no}<br>

                <b>Distance:</b>
                ${dist}<br><br>

                <b>2BHK Units:</b>
                ${site.two_bhk}

                <a
                class="nav-btn"
                target="_blank"
                href="${getNavigationLink(site.latitude, site.longitude)}">
                Navigate to Site
                </a>
                `;
            });

            marker.addTo(map);
        });

        renderSiteList(filtered);
    }
}


// ---------------- LOAD ----------------

Promise.all([

    fetch(
        'data/sites.json?v='
        + new Date().getTime()
    ).then(r => r.json()),

    fetch(
        'ashraya_master_report.json?v='
        + new Date().getTime()
    ).then(r => r.json()),

    fetch(
        'data/2bhk_sites.json?v='
        + new Date().getTime()
    ).then(r => r.json())

])

.then(([sites, report, twoBhk]) => {

    allSites = sites;

    flatReport =
        report.flatMap(c => c.data);

    twoBhkSites =
        sortSitesClockwise(twoBhk);

    document.getElementById(
        "legend"
    ).style.display =
        currentMode === "1"
        ? "block"
        : "none";

    populateTaluks();

    renderMarkers();
});


// ---------------- TALUKS ----------------

function populateTaluks() {

    let data =
        currentMode === "1"
        ? allSites
        : twoBhkSites;

    let taluks = [
        ...new Set(
            data.map(s => s.taluk)
        )
    ];

    let dropdown =
    document.getElementById(
        "talukFilter"
    );

    dropdown.innerHTML =
    `<option value="All">
        All Taluks
    </option>`;

    taluks.forEach(t => {

        let opt =
        document.createElement(
            "option"
        );

        opt.value = t;

        opt.text = t;

        dropdown.appendChild(opt);
    });
}


// ---------------- EVENTS ----------------

document
.getElementById("searchBox")
.addEventListener(
    "input",
    renderMarkers
);

document
.getElementById("talukFilter")
.addEventListener(
    "change",
    renderMarkers
);

document
.getElementById("bhkFilter")
.addEventListener(
    "change",
    function() {

        currentMode = this.value;

        document.getElementById(
            "legend"
        ).style.display =
            currentMode === "1"
            ? "block"
            : "none";

        resetSelectedMarker();

        populateTaluks();

        renderMarkers();
    }
);


// ---------------- MOBILE ----------------

const btn =
document.getElementById(
    "toggleBtn"
);

const sidebar =
document.getElementById(
    "sidebar"
);

btn.addEventListener("click", () => {

    sidebar.classList.toggle(
        "open"
    );
});

window.addEventListener("load", () => {

    if (window.innerWidth < 768) {

        sidebar.classList.remove(
            "open"
        );
    }
});
