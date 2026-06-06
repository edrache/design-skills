const MINI_CARD_AGENTS = [
  {
    id: "pulse",
    label: "Agent Impulsu",
    stageLabel: "Pierwsza fala",
    summary: "Sprawdza natychmiastowy efekt decyzji przy stole.",
  },
  {
    id: "spotlight",
    label: "Agent Stolu",
    stageLabel: "Reakcja ekipy",
    summary: "Patrzy, jak pozostali gracze i scena odpowiadaja na ruch MG.",
  },
  {
    id: "aftershock",
    label: "Agent Następstw",
    stageLabel: "Drugi rachunek",
    summary: "Domyka długofalowy koszt albo bonus decyzji.",
  },
];

function normalizeMiniStep(parentCard, branchKey, stepData, stepIndex) {
  const agent = MINI_CARD_AGENTS[stepIndex];
  if (!agent) {
    throw new Error(`Brak agenta mini-karty dla kroku ${stepIndex + 1}.`);
  }

  if (!Array.isArray(stepData) || stepData.length !== 7) {
    throw new Error(`Mini-karta ${parentCard.id}/${branchKey}/${stepIndex + 1} ma niepoprawny format.`);
  }

  const [
    situation,
    leftLabel,
    rightLabel,
    leftFeedback,
    rightFeedback,
    leftEffects,
    rightEffects,
  ] = stepData;

  return {
    id: `${parentCard.id}-${branchKey}-mini-${stepIndex + 1}`,
    illustration: parentCard.illustration,
    situation,
    left_label: leftLabel,
    right_label: rightLabel,
    left_feedback: leftFeedback,
    right_feedback: rightFeedback,
    left_effects: leftEffects,
    right_effects: rightEffects,
    isMini: true,
    parentId: parentCard.id,
    parentSituation: parentCard.situation,
    branchKey,
    miniStep: stepIndex + 1,
    miniTotal: MINI_CARD_AGENTS.length,
    agentId: agent.id,
    agentLabel: agent.label,
    stageLabel: agent.stageLabel,
    agentSummary: agent.summary,
  };
}

function buildMiniCardsForCard(parentCard, branchData) {
  const leftBranch = branchData?.left || [];
  const rightBranch = branchData?.right || [];

  if (leftBranch.length !== MINI_CARD_AGENTS.length || rightBranch.length !== MINI_CARD_AGENTS.length) {
    throw new Error(`Karta ${parentCard.id} musi miec dokladnie ${MINI_CARD_AGENTS.length} mini-karty na lewo i prawo.`);
  }

  return {
    left: leftBranch.map((stepData, index) => normalizeMiniStep(parentCard, "left", stepData, index)),
    right: rightBranch.map((stepData, index) => normalizeMiniStep(parentCard, "right", stepData, index)),
  };
}

window.MARSZ_MINI_CARD_SYSTEM = {
  agents: MINI_CARD_AGENTS,
  buildMiniCardsForCard,
};
