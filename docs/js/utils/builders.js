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
