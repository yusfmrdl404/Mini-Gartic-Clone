let username = "";
let roomId = "";
let isDrawing = false;
let ctx;
let canvas;
let myTurn = false;

function joinRoom() {
  username = document.getElementById("username").value.trim();
  roomId = document.getElementById("roomCode").value.trim().toUpperCase();

  if (!username || !roomId) {
    alert("Lütfen kullanıcı adı ve oda kodu girin.");
    return;
  }

  // Odaya katıl
  document.getElementById("login").classList.remove("active");
  document.getElementById("game").classList.add("active");
  document.getElementById("roomIdDisplay").innerText = roomId;
  document.getElementById("drawerName").innerText = "Yükleniyor...";

  setupFirebase();
  setupCanvas();
}

function setupCanvas() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000";

  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing);
}

function startDrawing(e) {
  if (!myTurn) return;
  isDrawing = true;
  draw(e);
}

function draw(e) {
  if (!isDrawing || !myTurn) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);

  // Çizimi Firebase'e gönder
  database.ref(`rooms/${roomId}/drawing`).push({
    x,
    y,
    color: ctx.strokeStyle,
    userId: username
  });
}

function stopDrawing() {
  isDrawing = false;
  ctx.beginPath();
}

function setupFirebase() {
  const roomRef = database.ref(`rooms/${roomId}`);

  // Oda yoksa oluştur
  roomRef.once("value", (snapshot) => {
    if (!snapshot.exists()) {
      roomRef.set({
        players: {},
        currentDrawer: "",
        wordToDraw: "elma", // Sabit kelime (ileride rastgele yapılabilir)
        guesses: {}
      });
    }
  });

  // Oyuncuları güncelle
  roomRef.child("players").on("value", (snapshot) => {
    const players = snapshot.val() || {};
    const playersDiv = document.getElementById("players");
    playersDiv.innerHTML = "<h4>Oyuncular:</h4>" + Object.values(players).join(", ");
  });

  // Sıradaki çizeri güncelle
  roomRef.child("currentDrawer").on("value", (snapshot) => {
    const drawer = snapshot.val() || "";
    document.getElementById("drawerName").innerText = drawer || "Bilinmiyor";
    myTurn = drawer === username;
    if (myTurn) {
      alert("Sıra sende! Kelime: " + "elma");
      canvas.style.cursor = "crosshair";
    } else {
      canvas.style.cursor = "not-allowed";
    }
  });

  // Çizim verilerini dinle
  roomRef.child("drawing").on("child_added", (snapshot) => {
    const point = snapshot.val();
    ctx.strokeStyle = point.color;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  });

  // Tahminleri dinle
  roomRef.child("guesses").on("value", (snapshot) => {
    const guesses = snapshot.val() || {};
    const chatDiv = document.getElementById("chat");
    chatDiv.innerHTML = "";
    for (let [user, guess] of Object.entries(guesses)) {
      const div = document.createElement("div");
      div.className = "guess";
      div.innerText = `${user}: ${guess}`;
      chatDiv.appendChild(div);
    }
    chatDiv.scrollTop = chatDiv.scrollHeight; // Otomatik scroll
  });

  // Odaya katıl
  roomRef.child("players").child(username).set(username);
}

function sendGuess() {
  const guess = document.getElementById("guessInput").value.trim();
  if (!guess) return;

  database.ref(`rooms/${roomId}/guesses/${username}`).set(guess);
  document.getElementById("guessInput").value = "";
}

// Sayfa kapatıldığında oyuncuyu çıkar
window.addEventListener("beforeunload", () => {
  if (roomId && username) {
    database.ref(`rooms/${roomId}/players/${username}`).remove();
  }
});
