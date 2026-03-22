import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    name?: string;
    type?: string;
    ogImage?: string;
    twitterHandle?: string;
}

export const SEO: React.FC<SEOProps> = ({
    title = "BugTracker - Professional Error Tracking for Frontend Applications",
    description = "BugTracker automatically captures JavaScript errors, API failures, and console issues from your applications with real-time analytics and stack traces.",
    name = "BugTracker",
    type = "website",
    ogImage = "https://bugtracker.sh/og-image.png", // Replace with actual image URL if available
    twitterHandle = "@bugtracker" // Replace with actual handle if available
}) => {
    const fullTitle = title !== name ? `${title} | ${name}` : title;

    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{fullTitle}</title>
            <meta name='description' content={description} />

            {/* Open Graph / Facebook tags */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={ogImage} />

            {/* Twitter tags */}
            <meta name="twitter:creator" content={twitterHandle} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />

            {/* Search Engine directives */}
            <meta name="robots" content="index, follow" />
            <link rel="canonical" href={window.location.href} />
        </Helmet>
    );
};
