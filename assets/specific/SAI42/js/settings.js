document.addEventListener("DOMContentLoaded", () => {
    const API_KEY = window.SAI42_API_KEY || "";
    const setupMode = String(window.SAI42_SETUP_MODE).toLowerCase() === "true";

    const settingsToggle = document.getElementById("settingsToggle");
    const settingsDropdown = document.getElementById("settingsDropdown");
    const credentialsForm = document.getElementById("credentialsForm");
    const wifiForm = document.getElementById("wifiForm");
    const scanBtn = document.getElementById("scanBtn");
    const wifiList = document.getElementById("wifiList");

    if (!setupMode) {
        document.getElementById("setupBanner").style.display = "none";
    }

    if (setupMode) {
        const logout = document.getElementById("logoutLink");
        const dash = document.getElementById("dashboardLink");
        if (logout) logout.style.display = "none";
        if (dash) dash.style.display = "none";
    }

    settingsToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        settingsToggle.classList.toggle("active");
        settingsDropdown.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".settings-wrapper")) {
            settingsDropdown.classList.remove("open");
            settingsToggle.classList.remove("active");
        }
    });

    function buildUrl(path, withToken = true) {
        if (!withToken || setupMode || !API_KEY) return path;
        const joiner = path.includes("?") ? "&" : "?";
        return `${path}${joiner}token=${encodeURIComponent(API_KEY)}`;
    }

    function show(type, message) {
        if (typeof showNotification === "function") {
            showNotification(type, message);
        } else {
            alert(message);
        }
    }

    credentialsForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("adminUsername").value.trim();
        const password = document.getElementById("adminPassword").value.trim();

        try {
            const body = new URLSearchParams({ username, password });
            if (!setupMode && API_KEY) body.append("token", API_KEY);
            const res = await fetch(buildUrl("/api/settings/credentials", false), {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to update credentials");
            show("success", "Credentials updated successfully");
            credentialsForm.reset();
        } catch (err) {
            show("error", `Error: ${err.message}`);
        }
    });

    wifiForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const ssid = document.getElementById("wifiSSID").value.trim();
        const password = document.getElementById("wifiPassword").value.trim();

        try {
            const body = new URLSearchParams({ ssid, password });
            if (!setupMode && API_KEY) body.append("token", API_KEY);
            const res = await fetch(buildUrl("/api/settings/wifi", false), {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to update WiFi");
            show("success", "WiFi saved. Device rebooting...");
        } catch (err) {
            show("error", `Error: ${err.message}`);
        }
    });

    let scanInProgress = false;

    async function scanWifi() {
        if (scanInProgress) return;

        scanInProgress = true;
        scanBtn.disabled = true;
        wifiList.innerHTML = '<div class="wifi-empty">Scanning...</div>';

        try {
            let data = null;

            for (let i = 0; i < 20; i++) {
                const res = await fetch(buildUrl("/api/wifi/scan"));
                data = await res.json();

                if (res.status === 202) {
                    await new Promise((resolve) => setTimeout(resolve, 400));
                    continue;
                }

                if (!res.ok) throw new Error(data.error || "Scan failed");
                break;
            }

            if (!data || !Array.isArray(data.networks)) {
                throw new Error("Scan timed out");
            }

            if (!data.networks.length) {
                wifiList.innerHTML = '<div class="wifi-empty">No networks found.</div>';
                return;
            }

            wifiList.innerHTML = "";
            data.networks.forEach((n) => {
                const row = document.createElement("div");
                row.className = "wifi-item";
                row.innerHTML = `<strong>${n.ssid || "<hidden>"}</strong><span class="wifi-meta">${n.rssi} dBm ${n.secure ? "| secure" : "| open"}</span>`;
                row.addEventListener("click", () => {
                    if (n.ssid) {
                        document.getElementById("wifiSSID").value = n.ssid;
                    }
                });
                wifiList.appendChild(row);
            });
        } catch (err) {
            wifiList.innerHTML = '<div class="wifi-empty">Scan failed.</div>';
            show("error", `Error: ${err.message}`);
        } finally {
            scanInProgress = false;
            scanBtn.disabled = false;
        }
    }

    scanBtn.addEventListener("click", scanWifi);
    if (setupMode) {
        scanWifi();
    }
});
