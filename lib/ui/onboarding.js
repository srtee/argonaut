// Onboarding module - onboarding flow

let currentStep = 0;
const totalSteps = 6;

let onboardingModal;
let onboardingBackBtn;
let onboardingNextBtn;
let onboardingCompleteBtn;
let onboardingSteps;
let onboardingDots;

export function initOnboardingDOM() {
    onboardingModal = document.getElementById('onboardingModal');
    onboardingBackBtn = document.getElementById('onboardingBackBtn');
    onboardingNextBtn = document.getElementById('onboardingNextBtn');
    onboardingCompleteBtn = document.getElementById('onboardingCompleteBtn');
    onboardingSteps = document.querySelectorAll('.onboarding__step');
    onboardingDots = document.querySelectorAll('.onboarding__dot');
}

/**
 * Set a cookie
 */
export function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get a cookie
 */
export function getCookie(name) {
    const nameEQ = `${name}=`;
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1, cookie.length);
        }
        if (cookie.indexOf(nameEQ) === 0) {
            return cookie.substring(nameEQ.length, cookie.length);
        }
    }
    return null;
}

/**
 * Check if user has completed onboarding
 */
export function hasCompletedOnboarding() {
    return getCookie('argonaut_onboarding_complete') === 'true';
}

/**
 * Mark onboarding as complete
 */
export function markOnboardingComplete() {
    setCookie('argonaut_onboarding_complete', 'true', 365);
}

/**
 * Show onboarding modal
 */
export function showOnboarding() {
    currentStep = 0;
    updateOnboardingUI();
    if (onboardingModal) {
        onboardingModal.classList.add('onboarding--active');
        onboardingModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Hide onboarding modal
 */
export function hideOnboarding() {
    if (onboardingModal) {
        onboardingModal.classList.remove('onboarding--active');
        onboardingModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

/**
 * Update onboarding UI based on current step
 */
export function updateOnboardingUI() {
    if (!onboardingModal) return;

    // Update steps
    if (onboardingSteps) {
        onboardingSteps.forEach((step, index) => {
            step.classList.toggle('onboarding__step--active', index === currentStep);
        });
    }

    // Update dots with proper ARIA attributes
    if (onboardingDots) {
        onboardingDots.forEach((dot, index) => {
            const isActive = index === currentStep;
            dot.classList.toggle('onboarding__dot--active', isActive);
            dot.setAttribute('aria-selected', isActive.toString());
            dot.setAttribute('tabindex', isActive ? '0' : '-1');
        });
    }

    // Update buttons - use visibility for Back button to maintain layout
    if (onboardingBackBtn) {
        onboardingBackBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
    }
    if (onboardingNextBtn) {
        onboardingNextBtn.style.display = currentStep === totalSteps - 1 ? 'none' : 'block';
    }
    if (onboardingCompleteBtn) {
        onboardingCompleteBtn.style.display = currentStep === totalSteps - 1 ? 'block' : 'none';
    }

    // Focus the modal for accessibility
    if (currentStep === 0) {
        onboardingModal.focus();
    }
}

/**
 * Go to next step
 */
export function nextStep() {
    if (currentStep < totalSteps - 1) {
        currentStep++;
        updateOnboardingUI();
    }
}

/**
 * Go to previous step
 */
export function prevStep() {
    if (currentStep > 0) {
        currentStep--;
        updateOnboardingUI();
    }
}

/**
 * Go to specific step
 */
export function goToStep(step) {
    currentStep = step;
    updateOnboardingUI();
}

/**
 * Complete onboarding
 */
export function completeOnboarding() {
    markOnboardingComplete();
    hideOnboarding();
}

/**
 * Initialize onboarding on page load
 */
export function initOnboarding() {
    if (!hasCompletedOnboarding()) {
        // Delay showing onboarding to let the page load first
        setTimeout(() => {
            showOnboarding();
        }, 500);
    }
}

/**
 * Initialize onboarding event listeners
 */
export function initOnboardingListeners(closeOnboardingBtn, showOnboardingBtn) {
    if (closeOnboardingBtn) {
        closeOnboardingBtn.addEventListener('click', () => hideOnboarding());
    }

    if (onboardingNextBtn) {
        onboardingNextBtn.addEventListener('click', nextStep);
    }

    if (onboardingBackBtn) {
        onboardingBackBtn.addEventListener('click', prevStep);
    }

    if (onboardingCompleteBtn) {
        onboardingCompleteBtn.addEventListener('click', completeOnboarding);
    }

    if (showOnboardingBtn) {
        showOnboardingBtn.addEventListener('click', showOnboarding);
    }

    // Click on dots to go to specific step
    if (onboardingDots) {
        onboardingDots.forEach(dot => {
            dot.addEventListener('click', () => {
                goToStep(parseInt(dot.dataset.step));
            });
        });
    }

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && onboardingModal && onboardingModal.classList.contains('onboarding--active')) {
            hideOnboarding();
        }
    });

    // Close modal on backdrop click
    if (onboardingModal) {
        onboardingModal.addEventListener('click', (e) => {
            if (e.target === onboardingModal) {
                hideOnboarding();
            }
        });
    }
}
