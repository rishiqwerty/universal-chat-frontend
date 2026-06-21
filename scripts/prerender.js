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
