// PWA Installation management
let deferredPrompt = null;

// Determine base path for GitHub Pages or other deployments
function getBasePath() {
	const pathname = window.location.pathname;
	// Check if deployed in subdirectory (e.g., /Little-Genius-Platform/)
	if (pathname.includes("/Little-Genius-Platform/")) {
		return "/Little-Genius-Platform/";
	}
	return "/";
}

const BASE_PATH = getBasePath();

// Register service worker for offline support
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		const swPath = BASE_PATH + "service-worker.js";
		console.log("📦 Attempting to register Service Worker from:", swPath);

		navigator.serviceWorker
			.register(swPath, { scope: BASE_PATH })
			.then((registration) => {
				console.log("✅ Service Worker registered successfully:", registration);
				console.log("   Scope:", registration.scope);

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
							if (typeof showCustomAlert === "function") {
								showCustomAlert("🔄", "تحديث جديد متاح! الرجاء تحديث الصفحة.");
							}
						}
					});
				});
			})
			.catch((error) => {
				console.warn("❌ Service Worker registration failed:", error);
				console.error("   Error details:", error.message);
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

// Capture install prompt
window.addEventListener("beforeinstallprompt", (e) => {
	console.log("💾 Install prompt triggered!");
	e.preventDefault();
	deferredPrompt = e;

	// Show install button if available
	showInstallButton();
});

// Handle app installation
window.addEventListener("appinstalled", () => {
	console.log("✨ App installed successfully!");
	deferredPrompt = null;
	hideInstallButton();
	if (typeof showCustomAlert === "function") {
		showCustomAlert("✨", "تم تثبيت التطبيق بنجاح! يمكنك الآن استخدامه بدون الإنترنت.");
	}
});

// Handle app being used as standalone
if (window.navigator.standalone === true) {
	console.log("🎯 App is running in standalone mode");
}

// Detect if app can be installed
function canInstallApp() {
	return deferredPrompt !== null;
}

// Manually trigger install
async function installApp() {
	if (!deferredPrompt) {
		console.warn("❌ Install prompt not available yet");
		return;
	}

	deferredPrompt.prompt();
	const { outcome } = await deferredPrompt.userChoice;
	console.log(`User choice: ${outcome}`);
	deferredPrompt = null;
	hideInstallButton();
}

// Show install button
function showInstallButton() {
	const installBtn = document.getElementById("pwa-install-btn");
	if (installBtn) {
		installBtn.classList.remove("hide");
		console.log("📦 Install button shown");
	} else {
		console.warn("Install button element not found");
	}
}

// Hide install button
function hideInstallButton() {
	const installBtn = document.getElementById("pwa-install-btn");
	if (installBtn) {
		installBtn.classList.add("hide");
	}
}

// Log PWA status on startup
console.log("🔍 PWA Status Check:");
console.log("  - Base Path:", BASE_PATH);
console.log("  - Full URL:", window.location.href);
console.log("  - HTTPS:", window.location.protocol === "https:" ? "✅" : "❌");
console.log("  - ServiceWorker Support:", "serviceWorker" in navigator ? "✅" : "❌");
console.log("  - Manifest Link:", document.querySelector('link[rel="manifest"]') ? "✅" : "❌");
console.log("  - Manifest href:", document.querySelector('link[rel="manifest"]')?.href || "N/A");
console.log("  - Standalone Mode:", window.navigator.standalone === true ? "✅" : "Not applicable");

// Validate manifest
setTimeout(() => {
	fetch(BASE_PATH + "manifest.json")
		.then((r) => r.json())
		.then((manifest) => {
			console.log("✅ Manifest loaded successfully");
			console.log("   start_url:", manifest.start_url);
			console.log("   scope:", manifest.scope);
			console.log("   icons count:", manifest.icons?.length || 0);
		})
		.catch((err) => console.warn("❌ Manifest load error:", err));
}, 1000);
