function openLetterDetails(letter) {
	// Get letter from nested structure: cloudData[level][category][letter]
	const data = cloudData[currentLevelMode] && cloudData[currentLevelMode].letters && cloudData[currentLevelMode].letters[letter];

	openGeneralDetails(data, `حرف (${letter})`);
}

function openGeneralDetails(data, defaultTitle) {
	// data is now the actual document object, or undefined if not found
	document.getElementById("modal-letter-title").innerText = data ? data.title : defaultTitle;

	const videoSection = document.getElementById("modal-video-section");
	const videoSectionTitle = document.getElementById("modal-video-title");
	const videoWrapper = document.getElementById("modal-video-iframe-wrapper");
	const pdfSection = document.getElementById("modal-pdf-section");
	const emptySection = document.getElementById("modal-empty-section");

	if (data) {
		emptySection.classList.add("hide");

		if (data.mediaUrl) {
			// For Google Drive links, try to embed as video
			if (data.mediaUrl.includes("drive.google.com")) {
				// Extract file ID from drive.google.com/file/d/{FILE_ID}/view
				const match = data.mediaUrl.match(/\/d\/([a-zA-Z0-9_-]+)\//);
				if (match) {
					const fileId = match[1];
					const viewUrl = `https://drive.google.com/file/d/${fileId}/preview`;

					videoWrapper.innerHTML = `<iframe src="${viewUrl}" allowfullscreen></iframe>`;
					videoSection.classList.remove("hide");
					videoSectionTitle.classList.remove("hide");
				}
			} else if (data.mediaUrl.includes("canva.com") || data.mediaUrl.includes("wordwall.net")) {
				// For Canva and Wordwall links, display as embedded iframe
				const formattedUrl = formatPlayUrl(data.mediaUrl);
				videoWrapper.innerHTML = `<iframe loading="lazy" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; border: none; padding: 0; margin: 0;" src="${formattedUrl}" allowfullscreen="allowfullscreen" allow="fullscreen"></iframe>`;
				videoSection.classList.remove("hide");
				videoSectionTitle.classList.add("hide"); // Hide title for play category since it may already be in the iframe
			} else {
				// For other URLs, use video tag with warning
				videoWrapper.innerHTML = `<div class="mb-3 p-3 bg-yellow-100 border border-yellow-400 rounded-lg"><p class="text-sm text-yellow-800">⚠️ نوع الوسائط قد لا يكون مدعوماً. يرجى التأكد من أن الملف بصيغة صحيحة.</p></div><video width="100%" height="auto" controls style="border-radius: 0.5rem;"><source src="${data.mediaUrl}" type="video/mp4"><p class="text-sm text-gray-600">متصفحك لا يدعم تشغيل الفيديو. يرجى فتح الرابط مباشرة.</p></video>`;
				videoSection.classList.remove("hide");
				videoSectionTitle.classList.remove("hide"); // Show title for other video types
			}
		} else {
			videoSection.classList.add("hide");
			videoWrapper.innerHTML = "";
		}

		if (data.pdfUrl) {
			document.getElementById("modal-pdf-btn").href = data.pdfUrl;
			pdfSection.classList.remove("hide");
		} else {
			pdfSection.classList.add("hide");
		}

		// Show confetti, but don't let it block modal display
		try {
			if (typeof confetti !== "undefined") {
				confetti({ particleCount: 100, spread: 60, origin: { y: 0.8 } });
			}
		} catch (err) {
			console.warn("Confetti error:", err);
		}
	} else {
		videoSection.classList.add("hide");
		videoWrapper.innerHTML = "";
		pdfSection.classList.add("hide");
		emptySection.classList.remove("hide");
	}

	// Show modal
	const modal = document.getElementById("child-modal");
	if (modal) {
		modal.classList.remove("hide");
	} else {
		console.error("Modal element not found!");
	}
}

function showCustomAlert(icon, text) {
	document.getElementById("alert-icon").innerText = icon;
	document.getElementById("alert-text").innerText = text;
	document.getElementById("custom-alert").classList.remove("hide");
}

function closeAlert() {
	document.getElementById("custom-alert").classList.add("hide");
}

function closeChildModal() {
	document.getElementById("modal-video-iframe-wrapper").innerHTML = "";
	document.getElementById("child-modal").classList.add("hide");
}

function closeLockModal() {
	document.getElementById("lock-modal").classList.add("hide");
}

function setButtonLoading(button, isLoading, originalText = null) {
	if (isLoading) {
		button.classList.add("button-loading");
		button.disabled = true;
		button.dataset.originalText = originalText || button.innerText;
		button.innerText = "جاري...";
	} else {
		button.classList.remove("button-loading");
		button.disabled = false;
		button.innerText = button.dataset.originalText || "حفظ ونشر فوراً 🚀";
	}
}
