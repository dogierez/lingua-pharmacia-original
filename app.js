const totalLessons = 19;
const passThreshold = 40; 
let currentLesson = 1;
let unlockedLevel = parseInt(localStorage.getItem('unlockedLevel')) || 1;

let currentDeck = [];
let incorrectPile = [];
let currentCardIndex = 0;
let correctCount = 0;
let unlockTriggered = false;

// 19 distinct vibrant colors for the lesson grid
const lessonColors = [
    "#EF5350", "#EC407A", "#AB47BC", "#7E57C2", "#5C6BC0", 
    "#42A5F5", "#29B6F6", "#26C6DA", "#26A69A", "#66BB6A", 
    "#9CCC65", "#D4E157", "#FFEE58", "#FFCA28", "#FFA726", 
    "#FF7043", "#8D6E63", "#78909C", "#D32F2F"
];

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    buildLessonGrid();
    setupKeyboardShortcuts(); // Enable Arrow Keys
});

function buildLessonGrid() {
    const grid = document.getElementById("lesson-grid");
    grid.innerHTML = "";

    for (let i = 1; i <= totalLessons; i++) {
        const btn = document.createElement("button");
        btn.classList.add("lesson-btn");
        
        if (i <= unlockedLevel) {
            btn.classList.add("unlocked");
            btn.innerText = i; 
            btn.style.backgroundColor = lessonColors[i - 1]; 
            btn.onclick = () => startLesson(i);
        } else {
            btn.classList.add("locked");
            btn.innerText = "🔒 " + i;
        }
        grid.appendChild(btn);
    }
}

async function startLesson(lessonNum) {
    currentLesson = lessonNum;
    correctCount = 0;
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
        console.error("Error fetching sheet, loading fallback data", error);
        currentDeck = Array.from({length: 50}, (_, i) => ({
            turkish: `Örnek Cümle ${i + 1}`,
            english: `Example Sentence <span style="color: #4caf50;">${i + 1}</span>`
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
    document.getElementById("english-text").innerHTML = card.english; 

    resetCardUI();
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
        updateScoreboard();
    } else {
        incorrectPile.push(currentDeck[currentCardIndex]);
    }

    currentCardIndex++;
    
    if (correctCount === passThreshold && !unlockTriggered && currentLesson === unlockedLevel) {
        triggerUnlock();
    } else {
        setTimeout(loadCard, 200); 
    }
}

function updateScoreboard() {
    document.getElementById("score-count").innerText = correctCount;
}

function triggerUnlock() {
    unlockTriggered = true;
    unlockedLevel++;
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

// KEYBOARD SHORTCUTS LOGIC
function setupKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
        const flashcardPage = document.getElementById("flashcard-page");
        const unlockBanner = document.getElementById("unlock-banner");
        
        // Only allow keyboard controls if the flashcard page is active and the popup banner is hidden
        if (flashcardPage.classList.contains("active") && unlockBanner.classList.contains("hidden")) {
            const flashcard = document.getElementById("flashcard");
            const isFlipped = flashcard.classList.contains("flipped");

            switch(event.key) {
                case "ArrowUp":
                    // Up Arrow: Reveal
                    if (!isFlipped) flipCard();
                    break;
                case "ArrowDown":
                    // Down Arrow: Hide (Handle)
                    if (isFlipped) resetCardUI();
                    break;
                case "ArrowLeft":
                    // Left Arrow: Wrong (only works if card is already flipped)
                    if (isFlipped) markAnswer(false);
                    break;
                case "ArrowRight":
                    // Right Arrow: Correct (only works if card is already flipped)
                    if (isFlipped) markAnswer(true);
                    break;
            }
        }
    });
}
