document.addEventListener("DOMContentLoaded", () => {
    const isSettingsPage = !!document.getElementById("credentialsForm") || !!document.getElementById("wifiForm");
    if (!isSettingsPage) return;

    const themeToggle = document.getElementById("themeToggle");
    const musicToggle = document.getElementById("musicToggle");
    const bgMusic = document.getElementById("bgMusic");

    function renderThemeButton() {
        if (!themeToggle) return;
        const isDark = document.body.classList.contains("dark");
        themeToggle.innerHTML = isDark
            ? '<i class="fas fa-sun"></i> <span>Light Mode</span>'
            : '<i class="fas fa-moon"></i> <span>Dark Mode</span>';
    }

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
    }
    renderThemeButton();

    if (themeToggle) {
        themeToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            document.body.classList.toggle("dark");
            const isDark = document.body.classList.contains("dark");
            localStorage.setItem("theme", isDark ? "dark" : "light");
            renderThemeButton();
        });
    }

    function renderMusicButton(isPlaying) {
        if (!musicToggle) return;
        musicToggle.innerHTML = isPlaying
            ? '<i class="fas fa-volume-up"></i> <span>Music</span>'
            : '<i class="fas fa-volume-mute"></i> <span>Music</span>';
        musicToggle.classList.toggle("playing", isPlaying);
    }

    let musicWasPlaying = false;
    const musicEnabled = localStorage.getItem("musicEnabled") === "true";
    if (bgMusic && musicEnabled) {
        bgMusic.play().catch(() => { });
    }
    renderMusicButton(!!bgMusic && !bgMusic.paused);

    if (musicToggle && bgMusic) {
        musicToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            if (bgMusic.paused) {
                bgMusic.play().catch(() => { });
                localStorage.setItem("musicEnabled", "true");
                renderMusicButton(true);
            } else {
                bgMusic.pause();
                localStorage.setItem("musicEnabled", "false");
                renderMusicButton(false);
            }
        });

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                musicWasPlaying = !bgMusic.paused;
                if (musicWasPlaying) bgMusic.pause();
            } else if (musicWasPlaying && localStorage.getItem("musicEnabled") === "true") {
                bgMusic.play().catch(() => { });
            }
        });
    }

    // ======= Settings: Device Status Panel =======
    const API_KEY = window.SAI42_API_KEY || "";
    const setupMode = String(window.SAI42_SETUP_MODE).toLowerCase() === "true";
    let ntpResyncInProgress = false;

    function buildStatusUrl(path) {
        if (!setupMode && API_KEY) {
            const joiner = path.includes("?") ? "&" : "?";
            return `${path}${joiner}token=${encodeURIComponent(API_KEY)}`;
        }
        return path;
    }

    async function fetchSettingsDeviceStatus() {
        const dsUptime = document.getElementById("dsUptime");
        const dsRssi = document.getElementById("dsRssi");
        const dsHeap = document.getElementById("dsHeap");
        const dsNtp = document.getElementById("dsNtp");
        const dsIp = document.getElementById("dsIp");
        const dsWsClients = document.getElementById("dsWsClients");

        if (!dsUptime) return;

        try {
            const res = await fetch(buildStatusUrl("/api/system"));
            if (!res.ok) return;
            const d = await res.json();

            const upSec = d.uptime || 0;
            const days = Math.floor(upSec / 86400);
            const hrs = Math.floor((upSec % 86400) / 3600);
            const mins = Math.floor((upSec % 3600) / 60);
            dsUptime.textContent = days > 0 ? `${days}d ${hrs}h ${mins}m` : `${hrs}h ${mins}m`;

            const rssi = d.rssi || 0;
            let signal = "Weak";
            if (rssi > -50) signal = "Excellent";
            else if (rssi > -60) signal = "Good";
            else if (rssi > -70) signal = "Fair";
            dsRssi.textContent = `${rssi} dBm (${signal})`;

            const heap = d.freeHeap || 0;
            dsHeap.textContent = heap > 1024 ? `${(heap / 1024).toFixed(1)} KB` : `${heap} B`;

            if (!ntpResyncInProgress && dsNtp)
                dsNtp.textContent = d.ntpSynced ? "Synced" : "Not synced";

            if (dsIp) dsIp.textContent = d.ip || "Unavailable";
            if (dsWsClients) dsWsClients.textContent = d.wsClients !== undefined ? d.wsClients : "--";
        } catch (e) { /* silent – card shows dashes */ }
    }

    // ======= Settings: NTP Resync Button =======
    const dsNtpResyncBtn = document.getElementById("dsNtpResyncBtn");
    const dsNtpResyncIcon = document.getElementById("dsNtpResyncIcon");
    const dsNtpEl = document.getElementById("dsNtp");

    if (dsNtpResyncBtn) {
        dsNtpResyncBtn.addEventListener("click", async () => {
            if (ntpResyncInProgress) return;
            ntpResyncInProgress = true;
            dsNtpResyncBtn.disabled = true;
            dsNtpResyncIcon.classList.add("fa-spin");
            dsNtpEl.textContent = "Resyncing...";

            try {
                const res = await fetch(buildStatusUrl("/api/ntp/resync"), { method: "POST" });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Resync failed");

                for (let i = 0; i < 15; i++) {
                    await new Promise((r) => setTimeout(r, 1000));
                    const statusRes = await fetch(buildStatusUrl("/api/system"));
                    if (!statusRes.ok) continue;
                    const status = await statusRes.json();
                    if (status.ntpSynced) {
                        dsNtpEl.textContent = "Synced";
                        if (typeof showNotification === "function")
                            showNotification("success", "Success: NTP time synced");
                        return;
                    }
                }

                dsNtpEl.textContent = "Sync timed out";
                if (typeof showNotification === "function")
                    showNotification("error", "Error: NTP sync timed out");
            } catch (err) {
                dsNtpEl.textContent = "Error";
                if (typeof showNotification === "function")
                    showNotification("error", `Error: ${err.message}`);
            } finally {
                dsNtpResyncIcon.classList.remove("fa-spin");
                dsNtpResyncBtn.disabled = false;
                ntpResyncInProgress = false;
            }
        });
    }

    fetchSettingsDeviceStatus();
    setInterval(fetchSettingsDeviceStatus, 15000);
});
