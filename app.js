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
}

/* بوابة الدخول السحابية المشفرة */
function openAdminGate() {
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
				if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
					try {
						await auth.createUserWithEmailAndPassword(email, password);
						closeLockModal();
						nav("admin-screen");
						showCustomAlert("👑", "أهلاً بكِ معلمتنا العبقرية! تم إنشاء حسابكِ السحابي المؤمن بنجاح.");
					} catch (signupErr) {
						showCustomAlert("❌", "خطأ في تسجيل الدخول أو الرمز خاطئ.");
					}
				} else {
					showCustomAlert("❌", "تعذر تسجيل الدخول، يرجى التحقق من صحة البيانات.");
				}
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
		letterField.classList.remove("hide");
	} else if (cat === "stories") {
		titleField.classList.remove("hide");
		mediaField.classList.remove("hide");
		document.getElementById("admin-content-title").required = true;
		document.getElementById("admin-media-url").required = true;
	} else if (cat === "play") {
		titleField.classList.remove("hide");
		mediaField.classList.remove("hide");
		pdfField.classList.remove("hide");
		document.getElementById("admin-content-title").required = true;
		document.getElementById("admin-media-url").required = true;
		document.getElementById("admin-pdf-url").required = true;
	} else if (cat === "pdf") {
		titleField.classList.remove("hide");
		pdfField.classList.remove("hide");
		document.getElementById("admin-content-title").required = true;
		document.getElementById("admin-pdf-url").required = true;
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
                    <div class="font-bold text-gray-800 text-sm">📍 ${levelDisplay} ⬅️ ${catDisplay}</div>
                    <div class="text-indigo-600 font-bold text-xs">🎯 : ${targetDisplay}</div>
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
		const mediaUrl = document.getElementById("admin-media-url").value;
		const pdfUrl = document.getElementById("admin-pdf-url").value;

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
	const videoWrapper = document.getElementById("modal-video-iframe-wrapper");
	const pdfSection = document.getElementById("modal-pdf-section");
	const emptySection = document.getElementById("modal-empty-section");

	if (data) {
		emptySection.classList.add("hide");

		if (data.mediaUrl) {
			let embedUrl = data.mediaUrl;
			let videoId = null;

			// Handle Google Drive videos
			if (embedUrl.includes("drive.google.com")) {
				// Extract file ID from drive.google.com/file/d/{FILE_ID}/view
				const match = embedUrl.match(/\/d\/([a-zA-Z0-9_-]+)\//);
				if (match) {
					const fileId = match[1];
					embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
				}
			}
			// Handle YouTube videos
			else if (embedUrl.includes("youtube.com/watch")) {
				// Extract video ID from youtube.com/watch?v=VIDEO_ID (handles extra params like &source_ve_path=)
				const match = embedUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/);
				if (match) videoId = match[1];
				if (videoId) {
					embedUrl = `https://www.youtube.com/embed/${videoId}`;
				}
			}
			// Handle youtu.be shortened YouTube links
			else if (embedUrl.includes("youtu.be/")) {
				// Extract video ID from youtu.be/VIDEO_ID (handles extra params)
				const match = embedUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
				if (match) videoId = match[1];
				if (videoId) {
					embedUrl = `https://www.youtube.com/embed/${videoId}`;
				}
			}

			videoWrapper.innerHTML = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
			videoSection.classList.remove("hide");
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

		confetti({ particleCount: 100, spread: 60, origin: { y: 0.8 } });
	} else {
		videoSection.classList.add("hide");
		videoWrapper.innerHTML = "";
		pdfSection.classList.add("hide");
		emptySection.classList.remove("hide");
	}

	document.getElementById("child-modal").classList.remove("hide");
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

window.onload = async function () {
	console.log("App is initializing...");
	try {
		await initCloudApp();
		console.log("Initialization complete.");
	} catch (err) {
		console.error("Initialization error:", err);
	}
};
