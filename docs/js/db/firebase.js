// محاولة جلب إعدادات Firebase من البيئة السحابية لتشغيلها بشكل آمن وتجنب التعليق
function setupFirebaseEnvironment() {
	try {
		if (typeof firebaseConfig !== "undefined" && firebaseConfig) {
			const parsedConfig = typeof firebaseConfig === "string" ? JSON.parse(firebaseConfig) : firebaseConfig;
			firebase.initializeApp(parsedConfig);
			db = firebase.firestore();
			auth = firebase.auth();
		}
	} catch (err) {
		alert("خطأ في إعدادات Firebase. تأكد من تكوين البيئة السحابية بشكل صحيح.");
		console.error("Firebase initialization error:", err);
	}
}

async function initCloudApp(target = "home") {
	setupFirebaseEnvironment();

	console.log("Cloud mode enabled. Attempting to listen to cloud data...");
	try {
		listenToCloudData(target);
	} catch (err) {
		console.error("initialization failed", err);
	}

	setupAdminSelect();
}

async function listenToCloudData(target = "home") {
	console.log("Setting up data listener...");
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
				async (snapshot) => {
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
						await updateFilteredAdminList();
						if (document.getElementById("act").classList.contains("hide") === false) {
							refreshActivityContent();
						}
						document.getElementById("loading-screen").classList.add("hide");
						nav(target);
					}
				},
				(error) => {
					console.error(`Firebase fetch error for ${collectionPath}:`, error);
					loadedCollections++;
					// Continue anyway
					if (loadedCollections === totalCollections) {
						fallbackToLocalStorage(target);
					}
				},
			);
		});
	});
}

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

async function deleteContentCloud(level, category, documentId, deleteBtn) {
	if (confirm("هل تريدين حذف هذا المحتوى نهائياً؟")) {
		try {
			if (deleteBtn) setButtonLoading(deleteBtn, true, "حذف 🗑️");

			const collectionPath = getCollectionPath(level, category);
			console.log(`Deleting from: ${collectionPath}/${documentId}`);

			await db.collection(collectionPath).doc(documentId).delete();
			showCustomAlert("🗑️", "تم الحذف بنجاح.");

			await fetchCloudDataForAdmin(level, category);
		} catch (err) {
			console.error("Cloud delete failed:", err);
			showCustomAlert("❌", "حدث خطأ أثناء الحذف، يرجى المحاولة مجدداً.");
		} finally {
			if (deleteBtn) setButtonLoading(deleteBtn, false);
		}
	}
}

async function fetchActiveUsers() {
	const usersListDiv = document.getElementById("active-users-list");
	usersListDiv.innerHTML = "<p class='text-sm text-gray-500'>جاري جلب المستخدمين النشطين...</p>";

	try {
		const usersSnapshot = await db.collection("users").get();

		if (usersSnapshot.empty) {
			usersListDiv.innerHTML = "<p class='text-sm text-gray-500'>لا يوجد مستخدمين نشطين حالياً.</p>";
			return;
		}

		usersListDiv.innerHTML = "";
		usersSnapshot.forEach((doc) => {
			const user = doc.data();
			const userDiv = document.createElement("div");
			userDiv.className = "p-2 bg-gray-100 rounded-lg mb-2 flex justify-between items-center user-item";
			userDiv.innerHTML = `
						<div>
                            <p class="font-bold text-gray-800 user-name">${user.name || "مستخدم مجهول"}</p>
                            <p class="text-xs text-gray-600 user-email">${user.email}</p>
                        </div>
                        <button class="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold active:scale-95" onclick="showCustomAlert('✅', 'كلمة السر: ${user.password || "غير متوفرة"}')">كلمة السر</button>
						<button class="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold active:scale-95" onclick="deleteUser('${user.email}', this)">حذف</button>
					`;
			usersListDiv.appendChild(userDiv);
		});
	} catch (err) {
		console.error("Error fetching active users:", err);
		usersListDiv.innerHTML = "<p class='text-sm text-red-500'>حدث خطأ أثناء جلب المستخدمين.</p>";
	}
}

async function fetchCloudDataForAdmin(level, category) {
	console.log(`Fetching cloud data for admin - Level: ${level}, Category: ${category}`);
	const container = document.getElementById("active-letters-list");
	container.innerHTML = "<p class='text-sm text-gray-500'>جاري جلب البيانات...</p>";

	try {
		const collectionPath = getCollectionPath(level, category);
		const dataSnapshot = await db.collection(collectionPath).get();

		console.log(`Fetched ${dataSnapshot.size} documents from ${collectionPath}`);

		if (dataSnapshot.empty) {
			container.innerHTML = `<p class="text-xs text-gray-400 text-center">لا توجد محتويات مضافة حالياً.</p>`;
			return;
		}

		container.innerHTML = "";
		dataSnapshot.forEach((doc) => {
			const docId = doc.id;
			const item = doc.data();

			const row = document.createElement("div");
			row.className = "p-3 bg-white rounded-2xl border text-sm space-y-1 relative";

			const levelDisplay = levelNames[level] || level;
			const catDisplay = catNames[category] || category;
			const targetDisplay = category === "letters" ? `حرف (${docId})` : item.title || docId;

			const deleteBtn = document.createElement("button");
			deleteBtn.className = "absolute top-2 left-2 bg-red-100 text-red-600 px-3 py-1 rounded-xl text-xs font-bold active:scale-95";
			deleteBtn.innerText = "حذف 🗑️";
			deleteBtn.onclick = function () {
				deleteContentCloud(level, category, docId, this);
			};

			row.innerHTML = `
                    <div class="font-bold text-gray-800 text-sm">🎯 : ${targetDisplay}</div>
                `;
			row.appendChild(deleteBtn);
			container.appendChild(row);
		});
	} catch (err) {
		console.error("Error fetching cloud data:", err);
		return null;
	}
}
