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
