cloudData = initializeNestedCloudData();

/* بوابة الدخول السحابية المشفرة */
async function openAdminGate() {
	if (isCloudMode && auth && auth.currentUser && !auth.currentUser.isAnonymous) {
		await fetchActiveUsers();
		document.getElementById("logout-btn").onclick = logoutAdmin;
		nav("admin-screen");
	} else {
		document.getElementById("admin-email").value = "";
		document.getElementById("admin-password").value = "";
		document.getElementById("lock-modal").classList.remove("hide");
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
				document.getElementById("logout-btn").onclick = logoutAdmin;
				closeLockModal();
				nav("admin-screen");
			} catch (err) {
				showCustomAlert("❌", "تعذر تسجيل الدخول، يرجى التحقق من صحة البيانات.");
			}
		} else {
			if (password === "2026") {
				document.getElementById("logout-btn").onclick = logoutAdmin;
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
		if (loginBtn) setButtonLoading(loginBtn, true, "تسجيل الدخول 🔑");

		if (isCloudMode && db) {
			const userDoc = await db.collection("users").doc(email).get();
			if (!userDoc.exists) {
				showCustomAlert("❌", "المستخدم غير موجود، يرجى التحقق من البريد الإلكتروني.");
				return;
			}

			const userData = userDoc.data();
			if (userData.password !== password) {
				showCustomAlert("❌", "كلمة السر غير صحيحة!");
				return;
			}

			localStorage.setItem("genius_kids_current_user", JSON.stringify({ email }));
			document.getElementById("logout-btn").onclick = logoutUser;
			document.getElementById("home-title").onclick = undefined;
			nav("home");
		}
	} catch (err) {
		showCustomAlert("❌", "تعذر تسجيل الدخول، يرجى التحقق من صحة البيانات.");
	} finally {
		if (loginBtn) setButtonLoading(loginBtn, false);
	}
}

async function logoutAdmin() {
	const logoutBtn = document.querySelector("button[onclick='logoutAdmin()']");
	const mainLogoutBtn = document.getElementById("logout-btn");
	try {
		if (logoutBtn) setButtonLoading(logoutBtn, true, "تسجيل خروج 🚪");
		if (mainLogoutBtn) setButtonLoading(mainLogoutBtn, true, "تسجيل خروج 🚪");

		if (isCloudMode && auth) {
			try {
				await auth.signOut();
			} catch (e) {}
		}
		nav("login-screen");
		showCustomAlert("🚪", "تم تسجيل خروجكِ بأمان من الإدارة.");
	} finally {
		if (logoutBtn) setButtonLoading(logoutBtn, false);
		if (mainLogoutBtn) setButtonLoading(mainLogoutBtn, false);
	}
}

async function logoutUser() {
	const logoutBtn = document.getElementById("logout-btn");
	try {
		if (logoutBtn) setButtonLoading(logoutBtn, true, "تسجيل خروج 🚪");

		localStorage.removeItem("genius_kids_current_user");
		document.getElementById("home-title").onclick = openAdminGate;
		nav("login-screen");
		showCustomAlert("🚪", "تم تسجيل خروجكِ بأمان من المنصة.");
	} finally {
		if (logoutBtn) setButtonLoading(logoutBtn, false);
	}
}

async function deleteUser(email, button) {
	if (!confirm("هل أنت متأكد أنك تريد حذف هذا المستخدم؟ هذا الإجراء لا يمكن التراجع عنه!")) {
		return;
	}

	try {
		if (isCloudMode && db) {
			await db.collection("users").doc(email).delete();
			showCustomAlert("✅", "تم حذف المستخدم بنجاح!");
			await fetchActiveUsers();
		} else {
			showCustomAlert("❌", "تعذر حذف المستخدم، يرجى التحقق من الاتصال بالإنترنت.");
		}
	} catch (err) {
		console.error("Error deleting user:", err);
		showCustomAlert("❌", "حدث خطأ أثناء حذف المستخدم.");
	}
}
