// ================================================================
//  data.js — ОБЛАЧНАЯ БАЗА ДАННЫХ (Supabase)
// ================================================================

// ===== ТВОИ ДАННЫЕ =====
const SUPABASE_URL = 'https://leolykfvzqwinghxyarq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlb2x5a2Z2enF3aW5naHh5YXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMzk4MTgsImV4cCI6MjA5ODkxNTgxOH0.Wbxw9OldrmabGosdiTjNvlpld5K7zhR0JzsSsKwSJ9c';
// =========================

let currentUser = null;

// ---- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----
function getSupabaseHeaders() {
    return {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
    };
}

// ---- ПОЛЬЗОВАТЕЛИ ----
async function getUsers() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=username`, {
            headers: getSupabaseHeaders()
        });
        const data = await res.json();
        return data;
    } catch (e) {
        console.error('Ошибка получения пользователей:', e);
        return [];
    }
}

async function getUserByUsername(username) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${username}&select=*`, {
            headers: getSupabaseHeaders()
        });
        const data = await res.json();
        return data[0] || null;
    } catch (e) {
        console.error('Ошибка получения пользователя:', e);
        return null;
    }
}

async function createAccount(username, password) {
    try {
        const existing = await getUserByUsername(username);
        if (existing) return { success: false, error: 'Имя уже занято!' };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: getSupabaseHeaders(),
            body: JSON.stringify({
                username: username,
                password: password,
                money: 0,
                seeds: 0,
                prestige_level: 0,
                prestige_bonus: 1,
                auto_clickers: 0,
                auto_click_level: 1,
                total_clicks: 0,
                total_money_earned: 0,
                achievements: '',
                seed_inventory: '',
                click_bonus: 0,
                match_record: 0,
                click_multiplier: 1,
                pref_mode: false,
                coolkid_wins: 0
            })
        });
        const data = await res.json();
        if (res.status === 201) {
            return { success: true };
        } else {
            return { success: false, error: data.message || 'Ошибка создания' };
        }
    } catch (e) {
        console.error('Ошибка создания аккаунта:', e);
        return { success: false, error: 'Ошибка сервера' };
    }
}

async function loginUser(username, password) {
    try {
        const user = await getUserByUsername(username);
        if (!user) return { success: false, error: 'Пользователь не найден!' };
        if (user.password !== password) return { success: false, error: 'Неверный пароль!' };
        currentUser = user;
        localStorage.setItem('gardenCurrentUser', JSON.stringify(username));
        return { success: true };
    } catch (e) {
        console.error('Ошибка входа:', e);
        return { success: false, error: 'Ошибка сервера' };
    }
}

function getCurrentUser() {
    try {
        const data = localStorage.getItem('gardenCurrentUser');
        return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
}

function setCurrentUser(username) {
    if (username) {
        localStorage.setItem('gardenCurrentUser', JSON.stringify(username));
    } else {
        localStorage.removeItem('gardenCurrentUser');
        currentUser = null;
    }
}

async function getUserState(username) {
    try {
        const user = await getUserByUsername(username);
        if (!user) return null;
        return {
            money: user.money || 0,
            seeds: user.seeds || 0,
            prestigeLevel: user.prestige_level || 0,
            prestigeBonus: user.prestige_bonus || 1,
            autoClickers: user.auto_clickers || 0,
            autoClickLevel: user.auto_click_level || 1,
            totalClicks: user.total_clicks || 0,
            totalMoneyEarned: user.total_money_earned || 0,
            achievements: user.achievements ? user.achievements.split(',') : [],
            seedInventory: user.seed_inventory ? JSON.parse(user.seed_inventory) : {},
            clickBonus: user.click_bonus || 0,
            matchRecord: user.match_record || 0,
            clickMultiplier: user.click_multiplier || 1,
            prefMode: user.pref_mode || false,
            coolkidWins: user.coolkid_wins || 0,
        };
    } catch (e) {
        console.error('Ошибка получения состояния:', e);
        return null;
    }
}

async function saveUserState(username, state) {
    try {
        const user = await getUserByUsername(username);
        if (!user) return false;

        const updateData = {
            money: state.money || 0,
            seeds: state.seeds || 0,
            prestige_level: state.prestigeLevel || 0,
            prestige_bonus: state.prestigeBonus || 1,
            auto_clickers: state.autoClickers || 0,
            auto_click_level: state.autoClickLevel || 1,
            total_clicks: state.totalClicks || 0,
            total_money_earned: state.totalMoneyEarned || 0,
            achievements: (state.achievements || []).join(','),
            seed_inventory: JSON.stringify(state.seedInventory || {}),
            click_bonus: state.clickBonus || 0,
            match_record: state.matchRecord || 0,
            click_multiplier: state.clickMultiplier || 1,
            pref_mode: state.prefMode || false,
            coolkid_wins: state.coolkidWins || 0,
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${username}`, {
            method: 'PATCH',
            headers: getSupabaseHeaders(),
            body: JSON.stringify(updateData)
        });
        return res.status === 200;
    } catch (e) {
        console.error('Ошибка сохранения состояния:', e);
        return false;
    }
}

// ---- ДРУЗЬЯ ----
async function getFriends(username) {
    try {
        const user = await getUserByUsername(username);
        if (!user) return [];
        const res = await fetch(`${SUPABASE_URL}/rest/v1/friends?user_id=eq.${user.id}&status=eq.accepted&select=friend_id`, {
            headers: getSupabaseHeaders()
        });
        const data = await res.json();
        const friendIds = data.map(f => f.friend_id);
        if (friendIds.length === 0) return [];
        const idsStr = friendIds.join(',');
        const res2 = await fetch(`${SUPABASE_URL}/rest/v1/users?id=in.(${idsStr})&select=username`, {
            headers: getSupabaseHeaders()
        });
        const users = await res2.json();
        return users.map(u => u.username);
    } catch (e) {
        console.error('Ошибка получения друзей:', e);
        return [];
    }
}

async function getFriendRequests(username) {
    try {
        const user = await getUserByUsername(username);
        if (!user) return [];
        const res = await fetch(`${SUPABASE_URL}/rest/v1/friends?friend_id=eq.${user.id}&status=eq.pending&select=user_id`, {
            headers: getSupabaseHeaders()
        });
        const data = await res.json();
        const userIds = data.map(f => f.user_id);
        if (userIds.length === 0) return [];
        const idsStr = userIds.join(',');
        const res2 = await fetch(`${SUPABASE_URL}/rest/v1/users?id=in.(${idsStr})&select=username`, {
            headers: getSupabaseHeaders()
        });
        const users = await res2.json();
        return users.map(u => u.username);
    } catch (e) {
        console.error('Ошибка получения заявок:', e);
        return [];
    }
}

async function sendFriendRequest(fromUser, toUser) {
    try {
        const from = await getUserByUsername(fromUser);
        const to = await getUserByUsername(toUser);
        if (!from || !to) return { success: false, error: 'Пользователь не найден!' };
        if (fromUser === toUser) return { success: false, error: 'Нельзя добавить себя!' };

        const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/friends?user_id=eq.${from.id}&friend_id=eq.${to.id}`, {
            headers: getSupabaseHeaders()
        });
        const existing = await checkRes.json();
        if (existing.length > 0) {
            if (existing[0].status === 'accepted') return { success: false, error: 'Уже в друзьях!' };
            if (existing[0].status === 'pending') return { success: false, error: 'Запрос уже отправлен!' };
        }

        const res = await fetch(`${SUPABASE_URL}/rest/v1/friends`, {
            method: 'POST',
            headers: getSupabaseHeaders(),
            body: JSON.stringify({
                user_id: from.id,
                friend_id: to.id,
                status: 'pending'
            })
        });
        if (res.status === 201) {
            return { success: true };
        } else {
            return { success: false, error: 'Ошибка отправки заявки' };
        }
    } catch (e) {
        console.error('Ошибка отправки заявки:', e);
        return { success: false, error: 'Ошибка сервера' };
    }
}

async function acceptFriendRequest(username, fromUser) {
    try {
        const user = await getUserByUsername(username);
        const from = await getUserByUsername(fromUser);
        if (!user || !from) return { success: false };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/friends?user_id=eq.${from.id}&friend_id=eq.${user.id}`, {
            method: 'PATCH',
            headers: getSupabaseHeaders(),
            body: JSON.stringify({ status: 'accepted' })
        });
        return { success: res.status === 200 };
    } catch (e) {
        console.error('Ошибка принятия заявки:', e);
        return { success: false };
    }
}

async function declineFriendRequest(username, fromUser) {
    try {
        const user = await getUserByUsername(username);
        const from = await getUserByUsername(fromUser);
        if (!user || !from) return { success: false };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/friends?user_id=eq.${from.id}&friend_id=eq.${user.id}`, {
            method: 'DELETE',
            headers: getSupabaseHeaders()
        });
        return { success: res.status === 200 };
    } catch (e) {
        console.error('Ошибка отклонения заявки:', e);
        return { success: false };
    }
}

async function removeFriend(username, friendName) {
    try {
        const user = await getUserByUsername(username);
        const friend = await getUserByUsername(friendName);
        if (!user || !friend) return { success: false };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/friends?user_id=eq.${user.id}&friend_id=eq.${friend.id}`, {
            method: 'DELETE',
            headers: getSupabaseHeaders()
        });
        return { success: res.status === 200 };
    } catch (e) {
        console.error('Ошибка удаления друга:', e);
        return { success: false };
    }
}

// ---- ТОРГОВЛЯ ----
async function sendMoney(fromUser, toUser, amount = 5) {
    try {
        const from = await getUserByUsername(fromUser);
        const to = await getUserByUsername(toUser);
        if (!from || !to) return { success: false, error: 'Пользователь не найден!' };
        if (from.money < amount) return { success: false, error: 'Не хватает денег!' };

        await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${fromUser}`, {
            method: 'PATCH',
            headers: getSupabaseHeaders(),
            body: JSON.stringify({ money: from.money - amount })
        });

        await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${toUser}`, {
            method: 'PATCH',
            headers: getSupabaseHeaders(),
            body: JSON.stringify({ money: (to.money || 0) + amount })
        });

        return { success: true };
    } catch (e) {
        console.error('Ошибка отправки денег:', e);
        return { success: false, error: 'Ошибка сервера' };
    }
}

// ---- ДОСТИЖЕНИЯ ----
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

// ---- ЗВУКИ ----
let audioCtx = null;

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

console.log('☁️ data.js (облачная база) загружена!');
