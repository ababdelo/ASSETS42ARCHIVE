const SLOT_MIN = 15;
const SLOTS_PER_DAY = (24 * 60) / SLOT_MIN;
let currentEpoch = null;
let selected = new Set();
let pumpStatus = "unknown";
let manualOverride = false;
let Countdown = "00:00";
async function fetchTime() {
   try {
      const r = await fetch("/time");
      const d = await r.json();
      currentEpoch = d.epoch;
   } catch (e) {
      document.getElementById("espTime").textContent = "ERR";
      currentEpoch = Math.floor(Date.now() / 1000);
   }
}
async function fetchSchedule() {
   selected.clear();
   try {
      const r = await fetch("/getSchedule");
      const d = await r.json();
      if (d.entries && Array.isArray(d.entries)) {
         d.entries.forEach((e) => {
            if (typeof e.day === "number" && typeof e.slot === "number") {
               selected.add(e.day + ":" + e.slot);
            }
         });
      }
   } catch (e) {}
}
async function fetchPumpStatus() {
   try {
      const r = await fetch("/pumpStatus");
      const d = await r.json();
      pumpStatus = d.status;
      manualOverride = d.manualOverride || false;
      Countdown = d.Countdown || false;
      updatePumpUI();
      updateScheduleOverlay();
   } catch (e) {
      pumpStatus = "unknown";
      manualOverride = false;
      updatePumpUI();
      updateScheduleOverlay();
      showPumpResult("Error fetching pump status", "error");
   }
}

function updatePumpUI() {
   const container = document.getElementById("pumpStatusContainer");
   const icon = document.getElementById("pumpStatusIcon");
   const value = document.getElementById("pumpStatusValue");
   const counter = document.getElementById("pumpCounterValue");
   const startBtn = document.getElementById("startPump");
   const stopBtn = document.getElementById("stopPump");
   container.className = "pump-status-container";
   icon.className = "pump-status-icon";
   if (pumpStatus === "on") {
      if (AudioBuffer) {
         startAudio("audio1");
         AudioBuffer = false;
      }
      container.classList.add("active");
      icon.classList.add("active");
      value.textContent = "Running" + (manualOverride ? " (Manual)" : " (Auto)");
      startBtn.disabled = true;
      stopBtn.disabled = false;
      if (manualOverride) {
         counter.textContent = Countdown;
         counter.style.display = "block";
      } else {
         counter.style.display = "none";
      }
   } else if (pumpStatus === "off") {
      stopAudio("audio1");
      container.classList.add("inactive");
      icon.classList.add("inactive");
      value.textContent = "Stopped" + (manualOverride ? " (Manual)" : "");
      startBtn.disabled = false;
      stopBtn.disabled = false;
      counter.style.display = "none";
      AudioBuffer = true;
   } else {
      value.textContent = "Unknown";
      startBtn.disabled = false;
      stopBtn.disabled = false;
   }
}

function updateScheduleOverlay() {
   const overlay = document.getElementById("scheduleOverlay");
   if (manualOverride) {
      document.querySelector(".grid-container").scrollTop = 0;
      document.querySelector(".grid-container").scrollLeft = 0;
      document.querySelector(".grid-container").style.overflow = "hidden";
      overlay.classList.add("active");
   } else {
      document.querySelector(".grid-container").style.overflow = "auto";
      overlay.classList.remove("active");
   }
}
async function controlPump(action) {
   try {
      const selectedTimeDisplay = document.getElementById("selected-time");
      const timeText = selectedTimeDisplay.textContent;
      const [hoursStr, minutesStr] = timeText.split(":");
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      showPumpResult(`Sending ${action} command...`, "success");
      const r = await fetch("/pumpControl", {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify({
            action: action,
            hours: hours,
            minutes: minutes,
         }),
      });
      const d = await r.json();
      if (d.success) {
         showPumpResult(`Pump ${action} command sent successfully`, "success");
         setTimeout(fetchPumpStatus, 1000);
      } else {
         showPumpResult(`Failed to ${action} pump`, "error");
      }
   } catch (e) {
      showPumpResult(`Network error - could not ${action} pump`, "error");
   }
}

function showPumpResult(message, type) {
   const results = document.getElementById("pumpResults");
   results.textContent = message;
   results.className = "pump-results";
   results.classList.add(type);
   setTimeout(() => {
      results.className = "pump-results";
   }, 5000);
}

function renderTime() {
   if (currentEpoch) {
      const dt = new Date(currentEpoch * 1000);
      const timeElement = document.getElementById("espTime");
      timeElement.textContent = dt.toLocaleString();
      timeElement.classList.add("time-update");
      setTimeout(() => timeElement.classList.remove("time-update"), 500);
      currentEpoch++;
   }
}
async function syncNTP() {
   document.getElementById("results").textContent = "Syncing time...";
   await fetch("/resync", {
      method: "POST",
   });
   await init();
   document.getElementById("results").textContent = "Time synced successfully";
}
async function setManual() {
   let val = document.getElementById("manualTime").value;
   if (!val) {
      document.getElementById("results").textContent = "Please select a date and time";
      return;
   }
   let epoch = Math.floor(new Date(val).getTime() / 1000);
   document.getElementById("results").textContent = "Setting manual time...";
   await fetch("/setTime", {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify({
         epoch,
      }),
   });
   await init();
   document.getElementById("results").textContent = "Manual time set successfully";
}

function buildGrid() {
   const grid = document.getElementById("grid");
   grid.innerHTML = "";
   const cornerCell = document.createElement("div");
   cornerCell.className = "cell day-header";
   cornerCell.style.position = "sticky";
   cornerCell.style.top = "0";
   cornerCell.style.left = "0";
   cornerCell.style.zIndex = "4";
   cornerCell.style.background = "var(--primary-dark)";
   grid.appendChild(cornerCell);
   const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
   for (let d = 0; d < 7; d++) {
      const hd = document.createElement("div");
      hd.className = "cell day-header";
      hd.textContent = days[d];
      grid.appendChild(hd);
   }
   for (let s = 0; s < SLOTS_PER_DAY; s++) {
      const tcell = document.createElement("div");
      tcell.className = "cell time-cell";
      const mins = s * SLOT_MIN;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      tcell.textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
      grid.appendChild(tcell);
      for (let d = 0; d < 7; d++) {
         const slot = document.createElement("div");
         slot.className = "cell slot";
         slot.dataset.day = d;
         slot.dataset.slot = s;
         const id = d + ":" + s;
         if (selected.has(id)) slot.classList.add("selected");
         slot.addEventListener("click", () => {
            if (selected.has(id)) {
               selected.delete(id);
               slot.classList.remove("selected");
            } else {
               selected.add(id);
               slot.classList.add("selected");
            }
         });
         grid.appendChild(slot);
      }
   }
}
document.getElementById("clear").addEventListener("click", async () => {
   if (selected.size === 0) {
      document.getElementById("results").textContent = "No slots to clear";
      return;
   }
   if (confirm("Are you sure you want to clear all scheduled times?")) {
      selected.clear();
      document.querySelectorAll(".slot.selected").forEach((c) => c.classList.remove("selected"));
      await fetch("/clearSchedule", {
         method: "POST",
      });
      document.getElementById("results").textContent = "Schedule cleared successfully";
   }
});
document.getElementById("plan").addEventListener("click", async () => {
   const arr = [];
   for (const k of selected) {
      const [d, s] = k.split(":").map(Number);
      arr.push({
         day: d,
         slot: s,
      });
   }
   if (arr.length === 0) {
      document.getElementById("results").textContent = "No time slots selected";
      controlPump("auto");
      return;
   }
   try {
      document.getElementById("results").textContent = "Saving schedule...";
      const res = await fetch("/saveSchedule", {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify({
            entries: arr,
         }),
      });
      const data = await res.json();
      document.getElementById("results").textContent = data.ok ? "Schedule saved successfully" : "Error saving schedule";
      await fetchSchedule();
      buildGrid();
      setTimeout(fetchPumpStatus, 500);
   } catch (e) {
      document.getElementById("results").textContent = "Network error - please try again";
   }
});
document.getElementById("startPump").addEventListener("click", () => {
   controlPump("start");
});
document.getElementById("stopPump").addEventListener("click", () => {
   controlPump("stop");
});
async function init() {
   document.getElementById("results").textContent = "Loading...";
   await fetchTime();
   await fetchSchedule();
   await fetchPumpStatus();
   buildGrid();
   document.getElementById("results").textContent = "Ready to schedule pump times";
}
document.querySelector(".grid-container").addEventListener("click", function (event) {
   const overlay = document.getElementById("scheduleOverlay");
   if (overlay.classList.contains("active") && event.target.closest(".schedule-overlay")) {
      controlPump("auto");
   }
});
init();
setInterval(renderTime, 1000);
setInterval(fetchPumpStatus, 1000);
document.addEventListener("DOMContentLoaded", function () {
   const timePicker = new TimePicker();
   timePicker.init();
});
class TimePicker {
   constructor() {
      this.hoursElement = document.getElementById("hours-numbers");
      this.minutesElement = document.getElementById("minutes-numbers");
      this.hoursWheel = document.getElementById("hours-wheel");
      this.minutesWheel = document.getElementById("minutes-wheel");
      this.modalOverlay = document.getElementById("modal-overlay");
      this.selectedTimeDisplay = document.getElementById("selected-time");
      this.clearButton = document.getElementById("clear-button");
      this.cancelButton = document.getElementById("cancel-button");
      this.setButton = document.getElementById("set-button");
      this.currentHour = 0;
      this.currentMinute = 30;
      this.maxHour = 0;
      this.maxMinute = 59;
      this.itemHeight = 40;
      this.visibleItems = 3;
      this.isDraggingHours = false;
      this.isDraggingMinutes = false;
   }
   init() {
      this.populateHours();
      this.populateMinutes();
      this.setInitialTime();
      this.addEventListeners();
      this.updateSelectedTimeDisplay();
   }
   populateHours() {
      for (let i = 0; i <= this.maxHour; i++) {
         const hourElement = document.createElement("div");
         hourElement.className = "time-number";
         hourElement.textContent = i.toString().padStart(2, "0");
         hourElement.dataset.value = i;
         this.hoursElement.appendChild(hourElement);
      }
   }
   populateMinutes() {
      for (let i = 0; i <= this.maxMinute; i++) {
         const minuteElement = document.createElement("div");
         minuteElement.className = "time-number";
         minuteElement.textContent = i.toString().padStart(2, "0");
         minuteElement.dataset.value = i;
         this.minutesElement.appendChild(minuteElement);
      }
   }
   setInitialTime() {
      this.setHour(this.currentHour);
      this.setMinute(this.currentMinute);
   }
   setHour(hour) {
      this.currentHour = hour;
      this.updateActiveClass(this.hoursElement, hour);
      this.centerHour(hour);
   }
   setMinute(minute) {
      this.currentMinute = minute;
      this.updateActiveClass(this.minutesElement, minute);
      this.centerMinute(minute);
   }
   updateActiveClass(element, value) {
      Array.from(element.children).forEach((child) => {
         child.classList.remove("active");
      });
      const selectedElement = Array.from(element.children).find((child) => parseInt(child.dataset.value) === value);
      if (selectedElement) {
         selectedElement.classList.add("active");
      }
   }
   centerHour(hour) {
      const offset = -hour * this.itemHeight;
      this.hoursElement.style.transform = `translateY(${offset}px)`;
   }
   centerMinute(minute) {
      const offset = -minute * this.itemHeight;
      this.minutesElement.style.transform = `translateY(${offset}px)`;
   }
   updateSelectedTimeDisplay() {
      this.selectedTimeDisplay.textContent = `${this.currentHour.toString().padStart(2, "0")}:${this.currentMinute.toString().padStart(2, "0")}`;
   }
   openModal() {
      this.modalOverlay.classList.add("active");
   }
   closeModal() {
      this.modalOverlay.classList.remove("active");
   }
   addEventListeners() {
      this.selectedTimeDisplay.addEventListener("click", () => {
         this.openModal();
      });
      this.modalOverlay.addEventListener("click", (e) => {
         if (e.target === this.modalOverlay) {
            this.closeModal();
         }
      });
      this.hoursWheel.addEventListener("wheel", (e) => {
         e.preventDefault();
         if (e.deltaY < 0) {
            this.incrementHour();
         } else {
            this.decrementHour();
         }
      });
      this.minutesWheel.addEventListener("wheel", (e) => {
         e.preventDefault();
         if (e.deltaY < 0) {
            this.incrementMinute();
         } else {
            this.decrementMinute();
         }
      });
      this.addDragEvents(this.hoursWheel, this.hoursElement, this.maxHour, (value) => this.setHour(value), () => (this.isDraggingHours = true), () => (this.isDraggingHours = false));
      this.addDragEvents(this.minutesWheel, this.minutesElement, this.maxMinute, (value) => this.setMinute(value), () => (this.isDraggingMinutes = true), () => (this.isDraggingMinutes = false));
      this.addClickEvents(this.hoursElement, (value) => this.setHour(value));
      this.addClickEvents(this.minutesElement, (value) => this.setMinute(value));
      this.clearButton.addEventListener("click", () => {
         this.setHour(0);
         this.setMinute(0);
      });
      this.cancelButton.addEventListener("click", () => {
         this.closeModal();
      });
      this.setButton.addEventListener("click", () => {
         this.updateSelectedTimeDisplay();
         this.closeModal();
      });
   }
   incrementHour() {
      if (this.currentHour < this.maxHour) {
         this.setHour(this.currentHour + 1);
      }
   }
   decrementHour() {
      if (this.currentHour > 0) {
         this.setHour(this.currentHour - 1);
      }
   }
   incrementMinute() {
      if (this.currentMinute < this.maxMinute) {
         this.setMinute(this.currentMinute + 1);
      }
   }
   decrementMinute() {
      if (this.currentMinute > 0) {
         this.setMinute(this.currentMinute - 1);
      }
   }
   addDragEvents(wheelElement, numbersElement, maxValue, setValueCallback, onDragStart, onDragEnd) {
      let isDragging = false;
      let startY = 0;
      let startOffset = 0;
      wheelElement.addEventListener("mousedown", (e) => {
         isDragging = true;
         startY = e.clientY;
         startOffset = parseInt(numbersElement.style.transform.replace("translateY(", "").replace("px)", "")) || 0;
         wheelElement.style.cursor = "grabbing";
         onDragStart();
         e.preventDefault();
      });
      document.addEventListener("mousemove", (e) => {
         if (!isDragging) return;
         const deltaY = e.clientY - startY;
         let newOffset = startOffset + deltaY;
         const maxOffset = 0;
         const minOffset = -maxValue * this.itemHeight;
         if (newOffset > maxOffset) newOffset = maxOffset;
         if (newOffset < minOffset) newOffset = minOffset;
         numbersElement.style.transform = `translateY(${newOffset}px)`;
         const currentValue = Math.round(-newOffset / this.itemHeight);
         setValueCallback(Math.max(0, Math.min(maxValue, currentValue)));
      });
      document.addEventListener("mouseup", () => {
         if (!isDragging) return;
         isDragging = false;
         wheelElement.style.cursor = "grab";
         onDragEnd();
         const currentOffset = parseInt(numbersElement.style.transform.replace("translateY(", "").replace("px)", "")) || 0;
         const currentValue = Math.round(-currentOffset / this.itemHeight);
         setValueCallback(Math.max(0, Math.min(maxValue, currentValue)));
      });
      wheelElement.addEventListener("touchstart", (e) => {
         isDragging = true;
         startY = e.touches[0].clientY;
         startOffset = parseInt(numbersElement.style.transform.replace("translateY(", "").replace("px)", "")) || 0;
         onDragStart();
         e.preventDefault();
      });
      document.addEventListener("touchmove", (e) => {
         if (!isDragging) return;
         const deltaY = e.touches[0].clientY - startY;
         let newOffset = startOffset + deltaY;
         const maxOffset = 0;
         const minOffset = -maxValue * this.itemHeight;
         if (newOffset > maxOffset) newOffset = maxOffset;
         if (newOffset < minOffset) newOffset = minOffset;
         numbersElement.style.transform = `translateY(${newOffset}px)`;
         const currentValue = Math.round(-newOffset / this.itemHeight);
         setValueCallback(Math.max(0, Math.min(maxValue, currentValue)));
      });
      document.addEventListener("touchend", () => {
         if (!isDragging) return;
         isDragging = false;
         onDragEnd();
         const currentOffset = parseInt(numbersElement.style.transform.replace("translateY(", "").replace("px)", "")) || 0;
         const currentValue = Math.round(-currentOffset / this.itemHeight);
         setValueCallback(Math.max(0, Math.min(maxValue, currentValue)));
      });
   }
   addClickEvents(numbersElement, setValueCallback) {
      numbersElement.addEventListener("click", (e) => {
         if (e.target.classList.contains("time-number") && !this.isDraggingHours && !this.isDraggingMinutes) {
            const value = parseInt(e.target.dataset.value);
            setValueCallback(value);
         }
      });
   }
}
const audioStates = {
   audio1: {
      playing: false,
      element: null,
   },
   audio2: {
      playing: false,
      element: null,
   },
};
let AudioBuffer = false;
window.addEventListener("load", () => {
   audioStates.audio1.element = document.getElementById("audio1");
   audioStates.audio2.element = document.getElementById("audio2");
});

function startAudio(audioId) {
   const state = audioStates[audioId];
   const playPromise = state.element.play();
   if (playPromise !== undefined) {
      playPromise.then(() => {
         state.playing = true;
      }).catch((error) => {
         console.log(`Erreur lecture ${audioId}:`, error);
      });
   }
}

function stopAudio(audioId) {
   const state = audioStates[audioId];
   if (state.playing && state.element) {
      state.element.pause();
      state.playing = false;
   }
}
document.addEventListener("visibilitychange", () => {
   if (document.hidden) {
      for (const audioId in audioStates) {
         const state = audioStates[audioId];
         if (state.playing && state.element) {
            state.element.pause();
         }
      }
   } else {
      setTimeout(() => {
         for (const audioId in audioStates) {
            const state = audioStates[audioId];
            if (state.playing && state.element) {
               state.element.play().then(() => {}).catch((e) => {
                  state.playing = false;
               });
            }
         }
      }, 300);
   }
});
window.addEventListener("beforeunload", () => {
   for (const audioId in audioStates) {
      const state = audioStates[audioId];
      if (state.element) {
         state.element.pause();
      }
   }
});
let loadingscreen = document.getElementById("loading-screen");
document.getElementById("continueBtn").addEventListener("click", function () {
   let loadingscreen = document.getElementById("loading-screen");
   let mainMessage = document.getElementById("main-message");
   startAudio("audio2");
   mainMessage.style.display = "block";
   loadingscreen.style.display = "none";
   AudioBuffer = true;
});
