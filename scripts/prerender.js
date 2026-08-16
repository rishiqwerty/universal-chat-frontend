import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error(`Error: Template file not found at ${TEMPLATE_PATH}. Run vite build first.`);
  process.exit(1);
}

const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

// Use process.env.SITE_URL (set in Vercel dashboard) or default to the current Vercel URL
const SITE_URL = (process.env.SITE_URL || 'https://universal-chat-frontend.vercel.app').replace(/\/$/, '');

console.log(`Configuring pre-rendering with Base URL: ${SITE_URL}`);

const routes = [
  {
    path: '/',
    title: 'Chat | Neural Architect',
    description: 'Communicate with advanced language models and direct neural processes.',
    canonical: `${SITE_URL}/`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#webapp`,
      'name': 'Neural Architect',
      'url': `${SITE_URL}/`,
      'description': 'Communicate with advanced language models and direct neural processes.',
      'applicationCategory': 'ChatApplication',
      'operatingSystem': 'All',
      'browserRequirements': 'Requires JavaScript. Requires HTML5.',
      'author': {
        '@type': 'Organization',
        'name': 'Neural Architect'
      }
    }
  },
  {
    path: '/chat',
    title: 'Chat | Neural Architect',
    description: 'Communicate with advanced language models and direct neural processes.',
    canonical: `${SITE_URL}/chat`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/chat#webapp`,
      'name': 'Neural Architect Chat',
      'url': `${SITE_URL}/chat`,
      'description': 'Communicate with advanced language models and direct neural processes.',
      'applicationCategory': 'ChatApplication',
      'operatingSystem': 'All',
      'browserRequirements': 'Requires JavaScript. Requires HTML5.'
    }
  },
  {
    path: '/studio',
    title: 'Studio | Neural Architect',
    description: 'Generate viral picture perfect images using popular diffusion models.',
    canonical: `${SITE_URL}/studio`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/studio#webapp`,
      'name': 'Neural Architect Studio',
      'url': `${SITE_URL}/studio`,
      'description': 'Generate viral picture perfect images using popular diffusion models.',
      'applicationCategory': 'MultimediaApplication',
      'operatingSystem': 'All',
      'browserRequirements': 'Requires JavaScript. Requires HTML5.',
      'author': {
        '@type': 'Organization',
        'name': 'Neural Architect'
      }
    }
  },
  {
    path: '/login',
    title: 'Login | Neural Architect',
    description: 'Sign in to access your secure AI chat and image generation workspace.',
    canonical: `${SITE_URL}/login`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}/login#webpage`,
      'name': 'Login - Neural Architect',
      'url': `${SITE_URL}/login`,
      'description': 'Sign in to access your secure AI chat and image generation workspace.'
    }
  },
  {
    path: '/signup',
    title: 'Sign Up | Neural Architect',
    description: 'Initialize your operative account and get access to the AI interface.',
    canonical: `${SITE_URL}/signup`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}/signup#webpage`,
      'name': 'Sign Up - Neural Architect',
      'url': `${SITE_URL}/signup`,
      'description': 'Initialize your operative account and get access to the AI interface.'
    }
  },
  {
    path: '/settings',
    title: 'Settings | Neural Architect',
    description: 'Configure model weights, customize themes, and manage API keys.',
    canonical: `${SITE_URL}/settings`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}/settings#webpage`,
      'name': 'Settings - Neural Architect',
      'url': `${SITE_URL}/settings`,
      'description': 'Configure model weights, customize themes, and manage API keys.'
    }
  },
  {
    path: '/legal',
    title: 'Compliance & Policies | Neural Architect',
    description: 'Legal terms, payment standards, data protection protocols, and support information.',
    canonical: `${SITE_URL}/legal`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}/legal#webpage`,
      'name': 'Compliance & Policies - Neural Architect',
      'url': `${SITE_URL}/legal`,
      'description': 'Legal terms, payment standards, data protection protocols, and support information.'
    }
  },
  {
    path: '/docs',
    title: 'Documentation | Neural Architect',
    description: 'Read setup guides, api configurations, credits billing guidelines, and Model Context Protocol instructions.',
    canonical: `${SITE_URL}/docs`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}/docs#webpage`,
      'name': 'Documentation - Neural Architect',
      'url': `${SITE_URL}/docs`,
      'description': 'Read setup guides, api configurations, credits billing guidelines, and Model Context Protocol instructions.'
    }
  },
  {
    path: '/terms',
    title: 'Terms & Conditions | Neural Architect',
    description: 'Universal user agreement, acceptable use rules, and platform terms of service.',
    canonical: `${SITE_URL}/terms`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}/terms#webpage`,
      'name': 'Terms & Conditions - Neural Architect',
      'url': `${SITE_URL}/terms`,
      'description': 'Universal user agreement, acceptable use rules, and platform terms of service.'
    }
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Neural Architect',
    description: 'How we protect, process, and respect your personal data and AI workspace privacy.',
    canonical: `${SITE_URL}/privacy`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}/privacy#webpage`,
      'name': 'Privacy Policy - Neural Architect',
      'url': `${SITE_URL}/privacy`,
      'description': 'How we protect, process, and respect your personal data and AI workspace privacy.'
    }
  },
  {
    path: '/refund-policy',
    title: 'Cancellation & Refund Policy | Neural Architect',
    description: 'Digital credits fulfillment, order cancellation, and refund eligibility standards.',
    canonical: `${SITE_URL}/refund-policy`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}/refund-policy#webpage`,
      'name': 'Cancellation & Refund Policy - Neural Architect',
      'url': `${SITE_URL}/refund-policy`,
      'description': 'Digital credits fulfillment, order cancellation, and refund eligibility standards.'
    }
  },
  {
    path: '/pricing',
    title: 'Pricing & Credit Plans | Neural Architect',
    description: 'Credit package tiers, generative model rates, pay-as-you-go parameters, and zero-surcharge BYOK rules.',
    canonical: `${SITE_URL}/pricing`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}/pricing#webpage`,
      'name': 'Pricing & Plans - Neural Architect',
      'url': `${SITE_URL}/pricing`,
      'description': 'Credit package tiers, generative model rates, pay-as-you-go parameters, and zero-surcharge BYOK rules.'
    }
  },
  {
    path: '/contact-us',
    title: 'Contact Us & Support | Neural Architect',
    description: 'Official customer support channels, grievance redressal, and operating office address.',
    canonical: `${SITE_URL}/contact-us`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}/contact-us#webpage`,
      'name': 'Contact Us - Neural Architect',
      'url': `${SITE_URL}/contact-us`,
      'description': 'Official customer support channels, grievance redressal, and operating office address.'
    }
  },
  {
    path: '/delivery-policy',
    title: 'Shipping & Delivery Policy | Neural Architect',
    description: 'Electronic fulfillment terms for digital software credits and services.',
    canonical: `${SITE_URL}/delivery-policy`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}/delivery-policy#webpage`,
      'name': 'Shipping & Delivery Policy - Neural Architect',
      'url': `${SITE_URL}/delivery-policy`,
      'description': 'Electronic fulfillment terms for digital software credits and services.'
    }
  }
];

function prerenderRoute(route) {
  let html = template;

  // 1. Replace Title
  html = html.replace(/<title>.*?<\/title>/, `<title>${route.title}</title>`);

  // 2. Replace Descriptions
  html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${route.description}" />`);
  html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${route.description}" />`);
  html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/?>/, `<meta name="twitter:description" content="${route.description}" />`);

  // 3. Replace Titles
  html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${route.title}" />`);
  html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/?>/, `<meta name="twitter:title" content="${route.title}" />`);

  // 4. Inject Canonical and JSON-LD Script before </head>
  const canonicalTag = `<link rel="canonical" href="${route.canonical}" />`;
  const jsonLdTag = `<script type="application/ld+json">${JSON.stringify(route.jsonLd, null, 2)}</script>`;

  html = html.replace('</head>', `  ${canonicalTag}\n  ${jsonLdTag}\n</head>`);

  // Determine output directory and path
  let outputDir = DIST_DIR;
  if (route.path !== '/') {
    outputDir = path.join(DIST_DIR, route.path);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  const outputPath = path.join(outputDir, 'index.html');
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`Pre-rendered route [${route.path}] -> ${outputPath}`);
}

console.log('Starting pre-rendering of routes...');
routes.forEach(prerenderRoute);

// 5. Generate dynamic sitemap.xml
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/studio</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${SITE_URL}/signup</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;
const sitemapPath = path.join(DIST_DIR, 'sitemap.xml');
fs.writeFileSync(sitemapPath, sitemapContent, 'utf-8');
console.log(`Generated dynamic sitemap -> ${sitemapPath}`);

console.log('Pre-rendering complete.');
