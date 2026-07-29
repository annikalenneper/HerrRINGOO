(function () {
  // Generische Step-Engine: kennt keine post-spezifischen Begriffe, nur Ablaufsteuerung
  // (aktueller Schritt, Fortschritt, Validierung, Busy-State). Die fachliche Logik lebt
  // ausschließlich in den übergebenen `steps`.
  function createWizard({ steps, container, progressContainer, onCancel, onComplete }) {
    if (!steps || !steps.length) {
      throw new Error('Wizard braucht mindestens einen Schritt.');
    }

    const state = {};
    const visitedSteps = new Set();
    let currentIndex = 0;
    let busy = false;

    function setBusy(value) {
      busy = value;
      container.querySelectorAll('[data-wizard-nav]').forEach((btn) => {
        btn.disabled = value;
      });
    }

    function renderProgress() {
      if (!progressContainer) return;
      progressContainer.innerHTML = '';

      steps.forEach((step, index) => {
        const item = document.createElement('li');
        const isCurrent = index === currentIndex;
        const isDone = visitedSteps.has(step.id) && !isCurrent;
        const isReachable = visitedSteps.has(step.id);

        if (isCurrent) item.className = 'current';
        else if (isDone) item.className = 'done';

        const label = `${index + 1}. ${step.titel}`;

        if (isReachable && !isCurrent) {
          const link = document.createElement('button');
          link.type = 'button';
          link.textContent = label;
          link.addEventListener('click', () => goTo(step.id));
          item.appendChild(link);
        } else {
          const span = document.createElement('span');
          span.textContent = label;
          item.appendChild(span);
        }

        progressContainer.appendChild(item);
      });
    }

    function showErrors(body, errors) {
      Object.entries(errors || {}).forEach(([field, message]) => {
        const target = body.querySelector(`[data-field="${field}"]`) || body;
        const error = document.createElement('p');
        error.className = 'field-error';
        error.setAttribute('role', 'alert');
        error.textContent = message;
        target.appendChild(error);
      });
    }

    function renderCurrentStep(errors) {
      container.innerHTML = '';
      const step = steps[currentIndex];

      const heading = document.createElement('h3');
      heading.tabIndex = -1;
      heading.textContent = `Schritt ${currentIndex + 1} von ${steps.length}: ${step.titel}`;
      container.appendChild(heading);

      const body = document.createElement('div');
      body.className = 'wizard-step-body';
      container.appendChild(body);

      const helpers = { next, back, goTo, cancel, finish, setBusy, isBusy: () => busy };
      step.mount(body, state, helpers);

      if (errors) {
        showErrors(body, errors);
      }

      renderProgress();
      heading.focus();
    }

    function next() {
      if (busy) return;
      const step = steps[currentIndex];
      const result = step.validate ? step.validate(state) : { valid: true };
      if (!result.valid) {
        renderCurrentStep(result.errors);
        return;
      }
      visitedSteps.add(step.id);
      if (currentIndex < steps.length - 1) {
        currentIndex += 1;
        renderCurrentStep();
      }
    }

    function back() {
      if (busy) return;
      if (currentIndex > 0) {
        currentIndex -= 1;
        renderCurrentStep();
      }
    }

    function goTo(stepId) {
      if (busy) return;
      const index = steps.findIndex((s) => s.id === stepId);
      if (index === -1 || !visitedSteps.has(stepId)) return;
      currentIndex = index;
      renderCurrentStep();
    }

    async function cancel() {
      if (busy) return;
      const hasProgress = visitedSteps.size > 0 || currentIndex > 0;
      if (hasProgress && window.ConfirmDialog) {
        const confirmed = await window.ConfirmDialog.confirmAction({
          titel: 'Wirklich abbrechen?',
          nachricht: 'Deine bisherigen Eingaben gehen dabei verloren.',
          bestaetigenLabel: 'Ja, abbrechen',
          abbrechenLabel: 'Weiter bearbeiten',
          destructive: true,
        });
        if (!confirmed) return;
      }
      if (onCancel) onCancel(state);
    }

    function finish() {
      if (onComplete) onComplete(state);
    }

    function start() {
      currentIndex = 0;
      visitedSteps.clear();
      Object.keys(state).forEach((key) => delete state[key]);
      renderCurrentStep();
    }

    return { start, next, back, goTo, cancel, finish, get state() { return state; } };
  }

  window.WizardEngine = { createWizard };
})();
