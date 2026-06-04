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

function openAct(mode) {
	currentActivityMode = mode;
	nav("act");
	refreshActivityContent();
}
