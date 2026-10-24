import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { DashboardLayout } from '../../../shared/layouts/DashboardLayout';
import { PlanIntakeError, PlanIntakeService } from '../services/planIntakeService';
import {
  PLAN_INTAKE_STEPS,
  clearDraft,
  emptyForm,
  loadDraft,
  saveDraft,
  toAnswers,
  validateStep,
} from '../services/planIntakeForm';
import type { PlanIntakeErrors } from '../services/planIntakeForm';
import type { PlanIntakeFormState } from '../types';
import {
  PlanIntakeStepAbout,
  PlanIntakeStepCoach,
  PlanIntakeStepFitness,
  PlanIntakeStepHealth,
  PlanIntakeStepLife,
  PlanIntakeStepSetup,
  PlanIntakeStepWeek,
} from '../components/PlanIntakeSteps';
import type { PlanIntakeStepProps } from '../components/PlanIntakeSteps';
import { PlanIntakeReview } from '../components/PlanIntakeReview';

type Phase = 'checking' | 'closed' | 'error' | 'form' | 'done';

const AUTOSAVE_MS = 5000;
const REVIEW_STEP = PLAN_INTAKE_STEPS.length - 1;

const STEP_COMPONENTS: Record<string, React.FC<PlanIntakeStepProps>> = {
  about: PlanIntakeStepAbout,
  fitness: PlanIntakeStepFitness,
  week: PlanIntakeStepWeek,
  life: PlanIntakeStepLife,
  setup: PlanIntakeStepSetup,
  health: PlanIntakeStepHealth,
  coach: PlanIntakeStepCoach,
};

export const PlanIntakeFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useAuth();
  const memberId = state.user?.id ?? '';

  const [phase, setPhase] = useState<Phase>('checking');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PlanIntakeFormState>(emptyForm);
  const [errors, setErrors] = useState<PlanIntakeErrors>({});
  const [restored, setRestored] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const formRef = useRef(form);
  const stepRef = useRef(step);
  const topRef = useRef<HTMLDivElement>(null);
  formRef.current = form;
  stepRef.current = step;

  // ---- Is there an open form for this login? ----

  const checkStatus = useCallback(async () => {
    setPhase('checking');
    try {
      const open = await PlanIntakeService.hasOpenForm();
      if (!open) {
        setPhase('closed');
        return;
      }
      const draft = loadDraft(memberId);
      if (draft) {
        setForm(draft.form);
        setStep(Math.min(Math.max(draft.step, 0), REVIEW_STEP));
        setRestored(true);
      }
      setPhase('form');
    } catch {
      setPhase('error');
    }
  }, [memberId]);

  useEffect(() => {
    if (memberId) checkStatus();
  }, [memberId, checkStatus]);

  // ---- Draft: on every step change and every few seconds ----

  useEffect(() => {
    if (phase === 'form' && memberId) saveDraft(memberId, step, formRef.current);
  }, [phase, step, memberId]);

  useEffect(() => {
    if (phase !== 'form' || !memberId) return;
    const timer = window.setInterval(() => saveDraft(memberId, stepRef.current, formRef.current), AUTOSAVE_MS);
    return () => window.clearInterval(timer);
  }, [phase, memberId]);

  const update = useCallback((patch: Partial<PlanIntakeFormState>) => {
    setForm(prev => ({ ...prev, ...patch }));
  }, []);

  // ---- Step navigation ----

  const goTo = (next: number) => {
    setErrors({});
    setSubmitError('');
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** Validates the current step. On failure shows the errors and moves focus to the first one. */
  const stepIsValid = (index: number): boolean => {
    const found = validateStep(PLAN_INTAKE_STEPS[index].id, form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      window.setTimeout(() => {
        const field = document.getElementById(first) ?? document.querySelector<HTMLElement>('.plan-intake__field--error input, .plan-intake__field--error select');
        field?.focus();
      }, 0);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!stepIsValid(step)) return;
    if (returnToReview) {
      setReturnToReview(false);
      goTo(REVIEW_STEP);
    } else {
      goTo(step + 1);
    }
  };

  const handleEdit = (index: number) => {
    setReturnToReview(true);
    goTo(index);
  };

  // ---- Submit ----

  const finish = () => {
    clearDraft();
    setPhase('done');
    topRef.current?.scrollIntoView({ block: 'start' });
  };

  const handleSubmit = async () => {
    // Check every step again before sending
    for (let i = 0; i < REVIEW_STEP; i++) {
      if (Object.keys(validateStep(PLAN_INTAKE_STEPS[i].id, form)).length > 0) {
        setReturnToReview(true);
        goTo(i);
        setErrors(validateStep(PLAN_INTAKE_STEPS[i].id, form));
        return;
      }
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await PlanIntakeService.submit(toAnswers(form), form.consent);
      if (result === 'received') {
        finish();
      } else {
        setPhase('closed');
      }
    } catch (err) {
      const code = err instanceof PlanIntakeError ? err.code : 'server_error';
      if (code === 'network' || code === 'server_error') {
        // The answers may have arrived even though the reply didn't. If the form is no longer open, they did.
        try {
          if (!(await PlanIntakeService.hasOpenForm())) {
            finish();
            return;
          }
        } catch {
          // Fall through to the error message
        }
      }
      setSubmitError(err instanceof Error ? err.message : PlanIntakeError.messageFor(code));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Render ----

  const renderBody = () => {
    switch (phase) {
      case 'checking':
        return <div className="plan-intake__status">Loading...</div>;

      case 'error':
        return (
          <div className="plan-intake__panel">
            <p>Something went wrong loading the form. Check your connection and try again.</p>
            <button type="button" className="btn btn-primary plan-intake__button" onClick={checkStatus}>Try again</button>
          </div>
        );

      case 'closed':
        return (
          <div className="plan-intake__panel">
            <p>
              There is no open plan form for this account. If you were expecting one, check you are logged in
              with the email address the invitation was sent to, or contact the coach.
            </p>
            <button type="button" className="btn btn-secondary plan-intake__button" onClick={() => navigate('/')}>
              Back to the app
            </button>
          </div>
        );

      case 'done':
        return (
          <div className="plan-intake__panel plan-intake__panel--done">
            <Check size={32} className="plan-intake__done-icon" aria-hidden="true" />
            <p className="plan-intake__done-text">Thank you. Your answers have been received.</p>
            <button type="button" className="btn btn-secondary plan-intake__button" onClick={() => navigate('/')}>
              Back to the app
            </button>
          </div>
        );

      case 'form': {
        const current = PLAN_INTAKE_STEPS[step];
        const StepComponent = STEP_COMPONENTS[current.id];
        const isReview = step === REVIEW_STEP;

        return (
          <>
            <div className="plan-intake__progress">
              <div className="plan-intake__progress-text">
                Step {step + 1} of {PLAN_INTAKE_STEPS.length}: <strong>{current.title}</strong>
              </div>
              <progress
                className="plan-intake__progress-bar"
                value={step + 1}
                max={PLAN_INTAKE_STEPS.length}
                aria-label={`Step ${step + 1} of ${PLAN_INTAKE_STEPS.length}`}
              />
            </div>

            {restored && (
              <div className="plan-intake__notice plan-intake__notice--info" role="status">
                We've brought back your saved answers. Health answers aren't saved on this device, so please
                check that page again.
                <button type="button" className="plan-intake__notice-close" onClick={() => setRestored(false)}>
                  OK
                </button>
              </div>
            )}

            <form className="plan-intake__form" onSubmit={e => e.preventDefault()} noValidate>
              <h2 className="plan-intake__step-title">{current.title}</h2>

              {isReview ? (
                <PlanIntakeReview answers={toAnswers(form)} onEdit={handleEdit} />
              ) : (
                <StepComponent form={form} update={update} errors={errors} />
              )}

              {Object.keys(errors).length > 0 && (
                <div className="plan-intake__summary-error" role="alert">
                  Please fix the highlighted answers before you continue.
                </div>
              )}
              {submitError && <div className="plan-intake__summary-error" role="alert">{submitError}</div>}

              <div className="plan-intake__nav">
                {step > 0 && (
                  <button type="button" className="btn btn-secondary plan-intake__button" onClick={() => goTo(step - 1)} disabled={submitting}>
                    <ArrowLeft size={16} /> Back
                  </button>
                )}
                {isReview ? (
                  <button type="button" className="btn btn-primary plan-intake__button plan-intake__button--main"
                    onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Sending...' : 'Submit my answers'}
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary plan-intake__button plan-intake__button--main" onClick={handleNext}>
                    {returnToReview ? 'Back to check and submit' : 'Next'} <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </form>
          </>
        );
      }
    }
  };

  return (
    <DashboardLayout currentPage="plan-intake" onNavigate={() => navigate('/')}>
      <div className="page-container plan-intake" ref={topRef}>
        <div className="page-header">
          <h1 className="page-title">Training plan form</h1>
          {phase === 'form' && (
            <p className="page-description">
              Your answers help the coaching team build a plan around your life. It takes about 15 minutes.
            </p>
          )}
        </div>
        {renderBody()}
      </div>
    </DashboardLayout>
  );
};
