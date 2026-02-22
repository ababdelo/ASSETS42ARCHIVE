document.addEventListener("DOMContentLoaded", () => {
   const API_KEY = window.SAI42_API_KEY || "";
   let latestSensorData = null;
   let chartDataInitialized = false;

   // ======= Settings Menu Elements =======
   const settingsBtn = document.getElementById('settingsBtn');
   const settingsMenu = document.getElementById('settingsMenu');
   const darkModeToggle = document.getElementById('darkModeToggle');
   const musicToggleCheckbox = document.getElementById('musicToggle');
   const logoutBtn = document.getElementById('logoutBtn');
   const bgMusic = document.getElementById('bgMusic');

   // ======= Settings Menu Toggle =======
   if (settingsBtn && settingsMenu) {
      settingsBtn.addEventListener('click', (e) => {
         e.stopPropagation();
         settingsBtn.classList.toggle('active');
         settingsMenu.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
         if (!settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
            settingsMenu.classList.remove('open');
            settingsBtn.classList.remove('active');
         }
      });

      settingsMenu.addEventListener('click', (e) => {
         e.stopPropagation();
      });
   }

   // ======= Restore Theme =======
   const savedTheme = localStorage.getItem("theme");
   if (savedTheme === "dark") {
      document.body.classList.add("dark");
      if (darkModeToggle) darkModeToggle.checked = true;
   }

   // ======= Dark Mode Toggle =======
   if (darkModeToggle) {
      darkModeToggle.addEventListener('change', () => {
         document.body.classList.toggle('dark', darkModeToggle.checked);
         localStorage.setItem('theme', darkModeToggle.checked ? 'dark' : 'light');
         updateChartTheme(darkModeToggle.checked);
      });
   }

   // ======= Logout Handler =======
   if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
         window.location.href = '/login?action=logout';
      });
   }

   // ======= Music Toggle with Auto-Play Fix =======
   const musicEnabled = localStorage.getItem('musicEnabled') === 'true';
   let musicPendingPlay = musicEnabled;
   let userInteracted = false;
   let musicWasPlaying = false;

   if (musicToggleCheckbox) {
      musicToggleCheckbox.checked = musicEnabled;
   }

   // Try to play music immediately if enabled
   if (musicEnabled && bgMusic) {
      bgMusic.play().then(() => {
         musicPendingPlay = false;
      }).catch(() => {
         musicPendingPlay = true;
      });
   }

   // Handle user interaction to enable autoplay
   function handleFirstInteraction() {
      if (!userInteracted) {
         userInteracted = true;
         if (musicPendingPlay && musicToggleCheckbox && musicToggleCheckbox.checked && bgMusic) {
            bgMusic.play().then(() => {
               musicPendingPlay = false;
            }).catch(() => {});
         }
         document.removeEventListener('click', handleFirstInteraction);
         document.removeEventListener('keydown', handleFirstInteraction);
         document.removeEventListener('touchstart', handleFirstInteraction);
      }
   }

   document.addEventListener('click', handleFirstInteraction);
   document.addEventListener('keydown', handleFirstInteraction);
   document.addEventListener('touchstart', handleFirstInteraction);

   if (musicToggleCheckbox) {
      musicToggleCheckbox.addEventListener('change', () => {
         if (musicToggleCheckbox.checked) {
            if (bgMusic) bgMusic.play().catch(() => {});
            localStorage.setItem('musicEnabled', 'true');
         } else {
            if (bgMusic) bgMusic.pause();
            localStorage.setItem('musicEnabled', 'false');
         }
      });
   }

   // Pause/resume music on visibility change
   document.addEventListener('visibilitychange', () => {
      if (!bgMusic) return;
      if (document.hidden) {
         musicWasPlaying = !bgMusic.paused;
         if (musicWasPlaying) {
            bgMusic.pause();
         }
      } else {
         if (musicWasPlaying && localStorage.getItem('musicEnabled') === 'true') {
            bgMusic.play().catch(() => {});
         }
      }
   });

   // ======= Highcharts Theme =======
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
               style: {
                  color: isDark ? '#7cb5ec' : 'rgb(100,149,237)',
                  fontWeight: 'bold'
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
            color: isDark ? '#7cb5ec' : 'rgb(100,149,237)',
            fillColor: isDark ? 'rgba(124,181,236,0.15)' : 'rgba(100,149,237,0.2)'
         }, {
            name: 'Temperature',
            data: [],
            yAxis: 1,
            color: isDark ? '#f45b5b' : 'rgb(247,38,59)',
            fillColor: isDark ? 'rgba(244,91,91,0.15)' : 'rgba(247,38,59,0.2)'
         }],
         credits: {
            enabled: false
         }
      };
   }

   // ======= Update Chart Theme =======
   function updateChartTheme(isDark) {
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
               style: {
                  color: isDark ? '#7cb5ec' : 'rgb(100,149,237)'
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
         color: isDark ? '#7cb5ec' : 'rgb(100,149,237)',
         fillColor: isDark ? 'rgba(124,181,236,0.15)' : 'rgba(100,149,237,0.2)'
      }, false);
      chartH.series[1].update({
         color: isDark ? '#f45b5b' : 'rgb(247,38,59)',
         fillColor: isDark ? 'rgba(244,91,91,0.15)' : 'rgba(247,38,59,0.2)'
      }, true);
   }

   // ======= Initialize Chart =======
   let chartH = Highcharts.chart('sensors-chart', getChartTheme());

   // ======= WebSocket for Live Sensor Data =======
   const ws = new WebSocket('ws://' + location.hostname + '/ws');
   ws.onopen = () => console.log('WebSocket open');
   ws.onerror = e => console.error('WebSocket error', e);

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
      chartH.series[0].addPoint([now, m], true, chartH.series[0].data.length >= 9);
      chartH.series[1].addPoint([now, t], true, chartH.series[1].data.length >= 9);
   }

   // ======= Water Plant API =======
   async function waterPlant() {
      // Block watering if overwatered
      if (latestSensorData && (latestSensorData.plantStatus || '').toLowerCase() === 'overwatered') {
         showNotification('<i class="fas fa-exclamation-triangle"></i> Cannot water - plant is overwatered', 'error');
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
         showNotification(`<i class="fas fa-tint"></i> Watering for ${duration}s`, 'success');
      } catch (err) {
         console.error('Water API error', err);
         showNotification('<i class="fas fa-times-circle"></i> Failed to start watering', 'error');
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
               showNotification('<i class="fas fa-trash"></i> Schedule deleted', 'info');
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
            showNotification(`${repeatIcon} ${h12}:${minStr} ${meridian} · ${dayStr} · ${duration}min`, notifType);
            loadSchedules();
         } else {
            showNotification(data.error || 'Failed to set schedule', 'error');
         }
      } catch (e) {
         console.error('Failed to set schedule:', e);
         showNotification('<i class="fas fa-times-circle"></i> Failed to set schedule', 'error');
      }
   }

   function showNotification(message, type = 'info') {
      const existing = document.querySelector('.sai-notification');
      if (existing) existing.remove();

      const div = document.createElement('div');
      div.className = `sai-notification ${type}`;
      div.innerHTML = message;
      document.body.appendChild(div);

      setTimeout(() => div.classList.add('show'), 10);
      setTimeout(() => {
         div.classList.remove('show');
         setTimeout(() => div.remove(), 300);
      }, 3000);
   }

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
});
