document.addEventListener("DOMContentLoaded", () => {
    const API_KEY = window.SAI42_API_KEY || "";
    const setupMode = String(window.SAI42_SETUP_MODE).toLowerCase() === "true";

    let latestSensorData = null;
    let chartDataInitialized = false;
    const sampleHistory = [];

    const settingsToggle = document.getElementById("settingsToggle");
    const settingsDropdown = document.getElementById("settingsDropdown");
    const toggleBtn = document.getElementById("themeToggle");
    const musicToggle = document.getElementById("musicToggle");
    const bgMusic = document.getElementById("bgMusic");

    const isDashboardPage = !!document.getElementById("sensors-chart");
    const isSettingsPage = !!document.getElementById("credentialsForm") || !!document.getElementById("wifiForm");

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function show(type, message) {
        if (typeof showNotification === "function") {
            showNotification(type, message);
        } else {
            alert(message);
        }
    }

    function buildUrl(path, withToken = true) {
        if (!withToken || setupMode || !API_KEY) return path;
        const joiner = path.includes("?") ? "&" : "?";
        return `${path}${joiner}token=${encodeURIComponent(API_KEY)}`;
    }

    // ======= Theme =======
    if (toggleBtn) {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") {
            document.body.classList.add("dark");
        }

        const renderThemeButton = () => {
            const isDark = document.body.classList.contains("dark");
            toggleBtn.innerHTML = isDark
                ? '<i class="fas fa-sun"></i> <span>Light Mode</span>'
                : '<i class="fas fa-moon"></i> <span>Dark Mode</span>';
        };

        renderThemeButton();

        function getPrimaryAxisTickColor(value, isDark) {
            return value % 50 === 0 ? (isDark ? "#7cb5ec" : "rgb(100,149,237)") : "#47c9af";
        }

        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            document.body.classList.toggle("dark");
            const isDark = document.body.classList.contains("dark");
            localStorage.setItem("theme", isDark ? "dark" : "light");
            renderThemeButton();

            // Dashboard chart theme update if chart exists.
            if (window.__SAI42_CHART__) {
                const chartH = window.__SAI42_CHART__;
                const humidityAxisColor = isDark ? "#7cb5ec" : "rgb(100,149,237)";
                const themeOpts = {
                    legend: {
                        itemStyle: {
                            color: isDark ? "#e4e4e4" : "#333"
                        },
                        itemHoverStyle: {
                            color: isDark ? "#ffffff" : "#000000"
                        }
                    },
                    xAxis: {
                        labels: {
                            style: {
                                color: isDark ? "#e4e4e4" : "#333"
                            }
                        },
                        lineColor: isDark ? "#444" : "#ddd",
                        tickColor: isDark ? "#444" : "#ddd"
                    },
                    yAxis: [{
                        labels: {
                            useHTML: true,
                            formatter: function () {
                                return `<span style="color:${getPrimaryAxisTickColor(this.value, isDark)};font-weight:bold;">${this.value}</span>`;
                            }
                        },
                        gridLineColor: isDark ? "#333" : "#eee"
                    }, {
                        labels: {
                            style: {
                                color: isDark ? "#f45b5b" : "rgb(247,38,59)"
                            }
                        },
                        gridLineColor: isDark ? "#333" : "#eee"
                    }]
                };

                chartH.update(themeOpts, true, false);
                chartH.series[0].update({
                    color: "#47c9af",
                    fillColor: isDark ? "rgba(71,201,175,0.15)" : "rgba(71,201,175,0.2)"
                }, false);
                chartH.series[1].update({
                    color: isDark ? "#f45b5b" : "rgb(247,38,59)",
                    fillColor: isDark ? "rgba(244,91,91,0.15)" : "rgba(247,38,59,0.2)"
                }, false);
                chartH.series[2].update({
                    color: humidityAxisColor,
                    fillColor: isDark ? "rgba(124,181,236,0.15)" : "rgba(100,149,237,0.2)"
                }, true);
            }
        });
    }

    // ======= Settings Dropdown =======
    if (settingsToggle && settingsDropdown) {
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
            if (!e.target.closest(".custom-select")) {
                document.querySelectorAll(".custom-select.open").forEach((s) => s.classList.remove("open"));
            }
        });
    }

    // ======= Music =======
    if (musicToggle && bgMusic) {
        let musicWasPlaying = false;

        const renderMusicButton = (isPlaying) => {
            if (isPlaying) {
                musicToggle.innerHTML = '<i class="fas fa-volume-up"></i> <span>Music</span>';
                musicToggle.classList.add("playing");
            } else {
                musicToggle.innerHTML = '<i class="fas fa-volume-mute"></i> <span>Music</span>';
                musicToggle.classList.remove("playing");
            }
        };

        const musicEnabled = localStorage.getItem("musicEnabled") === "true";
        if (musicEnabled) {
            bgMusic.play().then(() => {
                renderMusicButton(true);
            }).catch(() => {
                renderMusicButton(false);
            });
        } else {
            renderMusicButton(false);
        }

        musicToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            if (bgMusic.paused) {
                bgMusic.play().then(() => {
                    localStorage.setItem("musicEnabled", "true");
                    renderMusicButton(true);
                }).catch(() => {
                    localStorage.setItem("musicEnabled", "false");
                    renderMusicButton(false);
                });
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

    // ======= Settings Page Features =======
    if (isSettingsPage) {
        const credentialsForm = document.getElementById("credentialsForm");
        const wifiForm = document.getElementById("wifiForm");
        const scanBtn = document.getElementById("scanBtn");
        const wifiList = document.getElementById("wifiList");

        if (!setupMode) {
            const setupBanner = document.getElementById("setupBanner");
            if (setupBanner) setupBanner.style.display = "none";
        }

        if (setupMode) {
            const logout = document.getElementById("logoutLink");
            const dash = document.getElementById("dashboardLink");
            if (logout) logout.style.display = "none";
            if (dash) dash.style.display = "none";
        }

        if (credentialsForm) {
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
        }

        if (wifiForm) {
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
        }

        let scanInProgress = false;
        async function scanWifi() {
            if (scanInProgress || !scanBtn || !wifiList) return;

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
                            const ssidInput = document.getElementById("wifiSSID");
                            if (ssidInput) ssidInput.value = n.ssid;
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

        document.querySelectorAll(".eye-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const input = document.getElementById(btn.dataset.target);
                const icon = btn.querySelector("i");
                if (!input || !icon) return;
                if (input.type === "password") {
                    input.type = "text";
                    icon.classList.replace("fa-eye", "fa-eye-slash");
                } else {
                    input.type = "password";
                    icon.classList.replace("fa-eye-slash", "fa-eye");
                }
            });
        });

        const ntpStatusText = document.getElementById("ntpStatusText");
        const ntpResyncBtn = document.getElementById("ntpResyncBtn");

        async function fetchNTPStatus() {
            try {
                const res = await fetch(buildUrl("/api/system"));
                if (!res.ok) throw new Error("Failed to read NTP status");
                const data = await res.json();
                if (ntpStatusText) {
                    ntpStatusText.innerHTML = data.ntpSynced
                        ? '<i class="fas fa-check-circle" style="color:var(--success,#4caf50)"></i> Synced'
                        : '<i class="fas fa-exclamation-circle" style="color:var(--danger,#f44336)"></i> Not synced';
                }
                return data.ntpSynced;
            } catch (err) {
                if (ntpStatusText) {
                    ntpStatusText.innerHTML = '<i class="fas fa-exclamation-circle" style="color:var(--danger,#f44336)"></i> Unavailable';
                }
                throw err;
            }
        }

        if (ntpResyncBtn && ntpStatusText) {
            ntpResyncBtn.addEventListener("click", async () => {
                ntpResyncBtn.disabled = true;
                ntpStatusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting NTP resync...';
                try {
                    const res = await fetch(buildUrl("/api/ntp/resync"), { method: "POST" });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Resync failed");

                    ntpStatusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Waiting for NTP sync...';
                    for (let i = 0; i < 15; i++) {
                        await new Promise((r) => setTimeout(r, 1000));
                        const synced = await fetchNTPStatus();
                        if (synced) {
                            show("success", "NTP time sync successful");
                            ntpResyncBtn.disabled = false;
                            return;
                        }
                    }
                    ntpStatusText.innerHTML = '<i class="fas fa-exclamation-circle" style="color:var(--danger,#f44336)"></i> Sync timed out';
                    show("error", "NTP sync timed out - check network");
                } catch (err) {
                    ntpStatusText.innerHTML = '<i class="fas fa-exclamation-circle" style="color:var(--danger,#f44336)"></i> Error';
                    show("error", `Error: ${err.message}`);
                } finally {
                    ntpResyncBtn.disabled = false;
                }
            });
        }

        if (setupMode) {
            const ntpCard = document.getElementById("ntpCard");
            if (ntpCard) ntpCard.style.display = "none";
            scanWifi();
        }

        if (scanBtn) scanBtn.addEventListener("click", scanWifi);
    }

    // ======= Dashboard Page Features =======
    if (isDashboardPage) {
        function getPrimaryAxisTickColor(value, isDark) {
            return value % 50 === 0 ? (isDark ? "#7cb5ec" : "rgb(100,149,237)") : "#47c9af";
        }

        function getChartTheme() {
            const isDark = document.body.classList.contains("dark");
            return {
                chart: {
                    type: "areaspline",
                    animation: Highcharts.svg,
                    backgroundColor: "transparent"
                },
                title: { text: "" },
                legend: {
                    itemStyle: { color: isDark ? "#e4e4e4" : "#333", cursor: "pointer" },
                    itemHoverStyle: { color: isDark ? "#ffffff" : "#000000" }
                },
                xAxis: {
                    type: "datetime",
                    tickPixelInterval: 150,
                    labels: { style: { color: isDark ? "#e4e4e4" : "#333" } },
                    lineColor: isDark ? "#444" : "#ddd",
                    tickColor: isDark ? "#444" : "#ddd"
                },
                yAxis: [{
                    title: { text: "" },
                    tickPositions: [0, 25, 50, 75, 100],
                    labels: {
                        useHTML: true,
                        formatter: function () {
                            return `<span style="color:${getPrimaryAxisTickColor(this.value, isDark)};font-weight:bold;">${this.value}</span>`;
                        }
                    },
                    gridLineColor: isDark ? "#333" : "#eee"
                }, {
                    title: { text: "" },
                    tickPositions: [0, 10, 20, 30, 40],
                    opposite: true,
                    labels: { style: { color: isDark ? "#f45b5b" : "rgb(247,38,59)", fontWeight: "bold" } },
                    gridLineColor: isDark ? "#333" : "#eee"
                }],
                plotOptions: {
                    spline: {
                        lineWidth: 2,
                        marker: { enabled: true }
                    }
                },
                series: [{
                    name: "Soil Moisture",
                    data: [],
                    yAxis: 0,
                    color: "#47c9af",
                    fillColor: isDark ? "rgba(71,201,175,0.15)" : "rgba(71,201,175,0.2)"
                }, {
                    name: "Temperature",
                    data: [],
                    yAxis: 1,
                    color: isDark ? "#f45b5b" : "rgb(247,38,59)",
                    fillColor: isDark ? "rgba(244,91,91,0.15)" : "rgba(247,38,59,0.2)"
                }, {
                    name: "Humidity",
                    data: [],
                    yAxis: 0,
                    color: isDark ? "#7cb5ec" : "rgb(100,149,237)",
                    fillColor: isDark ? "rgba(124,181,236,0.15)" : "rgba(100,149,237,0.2)"
                }],
                credits: { enabled: false }
            };
        }

        let chartH = null;
        if (window.Highcharts && document.getElementById("sensors-chart")) {
            chartH = Highcharts.chart("sensors-chart", getChartTheme());
            window.__SAI42_CHART__ = chartH;
        }

        function loadChartData() {
            if (!latestSensorData || !chartH) return;
            const now = Date.now();
            const m = parseFloat(latestSensorData.moisture) || 0;
            const t = parseFloat(latestSensorData.temperature) || 0;
            const h = parseFloat(latestSensorData.humidity) || 0;
            const shouldShift = chartH.series[0].data.length >= 9;

            if (shouldShift) sampleHistory.shift();

            sampleHistory.push({
                timestamp: now,
                soilMoisture: m,
                temperature: t,
                humidity: h,
                brightness: latestSensorData.lighting || "",
                weather: latestSensorData.weather || "",
                pumpStatus: latestSensorData.pumpStatus || "",
                plantStatus: latestSensorData.plantStatus || ""
            });

            chartH.series[0].addPoint([now, m], false, shouldShift);
            chartH.series[1].addPoint([now, t], false, shouldShift);
            chartH.series[2].addPoint([now, h], true, shouldShift);
        }

        function formatCountdown(seconds) {
            if (seconds < 60) return `${seconds}s`;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${String(secs).padStart(2, "0")}`;
        }

        async function loadSchedules() {
            try {
                const response = await fetch(`/api/schedules?token=${API_KEY}`);
                if (!response.ok) return;
                const data = await response.json();
                displaySchedules(data.schedules, data.currentHour, data.currentMinute);
            } catch (e) {
                console.error("Failed to load schedules:", e);
            }
        }

        function to24Hour(hour, meridian) {
            let h = parseInt(hour);
            if (meridian === "PM" && h !== 12) h += 12;
            if (meridian === "AM" && h === 12) h = 0;
            return h;
        }

        function to12Hour(hour) {
            let h = hour % 12;
            if (h === 0) h = 12;
            const meridian = hour >= 12 ? "PM" : "AM";
            return { hour: h, meridian };
        }

        function displaySchedules(schedules, currentHour, currentMinute) {
            const list = document.getElementById("scheduleList");
            if (!list) return;

            list.innerHTML = "";
            const enabled = schedules.filter((s) => s.enabled);
            const isScheduledWatering = latestSensorData && latestSensorData.pumpStatus === "ON" && latestSensorData.wateringMode === "scheduled";

            const visibleSchedules = enabled.filter((s) => {
                if (s.repeat) return true;
                if (!s.triggered) return true;
                if (s.triggered && isScheduledWatering) return true;
                return false;
            });

            if (visibleSchedules.length === 0) {
                list.innerHTML = '<div class="no-schedules">No schedules set</div>';
                return;
            }

            visibleSchedules.forEach((s) => {
                const { hour, meridian } = to12Hour(s.hour);
                let dayLabel = "";
                let statusClass = "";

                if (currentHour !== undefined) {
                    const isAhead = s.hour > currentHour || (s.hour === currentHour && s.minute > currentMinute);
                    if (s.triggered) {
                        if (isScheduledWatering) {
                            dayLabel = "Ongoing";
                            statusClass = " ongoing";
                        } else if (s.skipped) {
                            dayLabel = "Skipped";
                            statusClass = " skipped";
                        } else {
                            dayLabel = "Done";
                        }
                    } else {
                        dayLabel = isAhead ? "Today" : "Tomorrow";
                    }
                }

                const repeatIcon = s.repeat
                    ? '<i class="fas fa-sync-alt" title="Repeats daily"></i>'
                    : '<i class="fas fa-clock" title="One-time"></i>';

                const div = document.createElement("div");
                div.className = "schedule-item" + (s.triggered ? " triggered" : "") + statusClass;
                div.innerHTML = `
            <div class="schedule-info">
               <div class="schedule-time-row">
                  <span class="schedule-time">${hour}:${String(s.minute).padStart(2, "0")} ${meridian}</span>
                  <span class="schedule-repeat">${repeatIcon}</span>
               </div>
               <span class="schedule-meta">${s.duration} min · ${dayLabel}</span>
            </div>
            <button class="schedule-delete" data-id="${s.id}" title="Delete"><i class="fas fa-trash"></i></button>
         `;
                list.appendChild(div);
            });

            list.querySelectorAll(".schedule-delete").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    e.preventDefault();
                    const id = btn.dataset.id;
                    try {
                        await fetch(`/api/schedule?token=${API_KEY}&id=${id}`, { method: "DELETE" });
                        show("info", "Info: Schedule deleted");
                        loadSchedules();
                    } catch (err) {
                        console.error("Failed to delete schedule:", err);
                    }
                });
            });
        }

        async function setSchedule() {
            const hourSelect = document.getElementById("hourSelect");
            const minuteSelect = document.getElementById("minuteSelect");
            const meridianSelect = document.getElementById("meridianSelect");
            const durationVal = document.getElementById("durationValue");
            const repeatCheckbox = document.getElementById("repeatSchedule");

            if (!hourSelect || !minuteSelect || !meridianSelect || !durationVal) return;

            const hour = to24Hour(hourSelect.value, meridianSelect.value);
            const minute = parseInt(minuteSelect.value) || 0;
            const duration = parseInt(durationVal.textContent) || 15;
            const repeat = repeatCheckbox ? repeatCheckbox.checked : true;

            try {
                const params = new URLSearchParams({
                    token: API_KEY,
                    hour,
                    minute,
                    duration,
                    enabled: "true",
                    repeat: repeat ? "true" : "false"
                });

                const response = await fetch(`/api/schedule?${params}`, { method: "POST" });
                const data = await response.json();

                if (response.ok && data.success) {
                    const { hour: h12, meridian } = to12Hour(hour);
                    const dayStr = data.triggersToday ? "Today" : "Tomorrow";
                    const notifType = data.isUpdate ? "info" : "success";
                    const minStr = String(minute).padStart(2, "0");
                    show(notifType, `Schedule: ${h12}:${minStr} ${meridian} · ${dayStr} · ${duration}min`);
                    loadSchedules();
                } else {
                    show("error", `Error: ${data.error || "Failed to set schedule"}`);
                }
            } catch (e) {
                console.error("Failed to set schedule:", e);
                show("error", "Error: Failed to set schedule");
            }
        }

        const setScheduleBtn = document.getElementById("setScheduleBtn");
        if (setScheduleBtn) setScheduleBtn.addEventListener("click", setSchedule);
        loadSchedules();
        setInterval(loadSchedules, 30000);

        const sliderHandle = document.getElementById("sliderHandle");
        const progressCircle = document.getElementById("progressCircle");
        const durationValue = document.getElementById("durationValue");
        const circularSlider = document.querySelector(".circular-slider");

        let radius = 85;
        let centerPoint = 110;
        let circumference = 2 * Math.PI * radius;
        let currentDuration = 15;
        let isDragging = false;

        function updateSliderSize() {
            if (!circularSlider) return { radius, centerPoint, circumference };
            const sliderWidth = circularSlider.offsetWidth;
            if (sliderWidth <= 200) {
                radius = 75;
                centerPoint = 90;
            } else {
                radius = 85;
                centerPoint = 110;
            }
            circumference = 2 * Math.PI * radius;

            const svg = document.querySelector(".slider-svg");
            const track = document.querySelector(".slider-track");
            const progress = document.querySelector(".slider-progress");
            if (svg && track && progress) {
                const viewBoxSize = centerPoint * 2;
                svg.setAttribute("viewBox", `0 0 ${viewBoxSize} ${viewBoxSize}`);
                track.setAttribute("cx", centerPoint);
                track.setAttribute("cy", centerPoint);
                track.setAttribute("r", radius);
                progress.setAttribute("cx", centerPoint);
                progress.setAttribute("cy", centerPoint);
                progress.setAttribute("r", radius);
            }
            return { radius, centerPoint, circumference };
        }

        function updateSlider(minutes) {
            if (!sliderHandle || !progressCircle || !durationValue) return;
            currentDuration = Math.max(0, Math.min(60, minutes));
            const sized = updateSliderSize();
            const angle = (currentDuration / 60) * 360;
            const radians = (angle - 90) * (Math.PI / 180);
            sliderHandle.style.left = `${sized.centerPoint + sized.radius * Math.cos(radians)}px`;
            sliderHandle.style.top = `${sized.centerPoint + sized.radius * Math.sin(radians)}px`;
            progressCircle.style.strokeDasharray = sized.circumference;
            progressCircle.style.strokeDashoffset = currentDuration === 0 ? sized.circumference : sized.circumference - (currentDuration / 60) * sized.circumference;
            durationValue.textContent = currentDuration;
        }

        if (sliderHandle && circularSlider) {
            ["mousedown", "touchstart"].forEach((evt) => sliderHandle.addEventListener(evt, (e) => {
                e.preventDefault();
                isDragging = true;
                sliderHandle.style.cursor = "grabbing";
            }));

            ["mouseup", "touchend"].forEach((evt) => document.addEventListener(evt, () => {
                isDragging = false;
                sliderHandle.style.cursor = "grab";
            }));

            ["mousemove", "touchmove"].forEach((evt, index) => {
                document.addEventListener(evt, (e) => {
                    if (!isDragging) return;
                    e.preventDefault();
                    const client = index === 0 ? e : e.touches[0];
                    const rect = circularSlider.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const angle = Math.atan2(client.clientY - centerY, client.clientX - centerX);
                    let degrees = (angle * 180 / Math.PI + 90 + 360) % 360;
                    let minutes = Math.round((degrees / 360) * 60 / 5) * 5;
                    if (minutes === 60) minutes = 0;
                    updateSlider(minutes);
                }, { passive: false });
            });

            updateSlider(currentDuration);
            window.addEventListener("load", () => {
                updateSliderSize();
                updateSlider(currentDuration);
            });
            window.addEventListener("resize", () => {
                updateSliderSize();
                updateSlider(currentDuration);
            });
        }

        async function waterPlant() {
            if (latestSensorData && (latestSensorData.plantStatus || "").toLowerCase() === "overwatered") {
                show("error", "Warning: Cannot water - plant is overwatered");
                return;
            }
            try {
                const duration = currentDuration || 5;
                const res = await fetch(`/water?time=${duration}&token=${API_KEY}`);
                if (!res.ok) throw new Error(res.statusText);
                setText("wateringValue", "ON");
                const btn = document.getElementById("waterButton");
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-tint"></i> Watering';
                    btn.disabled = true;
                }
                show("success", `Success: Watering for ${duration}s`);
            } catch (err) {
                console.error("Water API error", err);
                show("error", "Error: Failed to start watering");
            }
        }

        const waterButton = document.getElementById("waterButton");
        if (waterButton) waterButton.addEventListener("click", waterPlant);

        const ws = new WebSocket("ws://" + location.hostname + "/ws");
        ws.onopen = () => console.log("WebSocket open");
        ws.onerror = (e) => console.error("WebSocket error", e);
        ws.onclose = () => console.log("WebSocket closed");
        ws.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data);
                if (d.type === "schedules") {
                    displaySchedules(d.schedules, d.currentHour, d.currentMinute);
                    return;
                }

                latestSensorData = d;
                if (d.temperature >= 0) setText("temperatureValue", `${d.temperature} °C`);
                if (d.humidity >= 0) setText("humidityValue", `${d.humidity} %`);
                if (d.moisture >= 0) setText("moistureValue", `${d.moisture} %`);
                if (d.lighting) setText("lightingValue", d.lighting);
                if (d.weather) setText("weatherValue", d.weather);

                const btn = document.getElementById("waterButton");
                const span = document.getElementById("wateringValue");
                const isOver = (d.plantStatus || "").toLowerCase() === "overwatered";

                if (btn && span) {
                    if (d.pumpStatus === "ON") {
                        span.textContent = "ON";
                        let modeText = "";
                        if (d.wateringMode === "manual") modeText = " (Manual)";
                        else if (d.wateringMode === "scheduled") modeText = " (Scheduled)";
                        else if (d.wateringMode === "auto") modeText = " (Auto)";
                        const countdownStr = d.countdown > 0 ? ` (${formatCountdown(d.countdown)})` : "";
                        btn.innerHTML = `<i class="fas fa-tint"></i> Watering${countdownStr}${modeText}`;
                        btn.disabled = true;
                    } else if (isOver) {
                        btn.innerHTML = '<i class="fas fa-tint"></i> Water Plant';
                        btn.disabled = true;
                        span.textContent = "OFF";
                    } else {
                        span.textContent = "OFF";
                        btn.innerHTML = '<i class="fas fa-tint"></i> Water Plant';
                        btn.disabled = false;
                    }
                }

                const badge = document.getElementById("plantStatusBadge");
                const plantImage = document.getElementById("plantImage");
                if (badge) {
                    badge.textContent = d.plantStatus;
                    let statusColor = "#999";
                    switch ((d.plantStatus || "").toLowerCase()) {
                        case "overwatered": statusColor = "#61B8E4"; break;
                        case "healthy": statusColor = "#7DA417"; break;
                        case "thirsty": statusColor = "#F5BA0D"; break;
                        case "dry": statusColor = "#F7263B"; break;
                    }
                    badge.style.backgroundColor = statusColor;
                    badge.style.filter = `drop-shadow(0 0 20px ${statusColor})`;
                    if (plantImage) plantImage.style.filter = `drop-shadow(0 0 20px ${statusColor})`;
                }

                if (!chartDataInitialized) {
                    loadChartData();
                    chartDataInitialized = true;
                }
            } catch (err) {
                console.error("WS parse error", err);
            }
        };

        function escapeCsvValue(value) {
            const normalized = value === undefined || value === null ? "" : String(value);
            if (!/[",\n]/.test(normalized)) return normalized;
            return `"${normalized.replace(/"/g, '""')}"`;
        }

        function formatExportTimestamp(timestamp) {
            return new Date(timestamp).toLocaleString([], {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });
        }

        const exportBtn = document.getElementById("exportBtn");
        if (exportBtn) {
            exportBtn.addEventListener("click", () => {
                if (!sampleHistory.length) {
                    show("info", "Info: No data to export");
                    return;
                }
                let csv = "Timestamp,Soil Moisture (%),Temperature (degC),Humidity (%),Brightness,Weather,Pump Status,Plant Status\n";
                sampleHistory.forEach((sample) => {
                    csv += [
                        escapeCsvValue(formatExportTimestamp(sample.timestamp)),
                        sample.soilMoisture,
                        sample.temperature,
                        sample.humidity,
                        escapeCsvValue(sample.brightness),
                        escapeCsvValue(sample.weather),
                        escapeCsvValue(sample.pumpStatus),
                        escapeCsvValue(sample.plantStatus)
                    ].join(",") + "\n";
                });
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `SAI42_sensors_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                show("success", "Success: Sensor data exported");
            });
        }

        async function fetchSystemInfo() {
            try {
                const res = await fetch(`/api/system?token=${API_KEY}`);
                if (!res.ok) return;
                const d = await res.json();
                const upSec = d.uptime || 0;
                const days = Math.floor(upSec / 86400);
                const hrs = Math.floor((upSec % 86400) / 3600);
                const mins = Math.floor((upSec % 3600) / 60);
                setText("sysUptime", days > 0 ? `${days}d ${hrs}h ${mins}m` : `${hrs}h ${mins}m`);
                const rssi = d.rssi || 0;
                let signal = "Weak";
                if (rssi > -50) signal = "Excellent";
                else if (rssi > -60) signal = "Good";
                else if (rssi > -70) signal = "Fair";
                setText("sysRssi", `${rssi} dBm (${signal})`);
                const heap = d.freeHeap || 0;
                setText("sysHeap", heap > 1024 ? `${(heap / 1024).toFixed(1)} KB` : `${heap} B`);
                if (d.ip) setText("sysIp", d.ip);
            } catch (e) {
                console.error("System info error", e);
            }
        }

        fetchSystemInfo();
        setInterval(fetchSystemInfo, 15000);
        setInterval(loadChartData, 10000);
        loadChartData();

        const overlay = document.getElementById("loadingOverlay");
        const mainWrapper = document.querySelector(".main-wrapper");
        if (overlay && mainWrapper) {
            mainWrapper.style.opacity = 0;
            setTimeout(() => {
                overlay.style.opacity = 0;
                setTimeout(() => {
                    mainWrapper.style.opacity = 1;
                    setTimeout(() => {
                        overlay.style.display = "none";
                    }, 300);
                }, 150);
            }, 1500);
        }
    }
});
