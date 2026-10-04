// Scroll-Driven Animation Controller

import { ScrollTrigger } from 'gsap/ScrollTrigger';

export class ScrollController {
    constructor(options = {}) {
        this.options = {
            sections: [],
            onSectionChange: null,
            onProgress: null,
            ...options
        };

        this.sections = this.options.sections;
        this.triggers = [];
        this.currentSection = 0;
        this.sectionProgress = 0;
        this.totalProgress = 0;
        this.scrollDirection = 1;
        this.lastScrollY = 0;
        this.initialized = false;
        this.gsapRegistered = false;
    }

    init(gsap) {
        if (!this.gsapRegistered) {
            gsap.registerPlugin(ScrollTrigger);
            this.gsapRegistered = true;
        }

        this.setupTriggers();
        this.initialized = true;
        return this;
    }

    setupTriggers() {
        this.sections.forEach((section, index) => {
            const element = typeof section === 'string'
                ? document.querySelector(section)
                : section.element;

            if (!element) {
                console.warn(`[ScrollController] Section ${index} element not found`);
                return;
            }

            // Section enter/exit trigger
            const trigger = ScrollTrigger.create({
                trigger: element,
                start: 'top 55%',
                end: 'bottom 55%',
                onToggle: (self) => {
                    if (self.isActive) {
                        this.onSectionEnter(index, self);
                    }
                },
                onUpdate: (self) => {
                    if (self.isActive) {
                        this.sectionProgress = self.progress;
                        this.updateProgress(index, self.progress);
                    }
                }
            });

            this.triggers.push(trigger);
        });

        // Global progress trigger
        ScrollTrigger.create({
            trigger: document.body,
            start: 0,
            end: 'max',
            onUpdate: (self) => {
                this.totalProgress = self.progress;
                this.scrollDirection = self.direction;
                if (this.options.onProgress) {
                    this.options.onProgress(self.progress, self.direction);
                }
            }
        });
    }

    onSectionEnter(index, trigger) {
        this.currentSection = index;
        this.sectionProgress = trigger.progress;

        if (this.options.onSectionChange) {
            this.options.onSectionChange(index, trigger.progress, trigger.direction);
        }
    }

    updateProgress(sectionIndex, progress) {
        // Could emit per-section progress events
    }

    getCurrentSection() {
        return this.currentSection;
    }

    getSectionProgress() {
        return this.sectionProgress;
    }

    getTotalProgress() {
        return this.totalProgress;
    }

    getScrollDirection() {
        return this.scrollDirection;
    }

    // Get progress for specific section (0-1)
    getSectionNormalizedProgress(sectionIndex) {
        const trigger = this.triggers[sectionIndex];
        if (!trigger) return 0;
        return trigger.isActive ? trigger.progress :
               (trigger.progress > 0 ? 1 : 0);
    }

    // Smooth scroll to section
    scrollToSection(index, smooth = true) {
        const trigger = this.triggers[index];
        if (trigger) {
            trigger.scroll(smooth);
        }
    }

    // Kill all triggers
    kill() {
        this.triggers.forEach(t => t.kill());
        this.triggers = [];
    }

    refresh() {
        ScrollTrigger.refresh();
    }

    // Enable/disable
    setEnabled(enabled) {
        this.triggers.forEach(t => t.enabled = enabled);
    }
}

// GSAP import helper
let gsap = null;
export function setGSAP(instance) {
    gsap = instance;
}