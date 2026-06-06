const cards = window.MARSZ_CARDS || [];
const miniCardSystem = window.MARSZ_MINI_CARD_SYSTEM || null;
const rawMiniBranches = window.MARSZ_CARD_BRANCHES || {};

if (!cards.length) {
  throw new Error("Brak danych kart. Upewnij się, że cards-data.js ładuje się przed app.js.");
}

const cardLookup = new Map(cards.map((card) => [card.id, card]));
const builtMiniBranches = new Map();

if (miniCardSystem) {
  cards.forEach((card) => {
    const branchData = rawMiniBranches[card.id];
    if (!branchData) {
      throw new Error(`Brak mini-kart dla karty ${card.id}.`);
    }
    builtMiniBranches.set(card.id, miniCardSystem.buildMiniCardsForCard(card, branchData));
  });
}

const endings = {
  sanity_zero: {
    title: "Ściana zna już wszystkie zasady",
    text: "Siedzę w kącie i szeptem tłumaczę zasady ścianie. Sesja trwa beze mnie.",
  },
  engagement_zero: {
    title: "Smok został bez publiczności",
    text: "Gracze bawią się w berka w ogrodzie. Nikt nie pamięta, że w lochach czeka smok.",
  },
  engagement_full: {
    title: "Stary Typ traci kontrolę",
    text: "Gracze przejęli narrację. Jestem teraz NPC o imieniu 'Stary Typ'. Proszę o wodę, ale nikt mnie nie słyszy.",
  },
};

const state = {
  mode: "start",
  sanity: 50,
  engagement: 50,
  mainCardsPlayed: 0,
  cardsPlayed: 0,
  currentIndex: 0,
  deck: [],
  feedback: "",
  endingKey: null,
  pendingEndingKey: null,
  activeMiniCards: [],
  animating: false,
  dragX: 0,
  awaitingFeedbackDismiss: false,
  feedbackShownAt: 0,
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
  cardPhase: document.getElementById("card-phase"),
  cardAgentChip: document.getElementById("card-agent-chip"),
  cardAgentStage: document.getElementById("card-agent-stage"),
  cardAgentName: document.getElementById("card-agent-name"),
  cardBranchCue: document.getElementById("card-branch-cue"),
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
  decisionsPlayed: document.getElementById("decisions-played"),
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

function rollEffectValue(baseValue) {
  if (!baseValue) {
    return 0;
  }

  const sign = Math.sign(baseValue);
  const maxRoll = Math.abs(baseValue) * 2;
  const rolledMagnitude = Math.floor(Math.random() * maxRoll) + 1;
  return rolledMagnitude * sign;
}

function resolveEffects(effects) {
  return {
    sanity: rollEffectValue(effects.sanity),
    engagement: rollEffectValue(effects.engagement),
  };
}

function currentCard() {
  if (state.activeMiniCards.length) {
    return state.activeMiniCards[0];
  }
  return state.deck[state.currentIndex];
}

function currentMainCard() {
  const card = currentCard();
  if (!card) {
    return null;
  }
  return card.isMini ? cardLookup.get(card.parentId) || null : card;
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
  state.feedbackShownAt = Date.now();
  refs.feedbackBanner.textContent = text;
  refs.feedbackBanner.classList.add("visible");
}

function hideFeedback() {
  state.feedback = "";
  state.feedbackShownAt = 0;
  refs.feedbackBanner.classList.remove("visible");
}

function setHints(card) {
  refs.leftChoiceText.textContent = card.left_label;
  refs.rightChoiceText.textContent = card.right_label;
}

function renderCardMeta(card) {
  if (card.isMini) {
    refs.cardPhase.textContent = `Mini ${card.miniStep}/${card.miniTotal}`;
    refs.cardAgentStage.textContent = card.stageLabel;
    refs.cardAgentName.textContent = card.agentLabel;
    refs.cardBranchCue.textContent = card.branchKey === "left" ? "Po wyborze: lewo" : "Po wyborze: prawo";
    refs.cardAgentChip.hidden = false;
    return;
  }

  refs.cardPhase.textContent = "Karta glowna";
  refs.cardAgentStage.textContent = "";
  refs.cardAgentName.textContent = "";
  refs.cardBranchCue.textContent = "";
  refs.cardAgentChip.hidden = true;
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
  refs.cardNumber.textContent = nextCard.isMini
    ? String(state.mainCardsPlayed)
    : String(state.mainCardsPlayed + 1);
  setHints(nextCard);
  renderCardMeta(nextCard);
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
  refs.cardsPlayed.textContent = String(state.mainCardsPlayed);
  refs.decisionsPlayed.textContent = String(state.cardsPlayed);
  refs.gameOverScreen.classList.add("active");
}

function finishChoice(choice) {
  const card = currentCard();
  if (!card) {
    return;
  }

  const effects = choice === "left" ? card.left_effects : card.right_effects;
  const resolvedEffects = resolveEffects(effects);
  const feedback = choice === "left" ? card.left_feedback : card.right_feedback;

  state.sanity = clamp(state.sanity + resolvedEffects.sanity, 0, 100);
  state.engagement = clamp(state.engagement + resolvedEffects.engagement, 0, 100);
  state.cardsPlayed += 1;

  updateResourceUi();
  showDelta(refs.sanityDelta, resolvedEffects.sanity);
  showDelta(refs.engagementDelta, resolvedEffects.engagement);
  showFeedback(feedback);

  if (card.isMini) {
    state.activeMiniCards.shift();
  } else {
    state.mainCardsPlayed += 1;
    state.currentIndex += 1;
    const branchBundle = builtMiniBranches.get(card.id);
    state.activeMiniCards = branchBundle ? [...branchBundle[choice]] : [];
  }

  const ending = evaluateEnding();
  if (ending && !state.activeMiniCards.length) {
    state.pendingEndingKey = ending;
  }
  state.awaitingFeedbackDismiss = true;
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

  if (state.awaitingFeedbackDismiss && (event.key === "Enter" || event.key === " " || event.key === "Spacebar")) {
    dismissFeedbackAndContinue();
    return;
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

function dismissFeedbackAndContinue() {
  if (!state.awaitingFeedbackDismiss || state.mode !== "playing") {
    return;
  }

  if (Date.now() - state.feedbackShownAt < 320) {
    return;
  }

  state.awaitingFeedbackDismiss = false;
  hideFeedback();
  if (state.pendingEndingKey) {
    const endingKey = state.pendingEndingKey;
    state.pendingEndingKey = null;
    presentGameOver(endingKey);
    return;
  }

  renderCard();
  state.animating = false;
}

function onScreenTap() {
  dismissFeedbackAndContinue();
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
  state.mainCardsPlayed = 0;
  state.cardsPlayed = 0;
  state.currentIndex = 0;
  state.deck = shuffleDeck();
  state.activeMiniCards = [];
  state.feedback = "";
  state.endingKey = null;
  state.pendingEndingKey = null;
  state.animating = false;
  state.awaitingFeedbackDismiss = false;
  hideFeedback();
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
window.addEventListener("pointerup", onScreenTap);
window.addEventListener("click", onScreenTap);

window.render_game_to_text = () => JSON.stringify({
  coordinateSystem: "screen pixels, origin top-left, +x right, +y down",
  mode: state.mode,
  sanity: state.sanity,
  engagement: state.engagement,
  mainCardsPlayed: state.mainCardsPlayed,
  cardsPlayed: state.cardsPlayed,
  mainCard: currentMainCard()
    ? {
        id: currentMainCard().id,
        situation: currentMainCard().situation,
      }
    : null,
  currentCard: currentCard()
    ? {
        id: currentCard().id,
        situation: currentCard().situation,
        left: currentCard().left_label,
        right: currentCard().right_label,
        isMini: Boolean(currentCard().isMini),
        miniStep: currentCard().miniStep || 0,
        miniTotal: currentCard().miniTotal || 0,
        agent: currentCard().agentLabel || null,
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
