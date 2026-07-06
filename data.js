// ================================================================
//  data.js — ЛОКАЛЬНАЯ БАЗА ДАННЫХ (ГАРАНТИРОВАННО РАБОТАЕТ)
// ================================================================

let currentUser = null;
let audioCtx = null;

// ===== БАЗА ДАННЫХ =====
function getUsers() {
    try { return JSON.parse(localStorage.getItem('gardenUsers')) || {}; } catch (e) { return {}; }
}

function saveUsers(u) { localStorage.setItem('gardenUsers', JSON.stringify(u)); }

function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('gardenCurrentUser')); } catch (e) { return null; }
}

function setCurrentUser(u) {
    if (u) localStorage.setItem('gardenCurrentUser', JSON.stringify(u));
    else localStorage.removeItem('gardenCurrentUser');
}

function createAccount(username, password) {
    const users = getUsers();
    if (users[username]) return { success: false, error: 'Имя уже занято!' };
    if (username.length < 2) return { success: false, error: 'Имя слишком короткое!' };
    if (password.length < 1) return { success: false, error: 'Введите пароль!' };
    users[username] = {
        password: password,
        state: {
            money: 0,
            seeds: 0,
            prestigeLevel: 0,
            prestigeBonus: 1,
            autoClickers: 0,
            autoClickLevel: 1,
            totalClicks: 0,
            totalMoneyEarned: 0,
            achievements: [],
            seedInventory: {},
            clickBonus: 0,
            matchRecord: 0,
            clickMultiplier: 1,
            prefMode: false,
            bgColor: '#0f1f0f',
            coolkidWins: 0,
        },
        friends: [],
        friendRequests: []
    };
    saveUsers(users);
    return { success: true };
}

function loginUser(username, password) {
    const users = getUsers();
    if (!users[username]) return { success: false, error: 'Пользователь не найден!' };
    if (users[username].password !== password) return { success: false, error: 'Неверный пароль!' };
    setCurrentUser(username);
    return { success: true };
}

function logoutUser() { setCurrentUser(null); }

function getUserState(username) {
    const users = getUsers();
    return users[username]?.state || null;
}

function saveUserState(username, state) {
    if (!username) return;
    const users = getUsers();
    if (users[username]) {
        users[username].state = { ...users[username].state, ...state };
        saveUsers(users);
    }
}

function getFriends(username) {
    const users = getUsers();
    return users[username]?.friends || [];
}

function getFriendRequests(username) {
    const users = getUsers();
    return users[username]?.friendRequests || [];
}

function sendFriendRequest(fromUser, toUser) {
    if (fromUser === toUser) return { success: false, error: 'Нельзя добавить себя!' };
    const users = getUsers();
    if (!users[toUser]) return { success: false, error: 'Пользователь не найден!' };
    const friends = getFriends(fromUser);
    if (friends.includes(toUser)) return { success: false, error: 'Уже в друзьях!' };
    const requests = getFriendRequests(fromUser);
    if (requests.includes(toUser)) return { success: false, error: 'Запрос уже отправлен!' };
    if (!users[toUser].friendRequests) users[toUser].friendRequests = [];
    if (users[toUser].friendRequests.includes(fromUser)) {
        return { success: false, error: 'Запрос уже отправлен!' };
    }
    users[toUser].friendRequests.push(fromUser);
    saveUsers(users);
    return { success: true };
}

function acceptFriendRequest(username, fromUser) {
    const users = getUsers();
    if (!users[fromUser]) return { success: false };
    let requests = users[username]?.friendRequests || [];
    requests = requests.filter(f => f !== fromUser);
    let friends = users[username]?.friends || [];
    if (!friends.includes(fromUser)) friends.push(fromUser);
    users[username].friends = friends;
    users[username].friendRequests = requests;
    if (!users[fromUser].friends) users[fromUser].friends = [];
    if (!users[fromUser].friends.includes(username)) users[fromUser].friends.push(username);
    saveUsers(users);
    return { success: true };
}

function declineFriendRequest(username, fromUser) {
    const users = getUsers();
    let requests = users[username]?.friendRequests || [];
    requests = requests.filter(f => f !== fromUser);
    users[username].friendRequests = requests;
    saveUsers(users);
    return { success: true };
}

function removeFriend(username, friendName) {
    const users = getUsers();
    let friends = users[username]?.friends || [];
    friends = friends.filter(f => f !== friendName);
    users[username].friends = friends;
    if (users[friendName] && users[friendName].friends) {
        users[friendName].friends = users[friendName].friends.filter(f => f !== username);
    }
    saveUsers(users);
    return { success: true };
}

function sendMoney(fromUser, toUser, amount = 5) {
    const users = getUsers();
    if (!users[fromUser] || !users[toUser]) return { success: false, error: 'Пользователь не найден!' };
    const myMoney = users[fromUser]?.state?.money || 0;
    if (myMoney < amount) return { success: false, error: 'Не хватает денег!' };
    users[fromUser].state.money = myMoney - amount;
    users[toUser].state.money = (users[toUser].state.money || 0) + amount;
    saveUsers(users);
    return { success: true };
}

function checkAchievements(state) {
    const ACHIEVEMENTS_LIST = [
        { id: 'first_click', name: 'Первый клик', check: () => state.totalClicks >= 1 },
        { id: 'click_100', name: '100 кликов', check: () => state.totalClicks >= 100 },
        { id: 'click_1000', name: '1000 кликов', check: () => state.totalClicks >= 1000 },
        { id: 'money_100', name: '100 монет', check: () => state.totalMoneyEarned >= 100 },
        { id: 'money_1000', name: '1000 монет', check: () => state.totalMoneyEarned >= 1000 },
        { id: 'money_10000', name: '10000 монет', check: () => state.totalMoneyEarned >= 10000 },
        { id: 'seeds_10', name: '10 семян', check: () => Object.values(state.seedInventory || {}).reduce((a, b) => a + b, 0) >= 10 },
        { id: 'seeds_30', name: '30 семян', check: () => Object.values(state.seedInventory || {}).reduce((a, b) => a + b, 0) >= 30 },
        { id: 'prestige_1', name: '1 перерождение', check: () => state.prestigeLevel >= 1 },
        { id: 'prestige_5', name: '5 перерождений', check: () => state.prestigeLevel >= 5 },
        { id: 'auto_5', name: '5 автокликеров', check: () => state.autoClickers >= 5 },
        { id: 'auto_10', name: '10 автокликеров', check: () => state.autoClickers >= 10 },
        { id: 'match3_win', name: 'Победа в три в ряд', check: () => state.matchRecord >= 20 },
        { id: 'coolkid_win', name: 'Побег от Cool Kid', check: () => state.coolkidWins >= 1 },
        { id: 'coolkid_5', name: '5 побегов от Cool Kid', check: () => state.coolkidWins >= 5 },
    ];
    const newAchievements = [];
    ACHIEVEMENTS_LIST.forEach(a => {
        if (!state.achievements.includes(a.id) && a.check()) {
            state.achievements.push(a.id);
            newAchievements.push(a);
        }
    });
    return newAchievements;
}

function playSound(type) {
    try {
        if (!audioCtx) audioCtx = new(window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        gain.gain.value = 0.08;
        if (type === 'click') {
            osc.frequency.value = 800;
            osc.type = 'sine';
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
        } else if (type === 'buy') {
            osc.frequency.value = 600;
            osc.type = 'square';
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
        } else if (type === 'achievement') {
            osc.frequency.value = 1000;
            osc.type = 'sine';
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
            osc.start();
            setTimeout(() => {
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                gain2.gain.value = 0.08;
                osc2.frequency.value = 1300;
                osc2.type = 'sine';
                gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
                osc2.start();
                osc2.stop(audioCtx.currentTime + 0.1);
            }, 100);
            osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'round') {
            osc.frequency.value = 500;
            osc.type = 'sawtooth';
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'prestige') {
            osc.frequency.value = 400;
            osc.type = 'sine';
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            osc.start();
            setTimeout(() => {
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                gain2.gain.value = 0.08;
                osc2.frequency.value = 700;
                osc2.type = 'sine';
                gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                osc2.start();
                osc2.stop(audioCtx.currentTime + 0.3);
            }, 150);
            osc.stop(audioCtx.currentTime + 0.5);
        }
    } catch (e) { /* тихо */ }
}

console.log('✅ data.js загружен! Все функции доступны.');
