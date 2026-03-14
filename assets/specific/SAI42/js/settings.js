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
});
