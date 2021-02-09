/**
 * Properly case system names based on a general rule and some esoteric rules.
 *
 * **Rules**:
 * * hip -> HIP
 * * ab-c -> AB-C
 */
String.prototype.toSystemCase = function () {
    const lowercase = this.toLowerCase();
    const words = lowercase.split(" ");
    const capitalizedWords = words.map((word) => {
        switch (word) {
            case "hip":
                return "HIP";
            default:
                if (word[2] === "-") {
                    return word.toUpperCase();
                }

                let letters = word.split("");
                let firstLetter = letters.shift();
                firstLetter = firstLetter.toUpperCase();
                letters.unshift(firstLetter);
                return letters.join("");
        }
    });

    return capitalizedWords.join(" ");
};

/**
 * Returns a float distance between two systems.
 * @param {number} x1 First system's x coord
 * @param {number} y1 First system's y coord
 * @param {number} z1 First system's z coord
 * @param {number} x2 Second system's x coord
 * @param {number} y2 Second system's y coord
 * @param {number} z2 Second system's z coord
 */
function calcSystemDist(x1, y1, z1, x2, y2, z2) {
    return Math.sqrt(
        Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2)
    );
}

/**
 * Transforms the array of `site` data, so that:
 * * `Systems` are now the top level data, which have
 *     * `Bodies` as a nested array, each with body data, under which
 *         * `Sites` are a nested array.
 *
 * @param {array} canonnData Array of sites from the canonn API
 *
 * @returns {array} `[{...system, bodies: [{...body, sites: [{...site}]}]}]`
 */
function transformCanonnData(canonnData) {
    let transformedData = [];

    for (site of canonnData) {
        const siteData = { ...site };
        delete siteData.system;
        delete siteData.body;

        const system = transformedData.find(
            (entry) => site.system.id === entry.id
        );

        // System does not exist already?
        if (system === undefined) {
            // Create it, and the body and add the site to it
            const systemData = Object.assign({}, site.system);
            const bodyData = Object.assign({}, site.body);

            bodyData.sites = [];
            bodyData.sites.push(siteData);
            systemData.bodies = [];
            systemData.bodies.push(bodyData);

            transformedData.push(systemData);
        } else {
            const body = system.bodies.find(
                (entry) => site.body.id === entry.id
            );

            // Body does not exist already?
            if (body === undefined) {
                // Create it and add the site to it
                const bodyData = Object.assign({}, site.body);

                bodyData.sites = [];
                bodyData.sites.push(siteData);
                system.bodies.push(bodyData);
            } else {
                // Just add the site to the bodies
                body.sites.push(siteData);
            }
        }
    }

    return transformedData;
}

function expandSystemOptions(searchString) {
    fetch(
        `https://eddb.io/system/search?system[name]=${searchString}&system[version]=2`
    )
        .then((response) => response.json())
        .then((systems) => {
            systemSearchList.innerHTML = "";
            for (system of systems) {
                const dataListOption = document.createElement("option");
                dataListOption.value = system.id;
                dataListOption.innerText = system.name;

                function setRefSystem(name, id) {
                    referenceSystemInput.dataset["systemId"] = id;
                    referenceSystemInput.value = name;
                }

                dataListOption.addEventListener("click", () => {
                    setRefSystem(
                        dataListOption.innerText,
                        dataListOption.value
                    );
                });

                dataListOption.addEventListener("dblclick", () => {
                    setRefSystem(
                        dataListOption.innerText,
                        dataListOption.value
                    );
                    fetchData();
                });

                systemSearchList.appendChild(dataListOption);
            }
        })
        .catch((error) => console.log(error));
}

function buildHtml(data, refSystemCoords, root) {
    root.innerHTML = "";

    for ([idx, system] of data.entries()) {
        const systemCoords = {
            x: system.edsmCoordX,
            y: system.edsmCoordY,
            z: system.edsmCoordZ,
        };

        data[idx].distanceToRef = calcSystemDist(
            systemCoords.x,
            systemCoords.y,
            systemCoords.z,
            refSystemCoords.x,
            refSystemCoords.y,
            refSystemCoords.z
        ).toFixed(2);
    }

    const sortedData = data.sort((a, b) => a.distanceToRef - b.distanceToRef);

    for (system of sortedData) {
        // System
        const systemDetails = document.createElement("details");
        const systemSummary = document.createElement("summary");
        const systemContent = document.createElement("div");

        systemDetails.classList.add("system-collapse");
        systemSummary.classList.add("system-collapse-name");
        systemContent.classList.add("system-collapse-content");

        const systemName = document.createElement("span");
        const systemDistanceToRef = document.createElement("span");
        systemName.innerHTML = `<i class="fa fa-dot-circle-o" style="color: #dedede;"></i> ${system.systemName.toSystemCase()}`;
        systemDistanceToRef.innerText = system.distanceToRef + " ly";

        systemSummary.appendChild(systemName);
        systemSummary.appendChild(systemDistanceToRef);
        systemDetails.appendChild(systemSummary);

        for (body of system.bodies) {
            //Body
            const bodyDetails = document.createElement("details");
            const bodySummary = document.createElement("summary");
            const bodyContent = document.createElement("div");

            bodyDetails.classList.add("body-collapse");
            bodySummary.classList.add("body-collapse-name");
            bodyContent.classList.add("body-collapse-content");

            const bodyName = document.createElement("span");
            const bodyDistanceToArrival = document.createElement("span");
            bodyName.innerHTML = `<i class="fa fa-globe"></i> ${body.bodyName.toSystemCase()}`;
            bodyDistanceToArrival.innerText =
                body.distanceToArrival.toLocaleString("us") + " ls";

            bodySummary.appendChild(bodyName);
            bodySummary.appendChild(bodyDistanceToArrival);
            bodyDetails.appendChild(bodySummary);

            // Site Table
            const siteTable = document.createElement("table");
            const siteTHead = document.createElement("thead");
            const siteTBody = document.createElement("tbody");

            // Table Headers
            const siteHeaders = document.createElement("tr");

            const siteLat = document.createElement("th");
            siteLat.innerText = "Latitude";

            const siteLon = document.createElement("th");
            siteLon.innerText = "Longitude";

            const siteBarnacleType = document.createElement("th");
            siteBarnacleType.innerText = "Barnacle Type";

            siteHeaders.appendChild(siteBarnacleType);
            siteHeaders.appendChild(siteLat);
            siteHeaders.appendChild(siteLon);
            siteTHead.appendChild(siteHeaders);

            for (site of body.sites) {
                // Site
                // Table Body
                const siteDataRow = document.createElement("tr");

                const siteLat = document.createElement("td");
                siteLat.innerText = site.latitude;

                const siteLon = document.createElement("td");
                siteLon.innerText = site.longitude;

                const siteBarnacleType = document.createElement("td");
                siteBarnacleType.innerText = site.type.type;

                siteDataRow.appendChild(siteBarnacleType);
                siteDataRow.appendChild(siteLat);
                siteDataRow.appendChild(siteLon);

                siteTBody.appendChild(siteDataRow);
            }

            siteTable.appendChild(siteTHead);
            siteTable.appendChild(siteTBody);

            bodyContent.appendChild(siteTable);
            bodyDetails.appendChild(bodyContent);
            systemContent.appendChild(bodyDetails);
            systemDetails.appendChild(systemContent);
        }

        root.appendChild(systemDetails);
    }
}

function fetchData(refSystem) {
    fetch(
        `https://eddbapi.kodeblox.com/api/v4/systems?name=${encodeURIComponent(
            refSystem
        )}`
    )
        .then((response) => response.json())
        .then((systemResults) => {
            const system = systemResults.docs[0];

            fetch("https://api.canonn.tech/tbsites?_limit=10000")
                .then((response) => response.json())
                .then((data) => {
                    const filteredData = data.filter((system) => {
                        switch (barnacleTypeSelect.value) {
                            case "unknown":
                                return system.type.type === "Unknown";
                                break;
                            case "common":
                                return (
                                    system.type.type ===
                                    "Common Thargoid Barnacle"
                                );
                                break;
                            case "large":
                                return (
                                    system.type.type ===
                                    "Large Thargoid Barnacle"
                                );
                                break;
                            default:
                                return true;
                        }
                    });

                    buildHtml(
                        transformCanonnData(filteredData),
                        {
                            x: system.x,
                            y: system.y,
                            z: system.z,
                        },
                        dataTarget
                    );
                })
                .catch((error) =>
                    console.log("Fetching from API failed.", error)
                );
        })
        .catch((error) => console.log(error));
}

// ================================================================
// START
// ================================================================
const systemSearchInput = document.getElementById("reference-system-search");
const referenceSystemInput = document.getElementById("selected-ref");
const systemSearchList = document.getElementById("system-search-list");
const queryCanonnButton = document.getElementById("get-data");
const barnacleTypeSelect = document.getElementById("barnacle-type");
const dataTarget = document.getElementById("data-target");

queryCanonnButton.addEventListener("click", () =>
    fetchData(referenceSystemInput.value)
);

systemSearchInput.addEventListener("change", () =>
    expandSystemOptions(systemSearchInput.value)
);
