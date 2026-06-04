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

document.getElementById("user-management-form").addEventListener("submit", async (e) => {
	e.preventDefault();

	const name = document.getElementById("new-user-name").value.trim();
	const email = document.getElementById("new-user-email").value.trim();
	const password = document.getElementById("new-user-password").value;
	const addBtn = e.target.querySelector("button[type='submit']");

	if (!name) {
		showCustomAlert("⚠️", "يرجى كتابة اسم المستخدم!");
		return;
	}

	if (!email) {
		showCustomAlert("⚠️", "يرجى كتابة البريد الإلكتروني!");
		return;
	}

	if (!password) {
		showCustomAlert("⚠️", "يرجى كتابة كلمة السر!");
		return;
	}

	if (password.length < 6) {
		showCustomAlert("⚠️", "كلمة السر يجب أن تكون 6 أحرف على الأقل!");
		return;
	}

	addBtn.classList.add("button-loading");
	addBtn.disabled = true;
	addBtn.innerText = "جاري الإضافة...";

	try {
		if (isCloudMode && db) {
			try {
				await db.collection("users").doc(email).set({
					name,
					email,
					password,
					createdAt: new Date().toISOString(),
				});

				document.getElementById("refresh-users-btn").click();

				showCustomAlert("✅", "تم إضافة المستخدم بنجاح!");
				e.target.reset();
			} catch (err) {
				console.error("Error adding user:", err);
				showCustomAlert("❌", "تعذر إضافة المستخدم، ربما البريد الإلكتروني مستخدم بالفعل.");
			}
		} else {
			showCustomAlert("❌", "تعذر إضافة المستخدم، يرجى التحقق من الاتصال بالإنترنت.");
		}
	} finally {
		addBtn.classList.remove("button-loading");
		addBtn.disabled = false;
		addBtn.innerText = "إضافة مستخدم جديد🚀";
	}
});

document.getElementById("refresh-users-btn").addEventListener("click", async (e) => {
	e.preventDefault();

	e.target.classList.add("button-loading");
	e.target.disabled = true;

	await fetchActiveUsers();

	e.target.classList.remove("button-loading");
	e.target.disabled = false;
});

document.getElementById("logout-btn").onclick = logoutUser;

document.getElementById("home-title").onclick = openAdminGate;

window.onload = function () {
	try {
		setupFirebaseEnvironment();

		auth.onAuthStateChanged(async (user) => {
			if (!user) {
				let savedUser = localStorage.getItem("genius_kids_current_user");
				if (savedUser) {
					savedUser = JSON.parse(savedUser);
					document.getElementById("logout-btn").onclick = logoutUser;
					initCloudApp("home");
					return;
				} else {
					nav("login-screen");
					return;
				}
			}

			document.getElementById("logout-btn").onclick = logoutAdmin;

			await initCloudApp("admin-screen");
			await fetchActiveUsers();
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
