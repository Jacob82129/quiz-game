const TRIVIA_API_URL = 'https://opentdb.com/api.php?amount=10&category=9&difficulty=medium&type=multiple';
const PANTRY_API_URL = 'https://pantry-proxy-api-nine.vercel.app/quiz-scores';

const quizBox = document.getElementById('quiz-box');
const questionNumber = document.getElementById('question-number');
const questionText = document.getElementById('question-text');
const timerDisplay = document.getElementById('time-left');
const choicesContainer = document.getElementById('choices-container');
const nextBtn = document.getElementById('next-btn');
const loader = document.getElementById('loader');
const highScoreContainer = document.getElementById('high-score-container');
const highScoresList = document.getElementById('high-scores-list');
const playAgainBtn = document.getElementById('play-again-btn');

let currentQuestion = 0;
let questions = [];
let totalScore = 0;

let timerInterval;
let startTime;
let highScores = [];
const totalTime = 10000; // milliseconds 10 seconds


// Fetch Question
async function fetchQuestions() {
    try {
        const response = await fetch(TRIVIA_API_URL);
        const data = await response.json();
        questions = data.results;
        loadQuestion();
        console.log(data);
    } catch (error) {
        console.error('Error fetching questions:', error);
        questionText.innerText = 'Failed to load questions. Please try again later.';
    }
}

// Load each question to UI 
function loadQuestion() {

    if (currentQuestion >= questions.length) {
        endGame();
        return;
    }

    const question = questions[currentQuestion];
    questionText.innerText = decodeHTML(question.question);
    questionNumber.innerText = `Question ${currentQuestion + 1}`;

    // reset choices
    choicesContainer.innerText = '';
    nextBtn.disabled = true;

    // Prepare choices
    const choices = [...question.incorrect_answers, question.correct_answer].sort(() => Math.random() - 0.5);
    choices.forEach(choice => {
        choice = choice.trim(); // use trim to avoid unnecessary white space
        const button = document.createElement('button');
        button.type = 'button';
        button.classList.add('choice');
        button.innerText = decodeHTML(choice);
        button.onclick = () => checkAnswer(choice, question.correct_answer.trim());
        choicesContainer.appendChild(button);
    });

    resetTimer();
    startTimer();
}

// Load next question
nextBtn.addEventListener('click', () => {
    currentQuestion++;
    loadQuestion();
});

// Ensure special characters are decoded
function decodeHTML(html) {
    const txt = document.createElement('div');
    txt.innerHTML = html;
    return txt.textContent;
}

// Start timer for question
function startTimer() {
    startTime = Date.now();
    let timeLeft = totalTime;
    updateTimerDisplay(timeLeft);

    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        timeLeft = totalTime - elapsedTime;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timeLeft = 0;
            updateTimerDisplay(timeLeft);
            disableChoices();
            nextBtn.disabled = false;
            const correctAnswer = questions[currentQuestion].correct_answer;
            highlightCorrectAnswer(correctAnswer);
        } else {
            updateTimerDisplay(timeLeft);
        }
    }, 50);
}

// Reset timer to 10s
function resetTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay(totalTime);
}

// Update Timer UI
function updateTimerDisplay(timeLeft) {
    const seconds = (timeLeft / 1000).toFixed(2);
    timerDisplay.innerText = seconds;
}

// Check if answer is correct
function checkAnswer(selectedAnswer, correctAnswer) {
    // console.log(selectedAnswer, correctAnswer);

    clearInterval(timerInterval);
    disableChoices();
    highlightCorrectAnswer(correctAnswer);

    if (selectedAnswer === correctAnswer) {
        const elapsedTime = Date.now() - startTime;
        const timeLeft = totalTime - elapsedTime;
        const weightedScore = Math.floor((timeLeft / totalTime) * 1000);
        totalScore += weightedScore;
        console.log(weightedScore, 'total', totalScore);
    }

    nextBtn.disabled = false;
}

// Disable choices when time expires or choice selected
function disableChoices() {
    const choices = document.querySelectorAll('.choice');
    choices.forEach(choice => {
        choice.disabled = true;
    });
}

// Highlight correct answer
function highlightCorrectAnswer(correctAnswer) {
    const choices = document.querySelectorAll('.choice');
    choices.forEach(choice => {
        if (choice.innerText === decodeHTML(correctAnswer)) {
            choice.classList.add('correct');
        } else {
            choice.classList.add('wrong');
        }

    });
}

// End game when finished with all question
function endGame() {
    quizBox.style.display = 'none';
    saveHighScore();
}

// Save high score
async function saveHighScore() {
    const name = prompt('Enter your name for the scoreboard');
    const date = new Date().toLocaleDateString();
    const newScore = { name, score: totalScore, date };
    console.log(newScore);
    loader.style.display = 'block';

    try {
        const response = await fetch(PANTRY_API_URL);
        if (response.ok) {    // if basket exists
            const data = await response.json();
            highScores = data.highScores || [];
        }
    } catch (error) {
        console.log('Basket not found, creating a new one.');
        highScores = [];
    }

    highScores.push(newScore);

    // Sort high scores and keep only top 10
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10);

    try {
        await fetch(PANTRY_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ highScores }),
        });
    } catch (error) {
        console.error('Error saving high score:', error);
    }

    displayHighScores(newScore);
}

// Display high scores
function displayHighScores(newScore) {
    highScoresList.innerText = '';

    highScores.forEach((score) => {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        nameCell.innerText = score.name;

        const scoreCell = document.createElement('td');
        scoreCell.innerText = score.score;

        const dateCell = document.createElement('td');
        dateCell.innerText = score.date;

        row.appendChild(nameCell);
        row.appendChild(scoreCell);
        row.appendChild(dateCell);

        // Highlight new score if it's top 10
        if (score.name === newScore.name && score.score === newScore.score && score.date === newScore.date) {
            row.classList.add('highlight');
        }

        highScoresList.appendChild(row);
    });

    loader.style.display = 'none';
    highScoreContainer.style.display = 'flex';
}

// Reload the page to start quiz over
playAgainBtn.addEventListener('click', () => {
    window.location.reload();
});

// Startup
fetchQuestions();