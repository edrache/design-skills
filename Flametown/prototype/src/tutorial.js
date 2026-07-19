function sumScoreTotals(scoreTotals) {
  return Object.values(scoreTotals || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

export function getTutorialRulesSections() {
  return [
    {
      title: 'Core loop',
      items: [
        'Na starcie wybierasz jeden z sześciu klocków 2x2 i budujesz z niego początek talii.',
        'Klocek z ręki podnosisz z panelu preview, stawiasz na planszy, a potem trafia on na stos odrzuconych.',
        'Nowe klocki dobierasz płacąc kosztem pokazanym bezpośrednio na przycisku danego towaru, a pusty deck miesza odrzucone z powrotem do gry.',
      ],
    },
    {
      title: 'Sterowanie',
      items: [
        'Scroll przybliża i oddala kamerę.',
        'Środkowy przycisk myszy oraz WASD lub strzałki przesuwają widok.',
        'Tab albo prawy przycisk myszy obracają trzymany klocek.',
        'Lewy klik na planszy stawia klocek w wybranym miejscu.',
      ],
    },
    {
      title: 'Zasady stawiania',
      items: [
        'Pierwszy klocek można postawić w dowolnym miejscu, jeśli mieści się na planszy.',
        'Każdy kolejny klocek musi stykać się krawędzią z istniejącym miastem.',
        'Nie można wychodzić poza planszę ani nachodzić na zajęte pola.',
        'Ghost piece pokazuje legalność ruchu: złoty jest poprawny, czerwony oznacza błąd.',
      ],
    },
    {
      title: 'Typy pól i drogi',
      items: [
        'Preview pokazuje typy pól aktualnego klocka z ręki.',
        'Startery mają układ 2x2: jeden dom, dwa parki i jeden sklep, ale losowe klocki ze sklepu mogą mieć dowolny kształt tetromino.',
        'Po postawieniu pola zamieniają się w domy, parki albo konkretne sklepy fantasy.',
        'Drogi pojawiają się automatycznie na krawędziach i próbują zachować ciągłość z sąsiadami.',
      ],
    },
    {
      title: 'Sklep i koszty',
      items: [
        'Sklep pokazuje dwa startery, jeśli jeszcze ich nie masz, oraz jeden losowy klocek o kształcie losowego tetromino.',
        'Starter kupujesz za 100 dowolnego jednego towaru; ikona Any oznacza, że sam wybierasz którym towarem płacisz.',
        'Losowy klocek kosztuje po 50 dwóch różnych towarów naraz, więc musisz spełnić oba koszty jednocześnie.',
        'Odświeżenie sklepu kosztuje 300 jednego wybranego towaru i także wybierasz je przyciskiem z ikoną.',
        'Przyciski kosztów są nieaktywne, jeśli nie masz wystarczających zasobów do danej płatności.',
      ],
    },
    {
      title: 'Mieszkańcy i punktacja',
      items: [
        'Mieszkańcy pojawiają się po postawieniu domu, jeśli dom ma drogę, po której mogą ruszyć.',
        'Mieszkańcy poruszają się po grafie dróg miasta.',
        'Gdy mieszkaniec mija sklep, panel Goods flow dostaje towary odpowiedniej grupy.',
        'Kliknięcie sklepu też daje towar, ale tylko po zejściu jego cooldownu.',
        'Sklep daje tyle punktów, ile wynosi rozmiar jego klastra dla danego towaru.',
      ],
    },
    {
      title: 'Klastry',
      items: [
        'Domy łączą się tylko z domami, a parki tylko z parkami.',
        'Sklepy łączą się według grup towarów, a nie po pełnej nazwie budynku.',
        'Sklep Any działa jako wildcard tylko dla sklepów i może mostkować pasujące grupy.',
        'Najechanie kursorem na budynek podświetla cały klaster i pokazuje jego liczebność.',
      ],
    },
  ];
}

function hasCameraMoved(camera, baseline) {
  if (!camera || !baseline) {
    return false;
  }
  return (
    Math.abs((camera.x || 0) - (baseline.x || 0)) > 4 ||
    Math.abs((camera.y || 0) - (baseline.y || 0)) > 4 ||
    Math.abs((camera.zoom || 0) - (baseline.zoom || 0)) > 0.05
  );
}

function createStepDefinitions() {
  return [
    {
      id: 'welcome',
      title: 'Witamy w Flametown',
      body:
        'Budujesz miasto, dokładając kolejne tetromino. Tutorial przeprowadzi Cię przez sterowanie, zasady stawiania, klastry budynków i naliczanie punktów.',
      instruction: 'Kliknij Dalej, aby wejść do planszy treningowej.',
      continueLabel: 'Zaczynamy',
      allowsContinueBeforeComplete: true,
      prepare(runtime, locals) {
        runtime.loadTutorialBoard();
        locals.ready = true;
      },
      isComplete(_snapshot, locals) {
        return Boolean(locals.ready);
      },
    },
    {
      id: 'camera',
      title: 'Rozejrzyj się po planszy',
      body:
        'Scroll przybliża i oddala widok. Środkowy przycisk myszy albo WASD przesuwają kamerę. To spokojna gra przestrzenna, więc warto często zmieniać perspektywę.',
      instruction: 'Przesuń albo przybliż kamerę, żeby zaliczyć krok.',
      prepare(runtime, locals) {
        locals.camera = runtime.captureCameraBaseline();
      },
      isComplete(snapshot, locals) {
        return hasCameraMoved(snapshot.camera, locals.camera);
      },
    },
    {
      id: 'take-piece',
      title: 'Podnieś klocek z panelu',
      body:
        'Po prawej widzisz preview aktualnego tetromino. Ikony w komórkach pokazują, jakie typy budynków wylądują na tych polach po postawieniu.',
      instruction: 'Kliknij preview klocka w bocznym panelu.',
      prepare(runtime) {
        runtime.loadTutorialBoard();
      },
      isComplete(snapshot) {
        return snapshot.holding === true;
      },
    },
    {
      id: 'rotate-piece',
      title: 'Obróć klocek',
      body:
        'Klocek możesz obrócić klawiszem Tab albo prawym przyciskiem myszy. Rotacja zmienia geometrię placementu, ale zaplanowane typy budynków zostają przypisane do komórek tego klocka.',
      instruction: 'Obróć aktualnie trzymany klocek.',
      prepare(runtime, locals) {
        const snapshot = runtime.getSnapshot();
        locals.initialRotation = snapshot.currentPiece?.rotation ?? 0;
      },
      isComplete(snapshot, locals) {
        return snapshot.holding && (snapshot.currentPiece?.rotation ?? 0) !== locals.initialRotation;
      },
    },
    {
      id: 'first-placement',
      title: 'Pierwszy klocek możesz postawić wszędzie',
      body:
        'Na pustej planszy pierwszy klocek ma pełną swobodę, o ile mieści się w granicach planszy i nie wychodzi poza mapę.',
      instruction: 'Postaw pierwszy klocek w dowolnym legalnym miejscu.',
      isComplete(snapshot) {
        return (snapshot.placedPieceCount || 0) >= 1;
      },
    },
    {
      id: 'adjacency-rule',
      title: 'Dalsza rozbudowa musi stykać się z miastem',
      body:
        'Każdy kolejny klocek musi dotknąć istniejącego miasta krawędzią. Samo zetknięcie rogiem nie wystarczy, a nakładanie na zajęte pola jest zabronione.',
      instruction: 'Kliknij preview, podnieś następny klocek i dołóż go krawędzią do miasta.',
      prepare(runtime) {
        runtime.prepareSecondPlacementStep();
      },
      isComplete(snapshot) {
        return (snapshot.placedPieceCount || 0) >= 2;
      },
    },
    {
      id: 'residents',
      title: 'Mieszkańcy pojawiają się po postawieniu domu',
      body:
        'Dom z dostępem do drogi może od razu wypuścić mieszkańca. To ważne, bo właśnie oni uruchamiają później punktację sklepów, przemieszczając się po mieście.',
      instruction: 'Spójrz na dom i mieszkańca obok niego. Możesz przejść dalej, gdy zobaczysz że mieszkaniec już istnieje.',
      prepare(runtime) {
        runtime.loadResidentBoard();
      },
      isComplete(snapshot) {
        return (snapshot.residents?.length || 0) > 0;
      },
    },
    {
      id: 'illegal-ghost',
      title: 'Czerwony ghost oznacza nielegalny ruch',
      body:
        'Ghost piece pokazuje przewidywane położenie klocka. Złoty obrys oznacza legalny placement, a czerwony sygnalizuje wyjście poza planszę, kolizję albo brak styku z miastem.',
      instruction: 'Podnieś klocek i najedź nim na nielegalne miejsce, aż ghost zrobi się czerwony.',
      prepare(runtime) {
        runtime.loadIllegalPlacementBoard();
      },
      isComplete(snapshot) {
        return snapshot.holding === true && snapshot.ghostLegal === false;
      },
    },
    {
      id: 'clusters',
      title: 'Hover pokazuje klastry budynków',
      body:
        'Kiedy najedziesz na zbudowany blok, gra podświetli cały połączony klaster tego samego typu. Domy łączą się tylko z domami, parki tylko z parkami, a sklepy tworzą klastry według grup towarów.',
      instruction: 'Najedź kursorem na zbudowany budynek i znajdź klaster większy niż 1 pole.',
      prepare(runtime) {
        runtime.loadClusterBoard();
      },
      isComplete(snapshot) {
        return (snapshot.hoveredClusterSize || 0) > 1;
      },
    },
    {
      id: 'score',
      title: 'Mieszkańcy napędzają punktację sklepów',
      body:
        'Domy mogą wypuszczać mieszkańców na drogi. Gdy smok mija sklep, licznik surowców rośnie o rozmiar klastra danego towaru, więc większe skupiska sklepów są cenniejsze.',
      instruction: 'Obserwuj planszę chwilę, aż mieszkaniec minie sklep i pojawi się punktacja.',
      prepare(runtime, locals) {
        runtime.loadScoreBoard();
        locals.initialScore = sumScoreTotals(runtime.getSnapshot().scoreTotals);
      },
      isComplete(snapshot, locals) {
        return sumScoreTotals(snapshot.scoreTotals) > (locals.initialScore || 0);
      },
    },
    {
      id: 'finish',
      title: 'To wszystkie aktualne zasady prototypu',
      body:
        'Umiesz już sterować kamerą, stawiać klocki, rozpoznawać legalne ruchy, czytać klastry i obserwować punktację mieszkańców. Po zamknięciu tutorialu wrócisz do swojego poprzedniego miasta.',
      instruction: 'Kliknij Zakończ, aby wrócić do gry.',
      continueLabel: 'Zakończ tutorial',
      allowsContinueBeforeComplete: true,
      prepare(runtime, locals) {
        locals.ready = true;
      },
      isComplete(_snapshot, locals) {
        return Boolean(locals.ready);
      },
    },
  ];
}

export function createTutorialController(runtime) {
  const steps = createStepDefinitions();
  const controller = {
    active: false,
    stepIndex: 0,
    completed: false,
    completionAcknowledged: false,
    savedSnapshot: null,
    stepLocals: {},
  };

  function getCurrentStep() {
    return steps[controller.stepIndex] || steps[0];
  }

  function prepareCurrentStep() {
    controller.stepLocals = {};
    const step = getCurrentStep();
    step.prepare?.(runtime, controller.stepLocals);
    controller.completed = Boolean(step.isComplete?.(runtime.getSnapshot(), controller.stepLocals));
    controller.completionAcknowledged = step.allowsContinueBeforeComplete || controller.completed;
  }

  function syncCompletion() {
    if (!controller.active) {
      return;
    }
    const step = getCurrentStep();
    const isComplete = Boolean(step.isComplete?.(runtime.getSnapshot(), controller.stepLocals));
    if (isComplete && !controller.completed) {
      controller.completed = true;
      controller.completionAcknowledged = true;
    } else if (!isComplete) {
      controller.completed = false;
      controller.completionAcknowledged = Boolean(step.allowsContinueBeforeComplete);
    }
  }

  function getViewModel() {
    const step = getCurrentStep();
    return {
      active: controller.active,
      stepIndex: controller.stepIndex,
      stepNumber: controller.stepIndex + 1,
      totalSteps: steps.length,
      title: step.title,
      body: step.body,
      instruction: step.instruction,
      completed: controller.completed,
      canGoBack: controller.stepIndex > 0,
      canGoNext: controller.completionAcknowledged,
      continueLabel: step.continueLabel || (controller.stepIndex === steps.length - 1 ? 'Zamknij' : 'Dalej'),
      isLastStep: controller.stepIndex === steps.length - 1,
    };
  }

  function restoreSavedSnapshot() {
    if (controller.savedSnapshot) {
      runtime.restoreGameSnapshot(controller.savedSnapshot);
    }
    controller.savedSnapshot = null;
  }

  return {
    isActive() {
      return controller.active;
    },
    start() {
      if (!controller.active) {
        controller.savedSnapshot = runtime.saveGameSnapshot();
      }
      controller.active = true;
      controller.stepIndex = 0;
      prepareCurrentStep();
      return getViewModel();
    },
    stop({ restore = true } = {}) {
      if (restore) {
        restoreSavedSnapshot();
      }
      controller.active = false;
      controller.stepIndex = 0;
      controller.completed = false;
      controller.completionAcknowledged = false;
      controller.stepLocals = {};
      return getViewModel();
    },
    sync() {
      syncCompletion();
      return getViewModel();
    },
    next() {
      syncCompletion();
      if (!controller.active || !controller.completionAcknowledged) {
        return getViewModel();
      }
      if (controller.stepIndex >= steps.length - 1) {
        return this.stop({ restore: true });
      }
      controller.stepIndex += 1;
      prepareCurrentStep();
      return getViewModel();
    },
    previous() {
      if (!controller.active || controller.stepIndex <= 0) {
        return getViewModel();
      }
      controller.stepIndex -= 1;
      prepareCurrentStep();
      return getViewModel();
    },
    restartStep() {
      if (!controller.active) {
        return getViewModel();
      }
      prepareCurrentStep();
      return getViewModel();
    },
    getViewModel,
  };
}
