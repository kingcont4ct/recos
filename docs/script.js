/*
 * Client-side logic for the Red eYe Clique "Find Your Red Zone" quiz.
 * This implementation is written in plain JavaScript and closely mirrors
 * the TypeScript logic in the provided AI Studio template.  It handles
 * question sequencing, scoring, streak tracking and basic gamification.
 */

// ---------------------------------------------------------------
// Data & Configuration
// ---------------------------------------------------------------

const QUESTIONS = [
    {
        question: "When faced with a challenge, your first instinct is to:",
        answers: [
            { text: "Analyze and strategize.", points: 20 },
            { text: "Act immediately.", points: 30 },
            { text: "Seek advice from others.", points: 10 },
            { text: "Wait and see how things unfold.", points: 5 },
        ],
    },
    {
        question: "Your ideal weekend involves:",
        answers: [
            { text: "High-energy activities and adventure.", points: 30 },
            { text: "Relaxing with a book or movie.", points: 5 },
            { text: "Working on a personal project.", points: 20 },
            { text: "Socializing with a large group of friends.", points: 10 },
        ],
    },
    {
        question: "Which of these drives you the most?",
        answers: [
            { text: "Legacy and impact.", points: 20 },
            { text: "Passion and excitement.", points: 30 },
            { text: "Stability and security.", points: 5 },
            { text: "Knowledge and understanding.", points: 10 },
        ],
    },
    {
        question: "How do you handle pressure?",
        answers: [
            { text: "I thrive under it.", points: 30 },
            { text: "I manage it, but it's stressful.", points: 10 },
            { text: "I try to avoid it.", points: 5 },
            { text: "I break it down into smaller tasks.", points: 20 },
        ],
    },
];

const RANKS = [
    { threshold: 0, label: "New Blood" },
    { threshold: 50, label: "Spark" },
    { threshold: 100, label: "Ignited" },
    { threshold: 150, label: "Visionary" },
    { threshold: 200, label: "REC Elite" },
];

const STREAK_MILESTONES = [3, 7, 14, 30];

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------

const state = {
    userName: '',
    userPoints: 0,
    currentQuestionIndex: 0,
    answers: [],
    streak: 0,
    isMuted: false,
};

// ---------------------------------------------------------------
// DOM Elements
// ---------------------------------------------------------------

const dom = {
    welcomeScreen: document.getElementById('welcome-screen'),
    quizScreen: document.getElementById('quiz-screen'),
    resultsScreen: document.getElementById('results-screen'),

    nameForm: document.getElementById('name-form'),
    nameInput: document.getElementById('name-input'),

    gamificationHeader: document.getElementById('gamification-header'),
    userNameDisplay: document.getElementById('user-name-display'),
    rzpPointsDisplay: document.getElementById('rzp-points-display'),
    userRankDisplay: document.getElementById('user-rank-display'),
    streakDisplay: document.getElementById('streak-display'),
    badgeContainer: document.getElementById('badge-container'),
    muteBtn: document.getElementById('mute-btn'),

    questionText: document.getElementById('question-text'),
    answersContainer: document.getElementById('answers-container'),
    currentQuestionNumber: document.getElementById('current-question-number'),
    totalQuestionNumber: document.getElementById('total-question-number'),

    resultsName: document.getElementById('results-name'),
    resultsPoints: document.getElementById('results-points'),
    restartBtn: document.getElementById('restart-btn'),
};

// ---------------------------------------------------------------
// Sound Effects (stubbed)
// ---------------------------------------------------------------

function playSound(sound) {
    // In a real application you might load and play a sound file here.
    // To keep this example self‑contained we simply log the action.  The
    // `state.isMuted` flag suppresses logging when muted.
    if (state.isMuted) return;
    console.log(`Playing sound: ${sound}`);
}

// ---------------------------------------------------------------
// Persistence Helpers
// ---------------------------------------------------------------

function saveState() {
    const appState = {
        userName: state.userName,
        userPoints: state.userPoints,
        currentQuestionIndex: state.currentQuestionIndex,
        answers: state.answers,
    };
    sessionStorage.setItem('rzcQuizState', JSON.stringify(appState));
}

function loadState() {
    const saved = sessionStorage.getItem('rzcQuizState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(state, parsed);
            return true;
        } catch (err) {
            console.error('Could not parse saved state', err);
        }
    }
    return false;
}

function loadStreak() {
    const lastVisit = localStorage.getItem('rzcLastVisit');
    const streak = parseInt(localStorage.getItem('rzcStreak') || '0', 10);
    return { lastVisit, streak };
}

function saveStreak(date, streak) {
    localStorage.setItem('rzcLastVisit', date);
    localStorage.setItem('rzcStreak', String(streak));
}

// ---------------------------------------------------------------
// Gamification helpers
// ---------------------------------------------------------------

function addPoints(points, reason = '') {
    state.userPoints += points;
    console.log(`+${points} RZP. Reason: ${reason}`);
    updateGamificationUI();
}

function updateStreakUI() {
    const streak = state.streak || 1;
    const text = streak > 1
        ? `🔥 ${streak}-Day Streak! 🔥`
        : `Start your streak today!`;
    dom.streakDisplay.textContent = text;
}

function updateGamificationUI() {
    if (!state.userName) return;
    // Determine rank based on thresholds
    let currentRank = RANKS[0].label;
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (state.userPoints >= RANKS[i].threshold) {
            currentRank = RANKS[i].label;
            break;
        }
    }
    dom.userNameDisplay.textContent = state.userName;
    dom.rzpPointsDisplay.textContent = `${state.userPoints} RZP`;
    dom.userRankDisplay.textContent = `Rank: ${currentRank}`;
    dom.gamificationHeader.classList.remove('hidden');
    updateStreakUI();
}

function showBadge(text) {
    const badge = document.createElement('div');
    badge.className = 'achievement-badge';
    badge.textContent = `🏆 ACHIEVEMENT: ${text} 🏆`;
    badge.setAttribute('role', 'alert');
    dom.badgeContainer.appendChild(badge);
    playSound('achievement');
    // Fade out after a few seconds
    setTimeout(() => {
        badge.style.transition = 'opacity 0.5s ease';
        badge.style.opacity = '0';
        setTimeout(() => badge.remove(), 500);
    }, 4000);
}

function checkMilestoneBonus() {
    if (STREAK_MILESTONES.includes(state.streak)) {
        const bonus = state.streak * 10;
        addPoints(bonus, `${state.streak}-Day Streak Bonus`);
        showBadge(`${state.streak}-Day Streak!`);
    }
}

function checkStreak() {
    const today = new Date().toISOString().slice(0, 10);
    const { lastVisit, streak } = loadStreak();

    let newStreak = 1;
    let justUpdated = false;

    if (lastVisit === today) {
        newStreak = streak || 1;
    } else {
        justUpdated = true;
        const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        if (lastVisit === yesterday) {
            newStreak = streak + 1;
        }
    }

    saveStreak(today, newStreak);
    state.streak = newStreak;

    if (justUpdated && newStreak > 1) {
        checkMilestoneBonus();
    }
}

// ---------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------

function showScreen(screen) {
    dom.welcomeScreen.classList.add('hidden');
    dom.quizScreen.classList.add('hidden');
    dom.resultsScreen.classList.add('hidden');
    screen.classList.remove('hidden');
}

function displayQuestion() {
    if (state.currentQuestionIndex >= QUESTIONS.length) {
        showResults();
        return;
    }
    const q = QUESTIONS[state.currentQuestionIndex];
    dom.questionText.textContent = q.question;
    dom.answersContainer.innerHTML = '';
    q.answers.forEach(answer => {
        const button = document.createElement('button');
        button.className = 'btn-answer';
        button.textContent = answer.text;
        button.addEventListener('click', () => handleAnswer(answer.points));
        dom.answersContainer.appendChild(button);
    });
    dom.currentQuestionNumber.textContent = state.currentQuestionIndex + 1;
    dom.totalQuestionNumber.textContent = QUESTIONS.length;
    showScreen(dom.quizScreen);
}

function showResults() {
    dom.resultsName.textContent = state.userName;
    dom.resultsPoints.textContent = state.userPoints;
    saveState();
    showScreen(dom.resultsScreen);
            // Determine rank for results page
                            let currentRank = RANKS[0].label;
        for (let i = RANKS.length - 1; i >= 0; i--) {
                        if (state.userPoints >= RANKS[i].threshold) {
            currentRank = RANKS[i].label;
            break;
        }
    }
    const rankEl = document.getElementById('results-rank');
    if (rankEl) rankEl.textContent = currentRank;

}

// ---------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------

function handleNameSubmit(e) {
    e.preventDefault();
    const name = dom.nameInput.value.trim();
    if (name) {
        state.userName = name;
        state.userPoints = 0;
        state.currentQuestionIndex = 0;
        state.answers = [];
        saveState();
        updateGamificationUI();
        displayQuestion();
        playSound('start');
    }
}

function handleAnswer(points) {
    addPoints(points, `Q${state.currentQuestionIndex + 1} Answer`);
    state.answers.push(points);
    state.currentQuestionIndex++;
    saveState();
    playSound('select');
    setTimeout(displayQuestion, 300);
}

function handleRestart() {
    sessionStorage.removeItem('rzcQuizState');
    state.userName = '';
    state.userPoints = 0;
    state.currentQuestionIndex = 0;
    state.answers = [];
    dom.nameInput.value = '';
    dom.gamificationHeader.classList.add('hidden');
    showScreen(dom.welcomeScreen);
}

function handleMuteToggle() {
    state.isMuted = !state.isMuted;
    dom.muteBtn.textContent = state.isMuted ? '🔇' : '🔊';
    localStorage.setItem('rzcMuted', String(state.isMuted));
}

// ---------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------

function init() {
    // Bind events
    dom.nameForm.addEventListener('submit', handleNameSubmit);
    dom.restartBtn.addEventListener('click', handleRestart);
    dom.muteBtn.addEventListener('click', handleMuteToggle);

    // Restore mute preference
    state.isMuted = localStorage.getItem('rzcMuted') === 'true';
    dom.muteBtn.textContent = state.isMuted ? '🔇' : '🔊';

    // Check streak first
    checkStreak();

    // Restore session if present
    if (loadState() && state.userName) {
        updateGamificationUI();
        if (state.currentQuestionIndex >= QUESTIONS.length) {
            showResults();
        } else {
            displayQuestion();
        }
    } else {
        showScreen(dom.welcomeScreen);
    }
}

// Start the app once the DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
} else {
    document.addEventListener('DOMContentLoaded', init);
}
