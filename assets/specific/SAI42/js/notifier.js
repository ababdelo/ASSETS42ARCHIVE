/**
 * Notifier - Toast notification system
 * Exposes global showNotification(type, message) function
 */
(function () {
    'use strict';

    // Object mapping notification types to corresponding icons
    const messageTypes = {
        error: "fa-circle-xmark",
        success: "fa-circle-check",
        warning: "fa-triangle-exclamation",
        info: "fa-circle-info"
    };

    // Helper function to remove toast with fade-out effect
    const removeToast = (toast) => {
        toast.classList.add("hide");
        if (toast.timeoutId) clearTimeout(toast.timeoutId);
        setTimeout(() => toast.remove(), 500);
    };

    // Helper function to create and display a toast notification
    const createToast = (type, iconClass, message) => {
        const notifications = document.querySelector(".notifications");
        if (!notifications) return;

        // Remove any existing toast immediately before showing a new one
        const existing = notifications.querySelector(".toast");
        if (existing) {
            if (existing.timeoutId) clearTimeout(existing.timeoutId);
            existing.remove();
        }

        const decodedMessage = decodeURIComponent(message);

        // Split the message into type and description
        const [msgType, ...descriptionParts] = decodedMessage.split(':');
        const description = descriptionParts.join(':').trim();

        const toast = document.createElement("li");
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="column">
                <i class="fa-solid ${iconClass}"></i>
                <span class="type">${msgType.trim()}</span><span class="colon">:</span> <span class="description">${description}</span>
            </div>
            <i class="fa-solid fa-xmark close-btn"></i>
            <div class="progress-bar"></div>
        `;

        notifications.appendChild(toast);

        // Automatically remove the toast after 5 seconds
        toast.timeoutId = setTimeout(() => removeToast(toast), 5000);

        // Allow manual removal when clicking the close icon
        toast.querySelector('.close-btn').addEventListener('click', () => removeToast(toast));
    };

    /**
     * Show a notification toast
     * @param {string} type - 'success', 'error', 'warning', or 'info'
     * @param {string} message - Message in format "Type: Description" or just description
     */
    window.showNotification = function (type, message) {
        // Validate type
        const validTypes = ['success', 'error', 'warning', 'info'];
        if (!validTypes.includes(type)) {
            type = 'info';
        }

        // If message doesn't contain ':', add the type as prefix
        let formattedMessage = message;
        if (!message.includes(':')) {
            formattedMessage = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${message}`;
        }

        const iconClass = messageTypes[type] || messageTypes.info;
        createToast(type, iconClass, formattedMessage);
    };

    // On DOM ready, process any session messages
    document.addEventListener("DOMContentLoaded", function () {
        const sessionMessages = document.getElementById('session-messages');
        if (!sessionMessages) return;

        // Loop through each message type and create toasts if messages exist
        Object.keys(messageTypes).forEach((type) => {
            const message = sessionMessages.dataset[type];
            if (message) {
                createToast(type, messageTypes[type], message);
            }
        });
    });
})();
