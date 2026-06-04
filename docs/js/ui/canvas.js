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
