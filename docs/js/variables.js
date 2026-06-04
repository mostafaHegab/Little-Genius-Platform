var ALPHA = ["أ", "ب", "م", "ح", "ج", "د", "خ", "ت", "ل", "س", "ن", "ر", "ف", "ك", "ق", "ي", "ع", "ش", "و", "هـ", "ذ", "ظ", "ز", "ط", "ص", "ض", "ث", "غ"];

var levelNames = { step: "خطواتي الأولى", kg1: "KG1", kg2: "KG2" };
var catNames = { letters: "ألبوم الحروف", stories: "القصص", play: "هيا نلعب", pdf: "ملفات الطباعة" };

var currentLevelMode = "step"; // step, kg1, kg2
var currentActivityMode = "letters"; // letters, draw, stories, play, pdf
var canvas,
	ctx,
	drawing = false;

var firebaseConfig = {
	apiKey: "AIzaSyA7rIk6BH7gwFE1jBRwzWVy_LJGZzcWXQI",
	authDomain: "little-genius-platform.firebaseapp.com",
	projectId: "little-genius-platform",
	storageBucket: "little-genius-platform.firebasestorage.app",
	messagingSenderId: "1040985707485",
	appId: "1:1040985707485:web:79aa3444a93e2130045c34",
};

// تهيئة المتغيرات الأساسية لدعم التخزين المزدوج (السحابة والمحلي)
var db = null;
var auth = null;

var cloudData;
