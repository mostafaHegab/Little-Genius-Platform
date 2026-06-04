/**
 * Get Firestore collection path based on level and category
 * Structure: {level}/{category}/
 * Example: step/letters/
 */
function getCollectionPath(level, category) {
	return `${level}_${category}`;
}
