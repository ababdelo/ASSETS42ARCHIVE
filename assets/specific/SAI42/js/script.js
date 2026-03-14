document.addEventListener("DOMContentLoaded", () => {
    const API_KEY = window.SAI42_API_KEY || "";
    const setupMode = String(window.SAI42_SETUP_MODE).toLowerCase() === "true";
    let latestSensorData = null;
    let chartDataInitialized = false;
    const sampleHistory = [];

    const isDashboardPage = !!document.getElementById('sensors-chart');
    if (!isDashboardPage) return;

    // ======= Restore Theme First =======
    const savedTheme = localStorage.getItem("theme");
    const toggleBtn = document.getElementById("themeToggle");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        toggleBtn.innerHTML = '<i class="fas fa-sun"></i> <span>Light Mode</span>';
    }

    // ======= Settings Dropdown =======
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsDropdown = document.getElementById('settingsDropdown');

    settingsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsToggle.classList.toggle('active');
        settingsDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.settings-wrapper')) {
            settingsDropdown.classList.remove('open');
            settingsToggle.classList.remove('active');
        }
        if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
        }
    });

    // ======= Custom Select Dropdowns =======
    document.querySelectorAll('.custom-select').forEach(select => {
        const trigger = select.querySelector('.select-trigger');
        const options = select.querySelectorAll('.select-options li');
        const hidden = select.querySelector('input[type="hidden"]');
        const triggerSpan = trigger.querySelector('span');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = select.classList.contains('open');
            document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
            if (!isOpen) select.classList.add('open');
        });

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                hidden.value = opt.dataset.value;
                triggerSpan.textContent = opt.textContent;
                select.classList.remove('open');
            });
        });
    });

    // ======= Highcharts Theme =======
    function getPrimaryAxisTickColor(value, isDark) {
        return value % 50 === 0 ? (isDark ? '#7cb5ec' : 'rgb(100,149,237)') : '#47c9af';
    }

    function getChartTheme() {
        const isDark = document.body.classList.contains('dark');
        return {
            chart: {
                type: 'areaspline',
                animation: Highcharts.svg,
                backgroundColor: 'transparent'
            },
            title: {
                text: ''
            },
            legend: {
                itemStyle: {
                    color: isDark ? '#e4e4e4' : '#333',
                    cursor: 'pointer'
                },
                itemHoverStyle: {
                    color: isDark ? '#ffffff' : '#000000'
                }
            },
            xAxis: {
                type: 'datetime',
                tickPixelInterval: 150,
                labels: {
                    style: {
                        color: isDark ? '#e4e4e4' : '#333'
                    }
                },
                lineColor: isDark ? '#444' : '#ddd',
                tickColor: isDark ? '#444' : '#ddd'
            },
            yAxis: [{
                title: {
                    text: ''
                },
                tickPositions: [0, 25, 50, 75, 100],
                labels: {
                    useHTML: true,
                    formatter: function () {
                        return `<span style="color:${getPrimaryAxisTickColor(this.value, isDark)};font-weight:bold;">${this.value}</span>`;
                    }
                },
                gridLineColor: isDark ? '#333' : '#eee'
            }, {
                title: {
                    text: ''
                },
                tickPositions: [0, 10, 20, 30, 40],
                opposite: true,
                labels: {
                    style: {
                        color: isDark ? '#f45b5b' : 'rgb(247,38,59)',
                        fontWeight: 'bold'
                    }
                },
                gridLineColor: isDark ? '#333' : '#eee'
            }],
            plotOptions: {
                spline: {
                    lineWidth: 2,
                    marker: {
                        enabled: true
                    }
                }
            },
            series: [{
                name: 'Soil Moisture',
                data: [],
                yAxis: 0,
                color: isDark ? '#47c9af' : '#47c9af',
                fillColor: isDark ? 'rgba(71,201,175,0.15)' : 'rgba(71,201,175,0.2)'
            }, {
                name: 'Temperature',
                data: [],
                yAxis: 1,
                color: isDark ? '#f45b5b' : 'rgb(247,38,59)',
                fillColor: isDark ? 'rgba(244,91,91,0.15)' : 'rgba(247,38,59,0.2)'
            }, {
                name: 'Humidity',
                data: [],
                yAxis: 0,
                color: isDark ? '#7cb5ec' : 'rgb(100,149,237)',
                fillColor: isDark ? 'rgba(124,181,236,0.15)' : 'rgba(100,149,237,0.2)'
            }],
            credits: {
                enabled: false
            }
        };
    }

    // ======= Initialize Chart =======
    let chartH = Highcharts.chart('sensors-chart', getChartTheme());

    // ======= WebSocket for Live Sensor Data =======
    const ws = new WebSocket('ws://' + location.hostname + '/ws');
    ws.onopen = () => console.log('WebSocket open');
    ws.onerror = e => console.error('WebSocket error', e);
    ws.onclose = () => console.log('WebSocket closed');

    ws.onmessage = e => {
        try {
            const d = JSON.parse(e.data);

            // Handle schedule updates from other clients
            if (d.type === 'schedules') {
                displaySchedules(d.schedules, d.currentHour, d.currentMinute);
                return;
            }

            // Handle sensor data updates
            latestSensorData = d;

            if (d.temperature >= 0) document.getElementById('temperatureValue').textContent = `${d.temperature} °C`;
            if (d.humidity >= 0) document.getElementById('humidityValue').textContent = `${d.humidity} %`;
            if (d.moisture >= 0) document.getElementById('moistureValue').textContent = `${d.moisture} %`;
            if (d.lighting) document.getElementById('lightingValue').textContent = d.lighting;
            if (d.weather) document.getElementById('weatherValue').textContent = d.weather;

            const btn = document.getElementById('waterButton');
            const span = document.getElementById('wateringValue');
            const isOver = (d.plantStatus || '').toLowerCase() === 'overwatered';

            if (d.pumpStatus === 'ON') {
                span.textContent = 'ON';
                let modeText = '';
                if (d.wateringMode === 'manual') modeText = ' (Manual)';
                else if (d.wateringMode === 'scheduled') modeText = ' (Scheduled)';
                else if (d.wateringMode === 'auto') modeText = ' (Auto)';
                const countdownStr = d.countdown > 0 ? ` (${formatCountdown(d.countdown)})` : '';
                btn.innerHTML = `<i class="fas fa-tint"></i> Watering${countdownStr}${modeText}`;
                btn.disabled = true;
            } else if (isOver) {
                btn.innerHTML = `<i class="fas fa-tint"></i> Water Plant`;
                btn.disabled = true;
                span.textContent = 'OFF';
            } else {
                span.textContent = 'OFF';
                btn.innerHTML = `<i class="fas fa-tint"></i> Water Plant`;
                btn.disabled = false;
            }

            const badge = document.getElementById('plantStatusBadge');
            badge.textContent = d.plantStatus;
            let statusColor = '#999';
            switch ((d.plantStatus || '').toLowerCase()) {
                case 'overwatered':
                    statusColor = '#61B8E4';
                    break;
                case 'healthy':
                    statusColor = '#7DA417';
                    break;
                case 'thirsty':
                    statusColor = '#F5BA0D';
                    break;
                case 'dry':
                    statusColor = '#F7263B';
                    break;
            }
            badge.style.backgroundColor = statusColor;
            badge.style.filter = `drop-shadow(0 0 20px ${statusColor})`;
            document.getElementById('plantImage').style.filter = `drop-shadow(0 0 20px ${statusColor})`;

            if (!chartDataInitialized) {
                loadChartData();
                chartDataInitialized = true;
            }
        } catch (err) {
            console.error('WS parse error', err);
        }
    };

    function loadChartData() {
        if (!latestSensorData) return;
        const now = Date.now();
        const m = parseFloat(latestSensorData.moisture) || 0;
        const t = parseFloat(latestSensorData.temperature) || 0;
        const h = parseFloat(latestSensorData.humidity) || 0;
        const shouldShift = chartH.series[0].data.length >= 9;

        if (shouldShift) {
            sampleHistory.shift();
        }

        sampleHistory.push({
            timestamp: now,
            soilMoisture: m,
            temperature: t,
            humidity: h,
            brightness: latestSensorData.lighting || '',
            weather: latestSensorData.weather || '',
            pumpStatus: latestSensorData.pumpStatus || '',
            plantStatus: latestSensorData.plantStatus || ''
        });

        chartH.series[0].addPoint([now, m], false, shouldShift);
        chartH.series[1].addPoint([now, t], false, shouldShift);
        chartH.series[2].addPoint([now, h], true, shouldShift);
    }

    function escapeCsvValue(value) {
        const normalized = value === undefined || value === null ? '' : String(value);
        if (!/[",\n]/.test(normalized)) {
            return normalized;
        }
        return `"${normalized.replace(/"/g, '""')}"`;
    }

    function formatExportTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString([], {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // ======= Water Plant API =======
    async function waterPlant() {
        // Block watering if overwatered
        if (latestSensorData && (latestSensorData.plantStatus || '').toLowerCase() === 'overwatered') {
            showNotification('error', 'Warning: Cannot water - plant is overwatered');
            return;
        }

        try {
            const duration = currentDuration || 5;
            const res = await fetch(`/water?time=${duration}&token=${API_KEY}`);
            if (!res.ok) throw new Error(res.statusText);
            document.getElementById('wateringValue').textContent = 'ON';
            const btn = document.getElementById('waterButton');
            btn.innerHTML = `<i class="fas fa-tint"></i> Watering`;
            btn.disabled = true;
            showNotification('success', `Success: Watering for ${duration}s`);
        } catch (err) {
            console.error('Water API error', err);
            showNotification('error', 'Error: Failed to start watering');
        }
    }
    document.getElementById('waterButton').addEventListener('click', waterPlant);

    // ======= Schedule Functions =======

    function to24Hour(hour, meridian) {
        let h = parseInt(hour);
        if (meridian === 'PM' && h !== 12) h += 12;
        if (meridian === 'AM' && h === 12) h = 0;
        return h;
    }

    function to12Hour(hour) {
        let h = hour % 12;
        if (h === 0) h = 12;
        const meridian = hour >= 12 ? 'PM' : 'AM';
        return {
            hour: h,
            meridian
        };
    }

    // Format seconds as m:ss or just Xs for short durations
    function formatCountdown(seconds) {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }

    async function loadSchedules() {
        try {
            const response = await fetch(`/api/schedules?token=${API_KEY}`);
            if (!response.ok) return;
            const data = await response.json();
            displaySchedules(data.schedules, data.currentHour, data.currentMinute);
        } catch (e) {
            console.error('Failed to load schedules:', e);
        }
    }

    function displaySchedules(schedules, currentHour, currentMinute) {
        const list = document.getElementById('scheduleList');
        if (!list) return;

        list.innerHTML = '';
        const enabled = schedules.filter(s => s.enabled);

        // Check if we're currently in scheduled watering
        const isScheduledWatering = latestSensorData &&
            latestSensorData.pumpStatus === 'ON' &&
            latestSensorData.wateringMode === 'scheduled';

        // Filter out one-time schedules that are done (triggered but not ongoing)
        const visibleSchedules = enabled.filter(s => {
            // If it's a repeating schedule, always show it
            if (s.repeat) return true;
            // If it's not triggered yet, show it
            if (!s.triggered) return true;
            // If it's currently ongoing (one-time and watering now), show it
            if (s.triggered && isScheduledWatering) return true;
            // One-time schedule that's done (triggered but not ongoing) - hide it
            return false;
        });

        if (visibleSchedules.length === 0) {
            list.innerHTML = '<div class="no-schedules">No schedules set</div>';
            return;
        }

        visibleSchedules.forEach(s => {
            const {
                hour,
                meridian
            } = to12Hour(s.hour);

            let dayLabel = '';
            let statusClass = '';

            if (currentHour !== undefined) {
                const isAhead = s.hour > currentHour || (s.hour === currentHour && s.minute > currentMinute);

                if (s.triggered) {
                    if (isScheduledWatering) {
                        dayLabel = 'Ongoing';
                        statusClass = ' ongoing';
                    } else if (s.skipped) {
                        dayLabel = 'Skipped';
                        statusClass = ' skipped';
                    } else {
                        dayLabel = 'Done';
                    }
                } else {
                    dayLabel = isAhead ? 'Today' : 'Tomorrow';
                }
            }

            const repeatIcon = s.repeat ?
                '<i class="fas fa-sync-alt" title="Repeats daily"></i>' :
                '<i class="fas fa-clock" title="One-time"></i>';

            const div = document.createElement('div');
            div.className = 'schedule-item' + (s.triggered ? ' triggered' : '') + statusClass;
            div.innerHTML = `
            <div class="schedule-info">
               <div class="schedule-time-row">
                  <span class="schedule-time">${hour}:${String(s.minute).padStart(2, '0')} ${meridian}</span>
                  <span class="schedule-repeat">${repeatIcon}</span>
               </div>
               <span class="schedule-meta">${s.duration} min · ${dayLabel}</span>
            </div>
            <button class="schedule-delete" data-id="${s.id}" title="Delete"><i class="fas fa-trash"></i></button>
         `;
            list.appendChild(div);
        });

        list.querySelectorAll('.schedule-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = btn.dataset.id;
                try {
                    await fetch(`/api/schedule?token=${API_KEY}&id=${id}`, {
                        method: 'DELETE'
                    });
                    showNotification('info', 'Info: Schedule deleted');
                    loadSchedules();
                } catch (err) {
                    console.error('Failed to delete schedule:', err);
                }
            });
        });
    }

    async function setSchedule() {
        const hourSelect = document.getElementById('hourSelect');
        const minuteSelect = document.getElementById('minuteSelect');
        const meridianSelect = document.getElementById('meridianSelect');
        const durationVal = document.getElementById('durationValue');
        const repeatCheckbox = document.getElementById('repeatSchedule');

        if (!hourSelect || !minuteSelect || !meridianSelect || !durationVal) return;

        const hour = to24Hour(hourSelect.value, meridianSelect.value);
        const minute = parseInt(minuteSelect.value) || 0;
        const duration = parseInt(durationVal.textContent) || 15;
        const repeat = repeatCheckbox ? repeatCheckbox.checked : true;

        try {
            const params = new URLSearchParams({
                token: API_KEY,
                hour: hour,
                minute: minute,
                duration: duration,
                enabled: 'true',
                repeat: repeat ? 'true' : 'false'
            });

            const response = await fetch(`/api/schedule?${params}`, {
                method: 'POST'
            });
            const data = await response.json();

            if (response.ok && data.success) {
                const {
                    hour: h12,
                    meridian
                } = to12Hour(hour);
                const dayStr = data.triggersToday ? 'Today' : 'Tomorrow';
                const repeatIcon = repeat ? '<i class="fas fa-sync-alt"></i>' : '<i class="fas fa-clock"></i>';
                const notifType = data.isUpdate ? 'info' : 'success';
                const minStr = String(minute).padStart(2, '0');
                showNotification(notifType, `Schedule: ${h12}:${minStr} ${meridian} · ${dayStr} · ${duration}min`);
                loadSchedules();
            } else {
                showNotification('error', `Error: ${data.error || 'Failed to set schedule'}`);
            }
        } catch (e) {
            console.error('Failed to set schedule:', e);
            showNotification('error', 'Error: Failed to set schedule');
        }
    }

    // showNotification is provided by notifier.js

    const setScheduleBtn = document.getElementById('setScheduleBtn');
    if (setScheduleBtn) {
        setScheduleBtn.addEventListener('click', setSchedule);
    }

    loadSchedules();
    setInterval(loadSchedules, 30000);

    // ======= Circular Slider Logic =======
    const sliderHandle = document.getElementById('sliderHandle');
    const progressCircle = document.getElementById('progressCircle');
    const durationValue = document.getElementById('durationValue');
    const circularSlider = document.querySelector('.circular-slider');

    let radius = 85,
        centerPoint = 110,
        circumference = 2 * Math.PI * radius;
    let currentDuration = 15,
        isDragging = false;

    progressCircle.style.strokeDasharray = circumference;
    updateSlider(currentDuration);

    function updateSliderSize() {
        const sliderWidth = circularSlider.offsetWidth;

        if (sliderWidth <= 200) {
            radius = 75;
            centerPoint = 90;
        } else {
            radius = 85;
            centerPoint = 110;
        }

        circumference = 2 * Math.PI * radius;

        const svg = document.querySelector('.slider-svg');
        const track = document.querySelector('.slider-track');
        const progress = document.querySelector('.slider-progress');

        const viewBoxSize = centerPoint * 2;
        svg.setAttribute('viewBox', `0 0 ${viewBoxSize} ${viewBoxSize}`);

        track.setAttribute('cx', centerPoint);
        track.setAttribute('cy', centerPoint);
        track.setAttribute('r', radius);
        progress.setAttribute('cx', centerPoint);
        progress.setAttribute('cy', centerPoint);
        progress.setAttribute('r', radius);

        if (sliderWidth <= 200) {
            document.querySelectorAll('.step-marker').forEach(marker => {
                const text = marker.textContent;
                switch (text) {
                    case '0':
                        marker.style.top = '0px';
                        marker.style.left = '90px';
                        break;
                    case '5':
                        marker.style.top = '12px';
                        marker.style.right = '35px';
                        break;
                    case '10':
                        marker.style.top = '42px';
                        marker.style.right = '0px';
                        break;
                    case '15':
                        marker.style.top = '90px';
                        marker.style.right = '-8px';
                        break;
                    case '20':
                        marker.style.bottom = '38px';
                        marker.style.right = '0px';
                        break;
                    case '25':
                        marker.style.bottom = '8px';
                        marker.style.right = '35px';
                        break;
                    case '30':
                        marker.style.bottom = '-7px';
                        marker.style.left = '90px';
                        break;
                    case '35':
                        marker.style.bottom = '8px';
                        marker.style.left = '30px';
                        break;
                    case '40':
                        marker.style.bottom = '38px';
                        marker.style.left = '0px';
                        break;
                    case '45':
                        marker.style.top = '90px';
                        marker.style.left = '-8px';
                        break;
                    case '50':
                        marker.style.top = '42px';
                        marker.style.left = '0px';
                        break;
                    case '55':
                        marker.style.top = '12px';
                        marker.style.left = '30px';
                        break;
                }
            });
        } else {
            document.querySelectorAll('.step-marker').forEach(marker => {
                const text = marker.textContent;
                switch (text) {
                    case '0':
                        marker.style.top = '0px';
                        marker.style.left = '110px';
                        break;
                    case '5':
                        marker.style.top = '13px';
                        marker.style.right = '37px';
                        break;
                    case '10':
                        marker.style.top = '55px';
                        marker.style.right = '-5px';
                        break;
                    case '15':
                        marker.style.top = '112px';
                        marker.style.right = '-22px';
                        break;
                    case '20':
                        marker.style.bottom = '35px';
                        marker.style.right = '-7px';
                        break;
                    case '25':
                        marker.style.bottom = '-2px';
                        marker.style.right = '32px';
                        break;
                    case '30':
                        marker.style.bottom = '-18px';
                        marker.style.left = '110px';
                        break;
                    case '35':
                        marker.style.bottom = '-3px';
                        marker.style.left = '52px';
                        break;
                    case '40':
                        marker.style.bottom = '40px';
                        marker.style.left = '10px';
                        break;
                    case '45':
                        marker.style.top = '110px';
                        marker.style.left = '-5px';
                        break;
                    case '50':
                        marker.style.top = '55px';
                        marker.style.left = '10px';
                        break;
                    case '55':
                        marker.style.top = '15px';
                        marker.style.left = '50px';
                        break;
                }
            });
        }

        return {
            radius,
            centerPoint,
            circumference
        };
    }

    // ======= Music Toggle =======
    const musicToggle = document.getElementById('musicToggle');
    const bgMusic = document.getElementById('bgMusic');
    let musicWasPlaying = false;

    // Restore music state
    const musicEnabled = localStorage.getItem('musicEnabled') === 'true';
    if (musicEnabled && bgMusic) {
        bgMusic.play().catch(() => { });
        musicToggle.innerHTML = '<i class="fas fa-volume-up"></i> <span>Music</span>';
        musicToggle.classList.add('playing');
    }

    musicToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (bgMusic.paused) {
            bgMusic.play();
            musicToggle.innerHTML = '<i class="fas fa-volume-up"></i> <span>Music</span>';
            musicToggle.classList.add('playing');
            localStorage.setItem('musicEnabled', 'true');
        } else {
            bgMusic.pause();
            musicToggle.innerHTML = '<i class="fas fa-volume-mute"></i> <span>Music</span>';
            musicToggle.classList.remove('playing');
            localStorage.setItem('musicEnabled', 'false');
        }
    });

    // Pause music when tab/window is not visible, resume when visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            musicWasPlaying = !bgMusic.paused;
            if (musicWasPlaying) {
                bgMusic.pause();
            }
        } else {
            if (musicWasPlaying && localStorage.getItem('musicEnabled') === 'true') {
                bgMusic.play().catch(() => { });
            }
        }
    });

    function updateSlider(minutes) {
        currentDuration = Math.max(0, Math.min(60, minutes));
        const {
            radius,
            centerPoint,
            circumference
        } = updateSliderSize();
        const angle = (currentDuration / 60) * 360;
        const radians = (angle - 90) * (Math.PI / 180);
        sliderHandle.style.left = `${centerPoint + radius * Math.cos(radians)}px`;
        sliderHandle.style.top = `${centerPoint + radius * Math.sin(radians)}px`;
        progressCircle.style.strokeDashoffset = currentDuration === 0 ? circumference : circumference - (currentDuration / 60) * circumference;
        durationValue.textContent = currentDuration;
    }

    ['mousedown', 'touchstart'].forEach(evt => sliderHandle.addEventListener(evt, e => {
        e.preventDefault();
        isDragging = true;
        sliderHandle.style.cursor = 'grabbing';
    }));

    ['mouseup', 'touchend'].forEach(evt => document.addEventListener(evt, () => {
        isDragging = false;
        sliderHandle.style.cursor = 'grab';
    }));

    ['mousemove', 'touchmove'].forEach((evt, index) => {
        document.addEventListener(evt, e => {
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
        }, {
            passive: false
        });
    });

    window.addEventListener('load', () => {
        updateSliderSize();
        updateSlider(currentDuration);
    });
    window.addEventListener('resize', () => {
        updateSliderSize();
        updateSlider(currentDuration);
    });

    // ======= Auto-update chart every 10s =======
    setInterval(loadChartData, 10000);
    loadChartData();

    // ======= Dashboard NTP Resync + Client IP =======
    const ntpResyncIconBtn = document.getElementById('ntpResyncIconBtn');
    const ntpResyncIcon = document.getElementById('ntpResyncIcon');
    const sysNtpEl = document.getElementById('sysNtp');
    const sysIpEl = document.getElementById('sysIp');
    let cachedClientIp = '';

    function withToken(path) {
        const joiner = path.includes('?') ? '&' : '?';
        return API_KEY ? `${path}${joiner}token=${encodeURIComponent(API_KEY)}` : path;
    }

    function isIpv4(value) {
        return /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(value || '');
    }

    function isPrivateIpv4(value) {
        if (!isIpv4(value)) return false;
        const parts = value.split('.').map(Number);
        return parts[0] === 10
            || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
            || (parts[0] === 192 && parts[1] === 168);
    }

    const hasSystemInfoCard = !!(
        document.getElementById('sysUptime')
        && document.getElementById('sysRssi')
        && document.getElementById('sysHeap')
        && document.getElementById('sysNtp')
        && document.getElementById('sysIp')
        && document.getElementById('sysWsClients')
    );

    async function detectClientIp() {
        try {
            const rtc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            rtc.createDataChannel('ip');
            const ipPromise = new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(''), 1500);
                rtc.onicecandidate = (event) => {
                    if (!event.candidate || !event.candidate.candidate) return;
                    const match = event.candidate.candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
                    if (match && isPrivateIpv4(match[1])) {
                        clearTimeout(timeout);
                        resolve(match[1]);
                    }
                };
            });

            const offer = await rtc.createOffer();
            await rtc.setLocalDescription(offer);
            const rtcIp = await ipPromise;
            rtc.close();
            if (rtcIp) return rtcIp;
        } catch (e) {
            console.warn('Local client IP detect failed', e);
        }

        return '';
    }

    async function resyncDashboardNtp() {
        if (!ntpResyncIconBtn || !ntpResyncIcon || !sysNtpEl) return;
        ntpResyncIconBtn.disabled = true;
        ntpResyncIcon.classList.add('fa-spin');
        sysNtpEl.textContent = 'Resyncing...';

        try {
            const res = await fetch(withToken('/api/ntp/resync'), { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Resync failed');

            for (let i = 0; i < 15; i++) {
                await new Promise((r) => setTimeout(r, 1000));
                const statusRes = await fetch(withToken('/api/system'));
                if (!statusRes.ok) continue;
                const status = await statusRes.json();
                if (status.ntpSynced) {
                    sysNtpEl.textContent = 'Synced';
                    showNotification('success', 'Success: NTP time synced');
                    return;
                }
            }

            sysNtpEl.textContent = 'Sync timed out';
            showNotification('error', 'Error: NTP sync timed out');
        } catch (err) {
            sysNtpEl.textContent = 'Error';
            showNotification('error', `Error: ${err.message}`);
        } finally {
            ntpResyncIcon.classList.remove('fa-spin');
            ntpResyncIconBtn.disabled = false;
        }
    }

    if (hasSystemInfoCard && ntpResyncIconBtn) {
        ntpResyncIconBtn.addEventListener('click', resyncDashboardNtp);
    }

    if (hasSystemInfoCard) {
        detectClientIp().then((ip) => {
            cachedClientIp = ip;
            if (sysIpEl && cachedClientIp) {
                sysIpEl.textContent = cachedClientIp;
            }
        });
    }

    // ======= System Info =======
    async function fetchSystemInfo() {
        if (!hasSystemInfoCard) return;

        const sysUptimeEl = document.getElementById('sysUptime');
        const sysRssiEl = document.getElementById('sysRssi');
        const sysHeapEl = document.getElementById('sysHeap');

        if (!sysUptimeEl || !sysRssiEl || !sysHeapEl) return;

        try {
            const res = await fetch(`/api/system?token=${API_KEY}`);
            if (!res.ok) return;
            const d = await res.json();
            const upSec = d.uptime || 0;
            const days = Math.floor(upSec / 86400);
            const hrs = Math.floor((upSec % 86400) / 3600);
            const mins = Math.floor((upSec % 3600) / 60);
            sysUptimeEl.textContent = days > 0 ? `${days}d ${hrs}h ${mins}m` : `${hrs}h ${mins}m`;
            const rssi = d.rssi || 0;
            let signal = 'Weak';
            if (rssi > -50) signal = 'Excellent';
            else if (rssi > -60) signal = 'Good';
            else if (rssi > -70) signal = 'Fair';
            sysRssiEl.textContent = `${rssi} dBm (${signal})`;
            const heap = d.freeHeap || 0;
            sysHeapEl.textContent = heap > 1024 ? `${(heap / 1024).toFixed(1)} KB` : `${heap} B`;
            const ntpEl = document.getElementById('sysNtp');
            const wsEl = document.getElementById('sysWsClients');
            const ipEl = document.getElementById('sysIp');
            if (ipEl) {
                const ipFromApi = d.clientIp || d.clientIP || d.client_ip || '';
                const privateApiIp = isPrivateIpv4(ipFromApi) ? ipFromApi : '';
                ipEl.textContent = cachedClientIp || privateApiIp || 'Unavailable';
            }
            if (ntpEl) ntpEl.textContent = d.ntpSynced ? 'Synced' : 'Not synced';
            if (wsEl) wsEl.textContent = d.wsClients !== undefined ? d.wsClients : '--';
        } catch (e) { console.error('System info error', e); }
    }
    if (hasSystemInfoCard) {
        fetchSystemInfo();
        setInterval(fetchSystemInfo, 15000);
    }

    // ======= Export Sensor Data =======
    document.getElementById('exportBtn').addEventListener('click', () => {
        if (!sampleHistory.length) {
            showNotification('info', 'Info: No data to export');
            return;
        }
        let csv = 'Timestamp,Soil Moisture (%),Temperature (°C),Humidity (%),Brightness,Weather,Pump Status,Plant Status\n';
        sampleHistory.forEach(sample => {
            csv += [
                escapeCsvValue(formatExportTimestamp(sample.timestamp)),
                sample.soilMoisture,
                sample.temperature,
                sample.humidity,
                escapeCsvValue(sample.brightness),
                escapeCsvValue(sample.weather),
                escapeCsvValue(sample.pumpStatus),
                escapeCsvValue(sample.plantStatus)
            ].join(',') + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SAI42_sensors_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('success', 'Success: Sensor data exported');
    });

    // ======= Loading Animation =======
    const overlay = document.getElementById('loadingOverlay');
    const mainWrapper = document.querySelector('.main-wrapper');
    mainWrapper.style.opacity = 0;
    setTimeout(() => {
        overlay.style.opacity = 0;
        setTimeout(() => {
            mainWrapper.style.opacity = 1;
            setTimeout(() => overlay.style.display = 'none', 300);
        }, 150);
    }, 1500);

    // ======= Theme Toggle =======
    toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.body.classList.toggle("dark");
        const isDark = document.body.classList.contains("dark");
        const humidityAxisColor = isDark ? '#7cb5ec' : 'rgb(100,149,237)';
        localStorage.setItem("theme", isDark ? "dark" : "light");
        toggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i> <span>Light Mode</span>' : '<i class="fas fa-moon"></i> <span>Dark Mode</span>';

        const themeOpts = {
            legend: {
                itemStyle: {
                    color: isDark ? '#e4e4e4' : '#333'
                },
                itemHoverStyle: {
                    color: isDark ? '#ffffff' : '#000000'
                }
            },
            xAxis: {
                labels: {
                    style: {
                        color: isDark ? '#e4e4e4' : '#333'
                    }
                },
                lineColor: isDark ? '#444' : '#ddd',
                tickColor: isDark ? '#444' : '#ddd'
            },
            yAxis: [{
                labels: {
                    useHTML: true,
                    formatter: function () {
                        return `<span style="color:${getPrimaryAxisTickColor(this.value, isDark)};font-weight:bold;">${this.value}</span>`;
                    }
                },
                gridLineColor: isDark ? '#333' : '#eee'
            }, {
                labels: {
                    style: {
                        color: isDark ? '#f45b5b' : 'rgb(247,38,59)'
                    }
                },
                gridLineColor: isDark ? '#333' : '#eee'
            }]
        };
        chartH.update(themeOpts, true, false);
        chartH.series[0].update({
            color: '#47c9af',
            fillColor: isDark ? 'rgba(71,201,175,0.15)' : 'rgba(71,201,175,0.2)'
        }, false);
        chartH.series[1].update({
            color: isDark ? '#f45b5b' : 'rgb(247,38,59)',
            fillColor: isDark ? 'rgba(244,91,91,0.15)' : 'rgba(247,38,59,0.2)'
        }, false);
        chartH.series[2].update({
            color: humidityAxisColor,
            fillColor: isDark ? 'rgba(124,181,236,0.15)' : 'rgba(100,149,237,0.2)'
        }, true);
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const API_KEY = window.SAI42_API_KEY || "";
    const setupMode = String(window.SAI42_SETUP_MODE).toLowerCase() === "true";

    const isSettingsPage = !!document.getElementById("credentialsForm") || !!document.getElementById("wifiForm");
    if (!isSettingsPage) return;

    const settingsToggle = document.getElementById("settingsToggle");
    const settingsDropdown = document.getElementById("settingsDropdown");
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
        });
    }

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
        if (!scanBtn || !wifiList || scanInProgress) return;

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
        if (!ntpStatusText) return false;

        try {
            const res = await fetch(buildUrl("/api/system"));
            if (!res.ok) {
                throw new Error("Failed to read NTP status");
            }
            const data = await res.json();
            ntpStatusText.innerHTML = data.ntpSynced
                ? '<i class="fas fa-check-circle" style="color:var(--success,#4caf50)"></i> Synced'
                : '<i class="fas fa-exclamation-circle" style="color:var(--danger,#f44336)"></i> Not synced';
            return data.ntpSynced;
        } catch (err) {
            ntpStatusText.innerHTML = '<i class="fas fa-exclamation-circle" style="color:var(--danger,#f44336)"></i> Unavailable';
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
    }

    if (scanBtn) {
        scanBtn.addEventListener("click", scanWifi);
    }
    if (setupMode) {
        scanWifi();
    }
});
