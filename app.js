const totalLessons = 19;
const passThreshold = 40; 
let currentLesson = 1;
let unlockedLevel = parseInt(localStorage.getItem('unlockedLevel')) || 1;

let currentDeck = [];
let incorrectPile = [];
let currentCardIndex = 0;
let correctCount = 0;
let unlockTriggered = false;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    buildLessonGrid();
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
    
    // Switch screens
    document.getElementById("landing-page").classList.remove("active");
    document.getElementById("flashcard-page").classList.add("active");
    updateScoreboard();

    // Fetch data from Google Sheets (Replace sheet ID if needed)
    const sheetId = '1JdZDvuKpeUIo_Ut731aDVL4dMhNDQt-YsXplmEfYJXA';
    const sheetName = `Lesson${lessonNum}`; 
    const queryUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

    try {
        const response = await fetch(queryUrl);
        const text = await response.text();
        // Google viz returns a script wrapper, we must parse the JSON inside it
        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonString);
        
        // Map Google Sheet rows to our card format
        // Assuming Column A is Turkish, Column B is English with HTML <span> highlights
        currentDeck = data.table.rows.map(row => ({
            turkish: row.c[0] ? row.c[0].v : "",
            english: row.c[1] ? row.c[1].v : ""
        })).filter(card => card.turkish !== ""); // Remove empty rows

    } catch (error) {
        console.error("Error fetching sheet, loading fallback data", error);
        // Fallback testing data if sheet fails to load
        currentDeck = Array.from({length: 50}, (_, i) => ({
            turkish: `Örnek Cümle ${i + 1}`,
            english: `Example Sentence <span style="color: #ff9800;">${i + 1}</span>`
        }));
    }

    loadCard();
}

function loadCard() {
    // If the main deck is empty, check if we need to review incorrect cards
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
    // use innerHTML here to allow your highlighted <span> tags from the sheet to render
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
    
    // Check for threshold unlock immediately
    if (correctCount === passThreshold && !unlockTriggered && currentLesson === unlockedLevel) {
        triggerUnlock();
    } else {
        setTimeout(loadCard, 200); // Small delay to let flip animation reset smoothly
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
    buildLessonGrid(); // Rebuild grid to show newly unlocked lessons
}
