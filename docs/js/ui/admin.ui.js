function toggleLetterField() {
	const cat = document.getElementById("admin-category-select").value;
	const letterField = document.getElementById("admin-letter-field");
	const titleField = document.getElementById("admin-title-field");
	const mediaField = document.getElementById("admin-media-field");
	const pdfField = document.getElementById("admin-pdf-field");

	// Reset all fields
	letterField.classList.add("hide");
	titleField.classList.add("hide");
	mediaField.classList.add("hide");
	pdfField.classList.add("hide");
	document.getElementById("admin-content-title").required = false;
	document.getElementById("admin-media-url").required = false;
	document.getElementById("admin-pdf-url").required = false;

	if (cat === "letters") {
		// Letters: letter select, video URL, and PDF URL
		letterField.classList.remove("hide");
		mediaField.classList.remove("hide");
		pdfField.classList.remove("hide");
		document.getElementById("admin-media-url").required = true;
		document.getElementById("admin-pdf-url").required = true;
		updateDynamicLabels("letters");
	} else if (cat === "stories") {
		// Stories: title and media link
		titleField.classList.remove("hide");
		mediaField.classList.remove("hide");
		document.getElementById("admin-content-title").required = true;
		document.getElementById("admin-media-url").required = true;
		updateDynamicLabels("stories");
	} else if (cat === "play") {
		// Play: title and URL
		titleField.classList.remove("hide");
		mediaField.classList.remove("hide");
		document.getElementById("admin-content-title").required = true;
		document.getElementById("admin-media-url").required = true;
		updateDynamicLabels("play");
	} else if (cat === "pdf") {
		// PDF: title and PDF link
		titleField.classList.remove("hide");
		pdfField.classList.remove("hide");
		document.getElementById("admin-content-title").required = true;
		document.getElementById("admin-pdf-url").required = true;
		updateDynamicLabels("pdf");
	}
}

/**
 * Update form labels and placeholders dynamically based on category
 */
function updateDynamicLabels(category) {
	const titleLabel = document.getElementById("admin-title-label");
	const titleInput = document.getElementById("admin-content-title");
	const mediaLabel = document.getElementById("admin-media-label");
	const mediaInput = document.getElementById("admin-media-url");
	const pdfLabel = document.getElementById("admin-pdf-label");
	const pdfInput = document.getElementById("admin-pdf-url");

	const labelTexts = {
		letters: {
			media: "رابط فيديو الحرف (Google Drive):",
			pdf: "رابط ملف PDF للحرف (Google Drive):",
			mediaHint: "⚠️ يجب أن يكون رابط Google Drive صحيح (مثال: drive.google.com/file/d/...)",
		},
		stories: {
			title: "عنوان القصة:",
			media: "رابط القصة أو الفيديو (Google Drive):",
			titlePlaceholder: "مثال: قصة الصدق منجاة",
			mediaPlaceholder: "رابط فيديو القصة",
			mediaHint: "⚠️ يجب أن يكون رابط Google Drive صحيح (مثال: drive.google.com/file/d/...)",
		},
		play: {
			title: "عنوان اللعبة:",
			media: "رابط اللعبة (Wordwall أو Canva):",
			titlePlaceholder: "مثال: لعبة التوصيل",
			mediaPlaceholder: "https://wordwall.net/... أو https://canva.com/... أو كود HTML",
			mediaHint: "ℹ️ يمكنك إدراج رابط مباشر أو كود HTML embed من Wordwall/Canva (سيتم استخراج الرابط تلقائياً)",
		},
		pdf: {
			title: "عنوان الملف:",
			pdf: "رابط ملف PDF (Google Drive):",
			titlePlaceholder: "مثال: أوراق تلوين الحروف",
			pdfPlaceholder: "رابط ملف PDF",
		},
	};

	const config = labelTexts[category];

	if (config.title) {
		titleLabel.innerText = config.title;
	}
	if (config.titlePlaceholder) {
		titleInput.placeholder = config.titlePlaceholder;
	}
	if (config.media) {
		mediaLabel.innerText = config.media;
	}
	if (config.mediaPlaceholder) {
		mediaInput.placeholder = config.mediaPlaceholder;
	}
	if (config.pdf) {
		pdfLabel.innerText = config.pdf;
	}
	if (config.pdfPlaceholder) {
		pdfInput.placeholder = config.pdfPlaceholder;
	}
	if (config.mediaHint) {
		const mediaHint = document.getElementById("admin-media-hint");
		mediaHint.innerText = config.mediaHint;
	}
}

function setupAdminSelect() {
	const select = document.getElementById("admin-letter-select");
	select.innerHTML = "";
	ALPHA.forEach((letter) => {
		const opt = document.createElement("option");
		opt.value = letter;
		opt.innerText = `حرف (${letter})`;
		select.appendChild(opt);
	});
}

async function updateFilteredAdminList() {
	const level = document.getElementById("admin-level-select").value;
	const category = document.getElementById("admin-category-select").value;

	const levelNames = { step: "خطواتي الأولى", kg1: "KG1", kg2: "KG2" };
	const catNames = { letters: "ألبوم الحروف", stories: "القصص", play: "هيا نلعب", pdf: "ملفات الطباعة" };

	// Update filter display labels
	document.getElementById("filter-level-display").innerText = levelNames[level] || level;
	document.getElementById("filter-category-display").innerText = catNames[category] || category;

	await fetchCloudDataForAdmin(level, category);
}

function updateActiveAlphabetVisuals() {
	ALPHA.forEach((letter) => {
		const el = document.getElementById(`letter-wrapper-${letter}`);
		if (el) {
			// Check if letter exists in current level's letters collection
			const hasLetter = cloudData[currentLevelMode] && cloudData[currentLevelMode].letters && cloudData[currentLevelMode].letters[letter];

			let star = el.querySelector(".cloud-star");
			if (hasLetter) {
				if (!star) {
					star = document.createElement("div");
					star.className = "cloud-star";
					star.innerText = "⭐";
					el.appendChild(star);
				}
			} else {
				if (star) star.remove();
			}
		}
	});
}
