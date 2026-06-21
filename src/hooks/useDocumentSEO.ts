import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
}

export function useDocumentSEO({
  title,
  description,
  canonicalUrl,
  ogType = "website",
  ogImage,
}: SEOProps) {
  useEffect(() => {
    // 1. Update document title
    const formattedTitle = title.includes("Neural Architect") ? title : `${title} | Neural Architect`;
    document.title = formattedTitle;

    // Helper helper to create or update meta tags in document head
    const setMetaTag = (attrName: "name" | "property", attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // 2. Update Meta Description
    if (description) {
      setMetaTag("name", "description", description);
      setMetaTag("property", "og:description", description);
      setMetaTag("name", "twitter:description", description);
    }

    // 3. Update Open Graph Titles
    setMetaTag("property", "og:title", formattedTitle);
    setMetaTag("name", "twitter:title", formattedTitle);

    // 4. Update Open Graph Type
    setMetaTag("property", "og:type", ogType);

    // 5. Update Open Graph Images
    if (ogImage) {
      setMetaTag("property", "og:image", ogImage);
      setMetaTag("name", "twitter:image", ogImage);
    } else {
      // Default fallback mascot avatar
      setMetaTag("property", "og:image", "/mascot.png");
      setMetaTag("name", "twitter:image", "/mascot.png");
    }

    // 6. Set Twitter Card configuration
    setMetaTag("name", "twitter:card", "summary_large_image");

    // 7. Update Canonical Link
    let link: HTMLLinkElement | null = document.querySelector("link[rel='canonical']");
    const currentHref = canonicalUrl || window.location.href;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", currentHref);

  }, [title, description, canonicalUrl, ogType, ogImage]);
}
