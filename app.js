const totalLessons = 19;
const passThreshold = 40; 
let currentLesson = 1;
let unlockedLevel = parseInt(localStorage.getItem('unlockedLevel')) || 1;

let currentDeck = [];
let incorrectPile = [];
let currentCardIndex = 0;

let correctCount = 0;
let totalMistakes = 0;
let unlockTriggered = false;

let logoTaps = 0;
let lastTapTime = 0;
let isAdminMode = false;
let realSavedLevel = unlockedLevel; 

const lessonColors = [
    "#EF5350", "#EC407A", "#AB47BC", "#7E57C2", "#5C6BC0", 
    "#42A5F5", "#29B6F6", "#26C6DA", "#26A69A", "#66BB6A", 
    "#9CCC65", "#D4E157", "#FFEE58", "#FFCA28", "#FFA726", 
    "#FF7043", "#8D6E63", "#78909C", "#D32F2F"
];

document.addEventListener("DOMContentLoaded", () => {
    buildLessonGrid();
    setupKeyboardShortcuts(); 
    setupAdminOverrides(); 
});

function buildLessonGrid() {
    const grid = document.getElementById("lesson-grid");
    grid.innerHTML = "";

    for (let i = 1; i <= totalLessons; i++) {
        const btn = document.createElement("button");
        btn.classList.add("lesson-btn");
        
        if (i <= unlockedLevel) {
            btn.classList.add("unlocked");
            btn.innerText = "Lesson " + i; 
            btn.style.backgroundColor = lessonColors[i - 1]; 
            btn.onclick = () => startLesson(i);
        } else {
            btn.classList.add("locked");
            btn.innerText = "🔒 Lesson " + i;
        }
        grid.appendChild(btn);
    }
}

async function startLesson(lessonNum) {
    currentLesson = lessonNum;
    correctCount = 0;
    totalMistakes = 0;
    incorrectPile = [];
    currentCardIndex = 0;
    unlockTriggered = false;
    
    document.getElementById("landing-page").classList.remove("active");
    document.getElementById("flashcard-page").classList.add("active");
    window.scrollTo(0, 0);
    
    updateScoreboard();

    const sheetId = '1JdZDvuKpeUIo_Ut731aDVL4dMhNDQt-YsXplmEfYJXA';
    const sheetName = `Sayfa${lessonNum}`; 
    const queryUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

    try {
        const response = await fetch(queryUrl);
        const text = await response.text();
        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonString);
        
        currentDeck = data.table.rows.map(row => ({
            turkish: row.c[0] ? row.c[0].v : "",
            english: row.c[1] ? row.c[1].v : ""
        })).filter(card => card.turkish !== "");

    } catch (error) {
        console.error("Error fetching sheet", error);
        currentDeck = Array.from({length: 50}, (_, i) => ({
            turkish: `Örnek Cümle ${i + 1}`,
            english: `Example Sentence`
        }));
    }

    loadCard();
}

function loadCard() {
    if (currentCardIndex >= currentDeck.length) {
        if (incorrectPile.length > 0) {
            currentDeck = [...incorrectPile];
            incorrectPile = [];
            currentCardIndex = 0;
        } else {
            alert("Deck finished! You have mastered all cards.");
            returnToMenu();
            return;
        }
    }

    const card = currentDeck[currentCardIndex];
    document.getElementById("turkish-text").innerText = card.turkish;
    document.getElementById("turkish-text-back").innerText = card.turkish;
    
    // Process the plain English text through the grammar highlighter!
    const formattedEnglish = applyGrammarRules(card.english, currentLesson);
    document.getElementById("english-text").innerHTML = formattedEnglish; 

    resetCardUI();
}

// === AUTOMATED GRAMMAR PARSER ===
function applyGrammarRules(text, lessonNum) {
    let txt = text;
    // Note: (?![^<]*>) ensures we don't accidentally replace a word that is already inside an HTML tag.
    
    switch(lessonNum) {
        case 1:
            txt = txt.replace(/\b(didn't|don't|did|will|won't)\b(?![^<]*>)/gi, '<span class="c-red">$&</span>');
            // Past simple 'ed'. Excluding common words that end in ed but aren't verbs.
            txt = txt.replace(/\b(?!(need|bed|red|speed|feed|seed|weed|bleed)\b)([A-Za-z]+ed)\b(?![^<]*>)/gi, '<span class="c-red">$&</span>');
            break;
        case 2:
            txt = txt.replace(/\b(who|what|where|when|why|how|which|whose|whom)\b(?![^<]*>)/gi, '<span class="c-purple">$&</span>');
            txt = txt.replace(/\b(did|do|will)\b(?![^<]*>)/gi, '<span class="c-red">$&</span>');
            break;
        case 3:
            // "will be", "is", "was", etc and "there"
            txt = txt.replace(/\b(will\s+be)\b(?![^<]*>)/gi, '<span class="c-blue">$&</span>');
            txt = txt.replace(/\b(there|is|are|was|were)\b(?![^<]*>)/gi, '<span class="c-blue">$&</span>');
            txt = txt.replace(/\b(didn't\s+have|will\s+have|have|has|had)\b(?![^<]*>)/gi, '<span class="c-orange">$&</span>');
            break;
        case 4:
            txt = txt.replace(/\b(everybody|everyone|everything|nobody|no\s*one|nothing|somebody|someone|something|anybody|anyone|anything)\b(?![^<]*>)/gi, '<span class="c-orange">$&</span>');
            break;
        case 5:
            txt = txt.replace(/\b(can|can't|cannot|could|couldn't|will\s+be\s+able\s+to|won't\s+be\s+able\s+to|am\s+able\s+to|is\s+able\s+to|are\s+able\s+to|was\s+able\s+to|were\s+able\s+to)\b(?![^<]*>)/gi, '<span class="c-red">$&</span>');
            break;
        case 6:
            txt = txt.replace(/\b(have\s+to|has\s+to|had\s+to|will\s+have\s+to|don't\s+have\s+to|doesn't\s+have\s+to|didn't\s+have\s+to)\b(?![^<]*>)/gi, '<span class="c-red-alt">$&</span>');
            txt = txt.replace(/\b(didn't|don't|doesn't|won't|will|do|does)\b(?![^<]*>)/gi, '<span class="c-red">$&</span>');
            break;
        case 7:
            txt = txt.replace(/\b(and|but|so|or|otherwise|then)\b(?![^<]*>)/gi, '<span class="c-red">$&</span>');
            break;
        case 8:
            txt = txt.replace(/\b(shouldn't\s+have|should\s+have|shouldn't|should|have)\b(?![^<]*>)/gi, '<span class="c-red">$&</span>');
            txt = txt.replace(/\b(?!(need|bed|red|speed|feed|seed|weed|bleed)\b)([A-Za-z]+ed)\b(?![^<]*>)/gi, '<span class="c-red">$&</span>');
            break;
        case 9:
            txt = txt.replace(/\b(in|on|at)\b(?![^<]*>)/gi, '<span class="c-red">$&</span>');
            break;
        case 10:
            // 1. Target Present Continuous (e.g., 'are wearing')
            txt = txt.replace(/\b(am|is|are|was|were|'m|'re|'s|aren't|isn't|wasn't|weren't)\s+([A-Za-z]+)(ing)\b(?![^<]*>)/gi, '<span class="c-red">$1</span> $2<span class="c-red">$3</span>');
            // 2. Target remaining standalone Be verbs for State/Comparative sentences
            txt = txt.replace(/\b(am|is|are|was|were|will\s+be|isn't|wasn't|weren't|aren't|'m|'re|'s)\b(?![^<]*>)/gi, '<span class="c-blue">$&</span>');
            break;
    }
    return txt;
}

function flipCard() {
    const flashcard = document.getElementById("flashcard");
    if (!flashcard.classList.contains("flipped")) {
        flashcard.classList.add("flipped");
        document.getElementById("action-buttons").classList.add("visible");
    }
}

function resetCardUI() {
    document.getElementById("flashcard").classList.remove("flipped");
    document.getElementById("action-buttons").classList.remove("visible");
}

function markAnswer(isCorrect) {
    if (isCorrect) {
        correctCount++;
    } else {
        incorrectPile.push(currentDeck[currentCardIndex]);
        totalMistakes++;
    }
    
    updateScoreboard();
    currentCardIndex++;
    
    if (correctCount === passThreshold && !unlockTriggered && currentLesson === unlockedLevel && !isAdminMode) {
        triggerUnlock();
    } else {
        setTimeout(loadCard, 200); 
    }
}

function updateScoreboard() {
    document.getElementById("score-correct").innerText = "✔ " + correctCount;
    document.getElementById("score-wrong").innerText = "✖ " + totalMistakes;
    document.getElementById("score-remain").innerText = "📦 " + (50 - correctCount);
}

function triggerUnlock() {
    unlockTriggered = true;
    unlockedLevel++;
    realSavedLevel = unlockedLevel; 
    localStorage.setItem('unlockedLevel', unlockedLevel);
    document.getElementById("unlock-banner").classList.remove("hidden");
}

function goToNextLesson() {
    document.getElementById("unlock-banner").classList.add("hidden");
    returnToMenu();
    startLesson(currentLesson + 1);
}

function continuePracticing() {
    document.getElementById("unlock-banner").classList.add("hidden");
    setTimeout(loadCard, 200);
}

function returnToMenu() {
    document.getElementById("flashcard-page").classList.remove("active");
    document.getElementById("landing-page").classList.add("active");
    window.scrollTo(0, 0);
    buildLessonGrid();
}

function toggleAdminMode() {
    if (isAdminMode) {
        isAdminMode = false;
        unlockedLevel = realSavedLevel; 
        alert("Admin Mode: OFF. Returning to normal progression.");
    } else {
        isAdminMode = true;
        realSavedLevel = unlockedLevel; 
        unlockedLevel = totalLessons; 
        alert("Admin Mode: ON. All lessons temporarily unlocked.");
    }
    buildLessonGrid();
}

function setupAdminOverrides() {
    const logo = document.getElementById("logo");
    if (logo) {
        logo.addEventListener("click", () => {
            const currentTime = new Date().getTime();
            if (currentTime - lastTapTime < 500) { 
                logoTaps++;
            } else {
                logoTaps = 1; 
            }
            lastTapTime = currentTime;

            if (logoTaps >= 5) {
                toggleAdminMode();
                logoTaps = 0; 
            }
        });
    }
}

function setupKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
        
        if (event.shiftKey && (event.key === 'U' || event.key === 'u')) {
            toggleAdminMode();
            return; 
        }

        const flashcardPage = document.getElementById("flashcard-page");
        const unlockBanner = document.getElementById("unlock-banner");
        
        if (flashcardPage.classList.contains("active") && unlockBanner.classList.contains("hidden")) {
            const flashcard = document.getElementById("flashcard");
            const isFlipped = flashcard.classList.contains("flipped");

            switch(event.key) {
                case "ArrowUp":
                    if (!isFlipped) flipCard();
                    break;
                case "ArrowDown":
                    if (isFlipped) resetCardUI();
                    break;
                case "ArrowLeft":
                    if (isFlipped) markAnswer(false);
                    break;
                case "ArrowRight":
                    if (isFlipped) markAnswer(true);
                    break;
            }
        }
    });
}
