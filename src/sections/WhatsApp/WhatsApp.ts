import './whatsapp.css';
import { content } from '../../data/content';
import { mountWhatsAppDemo } from './WhatsAppDemo';
import { createWhatsAppScroll } from './whatsappScroll';

/**
 * 09 — WHATSAPP AUTOMATION (demo)
 * A cinematic product demonstration of a WhatsApp business workflow.
 * Label -> name -> headline -> description -> interactive workflow visual.
 * The particle backdrop forms a messaging/connected symbol behind it.
 */
export function mountWhatsApp(parent: HTMLElement = document.body, reduced = false) {
  const w = content.whatsapp;
  const d = w.demo;
  const section = document.createElement('section');
  section.className = 'whatsapp';
  section.id = 'whatsapp';
  section.setAttribute('aria-labelledby', 'whatsapp-title');

  section.innerHTML = `
    <div class="whatsapp__stage">
      <div class="whatsapp__top" data-w="label">
        <p class="label whatsapp__label">${w.label}</p>
        <p class="label whatsapp__cat">${w.category}</p>
      </div>

      <div class="whatsapp__mark" data-w="mark" aria-hidden="true">
        <span class="line"><span class="line-inner">${w.name}</span></span>
      </div>

      <div class="whatsapp__copy" data-w="copy">
        <h2 class="whatsapp__title" id="whatsapp-title" aria-label="${w.headline}">
          <span class="line" aria-hidden="true"><span class="line-inner">${w.headline}</span></span>
        </h2>
        <p class="whatsapp__sub" data-w="sub">${w.subheadline}</p>
        <p class="copy copy--lead whatsapp__desc" data-w="desc">${w.description}</p>
      </div>

      <div class="whatsapp__visual" data-w="visual" role="region" aria-label="WhatsApp Automation workflow demonstration">
        <div class="whatsapp__flow" aria-hidden="true"></div>

        <!-- Stage 1: Customer Enquiry -->
        <div class="whatsapp__stage-row" data-stage="1">
          <div class="whatsapp__stage-bubble">
            Hello, I'm interested in your services. Can I get more information?
          </div>
          <span class="whatsapp__stage-num" aria-hidden="true">1</span>
          <div class="whatsapp__stage-panel whatsapp__lead-panel">
            <div class="whatsapp__panel-header">
              <span class="whatsapp__panel-dot" aria-hidden="true"></span>
              <span class="whatsapp__panel-title">Lead Captured</span>
            </div>
            <div class="whatsapp__panel-body">
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Name</span>
                <span class="whatsapp__panel-value">—</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Source</span>
                <span class="whatsapp__panel-value">WhatsApp Enquiry</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Interest</span>
                <span class="whatsapp__panel-value">Services Information</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Status</span>
                <span class="whatsapp__status whatsapp__status--active">
                  <span class="whatsapp__status-dot" aria-hidden="true"></span>
                  New Enquiry
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stage 2: Automated Response -->
        <div class="whatsapp__stage-row" data-stage="2">
          <div class="whatsapp__stage-bubble">
            Hello! Welcome. Thank you for reaching out. How can we help you today?
            <span class="whatsapp__auto-indicator" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6v6l4 2"/></svg>
              Automated
            </span>
          </div>
          <span class="whatsapp__stage-num" aria-hidden="true">2</span>
          <div class="whatsapp__stage-panel whatsapp__lead-panel">
            <div class="whatsapp__panel-header">
              <span class="whatsapp__panel-dot" aria-hidden="true"></span>
              <span class="whatsapp__panel-title">Auto-Response Sent</span>
            </div>
            <div class="whatsapp__panel-body">
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Trigger</span>
                <span class="whatsapp__panel-value">New Message Received</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Template</span>
                <span class="whatsapp__panel-value">Welcome & Assist</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Response Time</span>
                <span class="whatsapp__panel-value">< 1 Second</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Status</span>
                <span class="whatsapp__status whatsapp__status--active">
                  <span class="whatsapp__status-dot" aria-hidden="true"></span>
                  Delivered
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stage 3: Lead Capture -->
        <div class="whatsapp__stage-row" data-stage="3">
          <div class="whatsapp__stage-bubble">
            I'd like to book a consultation for next week.
          </div>
          <span class="whatsapp__stage-num" aria-hidden="true">3</span>
          <div class="whatsapp__stage-panel whatsapp__lead-panel">
            <div class="whatsapp__panel-header">
              <span class="whatsapp__panel-dot" aria-hidden="true"></span>
              <span class="whatsapp__panel-title">Lead Enriched</span>
            </div>
            <div class="whatsapp__panel-body">
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Name</span>
                <span class="whatsapp__panel-value">Demo Customer</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Intent</span>
                <span class="whatsapp__panel-value">Book Consultation</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Preferred Time</span>
                <span class="whatsapp__panel-value">Next Week</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Status</span>
                <span class="whatsapp__status whatsapp__status--active">
                  <span class="whatsapp__status-dot" aria-hidden="true"></span>
                  Qualified Lead
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stage 4: Follow-up -->
        <div class="whatsapp__stage-row" data-stage="4">
          <div class="whatsapp__stage-bubble">
            Perfect! We've scheduled your consultation for Tuesday at 10 AM. You'll receive a confirmation shortly.
            <span class="whatsapp__auto-indicator" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6v6l4 2"/></svg>
              Automated
            </span>
          </div>
          <span class="whatsapp__stage-num" aria-hidden="true">4</span>
          <div class="whatsapp__stage-panel whatsapp__lead-panel">
            <div class="whatsapp__panel-header">
              <span class="whatsapp__panel-dot" aria-hidden="true"></span>
              <span class="whatsapp__panel-title">Follow-up Scheduled</span>
            </div>
            <div class="whatsapp__panel-body">
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Action</span>
                <span class="whatsapp__panel-value">Confirmation Sent</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Appointment</span>
                <span class="whatsapp__panel-value">Tuesday, 10:00 AM</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Reminder</span>
                <span class="whatsapp__panel-value">24h Before</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Status</span>
                <span class="whatsapp__status whatsapp__status--active">
                  <span class="whatsapp__status-dot" aria-hidden="true"></span>
                  Confirmed
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stage 5: Organized Workflow -->
        <div class="whatsapp__stage-row" data-stage="5">
          <div class="whatsapp__stage-bubble">
            Your enquiry is now tracked in our workflow. Our team will prepare for the consultation.
          </div>
          <span class="whatsapp__stage-num" aria-hidden="true">5</span>
          <div class="whatsapp__stage-panel whatsapp__lead-panel">
            <div class="whatsapp__panel-header">
              <span class="whatsapp__panel-dot" aria-hidden="true"></span>
              <span class="whatsapp__panel-title">Workflow Updated</span>
            </div>
            <div class="whatsapp__panel-body">
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Stage</span>
                <span class="whatsapp__panel-value">Consultation Scheduled</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Assigned To</span>
                <span class="whatsapp__panel-value">Solutions Team</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Next Action</span>
                <span class="whatsapp__panel-value">Pre-Call Prep</span>
              </div>
              <div class="whatsapp__panel-row">
                <span class="whatsapp__panel-label">Status</span>
                <span class="whatsapp__status whatsapp__status--active">
                  <span class="whatsapp__status-dot" aria-hidden="true"></span>
                  In Progress
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Complete workflow summary -->
        <div class="whatsapp__complete">
          <h3 class="whatsapp__complete-title">Complete Automated Workflow</h3>
          <div class="whatsapp__complete-steps">
            <div class="whatsapp__step whatsapp__workflow-step is-active" data-step="1">
              <span class="whatsapp__step-num">1</span>
              <span>Customer Enquiry</span>
            </div>
            <div class="whatsapp__step whatsapp__workflow-step" data-step="2">
              <span class="whatsapp__step-num">2</span>
              <span>Auto-Response</span>
            </div>
            <div class="whatsapp__step whatsapp__workflow-step" data-step="3">
              <span class="whatsapp__step-num">3</span>
              <span>Lead Capture</span>
            </div>
            <div class="whatsapp__step whatsapp__workflow-step" data-step="4">
              <span class="whatsapp__step-num">4</span>
              <span>Follow-up</span>
            </div>
            <div class="whatsapp__step whatsapp__workflow-step" data-step="5">
              <span class="whatsapp__step-num">5</span>
              <span>Organized Workflow</span>
            </div>
          </div>
        </div>

        <!-- Interactive demo panel -->
        <div class="whatsapp__panel whatsapp__demo-panel" role="region" aria-label="WhatsApp Automation interactive demo">
          <div class="whatsapp__bar">
            <span class="whatsapp__dot" aria-hidden="true"></span>
            <span class="label whatsapp__name">${d.title}</span>
            <span class="whatsapp__status">${d.chip}</span>
          </div>
          <div class="whatsapp__log" role="log" aria-live="polite"></div>
          <div class="whatsapp__chips">
            ${d.suggestions.map((s) => `<button type="button" class="whatsapp__chip">${s}</button>`).join('')}
          </div>
          <form class="whatsapp__form" autocomplete="off">
            <input class="whatsapp__input" type="text" maxlength="120" placeholder="${d.placeholder}" aria-label="${d.placeholder}" />
            <button class="whatsapp__send" type="submit">${d.send}</button>
          </form>
          <p class="label whatsapp__note">${d.note}</p>
        </div>
      </div>
    </div>
  `;
  parent.appendChild(section);
  mountWhatsAppDemo(section.querySelector<HTMLElement>('.whatsapp__demo-panel')!, reduced);

  // the previous ARIA stage recedes as WhatsApp arrives
  const previous = () => document.querySelector<HTMLElement>('.aria .aria__stage');
  return { section, scroll: createWhatsAppScroll(section, previous, reduced) };
}