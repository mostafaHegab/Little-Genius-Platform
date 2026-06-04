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
