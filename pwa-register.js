// Register service worker for offline support
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("service-worker.js")
			.then((registration) => {
				console.log("✅ Service Worker registered successfully:", registration);

				// Check for updates periodically
				setInterval(() => {
					registration.update();
				}, 60000); // Check every 60 seconds

				// Listen for updates
				registration.addEventListener("updatefound", () => {
					const newWorker = registration.installing;
					newWorker.addEventListener("statechange", () => {
						if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
							console.log("🔄 New app version available! Refresh to update.");
							// Optional: Show user notification about update
							showCustomAlert("🔄", "تحديث جديد متاح! الرجاء تحديث الصفحة.");
						}
					});
				});
			})
			.catch((error) => {
				console.warn("❌ Service Worker registration failed:", error);
			});
	});

	// Handle background sync when coming back online
	navigator.serviceWorker.addEventListener("message", (event) => {
		if (event.data && event.data.type === "BACKGROUND_SYNC") {
			console.log("📡 Syncing data in background...");
			// Your sync logic here
		}
	});
}

// Detect when app is installed
window.addEventListener("beforeinstallprompt", (e) => {
	console.log("💾 App can be installed");
	e.preventDefault();
	// Store the event for later use
	window.deferredPrompt = e;
});

window.addEventListener("appinstalled", () => {
	console.log("✨ App installed successfully!");
});
