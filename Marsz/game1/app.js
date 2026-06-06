const cards = window.MARSZ_CARDS || [];

if (!cards.length) {
  throw new Error("Brak danych kart. Upewnij sie, ze cards-data.js laduje sie przed app.js.");
}

const endings = {
  sanity_zero: {
    title: "Sciana zna juz wszystkie zasady",
    text: "Siedze w kacie i szeptem tlumacze zasady scianie. Sesja trwa beze mnie.",
  },
  engagement_zero: {
    title: "Smok zostal bez publicznosci",
    text: "Dzieci bawia sie w berka w ogrodzie. Nikt nie pamieta, ze w lochach czeka smok.",
  },
  engagement_full: {
    title: "Stary Typ traci kontrole",
    text: "Dzieci przejely narracje. Jestem teraz NPC o imieniu 'Stary Typ'. Prosze o wode, ale nikt mnie nie slyszy.",
  },
};

const state = {
  mode: "start",
  sanity: 50,
  engagement: 50,
  cardsPlayed: 0,
  currentIndex: 0,
  deck: [],
  feedback: "",
  endingKey: null,
  animating: false,
  dragX: 0,
};

const refs = {
  startScreen: document.getElementById("start-screen"),
  gameOverScreen: document.getElementById("game-over-screen"),
  startBtn: document.getElementById("start-btn"),
  restartBtn: document.getElementById("restart-btn"),
  fullscreenBtn: document.getElementById("fullscreen-btn"),
  card: document.getElementById("card"),
  cardImage: document.getElementById("card-image"),
  cardSituation: document.getElementById("card-situation"),
  cardNumber: document.getElementById("card-number"),
  leftChoiceHint: document.getElementById("left-choice-hint"),
  rightChoiceHint: document.getElementById("right-choice-hint"),
  leftChoiceText: document.getElementById("left-choice-text"),
  rightChoiceText: document.getElementById("right-choice-text"),
  feedbackBanner: document.getElementById("feedback-banner"),
  sanityValue: document.getElementById("sanity-value"),
  engagementValue: document.getElementById("engagement-value"),
  sanityBar: document.getElementById("sanity-bar"),
  engagementBar: document.getElementById("engagement-bar"),
  sanityDelta: document.getElementById("sanity-delta"),
  engagementDelta: document.getElementById("engagement-delta"),
  gameOverTitle: document.getElementById("game-over-title"),
  gameOverText: document.getElementById("game-over-text"),
  cardsPlayed: document.getElementById("cards-played"),
};

const drag = {
  active: false,
  startX: 0,
  pointerId: null,
};

const SWIPE_THRESHOLD = 140;
const MAX_ROTATION = 14;

function shuffleDeck() {
  const clone = [...cards];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function currentCard() {
  return state.deck[state.currentIndex];
}

function updateResourceUi() {
  refs.sanityValue.textContent = String(state.sanity);
  refs.engagementValue.textContent = String(state.engagement);
  refs.sanityBar.style.width = `${state.sanity}%`;
  refs.engagementBar.style.width = `${state.engagement}%`;
}

function showDelta(target, delta) {
  if (!delta) {
    return;
  }
  target.textContent = `${delta > 0 ? "+" : ""}${delta}`;
  target.classList.remove("positive", "negative", "visible");
  target.classList.add(delta > 0 ? "positive" : "negative");
  requestAnimationFrame(() => target.classList.add("visible"));
  window.setTimeout(() => target.classList.remove("visible"), 1500);
}

function showFeedback(text) {
  state.feedback = text;
  refs.feedbackBanner.textContent = text;
  refs.feedbackBanner.classList.add("visible");
  window.setTimeout(() => {
    if (state.feedback === text) {
      refs.feedbackBanner.classList.remove("visible");
    }
  }, 1650);
}

function setHints(card) {
  refs.leftChoiceText.textContent = card.left_label;
  refs.rightChoiceText.textContent = card.right_label;
}

function updateChoiceHintOpacity() {
  const ratio = clamp(Math.abs(state.dragX) / SWIPE_THRESHOLD, 0, 1);
  refs.leftChoiceHint.style.opacity = state.dragX < 0 ? String(ratio) : "0";
  refs.leftChoiceHint.style.transform = state.dragX < 0
    ? `scale(${0.96 + ratio * 0.04})`
    : "scale(0.96)";
  refs.rightChoiceHint.style.opacity = state.dragX > 0 ? String(ratio) : "0";
  refs.rightChoiceHint.style.transform = state.dragX > 0
    ? `scale(${0.96 + ratio * 0.04})`
    : "scale(0.96)";
}

function applyCardTransform() {
  const ratio = clamp(state.dragX / SWIPE_THRESHOLD, -1.2, 1.2);
  refs.card.style.transform = `translateX(${state.dragX}px) rotate(${ratio * MAX_ROTATION}deg)`;
  updateChoiceHintOpacity();
}

function resetCardPosition() {
  state.dragX = 0;
  refs.card.classList.remove("dragging", "exiting");
  refs.card.style.opacity = "1";
  applyCardTransform();
}

function renderCard() {
  const card = currentCard();
  if (!card) {
    state.deck = shuffleDeck();
    state.currentIndex = 0;
  }
  const nextCard = currentCard();
  refs.cardImage.src = nextCard.illustration || "./assets/temp-image.png";
  refs.cardSituation.textContent = nextCard.situation;
  refs.cardNumber.textContent = String((state.cardsPlayed % cards.length) + 1);
  setHints(nextCard);
  resetCardPosition();
}

function evaluateEnding() {
  if (state.sanity <= 0) {
    return "sanity_zero";
  }
  if (state.engagement <= 0) {
    return "engagement_zero";
  }
  if (state.engagement >= 100) {
    return "engagement_full";
  }
  return null;
}

function presentGameOver(endingKey) {
  state.mode = "gameover";
  state.endingKey = endingKey;
  refs.gameOverTitle.textContent = endings[endingKey].title;
  refs.gameOverText.textContent = endings[endingKey].text;
  refs.cardsPlayed.textContent = String(state.cardsPlayed);
  refs.gameOverScreen.classList.add("active");
}

function finishChoice(choice) {
  const card = currentCard();
  if (!card) {
    return;
  }

  const effects = choice === "left" ? card.left_effects : card.right_effects;
  const feedback = choice === "left" ? card.left_feedback : card.right_feedback;

  state.sanity = clamp(state.sanity + effects.sanity, 0, 100);
  state.engagement = clamp(state.engagement + effects.engagement, 0, 100);
  state.cardsPlayed += 1;
  state.currentIndex += 1;

  updateResourceUi();
  showDelta(refs.sanityDelta, effects.sanity);
  showDelta(refs.engagementDelta, effects.engagement);
  showFeedback(feedback);

  const ending = evaluateEnding();
  if (ending) {
    window.setTimeout(() => presentGameOver(ending), 500);
    return;
  }

  window.setTimeout(() => {
    renderCard();
    state.animating = false;
  }, 260);
}

function commitChoice(choice) {
  if (state.mode !== "playing" || state.animating) {
    return;
  }

  state.animating = true;
  refs.card.classList.remove("dragging");
  refs.card.classList.add("exiting");
  const direction = choice === "left" ? -1 : 1;
  state.dragX = direction * window.innerWidth * 0.9;
  applyCardTransform();
  window.setTimeout(() => finishChoice(choice), 220);
}

function onPointerDown(event) {
  if (state.mode !== "playing" || state.animating) {
    return;
  }
  drag.active = true;
  drag.startX = event.clientX;
  drag.pointerId = event.pointerId;
  refs.card.classList.add("dragging");
  refs.card.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!drag.active || event.pointerId !== drag.pointerId) {
    return;
  }
  state.dragX = event.clientX - drag.startX;
  applyCardTransform();
}

function onPointerUp(event) {
  if (!drag.active || event.pointerId !== drag.pointerId) {
    return;
  }
  drag.active = false;
  if (refs.card.hasPointerCapture(event.pointerId)) {
    refs.card.releasePointerCapture(event.pointerId);
  }

  if (state.dragX <= -SWIPE_THRESHOLD) {
    commitChoice("left");
    return;
  }

  if (state.dragX >= SWIPE_THRESHOLD) {
    commitChoice("right");
    return;
  }

  refs.card.classList.remove("dragging");
  resetCardPosition();
}

function onKeyDown(event) {
  if (event.key.toLowerCase() === "f") {
    toggleFullscreen();
  }

  if (state.mode !== "playing") {
    return;
  }

  if (event.key === "ArrowLeft") {
    commitChoice("left");
  }
  if (event.key === "ArrowRight") {
    commitChoice("right");
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function hideOverlays() {
  refs.startScreen.classList.remove("active");
  refs.gameOverScreen.classList.remove("active");
}

function startGame() {
  state.mode = "playing";
  state.sanity = 50;
  state.engagement = 50;
  state.cardsPlayed = 0;
  state.currentIndex = 0;
  state.deck = shuffleDeck();
  state.feedback = "";
  state.endingKey = null;
  state.animating = false;
  refs.feedbackBanner.classList.remove("visible");
  hideOverlays();
  updateResourceUi();
  renderCard();
}

refs.startBtn.addEventListener("click", startGame);
refs.restartBtn.addEventListener("click", startGame);
refs.fullscreenBtn.addEventListener("click", toggleFullscreen);
refs.card.addEventListener("pointerdown", onPointerDown);
refs.card.addEventListener("pointermove", onPointerMove);
refs.card.addEventListener("pointerup", onPointerUp);
refs.card.addEventListener("pointercancel", onPointerUp);
window.addEventListener("keydown", onKeyDown);

window.render_game_to_text = () => JSON.stringify({
  coordinateSystem: "screen pixels, origin top-left, +x right, +y down",
  mode: state.mode,
  sanity: state.sanity,
  engagement: state.engagement,
  cardsPlayed: state.cardsPlayed,
  currentCard: currentCard()
    ? {
        id: currentCard().id,
        situation: currentCard().situation,
        left: currentCard().left_label,
        right: currentCard().right_label,
      }
    : null,
  dragX: state.dragX,
  feedback: state.feedback,
  ending: state.endingKey,
});

window.advanceTime = (ms) => {
  const frames = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < frames; i += 1) {
    updateChoiceHintOpacity();
  }
  return frames;
};

updateResourceUi();
renderCard();
