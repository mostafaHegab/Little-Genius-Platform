const ALPHA = ["أ", "ب", "م", "ح", "ج", "د", "خ", "ت", "ل", "س", "ن", "ر", "ف", "ك", "ق", "ي", "ع", "ش", "و", "هـ", "ذ", "ظ", "ز", "ط", "ص", "ض", "ث", "غ"];
let currentLevelMode = "step"; // step, kg1, kg2
let currentActivityMode = "letters"; // letters, draw, stories, play, pdf
let canvas,
	ctx,
	drawing = false;

const firebaseConfig = {
	apiKey: "AIzaSyA7rIk6BH7gwFE1jBRwzWVy_LJGZzcWXQI",
	authDomain: "little-genius-platform.firebaseapp.com",
	projectId: "little-genius-platform",
	storageBucket: "little-genius-platform.firebasestorage.app",
	messagingSenderId: "1040985707485",
	appId: "1:1040985707485:web:79aa3444a93e2130045c34",
};

// تهيئة المتغيرات الأساسية لدعم التخزين المزدوج (السحابة والمحلي)
let db = null;
let auth = null;
let isCloudMode = false;

/**
 * Initialize nested cloud data structure
 * Structure: { level: { category: { docId: data } } }
 */
function initializeNestedCloudData() {
	const levels = ["step", "kg1", "kg2"];
	const categories = ["letters", "stories", "play", "pdf"];
	const nested = {};

	levels.forEach((level) => {
		nested[level] = {};
		categories.forEach((category) => {
			nested[level][category] = {};
		});
	});

	return nested;
}

let cloudData = initializeNestedCloudData();

/**
 * Get Firestore collection path based on level and category
 * Structure: {level}/{category}/
 * Example: step/letters/
 */
function getCollectionPath(level, category) {
	return `${level}_${category}`;
}

// محاولة جلب إعدادات Firebase من البيئة السحابية لتشغيلها بشكل آمن وتجنب التعليق
function setupFirebaseEnvironment() {
	try {
		if (typeof firebaseConfig !== "undefined" && firebaseConfig) {
			const parsedConfig = typeof firebaseConfig === "string" ? JSON.parse(firebaseConfig) : firebaseConfig;
			firebase.initializeApp(parsedConfig);
			db = firebase.firestore();
			auth = firebase.auth();
			isCloudMode = true;
		}
	} catch (err) {
		console.warn("Using Offline Memory Mode directly inside Shortcuts.");
	}
}

async function initCloudApp() {
	setupFirebaseEnvironment();

	if (isCloudMode) {
		console.log("Cloud mode enabled. Attempting to listen to cloud data...");
		try {
			listenToCloudData();
		} catch (err) {
			console.error("initialization failed, loading offline storage mode:", err);
			isCloudMode = false;
			listenToCloudData();
		}
	} else {
		listenToCloudData();
	}

	setupAdminSelect();
}

function listenToCloudData() {
	console.log("Setting up data listener...");
	if (isCloudMode && db) {
		cloudData = {}; // Reset
		let listenersCount = 0;
		let loadedCollections = 0;
		const levels = ["step", "kg1", "kg2"];
		const categories = ["letters", "stories", "play", "pdf"];
		const totalCollections = levels.length * categories.length;

		// Listen to all level/category combinations
		levels.forEach((level) => {
			categories.forEach((category) => {
				const collectionPath = getCollectionPath(level, category);
				console.log(`Listening to: ${collectionPath}`);

				db.collection(collectionPath).onSnapshot(
					(snapshot) => {
						// Initialize nested structure
						if (!cloudData[level]) cloudData[level] = {};
						if (!cloudData[level][category]) cloudData[level][category] = {};

						// Clear and rebuild this category
						cloudData[level][category] = {};
						snapshot.forEach((doc) => {
							const docId = doc.id;
							cloudData[level][category][docId] = doc.data();
						});

						loadedCollections++;
						console.log(`✓ Loaded ${collectionPath} (${loadedCollections}/${totalCollections})`);

						// Trigger UI update when all collections loaded
						if (loadedCollections === totalCollections) {
							console.log("✓ All collections loaded");
							updateActiveAlphabetVisuals();
							updateFilteredAdminList();
							if (document.getElementById("act").classList.contains("hide") === false) {
								refreshActivityContent();
							}
							document.getElementById("loading-screen").classList.add("hide");
							nav("home");
						}
					},
					(error) => {
						console.error(`Firebase fetch error for ${collectionPath}:`, error);
						loadedCollections++;
						// Continue anyway
						if (loadedCollections === totalCollections) {
							fallbackToLocalStorage();
						}
					},
				);
			});
		});
	} else {
		fallbackToLocalStorage();
	}
}

function fallbackToLocalStorage() {
	console.log("Falling back to localStorage...");
	const saved = localStorage.getItem("genius_kids_v3_local_data");
	if (saved) {
		try {
			const parsed = JSON.parse(saved);
			// Ensure structure is nested (level -> category -> docId -> data)
			cloudData = parsed;
			console.log("✓ Loaded from localStorage");
		} catch (err) {
			console.error("Failed to parse localStorage data:", err);
			cloudData = initializeNestedCloudData();
		}
	} else {
		cloudData = initializeNestedCloudData();
	}

	updateActiveAlphabetVisuals();
	updateFilteredAdminList();
	if (document.getElementById("act").classList.contains("hide") === false) {
		refreshActivityContent();
	}
	document.getElementById("loading-screen").classList.add("hide");
	nav("home");
}

/* بوابة الدخول السحابية المشفرة */
function openAdminGate() {
	console.log("🚀 ~ openAdminGate ~ auth.currentUser:", auth?.currentUser?.email);
	// if email is not in admins list, return
	if (isCloudMode && auth && auth.currentUser && !auth.currentUser.isAnonymous) {
		nav("admin-screen");
	} else {
		document.getElementById("admin-email").value = "";
		document.getElementById("admin-password").value = "";
		document.getElementById("lock-modal").classList.remove("hide");
	}
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

async function loginAdmin() {
	const email = document.getElementById("admin-email").value.trim();
	const password = document.getElementById("admin-password").value;
	const loginBtn = document.querySelector("#lock-modal button[onclick='loginAdmin()']");

	if (!email || !password) {
		showCustomAlert("⚠️", "يرجى كتابة البريد الإلكتروني وكلمة السر!");
		return;
	}

	try {
		if (loginBtn) setButtonLoading(loginBtn, true, "تسجيل دخول 🔑");

		if (isCloudMode && auth) {
			try {
				await auth.signInWithEmailAndPassword(email, password);
				closeLockModal();
				nav("admin-screen");
			} catch (err) {
				showCustomAlert("❌", "تعذر تسجيل الدخول، يرجى التحقق من صحة البيانات.");
			}
		} else {
			if (password === "2026") {
				closeLockModal();
				nav("admin-screen");
			} else {
				showCustomAlert("❌", "رمز المرور غير صحيح!");
			}
		}
	} finally {
		if (loginBtn) setButtonLoading(loginBtn, false);
	}
}

async function loginUser() {
	const email = document.getElementById("user-email").value.trim();
	const password = document.getElementById("user-password").value;
	const loginBtn = document.querySelector("#login-screen button[onclick='loginUser()']");

	if (!email || !password) {
		showCustomAlert("⚠️", "يرجى كتابة البريد الإلكتروني وكلمة السر!");
		return;
	}

	try {
		if (loginBtn) setButtonLoading(loginBtn, true, "تسجيل دخول 🔑");

		if (isCloudMode && auth) {
			try {
				await auth.signInWithEmailAndPassword(email, password);
				closeLockModal();
				nav("home");
			} catch (err) {
				showCustomAlert("❌", "تعذر تسجيل الدخول، يرجى التحقق من صحة البيانات.");
			}
		} else {
			if (password === "2026") {
				closeLockModal();
				nav("home");
			} else {
				showCustomAlert("❌", "رمز المرور غير صحيح!");
			}
		}
	} finally {
		if (loginBtn) setButtonLoading(loginBtn, false);
	}
}

async function logoutAdmin() {
	const logoutBtn = document.querySelector("button[onclick='logoutAdmin()']");
	try {
		if (logoutBtn) setButtonLoading(logoutBtn, true, "تسجيل خروج 🚪");

		if (isCloudMode && auth) {
			try {
				await auth.signOut();
				await auth.signInAnonymously();
			} catch (e) {}
		}
		nav("home");
		showCustomAlert("🚪", "تم تسجيل خروجكِ بأمان من الإدارة.");
	} finally {
		if (logoutBtn) setButtonLoading(logoutBtn, false);
	}
}

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

function updateAdminList(filterLevel = null, filterCategory = null) {
	const container = document.getElementById("active-letters-list");
	container.innerHTML = "";

	const levelNames = { step: "خطواتي الأولى", kg1: "KG1", kg2: "KG2" };
	const catNames = { letters: "ألبوم الحروف", stories: "القصص", play: "هيا نلعب", pdf: "ملفات الطباعة" };

	const allItems = [];

	// Flatten nested structure for display
	Object.keys(cloudData).forEach((level) => {
		if (cloudData[level]) {
			Object.keys(cloudData[level]).forEach((category) => {
				if (cloudData[level][category]) {
					Object.keys(cloudData[level][category]).forEach((docId) => {
						const item = cloudData[level][category][docId];
						allItems.push({
							level,
							category,
							docId,
							item,
						});
					});
				}
			});
		}
	});

	// Filter items if parameters provided
	let filteredItems = allItems;
	if (filterLevel || filterCategory) {
		filteredItems = allItems.filter((item) => {
			if (filterLevel && item.level !== filterLevel) return false;
			if (filterCategory && item.category !== filterCategory) return false;
			return true;
		});
	}

	if (filteredItems.length === 0) {
		container.innerHTML = `<p class="text-xs text-gray-400 text-center">لا توجد محتويات مضافة حالياً.</p>`;
		return;
	}

	filteredItems.forEach(({ level, category, docId, item }) => {
		const row = document.createElement("div");
		row.className = "p-3 bg-white rounded-2xl border text-sm space-y-1 relative";

		const levelDisplay = levelNames[level] || level;
		const catDisplay = catNames[category] || category;
		const targetDisplay = category === "letters" ? `حرف (${docId})` : item.title || docId;

		const deleteBtn = document.createElement("button");
		deleteBtn.className = "absolute top-2 left-2 bg-red-100 text-red-600 px-3 py-1 rounded-xl text-xs font-bold active:scale-95";
		deleteBtn.innerText = "حذف 🗑️";
		deleteBtn.onclick = function () {
			deleteContentCloud("${level}", "${category}", "${docId}", this);
		};

		row.innerHTML = `
                    <div class="font-bold text-gray-800 text-sm">🎯 : ${targetDisplay}</div>
                `;
		row.appendChild(deleteBtn);
		container.appendChild(row);
	});
}

function updateFilteredAdminList() {
	const level = document.getElementById("admin-level-select").value;
	const category = document.getElementById("admin-category-select").value;

	const levelNames = { step: "خطواتي الأولى", kg1: "KG1", kg2: "KG2" };
	const catNames = { letters: "ألبوم الحروف", stories: "القصص", play: "هيا نلعب", pdf: "ملفات الطباعة" };

	// Update filter display labels
	document.getElementById("filter-level-display").innerText = levelNames[level] || level;
	document.getElementById("filter-category-display").innerText = catNames[category] || category;

	// Update the list with filters
	updateAdminList(level, category);
}

function buildLetterPayload(data) {
	return {
		letter: data.letter,
		title: `حرف ${data.letter}`,
		mediaUrl: data.mediaUrl,
		pdfUrl: data.pdfUrl,
		createdAt: new Date().toISOString(),
	};
}

function buildStoryPayload(data) {
	return {
		title: data.title,
		mediaUrl: data.mediaUrl,
		createdAt: new Date().toISOString(),
	};
}

function buildPlayPayload(data) {
	return {
		title: data.title,
		mediaUrl: data.mediaUrl,
		createdAt: new Date().toISOString(),
	};
}

function buildPdfPayload(data) {
	return {
		title: data.title,
		pdfUrl: data.pdfUrl,
		createdAt: new Date().toISOString(),
	};
}

function buildCollectionPayload(category, data) {
	const builders = {
		letters: buildLetterPayload,
		stories: buildStoryPayload,
		play: buildPlayPayload,
		pdf: buildPdfPayload,
	};

	return builders[category] ? builders[category](data) : {};
}

/**
 * Validate if a URL is a valid Google Drive link
 * Accepts formats:
 * - https://drive.google.com/file/d/{FILE_ID}/view
 * - https://drive.google.com/open?id={FILE_ID}
 */
function isValidGoogleDriveLink(url) {
	if (!url) return false;
	try {
		const urlObj = new URL(url);
		// Check if it's a Google Drive URL
		if (!urlObj.hostname.includes("drive.google.com")) return false;
		// Check if it has either the file/d/ pattern or open?id= pattern
		return /\/d\/[a-zA-Z0-9-_]+/.test(url) || /id=[a-zA-Z0-9-_]+/.test(url);
	} catch (e) {
		return false;
	}
}

/**
 * Validate if a URL is a valid Wordwall or Canva link
 * Accepts formats:
 * - https://wordwall.net/...
 * - https://www.wordwall.net/...
 * - https://www.canva.com/...
 * - https://canva.com/...
 */
function isValidWordwallOrCanvaLink(url) {
	if (!url) return false;
	try {
		const urlObj = new URL(url);
		const hostname = urlObj.hostname.toLowerCase();
		// Check if it's Wordwall or Canva
		return hostname.includes("wordwall.net") || hostname.includes("canva.com");
	} catch (e) {
		return false;
	}
}

/**
 * Check if input is HTML code (contains HTML tags)
 */
function isHtmlCode(input) {
	return /<[^>]*>/g.test(input);
}

/**
 * Extract iframe src from HTML embed code
 * Looks for <iframe src="..."> and extracts the URL
 */
function extractIframeSrcFromHtml(htmlCode) {
	try {
		// Match iframe tag with src attribute
		const iframeMatch = htmlCode.match(/<iframe[^>]+src=["']([^"']+)["']/i);
		if (iframeMatch && iframeMatch[1]) {
			return iframeMatch[1];
		}
		return null;
	} catch (e) {
		console.error("Error extracting iframe src:", e);
		return null;
	}
}

/**
 * Format Canva URL by adding ?embed parameter if not present
 */
function formatPlayUrl(url) {
	if (url.includes("canva.com") && !url.endsWith("?embed")) {
		return url + "?embed";
	}
	return url;
}

/**
 * Process media input for play category
 * If HTML code is detected, extract the iframe src
 * Otherwise, return the input as-is
 */
function processPlayMediaInput(input) {
	if (isHtmlCode(input)) {
		const extractedUrl = extractIframeSrcFromHtml(input);
		if (extractedUrl) {
			return extractedUrl;
		} else {
			// HTML code but no iframe found
			return null;
		}
	}
	// Not HTML, return as-is
	return input;
}

document.getElementById("admin-form").addEventListener("submit", async (e) => {
	e.preventDefault();

	const submitBtn = e.target.querySelector("button[type='submit']");
	const originalBtnText = submitBtn.innerText;

	// Show loading state
	submitBtn.classList.add("button-loading");
	submitBtn.disabled = true;
	submitBtn.innerText = "جاري الحفظ...";

	try {
		const level = document.getElementById("admin-level-select").value;
		const category = document.getElementById("admin-category-select").value;
		const letter = document.getElementById("admin-letter-select").value;
		const title = document.getElementById("admin-content-title").value;
		let mediaUrl = document.getElementById("admin-media-url").value;
		const pdfUrl = document.getElementById("admin-pdf-url").value;

		// Process media URL for play category (extract from HTML if needed)
		if (mediaUrl && category === "play") {
			const processedUrl = processPlayMediaInput(mediaUrl);
			if (isHtmlCode(mediaUrl) && !processedUrl) {
				showCustomAlert("⚠️", "لم أستطع استخراج الرابط من كود HTML! تأكد من أنه يحتوي على عنصر iframe بسمة src");
				return;
			}
			mediaUrl = processedUrl;
		}

		// Validate URLs based on category
		if (mediaUrl) {
			if (category === "play") {
				// For play category, only accept Wordwall or Canva
				if (!isValidWordwallOrCanvaLink(mediaUrl)) {
					showCustomAlert("⚠️", "يرجى استخدام رابط من Wordwall أو Canva فقط! مثال: wordwall.net أو canva.com");
					return;
				}
			} else if (!isValidGoogleDriveLink(mediaUrl)) {
				// For other categories, enforce Google Drive
				showCustomAlert("⚠️", "رابط Google Drive غير صحيح! يرجى التأكد من أن الرابط يبدأ بـ drive.google.com");
				return;
			}
		}
		if (pdfUrl && !isValidGoogleDriveLink(pdfUrl)) {
			showCustomAlert("⚠️", "رابط ملف PDF غير صحيح! يرجى التأكد من أن الرابط يبدأ بـ drive.google.com");
			return;
		}

		// Document ID: letter name for letters category, timestamp for others
		let documentId = "";
		if (category === "letters") {
			documentId = letter; // Use letter as document ID: ا, ب, etc.
		} else {
			documentId = `${Date.now()}`; // Use timestamp for unique IDs
		}

		const payload = buildCollectionPayload(category, { letter, title, mediaUrl, pdfUrl });

		const collectionPath = getCollectionPath(level, category);
		console.log(`Saving to: ${collectionPath}/${documentId}`);

		if (isCloudMode && db) {
			try {
				await db.collection(collectionPath).doc(documentId).set(payload);
				showCustomAlert("🌟", "تم الحفظ والنشر بنجاح سحابياً!");
			} catch (err) {
				console.error("Cloud save failed:", err);
				saveToLocalStore(level, category, documentId, payload);
				showCustomAlert("💾", "تم تفعيل وضع حفظ الموبايل الداخلي بنجاح!");
			}
		} else {
			saveToLocalStore(level, category, documentId, payload);
			showCustomAlert("💾", "تم حفظ وتحديث المحتوى بنجاح داخل هاتفك!");
		}

		document.getElementById("admin-form").reset();
		toggleLetterField();
		confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
	} catch (error) {
		console.error("Form submission error:", error);
		showCustomAlert("❌", "حدث خطأ أثناء الحفظ، يرجى المحاولة مجدداً.");
	} finally {
		// Remove loading state
		submitBtn.classList.remove("button-loading");
		submitBtn.disabled = false;
		submitBtn.innerText = originalBtnText;
	}
});

function saveToLocalStore(level, category, documentId, data) {
	// Initialize nested structure
	if (!cloudData[level]) cloudData[level] = {};
	if (!cloudData[level][category]) cloudData[level][category] = {};

	cloudData[level][category][documentId] = data;
	localStorage.setItem("genius_kids_v3_local_data", JSON.stringify(cloudData));
	updateActiveAlphabetVisuals();
	updateFilteredAdminList();
	if (!document.getElementById("act").classList.contains("hide")) {
		refreshActivityContent();
	}
}

async function deleteContentCloud(level, category, documentId, deleteBtn) {
	if (confirm("هل تريدين حذف هذا المحتوى نهائياً؟")) {
		try {
			if (deleteBtn) setButtonLoading(deleteBtn, true, "حذف 🗑️");

			const collectionPath = getCollectionPath(level, category);
			console.log(`Deleting from: ${collectionPath}/${documentId}`);

			if (isCloudMode && db) {
				try {
					await db.collection(collectionPath).doc(documentId).delete();
					showCustomAlert("🗑️", "تم الحذف بنجاح.");
				} catch (err) {
					console.error("Cloud delete failed:", err);
					deleteFromLocalStore(level, category, documentId);
				}
			} else {
				deleteFromLocalStore(level, category, documentId);
				showCustomAlert("🗑️", "تم مسح المحتوى تماماً من موبايلك.");
			}
		} finally {
			if (deleteBtn) setButtonLoading(deleteBtn, false);
		}
	}
}

function deleteFromLocalStore(level, category, documentId) {
	if (cloudData[level] && cloudData[level][category]) {
		delete cloudData[level][category][documentId];
		localStorage.setItem("genius_kids_v3_local_data", JSON.stringify(cloudData));
		updateActiveAlphabetVisuals();
		updateFilteredAdminList();
		if (!document.getElementById("act").classList.contains("hide")) {
			refreshActivityContent();
		}
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

function closeChildModal() {
	document.getElementById("modal-video-iframe-wrapper").innerHTML = "";
	document.getElementById("child-modal").classList.add("hide");
}

function nav(id) {
	document.querySelectorAll("body > div[id]").forEach((d) => d.classList.add("hide"));
	document.getElementById(id).classList.remove("hide");
	document.body.style.overflowY = id === "home" || id === "admin-screen" ? "auto" : "hidden";
}

function showDash(title, mode) {
	document.getElementById("lvl-name").innerText = title;
	currentLevelMode = mode;
	nav("dash");
}

function refreshActivityContent() {
	const body = document.getElementById("act-body");
	const vbtn = document.getElementById("v-btn");

	// Get items from nested structure: cloudData[level][category]
	const categoryData = cloudData[currentLevelMode] && cloudData[currentLevelMode][currentActivityMode];
	const matchingItems = categoryData ? Object.values(categoryData) : [];

	if (currentActivityMode === "letters") {
		document.getElementById("act-title").innerText = "ألبوم الحروف";
		body.innerHTML = "";

		if (currentLevelMode === "kg1") {
			ALPHA.forEach((l) => {
				body.innerHTML += `
                            <div class="flower" id="letter-wrapper-${l}" onclick="openLetterDetails('${l}')">
                                <div class="petal" style="--pc:#ff9ff3; transform:rotate(0deg)"></div>
                                <div class="petal" style="--pc:#feca57; transform:rotate(72deg)"></div>
                                <div class="petal" style="--pc:#ff6b6b; transform:rotate(144deg)"></div>
                                <div class="petal" style="--pc:#48dbfb; transform:rotate(216deg)"></div>
                                <div class="petal" style="--pc:#1dd1a1; transform:rotate(288deg)"></div>
                                <div class="flower-center">${l}</div>
                            </div>`;
			});
		} else if (currentLevelMode === "kg2") {
			body.classList.add("space-bg");
			body.innerHTML = `<div class="rocket-anim">🚀</div>`;
			const configs = [
				{ p: "#ff4d4d", r: "#ff7675", g: "#ff1a1a" },
				{ p: "#4d94ff", r: "#74b9ff", g: "#1a75ff" },
				{ p: "#4dff88", r: "#55efc4", g: "#00e64d" },
				{ p: "#ffdb4d", r: "#ffeaa7", g: "#ffcc00" },
			];
			ALPHA.forEach((l, i) => {
				const conf = configs[i % configs.length];
				body.innerHTML += `
                            <div class="planet-container" id="letter-wrapper-${l}" onclick="openLetterDetails('${l}')">
                                <div class="ring" style="--rc:${conf.r}"></div>
                                <div class="planet" style="--c1:${conf.p}; --glow:${conf.g}">${l}</div>
                            </div>`;
			});
		} else {
			body.classList.remove("space-bg");
			const colors = ["#FF4757", "#2ED573", "#1E90FF", "#FFA502", "#FF6B81"];
			ALPHA.forEach((l, i) => {
				body.innerHTML += `
                            <div class="balloon" id="letter-wrapper-${l}" style="--bc:${colors[i % 5]}" onclick="openLetterDetails('${l}')">
                                ${l}
                            </div>`;
			});
		}

		updateActiveAlphabetVisuals();
		vbtn.classList.add("hide");
	} else if (currentActivityMode === "draw") {
		document.getElementById("act-title").innerText = "ارسم ولون";
		vbtn.classList.remove("hide");
		body.innerHTML = `<div class="w-full max-w-md p-4"><div class="scroll-x flex gap-4 mb-4 p-4 bg-white rounded-3xl shadow-inner">${ALPHA.map((l) => `<button onclick="setChar('${l}')" class="letter-nav-btn">${l}</button>`).join("")}</div><div class="drawing-zone"><div id="char-shadow">أ</div><canvas id="mainCvs"></canvas></div><button onclick="clearCanvas()" class="w-full mt-6 bg-indigo-950 text-white py-5 rounded-3xl font-black text-2xl shadow-[0_5px_0_#000]">مسح اللوحة 🗑️</button></div>`;
		setTimeout(initCvs, 100);
	} else {
		// Stories, Games, PDF
		const titles = { stories: "القصص السحابية 📖", play: "ألعاب تفاعلية 🎮", pdf: "ملفات الطباعة 📄" };
		document.getElementById("act-title").innerText = titles[currentActivityMode];

		body.innerHTML = "";
		vbtn.classList.add("hide");

		if (matchingItems.length === 0) {
			body.innerHTML = `
                        <div class="text-center w-full mt-24 px-6 text-gray-500">
                            <div class="text-8xl mb-4">✨</div>
                            <h2 class="text-2xl font-black text-indigo-950">مفاجأة قريباً!</h2>
                            <p class="text-sm text-gray-400 mt-2">معلمتي تحضر لي ألعاباً وملفات رائعة في هذا القسم.</p>
                        </div>`;
		} else {
			matchingItems.forEach((item) => {
				const card = document.createElement("div");
				card.className = "content-card";
				card.onclick = () => openGeneralDetails(item, item.title);

				let icon = "🎮";
				if (currentActivityMode === "stories") icon = "📖";
				if (currentActivityMode === "pdf") icon = "📄";

				card.innerHTML = `
                            <div class="flex items-center gap-4">
                                <span class="text-4xl">${icon}</span>
                                <div>
                                    <h4 class="font-black text-lg text-indigo-950">${item.title}</h4>
                                    <p class="text-xs text-gray-400 mt-1">${item.pdfUrl ? "يحتوي على ورقة عمل للطباعة 🖨️" : "محتوى تفاعلي مميز ✨"}</p>
                                </div>
                            </div>
                        `;
				body.appendChild(card);
			});
		}
	}
}

function openAct(mode) {
	currentActivityMode = mode;
	nav("act");
	refreshActivityContent();
}

function initCvs() {
	canvas = document.getElementById("mainCvs");
	ctx = canvas.getContext("2d");
	const rect = canvas.parentNode.getBoundingClientRect();
	canvas.width = rect.width;
	canvas.height = rect.height;
	ctx.lineWidth = 35;
	ctx.lineCap = "round";
	ctx.strokeStyle = "#3b82f6";
	const getXY = (e) => {
		const r = canvas.getBoundingClientRect();
		const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
		const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
		return { x, y };
	};
	const start = (e) => {
		drawing = true;
		ctx.beginPath();
		const p = getXY(e);
		ctx.moveTo(p.x, p.y);
		if (e.cancelable) e.preventDefault();
	};
	const move = (e) => {
		if (!drawing) return;
		const p = getXY(e);
		ctx.lineTo(p.x, p.y);
		ctx.stroke();
		if (e.cancelable) e.preventDefault();
	};
	canvas.addEventListener("touchstart", start, { passive: false });
	canvas.addEventListener("touchmove", move, { passive: false });
	window.addEventListener("touchend", () => (drawing = false));
	canvas.addEventListener("mousedown", start);
	canvas.addEventListener("mousemove", move);
	window.addEventListener("mouseup", () => (drawing = false));
}
function setChar(l) {
	document.getElementById("char-shadow").innerText = l;
	clearCanvas();
}
function clearCanvas() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function checkWork() {
	confetti({ particleCount: 200, spread: 80, origin: { y: 0.8 } });
}

window.onload = function () {
	try {
		setupFirebaseEnvironment();

		auth.onAuthStateChanged(async (user) => {
			if (!user) {
				nav("login-screen");
				return;
			}

			await initCloudApp();
		});
	} catch (err) {
		console.error(err);

		document.getElementById("loading-screen").innerHTML = `
            <div class="text-center">
                <h2 class="text-red-600 text-2xl font-bold">
                    Failed to connect
                </h2>
            </div>
        `;
	}
};
