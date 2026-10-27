export const content = {
  brand: {
    title: ['SOLVEX', 'PORTFOLIO'],
    tagline: 'AI Automation & Digital Solutions',
  },
  loader: {
    label: 'LOADING',
    minDuration: 3.2, // seconds, controlled minimum so the transition feels intentional
    pauseAt100: 0.55, // seconds to hold on 100%
  },
  // Add real files here later; the loader will wait for them automatically.
  assets: [] as string[],

  // 01 — COVER / OPENING
  hero: {
    eyebrow: 'SOLVEX — AI AUTOMATION & DIGITAL SOLUTIONS',
    headline: ['WE BUILD', 'DIGITAL SYSTEMS', 'THAT MOVE', 'BUSINESSES', 'FORWARD.'],
    intro:
      'SolveX combines AI, automation, software, websites and digital strategy to help businesses work smarter, serve customers better and create room for sustainable growth.',
    statement: [
      'Technology should not make your business more complicated.',
      'It should make your business easier to run.',
    ],
    primary: { label: 'Explore Our Work', href: '#work' },
    secondary: { label: 'Start a Project', href: '#contact' },
  },

  // service cards that float around the head (names taken from the supplied services list)
  heroServices: [
    { label: 'AI Automation', icon: 'automation' },
    { label: 'AI Agents', icon: 'agents' },
    { label: 'WhatsApp Automation', icon: 'whatsapp' },
    { label: 'Websites & Web Applications', icon: 'web' },
    { label: 'CRM & Lead Automation', icon: 'crm' },
    { label: 'Digital Marketing & SEO', icon: 'marketing' },
  ],

  // 02 — WHO IS SOLVEX?
  about: {
    label: '02 — WHO IS SOLVEX?',
    heading: 'WE ARE SOLVEX.',
    paragraphs: [
      'SolveX is an AI Automation & Digital Solutions company built to help businesses solve real problems with practical technology.',
      'We design and build intelligent systems that simplify operations, improve customer experiences, generate opportunities and strengthen a company’s digital presence.',
      'From high-performance websites and web applications to AI assistants, WhatsApp automation, CRM workflows, lead-generation systems, digital marketing and creative solutions, we bring technology and business thinking together.',
    ],
    closing: [
      'We don’t build technology just because we can.',
      'We build it because it should solve something.',
    ],
  },

  // 03 — THE PROBLEM
  problem: {
    label: '03 — THE PROBLEM',
    heading: 'YOUR BUSINESS HAS ENOUGH TO DEAL WITH.',
    lead: 'Too many businesses lose time and opportunities because important processes are still handled manually.',
    symptoms: [
      'Customer enquiries go unanswered.',
      'Leads get forgotten.',
      'Appointments are missed.',
      'Follow-ups happen too late.',
      'Websites fail to convert.',
      'Customers struggle to get information.',
      'Teams spend hours doing repetitive work.',
    ],
    statement: [
      'The problem isn’t always a lack of customers.',
      'Sometimes, the problem is the system behind the business.',
    ],
    closing: 'That’s where SolveX comes in.',
  },

  // 04 — WHAT WE BUILD
  solutions: {
    label: '04 — WHAT WE BUILD',
    heading: 'SOLUTIONS BUILT AROUND YOUR BUSINESS.',
    intro: [
      'We don’t believe in one-size-fits-all digital solutions.',
      'We study the problem, understand the business and build the right system around it.',
    ],
    services: [
      {
        name: 'AI AUTOMATION',
        desc: 'Automate repetitive business processes, customer interactions and internal workflows with intelligent AI-powered systems.',
      },
      {
        name: 'AI AGENTS',
        desc: 'Deploy intelligent AI agents that can communicate with customers, answer questions, qualify leads and guide users toward the right action.',
      },
      {
        name: 'WHATSAPP AUTOMATION',
        desc: 'Turn WhatsApp into a smarter business channel for customer support, enquiries, lead capture, bookings and automated conversations.',
      },
      {
        name: 'AI CHATBOTS & CUSTOMER SUPPORT',
        desc: 'Give customers fast, consistent answers while reducing the amount of repetitive work your team handles manually.',
      },
      {
        name: 'WEBSITES & WEB APPLICATIONS',
        desc: 'Build fast, modern and conversion-focused digital experiences designed around your business goals.',
      },
      {
        name: 'CRM & LEAD AUTOMATION',
        desc: 'Capture, organize, qualify and follow up with leads systematically so opportunities don’t disappear.',
      },
      {
        name: 'LEAD GENERATION',
        desc: 'Build systems and strategies designed to identify potential customers and create more opportunities for your business.',
      },
      {
        name: 'DIGITAL MARKETING & SEO',
        desc: 'Improve your visibility, reach the right audience and create a stronger path from attention to action.',
      },
      {
        name: 'BRANDING & CREATIVE DESIGN',
        desc: 'Create professional visual identities and digital assets that help businesses communicate with confidence.',
      },
      {
        name: 'CUSTOM DIGITAL SOLUTIONS',
        desc: 'When an off-the-shelf solution isn’t enough, we design and build around the problem.',
      },
    ],
  },
};