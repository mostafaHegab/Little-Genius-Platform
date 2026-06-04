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
